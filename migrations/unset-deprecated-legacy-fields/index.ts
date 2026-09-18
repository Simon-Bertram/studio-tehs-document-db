import {at, defineMigration, set, setIfMissing, unset} from 'sanity/migrate'

import {
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

function isEmptyDateSentinel(value: string): boolean {
	return /^(unknown|various|n\/?a|none|not known|not specified)$/i.test(value.trim())
}

function unsetIfPresent(value: unknown, path: string): Patch[] {
	if (value === undefined || value === null) return []
	return [at(path, unset())]
}

function appendRecordedDate(existing: unknown, recorded: string): string {
	const line = `Acquisition (as recorded): ${recorded}`
	const current = typeof existing === 'string' ? existing.trim() : ''
	if (!current) return line
	if (current.includes(recorded)) return current
	return `${current}\n\n${line}`
}

/**
 * Drop deprecated legacy date / issue fields after copying parseable values
 * onto their replacements. Unique unparseable donation wording is kept on
 * `description`. Do not touch `deed.dateText`.
 */
export default defineMigration({
	title: 'Unset deprecated legacy date and issue fields',
	documentTypes: [
		'primarySource',
		'historicalImage',
		'property',
		'business',
		'organization',
		'quarterlyArticle',
		'donation',
	],
	filter:
		'defined(dateText) || defined(dateTakenText) || defined(yearBuiltText) || defined(yearsActive) || defined(volume) || defined(issue) || defined(publishedDate) || defined(publishedDateText) || defined(acquisitionDateText)',
	migrate: {
		document(doc) {
			const patches: Patch[] = []

			if (doc._type === 'primarySource' && typeof doc.dateText === 'string') {
				if (isEmptyDateSentinel(doc.dateText)) {
					patches.push(at('dateText', unset()))
				} else if (!isHistoricalDateObject(doc.date)) {
					const parsed = parseHistoricalDate(doc.dateText)
					if (parsed) {
						patches.push(at('date', setIfMissing(parsed)))
						patches.push(at('dateText', unset()))
					}
				} else {
					patches.push(at('dateText', unset()))
				}
			}

			if (doc._type === 'historicalImage' && typeof doc.dateTakenText === 'string') {
				if (isEmptyDateSentinel(doc.dateTakenText)) {
					patches.push(at('dateTakenText', unset()))
				} else if (!isHistoricalDateObject(doc.dateTaken)) {
					const parsed = parseHistoricalDate(doc.dateTakenText)
					if (parsed) {
						patches.push(at('dateTaken', setIfMissing(parsed)))
						patches.push(at('dateTakenText', unset()))
					}
				} else {
					patches.push(at('dateTakenText', unset()))
				}
			}

			if (doc._type === 'property' && typeof doc.yearBuiltText === 'string') {
				if (isEmptyDateSentinel(doc.yearBuiltText)) {
					patches.push(at('yearBuiltText', unset()))
				} else if (!isHistoricalDateObject(doc.yearBuilt)) {
					const parsed = parseHistoricalDate(doc.yearBuiltText)
					if (parsed) {
						patches.push(at('yearBuilt', setIfMissing(parsed)))
						patches.push(at('yearBuiltText', unset()))
					}
				} else {
					patches.push(at('yearBuiltText', unset()))
				}
			}

			if (
				(doc._type === 'business' || doc._type === 'organization') &&
				typeof doc.yearsActive === 'string'
			) {
				if (!isHistoricalDateObject(doc.activeFrom) && !isHistoricalDateObject(doc.activeTo)) {
					const range = parseYearRange(doc.yearsActive)
					if (range) {
						patches.push(at('activeFrom', setIfMissing(range.from)))
						patches.push(at('activeTo', setIfMissing(range.to)))
					} else if (isEmptyDateSentinel(doc.yearsActive)) {
						patches.push(at('yearsActive', unset()))
						return patches
					} else {
						return patches
					}
				}
				patches.push(at('yearsActive', unset()))
			}

			if (doc._type === 'quarterlyArticle') {
				if (!doc.issueRef) return patches
				patches.push(...unsetIfPresent(doc.volume, 'volume'))
				patches.push(...unsetIfPresent(doc.issue, 'issue'))
				patches.push(...unsetIfPresent(doc.publishedDate, 'publishedDate'))
				patches.push(...unsetIfPresent(doc.publishedDateText, 'publishedDateText'))
			}

			if (doc._type === 'donation' && typeof doc.acquisitionDateText === 'string') {
				const recorded = doc.acquisitionDateText.trim()
				if (!recorded || isEmptyDateSentinel(recorded)) {
					patches.push(at('acquisitionDateText', unset()))
					return patches
				}

				if (!isHistoricalDateObject(doc.acquisitionDate)) {
					const parsed = parseHistoricalDate(recorded)
					if (parsed) {
						patches.push(at('acquisitionDate', setIfMissing(parsed)))
						patches.push(at('acquisitionDateText', unset()))
						return patches
					}

					const range = parseYearRange(recorded)
					if (range) {
						patches.push(at('description', set(appendRecordedDate(doc.description, recorded))))
						patches.push(at('acquisitionDateText', unset()))
						return patches
					}

					patches.push(at('description', set(appendRecordedDate(doc.description, recorded))))
				}

				patches.push(at('acquisitionDateText', unset()))
			}

			return patches
		},
	},
})
