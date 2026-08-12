import {formatHistoricalDate, type HistoricalDateValue} from './formatHistoricalDate'

const PARTS = ['precision', 'qualifier', 'year', 'month', 'date'] as const

type HistoricalDatePart = (typeof PARTS)[number]

function selectKey(part: HistoricalDatePart, keyPrefix?: string): string {
	if (!keyPrefix) return part
	return `${keyPrefix}${part.charAt(0).toUpperCase()}${part.slice(1)}`
}

/**
 * Flat preview `select` entries for a nested historicalDate field.
 *
 * @example
 * historicalDatePreviewSelect('dateTaken')
 * // { precision: 'dateTaken.precision', qualifier: 'dateTaken.qualifier', ... }
 *
 * historicalDatePreviewSelect('born', 'born')
 * // { bornPrecision: 'born.precision', bornQualifier: 'born.qualifier', ... }
 */
export function historicalDatePreviewSelect(
	path: string,
	keyPrefix?: string,
): Record<string, string> {
	const select: Record<string, string> = {}
	for (const part of PARTS) {
		select[selectKey(part, keyPrefix)] = `${path}.${part}`
	}
	return select
}

/**
 * Rebuild a HistoricalDateValue from flattened preview selection keys.
 */
export function historicalDateFromPreview(
	selection: Record<string, unknown>,
	keyPrefix?: string,
): HistoricalDateValue {
	return {
		precision: selection[selectKey('precision', keyPrefix)] as HistoricalDateValue['precision'],
		qualifier: selection[selectKey('qualifier', keyPrefix)] as HistoricalDateValue['qualifier'],
		year: selection[selectKey('year', keyPrefix)] as number | undefined,
		month: selection[selectKey('month', keyPrefix)] as number | undefined,
		date: selection[selectKey('date', keyPrefix)] as string | undefined,
	}
}

/**
 * Format a historicalDate from flattened preview selection keys.
 */
export function formatHistoricalDateFromPreview(
	selection: Record<string, unknown>,
	keyPrefix?: string,
): string | undefined {
	return formatHistoricalDate(historicalDateFromPreview(selection, keyPrefix))
}
