/**
 * Idempotent source keys for article stubs that have no HTML URL stem.
 */

export function slugTitle(title: string): string {
	const slug = title
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
	return slug || 'untitled'
}

/** URL-safe fragment from a sourceKey (may contain `/` or `+`). */
export function slugifySourceKey(sourceKey: string): string {
	return (
		sourceKey
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'article'
	)
}

/**
 * Unique public URL slug for a quarterly article.
 * Prefer title; on collision use `{title}-{sourceKey}` (then numbered suffix).
 * Mutates `taken` to include the returned value.
 */
export function articleSlug(title: string, sourceKey: string, taken: Set<string>): string {
	const base = slugTitle(title)
	if (!taken.has(base)) {
		taken.add(base)
		return base
	}
	const withKey = `${base}-${slugifySourceKey(sourceKey)}`
	if (!taken.has(withKey)) {
		taken.add(withKey)
		return withKey
	}
	let n = 2
	while (taken.has(`${withKey}-${n}`)) n += 1
	const unique = `${withKey}-${n}`
	taken.add(unique)
	return unique
}

export function slugField(current: string): {_type: 'slug'; current: string} {
	return {_type: 'slug', current}
}

export function articleStubSourceKey(issueKey: string, title: string): string {
	return `${issueKey}/${slugTitle(title)}`
}

export function normalizeTitle(title: string): string {
	return title
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}
