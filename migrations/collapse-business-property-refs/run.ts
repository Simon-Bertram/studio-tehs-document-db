/**
 * Collapse bidirectional business↔property refs onto business.locations
 * (canonical), then unset property.relatedBusinesses.
 *
 * Run after dry-run review:
 *   SANITY_AUTH_TOKEN=… bun run migrations/collapse-business-property-refs/run.ts
 *   SANITY_AUTH_TOKEN=… bun run migrations/collapse-business-property-refs/run.ts -- --live
 */
import {createClient} from '@sanity/client'
import {nanoid} from 'nanoid'

import {SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID} from '../../lib/sanityEnv'

const DRY_RUN = !process.argv.includes('--live')

const token = process.env.SANITY_AUTH_TOKEN
if (!DRY_RUN && !token) {
	console.error('SANITY_AUTH_TOKEN is required for live writes. Aborting.')
	process.exit(1)
}

const client = createClient({
	projectId: SANITY_PROJECT_ID,
	dataset: SANITY_DATASET,
	apiVersion: SANITY_API_VERSION,
	token,
	useCdn: false,
})

interface PropertyRow {
	_id: string
	relatedBusinesses?: {_ref: string}[]
}

interface BusinessRow {
	_id: string
	locations?: {_ref: string}[]
}

async function run() {
	console.log(`--- Collapse business↔property refs (${DRY_RUN ? 'DRY RUN' : 'LIVE'}) ---`)

	const properties = await client.fetch<PropertyRow[]>(
		`*[_type == "property" && defined(relatedBusinesses) && count(relatedBusinesses) > 0]{
			_id,
			relatedBusinesses[]{_ref}
		}`,
	)

	console.log(`Properties with relatedBusinesses: ${properties.length}`)

	const businessIds = new Set<string>()
	for (const prop of properties) {
		for (const ref of prop.relatedBusinesses ?? []) {
			if (ref._ref) businessIds.add(ref._ref.replace(/^drafts\./, ''))
		}
	}

	const businesses = businessIds.size
		? await client.fetch<BusinessRow[]>(
				`*[_type == "business" && _id in $ids]{_id, locations[]{_ref}}`,
				{ids: Array.from(businessIds)},
			)
		: []

	const locationsByBusiness = new Map<string, Set<string>>()
	const knownBusinessIds = new Set(businesses.map((biz) => biz._id.replace(/^drafts\./, '')))
	for (const biz of businesses) {
		const id = biz._id.replace(/^drafts\./, '')
		locationsByBusiness.set(
			id,
			new Set((biz.locations ?? []).map((l) => l._ref.replace(/^drafts\./, ''))),
		)
	}

	let linkAdds = 0
	for (const prop of properties) {
		const propertyId = prop._id.replace(/^drafts\./, '')
		for (const ref of prop.relatedBusinesses ?? []) {
			const businessId = ref._ref.replace(/^drafts\./, '')
			if (!knownBusinessIds.has(businessId)) {
				console.warn(`  skip missing business ${businessId} (from property ${propertyId})`)
				continue
			}
			const existing = locationsByBusiness.get(businessId) ?? new Set()
			if (!existing.has(propertyId)) {
				existing.add(propertyId)
				locationsByBusiness.set(businessId, existing)
				linkAdds++
				console.log(`  link business ${businessId} → property ${propertyId}`)
			}
		}
	}

	console.log(`New location links to add: ${linkAdds}`)
	console.log(`Properties to clear relatedBusinesses: ${properties.length}`)

	if (DRY_RUN) {
		console.log('\nDry run complete. Pass --live to write.')
		return
	}

	const tx = client.transaction()

	for (const [businessId, locationIds] of locationsByBusiness) {
		const locations = Array.from(locationIds).map((_ref) => ({
			_type: 'reference' as const,
			_key: nanoid(),
			_ref,
		}))
		tx.patch(businessId, (p) => p.set({locations}))
	}

	for (const prop of properties) {
		tx.patch(prop._id, (p) => p.unset(['relatedBusinesses']))
	}

	await tx.commit({visibility: 'async'})
	console.log('Committed patches.')
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
