/**
 * TEHS Quarterly HTML body import (one volume or --all-html-volumes).
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
import {tocFileName, type QuarterlyImportConfig} from './cli-config'
import {loadCatalogSources} from './load-catalog'
import {loadVolumeSnapshot} from './load-snapshot'
import {loadArticleSlugsBySourceKey, loadTakenArticleSlugs} from './load-article-slugs'
import {
	finalizeDocForLive,
	mapSnapshotToDoc,
	type QuarterlyImportDoc,
	sanitizeDocForWrite,
} from './map-article'
import {uniqueIssuesFromArticles} from './map-issue'
import {mergeArticleStubs, unionIssues} from './merge-catalog'
import {
	fetchIssueIdsBySourceKey,
	mergeIssueIdMaps,
	pendingIssueRef,
} from './resolve-issue-ids'
import {upsertIssueSparse} from './upsert-issue-sparse'
import {
	buildPdfArticleRows,
	buildToc404Rows,
	writeCoverageReports,
} from './write-coverage-reports'

const CONCURRENCY = 3

async function importOneVolume(
	config: QuarterlyImportConfig,
	client: SanityClient,
	volume: number,
	issueIdBySourceKey: Map<string, string>,
	audit: Audit,
	docs: QuarterlyImportDoc[],
): Promise<{imported: number; skipped: boolean; reason?: string}> {
	const {dryRun, rowLimit, snapshotDir, baseUrl, refresh} = config
	const tocPath = path.join(snapshotDir, `v${volume}`, tocFileName(volume))
	if (!fs.existsSync(tocPath)) {
		console.log(`[SKIP] volume ${volume}: no TOC snapshot at ${tocPath}`)
		return {imported: 0, skipped: true, reason: 'missing_toc'}
	}

	const {articles} = await loadVolumeSnapshot({
		volume,
		baseUrl,
		snapshotDir,
		rowLimit,
		refresh,
	})

	if (articles.length === 0) {
		console.log(`[SKIP] volume ${volume}: no HTML-linked articles (PDF-only or empty TOC)`)
		return {imported: 0, skipped: true, reason: 'no_html_articles'}
	}

	console.log(`\n--- Volume ${volume}: ${articles.length} HTML articles ---`)
	audit.totalRows += articles.length

	const issues = uniqueIssuesFromArticles(articles)

	if (dryRun) {
		for (const issue of issues) {
			console.log(`[DRY RUN] quarterlyIssue → ${issue.sourceKey}`)
		}
	} else {
		const thisRun = new Map<string, string>()
		for (const issue of issues) {
			try {
				const result = await upsertIssueSparse(
					client,
					{
						_type: 'quarterlyIssue',
						volume: issue.volume,
						issueNumber: issue.issueNumber,
						combinedIssue: issue.combinedIssue ?? false,
						sourceKey: issue.sourceKey,
						...(issue.issueNumberEnd != null ? {issueNumberEnd: issue.issueNumberEnd} : {}),
						...(issue.publicationDate ? {publicationDate: issue.publicationDate} : {}),
						...(issue.yearSearch ? {yearSearch: issue.yearSearch} : {}),
					},
					{uploadCover: false},
				)
				thisRun.set(issue.sourceKey, result.id)
				console.log(`[OK] ${result.action} quarterlyIssue → ${issue.sourceKey} (${result.id})`)
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				console.error(`[ERROR] quarterlyIssue ${issue.sourceKey}: ${msg}`)
			}
		}
		const merged = mergeIssueIdMaps(issueIdBySourceKey, thisRun)
		issueIdBySourceKey.clear()
		for (const [k, v] of merged) issueIdBySourceKey.set(k, v)
	}

	const takenSlugs = dryRun ? new Set<string>() : await loadTakenArticleSlugs(client)
	const existingSlugByKey = dryRun
		? new Map<string, string>()
		: await loadArticleSlugsBySourceKey(client)

	const mappedArticles = articles.map((article) => {
		const issueKey = quarterlyIssueSourceKey(
			article.volume,
			article.issue,
			article.issueNumberEnd,
		)
		const issueId = issueIdBySourceKey.get(issueKey)
		const mapped = mapSnapshotToDoc(article, issueId, {
			takenSlugs,
			existingSlug: existingSlugByKey.get(article.sourceKey),
		})
		if (!mapped.issueRef) {
			mapped.issueRef = dryRun
				? pendingIssueRef(issueKey)
				: issueId
					? {_type: 'reference', _ref: issueId}
					: undefined
		}
		return {article, issueKey, issueId, mapped}
	})

	const limit = pLimit(CONCURRENCY)
	let imported = 0

	await Promise.all(
		mappedArticles.map(({article, issueKey, issueId, mapped}) =>
			limit(async () => {
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
					imported += 1
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
					// Preserve a manually set Studio slug on re-import.
					if (existingSlugByKey.has(mapped.sourceKey)) {
						delete writable.slug
					}
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
					console.log(
						`[OK] ${result.action} quarterlyArticle → ${mapped.sourceKey} (${result.id})`,
					)
					imported += 1
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
		),
	)

	return {imported, skipped: false}
}

export async function runQuarterlyImport(
	config: QuarterlyImportConfig,
	client: SanityClient,
): Promise<void> {
	const {dryRun, rowLimit, reportsDir, snapshotDir, maxVolume} = config
	const mode = dryRun ? 'DRY RUN' : 'LIVE'
	const volumes = config.allHtmlVolumes
		? Array.from({length: maxVolume}, (_, i) => i + 1)
		: [config.volume ?? 22]

	console.log(`--- TEHS Quarterly HTML Import (${mode}) ---`)
	if (config.allHtmlVolumes) {
		console.log(`Volumes: 1…${maxVolume} (--all-html-volumes)`)
	} else {
		console.log(`Volume: ${volumes[0]}`)
	}
	console.log(`Snapshot: ${snapshotDir}`)
	console.log(`Project: ${SANITY_PROJECT_ID} / ${SANITY_DATASET}`)
	if (rowLimit < Infinity) console.log(`Article limit per volume: ${rowLimit}`)
	console.log()

	const audit = new Audit()
	audit.totalRows = 0
	const docs: QuarterlyImportDoc[] = []
	let issueIdBySourceKey = new Map<string, string>()
	try {
		issueIdBySourceKey = await fetchIssueIdsBySourceKey(client)
	} catch (err) {
		if (!dryRun) throw err
		const msg = err instanceof Error ? err.message : String(err)
		console.warn(`[WARN] could not fetch existing issue IDs (dry-run): ${msg}`)
	}

	let volumesWithHtml = 0
	for (const volume of volumes) {
		const result = await importOneVolume(
			config,
			client,
			volume,
			issueIdBySourceKey,
			audit,
			docs,
		)
		if (!result.skipped && result.imported > 0) volumesWithHtml += 1
	}

	fs.mkdirSync(reportsDir, {recursive: true})

	if (dryRun && docs.length > 0) {
		const previewPath = path.join(reportsDir, 'preview.ndjson')
		fs.writeFileSync(
			previewPath,
			docs.map((d) => JSON.stringify(sanitizeDocForWrite(d))).join('\n'),
		)
		console.log(`\nPreview written to ${previewPath}`)
	}

	const loaded = await loadCatalogSources({
		snapshotDir,
		maxVolume,
		extractIfMissing: false,
	})
	const allIssues = unionIssues({
		tocIssues: loaded.tocIssues,
		qtoc1Issues: loaded.qtoc1Issues,
		pdfRows: loaded.pdfRows,
	})
	const merged = mergeArticleStubs({
		issues: allIssues,
		tocArticles: loaded.tocArticles,
		qtoc1Articles: loaded.qtoc1Articles,
		pdfRows: loaded.pdfRows,
	})
	const qtoc1Volumes = [...new Set(loaded.qtoc1Issues.map((issue) => issue.volume))]
	writeCoverageReports(reportsDir, {
		toc404Rows: buildToc404Rows({
			baseUrl: config.baseUrl,
			toc404Path: path.join(snapshotDir, 'toc-404s.json'),
			tocVolumesMissing: loaded.tocVolumesMissing,
			qtoc1Volumes,
		}),
		pdfArticleRows: buildPdfArticleRows(merged.stubs),
	})

	writeReports(audit, reportsDir, {
		naturalKeyLabel: 'sourceKey',
		studioAction: (r) =>
			`In Studio, find quarterlyArticle with sourceKey ${r.clipId}. Link Properties / People mentioned as needed.`,
	})
	console.log(`\nReports written to ${reportsDir}`)
	console.log(`Volumes with HTML bodies processed: ${volumesWithHtml}`)
	audit.print(reportsDir)

	console.log('Suggested Vision checks:')
	console.log('  count(*[_type == "quarterlyArticle" && !defined(issueRef)])')
	console.log('  count(*[_type == "quarterlyArticle" && defined(body)])')
	if (!config.allHtmlVolumes) {
		const volume = volumes[0]
		console.log(`  count(*[_type == "quarterlyIssue" && volume == ${volume}])`)
		console.log(`  count(*[_type == "quarterlyArticle" && issueRef->volume == ${volume}])`)
	}
}
