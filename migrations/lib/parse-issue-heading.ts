import type {HistoricalDateValue} from './parse-historical-date'
import {parseHistoricalDate} from './parse-historical-date'

export type QuarterlySeason = 'spring' | 'summer' | 'autumn' | 'winter'

export interface ParsedIssueHeading {
	volume: number
	issueNumber: number
	issueNumberEnd?: number
	combinedIssue: boolean
	season?: QuarterlySeason
	publicationDate?: HistoricalDateValue
	/** Unparsed date/season remainder, for debugging. */
	dateText?: string
}

const SEASON_WORD: Record<string, QuarterlySeason> = {
	spring: 'spring',
	summer: 'summer',
	autumn: 'autumn',
	fall: 'autumn',
	winter: 'winter',
}

export function normalizeSeason(raw: string | undefined): QuarterlySeason | undefined {
	if (!raw) return undefined
	return SEASON_WORD[raw.trim().toLowerCase()]
}

function parseNumberPair(
	raw: string,
): {issueNumber: number; issueNumberEnd?: number; combinedIssue: boolean} | null {
	const text = raw.replace(/\s+/g, ' ').trim()
	const combined = text.match(/^(\d+)\s*(?:and|&|\+|\/|–|-)\s*(\d+)$/i)
	if (combined) {
		const issueNumber = Number(combined[1])
		const issueNumberEnd = Number(combined[2])
		if (!Number.isFinite(issueNumber) || !Number.isFinite(issueNumberEnd)) return null
		return {
			issueNumber,
			issueNumberEnd: issueNumberEnd === issueNumber ? undefined : issueNumberEnd,
			combinedIssue: issueNumberEnd !== issueNumber,
		}
	}
	const single = text.match(/^(\d+)$/)
	if (!single) return null
	return {issueNumber: Number(single[1]), combinedIssue: false}
}

function firstSeason(text: string): QuarterlySeason | undefined {
	const match = text.match(/\b(spring|summer|autumn|fall|winter)\b/i)
	return match ? normalizeSeason(match[1]) : undefined
}

function publicationFromRemainder(text: string): HistoricalDateValue | undefined {
	const trimmed = text.replace(/\s+/g, ' ').trim()
	if (!trimmed) return undefined
	const parsed = parseHistoricalDate(trimmed)
	if (parsed) return parsed
	const year = trimmed.match(/\b(1[89]\d{2}|20\d{2})\b/)
	if (year) return parseHistoricalDate(year[1]) ?? undefined
	return undefined
}

/**
 * Parse a printed-issue heading from qtoc1 or a volume TOC.
 */
export function parseIssueHeading(raw: string): ParsedIssueHeading | null {
	let text = raw
		.replace(/\s+/g, ' ')
		.replace(/[.,;:]+$/g, '')
		.trim()
	if (!text) return null

	const volumeMatch = text.match(/\bVolume\s+(\d+)\b/i)
	if (!volumeMatch) return null
	const volume = Number(volumeMatch[1])

	const numbersMatch = text.match(/\bNumbers?\s+(\d+(?:\s*(?:and|&|\+|\/|–|-)\s*\d+)?)\b/i)
	if (!numbersMatch) return null
	const numbers = parseNumberPair(numbersMatch[1])
	if (!numbers) return null

	const withoutVolNum = text
		.replace(/\bVolume\s+\d+\b/i, ' ')
		.replace(/\bNumbers?\s+\d+(?:\s*(?:and|&|\+|\/|–|-)\s*\d+)?\b/i, ' ')
		.replace(/\(double issue\)/gi, ' ')
		.replace(/\bTable of Contents\b/gi, ' ')
		.replace(/[—,–\-]+/g, ' ')
		.replace(/[,.]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()

	const season = firstSeason(withoutVolNum) ?? firstSeason(text)
	const dateText = withoutVolNum || undefined
	const publicationDate = publicationFromRemainder(withoutVolNum)

	return {
		volume,
		issueNumber: numbers.issueNumber,
		issueNumberEnd: numbers.issueNumberEnd,
		combinedIssue: numbers.combinedIssue,
		season,
		publicationDate,
		dateText,
	}
}
