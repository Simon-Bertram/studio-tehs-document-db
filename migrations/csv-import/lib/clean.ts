const EMPTY_TOKENS = new Set(['nan', 'null', ''])

const HTML_NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	rsquo: '\u2019',
	lsquo: '\u2018',
	rdquo: '\u201D',
	ldquo: '\u201C',
	ndash: '\u2013',
	mdash: '\u2014',
	hellip: '\u2026',
}

/**
 * Decode common HTML entities in legacy MySQL titles (e.g. `&rsquo;`).
 */
export function decodeHtmlEntities(value: string): string {
	if (!value.includes('&')) return value
	return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
		if (body.startsWith('#')) {
			const code =
				body[1] === 'x' || body[1] === 'X'
					? Number.parseInt(body.slice(2), 16)
					: Number.parseInt(body.slice(1), 10)
			if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) {
				return String.fromCodePoint(code)
			}
			return match
		}
		return HTML_NAMED_ENTITIES[body.toLowerCase()] ?? match
	})
}

/**
 * Strip whitespace, collapse Python/MySQL empty markers to null.
 * Returns null when the value is absent, blank, 'nan', or 'NULL'.
 */
export function cleanString(val: unknown): string | null {
	if (val == null) return null
	const cleaned = String(val).trim()
	if (EMPTY_TOKENS.has(cleaned.toLowerCase())) return null
	return cleaned
}

/**
 * cleanString plus HTML-entity decode (titles, notes, descriptions).
 */
export function cleanDecodedString(val: unknown): string | null {
	const cleaned = cleanString(val)
	if (!cleaned) return null
	const decoded = decodeHtmlEntities(cleaned).trim()
	return decoded.length > 0 ? decoded : null
}

/**
 * Normalise a CSV clipID into a stable integer string.
 * Handles float artefacts like "942.0" → "942".
 */
export function normalizeClipId(raw: unknown): string | null {
	const str = cleanString(raw)
	if (!str) return null
	const num = Number(str)
	if (Number.isFinite(num) && num === Math.floor(num)) return String(num)
	return str
}

type SanityType = 'historicalImage' | 'primarySource' | 'researchArticle'

const TYPE_MAP: Record<string, SanityType> = {
	photo: 'historicalImage',
	document: 'primarySource',
	book: 'researchArticle',
}

/**
 * Map a legacy `type` column value to the Sanity schema name.
 * Returns null for unknown/missing types so the caller can log an audit error.
 */
export function resolveSchemaType(legacyType: unknown): SanityType | null {
	const key = cleanString(legacyType)?.toLowerCase()
	if (!key) return null
	return TYPE_MAP[key] ?? null
}

/**
 * Derive a URL-safe slug from a title string.
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
}
