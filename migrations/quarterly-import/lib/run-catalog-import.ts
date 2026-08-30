/**
 * Catalog import: quarterly issues, then article stubs (no article HTML bodies).
 */
import fs from 'node:fs'
import path from 'node:path'

import type {SanityClient} from '@sanity/client'
import pLimit from 'p-limit'

import {SANITY_DATASET, SANITY_PROJECT_ID} from '../../../lib/sanityEnv'
import {Audit} from '../../csv-import/lib/audit'
import {upsertByQuery} from '../../csv-import/lib/upsert-by-query'
import {toCsv, writeReports} from '../../csv-import/lib/write-reports'
import {parseIssueSourceKey} from '../../lib/quarterly-issue-source-key'
import type {QuarterlyImportConfig} from './cli-config'
import {extractCatalogSnapshots} from './extract-catalog'
import {loadCatalogSources} from './load-catalog'
import {
	catalogIssueDoc,
	mergeArticleStubs,
	unionIssues,
	type CatalogIssue,
	type CatalogStub,
} from './merge-catalog'
import {upsertIssueSparse} from './upsert-issue-sparse'

const STUB_CONCURRENCY = 5

function filterByVolume<T extends {volume: number}>(items: T[], volume?: number): T[] {
	if (volume == null) return items
	return items.filter((item) => item.volume === volume)
}

async function upsertStubSparse(
	client: SanityClient,
	stub: CatalogStub,
	issueId: string,
): Promise<{action: 'created' | 'patched'; id: string}> {
	const existing = await client.fetch<{
		_id: string
		title?: string
		authorText?: string
		startPage?: number
		endPage?: number
		sourceUrl?: string
		issueRef?: {_ref: string}
	} | null>(
		`*[_type == "quarterlyArticle" && sourceKey == $sourceKey && !(_id in path("drafts.**"))][0]{
			_id, title, authorText, startPage, endPage, sourceUrl, issueRef
		}`,
		{sourceKey: stub.sourceKey},
	)

	const fields: Record<string, unknown> = {
		_type: 'quarterlyArticle',
		sourceKey: stub.sourceKey,
	}
	if (!existing?.title) fields.title = stub.title
	if (!existing?.authorText && stub.authorText) fields.authorText = stub.authorText
	if (existing?.startPage == null && stub.startPage != null) fields.startPage = stub.startPage
	if (existing?.endPage == null && stub.endPage != null) fields.endPage = stub.endPage
	if (!existing?.sourceUrl && stub.sourceUrl) fields.sourceUrl = stub.sourceUrl
	if (!existing?.issueRef) fields.issueRef = {_type: 'reference', _ref: issueId}

	if (!existing) {
		return upsertByQuery(
			client,
			{
				_type: 'quarterlyArticle',
				title: stub.title,
				sourceKey: stub.sourceKey,
				issueRef: {_type: 'reference', _ref: issueId},
				...(stub.authorText ? {authorText: stub.authorText} : {}),
				...(stub.startPage != null ? {startPage: stub.startPage} : {}),
				...(stub.endPage != null ? {endPage: stub.endPage} : {}),
				...(stub.sourceUrl ? {sourceUrl: stub.sourceUrl} : {}),
			},
			`_type == "quarterlyArticle" && sourceKey == $sourceKey`,
			{sourceKey: stub.sourceKey},
		)
	}

	await client.patch(existing._id).set(fields).commit()
	return {action: 'patched', id: existing._id}
}

function printIssueReport(issues: CatalogIssue[], tocCount: number, qtoc1Count: number) {
	const doubles = issues.filter((issue) => issue.combinedIssue).length
	const bySource = {toc: 0, qtoc1: 0, pdf: 0}
	for (const issue of issues) {
		if (issue.source === 'volume-toc') bySource.toc += 1
		else if (issue.source === 'qtoc1') bySource.qtoc1 += 1
		else bySource.pdf += 1
	}
	console.log(`Issues: ${issues.length} (volume TOC headings ${tocCount}, qtoc1 ${qtoc1Count})`)
	console.log(
		`  source of truth: volume-toc ${bySource.toc}, qtoc1 ${bySource.qtoc1}, pdf-only ${bySource.pdf}`,
	)
	console.log(`  combined / double issues: ${doubles}`)
}

/**
 * Snapshot sources to disk (qtoc1, volume TOCs, HQ index PDF).
 */
export async function runCatalogExtract(config: QuarterlyImportConfig): Promise<void> {
	console.log('--- TEHS Quarterly catalog extract ---')
	await extractCatalogSnapshots({
		snapshotDir: config.snapshotDir,
		maxVolume: config.maxVolume,
		refresh: config.refresh,
	})
}

/**
 * Phase 1 + optional phase 2 catalog import (dry-run default).
 */
export async function runCatalogImport(
	config: QuarterlyImportConfig,
	client: SanityClient,
): Promise<void> {
	const {dryRun, rowLimit, reportsDir, snapshotDir, maxVolume, refresh, volume} = config
	const writeStubs = config.mode === 'article-stubs'
	const label = dryRun ? 'DRY RUN' : 'LIVE'

	console.log(`--- TEHS Quarterly catalog (${label}) ---`)
	console.log(`Mode: ${writeStubs ? '--article-stubs' : '--issues'}`)
	console.log(`Snapshot: ${snapshotDir}`)
	console.log(`Project: ${SANITY_PROJECT_ID} / ${SANITY_DATASET}`)
	if (volume != null) console.log(`Volume filter: ${volume}`)
	if (rowLimit < Infinity) console.log(`Limit: ${rowLimit}`)
	console.log()

	const loaded = await loadCatalogSources({
		snapshotDir,
		maxVolume,
		refresh,
		extractIfMissing: true,
	})

	const allIssues = unionIssues({
		tocIssues: loaded.tocIssues,
		qtoc1Issues: loaded.qtoc1Issues,
		pdfRows: loaded.pdfRows,
	})
	let issues = filterByVolume(allIssues, volume)
	if (rowLimit < Infinity && !writeStubs) issues = issues.slice(0, rowLimit)

	printIssueReport(issues, loaded.tocIssues.length, loaded.qtoc1Issues.length)
	const pdfOnly = issues.filter((issue) => issue.source === 'pdf')
	if (pdfOnly.length > 0) {
		console.log(`  pdf-only issues (review): ${pdfOnly.map((issue) => issue.sourceKey).join(', ')}`)
	}
	console.log(
		`TOC volumes loaded: ${loaded.tocVolumesLoaded.length}; missing: ${loaded.tocVolumesMissing.length}`,
	)
	if (loaded.qtoc1Skipped.length > 0) {
		const boilerplate = loaded.qtoc1Skipped.filter((s) => s.reason === 'boilerplate').length
		const subheads = loaded.qtoc1Skipped.filter((s) => s.reason === 'subhead_no_author').length
		console.log(
			`qtoc1 skips: ${boilerplate} Support Recognition, ${subheads} subheads without author`,
		)
	}

	const audit = new Audit()
	const issueIdBySourceKey = new Map<string, string>()

	if (dryRun) {
		for (const issue of issues) {
			audit.recordImported({
				clipId: issue.sourceKey,
				title: `Vol. ${issue.volume} No. ${issue.issueNumber}`,
				csvType: issue.source,
				schemaType: 'quarterlyIssue',
				action: 'dry_run',
				mappedKeywords: [],
				unmappedKeywords: [],
			})
			console.log(`[DRY RUN] quarterlyIssue → ${issue.sourceKey}`)
		}
	} else {
		for (const issue of issues) {
			try {
				const doc = catalogIssueDoc(issue)
				const result = await upsertIssueSparse(client, doc, {uploadCover: true})
				issueIdBySourceKey.set(issue.sourceKey, result.id)
				audit.recordImported({
					clipId: issue.sourceKey,
					title: `Vol. ${issue.volume} No. ${issue.issueNumber}`,
					csvType: issue.source,
					schemaType: 'quarterlyIssue',
					action: result.action,
					sanityId: result.id,
					mappedKeywords: [],
					unmappedKeywords: [],
				})
				console.log(`[OK] ${result.action} quarterlyIssue → ${issue.sourceKey} (${result.id})`)
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				audit.skip({
					clipId: issue.sourceKey,
					title: `Vol. ${issue.volume} No. ${issue.issueNumber}`,
					csvType: issue.source,
					reason: 'api_error',
					detail: msg,
				})
			}
		}
	}

	const merged = mergeArticleStubs({
		issues: allIssues,
		tocArticles: loaded.tocArticles,
		qtoc1Articles: loaded.qtoc1Articles,
		pdfRows: loaded.pdfRows,
	})
	let stubs: CatalogStub[] = []
	const unmatched =
		volume == null ? merged.unmatched : merged.unmatched.filter((row) => row.volume === volume)

	if (writeStubs) {
		stubs = filterByVolume(merged.stubs, volume)
		if (rowLimit < Infinity) stubs = stubs.slice(0, rowLimit)
		audit.totalRows = issues.length + stubs.length

		const nonNumeric = stubs.filter((stub) => stub.pageLabel && stub.startPage == null)
		for (const stub of nonNumeric) {
			audit.warn(`${stub.sourceKey}: non-numeric page "${stub.pageLabel}"; startPage left unset`)
		}

		if (dryRun) {
			for (const stub of stubs) {
				audit.recordImported({
					clipId: stub.sourceKey,
					title: stub.title,
					csvType: stub.origin,
					schemaType: 'quarterlyArticle',
					action: 'dry_run',
					mappedKeywords: [],
					unmappedKeywords: [],
				})
				console.log(`[DRY RUN] quarterlyArticle stub → ${stub.sourceKey} (${stub.title})`)
			}
		} else {
			const existingIssues = await client.fetch<Array<{_id: string; sourceKey: string}>>(
				`*[_type == "quarterlyIssue" && defined(sourceKey) && !(_id in path("drafts.**"))]{_id, sourceKey}`,
			)
			for (const row of existingIssues) issueIdBySourceKey.set(row.sourceKey, row._id)

			const limit = pLimit(STUB_CONCURRENCY)
			await Promise.all(
				stubs.map((stub) =>
					limit(async () => {
						const issueId = issueIdBySourceKey.get(stub.issueSourceKey)
						if (!issueId) {
							audit.skip({
								clipId: stub.sourceKey,
								title: stub.title,
								csvType: stub.origin,
								reason: 'unmatched_issue',
								detail: `No quarterlyIssue for ${stub.issueSourceKey}`,
							})
							return
						}
						try {
							const result = await upsertStubSparse(client, stub, issueId)
							audit.recordImported({
								clipId: stub.sourceKey,
								title: stub.title,
								csvType: stub.origin,
								schemaType: 'quarterlyArticle',
								action: result.action,
								sanityId: result.id,
								mappedKeywords: [],
								unmappedKeywords: [],
							})
							console.log(`[OK] ${result.action} quarterlyArticle → ${stub.sourceKey}`)
						} catch (err) {
							const msg = err instanceof Error ? err.message : String(err)
							audit.skip({
								clipId: stub.sourceKey,
								title: stub.title,
								csvType: stub.origin,
								reason: 'api_error',
								detail: msg,
							})
						}
					}),
				),
			)
		}
	} else {
		audit.totalRows = issues.length
	}

	for (const skip of loaded.qtoc1Skipped.filter((s) => s.reason === 'boilerplate')) {
		if (!writeStubs) continue
		if (volume != null) {
			const parsed = skip.issueSourceKey ? parseIssueSourceKey(skip.issueSourceKey) : null
			if (parsed && parsed.volume !== volume) continue
		}
		audit.skip({
			clipId: skip.issueSourceKey,
			title: skip.title,
			csvType: 'qtoc1',
			reason: 'boilerplate',
			detail: 'Repeated issue boilerplate with no author',
		})
	}

	fs.mkdirSync(reportsDir, {recursive: true})

	if (dryRun) {
		const issuePreview = path.join(reportsDir, 'issues-preview.ndjson')
		fs.writeFileSync(
			issuePreview,
			issues.map((issue) => JSON.stringify(catalogIssueDoc(issue))).join('\n'),
		)
		console.log(`\nIssue preview: ${issuePreview}`)
		if (writeStubs) {
			const stubPreview = path.join(reportsDir, 'stubs-preview.ndjson')
			fs.writeFileSync(
				stubPreview,
				stubs
					.map((stub) =>
						JSON.stringify({
							_type: 'quarterlyArticle',
							title: stub.title,
							authorText: stub.authorText,
							issueSourceKey: stub.issueSourceKey,
							startPage: stub.startPage,
							endPage: stub.endPage,
							sourceKey: stub.sourceKey,
							sourceUrl: stub.sourceUrl,
							origin: stub.origin,
						}),
					)
					.join('\n'),
			)
			console.log(`Stub preview: ${stubPreview}`)
		}
	}

	if (writeStubs || unmatched.length > 0) {
		const unmatchedPath = path.join(reportsDir, 'unmatched-index.csv')
		fs.writeFileSync(
			unmatchedPath,
			toCsv(
				['author', 'title', 'citation', 'volume', 'issueNumber', 'startPage', 'reason'],
				unmatched.map((row) => [
					row.authorText,
					row.title,
					row.citation,
					String(row.volume),
					String(row.issueNumber),
					String(row.startPage),
					row.reason,
				]),
			),
		)
		console.log(`Unmatched PDF rows: ${unmatched.length} → ${unmatchedPath}`)
	}

	writeReports(audit, reportsDir, {
		naturalKeyLabel: 'sourceKey',
		studioAction: (r) => `In Studio, find ${r.schemaType} with sourceKey ${r.clipId}.`,
	})
	console.log(`\nReports written to ${reportsDir}`)
	audit.print(reportsDir)

	console.log('Suggested Vision checks:')
	console.log('  count(*[_type == "quarterlyIssue"])')
	console.log('  count(*[_type == "quarterlyArticle" && !defined(body)])')
	console.log('  *[_type == "quarterlyIssue" && sourceKey == "v22n1"][0]')
	console.log('  *[_type == "quarterlyArticle" && sourceKey == "v22n1p003"]{title, issueRef->}')
}
