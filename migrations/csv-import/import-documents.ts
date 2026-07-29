import fs from 'node:fs'
import path from 'node:path'
import {createClient} from '@sanity/client'
import csvParser from 'csv-parser'
import pLimit from 'p-limit'
import {Audit} from './lib/audit'
import type {CsvRow} from './lib/map-row'
import {mapRow} from './lib/map-row'
import {buildTaxonomyLookups} from './lib/taxonomy'

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const DRY_RUN = !args.includes('--live')
const ROW_LIMIT = (() => {
	const idx = args.indexOf('--limit')
	if (idx !== -1 && args[idx + 1]) return Number(args[idx + 1])
	return Infinity
})()

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const CSV_PATH = path.resolve(
	args.find((a) => a.endsWith('.csv')) ?? 'migrations/data/documents.csv',
)
const REPORTS_DIR = path.resolve('migrations/csv-import/reports')
const PROJECT_ID = 'z8o776vu'
const DATASET = process.env.SANITY_DATASET ?? 'production'

const token = process.env.SANITY_AUTH_TOKEN
if (!DRY_RUN && !token) {
	console.error('SANITY_AUTH_TOKEN is required for live writes. Aborting.')
	process.exit(1)
}

const sanityClient = createClient({
	projectId: PROJECT_ID,
	dataset: DATASET,
	apiVersion: '2025-01-01',
	token,
	useCdn: false,
})

// Concurrency: max 5 parallel writes to stay within rate limits
const limit = pLimit(5)

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
	const mode = DRY_RUN ? 'DRY RUN' : 'LIVE'
	console.log(`--- CSV Import (${mode}) ---`)
	console.log(`Source: ${CSV_PATH}`)
	if (ROW_LIMIT < Infinity) console.log(`Row limit: ${ROW_LIMIT}`)
	console.log()

	if (!fs.existsSync(CSV_PATH)) {
		console.error(`CSV file not found: ${CSV_PATH}`)
		process.exit(1)
	}

	const lookups = DRY_RUN && !token
		? {categories: {}, townships: {}}
		: await buildTaxonomyLookups(sanityClient)

	const audit = new Audit()
	const rows: CsvRow[] = []

	await new Promise<void>((resolve, reject) => {
		fs.createReadStream(CSV_PATH)
			.pipe(csvParser())
			.on('data', (row: CsvRow) => {
				if (rows.length < ROW_LIMIT) rows.push(row)
			})
			.on('end', resolve)
			.on('error', reject)
	})

	audit.totalRows = rows.length
	console.log(`Parsed ${rows.length} rows from CSV.\n`)

	const docs: Record<string, unknown>[] = []

	const tasks = rows.map((row) =>
		limit(async () => {
			const doc = mapRow(row, lookups, audit)
			if (!doc) return

			if (DRY_RUN) {
				docs.push(doc)
				console.log(`[DRY RUN] ${doc._type} → Archive ID: ${doc.archiveId}`)
			} else {
				try {
					// createOrReplace: idempotent during testing.
					// Switch to createIfNotExists after archivists begin editing.
					await sanityClient.createOrReplace(doc as Parameters<typeof sanityClient.createOrReplace>[0])
					console.log(`[OK] ${doc._type} → Archive ID: ${doc.archiveId}`)
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err)
					audit.fail(`clipID ${doc.archiveId}: API error — ${msg}`)
				}
			}
		}),
	)

	await Promise.all(tasks)

	// Write preview file in dry-run mode
	if (DRY_RUN && docs.length > 0) {
		fs.mkdirSync(REPORTS_DIR, {recursive: true})
		const previewPath = path.join(REPORTS_DIR, 'preview.ndjson')
		fs.writeFileSync(previewPath, docs.map((d) => JSON.stringify(d)).join('\n'))
		console.log(`\nPreview written to ${previewPath}`)
	}

	audit.print()
}

run().catch((err) => {
	console.error('Migration failed:', err)
	process.exit(1)
})
