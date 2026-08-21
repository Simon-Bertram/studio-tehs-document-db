/**
 * Create county documents and convert the mis-typed Chester County township.
 *
 * Sanity will not change `_type` on an existing `_id`. This script creates
 * county documents, unsets the township ref on the one historical image that
 * pointed at that township, then deletes the township.
 *
 *   SANITY_AUTH_TOKEN=… bun run migrations/add-county-to-township/run.ts
 *   SANITY_AUTH_TOKEN=… bun run migrations/add-county-to-township/run.ts -- --live
 */
import {createClient} from '@sanity/client'

import {SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID} from '../../lib/sanityEnv'

const DRY_RUN = !process.argv.includes('--live')

const COUNTY_NAMES = ['Chester', 'Delaware', 'Montgomery'] as const

const CHESTER_COUNTY_TOWNSHIP_ID = 'db47653e-92bf-4dd3-a851-8ad3e7a287d8'
const CHESTER_COUNTY_TOWNSHIP_NAME = 'Chester County'
const PLANTATION_IMAGE_ID = 'db820027-6ab6-4547-b83c-170ca8fe2945'

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
	perspective: 'raw',
})

interface NamedDoc {
	_id: string
	name?: string
}

interface IncomingDoc {
	_id: string
	_type: string
}

function publishedId(id: string) {
	return id.replace(/^drafts\./, '')
}

function draftId(id: string) {
	const published = publishedId(id)
	return `drafts.${published}`
}

function idsFor(id: string) {
	return [publishedId(id), draftId(id)]
}

async function existingCountyId(name: string) {
	const doc = await client.fetch<NamedDoc | null>(
		`*[_type == "county" && name == $name && !(_id in path("drafts.**"))][0]{_id, name}`,
		{name},
	)
	return doc?._id ?? null
}

async function fetchIncoming(id: string) {
	const published = publishedId(id)
	return client.fetch<IncomingDoc[]>(
		`*[references($id) && !(_id in [$id, $draftId])]{_id, _type}`,
		{
			id: published,
			draftId: draftId(published),
		},
	)
}

async function run() {
	console.log(`--- Add county documents (${DRY_RUN ? 'DRY RUN' : 'LIVE'}) ---`)

	const township = await client.fetch<NamedDoc | null>(`*[_id == $id][0]{_id, name}`, {
		id: CHESTER_COUNTY_TOWNSHIP_ID,
	})
	const townshipDraft = await client.fetch<NamedDoc | null>(`*[_id == $id][0]{_id, name}`, {
		id: draftId(CHESTER_COUNTY_TOWNSHIP_ID),
	})

	if (township && township.name !== CHESTER_COUNTY_TOWNSHIP_NAME) {
		throw new Error(
			`Expected township ${CHESTER_COUNTY_TOWNSHIP_ID} to be named "${CHESTER_COUNTY_TOWNSHIP_NAME}", got "${township.name ?? ''}"`,
		)
	}

	const incoming = township ? await fetchIncoming(CHESTER_COUNTY_TOWNSHIP_ID) : []
	const allowedIncoming = new Set(idsFor(PLANTATION_IMAGE_ID))
	const unexpected = incoming.filter((doc) => !allowedIncoming.has(doc._id))
	if (unexpected.length > 0) {
		const list = unexpected.map((doc) => `${doc._id} (${doc._type})`).join(', ')
		throw new Error(`Unexpected incoming references to Chester County township: ${list}`)
	}

	console.log('Counties to ensure:')
	for (const name of COUNTY_NAMES) {
		const existing = await existingCountyId(name)
		console.log(existing ? `  ${name} — exists (${existing})` : `  ${name} — will create`)
	}

	if (township) {
		console.log(
			`Convert township ${township._id} "${township.name}" → county "Chester" (delete township)`,
		)
		console.log(`Incoming refs: ${incoming.length}`)
		for (const doc of incoming) {
			console.log(`  unset township on ${doc._id} (${doc._type})`)
		}
		if (townshipDraft) {
			console.log(`  delete draft ${townshipDraft._id}`)
		}
	} else {
		console.log('Chester County township already absent; skip conversion.')
	}

	if (DRY_RUN) {
		console.log('\nDry run complete. Pass --live to write.')
		return
	}

	for (const name of COUNTY_NAMES) {
		const existing = await existingCountyId(name)
		if (existing) {
			console.log(`  reuse county ${existing} (${name})`)
			continue
		}
		const created = await client.create({_type: 'county', name})
		console.log(`  created county ${created._id} (${name})`)
	}

	if (township) {
		for (const doc of incoming) {
			await client.patch(doc._id).unset(['township']).commit({visibility: 'sync'})
			console.log(`  unset township on ${doc._id}`)
		}

		await client.delete(CHESTER_COUNTY_TOWNSHIP_ID)
		console.log(`  deleted township ${CHESTER_COUNTY_TOWNSHIP_ID}`)
		if (townshipDraft) {
			await client.delete(draftId(CHESTER_COUNTY_TOWNSHIP_ID))
			console.log(`  deleted draft ${draftId(CHESTER_COUNTY_TOWNSHIP_ID)}`)
		}
	}

	console.log('Migration complete.')
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
