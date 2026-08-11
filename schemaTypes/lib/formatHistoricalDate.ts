export type HistoricalDatePrecision = 'year' | 'month' | 'day'
export type HistoricalDateQualifier = 'exact' | 'circa' | 'before' | 'after'

export interface HistoricalDateValue {
	precision?: HistoricalDatePrecision
	qualifier?: HistoricalDateQualifier
	year?: number
	month?: number
	date?: string
}

const MONTH_SHORT = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
] as const

const QUALIFIER_PREFIX: Record<HistoricalDateQualifier, string> = {
	exact: '',
	circa: 'c. ',
	before: 'before ',
	after: 'after ',
}

function parseIsoParts(iso: string): {year: number; month: number; day: number} | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
	if (!match) return null
	return {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3]),
	}
}

/**
 * Normalize a historicalDate into year/month/day parts for compare & format.
 * Incomplete precision uses null for unknown lower parts.
 */
export function historicalDateParts(
	value: HistoricalDateValue | null | undefined,
): {year: number; month: number | null; day: number | null} | null {
	if (!value?.precision) return null

	if (value.precision === 'day') {
		if (!value.date) return null
		const parts = parseIsoParts(value.date)
		if (!parts) return null
		return {year: parts.year, month: parts.month, day: parts.day}
	}

	if (value.year == null || Number.isNaN(value.year)) return null

	if (value.precision === 'month') {
		if (value.month == null || value.month < 1 || value.month > 12) return null
		return {year: value.year, month: value.month, day: null}
	}

	return {year: value.year, month: null, day: null}
}

/**
 * Format a historicalDate for Studio previews (e.g. "c. 1850", "before Aug 1920").
 */
export function formatHistoricalDate(
	value: HistoricalDateValue | null | undefined,
): string | undefined {
	const parts = historicalDateParts(value)
	if (!parts) return undefined

	const qualifier = (value?.qualifier ?? 'exact') as HistoricalDateQualifier
	const prefix = QUALIFIER_PREFIX[qualifier] ?? ''

	if (parts.day != null && parts.month != null) {
		const month = MONTH_SHORT[parts.month - 1]
		return `${prefix}${parts.day} ${month} ${parts.year}`
	}

	if (parts.month != null) {
		const month = MONTH_SHORT[parts.month - 1]
		return `${prefix}${month} ${parts.year}`
	}

	return `${prefix}${parts.year}`
}

/**
 * Compare two historical dates. Returns negative if a < b, 0 if equal/incomparable
 * at available precision, positive if a > b.
 * Missing lower precision is treated as earliest within that unit for ordering
 * (year-only = month 1 day 1).
 */
export function compareHistoricalDates(
	a: HistoricalDateValue | null | undefined,
	b: HistoricalDateValue | null | undefined,
): number {
	const pa = historicalDateParts(a)
	const pb = historicalDateParts(b)
	if (!pa || !pb) return 0

	const aKey = [pa.year, pa.month ?? 1, pa.day ?? 1]
	const bKey = [pb.year, pb.month ?? 1, pb.day ?? 1]

	for (let i = 0; i < 3; i++) {
		if (aKey[i] < bKey[i]) return -1
		if (aKey[i] > bKey[i]) return 1
	}
	return 0
}

export function formatHistoricalDateRange(
	from: HistoricalDateValue | null | undefined,
	to: HistoricalDateValue | null | undefined,
): string | undefined {
	const start = formatHistoricalDate(from)
	const end = formatHistoricalDate(to)
	if (start && end) return `${start}–${end}`
	if (start) return `${start}–`
	if (end) return `–${end}`
	return undefined
}
