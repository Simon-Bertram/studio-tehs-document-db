/**
 * Build editor-facing HTML review reports from live image-batch CSVs and the
 * cumulative manual-links ledger.
 */
import fs from 'node:fs'
import path from 'node:path'

import type {ImportedRecord} from './audit'
import {IMAGE_LEDGER_DIR, taxonomyKey} from './image-manual-ledger'
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

export const DEFAULT_IMAGE_REPORTS_DIR = 'migrations/csv-import/reports/images'
export const STUDIO_INTENT_BASE = 'http://localhost:3333/intent/edit'

const BATCH_DIR = /^offset-\d+-limit-1000$/
const KIND_ORDER: LinkKind[] = ['township', 'subject', 'donation', 'other']
const KIND_TITLE: Record<LinkKind, string> = {
	township: 'Townships',
	subject: 'Subjects',
	donation: 'Donations',
	other: 'Other',
}

export interface SkippedReviewRow {
	id: string
	clipId: string
	title: string
	csvType: string
	reason: string
	detail: string
	httpStatus: string
	url: string
	batch: string
}

export interface MissingTaxonomyRow {
	id: string
	kind: LinkKind
	keyword: string
	suggested: string
	images: {clipId: string; title: string}[]
}

export interface GenerateReviewReportsOptions {
	reportsDir: string
	ledgerDir?: string
	outputDir?: string
}

export interface WrittenReviewReports {
	skipped: string
	missingTaxonomies: string
	needsManualLinks: string
}

interface SkippedCsvRow {
	clipId: string
	title: string
	csvType: string
	reason: string
	detail: string
}

interface AssetErrorCsvRow {
	archiveId: string
	url: string
	httpStatus: string
	detail: string
}

interface ImportedCsvRow {
	clipId: string
	title: string
	sanityId: string
}

interface LedgerCsvRow {
	archiveId: string
	title: string
	missingTownship: string
	missingSubject: string
	missingDonation: string
}

interface SkipReasonMeta {
	title: string
	blurb: string
	chip: string
	tone: 'neutral' | 'warn' | 'quiet'
}

const SKIP_REASON_META: Record<string, SkipReasonMeta> = {
	asset_error: {
		title: 'Missing or unreachable JPEG',
		blurb:
			'No Sanity document was created because imageFile is required. HTTP 404 means the file is not at the public URL — correct imageLocation in the CSV or upload the JPEG, then re-run that --live batch. Empty HTTP status is usually a dropped socket; re-run the same batch.',
		chip: 'JPEG missing',
		tone: 'warn',
	},
	private_image: {
		title: 'Private (left out on purpose)',
		blurb:
			'publicDisplay=N. These were skipped so private images stay out of Sanity. Only change the CSV to Y if they should be public, then re-run the batch.',
		chip: 'Private',
		tone: 'quiet',
	},
	api_error: {
		title: 'Sanity write failed',
		blurb:
			'The mutate timed out or failed. Re-run the same --live batch; upsert is idempotent by Archive ID.',
		chip: 'API error',
		tone: 'warn',
	},
	duplicate_identifier: {
		title: 'Duplicate identifier',
		blurb:
			'True duplicate (same imageLocation). One document is enough — no action unless the path should have been distinct.',
		chip: 'Duplicate',
		tone: 'quiet',
	},
	missing_clip_id: {
		title: 'Missing Archive ID',
		blurb: 'CSV row has no identifier. Add an Archive ID or leave it out.',
		chip: 'No Archive ID',
		tone: 'warn',
	},
	diverted_quarterly: {
		title: 'Diverted to Quarterly',
		blurb: 'Keyword TEHS — import with bun run csv-import:quarterly, not as a historical image.',
		chip: 'Quarterly',
		tone: 'quiet',
	},
}

function splitList(raw: string | undefined): string[] {
	return (raw ?? '')
		.split(';')
		.map((part) => part.trim())
		.filter(Boolean)
}

function slug(prefix: string, value: string): string {
	const body = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
	return `${prefix}-${body || 'item'}`
}

function studioLink(sanityId: string | undefined): string {
	if (!sanityId) return '—'
	return linkHtml(`${STUDIO_INTENT_BASE}/id=${sanityId};type=historicalImage`, 'Open in Studio')
}

export function listImageBatchDirs(reportsDir: string): string[] {
	if (!fs.existsSync(reportsDir)) return []
	return fs
		.readdirSync(reportsDir, {withFileTypes: true})
		.filter((entry) => entry.isDirectory() && BATCH_DIR.test(entry.name))
		.map((entry) => path.join(reportsDir, entry.name))
		.sort((a, b) => {
			const offsetA = Number(path.basename(a).match(/^offset-(\d+)/)?.[1] ?? 0)
			const offsetB = Number(path.basename(b).match(/^offset-(\d+)/)?.[1] ?? 0)
			return offsetA - offsetB
		})
}

async function readIfExists<T extends Record<string, string>>(filePath: string): Promise<T[]> {
	if (!fs.existsSync(filePath)) return []
	return readCsvRows<T>(filePath, Infinity)
}

export function groupSkippedByReason(
	rows: SkippedReviewRow[],
): {reason: string; rows: SkippedReviewRow[]}[] {
	const map = new Map<string, SkippedReviewRow[]>()
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

export function suggestedTaxonomyAction(kind: LinkKind, keyword: string): string {
	const trimmed = keyword.trim()
	if (kind === 'donation') {
		if (/^donation:0$/i.test(trimmed)) {
			return 'Do not create — donation:0 is invalid in MySQL. Leave unlinked.'
		}
		return 'Confirm this Donation ID exists under Information Sources → Donations.'
	}
	if (kind === 'township') {
		if (trimmed.toLowerCase() === 'schuylkill') {
			return 'CSV subject is the river, not the township. Do not put Archive IDs on a township Migration key.'
		}
		return 'Township — set Migration key to this exact spelling (any casing).'
	}
	return 'Subject Category — set Migration key to this exact spelling, or add it as a Migration Key Alias on an existing category.'
}

export function recordsFromLedgerCsv(rows: LedgerCsvRow[]): ImportedRecord[] {
	return rows
		.filter((row) => row.archiveId)
		.map((row) => ({
			clipId: row.archiveId,
			title: row.title ?? '',
			csvType: '',
			schemaType: 'historicalImage',
			action: 'patched' as const,
			mappedKeywords: [],
			unmappedKeywords: [
				...splitList(row.missingTownship),
				...splitList(row.missingSubject),
				...splitList(row.missingDonation),
			],
		}))
}

export function collectMissingTaxonomyRows(records: ImportedRecord[]): MissingTaxonomyRow[] {
	const map = new Map<string, MissingTaxonomyRow>()
	for (const record of records) {
		const seen = new Set<string>()
		for (const keyword of record.unmappedKeywords) {
			const trimmed = keyword.trim()
			if (!trimmed) continue
			const kind = classifyUnmappedKeyword(trimmed)
			const id = taxonomyKey(kind, trimmed)
			if (seen.has(id)) continue
			seen.add(id)
			let row = map.get(id)
			if (!row) {
				row = {
					id,
					kind,
					keyword: trimmed,
					suggested: suggestedTaxonomyAction(kind, trimmed),
					images: [],
				}
				map.set(id, row)
			}
			if (!row.images.some((image) => image.clipId === record.clipId)) {
				row.images.push({clipId: record.clipId, title: record.title})
			}
		}
	}
	return Array.from(map.values()).sort((a, b) => {
		const kindDiff = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
		if (kindDiff !== 0) return kindDiff
		return b.images.length - a.images.length || a.keyword.localeCompare(b.keyword)
	})
}

function clipListHtml(images: {clipId: string; title: string}[]): string {
	const items = [...images]
		.sort((a, b) => a.clipId.localeCompare(b.clipId))
		.map(
			(image) =>
				`<li><span class="mono">${escapeHtml(image.clipId)}</span> ${escapeHtml(image.title)}</li>`,
		)
		.join('')
	const noun = images.length === 1 ? 'image' : 'images'
	return `<details><summary>${images.length} ${noun}</summary><ul class="clip-list">${items}</ul></details>`
}

export async function loadSkippedRows(reportsDir: string): Promise<SkippedReviewRow[]> {
	const byClipId = new Map<string, SkippedReviewRow>()
	const withoutId: SkippedReviewRow[] = []
	let missingIndex = 0

	for (const batchDir of listImageBatchDirs(reportsDir)) {
		const batch = path.basename(batchDir)
		const skipped = await readIfExists<SkippedCsvRow>(path.join(batchDir, 'skipped.csv'))
		const assets = await readIfExists<AssetErrorCsvRow>(path.join(batchDir, 'asset-errors.csv'))
		const assetById = new Map(assets.map((row) => [row.archiveId, row]))

		for (const row of skipped) {
			const clipId = (row.clipId ?? '').trim()
			const asset = clipId ? assetById.get(clipId) : undefined
			const id = clipId || `missing-clip-id:${batch}:${missingIndex++}`
			const next: SkippedReviewRow = {
				id,
				clipId,
				title: row.title ?? '',
				csvType: row.csvType ?? '',
				reason: row.reason || 'unknown',
				detail: row.detail ?? '',
				httpStatus: asset?.httpStatus ?? '',
				url: asset?.url ?? '',
				batch,
			}
			if (clipId) byClipId.set(clipId, next)
			else withoutId.push(next)
		}
	}

	return [...byClipId.values(), ...withoutId]
}

export async function loadSanityIds(reportsDir: string): Promise<Map<string, string>> {
	const ids = new Map<string, string>()
	for (const batchDir of listImageBatchDirs(reportsDir)) {
		const imported = await readIfExists<ImportedCsvRow>(path.join(batchDir, 'imported.csv'))
		for (const row of imported) {
			if (row.clipId && row.sanityId) ids.set(row.clipId, row.sanityId)
		}
	}
	return ids
}

export async function loadLedgerRecords(ledgerDir: string): Promise<ImportedRecord[]> {
	const csvPath = path.join(ledgerDir, 'images-manual-links.csv')
	const rows = await readIfExists<LedgerCsvRow>(csvPath)
	return recordsFromLedgerCsv(rows)
}

function skipMeta(reason: string): SkipReasonMeta {
	return (
		SKIP_REASON_META[reason] ?? {
			title: reason,
			blurb: '',
			chip: reason,
			tone: 'neutral',
		}
	)
}

export function buildSkippedPage(rows: SkippedReviewRow[]): ReviewPage {
	const groups = groupSkippedByReason(rows)
	const chips: ReviewChip[] = groups.map((group) => {
		const meta = skipMeta(group.reason)
		return {value: group.reason, label: meta.chip, count: group.rows.length}
	})
	const sections: ReviewSection[] = groups.map((group) => {
		const meta = skipMeta(group.reason)
		return {
			id: slug('skipped', group.reason),
			title: `${meta.title} (${group.rows.length})`,
			blurb: meta.blurb,
			headers: ['Archive ID', 'Title', 'Type', 'HTTP', 'Source URL', 'Detail', 'Batch'],
			rows: group.rows.map((row) => ({
				id: row.id,
				filterValues: [row.reason],
				searchText: `${row.clipId} ${row.title} ${row.detail} ${row.url} ${row.batch}`,
				cells: [
					row.clipId ? `<span class="mono">${escapeHtml(row.clipId)}</span>` : '—',
					escapeHtml(row.title),
					escapeHtml(row.csvType),
					row.httpStatus
						? badgeHtml(row.httpStatus, row.httpStatus === '404' ? 'warn' : 'neutral')
						: '—',
					row.url ? linkHtml(row.url, 'Open source URL') : '—',
					escapeHtml(row.detail),
					escapeHtml(row.batch),
				],
			})),
		}
	})

	return {
		reportId: 'skipped',
		title: 'Skipped images',
		summary: `${rows.length} image ${rows.length === 1 ? 'row' : 'rows'} never became a Studio document. Grouped by skip reason. Checkmarks stay in this browser after you regenerate the HTML.`,
		howToFix: [
			'Work one reason group at a time. JPEG 404s need a correct file path or a file uploaded to the public image host, then re-run that --live batch.',
			'Empty HTTP status is usually a dropped connection — re-run the same batch; existing documents are not re-uploaded.',
			'Private rows are intentional. Only change publicDisplay to Y if they should be public.',
			'API errors: re-run `bun run csv-import:images -- --live --offset N --limit 1000` for that batch.',
			'Mark a row Resolved when you have finished with it. Export JSON to back up checkmarks.',
		],
		chips,
		chipLegend: 'Reason',
		views: [{id: 'by-reason', title: 'By skip reason', sections}],
	}
}

export function buildMissingTaxonomiesPage(rows: MissingTaxonomyRow[]): ReviewPage {
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
				headers: ['CSV keyword', 'Kind', 'Suggested action', 'Images'],
				rows: kindRows.map((row) => ({
					id: row.id,
					filterValues: [row.kind],
					searchText: `${row.keyword} ${row.kind} ${row.images.map((image) => image.clipId).join(' ')}`,
					cells: [
						`<code class="keyword">${escapeHtml(row.keyword)}</code>`,
						badgeHtml(KIND_TITLE[row.kind]),
						escapeHtml(row.suggested),
						clipListHtml(row.images),
					],
				})),
			},
		]
	})

	return {
		reportId: 'missing-taxonomies',
		title: 'Missing taxonomies',
		summary: `${rows.length} CSV ${rows.length === 1 ? 'keyword' : 'keywords'} still need a Migration key (or alias) so images can link automatically. One row per keyword — create or alias that Studio document, then re-run the import.`,
		howToFix: [
			'In Studio, open Taxonomies & Entities.',
			'Find or create the Township or Subject Category listed as the CSV keyword.',
			'Set Migration key to the exact CSV value (any casing). For extra spellings (Inn vs Inns), add Migration Key Aliases on the same Subject Category. Never put Archive IDs on a township Migration key.',
			'Re-run the image import so those images link automatically.',
			'donation:0 is invalid — leave those images unlinked. donation:N must match an existing Donation ID.',
		],
		notes: [
			'Schuylkill in the township list is usually the river (a subject), not the township. Those images already have a township.',
			'Checkmarks are review progress in this browser only. They are not written back to Sanity.',
		],
		chips,
		chipLegend: 'Kind',
		views: [{id: 'by-keyword', title: 'By keyword', sections}],
	}
}

export function buildNeedsManualLinksPage(
	records: ImportedRecord[],
	sanityIds: Map<string, string>,
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
				headers: ['Archive ID', 'Title', 'Studio'],
				rows: group.rows
					.slice()
					.sort((a, b) => a.clipId.localeCompare(b.clipId))
					.map((row) => ({
						id: row.clipId,
						filterValues: [kind],
						searchText: `${row.clipId} ${row.title} ${group.keyword}`,
						cells: [
							`<span class="mono">${escapeHtml(row.clipId)}</span>`,
							escapeHtml(row.title),
							studioLink(sanityIds.get(row.clipId)),
						],
					})),
			})
		}
	}

	const byImageSection: ReviewSection = {
		id: 'by-image-table',
		title: `All images (${records.length})`,
		headers: [
			'Archive ID',
			'Title',
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
				return {
					id: record.clipId,
					filterValues: Array.from(kinds),
					searchText: `${record.clipId} ${record.title} ${split.township} ${split.subject} ${split.donation}`,
					cells: [
						`<span class="mono">${escapeHtml(record.clipId)}</span>`,
						escapeHtml(record.title),
						escapeHtml(split.township || '—'),
						escapeHtml(split.subject || '—'),
						escapeHtml(split.donation || '—'),
						studioLink(sanityIds.get(record.clipId)),
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
		title: 'Needs manual links',
		summary: `${records.length} imported ${records.length === 1 ? 'document' : 'documents'} could not be linked to a Township, Subject, and/or Donation. Fix one taxonomy document, then re-run the import — or open an image in Studio. Checking Resolved in either view updates the other.`,
		howToFix: [
			'Prefer the “By missing value” view: create or alias one Township / Subject, then re-run the import so many images link at once.',
			'Set Migration key to the exact CSV value (any casing). Add Migration Key Aliases for extra spellings. Do not put Archive IDs on township.',
			'Use “By image” when you need to open a single document in Studio (local Studio at localhost:3333).',
			'donation:0 is invalid — leave unlinked. donation:N must exist as a Donation.',
			'Mark Resolved when you have finished with that image. Export JSON to back up checkmarks.',
		],
		chips,
		chipLegend: 'Kind',
		views: [
			{id: 'by-keyword', title: 'By missing value', sections: groupedSections},
			{id: 'by-image', title: 'By image', sections: [byImageSection]},
		],
	}
}

export async function generateImageReviewReports(
	options: GenerateReviewReportsOptions,
): Promise<WrittenReviewReports> {
	const reportsDir = options.reportsDir
	const ledgerDir = options.ledgerDir ?? IMAGE_LEDGER_DIR
	const outputDir = options.outputDir ?? reportsDir
	fs.mkdirSync(outputDir, {recursive: true})

	const [skippedRows, ledgerRecords, sanityIds] = await Promise.all([
		loadSkippedRows(reportsDir),
		loadLedgerRecords(ledgerDir),
		loadSanityIds(reportsDir),
	])

	const files = {
		skipped: path.join(outputDir, 'skipped.html'),
		missingTaxonomies: path.join(outputDir, 'missing-taxonomies.html'),
		needsManualLinks: path.join(outputDir, 'needs-manual-links.html'),
	}

	fs.writeFileSync(files.skipped, renderReviewHtml(buildSkippedPage(skippedRows)))
	fs.writeFileSync(
		files.missingTaxonomies,
		renderReviewHtml(buildMissingTaxonomiesPage(collectMissingTaxonomyRows(ledgerRecords))),
	)
	fs.writeFileSync(
		files.needsManualLinks,
		renderReviewHtml(buildNeedsManualLinksPage(ledgerRecords, sanityIds)),
	)

	return files
}
