/**
 * Best-effort parse of freeform historical date strings into historicalDate objects.
 * Shared by CSV/quarterly imports and content migrations.
 */

export type HistoricalDatePrecision = 'year' | 'month' | 'day'
export type HistoricalDateQualifier = 'exact' | 'circa' | 'before' | 'after'

export interface HistoricalDateValue {
	_type?: 'historicalDate'
	precision: HistoricalDatePrecision
	qualifier: HistoricalDateQualifier
	year?: number
	month?: number
	date?: string
}

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
	january: 1,
	jan: 1,
	february: 2,
	feb: 2,
	march: 3,
	mar: 3,
	april: 4,
	apr: 4,
	may: 5,
	june: 6,
	jun: 6,
	july: 7,
	jul: 7,
	august: 8,
	aug: 8,
	september: 9,
	sept: 9,
	sep: 9,
	october: 10,
	oct: 10,
	november: 11,
	nov: 11,
	december: 12,
	dec: 12,
}

function pad2(n: number): string {
	return String(n).padStart(2, '0')
}

function withType(value: HistoricalDateValue): HistoricalDateValue {
	return {_type: 'historicalDate', ...value}
}

/**
 * Parse a freeform date string into a historicalDate value, or null if unparseable.
 */
export function parseHistoricalDate(raw: string | null | undefined): HistoricalDateValue | null {
	if (!raw) return null
	let text = raw.trim()
	if (!text) return null

	// Trailing uncertainty marker often used in accession notes
	text = text.replace(/\?+$/, '').trim()

	let qualifier: HistoricalDateQualifier = 'exact'
	const qualifierMatch = /^(circa|c\.|ca\.|about|approx\.?|approximately|before|after)\s+/i.exec(
		text,
	)
	if (qualifierMatch) {
		const q = qualifierMatch[1].toLowerCase().replace(/\.$/, '')
		if (q === 'before') qualifier = 'before'
		else if (q === 'after') qualifier = 'after'
		else qualifier = 'circa'
		text = text.slice(qualifierMatch[0].length).trim()
	}

	// ISO day: YYYY-MM-DD
	const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
	if (iso) {
		const year = Number(iso[1])
		const month = Number(iso[2])
		const day = Number(iso[3])
		if (year >= 1000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
			return withType({
				precision: 'day',
				qualifier,
				date: `${iso[1]}-${iso[2]}-${iso[3]}`,
				year,
				month,
			})
		}
	}

	// US-style numeric: M/D/YYYY or MM/DD/YYYY
	const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text)
	if (us) {
		const month = Number(us[1])
		const day = Number(us[2])
		const year = Number(us[3])
		if (year >= 1000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
			return withType({
				precision: 'day',
				qualifier,
				date: `${year}-${pad2(month)}-${pad2(day)}`,
				year,
				month,
			})
		}
	}

	// Month/year numeric: M/YYYY or MM/YYYY
	const monthYearNumeric = /^(\d{1,2})\/(\d{4})$/.exec(text)
	if (monthYearNumeric) {
		const month = Number(monthYearNumeric[1])
		const year = Number(monthYearNumeric[2])
		if (year >= 1000 && year <= 2100 && month >= 1 && month <= 12) {
			return withType({
				precision: 'month',
				qualifier,
				year,
				month,
			})
		}
	}

	// Month name + year: April 1968, Apr 1968
	const monthYear = /^([A-Za-z]+)\.?\s+(\d{4})$/.exec(text)
	if (monthYear) {
		const month = MONTH_NAME_TO_NUMBER[monthYear[1].toLowerCase()]
		const year = Number(monthYear[2])
		if (month && year >= 1000 && year <= 2100) {
			return withType({
				precision: 'month',
				qualifier,
				year,
				month,
			})
		}
	}

	// Day Month Year: 25 August 1920, 25 Aug 1920
	const dayMonthYear = /^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/.exec(text)
	if (dayMonthYear) {
		const day = Number(dayMonthYear[1])
		const month = MONTH_NAME_TO_NUMBER[dayMonthYear[2].toLowerCase()]
		const year = Number(dayMonthYear[3])
		if (month && year >= 1000 && year <= 2100 && day >= 1 && day <= 31) {
			return withType({
				precision: 'day',
				qualifier,
				date: `${year}-${pad2(month)}-${pad2(day)}`,
				year,
				month,
			})
		}
	}

	// Year only: 1850
	const yearOnly = /^(\d{4})$/.exec(text)
	if (yearOnly) {
		const year = Number(yearOnly[1])
		if (year >= 1000 && year <= 2100) {
			return withType({
				precision: 'year',
				qualifier,
				year,
			})
		}
	}

	return null
}

/**
 * Convert an existing ISO date string (Sanity `date` field) to historicalDate.
 */
export function historicalDateFromIso(
	iso: string | null | undefined,
	qualifier: HistoricalDateQualifier = 'exact',
): HistoricalDateValue | null {
	if (!iso) return null
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
	if (!match) return null
	return withType({
		precision: 'day',
		qualifier,
		date: match[0],
		year: Number(match[1]),
		month: Number(match[2]),
	})
}

/**
 * Parse a simple year range like "1870–1920" or "1870-1920" into from/to year dates.
 */
export function parseYearRange(
	raw: string | null | undefined,
): {from: HistoricalDateValue; to: HistoricalDateValue} | null {
	if (!raw) return null
	const match = raw.trim().match(/^(\d{4})\s*[–—-]\s*(\d{4})$/)
	if (!match) return null
	const fromYear = Number(match[1])
	const toYear = Number(match[2])
	if (fromYear < 1000 || fromYear > 2100 || toYear < 1000 || toYear > 2100) {
		return null
	}
	return {
		from: withType({precision: 'year', qualifier: 'exact', year: fromYear}),
		to: withType({precision: 'year', qualifier: 'exact', year: toYear}),
	}
}
