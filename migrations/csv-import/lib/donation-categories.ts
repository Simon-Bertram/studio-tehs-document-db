/**
 * Seed canonical donation categories and build migrationKey → _id lookup.
 */
import type {SanityClient} from '@sanity/client'
import {CANONICAL_DONATION_CATEGORIES} from './donation-dtype-map'

function cleanId(id: string): string {
	return id.replace(/^drafts\./, '')
}

/**
 * Ensure each canonical category exists (createIfNotExists by migrationKey).
 * Returns lookup keyed by lowercased migrationKey / title.
 */
export async function ensureDonationCategories(
	client: SanityClient,
	dryRun: boolean,
	options?: {skipFetch?: boolean},
): Promise<Record<string, string>> {
	const lookup: Record<string, string> = {}

	if (!options?.skipFetch) {
		const existing = await client.fetch<
			{_id: string; migrationKey: string; title: string}[]
		>(
			`*[_type == "donationCategory" && defined(migrationKey)]{ _id, migrationKey, title }`,
		)
		for (const doc of existing) {
			lookup[doc.migrationKey.trim().toLowerCase()] = cleanId(doc._id)
			lookup[doc.title.trim().toLowerCase()] = cleanId(doc._id)
		}
	}

	for (const title of CANONICAL_DONATION_CATEGORIES) {
		const key = title.toLowerCase()
		if (lookup[key]) continue

		if (dryRun) {
			console.log(`[DRY RUN] Would seed donationCategory: ${title}`)
			lookup[key] = `dry-run-donation-category-${key.replace(/\s+/g, '-')}`
			continue
		}

		const created = await client.create({
			_type: 'donationCategory',
			title,
			migrationKey: title,
		})
		lookup[key] = created._id
		console.log(`[OK] created donationCategory: ${title} (${created._id})`)
	}

	console.log(
		`Donation categories ready: ${CANONICAL_DONATION_CATEGORIES.length} canonical titles in lookup.`,
	)
	return lookup
}
