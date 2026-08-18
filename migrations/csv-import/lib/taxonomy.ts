import type {SanityClient} from '@sanity/client'

import {indexMigrationKeys} from './index-migration-keys'

export interface TaxonomyLookups {
	/** migrationKey / alias (lowercased) → clean Sanity _id */
	categories: Record<string, string>
	/** migrationKey (lowercased) → clean Sanity _id */
	townships: Record<string, string>
	/** migrationKey (lowercased) → clean Sanity _id */
	organizations: Record<string, string>
}

/**
 * Fetch all categories, townships, and organizations that carry a migrationKey
 * (or category aliases), returning case-insensitive lookup dictionaries.
 */
export async function buildTaxonomyLookups(client: SanityClient): Promise<TaxonomyLookups> {
	const [categories, townships, organizations] = await Promise.all([
		client.fetch<{_id: string; migrationKey?: string; migrationKeyAliases?: string[]}[]>(
			`*[_type == "category" && (defined(migrationKey) || count(migrationKeyAliases) > 0)]{
				_id, migrationKey, migrationKeyAliases
			}`,
		),
		client.fetch<{_id: string; migrationKey: string}[]>(
			`*[_type == "township" && defined(migrationKey)]{ _id, migrationKey }`,
		),
		client.fetch<{_id: string; migrationKey: string}[]>(
			`*[_type == "business" && defined(migrationKey)]{ _id, migrationKey }`,
		),
	])

	const lookups = {
		categories: indexMigrationKeys(categories),
		townships: indexMigrationKeys(townships),
		organizations: indexMigrationKeys(organizations),
	}
	const categoryCount = new Set(Object.values(lookups.categories)).size

	console.log(
		`Loaded ${categoryCount} categories, ` +
			`${Object.keys(lookups.townships).length} townships, and ` +
			`${Object.keys(lookups.organizations).length} organizations into memory.`,
	)

	return lookups
}
