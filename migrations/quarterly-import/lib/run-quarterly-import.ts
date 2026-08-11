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
import type {QuarterlyImportConfig} from './cli-config'
import {loadVolumeSnapshot} from './load-snapshot'
import {
	finalizeDocForLive,
	mapSnapshotToDoc,
	type QuarterlyImportDoc,
	sanitizeDocForWrite,
} from './map-article'

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

	const limit = pLimit(CONCURRENCY)
	const docs: QuarterlyImportDoc[] = []

	const tasks = articles.map((article) =>
		limit(async () => {
			const mapped = mapSnapshotToDoc(article)
			const title = mapped.title

			if (!mapped.body?.length) {
				audit.warn(`${mapped.sourceKey}: no body blocks extracted; importing metadata only.`)
			}

			if (dryRun) {
				docs.push(mapped)
				audit.recordImported({
					clipId: mapped.sourceKey,
					title,
					csvType: `v${mapped.volume}n${mapped.issue}`,
					schemaType: 'quarterlyArticle',
					action: 'dry_run',
					mappedKeywords: [],
					unmappedKeywords: [],
				})
				console.log(`[DRY RUN] quarterlyArticle → ${mapped.sourceKey} (${title})`)
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
					csvType: `v${mapped.volume}n${mapped.issue}`,
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
					csvType: `v${mapped.volume}n${mapped.issue}`,
					reason: 'api_error',
					detail: msg,
				})
			}
		}),
	)

	await Promise.all(tasks)

	fs.mkdirSync(reportsDir, {recursive: true})

	if (dryRun && docs.length > 0) {
		const previewPath = path.join(reportsDir, 'preview.ndjson')
		fs.writeFileSync(
			previewPath,
			docs.map((d) => JSON.stringify(sanitizeDocForWrite(d))).join('\n'),
		)
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
	console.log(`  count(*[_type == "quarterlyArticle" && volume == ${volume}])`)
	console.log(
		`  *[_type == "quarterlyArticle" && volume == ${volume}] | order(issue asc, startPage asc) { title, sourceKey, startPage }`,
	)
}
