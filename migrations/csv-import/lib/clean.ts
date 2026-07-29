const EMPTY_TOKENS = new Set(['nan', 'null', ''])

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

type SanityType = 'historicalImage' | 'primarySource' | 'curatedEssay'

const TYPE_MAP: Record<string, SanityType> = {
	photo: 'historicalImage',
	document: 'primarySource',
	book: 'curatedEssay',
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
