/**
 * Truncate preview subtitle text for cleaner Studio list rows.
 */
export function truncatePreviewText(text: string | undefined, max = 80) {
	if (!text) return undefined
	const trimmed = text.trim()
	if (trimmed.length <= max) return trimmed
	return `${trimmed.slice(0, max - 1)}…`
}
