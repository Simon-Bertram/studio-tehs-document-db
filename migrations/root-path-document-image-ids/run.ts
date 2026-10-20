/**
 * Move document-import historicalImage docs off the private dotted path
 * `historicalImage.import.**` onto public root-path ids
 * `historicalImage-import-*`, then retarget incoming references.
 *
 *   bun run migrations/root-path-document-image-ids/run.ts
 *   bun run migrations/root-path-document-image-ids/run.ts -- --live
 */
import {createClient} from '@sanity/client'

import {
	getSanityWriteToken,
	SANITY_API_VERSION,
	SANITY_DATASET,
	SANITY_PROJECT_ID,
} from '../../lib/sanityEnv'
import {rootImportIdFromLegacy} from '../csv-import/lib/document-image-catalog'

const DRY_RUN = !process.argv.includes('--live')

const SYSTEM_KEYS = new Set(['_id', '_type', '_rev', '_createdAt', '_updatedAt', '_system'])

const token = getSanityWriteToken()
if (!DRY_RUN && !token) {
	console.error('SANITY_API_WRITE_TOKEN is required for live writes. Aborting.')
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

interface HistoricalImageDoc {
	_id: string
	_type: string
	title?: string
	[key: string]: unknown
}

interface IncomingDoc {
	_id: string
	[key: string]: unknown
}

function publishedId(id: string) {
	return id.replace(/^drafts\./, '')
}

function toRootFields(doc: HistoricalImageDoc) {
	const next: {_type: 'historicalImage'; [key: string]: unknown} = {
		_type: 'historicalImage',
	}
	for (const [key, value] of Object.entries(doc)) {
		if (SYSTEM_KEYS.has(key)) continue
		next[key] = value
	}
	return next
}

function rewriteAllLegacyImportRefs(value: unknown): {next: unknown; changed: boolean} {
	if (Array.isArray(value)) {
		let changed = false
		const next = value.map((item) => {
			const result = rewriteAllLegacyImportRefs(item)
			if (result.changed) changed = true
			return result.next
		})
		return {next, changed}
	}
	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>
		if (typeof record._ref === 'string') {
			const mapped = rootImportIdFromLegacy(record._ref)
			if (mapped && mapped !== record._ref) {
				const next = {...record, _ref: mapped}
				delete next._weak
				return {next, changed: true}
			}
		}
		let changed = false
		const next: Record<string, unknown> = {}
		for (const [key, nested] of Object.entries(record)) {
			const result = rewriteAllLegacyImportRefs(nested)
			if (result.changed) changed = true
			next[key] = result.next
		}
		return {next, changed}
	}
	return {next: value, changed: false}
}

function legacyImportRefPatch(doc: IncomingDoc) {
	const patch: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(doc)) {
		if (key.startsWith('_')) continue
		const result = rewriteAllLegacyImportRefs(value)
		if (result.changed) patch[key] = result.next
	}
	return patch
}

/**
 * Parents that still point at private-path import ids (including broken refs
 * after a partial prior run).
 */
async function fetchDocsWithLegacyImportRefs() {
	// coalesce: primarySource has transcription only; null + array breaks count().
	return client.fetch<IncomingDoc[]>(/* groq */ `*[
		count(
			coalesce(
				transcription[
					_type == "historicalImageEmbed" &&
						historicalImage._ref match "historicalImage.import.*"
				],
				[]
			) +
				coalesce(
					body[
						_type == "historicalImageEmbed" &&
							historicalImage._ref match "historicalImage.import.*"
					],
					[]
				) +
				coalesce(
					intro[
						_type == "historicalImageEmbed" &&
							historicalImage._ref match "historicalImage.import.*"
					],
					[]
				)
		) > 0
	]`)
}

async function fetchIncoming(id: string) {
	const published = publishedId(id)
	return client.fetch<IncomingDoc[]>(`*[references($id) && !(_id in [$id, $draftId])]`, {
		id: published,
		draftId: `drafts.${published}`,
	})
}

async function assertAfterLive(sampleRootId: string) {
	const [legacyCount, rootSample, anonNote] = await Promise.all([
		client.fetch<number>(
			`count(*[_type == "historicalImage" && _id in path("historicalImage.import.**")])`,
		),
		client.fetch<{_id: string; title?: string} | null>(`*[_id == $id][0]{_id, title}`, {
			id: sampleRootId,
		}),
		Promise.resolve(
			'Verify anonymously: count(*[_id in path("historicalImage.import.**")]) should be 0',
		),
	])

	console.log('\n--- Post-live checks ---')
	console.log(`Legacy private-path historicalImage docs: ${legacyCount}`)
	console.log(`Sample root doc: ${rootSample?._id ?? '(missing)'} (${rootSample?.title ?? ''})`)
	console.log(anonNote)

	if (legacyCount > 0) {
		throw new Error(`Expected 0 legacy private-path docs, found ${legacyCount}`)
	}
	if (!rootSample?._id) {
		throw new Error(`Expected sample root doc ${sampleRootId} to exist`)
	}
}

async function run() {
	console.log(`--- Root-path document image ids (${DRY_RUN ? 'DRY RUN' : 'LIVE'}) ---`)

	const legacyDocs = await client.fetch<HistoricalImageDoc[]>(
		`*[
			_type == "historicalImage" && (
				_id in path("historicalImage.import.**") ||
				_id in path("drafts.historicalImage.import.**")
			)
		] | order(_id asc)`,
	)

	const byPublished = new Map<string, HistoricalImageDoc[]>()
	for (const doc of legacyDocs) {
		const published = publishedId(doc._id)
		const group = byPublished.get(published) ?? []
		group.push(doc)
		byPublished.set(published, group)
	}

	console.log(`Legacy docs: ${legacyDocs.length} (${byPublished.size} published id groups)`)

	const plan: {
		legacyPublishedId: string
		rootId: string
		variants: HistoricalImageDoc[]
	}[] = []

	for (const [legacyPublishedId, variants] of byPublished) {
		const rootId = rootImportIdFromLegacy(legacyPublishedId)
		if (!rootId) {
			throw new Error(`Could not map legacy id ${legacyPublishedId}`)
		}
		const incoming = await fetchIncoming(legacyPublishedId)
		plan.push({legacyPublishedId, rootId, variants})
		const titles = variants.map((v) => v.title ?? '(untitled)').join(' | ')
		console.log(`  ${legacyPublishedId} → ${rootId}  incomingRefs=${incoming.length}  (${titles})`)
	}

	const parentsWithLegacyRefs = await fetchDocsWithLegacyImportRefs()
	console.log(`Parents still holding legacy import refs: ${parentsWithLegacyRefs.length}`)
	for (const doc of parentsWithLegacyRefs) {
		console.log(`  ${doc._id}`)
	}

	if (DRY_RUN) {
		console.log('\nDry run complete. Pass --live to write.')
		return
	}

	const sampleRootId = 'historicalImage-import-1854-11-28doc601small'

	// 1) Ensure every public root-path copy exists before rewriting refs.
	for (const item of plan) {
		const {legacyPublishedId, rootId, variants} = item

		const publishedVariant = variants.find((v) => v._id === legacyPublishedId) ?? variants[0]
		const draftVariant = variants.find((v) => v._id === `drafts.${legacyPublishedId}`)

		const existingRoot = await client.fetch<{_id: string} | null>(`*[_id == $id][0]{_id}`, {
			id: rootId,
		})
		if (!existingRoot?._id) {
			await client.createOrReplace({
				_id: rootId,
				...toRootFields(publishedVariant),
			})
			console.log(`  created ${rootId} from ${publishedVariant._id}`)
		} else {
			console.log(`  reuse existing ${rootId}`)
		}

		if (draftVariant) {
			const rootDraftId = `drafts.${rootId}`
			const existingRootDraft = await client.fetch<{_id: string} | null>(`*[_id == $id][0]{_id}`, {
				id: rootDraftId,
			})
			if (!existingRootDraft?._id) {
				await client.createOrReplace({
					_id: rootDraftId,
					...toRootFields(draftVariant),
				})
				console.log(`  created ${rootDraftId} from ${draftVariant._id}`)
			}
		}
	}

	// 2) Rewrite every parent that still points at private-path import ids.
	//    Includes broken refs left by a partial prior run.
	const parentsToRepair = await fetchDocsWithLegacyImportRefs()
	for (const stale of parentsToRepair) {
		const fresh = await client.fetch<IncomingDoc | null>(`*[_id == $id][0]`, {
			id: stale._id,
		})
		if (!fresh) continue
		const patch = legacyImportRefPatch(fresh)
		if (Object.keys(patch).length === 0) continue
		await client.patch(fresh._id).set(patch).commit({visibility: 'sync'})
		console.log(`  rewrote all legacy import refs on ${fresh._id}`)
	}

	// 3) Delete legacy private-path docs (and drafts).
	for (const item of plan) {
		for (const variant of item.variants) {
			const stillExists = await client.fetch<string | null>(`*[_id == $id][0]._id`, {
				id: variant._id,
			})
			if (!stillExists) {
				console.log(`  already deleted ${variant._id}`)
				continue
			}
			await client.delete(variant._id)
			console.log(`  deleted ${variant._id}`)
		}
	}

	await assertAfterLive(sampleRootId)
	console.log('Migration checks passed.')
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
