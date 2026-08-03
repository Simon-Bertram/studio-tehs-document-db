/**
 * Detect TEHS Quarterly rows via a case-insensitive exact keyword match.
 */
import {cleanString} from './clean'

const TEHS_KEYWORD = 'tehs'

/**
 * True when any keyword slot equals "tehs" after lowercasing.
 * Exact token match only (not a substring of another word).
 */
export function hasTehsKeyword(values: unknown[]): boolean {
	for (const raw of values) {
		const keyword = cleanString(raw)
		if (!keyword) continue
		if (keyword.toLowerCase() === TEHS_KEYWORD) return true
	}
	return false
}

export const DIVERTED_QUARTERLY_REASON = 'diverted_quarterly' as const

export const DIVERTED_QUARTERLY_DETAIL =
	'Keyword TEHS identifies a TEHS Quarterly article. Skipped by archive importers; import via csv-import:quarterly (HTML) or enter as quarterlyArticle in Studio.'
