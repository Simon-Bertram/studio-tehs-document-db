/**
 * Import Archive ID stems from image-identifiers.csv into imageIdentifier docs.
 * Idempotent upsert by prefix (natural key).
 *
 * bun run csv-import:image-identifiers
 * bun run csv-import:image-identifiers -- --live
 */
import path from 'node:path'

import {SANITY_DATASET, SANITY_PROJECT_ID} from '../../lib/sanityEnv'
import {cleanDecodedString, cleanString} from './lib/clean'
import {IMAGE_IDENTIFIERS_CSV} from './lib/document-image-catalog'
import {readCsvRows} from './lib/read-csv'
import {assertContentWriteAccess, createImportClient} from './lib/sanity-client'

type ImageIdentifierCsvRow = Record<string, string> & {
	iidentifier?: string
	idescription?: string
	identifierID?: string
}

const BATCH_SIZE = 50

async function main() {
	const live = process.argv.includes('--live')
	const client = createImportClient({dryRun: !live})
	if (live) await assertContentWriteAccess(client)

	const csvPath = path.resolve(IMAGE_IDENTIFIERS_CSV)
	const rows = await readCsvRows<ImageIdentifierCsvRow>(csvPath, Infinity)

	console.log(`Project: ${SANITY_PROJECT_ID} / ${SANITY_DATASET}`)
	console.log(`Source: ${csvPath} (${rows.length} rows)`)
	console.log(live ? 'Mode: LIVE' : 'Mode: DRY RUN (pass --live to write)')

	const existing = await client.fetch<{_id: string; prefix: string}[]>(
		`*[_type == "imageIdentifier" && defined(prefix) && !(_id in path("drafts.**"))]{_id, prefix}`,
	)
	const existingByPrefix = new Map(existing.map((doc) => [doc.prefix, doc._id] as const))
	console.log(`Existing imageIdentifier docs: ${existingByPrefix.size}`)

	let created = 0
	let patched = 0
	let skipped = 0
	let wouldCreate = 0
	let wouldPatch = 0

	type Pending =
		| {_type: 'imageIdentifier'; prefix: string; description?: string; migrationKey?: string}
		| {patchId: string; set: {prefix: string; description?: string; migrationKey?: string}}

	const pending: Pending[] = []

	for (const row of rows) {
		const prefix = cleanString(row.iidentifier)
		if (!prefix) {
			skipped++
			continue
		}

		const description = cleanDecodedString(row.idescription) ?? undefined
		const migrationKey = cleanString(row.identifierID) ?? undefined
		const fields = {
			prefix,
			...(description ? {description} : {}),
			...(migrationKey ? {migrationKey} : {}),
		}

		const existingId = existingByPrefix.get(prefix)
		if (!live) {
			if (existingId) wouldPatch++
			else wouldCreate++
			continue
		}

		if (existingId) {
			pending.push({patchId: existingId, set: fields})
			patched++
		} else {
			pending.push({_type: 'imageIdentifier', ...fields})
			created++
		}
	}

	if (live) {
		for (let i = 0; i < pending.length; i += BATCH_SIZE) {
			const chunk = pending.slice(i, i + BATCH_SIZE)
			let tx = client.transaction()
			for (const item of chunk) {
				if ('patchId' in item) {
					tx = tx.patch(item.patchId, (p) => p.set(item.set))
				} else {
					tx = tx.create(item)
				}
			}
			await tx.commit({visibility: 'async'})
			console.log(`Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} mutations)`)
		}
	}

	console.log('---')
	if (live) {
		console.log(`Created: ${created}`)
		console.log(`Patched: ${patched}`)
		console.log(`Skipped (no prefix): ${skipped}`)
	} else {
		console.log(`Would create: ${wouldCreate}`)
		console.log(`Would patch: ${wouldPatch}`)
		console.log(`Skipped (no prefix): ${skipped}`)
	}
}

await main()
