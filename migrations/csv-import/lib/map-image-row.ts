import {nanoid} from 'nanoid'

import {type HistoricalDateValue, parseHistoricalDate} from '../../lib/parse-historical-date'
import type {Audit} from './audit'
import {cleanDecodedString, cleanString} from './clean'
import {buildImageAssetUrl, relativeImagePath} from './image-asset-url'
import {DIVERTED_QUARTERLY_DETAIL, DIVERTED_QUARTERLY_REASON, hasTehsKeyword} from './tehs-keyword'

/** MySQL default donation — “not in any”. Do not link every unmatched image to it. */
export const CATCHALL_DONATION_ID = '1'

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
	donationID: string
	Synonyms: string
	imageLocation: string
	fileLocation: string
	archiveLocation: string
	primaryPhoto: string
	publicDisplay: string
	photoLocation: string
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
	dateTaken?: HistoricalDateValue
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
	/** Relative path from imageLocation only. */
	imageLocation: string | null
	/** Public HTTP URL Sanity (or this script) can fetch. */
	assetUrl: string | null
}

export interface MapImageOptions {
	/** Disambiguated archiveId when identifier is not unique. */
	archiveId?: string
}

function ref(id: string) {
	return {_type: 'reference' as const, _key: nanoid(), _ref: id}
}

function buildDescription(row: ImageCsvRow): string | null {
	const description = cleanDecodedString(row.description)
	const comment = cleanDecodedString(row.comment)
	if (description && comment) return `${description}\n\n${comment}`
	return description ?? comment
}

function buildNotes(row: ImageCsvRow, csvType: string): string | null {
	const parts: string[] = []
	const synonyms = cleanDecodedString(row.Synonyms)
	if (synonyms) parts.push(synonyms)
	if (csvType) parts.push(`Legacy type: ${csvType}`)
	const fileLocation = cleanString(row.fileLocation)
	if (fileLocation) parts.push(`Archive folder: ${fileLocation}`)
	const archiveLocation = cleanString(row.archiveLocation)
	if (archiveLocation) parts.push(`Archive location: ${archiveLocation}`)
	return parts.length > 0 ? parts.join('\n\n') : null
}

function isPrivateDisplay(row: ImageCsvRow): boolean {
	return cleanString(row.publicDisplay)?.toUpperCase() === 'N'
}

/**
 * Map a sample-images.csv row to a historicalImage document (metadata only).
 * Asset upload is handled by the runner from assetUrl.
 */
export function mapImageRow(
	row: ImageCsvRow,
	lookups: ImageLookups,
	audit: Audit,
	options?: MapImageOptions,
): MapImageResult | null {
	const identifier = cleanString(row.identifier)
	const archiveId = options?.archiveId || identifier
	const title = cleanDecodedString(row.title)
	const csvType = cleanDecodedString(row.type) ?? cleanString(row.type) ?? String(row.type ?? '')

	if (!archiveId) {
		audit.skip({
			title: title ?? undefined,
			csvType: csvType || undefined,
			reason: 'missing_clip_id',
			detail: 'Row missing identifier.',
		})
		return null
	}

	if (isPrivateDisplay(row)) {
		audit.skip({
			clipId: archiveId,
			title: title ?? undefined,
			csvType: csvType || undefined,
			reason: 'private_image',
			detail: 'publicDisplay=N; skipped so private images stay out of Sanity.',
		})
		return null
	}

	if (hasTehsKeyword([row.subject])) {
		audit.skip({
			clipId: archiveId,
			title: title ?? undefined,
			csvType: csvType || undefined,
			reason: DIVERTED_QUARTERLY_REASON,
			detail: DIVERTED_QUARTERLY_DETAIL,
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
	if (dateTaken) {
		const parsed = parseHistoricalDate(dateTaken)
		if (parsed) doc.dateTaken = parsed
	}
	const description = buildDescription(row)
	if (description) doc.description = description
	const photographer = cleanDecodedString(row.photographer)
	if (photographer) doc.photographer = photographer
	const contributor = cleanDecodedString(row.contributor)
	if (contributor) doc.contributor = contributor
	const source = cleanDecodedString(row.source)
	if (source) doc.source = source
	const rights = cleanDecodedString(row.rights)
	if (rights) doc.rights = rights
	const notes = buildNotes(row, csvType)
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
	if (donationId && donationId !== CATCHALL_DONATION_ID) {
		const id = lookups.donations[donationId]
		if (id) {
			doc.donation = {_type: 'reference', _ref: id}
			mappedKeywords.push(`donation:${donationId}`)
		} else {
			unmappedKeywords.push(`donation:${donationId}`)
			audit.missingTaxonomy(`donation:${donationId}`, archiveId)
		}
	}

	const imageLocation = relativeImagePath(row)
	const assetUrl = imageLocation ? buildImageAssetUrl(imageLocation) : null

	return {
		doc,
		csvType,
		title: resolvedTitle,
		mappedKeywords,
		unmappedKeywords,
		imageLocation,
		assetUrl,
	}
}
