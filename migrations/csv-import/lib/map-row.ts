import {nanoid} from 'nanoid'
import type {Audit} from './audit'
import {cleanString, normalizeClipId, resolveSchemaType, slugify} from './clean'
import type {TaxonomyLookups} from './taxonomy'

export interface CsvRow {
	clipID: string
	date: string
	source: string
	content: string
	keywords: string
	key1: string
	key2: string
	key3: string
	key4: string
	key5: string
	key6: string
	key7: string
	title: string
	type: string
	Privatenotes: string
	/** Legacy MySQL visibility flag — not mapped (no schema field). */
	public: string
	facilitators: string
}

export type ImportSchemaType =
	| 'historicalImage'
	| 'primarySource'
	| 'curatedEssay'

export interface PortableTextSpan {
	_type: 'span'
	_key: string
	text: string
}

export interface PortableTextBlock {
	_type: 'block'
	_key: string
	children: PortableTextSpan[]
}

export interface SanityRef {
	_type: 'reference'
	_key: string
	_ref: string
}

export interface ImportDocBase {
	_type: ImportSchemaType
	archiveId: string
	title: string
	subjects?: SanityRef[]
	township?: {_type: 'reference'; _ref: string}
	townships?: SanityRef[]
}

export interface HistoricalImageImportDoc extends ImportDocBase {
	_type: 'historicalImage'
	dateTaken?: string
	description?: string
	contributor?: string
	source?: string
	notes?: string
}

export interface PrimarySourceImportDoc extends ImportDocBase {
	_type: 'primarySource'
	dateText?: string
	newspaper?: string
	transcription?: PortableTextBlock[]
}

export interface CuratedEssayImportDoc extends ImportDocBase {
	_type: 'curatedEssay'
	slug: {_type: 'slug'; current: string}
	body?: PortableTextBlock[]
}

export type ImportDoc =
	| HistoricalImageImportDoc
	| PrimarySourceImportDoc
	| CuratedEssayImportDoc

function toPortableText(text: string): PortableTextBlock[] {
	return [
		{
			_type: 'block',
			_key: nanoid(),
			children: [{_type: 'span', _key: nanoid(), text}],
		},
	]
}

function ref(id: string): SanityRef {
	return {_type: 'reference', _key: nanoid(), _ref: id}
}

function buildHistoricalImage(
	clipId: string,
	title: string,
	row: CsvRow,
): HistoricalImageImportDoc {
	const doc: HistoricalImageImportDoc = {
		_type: 'historicalImage',
		archiveId: clipId,
		title,
	}
	const date = cleanString(row.date)
	const content = cleanString(row.content)
	const facilitators = cleanString(row.facilitators)
	const source = cleanString(row.source)
	const notes = cleanString(row.Privatenotes)
	if (date) doc.dateTaken = date
	if (content) doc.description = content
	if (facilitators) doc.contributor = facilitators
	if (source) doc.source = source
	if (notes) doc.notes = notes
	return doc
}

function buildPrimarySource(
	clipId: string,
	title: string,
	row: CsvRow,
): PrimarySourceImportDoc {
	const doc: PrimarySourceImportDoc = {
		_type: 'primarySource',
		archiveId: clipId,
		title,
	}
	const date = cleanString(row.date)
	const source = cleanString(row.source)
	const content = cleanString(row.content)
	if (date) doc.dateText = date
	if (source) doc.newspaper = source
	if (content) doc.transcription = toPortableText(content)
	return doc
}

function buildCuratedEssay(
	clipId: string,
	title: string,
	row: CsvRow,
): CuratedEssayImportDoc {
	const slugSource = title || `untitled-${clipId}`
	const doc: CuratedEssayImportDoc = {
		_type: 'curatedEssay',
		archiveId: clipId,
		title,
		slug: {_type: 'slug', current: slugify(slugSource)},
	}
	const content = cleanString(row.content)
	if (content) doc.body = toPortableText(content)
	return doc
}

function applyTaxonomy(
	doc: ImportDoc,
	row: CsvRow,
	lookups: TaxonomyLookups,
	audit: Audit,
): void {
	const rawKeys = [
		row.key1,
		row.key2,
		row.key3,
		row.key4,
		row.key5,
		row.key6,
		row.key7,
		row.keywords,
	]

	const subjects: SanityRef[] = []
	const townships: SanityRef[] = []
	const seenIds = new Set<string>()

	for (const raw of rawKeys) {
		const keyword = cleanString(raw)
		if (!keyword) continue
		const normalised = keyword.toLowerCase()

		const townshipId = lookups.townships[normalised]
		if (townshipId && !seenIds.has(townshipId)) {
			seenIds.add(townshipId)
			townships.push(ref(townshipId))
			continue
		}

		const categoryId = lookups.categories[normalised]
		if (categoryId && !seenIds.has(categoryId)) {
			seenIds.add(categoryId)
			subjects.push(ref(categoryId))
		} else if (!townshipId && !categoryId) {
			audit.missingTaxonomy(keyword)
		}
	}

	if (subjects.length > 0) doc.subjects = subjects

	if (townships.length > 0) {
		if (doc._type === 'curatedEssay') {
			doc.townships = townships
		} else {
			doc.township = {_type: 'reference', _ref: townships[0]._ref}
			if (townships.length > 1) {
				audit.warn(
					`clipID ${doc.archiveId}: multiple township matches but schema allows only one; used first.`,
				)
			}
		}
	}
}

/**
 * Transform a single CSV row into a Sanity document (or null on fatal row error).
 * Does not set `_id` — callers upsert by `archiveId`.
 * The CSV `public` column is intentionally ignored (no matching schema field).
 */
export function mapRow(
	row: CsvRow,
	lookups: TaxonomyLookups,
	audit: Audit,
): ImportDoc | null {
	const clipId = normalizeClipId(row.clipID)
	const title = cleanString(row.title)

	if (!clipId) {
		audit.fail(`Row missing clipID. Title: "${title ?? 'Unknown'}". Skipped.`)
		return null
	}

	const schemaType = resolveSchemaType(row.type)
	if (!schemaType) {
		audit.fail(`clipID ${clipId}: unknown type "${row.type}". Skipped.`)
		return null
	}

	const resolvedTitle = title || `Untitled ${schemaType} ${clipId}`

	let doc: ImportDoc
	switch (schemaType) {
		case 'historicalImage':
			doc = buildHistoricalImage(clipId, resolvedTitle, row)
			break
		case 'primarySource':
			doc = buildPrimarySource(clipId, resolvedTitle, row)
			break
		case 'curatedEssay':
			doc = buildCuratedEssay(clipId, resolvedTitle, row)
			break
	}

	applyTaxonomy(doc, row, lookups, audit)
	audit.succeed(schemaType)
	return doc
}
