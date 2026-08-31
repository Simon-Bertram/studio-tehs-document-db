import {historicalDateParts, type HistoricalDateValue} from './formatHistoricalDate'

/**
 * Tokens for Studio search: full year plus a 3-digit prefix so "195"
 * matches 1950–1959.
 */
export function yearSearchTokens(
	value: HistoricalDateValue | null | undefined,
): string | undefined {
	const parts = historicalDateParts(value)
	if (!parts) return undefined
	const year = String(parts.year)
	if (year.length < 3) return year
	const prefix = year.slice(0, 3)
	if (prefix === year) return year
	return `${year} ${prefix}`
}
