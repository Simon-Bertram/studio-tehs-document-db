import {nanoid} from 'nanoid'
import type {Audit} from './audit'
import {cleanString, normalizeClipId, resolveSchemaType, slugify} from './clean'
import type {TaxonomyLookups} from './taxonomy'
import {
	DIVERTED_QUARTERLY_DETAIL,
	DIVERTED_QUARTERLY_REASON,
	hasTehsKeyword,
} from './tehs-keyword'

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
	| 'researchArticle'

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
	organisations?: SanityRef[]
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

export interface ResearchArticleImportDoc extends ImportDocBase {
	_type: 'researchArticle'
	slug: {_type: 'slug'; current: string}
	body?: PortableTextBlock[]
}

export type ImportDoc =
	| HistoricalImageImportDoc
	| PrimarySourceImportDoc
	| ResearchArticleImportDoc

export interface TaxonomyMapResult {
	mappedKeywords: string[]
	unmappedKeywords: string[]
}

export interface MapRowResult {
	doc: ImportDoc
	csvType: string
	title: string
	mappedKeywords: string[]
	unmappedKeywords: string[]
}

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

function buildResearchArticle(
	clipId: string,
	title: string,
	row: CsvRow,
): ResearchArticleImportDoc {
	const slugSource = title || `untitled-${clipId}`
	const doc: ResearchArticleImportDoc = {
		_type: 'researchArticle',
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
): TaxonomyMapResult {
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
	const organisations: SanityRef[] = []
	const townships: SanityRef[] = []
	const seenIds = new Set<string>()
	const mappedKeywords: string[] = []
	const unmappedKeywords: string[] = []
	const seenUnmapped = new Set<string>()

	for (const raw of rawKeys) {
		const keyword = cleanString(raw)
		if (!keyword) continue
		const normalised = keyword.toLowerCase()

		const townshipId = lookups.townships[normalised]
		if (townshipId) {
			if (!seenIds.has(townshipId)) {
				seenIds.add(townshipId)
				townships.push(ref(townshipId))
				mappedKeywords.push(keyword)
			}
			continue
		}

		const organisationId = lookups.organisations[normalised]
		if (organisationId) {
			if (!seenIds.has(organisationId)) {
				seenIds.add(organisationId)
				organisations.push(ref(organisationId))
				mappedKeywords.push(keyword)
			}
			continue
		}

		const categoryId = lookups.categories[normalised]
		if (categoryId) {
			if (!seenIds.has(categoryId)) {
				seenIds.add(categoryId)
				subjects.push(ref(categoryId))
				mappedKeywords.push(keyword)
			}
			continue
		}

		if (!seenUnmapped.has(normalised)) {
			seenUnmapped.add(normalised)
			unmappedKeywords.push(keyword)
			audit.missingTaxonomy(keyword, doc.archiveId)
		}
	}

	if (subjects.length > 0) doc.subjects = subjects
	if (organisations.length > 0) doc.organisations = organisations

	if (townships.length > 0) {
		if (doc._type === 'researchArticle') {
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

	return {mappedKeywords, unmappedKeywords}
}

/**
 * Transform a single CSV row into a Sanity document (or null on fatal row error).
 * Does not set `_id` — callers upsert by `archiveId`.
 * Does not record import success — callers record after dry-run / live write.
 * The CSV `public` column is intentionally ignored (no matching schema field).
 */
export function mapRow(
	row: CsvRow,
	lookups: TaxonomyLookups,
	audit: Audit,
): MapRowResult | null {
	const clipId = normalizeClipId(row.clipID)
	const title = cleanString(row.title)
	const csvType = cleanString(row.type) ?? String(row.type ?? '')

	if (!clipId) {
		audit.skip({
			clipId: undefined,
			title: title ?? undefined,
			csvType: csvType || undefined,
			reason: 'missing_clip_id',
			detail: `Row missing clipID. Title: "${title ?? 'Unknown'}".`,
		})
		return null
	}

	if (
		hasTehsKeyword([
			row.key1,
			row.key2,
			row.key3,
			row.key4,
			row.key5,
			row.key6,
			row.key7,
			row.keywords,
		])
	) {
		audit.skip({
			clipId,
			title: title ?? undefined,
			csvType: csvType || undefined,
			reason: DIVERTED_QUARTERLY_REASON,
			detail: DIVERTED_QUARTERLY_DETAIL,
		})
		return null
	}

	const schemaType = resolveSchemaType(row.type)
	if (!schemaType) {
		audit.skip({
			clipId,
			title: title ?? undefined,
			csvType: csvType || undefined,
			reason: 'unknown_type',
			detail: `Unknown type "${row.type}". Decide schema manually or fix CSV.`,
		})
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
		case 'researchArticle':
			doc = buildResearchArticle(clipId, resolvedTitle, row)
			break
	}

	const {mappedKeywords, unmappedKeywords} = applyTaxonomy(
		doc,
		row,
		lookups,
		audit,
	)

	return {
		doc,
		csvType: csvType || String(row.type ?? ''),
		title: resolvedTitle,
		mappedKeywords,
		unmappedKeywords,
	}
}
