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
