/**
 * Fill NULL / miscellaneous / article CSV types on documents-full.csv,
 * and expand comma-stuffed keyword cells into empty key slots.
 */
import fs from 'node:fs'

import {splitCommaSeparatedKeywords} from './clean'
import {readCsvRows} from './read-csv'

export const DOCUMENTS_FULL_CSV = 'migrations/data/documents-full.csv'

const KEY_FIELDS = ['key1', 'key2', 'key3', 'key4', 'key5', 'key6', 'key7'] as const

/** clipID → TYPE_MAP spelling. Empty-title NULL rows are omitted (stay skipped). */
export const TYPE_BY_CLIP_ID: Record<string, string> = {
	'3': 'obituary',
	'4': 'newspaper article',
	'12': 'original document',
	'13': 'chester county deed',
	'23': 'book',
	'24': 'document',
	'25': 'document',
	'28': 'document',
	'31': 'book',
	'32': 'deed history',
	'36': 'document',
	'37': 'book',
	'39': 'document',
	'51': 'will',
	'52': 'will',
	'53': 'will',
	'69': 'document',
	'71': 'original document',
	'81': 'letter',
	'82': 'original document',
	'83': 'original document',
	'84': 'original document',
	'85': 'interview',
	'86': 'will',
	'87': 'will',
	'268': 'original document',
	'270': 'original document',
	'312': 'document',
	'313': 'original document',
	'317': 'book',
	'321': 'book',
	'322': 'document',
	'324': 'document',
	'325': 'will',
	'399': 'document',
	'400': 'document',
	'591': 'newspaper advertisement',
	'614': 'document',
	'615': 'document',
	'639': 'census',
	'640': 'census',
	'641': 'census',
	'643': 'book',
	'644': 'deed history',
	'645': 'newspaper clipping',
	'646': 'document',
	'647': 'book',
	'651': 'book',
	'653': 'genealogical',
	'654': 'family history',
	'655': 'document',
	'656': 'family history',
	'657': 'genealogical',
	'658': 'genealogical',
	'659': 'genealogical',
	'660': 'genealogical',
	'661': 'genealogical',
	'697': 'document',
	'698': 'document',
	'699': 'document',
	'700': 'document',
	'701': 'document',
	'702': 'document',
	'703': 'document',
	'704': 'document',
	'735': 'newspaper article',
	'768': 'document',
	'769': 'document',
	'792': 'document',
	'811': 'document',
	'888': 'letter',
	'916': 'letter',
	'925': 'newspaper article',
	'940': 'book',
	'946': 'document',
	'948': 'document',
}

function csvCell(value: string | undefined): string {
	return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function expandKeywordSlots(row: Record<string, string>): void {
	const stuffed =
		KEY_FIELDS.some((field) => (row[field] ?? '').includes(',')) ||
		(row.keywords ?? '').includes(',')
	if (!stuffed) return
	const tokens: string[] = []
	const seen = new Set<string>()

	const consume = (raw: string | undefined) => {
		const cell = (raw ?? '').trim()
		if (!cell) return
		for (const token of splitCommaSeparatedKeywords(cell)) {
			const key = token.toLowerCase()
			if (seen.has(key)) continue
			seen.add(key)
			tokens.push(token)
		}
	}

	for (const field of KEY_FIELDS) consume(row[field])
	consume(row.keywords)

	for (let i = 0; i < KEY_FIELDS.length; i++) {
		row[KEY_FIELDS[i]] = tokens[i] ?? ''
	}
	row.keywords = tokens.slice(KEY_FIELDS.length).join(', ')
}

export async function patchDocumentsFullCsv(csvPath = DOCUMENTS_FULL_CSV): Promise<{
	typesUpdated: number
	keywordRowsExpanded: number
}> {
	const rows = await readCsvRows<Record<string, string>>(csvPath, Infinity)
	if (rows.length === 0) {
		throw new Error(`No rows in ${csvPath}`)
	}

	let typesUpdated = 0
	let keywordRowsExpanded = 0
	const header = Object.keys(rows[0])

	for (const row of rows) {
		const clipId = String(row.clipID ?? '').replace(/\.0$/, '')
		const nextType = TYPE_BY_CLIP_ID[clipId]
		if (nextType && row.type !== nextType) {
			row.type = nextType
			typesUpdated++
		}

		const before =
			KEY_FIELDS.map((field) => row[field] ?? '').join('\0') + '\0' + (row.keywords ?? '')
		expandKeywordSlots(row)
		const after =
			KEY_FIELDS.map((field) => row[field] ?? '').join('\0') + '\0' + (row.keywords ?? '')
		if (before !== after) keywordRowsExpanded++
	}

	const lines = [
		header.map(csvCell).join(','),
		...rows.map((row) => header.map((col) => csvCell(row[col])).join(',')),
	]
	fs.writeFileSync(csvPath, `${lines.join('\n')}\n`)

	return {typesUpdated, keywordRowsExpanded}
}
