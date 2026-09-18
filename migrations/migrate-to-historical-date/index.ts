import {at, defineMigration, set, unset} from 'sanity/migrate'

import {
	historicalDateFromIso,
	type HistoricalDateValue,
	parseHistoricalDate,
	parseYearRange,
} from '../lib/parse-historical-date'

type Patch = ReturnType<typeof at>

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHistoricalDateObject(value: unknown): value is HistoricalDateValue {
	return isPlainObject(value) && typeof value.precision === 'string'
}

function migrateStringField(options: {
	value: unknown
	objectPath: string
	legacyValue?: unknown
}): Patch[] {
	const {value, objectPath, legacyValue} = options

	// Already structured — nothing to do
	if (isHistoricalDateObject(value)) return []

	const source =
		typeof value === 'string' ? value : typeof legacyValue === 'string' ? legacyValue : null
	if (!source) return []

	const parsed = parseHistoricalDate(source)
	if (parsed) {
		return [at(objectPath, set(parsed))]
	}
	if (typeof value === 'string') {
		return [at(objectPath, unset())]
	}
	return []
}

function migrateIsoDateField(value: unknown, objectPath: string): Patch[] {
	if (typeof value !== 'string') return []
	const parsed = historicalDateFromIso(value)
	if (!parsed) return [at(objectPath, unset())]
	return [at(objectPath, set(parsed))]
}

/**
 * Convert legacy string / ISO date fields into historicalDate objects.
 * Does not write deprecated legacy text fields.
 */
export default defineMigration({
	title: 'Migrate dates to historicalDate objects',
	documentTypes: [
		'person',
		'historicalImage',
		'primarySource',
		'deed',
		'property',
		'business',
		'organization',
		'quarterlyArticle',
		'donation',
	],
	migrate: {
		document(doc) {
			const patches: Patch[] = []

			if (doc._type === 'person') {
				patches.push(...migrateIsoDateField(doc.born, 'born'))
				patches.push(...migrateIsoDateField(doc.died, 'died'))
			}

			if (doc._type === 'historicalImage') {
				patches.push(
					...migrateStringField({
						value: doc.dateTaken,
						objectPath: 'dateTaken',
						legacyValue: doc.dateTakenText,
					}),
				)
			}

			if (doc._type === 'primarySource') {
				if (typeof doc.date === 'string') {
					patches.push(...migrateIsoDateField(doc.date, 'date'))
				} else if (!isHistoricalDateObject(doc.date) && typeof doc.dateText === 'string') {
					const parsed = parseHistoricalDate(doc.dateText)
					if (parsed) patches.push(at('date', set(parsed)))
				}
			}

			if (doc._type === 'deed') {
				patches.push(...migrateIsoDateField(doc.date, 'date'))
			}

			if (doc._type === 'property') {
				patches.push(
					...migrateStringField({
						value: doc.yearBuilt,
						objectPath: 'yearBuilt',
						legacyValue: doc.yearBuiltText,
					}),
				)
			}

			if (doc._type === 'business' || doc._type === 'organization') {
				if (
					typeof doc.yearsActive === 'string' &&
					!isHistoricalDateObject(doc.activeFrom) &&
					!isHistoricalDateObject(doc.activeTo)
				) {
					const range = parseYearRange(doc.yearsActive)
					if (range) {
						patches.push(at('activeFrom', set(range.from)))
						patches.push(at('activeTo', set(range.to)))
					}
				}
			}

			if (doc._type === 'quarterlyArticle') {
				patches.push(
					...migrateStringField({
						value: doc.publishedDate,
						objectPath: 'publishedDate',
						legacyValue: doc.publishedDateText,
					}),
				)
			}

			if (doc._type === 'donation') {
				patches.push(
					...migrateStringField({
						value: doc.acquisitionDate,
						objectPath: 'acquisitionDate',
						legacyValue: doc.acquisitionDateText,
					}),
				)
			}

			return patches
		},
	},
})
