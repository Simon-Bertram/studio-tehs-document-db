/**
 * Import pipeline orchestration.
 * Wires taxonomy → CSV → map → dry-run/live upsert → editor reports.
 * Keeps Sanity/CSV details in sibling modules so this file stays the high-level flow.
 */
import fs from 'node:fs'
import path from 'node:path'

import type {SanityClient} from '@sanity/client'
import pLimit from 'p-limit'

import {SANITY_DATASET, SANITY_PROJECT_ID} from '../../../lib/sanityEnv'
import {Audit} from './audit'
import type {ImportConfig} from './cli-config'
import type {ImportDoc} from './map-row'
import {mapRow} from './map-row'
import {readCsvRows} from './read-csv'
import {hasAuthToken} from './sanity-client'
import {buildTaxonomyLookups} from './taxonomy'
import {upsertByArchiveId} from './upsert-document'
import {writeReports} from './write-reports'

const CONCURRENCY = 5

export async function runImport(config: ImportConfig, client: SanityClient): Promise<void> {
	const {dryRun, rowLimit, csvPath, reportsDir} = config
	const mode = dryRun ? 'DRY RUN' : 'LIVE'

	console.log(`--- CSV Import (${mode}) ---`)
	console.log(`Source: ${csvPath}`)
	console.log(`Project: ${SANITY_PROJECT_ID} / ${SANITY_DATASET}`)
	if (rowLimit < Infinity) console.log(`Row limit: ${rowLimit}`)
	console.log()

	// --- Phase 1: taxonomy lookups ---
	// Skip the API fetch in dry-run when no token — keywords stay unmapped.
	const lookups =
		dryRun && !hasAuthToken()
			? {categories: {}, townships: {}, organizations: {}}
			: await buildTaxonomyLookups(client)

	// --- Phase 2: parse CSV ---
	const audit = new Audit()
	const rows = await readCsvRows(csvPath, rowLimit)
	audit.totalRows = rows.length
	console.log(`Parsed ${rows.length} rows from CSV.\n`)

	// --- Phase 3: map rows (and upsert when live) ---
	const limit = pLimit(CONCURRENCY)
	const docs: ImportDoc[] = []

	const tasks = rows.map((row) =>
		limit(async () => {
			const mapped = mapRow(row, lookups, audit)
			if (!mapped) return

			const {doc, csvType, title, mappedKeywords, unmappedKeywords} = mapped

			if (dryRun) {
				docs.push(doc)
				audit.recordImported({
					clipId: doc.archiveId,
					title,
					csvType,
					schemaType: doc._type,
					action: 'dry_run',
					mappedKeywords,
					unmappedKeywords,
				})
				console.log(`[DRY RUN] ${doc._type} → Archive ID: ${doc.archiveId}`)
				return
			}

			try {
				const result = await upsertByArchiveId(client, doc)
				audit.recordImported({
					clipId: doc.archiveId,
					title,
					csvType,
					schemaType: doc._type,
					action: result.action,
					sanityId: result.id,
					mappedKeywords,
					unmappedKeywords,
				})
				console.log(
					`[OK] ${result.action} ${doc._type} → Archive ID: ${doc.archiveId} (${result.id})`,
				)
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				audit.skip({
					clipId: doc.archiveId,
					title,
					csvType,
					reason: 'api_error',
					detail: msg,
				})
			}
		}),
	)

	await Promise.all(tasks)

	// --- Phase 4: write reports ---
	fs.mkdirSync(reportsDir, {recursive: true})

	if (dryRun && docs.length > 0) {
		const previewPath = path.join(reportsDir, 'preview.ndjson')
		fs.writeFileSync(previewPath, docs.map((d) => JSON.stringify(d)).join('\n'))
		console.log(`\nPreview written to ${previewPath}`)
	}

	writeReports(audit, reportsDir)
	console.log(`\nReports written to ${reportsDir}`)
	audit.print(reportsDir)
}
