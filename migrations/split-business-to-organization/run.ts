/**
 * Convert civic / institutional `business` documents to `organization`.
 *
 * Sanity will not change `_type` on an existing `_id` — createOrReplace and
 * even delete+create in one transaction are treated as a type mutation and
 * fail. This script creates new `organization` documents, rewrites incoming
 * references, then deletes the old `business` documents.
 *
 *   SANITY_AUTH_TOKEN=… bun run migrations/split-business-to-organization/run.ts
 *   SANITY_AUTH_TOKEN=… bun run migrations/split-business-to-organization/run.ts -- --live
 */
import {createClient} from '@sanity/client'

import {SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID} from '../../lib/sanityEnv'

const DRY_RUN = !process.argv.includes('--live')
const NON_COMMERCIAL_TYPES = ['civic', 'institutional'] as const
const LINCOLN_MIGRATION_KEY = 'Lincoln'

const SYSTEM_KEYS = new Set([
	'_id',
	'_type',
	'_rev',
	'_createdAt',
	'_updatedAt',
	'_system',
	'businessType',
])

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

interface BusinessDoc {
	_id: string
	_type: string
	name?: string
	businessType?: string
	migrationKey?: string
	[key: string]: unknown
}

interface IncomingDoc {
	_id: string
	[key: string]: unknown
}

function publishedId(id: string) {
	return id.replace(/^drafts\./, '')
}

function toOrganizationFields(doc: BusinessDoc) {
	const next: {_type: 'organization'; [key: string]: unknown} = {
		_type: 'organization',
	}
	for (const [key, value] of Object.entries(doc)) {
		if (SYSTEM_KEYS.has(key)) continue
		next[key] = value
	}
	return next
}

function containsRef(value: unknown, targetId: string): boolean {
	const target = publishedId(targetId)
	if (Array.isArray(value)) return value.some((item) => containsRef(item, target))
	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>
		if (typeof record._ref === 'string' && publishedId(record._ref) === target) return true
		return Object.values(record).some((item) => containsRef(item, target))
	}
	return false
}

function replaceRefIds(value: unknown, fromId: string, toId: string): unknown {
	const from = publishedId(fromId)
	if (Array.isArray(value)) return value.map((item) => replaceRefIds(item, from, toId))
	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>
		if (typeof record._ref === 'string' && publishedId(record._ref) === from) {
			const next = {...record, _ref: toId}
			delete next._weak
			return next
		}
		return Object.fromEntries(
			Object.entries(record).map(([key, nested]) => [key, replaceRefIds(nested, from, toId)]),
		)
	}
	return value
}

function refRewritePatch(doc: IncomingDoc, fromId: string, toId: string) {
	const patch: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(doc)) {
		if (key.startsWith('_')) continue
		if (containsRef(value, fromId)) {
			patch[key] = replaceRefIds(value, fromId, toId)
		}
	}
	return patch
}

async function fetchIncoming(id: string) {
	const published = publishedId(id)
	return client.fetch<IncomingDoc[]>(`*[references($id) && !(_id in [$id, $draftId])]`, {
		id: published,
		draftId: `drafts.${published}`,
	})
}

async function findExistingOrganization(doc: BusinessDoc) {
	if (typeof doc.migrationKey === 'string' && doc.migrationKey.trim()) {
		const byKey = await client.fetch<{_id: string} | null>(
			`*[_type == "organization" && migrationKey == $key && !(_id in path("drafts.**"))][0]{_id}`,
			{key: doc.migrationKey},
		)
		if (byKey?._id) return byKey._id
	}
	if (typeof doc.name === 'string' && doc.name.trim()) {
		const byName = await client.fetch<{_id: string} | null>(
			`*[_type == "organization" && name == $name && !(_id in path("drafts.**"))][0]{_id}`,
			{name: doc.name},
		)
		if (byName?._id) return byName._id
	}
	return null
}

async function assertAfterLive(newOrgIds: string[]) {
	const lincoln = await client.fetch<{_id: string} | null>(
		`*[_type == "organization" && migrationKey == $key && !(_id in path("drafts.**"))][0]{_id}`,
		{key: LINCOLN_MIGRATION_KEY},
	)
	const [businessCount, orgCount, leftover, lincolnRefs] = await Promise.all([
		client.fetch<number>(`count(*[_type == "business" && !(_id in path("drafts.**"))])`),
		client.fetch<number>(`count(*[_type == "organization" && !(_id in path("drafts.**"))])`),
		client.fetch<number>(`count(*[_type == "business" && businessType in $types])`, {
			types: NON_COMMERCIAL_TYPES,
		}),
		lincoln?._id
			? client.fetch<number>(`count(*[references($id)])`, {id: lincoln._id})
			: Promise.resolve(0),
	])

	console.log('\n--- Post-live checks ---')
	console.log(`Published businesses: ${businessCount}`)
	console.log(`Published organizations: ${orgCount}`)
	console.log(`Leftover civic/institutional businesses: ${leftover}`)
	console.log(`Incoming refs to Lincoln (${lincoln?._id ?? 'missing'}): ${lincolnRefs}`)

	const converted = await client.fetch<{_id: string; _type: string; name?: string}[]>(
		`*[_id in $ids]{_id, _type, name}`,
		{ids: newOrgIds},
	)
	for (const doc of converted) {
		console.log(`  ${doc.name ?? doc._id} → _type=${doc._type} (${doc._id})`)
		if (doc._type !== 'organization') {
			throw new Error(`Expected ${doc._id} to be organization, got ${doc._type}`)
		}
	}

	if (leftover > 0) {
		throw new Error('Civic/institutional business documents still remain.')
	}
	if (!lincoln?._id || lincolnRefs < 1) {
		throw new Error(
			`Lincoln organization missing or lost incoming references (count=${lincolnRefs}).`,
		)
	}
}

async function run() {
	console.log(`--- Split business → organization (${DRY_RUN ? 'DRY RUN' : 'LIVE'}) ---`)

	const toConvert = await client.fetch<BusinessDoc[]>(
		`*[_type == "business" && businessType in $types]`,
		{types: NON_COMMERCIAL_TYPES},
	)
	const toUnset = await client.fetch<{_id: string; name?: string; businessType?: string}[]>(
		`*[_type == "business" && defined(businessType) && !(businessType in $types)]{
			_id, name, businessType
		}`,
		{types: NON_COMMERCIAL_TYPES},
	)

	const incomingByTarget = new Map<string, IncomingDoc[]>()
	console.log(`Convert to organization: ${toConvert.length}`)
	for (const doc of toConvert) {
		const incoming = await fetchIncoming(doc._id)
		incomingByTarget.set(doc._id, incoming)
		console.log(
			`  ${doc._id}  ${doc.name ?? '(unnamed)'}  (${doc.businessType})  incomingRefs=${incoming.length}`,
		)
	}

	console.log(`Unset businessType on remaining businesses: ${toUnset.length}`)
	for (const doc of toUnset) {
		console.log(`  ${doc._id}  ${doc.name ?? '(unnamed)'}  (${doc.businessType})`)
	}

	if (DRY_RUN) {
		console.log('\nDry run complete. Pass --live to write.')
		return
	}

	const newOrgIds: string[] = []

	for (const doc of toConvert) {
		const existingId = await findExistingOrganization(doc)
		const newId = existingId ?? (await client.create(toOrganizationFields(doc)))._id
		newOrgIds.push(newId)
		console.log(
			existingId
				? `  reuse organization ${newId} for ${doc.name ?? doc._id}`
				: `  created organization ${newId} from ${doc._id}`,
		)

		const incoming = incomingByTarget.get(doc._id) ?? []
		for (const incomingDoc of incoming) {
			const patch = refRewritePatch(incomingDoc, doc._id, newId)
			if (Object.keys(patch).length === 0) continue
			await client.patch(incomingDoc._id).set(patch).commit({visibility: 'sync'})
			console.log(`  rewrote refs on ${incomingDoc._id}: ${doc._id} → ${newId}`)
		}

		await client.delete(doc._id)
		console.log(`  deleted old business ${doc._id}`)
	}

	if (toUnset.length > 0) {
		const unsetTx = client.transaction()
		for (const doc of toUnset) {
			unsetTx.patch(doc._id, (p) => p.unset(['businessType']))
		}
		await unsetTx.commit({visibility: 'sync'})
		console.log(`Unset businessType on ${toUnset.length} commercial business(es).`)
	}

	await assertAfterLive(newOrgIds)
	console.log('Migration checks passed.')
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
