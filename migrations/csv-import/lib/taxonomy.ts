import type {SanityClient} from '@sanity/client'

export interface TaxonomyLookups {
	/** migrationKey (lowercased) → clean Sanity _id */
	categories: Record<string, string>
	/** migrationKey (lowercased) → clean Sanity _id */
	townships: Record<string, string>
}

function cleanId(id: string): string {
	return id.replace(/^drafts\./, '')
}

/**
 * Fetch all categories and townships that carry a migrationKey,
 * returning case-insensitive lookup dictionaries keyed by trimmed migrationKey.
 */
export async function buildTaxonomyLookups(client: SanityClient): Promise<TaxonomyLookups> {
	const [categories, townships] = await Promise.all([
		client.fetch<{_id: string; migrationKey: string}[]>(
			`*[_type == "category" && defined(migrationKey)]{ _id, migrationKey }`,
		),
		client.fetch<{_id: string; migrationKey: string}[]>(
			`*[_type == "township" && defined(migrationKey)]{ _id, migrationKey }`,
		),
	])

	const catLookup: Record<string, string> = {}
	for (const doc of categories) {
		catLookup[doc.migrationKey.trim().toLowerCase()] = cleanId(doc._id)
	}

	const townLookup: Record<string, string> = {}
	for (const doc of townships) {
		townLookup[doc.migrationKey.trim().toLowerCase()] = cleanId(doc._id)
	}

	console.log(
		`Loaded ${Object.keys(catLookup).length} categories and ${Object.keys(townLookup).length} townships into memory.`,
	)

	return {categories: catLookup, townships: townLookup}
}
