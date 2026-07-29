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
	public: string
	facilitators: string
}

/**
 * Wrap plain text in a single Portable Text block.
 */
function toPortableText(text: string) {
	return [
		{
			_type: 'block' as const,
			_key: nanoid(),
			children: [{_type: 'span' as const, _key: nanoid(), text}],
		},
	]
}

/**
 * Build a Sanity reference with a unique _key for array membership.
 */
function ref(id: string) {
	return {_type: 'reference' as const, _key: nanoid(), _ref: id}
}

/**
 * Transform a single CSV row into a Sanity document (or null on fatal row error).
 */
export function mapRow(
	row: CsvRow,
	lookups: TaxonomyLookups,
	audit: Audit,
): Record<string, unknown> | null {
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

	const doc: Record<string, unknown> = {
		_type: schemaType,
		_id: `imported-doc-${clipId}`,
		archiveId: clipId,
		title: title || `Untitled ${schemaType} ${clipId}`,
	}

	const content = cleanString(row.content)
	const facilitators = cleanString(row.facilitators)
	const source = cleanString(row.source)
	const date = cleanString(row.date)
	const notes = cleanString(row.Privatenotes)

	switch (schemaType) {
		case 'historicalImage': {
			if (date) doc.dateTaken = date
			if (content) doc.description = content
			if (facilitators) doc.contributor = facilitators
			if (source) doc.source = source
			if (notes) doc.notes = notes
			break
		}
		case 'primarySource': {
			if (date) doc.dateText = date
			if (source) doc.newspaper = source
			if (content) doc.transcription = toPortableText(content)
			break
		}
		case 'curatedEssay': {
			const slugSource = title || `untitled-${clipId}`
			doc.slug = {_type: 'slug', current: slugify(slugSource)}
			if (content) doc.body = toPortableText(content)
			break
		}
	}

	// --- Taxonomy mapping ---
	const rawKeys = [
		row.key1, row.key2, row.key3, row.key4,
		row.key5, row.key6, row.key7, row.keywords,
	]

	const subjects: ReturnType<typeof ref>[] = []
	const townships: ReturnType<typeof ref>[] = []
	const seenIds = new Set<string>()

	for (const raw of rawKeys) {
		const keyword = cleanString(raw)
		if (!keyword) continue
		const normalised = keyword.toLowerCase()

		// Township takes priority when both could match
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

	// historicalImage / primarySource have a single township ref
	// curatedEssay has a townships array
	if (townships.length > 0) {
		if (schemaType === 'curatedEssay') {
			doc.townships = townships
		} else {
			doc.township = {_type: 'reference', _ref: townships[0]._ref}
			if (townships.length > 1) {
				audit.warn(
					`clipID ${clipId}: multiple township matches but schema allows only one; used first.`,
				)
			}
		}
	}

	audit.succeed(schemaType)
	return doc
}
