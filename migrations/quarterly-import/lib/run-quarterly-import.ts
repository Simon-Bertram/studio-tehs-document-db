/**
 * TEHS Quarterly HTML import pipeline (pilot: one volume at a time).
 */
import fs from 'node:fs'
import path from 'node:path'

import type {SanityClient} from '@sanity/client'
import pLimit from 'p-limit'

import {SANITY_DATASET, SANITY_PROJECT_ID} from '../../../lib/sanityEnv'
import {Audit} from '../../csv-import/lib/audit'
import {upsertByQuery} from '../../csv-import/lib/upsert-by-query'
import {writeReports} from '../../csv-import/lib/write-reports'
import {quarterlyIssueSourceKey} from '../../lib/quarterly-issue-source-key'
import type {QuarterlyImportConfig} from './cli-config'
import {loadVolumeSnapshot} from './load-snapshot'
import {
	finalizeDocForLive,
	mapSnapshotToDoc,
	type QuarterlyImportDoc,
	sanitizeDocForWrite,
} from './map-article'
import {uniqueIssuesFromArticles} from './map-issue'

const CONCURRENCY = 3

export async function runQuarterlyImport(
	config: QuarterlyImportConfig,
	client: SanityClient,
): Promise<void> {
	const {dryRun, volume, rowLimit, reportsDir, snapshotDir, baseUrl} = config
	const mode = dryRun ? 'DRY RUN' : 'LIVE'

	console.log(`--- TEHS Quarterly HTML Import (${mode}) ---`)
	console.log(`Volume: ${volume}`)
	console.log(`Snapshot: ${snapshotDir}`)
	console.log(`Project: ${SANITY_PROJECT_ID} / ${SANITY_DATASET}`)
	if (rowLimit < Infinity) console.log(`Article limit: ${rowLimit}`)
	console.log()

	const {articles} = await loadVolumeSnapshot({
		volume,
		baseUrl,
		snapshotDir,
		rowLimit,
	})

	const audit = new Audit()
	audit.totalRows = articles.length
	console.log(`Indexed ${articles.length} articles from volume ${volume} TOC.\n`)

	const issues = uniqueIssuesFromArticles(articles)
	const issueIdBySourceKey = new Map<string, string>()

	if (dryRun) {
		for (const issue of issues) {
			console.log(`[DRY RUN] quarterlyIssue → ${issue.sourceKey}`)
		}
	} else {
		for (const issue of issues) {
			try {
				const result = await upsertByQuery(
					client,
					{
						_type: 'quarterlyIssue',
						volume: issue.volume,
						issueNumber: issue.issueNumber,
						sourceKey: issue.sourceKey,
						...(issue.publicationDate ? {publicationDate: issue.publicationDate} : {}),
					},
					`_type == "quarterlyIssue" && sourceKey == $sourceKey`,
					{sourceKey: issue.sourceKey},
				)
				issueIdBySourceKey.set(issue.sourceKey, result.id)
				console.log(`[OK] ${result.action} quarterlyIssue → ${issue.sourceKey} (${result.id})`)
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				console.error(`[ERROR] quarterlyIssue ${issue.sourceKey}: ${msg}`)
			}
		}
		console.log()
	}

	const limit = pLimit(CONCURRENCY)
	const docs: QuarterlyImportDoc[] = []

	const tasks = articles.map((article) =>
		limit(async () => {
			const issueKey = quarterlyIssueSourceKey(article.volume, article.issue)
			const issueId = issueIdBySourceKey.get(issueKey)
			const mapped = mapSnapshotToDoc(article, issueId)
			const title = mapped.title

			if (!mapped.body?.length) {
				audit.warn(`${mapped.sourceKey}: no body blocks extracted; importing metadata only.`)
			}

			if (dryRun) {
				docs.push(mapped)
				audit.recordImported({
					clipId: mapped.sourceKey,
					title,
					csvType: `v${article.volume}n${article.issue}`,
					schemaType: 'quarterlyArticle',
					action: 'dry_run',
					mappedKeywords: [],
					unmappedKeywords: [],
				})
				console.log(`[DRY RUN] quarterlyArticle → ${mapped.sourceKey} (${title})`)
				return
			}

			if (!issueId) {
				audit.skip({
					clipId: mapped.sourceKey,
					title,
					csvType: `v${article.volume}n${article.issue}`,
					reason: 'api_error',
					detail: `No quarterlyIssue for ${issueKey}`,
				})
				return
			}

			try {
				const liveDoc = await finalizeDocForLive(client, mapped)
				const writable = sanitizeDocForWrite(liveDoc)
				const result = await upsertByQuery(
					client,
					writable as {[key: string]: unknown; _type: string},
					`_type == "quarterlyArticle" && sourceKey == $sourceKey`,
					{sourceKey: mapped.sourceKey},
				)
				audit.recordImported({
					clipId: mapped.sourceKey,
					title,
					csvType: `v${article.volume}n${article.issue}`,
					schemaType: 'quarterlyArticle',
					action: result.action,
					sanityId: result.id,
					mappedKeywords: [],
					unmappedKeywords: [],
				})
				console.log(`[OK] ${result.action} quarterlyArticle → ${mapped.sourceKey} (${result.id})`)
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				audit.skip({
					clipId: mapped.sourceKey,
					title,
					csvType: `v${article.volume}n${article.issue}`,
					reason: 'api_error',
					detail: msg,
				})
			}
		}),
	)

	await Promise.all(tasks)

	fs.mkdirSync(reportsDir, {recursive: true})

	if (dryRun && (docs.length > 0 || issues.length > 0)) {
		const previewPath = path.join(reportsDir, 'preview.ndjson')
		const lines = [
			...issues.map((issue) => JSON.stringify(issue)),
			...docs.map((d) => JSON.stringify(sanitizeDocForWrite(d))),
		]
		fs.writeFileSync(previewPath, lines.join('\n'))
		console.log(`\nPreview written to ${previewPath}`)
	}

	writeReports(audit, reportsDir, {
		naturalKeyLabel: 'sourceKey',
		studioAction: (r) =>
			`In Studio, find quarterlyArticle with sourceKey ${r.clipId}. Link Properties / People mentioned as needed.`,
	})
	console.log(`\nReports written to ${reportsDir}`)
	audit.print(reportsDir)

	console.log('Suggested Vision checks:')
	console.log(`  count(*[_type == "quarterlyIssue" && volume == ${volume}])`)
	console.log(`  count(*[_type == "quarterlyArticle" && issueRef->volume == ${volume}])`)
	console.log(
		`  *[_type == "quarterlyArticle" && issueRef->volume == ${volume}] | order(issueRef->issueNumber asc, startPage asc) { title, sourceKey, startPage, "issue": issueRef->{volume, issueNumber} }`,
	)
}
