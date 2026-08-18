import {cleanString} from './clean'
import {relativeImagePath} from './image-asset-url'
import type {ImageCsvRow} from './map-image-row'

export interface PreflightIssue {
	archiveId: string
	issue: string
	detail: string
}

const TOWNSHIP_TYPOS = new Set(['tredyfrin', 'e'])

/** Subject values that are categories, not place or business names. */
const KNOWN_SUBJECT_CATEGORIES = new Set([
	'house',
	'business',
	'businesses',
	'church',
	'place',
	'places',
	'cultural',
	'person',
	'people',
	'view',
	'school',
	'railroad',
	'inn',
	'inns',
	'road',
	'service',
	'services',
	'farm',
	'military',
	'mill',
	'mills',
	'transportation',
	'sports',
	'quarry',
	'quarries',
	'bridge',
	'bridges',
	'building',
	'gravestone',
	'organisation',
	'organization',
])

function identifierOf(row: ImageCsvRow): string {
	return cleanString(row.identifier) ?? ''
}

/**
 * CSV-side checks before upsert: missing paths, private rows, duplicates,
 * township typos, and subjects that look like places or businesses.
 */
export function collectPreflightIssues(rows: ImageCsvRow[]): PreflightIssue[] {
	const issues: PreflightIssue[] = []
	const identifierCounts = new Map<string, number>()

	for (const row of rows) {
		const archiveId = identifierOf(row)
		const id = archiveId || '(missing identifier)'

		if (!relativeImagePath(row)) {
			issues.push({
				archiveId: id,
				issue: 'missing_image_location',
				detail: 'No imageLocation; fileLocation must not be used as a URL.',
			})
		}

		const display = cleanString(row.publicDisplay)?.toUpperCase()
		if (display === 'N') {
			issues.push({
				archiveId: id,
				issue: 'public_display_n',
				detail: 'publicDisplay=N; row will be skipped unless editors want it public.',
			})
		}

		const township = cleanString(row.township)
		if (township && TOWNSHIP_TYPOS.has(township.toLowerCase())) {
			issues.push({
				archiveId: id,
				issue: 'township_typo',
				detail: `Township value "${township}" looks like a typo.`,
			})
		}

		const subject = cleanString(row.subject)
		if (subject && !KNOWN_SUBJECT_CATEGORIES.has(subject.toLowerCase())) {
			issues.push({
				archiveId: id,
				issue: 'place_or_business_subject',
				detail: `Subject "${subject}" is not a known category (House, Farm, …).`,
			})
		}

		if (archiveId) {
			identifierCounts.set(archiveId, (identifierCounts.get(archiveId) ?? 0) + 1)
		}
	}

	for (const [archiveId, count] of identifierCounts) {
		if (count < 2) continue
		issues.push({
			archiveId,
			issue: 'duplicate_identifier',
			detail: `${count} rows share identifier ${archiveId}.`,
		})
	}

	return issues
}
