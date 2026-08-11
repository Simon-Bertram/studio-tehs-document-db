import type {SanityClient} from '@sanity/client'

export interface TaxonomyLookups {
	/** migrationKey (lowercased) → clean Sanity _id */
	categories: Record<string, string>
	/** migrationKey (lowercased) → clean Sanity _id */
	townships: Record<string, string>
	/** migrationKey (lowercased) → clean Sanity _id */
	organisations: Record<string, string>
}

function cleanId(id: string): string {
	return id.replace(/^drafts\./, '')
}

function buildLookup(docs: {_id: string; migrationKey: string}[]): Record<string, string> {
	const lookup: Record<string, string> = {}
	for (const doc of docs) {
		lookup[doc.migrationKey.trim().toLowerCase()] = cleanId(doc._id)
	}
	return lookup
}

/**
 * Fetch all categories, townships, and organisations that carry a migrationKey,
 * returning case-insensitive lookup dictionaries keyed by trimmed migrationKey.
 */
export async function buildTaxonomyLookups(client: SanityClient): Promise<TaxonomyLookups> {
	const [categories, townships, organisations] = await Promise.all([
		client.fetch<{_id: string; migrationKey: string}[]>(
			`*[_type == "category" && defined(migrationKey)]{ _id, migrationKey }`,
		),
		client.fetch<{_id: string; migrationKey: string}[]>(
			`*[_type == "township" && defined(migrationKey)]{ _id, migrationKey }`,
		),
		client.fetch<{_id: string; migrationKey: string}[]>(
			`*[_type == "business" && defined(migrationKey)]{ _id, migrationKey }`,
		),
	])

	const lookups = {
		categories: buildLookup(categories),
		townships: buildLookup(townships),
		organisations: buildLookup(organisations),
	}

	console.log(
		`Loaded ${Object.keys(lookups.categories).length} categories, ` +
			`${Object.keys(lookups.townships).length} townships, and ` +
			`${Object.keys(lookups.organisations).length} organisations into memory.`,
	)

	return lookups
}
