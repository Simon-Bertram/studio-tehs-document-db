/**
 * Build editor-facing HTML review reports from a single documents import
 * reports folder (skipped.csv, needs-manual-links.csv, imported.csv).
 */
import fs from 'node:fs'
import path from 'node:path'

import type {ImportedRecord} from './audit'
import {
	collectMissingTaxonomyRows,
	recordsFromLedgerCsv,
	STUDIO_INTENT_BASE,
	suggestedTaxonomyAction,
	type WrittenReviewReports,
} from './generate-image-review-reports'
import {taxonomyKey} from './image-manual-ledger'
import {
	classifyUnmappedKeyword,
	type LinkKind,
	splitUnmappedKeywords,
} from './needs-manual-links-report'
import {readCsvRows} from './read-csv'
import {
	badgeHtml,
	escapeHtml,
	linkHtml,
	renderReviewHtml,
	type ReviewChip,
	type ReviewPage,
	type ReviewSection,
} from './review-html-report'

export const DEFAULT_DOCUMENT_REPORTS_DIR = 'migrations/csv-import/reports'
export const DOCUMENT_STORAGE_PREFIX = 'tehs-document-review'

const KIND_ORDER: LinkKind[] = ['township', 'subject', 'donation', 'other']
const KIND_TITLE: Record<LinkKind, string> = {
	township: 'Townships',
	subject: 'Subjects',
	donation: 'Donations',
	other: 'Other',
}

export interface DocumentSkippedRow {
	id: string
	clipId: string
	title: string
	csvType: string
	reason: string
	detail: string
}

interface SkippedCsvRow {
	clipId: string
	title: string
	csvType: string
	reason: string
	detail: string
}

interface ManualCsvRow {
	archiveId: string
	title: string
	missingTownship: string
	missingSubject: string
	missingDonation: string
	schemaType?: string
	action?: string
	sanityId?: string
}

interface ImportedCsvRow {
	clipId: string
	title: string
	schemaType: string
	sanityId: string
}

interface SkipReasonMeta {
	title: string
	blurb: string
	chip: string
}

const SKIP_REASON_META: Record<string, SkipReasonMeta> = {
	unknown_type: {
		title: 'Unknown CSV type',
		blurb:
			'TYPE_MAP maps newspaper ads/articles/clippings, letters, wills, genealogical records, and similar types to Primary Source; books/publications/theses to Research Article; photo to Historical Image. NULL, miscellaneous, and article stay unmapped — set the CSV type, then re-run.',
		chip: 'Unknown type',
	},
	diverted_quarterly: {
		title: 'Diverted to Quarterly',
		blurb: 'Keyword TEHS — import with bun run csv-import:quarterly, not as an archive document.',
		chip: 'Quarterly',
	},
	missing_clip_id: {
		title: 'Missing Archive ID',
		blurb: 'CSV row has no clipID. Add an Archive ID or leave it out.',
		chip: 'No Archive ID',
	},
	api_error: {
		title: 'Sanity write failed',
		blurb:
			'The mutate timed out or failed. Re-run with --live; upsert is idempotent by Archive ID.',
		chip: 'API error',
	},
}

function slug(prefix: string, value: string): string {
	const body = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
	return `${prefix}-${body || 'item'}`
}

function skipMeta(reason: string): SkipReasonMeta {
	return (
		SKIP_REASON_META[reason] ?? {
			title: reason,
			blurb: '',
			chip: reason,
		}
	)
}

function typeLabel(csvType: string): string {
	const trimmed = csvType.trim()
	return trimmed.length > 0 ? trimmed : '(empty)'
}

function studioLink(sanityId: string | undefined, schemaType: string | undefined): string {
	if (!sanityId) return '—'
	const type = schemaType || 'primarySource'
	return linkHtml(`${STUDIO_INTENT_BASE}/id=${sanityId};type=${type}`, 'Open in Studio')
}

function clipListHtml(items: {clipId: string; title: string}[]): string {
	const list = [...items]
		.sort((a, b) => a.clipId.localeCompare(b.clipId))
		.map(
			(item) =>
				`<li><span class="mono">${escapeHtml(item.clipId)}</span> ${escapeHtml(item.title)}</li>`,
		)
		.join('')
	const noun = items.length === 1 ? 'document' : 'documents'
	return `<details><summary>${items.length} ${noun}</summary><ul class="clip-list">${list}</ul></details>`
}

async function readIfExists<T extends Record<string, string>>(filePath: string): Promise<T[]> {
	if (!fs.existsSync(filePath)) return []
	return readCsvRows<T>(filePath, Infinity)
}

export function groupSkippedByReason(
	rows: DocumentSkippedRow[],
): {reason: string; rows: DocumentSkippedRow[]}[] {
	const map = new Map<string, DocumentSkippedRow[]>()
	for (const row of rows) {
		const list = map.get(row.reason) ?? []
		list.push(row)
		map.set(row.reason, list)
	}
	for (const list of map.values()) {
		list.sort((a, b) => a.clipId.localeCompare(b.clipId) || a.id.localeCompare(b.id))
	}
	return Array.from(map.entries())
		.map(([reason, grouped]) => ({reason, rows: grouped}))
		.sort((a, b) => b.rows.length - a.rows.length || a.reason.localeCompare(b.reason))
}

export function groupUnknownTypeByCsvType(
	rows: DocumentSkippedRow[],
): {csvType: string; rows: DocumentSkippedRow[]}[] {
	const map = new Map<string, DocumentSkippedRow[]>()
	for (const row of rows) {
		const key = typeLabel(row.csvType)
		const list = map.get(key) ?? []
		list.push(row)
		map.set(key, list)
	}
	for (const list of map.values()) {
		list.sort((a, b) => a.clipId.localeCompare(b.clipId) || a.id.localeCompare(b.id))
	}
	return Array.from(map.entries())
		.map(([csvType, grouped]) => ({csvType, rows: grouped}))
		.sort((a, b) => b.rows.length - a.rows.length || a.csvType.localeCompare(b.csvType))
}

function skippedCells(row: DocumentSkippedRow): string[] {
	return [
		row.clipId ? `<span class="mono">${escapeHtml(row.clipId)}</span>` : '—',
		escapeHtml(row.title),
		escapeHtml(typeLabel(row.csvType)),
		badgeHtml(skipMeta(row.reason).chip, row.reason === 'unknown_type' ? 'warn' : 'quiet'),
		escapeHtml(row.detail),
	]
}

function skippedRow(row: DocumentSkippedRow, extraFilter?: string): ReviewSection['rows'][number] {
	return {
		id: row.id,
		filterValues: extraFilter ? [row.reason, extraFilter] : [row.reason],
		searchText: `${row.clipId} ${row.title} ${row.csvType} ${row.reason} ${row.detail}`,
		cells: skippedCells(row),
	}
}

const SKIPPED_HEADERS = ['Archive ID', 'Title', 'CSV type', 'Reason', 'Detail']

export function buildDocumentSkippedPage(rows: DocumentSkippedRow[]): ReviewPage {
	const groups = groupSkippedByReason(rows)
	const chips: ReviewChip[] = groups.map((group) => {
		const meta = skipMeta(group.reason)
		return {value: group.reason, label: meta.chip, count: group.rows.length}
	})
	const sections: ReviewSection[] = []
	for (const group of groups) {
		const meta = skipMeta(group.reason)
		if (group.reason === 'unknown_type') {
			const byType = groupUnknownTypeByCsvType(group.rows)
			byType.forEach((typeGroup, index) => {
				sections.push({
					id: slug('skipped', `unknown-${typeGroup.csvType}`),
					title: `${typeGroup.csvType} (${typeGroup.rows.length})`,
					headingGroup: `${meta.title} (${group.rows.length})`,
					blurb: index === 0 ? meta.blurb : undefined,
					headers: SKIPPED_HEADERS,
					rows: typeGroup.rows.map((row) => skippedRow(row)),
				})
			})
			continue
		}
		sections.push({
			id: slug('skipped', group.reason),
			title: `${meta.title} (${group.rows.length})`,
			blurb: meta.blurb,
			headers: SKIPPED_HEADERS,
			rows: group.rows.map((row) => skippedRow(row)),
		})
	}

	return {
		reportId: 'skipped',
		storageKeyPrefix: DOCUMENT_STORAGE_PREFIX,
		title: 'Skipped documents',
		summary: `${rows.length} CSV ${rows.length === 1 ? 'row' : 'rows'} never became a Studio document. Grouped by skip reason; unknown types are split by the CSV type column. Checkmarks stay in this browser after you regenerate the HTML.`,
		howToFix: [
			'Unknown type: decide whether the row should be a Primary Source, Research Article, or Historical Image. Then add that spelling to TYPE_MAP in migrations/csv-import/lib/clean.ts, or fix the CSV type, and re-run the import.',
			'TEHS keyword: import with bun run csv-import:quarterly, not as an archive document.',
			'Missing clipID: add an Archive ID in the CSV or leave the row out.',
			'API errors: re-run bun run csv-import -- migrations/data/documents-full.csv --live. Upsert is idempotent by Archive ID.',
			'Mark a row Resolved when you have finished with it. Export JSON to back up checkmarks.',
		],
		chips,
		chipLegend: 'Reason',
		views: [{id: 'by-reason', title: 'By skip reason', sections}],
	}
}

export function buildDocumentMissingTaxonomiesPage(records: ImportedRecord[]): ReviewPage {
	const rows = collectMissingTaxonomyRows(records)
	const chips: ReviewChip[] = KIND_ORDER.flatMap((kind) => {
		const count = rows.filter((row) => row.kind === kind).length
		if (count === 0) return []
		return [{value: kind, label: KIND_TITLE[kind], count}]
	})
	const sections: ReviewSection[] = KIND_ORDER.flatMap((kind) => {
		const kindRows = rows.filter((row) => row.kind === kind)
		if (kindRows.length === 0) return []
		return [
			{
				id: slug('missing', kind),
				title: `${KIND_TITLE[kind]} (${kindRows.length})`,
				headers: ['CSV keyword', 'Kind', 'Suggested action', 'Documents'],
				rows: kindRows.map((row) => ({
					id: row.id,
					filterValues: [row.kind],
					searchText: `${row.keyword} ${row.kind} ${row.images.map((image) => image.clipId).join(' ')}`,
					cells: [
						`<code class="keyword">${escapeHtml(row.keyword)}</code>`,
						badgeHtml(KIND_TITLE[row.kind]),
						escapeHtml(suggestedTaxonomyAction(row.kind, row.keyword)),
						clipListHtml(row.images),
					],
				})),
			},
		]
	})

	return {
		reportId: 'missing-taxonomies',
		storageKeyPrefix: DOCUMENT_STORAGE_PREFIX,
		title: 'Missing taxonomies',
		summary: `${rows.length} CSV ${rows.length === 1 ? 'keyword' : 'keywords'} still need a Migration key (or alias) so imported documents can link automatically. One row per keyword — create or alias that Studio document, then re-run the import.`,
		howToFix: [
			'In Studio, open Taxonomies & Entities.',
			'Find or create the Township or Subject Category listed as the CSV keyword.',
			'Set Migration key to the exact CSV value (any casing). For extra spellings, add Migration Key Aliases on the same Subject Category. Never put Archive IDs on a township Migration key.',
			'Re-run the documents import so those rows link automatically.',
		],
		notes: [
			'Only rows that mapped to document / photo / book are in this list. Unknown CSV types appear on skipped.html.',
			'Checkmarks are review progress in this browser only. They are not written back to Sanity.',
		],
		chips,
		chipLegend: 'Kind',
		views: [{id: 'by-keyword', title: 'By keyword', sections}],
	}
}

export function buildDocumentNeedsManualLinksPage(
	records: ImportedRecord[],
	schemaById: Map<string, string>,
): ReviewPage {
	const groups = new Map<string, {kind: LinkKind; keyword: string; rows: ImportedRecord[]}>()
	for (const record of records) {
		for (const keyword of record.unmappedKeywords) {
			const trimmed = keyword.trim()
			if (!trimmed) continue
			const kind = classifyUnmappedKeyword(trimmed)
			const mapKey = taxonomyKey(kind, trimmed)
			let group = groups.get(mapKey)
			if (!group) {
				group = {kind, keyword: trimmed, rows: []}
				groups.set(mapKey, group)
			}
			if (!group.rows.some((existing) => existing.clipId === record.clipId)) {
				group.rows.push(record)
			}
		}
	}

	const groupedSections: ReviewSection[] = []
	for (const kind of KIND_ORDER) {
		const kindGroups = Array.from(groups.values())
			.filter((group) => group.kind === kind)
			.sort((a, b) => b.rows.length - a.rows.length || a.keyword.localeCompare(b.keyword))
		for (const group of kindGroups) {
			groupedSections.push({
				id: slug('manual', `${kind}-${group.keyword}`),
				title: `${group.keyword} (${group.rows.length})`,
				headingGroup: KIND_TITLE[kind],
				headers: ['Archive ID', 'Title', 'Studio type', 'Studio'],
				rows: group.rows
					.slice()
					.sort((a, b) => a.clipId.localeCompare(b.clipId))
					.map((row) => ({
						id: row.clipId,
						filterValues: [kind],
						searchText: `${row.clipId} ${row.title} ${group.keyword} ${row.schemaType}`,
						cells: [
							`<span class="mono">${escapeHtml(row.clipId)}</span>`,
							escapeHtml(row.title),
							escapeHtml(row.schemaType || schemaById.get(row.clipId) || '—'),
							studioLink(row.sanityId, row.schemaType || schemaById.get(row.clipId)),
						],
					})),
			})
		}
	}

	const byDocumentSection: ReviewSection = {
		id: 'by-document-table',
		title: `All documents (${records.length})`,
		headers: [
			'Archive ID',
			'Title',
			'Studio type',
			'Missing township',
			'Missing subject',
			'Missing donation',
			'Studio',
		],
		rows: records
			.slice()
			.sort((a, b) => a.clipId.localeCompare(b.clipId))
			.map((record) => {
				const split = splitUnmappedKeywords(record.unmappedKeywords)
				const kinds = new Set(
					record.unmappedKeywords.map((keyword) => classifyUnmappedKeyword(keyword)),
				)
				const schemaType = record.schemaType || schemaById.get(record.clipId) || ''
				return {
					id: record.clipId,
					filterValues: Array.from(kinds),
					searchText: `${record.clipId} ${record.title} ${schemaType} ${split.township} ${split.subject} ${split.donation}`,
					cells: [
						`<span class="mono">${escapeHtml(record.clipId)}</span>`,
						escapeHtml(record.title),
						escapeHtml(schemaType || '—'),
						escapeHtml(split.township || '—'),
						escapeHtml(split.subject || '—'),
						escapeHtml(split.donation || '—'),
						studioLink(record.sanityId, schemaType),
					],
				}
			}),
	}

	const chips: ReviewChip[] = KIND_ORDER.flatMap((kind) => {
		const count = records.filter((record) =>
			record.unmappedKeywords.some((keyword) => classifyUnmappedKeyword(keyword) === kind),
		).length
		if (count === 0) return []
		return [{value: kind, label: KIND_TITLE[kind], count}]
	})

	return {
		reportId: 'needs-manual-links',
		storageKeyPrefix: DOCUMENT_STORAGE_PREFIX,
		title: 'Needs manual links',
		summary: `${records.length} imported ${records.length === 1 ? 'document' : 'documents'} could not be linked to a Township, Subject, and/or Donation. Fix one taxonomy document, then re-run the import. Checking Resolved in either view updates the other.`,
		howToFix: [
			'Prefer the “By missing value” view: create or alias one Township / Subject, then re-run the import so many documents link at once.',
			'Set Migration key to the exact CSV value (any casing). Add Migration Key Aliases for extra spellings. Do not put Archive IDs on township.',
			'Studio links appear only after a --live import (dry-run has no Sanity id). Search Studio by Archive ID until then.',
			'Mark Resolved when you have finished with that document. Export JSON to back up checkmarks.',
		],
		chips,
		chipLegend: 'Kind',
		views: [
			{id: 'by-keyword', title: 'By missing value', sections: groupedSections},
			{id: 'by-document', title: 'By document', sections: [byDocumentSection]},
		],
	}
}

export async function loadDocumentSkippedRows(reportsDir: string): Promise<DocumentSkippedRow[]> {
	const skipped = await readIfExists<SkippedCsvRow>(path.join(reportsDir, 'skipped.csv'))
	let missingIndex = 0
	return skipped.map((row) => {
		const clipId = (row.clipId ?? '').trim()
		return {
			id: clipId || `missing-clip-id:${missingIndex++}`,
			clipId,
			title: row.title ?? '',
			csvType: row.csvType ?? '',
			reason: row.reason || 'unknown',
			detail: row.detail ?? '',
		}
	})
}

export async function loadDocumentManualRecords(reportsDir: string): Promise<{
	records: ImportedRecord[]
	schemaById: Map<string, string>
}> {
	const manual = await readIfExists<ManualCsvRow>(path.join(reportsDir, 'needs-manual-links.csv'))
	const imported = await readIfExists<ImportedCsvRow>(path.join(reportsDir, 'imported.csv'))
	const schemaById = new Map<string, string>()
	const sanityById = new Map<string, string>()
	const manualById = new Map(manual.map((row) => [row.archiveId, row]))
	for (const row of imported) {
		if (row.clipId && row.schemaType) schemaById.set(row.clipId, row.schemaType)
		if (row.clipId && row.sanityId) sanityById.set(row.clipId, row.sanityId)
	}
	const records = recordsFromLedgerCsv(manual).map((record) => {
		const csv = manualById.get(record.clipId)
		return {
			...record,
			schemaType: csv?.schemaType || schemaById.get(record.clipId) || record.schemaType,
			action: (csv?.action as ImportedRecord['action']) ?? record.action,
			sanityId: csv?.sanityId || sanityById.get(record.clipId) || record.sanityId,
		}
	})
	return {records, schemaById}
}

export async function generateDocumentReviewReports(options: {
	reportsDir: string
	outputDir?: string
}): Promise<WrittenReviewReports> {
	const reportsDir = options.reportsDir
	const outputDir = options.outputDir ?? reportsDir
	fs.mkdirSync(outputDir, {recursive: true})

	const [skippedRows, manual] = await Promise.all([
		loadDocumentSkippedRows(reportsDir),
		loadDocumentManualRecords(reportsDir),
	])

	const files = {
		skipped: path.join(outputDir, 'skipped.html'),
		missingTaxonomies: path.join(outputDir, 'missing-taxonomies.html'),
		needsManualLinks: path.join(outputDir, 'needs-manual-links.html'),
	}

	fs.writeFileSync(files.skipped, renderReviewHtml(buildDocumentSkippedPage(skippedRows)))
	fs.writeFileSync(
		files.missingTaxonomies,
		renderReviewHtml(buildDocumentMissingTaxonomiesPage(manual.records)),
	)
	fs.writeFileSync(
		files.needsManualLinks,
		renderReviewHtml(buildDocumentNeedsManualLinksPage(manual.records, manual.schemaById)),
	)

	return files
}
