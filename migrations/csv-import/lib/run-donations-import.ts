/**
 * Donations CSV import pipeline.
 */
import fs from 'node:fs'
import path from 'node:path'
import type {SanityClient} from '@sanity/client'
import pLimit from 'p-limit'
import {SANITY_DATASET, SANITY_PROJECT_ID} from '../../../lib/sanityEnv'
import {Audit} from './audit'
import type {ImportConfig} from './cli-config'
import {ensureDonationCategories} from './donation-categories'
import type {DonationCsvRow, DonationImportDoc} from './map-donation-row'
import {mapDonationRow} from './map-donation-row'
import {readCsvRows} from './read-csv'
import {hasAuthToken} from './sanity-client'
import {upsertByQuery} from './upsert-by-query'
import {writeReports} from './write-reports'

const CONCURRENCY = 5

export async function runDonationsImport(
	config: ImportConfig,
	client: SanityClient,
): Promise<void> {
	const {dryRun, rowLimit, csvPath, reportsDir} = config
	const mode = dryRun ? 'DRY RUN' : 'LIVE'

	console.log(`--- Donations CSV Import (${mode}) ---`)
	console.log(`Source: ${csvPath}`)
	console.log(`Project: ${SANITY_PROJECT_ID} / ${SANITY_DATASET}`)
	if (rowLimit < Infinity) console.log(`Row limit: ${rowLimit}`)
	console.log()

	const categoryLookup =
		dryRun && !hasAuthToken()
			? await ensureDonationCategories(client, true, {skipFetch: true})
			: await ensureDonationCategories(client, dryRun)

	const audit = new Audit()
	const rows = await readCsvRows<DonationCsvRow>(csvPath, rowLimit)
	audit.totalRows = rows.length
	console.log(`Parsed ${rows.length} donation rows.\n`)

	const limit = pLimit(CONCURRENCY)
	const docs: DonationImportDoc[] = []

	const tasks = rows.map((row) =>
		limit(async () => {
			const mapped = mapDonationRow(row, categoryLookup, audit)
			if (!mapped) return

			const {doc, csvType, title, mappedKeywords, unmappedKeywords} = mapped
			const naturalKey = String(doc.donationId)

			if (dryRun) {
				docs.push(doc)
				audit.recordImported({
					clipId: naturalKey,
					title,
					csvType,
					schemaType: 'donation',
					action: 'dry_run',
					mappedKeywords,
					unmappedKeywords,
				})
				console.log(`[DRY RUN] donation → donationId: ${doc.donationId}`)
				return
			}

			try {
				const result = await upsertByQuery(
					client,
					doc as unknown as {[key: string]: unknown; _type: string},
					`_type == "donation" && donationId == $donationId`,
					{donationId: doc.donationId},
				)
				audit.recordImported({
					clipId: naturalKey,
					title,
					csvType,
					schemaType: 'donation',
					action: result.action,
					sanityId: result.id,
					mappedKeywords,
					unmappedKeywords,
				})
				console.log(
					`[OK] ${result.action} donation → donationId: ${doc.donationId} (${result.id})`,
				)
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				audit.skip({
					clipId: naturalKey,
					title,
					csvType,
					reason: 'api_error',
					detail: msg,
				})
			}
		}),
	)

	await Promise.all(tasks)

	fs.mkdirSync(reportsDir, {recursive: true})
	if (dryRun && docs.length > 0) {
		const previewPath = path.join(reportsDir, 'preview.ndjson')
		fs.writeFileSync(previewPath, docs.map((d) => JSON.stringify(d)).join('\n'))
		console.log(`\nPreview written to ${previewPath}`)
	}

	writeReports(audit, reportsDir, {
		naturalKeyLabel: 'Donation ID',
		studioAction: (r) =>
			`Open The Archive → Donations, find Donation ID ${r.clipId} (${r.title}). Under Donation Categories, assign materials for issue: ${r.unmappedKeywords.join('; ')}. Options: Photographic prints, Digital photographs, Newspaper clipping, Postcards, Slides, Drawings, Posters. See needs-manual-links.md for per-row guidance.`,
	})
	console.log(`\nReports written to ${reportsDir}`)
	audit.print(reportsDir)
}
