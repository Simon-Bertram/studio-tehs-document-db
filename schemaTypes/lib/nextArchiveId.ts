/**
 * Compute the next Archive ID for a letter-prefix stem from existing IDs.
 * Sequence = highest numeric suffix matching ^prefix(\d+)$, then +1.
 */

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Highest numeric suffix for `prefix` among `existingIds`, or 0 if none match.
 * Only exact stem+digits counts (`BE` ignores `BEP12`).
 */
export function maxArchiveIdSuffix(prefix: string, existingIds: string[]): number {
	if (!prefix) return 0
	const pattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`)
	let max = 0
	for (const id of existingIds) {
		const match = pattern.exec(id)
		if (!match) continue
		const n = Number.parseInt(match[1], 10)
		if (Number.isFinite(n) && n > max) max = n
	}
	return max
}

/**
 * Next Archive ID for the stem (`AS2` present → `AS3`; none → `AS1`).
 */
export function nextArchiveId(prefix: string, existingIds: string[]): string {
	const next = maxArchiveIdSuffix(prefix, existingIds) + 1
	return `${prefix}${next}`
}
