import {nanoid} from 'nanoid'
import type {Audit} from './audit'
import {cleanString} from './clean'

export interface ImageCsvRow {
	identifier: string
	photographer: string
	serialNumber: string
	title: string
	comment: string
	contributor: string
	description: string
	rights: string
	source: string
	subject: string
	township: string
	type: string
	dateTaken: string
	psImages: string
	donationID: string
	Synonyms: string
	[key: string]: string
}

export interface ImageLookups {
	townships: Record<string, string>
	categories: Record<string, string>
	/** donationId number as string → Sanity _id */
	donations: Record<string, string>
}

export interface HistoricalImageImportDoc {
	_type: 'historicalImage'
	archiveId: string
	title: string
	serialNumber?: string
	dateTaken?: string
	description?: string
	photographer?: string
	contributor?: string
	source?: string
	rights?: string
	notes?: string
	township?: {_type: 'reference'; _ref: string}
	subjects?: {_type: 'reference'; _key: string; _ref: string}[]
	donation?: {_type: 'reference'; _ref: string}
	imageFile?: {_type: 'image'; asset: {_type: 'reference'; _ref: string}}
}

export interface MapImageResult {
	doc: HistoricalImageImportDoc
	csvType: string
	title: string
	mappedKeywords: string[]
	unmappedKeywords: string[]
	/** Raw latin-1 string of embedded JPEG, if present */
	psImagesRaw: string | null
}

function ref(id: string) {
	return {_type: 'reference' as const, _key: nanoid(), _ref: id}
}

function buildDescription(row: ImageCsvRow): string | null {
	const description = cleanString(row.description)
	const comment = cleanString(row.comment)
	if (description && comment) return `${description}\n\n${comment}`
	return description ?? comment
}

function buildNotes(row: ImageCsvRow): string | null {
	const synonyms = cleanString(row.Synonyms)
	return synonyms
}

/**
 * Map a sample-images.csv row to a historicalImage document (metadata only).
 * Asset upload is handled by the runner from psImagesRaw.
 */
export function mapImageRow(
	row: ImageCsvRow,
	lookups: ImageLookups,
	audit: Audit,
): MapImageResult | null {
	const archiveId = cleanString(row.identifier)
	const title = cleanString(row.title)
	const csvType = cleanString(row.type) ?? String(row.type ?? '')

	if (!archiveId) {
		audit.skip({
			title: title ?? undefined,
			csvType: csvType || undefined,
			reason: 'missing_clip_id',
			detail: 'Row missing identifier.',
		})
		return null
	}

	const resolvedTitle = title || `Untitled image ${archiveId}`
	const doc: HistoricalImageImportDoc = {
		_type: 'historicalImage',
		archiveId,
		title: resolvedTitle,
	}

	const serialNumber = cleanString(row.serialNumber)
	if (serialNumber) doc.serialNumber = serialNumber
	const dateTaken = cleanString(row.dateTaken)
	if (dateTaken) doc.dateTaken = dateTaken
	const description = buildDescription(row)
	if (description) doc.description = description
	const photographer = cleanString(row.photographer)
	if (photographer) doc.photographer = photographer
	const contributor = cleanString(row.contributor)
	if (contributor) doc.contributor = contributor
	const source = cleanString(row.source)
	if (source) doc.source = source
	const rights = cleanString(row.rights)
	if (rights) doc.rights = rights
	const notes = buildNotes(row)
	if (notes) doc.notes = notes

	const mappedKeywords: string[] = []
	const unmappedKeywords: string[] = []

	const townshipName = cleanString(row.township)
	if (townshipName) {
		const id = lookups.townships[townshipName.toLowerCase()]
		if (id) {
			doc.township = {_type: 'reference', _ref: id}
			mappedKeywords.push(townshipName)
		} else {
			unmappedKeywords.push(townshipName)
			audit.missingTaxonomy(townshipName, archiveId)
		}
	}

	const subjectRaw = cleanString(row.subject)
	if (subjectRaw) {
		// Normalize casing for lookup (person → Person)
		const subjectKey = subjectRaw.toLowerCase()
		const id = lookups.categories[subjectKey]
		if (id) {
			doc.subjects = [ref(id)]
			mappedKeywords.push(subjectRaw)
		} else {
			unmappedKeywords.push(subjectRaw)
			audit.missingTaxonomy(subjectRaw, archiveId)
		}
	}

	const donationId = cleanString(row.donationID)
	if (donationId) {
		const id = lookups.donations[donationId]
		if (id) {
			doc.donation = {_type: 'reference', _ref: id}
			mappedKeywords.push(`donation:${donationId}`)
		} else {
			unmappedKeywords.push(`donation:${donationId}`)
			audit.missingTaxonomy(`donation:${donationId}`, archiveId)
		}
	}

	const psImagesRaw = (() => {
		if (!row.psImages) return null
		const buf = Buffer.from(row.psImages, 'latin1')
		const soi = buf.indexOf(Buffer.from([0xff, 0xd8, 0xff]))
		if (soi < 0) return null
		return row.psImages.slice(soi)
	})()

	return {
		doc,
		csvType,
		title: resolvedTitle,
		mappedKeywords,
		unmappedKeywords,
		psImagesRaw,
	}
}
