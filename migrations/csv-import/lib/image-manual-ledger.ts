import fs from 'node:fs'
import path from 'node:path'

import type {ImportedRecord} from './audit'
import {cleanString} from './clean'
import type {ImageCsvRow} from './map-image-row'
import {
	classifyUnmappedKeyword,
	formatNeedsManualLinksMarkdown,
	type LinkKind,
	splitUnmappedKeywords,
} from './needs-manual-links-report'
import {toCsv} from './write-reports'

export const IMAGE_LEDGER_DIR = 'migrations/csv-import/ledgers'
const LEDGER_JSON = 'images-manual-links.json'
const LEDGER_MD = 'images-manual-links.md'
const LEDGER_CSV = 'images-manual-links.csv'

const PERSON_SUBJECTS = new Set(['person', 'people'])

export interface LedgerRow {
	clipId: string
	title: string
}

export interface TaxonomyGroup {
	kind: LinkKind
	keyword: string
	rows: LedgerRow[]
}

export interface ImageManualLedger {
	taxonomy: Record<string, TaxonomyGroup>
	locations: Record<string, LedgerRow[]>
	peopleReview: LedgerRow[]
	updatedAt: string
}

export function emptyLedger(): ImageManualLedger {
	return {
		taxonomy: {},
		locations: {},
		peopleReview: [],
		updatedAt: new Date().toISOString(),
	}
}

export function taxonomyKey(kind: LinkKind, keyword: string): string {
	return `${kind}:${keyword.trim().toLowerCase()}`
}

export function isPersonSubject(subject: string | null | undefined): boolean {
	const key = cleanString(subject)?.toLowerCase()
	return Boolean(key && PERSON_SUBJECTS.has(key))
}

function upsertRow(rows: LedgerRow[], row: LedgerRow): LedgerRow[] {
	const without = rows.filter((existing) => existing.clipId !== row.clipId)
	without.push(row)
	return without.sort((a, b) => a.clipId.localeCompare(b.clipId))
}

function dropClipId(rows: LedgerRow[], clipId: string): LedgerRow[] {
	return rows.filter((row) => row.clipId !== clipId)
}

function dropClipFromLocations(
	locations: Record<string, LedgerRow[]>,
	clipId: string,
): Record<string, LedgerRow[]> {
	const next: Record<string, LedgerRow[]> = {}
	for (const [place, rows] of Object.entries(locations)) {
		const kept = dropClipId(rows, clipId)
		if (kept.length > 0) next[place] = kept
	}
	return next
}

/**
 * This batch is the source of truth for each imported archiveId: drop it from
 * previous groups, then re-add only still-unmapped township/subject/donation.
 */
export function mergeImageManualLedger(
	previous: ImageManualLedger,
	batch: {
		imported: ImportedRecord[]
		locationRows: (LedgerRow & {photoLocation: string})[]
		peopleRows: LedgerRow[]
	},
): ImageManualLedger {
	const taxonomy: Record<string, TaxonomyGroup> = {}
	for (const [key, group] of Object.entries(previous.taxonomy)) {
		taxonomy[key] = {...group, rows: [...group.rows]}
	}
	let locations = {...previous.locations}
	for (const key of Object.keys(locations)) {
		locations[key] = [...locations[key]]
	}
	let peopleReview = [...previous.peopleReview]

	const batchIds = new Set(batch.imported.map((record) => record.clipId))

	for (const clipId of batchIds) {
		for (const key of Object.keys(taxonomy)) {
			taxonomy[key] = {
				...taxonomy[key],
				rows: dropClipId(taxonomy[key].rows, clipId),
			}
			if (taxonomy[key].rows.length === 0) delete taxonomy[key]
		}
		locations = dropClipFromLocations(locations, clipId)
		peopleReview = dropClipId(peopleReview, clipId)
	}

	for (const record of batch.imported) {
		const row: LedgerRow = {clipId: record.clipId, title: record.title}
		for (const keyword of record.unmappedKeywords) {
			const trimmed = keyword.trim()
			if (!trimmed) continue
			const kind = classifyUnmappedKeyword(trimmed)
			const key = taxonomyKey(kind, trimmed)
			const existing = taxonomy[key] ?? {kind, keyword: trimmed, rows: []}
			taxonomy[key] = {
				kind,
				keyword: existing.keyword,
				rows: upsertRow(existing.rows, row),
			}
		}
	}

	for (const location of batch.locationRows) {
		if (!batchIds.has(location.clipId)) continue
		const place = location.photoLocation.trim()
		if (!place) continue
		const row: LedgerRow = {clipId: location.clipId, title: location.title}
		locations[place] = upsertRow(locations[place] ?? [], row)
	}

	for (const person of batch.peopleRows) {
		if (!batchIds.has(person.clipId)) continue
		peopleReview = upsertRow(peopleReview, person)
	}

	return {
		taxonomy,
		locations,
		peopleReview,
		updatedAt: new Date().toISOString(),
	}
}

export function ledgerToImportedRecords(ledger: ImageManualLedger): ImportedRecord[] {
	const byId = new Map<string, ImportedRecord>()
	for (const group of Object.values(ledger.taxonomy)) {
		for (const row of group.rows) {
			let record = byId.get(row.clipId)
			if (!record) {
				record = {
					clipId: row.clipId,
					title: row.title,
					csvType: '',
					schemaType: 'historicalImage',
					action: 'patched',
					mappedKeywords: [],
					unmappedKeywords: [],
				}
				byId.set(row.clipId, record)
			}
			if (!record.unmappedKeywords.includes(group.keyword)) {
				record.unmappedKeywords.push(group.keyword)
			}
		}
	}
	return Array.from(byId.values()).sort((a, b) => a.clipId.localeCompare(b.clipId))
}

function formatExtraSections(ledger: ImageManualLedger): string {
	const sections: string[] = []
	const places = Object.entries(ledger.locations).sort(
		(a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
	)
	if (places.length > 0) {
		sections.push('## Location text (not auto-linked)', '')
		sections.push(
			'`photoLocation` is stored on the CSV only. Match these to a Specific Location in Studio later; the importer does not set `historicalImage.location`.',
			'',
		)
		for (const [place, rows] of places) {
			sections.push(`### ${place} (${rows.length})`, '')
			sections.push('| Archive ID | Title |')
			sections.push('| --- | --- |')
			for (const row of rows) {
				sections.push(`| ${row.clipId} | ${row.title.replace(/\|/g, '\\|')} |`)
			}
			sections.push('')
		}
	}

	if (ledger.peopleReview.length > 0) {
		sections.push('## Review people depicted', '')
		sections.push(
			'Subject is Person / People (a category, not a person document). Titles are hints only — link `people[]` in Studio by hand.',
			'',
		)
		sections.push('| Archive ID | Title |')
		sections.push('| --- | --- |')
		for (const row of ledger.peopleReview) {
			sections.push(`| ${row.clipId} | ${row.title.replace(/\|/g, '\\|')} |`)
		}
		sections.push('')
	}

	return sections.join('\n')
}

export function formatCumulativeLedgerMarkdown(ledger: ImageManualLedger): string {
	const records = ledgerToImportedRecords(ledger)
	const extra = formatExtraSections(ledger)
	if (records.length === 0 && extra.length === 0) {
		return [
			'# Images manual-links ledger',
			'',
			'Cumulative punch list across live batches. None outstanding.',
			'',
		].join('\n')
	}

	const body = formatNeedsManualLinksMarkdown(records, {
		howToFix: [
			'This file accumulates across `--live` batches. Batch reports under `reports/images/offset-*-limit-*` are gitignored.',
			'',
			'1. In Studio, open **Taxonomies & Entities**.',
			'2. Find (or create) the Township or Subject listed below.',
			'3. Set **Migration key** to the exact CSV value (any casing). For extra spellings (Inn vs Inns), add **Migration Key Aliases** on the same Subject Category. Do not put Archive IDs on township.',
			'4. Re-run the same batch (or later batches) with `--live` so those images link automatically.',
			'5. For a `donation:N` line, confirm Donation ID `N` exists. `donation:0` is invalid — leave unlinked.',
		].join('\n'),
	})

	const headed = body.replace(/^# Needs manual links/m, '# Images manual-links ledger')
	if (!extra) return headed
	return `${headed.trimEnd()}\n\n${extra}`
}

export function loadImageManualLedger(ledgerDir: string): ImageManualLedger {
	const jsonPath = path.join(ledgerDir, LEDGER_JSON)
	if (!fs.existsSync(jsonPath)) return emptyLedger()
	const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as ImageManualLedger
	return {
		taxonomy: raw.taxonomy ?? {},
		locations: raw.locations ?? {},
		peopleReview: raw.peopleReview ?? [],
		updatedAt: raw.updatedAt ?? new Date().toISOString(),
	}
}

export function writeImageManualLedger(ledgerDir: string, ledger: ImageManualLedger): void {
	fs.mkdirSync(ledgerDir, {recursive: true})
	fs.writeFileSync(path.join(ledgerDir, LEDGER_JSON), `${JSON.stringify(ledger, null, '\t')}\n`)
	fs.writeFileSync(path.join(ledgerDir, LEDGER_MD), formatCumulativeLedgerMarkdown(ledger))

	const records = ledgerToImportedRecords(ledger)
	const csvRows = records.map((record) => {
		const split = splitUnmappedKeywords(record.unmappedKeywords)
		return [record.clipId, record.title, split.township, split.subject, split.donation]
	})
	fs.writeFileSync(
		path.join(ledgerDir, LEDGER_CSV),
		toCsv(['archiveId', 'title', 'missingTownship', 'missingSubject', 'missingDonation'], csvRows),
	)
}

export function locationAndPeopleFromRow(
	row: ImageCsvRow,
	clipId: string,
	title: string,
): {
	location: (LedgerRow & {photoLocation: string}) | null
	person: LedgerRow | null
} {
	const photoLocation = cleanString(row.photoLocation)
	const location = photoLocation ? {clipId, title, photoLocation} : null
	const person = isPersonSubject(row.subject) ? {clipId, title} : null
	return {location, person}
}
