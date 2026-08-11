/**
 * Lookups for historical image import: townships, subject categories, donations.
 */
import type {SanityClient} from '@sanity/client'

import type {ImageLookups} from './map-image-row'

function cleanId(id: string): string {
	return id.replace(/^drafts\./, '')
}

export async function buildImageLookups(client: SanityClient): Promise<ImageLookups> {
	const [townships, categories, donations] = await Promise.all([
		client.fetch<{_id: string; migrationKey: string}[]>(
			`*[_type == "township" && defined(migrationKey)]{ _id, migrationKey }`,
		),
		client.fetch<{_id: string; migrationKey: string}[]>(
			`*[_type == "category" && defined(migrationKey)]{ _id, migrationKey }`,
		),
		client.fetch<{_id: string; donationId: number}[]>(
			`*[_type == "donation" && defined(donationId)]{ _id, donationId }`,
		),
	])

	const townshipLookup: Record<string, string> = {}
	for (const doc of townships) {
		townshipLookup[doc.migrationKey.trim().toLowerCase()] = cleanId(doc._id)
	}

	const categoryLookup: Record<string, string> = {}
	for (const doc of categories) {
		categoryLookup[doc.migrationKey.trim().toLowerCase()] = cleanId(doc._id)
	}

	const donationLookup: Record<string, string> = {}
	for (const doc of donations) {
		donationLookup[String(doc.donationId)] = cleanId(doc._id)
	}

	console.log(
		`Loaded ${Object.keys(townshipLookup).length} townships, ` +
			`${Object.keys(categoryLookup).length} categories, ` +
			`${Object.keys(donationLookup).length} donations into memory.`,
	)

	return {
		townships: townshipLookup,
		categories: categoryLookup,
		donations: donationLookup,
	}
}
