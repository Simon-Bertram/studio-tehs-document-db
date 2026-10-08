/**
 * Import pipeline orchestration.
 * Wires taxonomy → CSV → map → image embeds → dry-run/live upsert → editor reports.
 * Keeps Sanity/CSV details in sibling modules so this file stays the high-level flow.
 */
import fs from 'node:fs'
import path from 'node:path'

import type {SanityClient} from '@sanity/client'
import pLimit from 'p-limit'

import {SANITY_DATASET, SANITY_PROJECT_ID} from '../../../lib/sanityEnv'
import {Audit} from './audit'
import type {ImportConfig} from './cli-config'
import {
	getDocumentImageBaseUrl,
	loadDocumentImageCatalog,
} from './document-image-catalog'
import {
	createDocumentImageResolution,
	resolveDocumentImageEmbeds,
} from './ensure-document-image'
import {generateDocumentReviewReports} from './generate-document-review-reports'
import type {CsvRow, ImportDoc} from './map-row'
import {mapRow} from './map-row'
import {readCsvRows} from './read-csv'
import {hasAuthToken} from './sanity-client'
import {buildTaxonomyLookups} from './taxonomy'
import {upsertByArchiveId} from './upsert-document'
import {toCsv, writeReports} from './write-reports'

const CONCURRENCY = 5

export async function runImport(config: ImportConfig, client: SanityClient): Promise<void> {
	const {dryRun, rowLimit, csvPath, reportsDir} = config
	const mode = dryRun ? 'DRY RUN' : 'LIVE'

	console.log(`--- CSV Import (${mode}) ---`)
	console.log(`Source: ${csvPath}`)
	console.log(`Project: ${SANITY_PROJECT_ID} / ${SANITY_DATASET}`)
	if (rowLimit < Infinity) console.log(`Row limit: ${rowLimit}`)
	console.log()

	// --- Phase 1: taxonomy + image catalog lookups ---
	const lookups =
		dryRun && !hasAuthToken()
			? {categories: {}, townships: {}, organizations: {}}
			: await buildTaxonomyLookups(client)

	const imageCatalog = await loadDocumentImageCatalog()
	console.log(
		`Loaded image catalog: ${imageCatalog.stems.length} stems, ${imageCatalog.identifiers.size} identifiers.`,
	)
	const documentImageBaseUrl = getDocumentImageBaseUrl()
	if (documentImageBaseUrl) {
		console.log(`Document image base URL: ${documentImageBaseUrl}`)
	} else if (!dryRun) {
		console.log('DOCUMENT_IMAGE_BASE_URL unset — new document images that need upload will fail.')
	} else {
		console.log(
			'DOCUMENT_IMAGE_BASE_URL unset — dry-run will record filenames without resolved URLs.',
		)
	}
	console.log()

	// --- Phase 2: parse CSV ---
	const audit = new Audit()
	const imageResolution = createDocumentImageResolution()
	const imageIdCache = new Map<string, string>()
	const rows = await readCsvRows<CsvRow>(csvPath, rowLimit)
	audit.totalRows = rows.length
	console.log(`Parsed ${rows.length} rows from CSV.\n`)

	// --- Phase 3: map rows (and upsert when live) ---
	const limit = pLimit(CONCURRENCY)
	const docs: ImportDoc[] = []

	const tasks = rows.map((row) =>
		limit(async () => {
			const mapped = mapRow(row, lookups, audit, imageCatalog)
			if (!mapped) return

			const {doc, csvType, title, mappedKeywords, unmappedKeywords} = mapped

			if (doc._type === 'primarySource' && doc.transcription) {
				doc.transcription = await resolveDocumentImageEmbeds(doc.transcription, {
					client,
					dryRun,
					parentClipId: doc.archiveId,
					parentTitle: title,
					idCache: imageIdCache,
					audit,
					resolution: imageResolution,
				})
			} else if (doc._type === 'researchArticle' && doc.body) {
				doc.body = await resolveDocumentImageEmbeds(doc.body, {
					client,
					dryRun,
					parentClipId: doc.archiveId,
					parentTitle: title,
					idCache: imageIdCache,
					audit,
					resolution: imageResolution,
				})
			}

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
	writeDocumentImageReports(imageResolution, reportsDir)

	const htmlReports = await generateDocumentReviewReports({reportsDir})
	console.log(`\nReports written to ${reportsDir}`)
	console.log(`  ${htmlReports.skipped}`)
	console.log(`  ${htmlReports.missingTaxonomies}`)
	console.log(`  ${htmlReports.needsManualLinks}`)
	audit.print(reportsDir)

	if (imageResolution.createdWithoutArchiveId.length > 0) {
		console.log(
			`Document images created without Archive ID: ${imageResolution.createdWithoutArchiveId.length}`,
		)
	}
	if (imageResolution.missingCatalogIds.length > 0) {
		console.log(`Missing catalog images: ${imageResolution.missingCatalogIds.length}`)
	}
	if (imageResolution.assetErrors.length > 0) {
		console.log(`Document image asset errors: ${imageResolution.assetErrors.length}`)
	}
}

function writeDocumentImageReports(
	resolution: ReturnType<typeof createDocumentImageResolution>,
	reportsDir: string,
): void {
	const uniqueCreated = [...new Set(resolution.createdWithoutArchiveId)]
	const uniqueLinked = [...new Set(resolution.linkedCatalogIds)]
	const uniqueMissing = [...new Set(resolution.missingCatalogIds)]

	fs.writeFileSync(
		path.join(reportsDir, 'document-images-created.csv'),
		toCsv(
			['filename'],
			uniqueCreated.map((filename) => [filename]),
		),
	)
	fs.writeFileSync(
		path.join(reportsDir, 'document-images-linked-catalog.csv'),
		toCsv(
			['archiveId'],
			uniqueLinked.map((archiveId) => [archiveId]),
		),
	)
	fs.writeFileSync(
		path.join(reportsDir, 'document-images-missing-catalog.csv'),
		toCsv(
			['archiveId'],
			uniqueMissing.map((archiveId) => [archiveId]),
		),
	)
	fs.writeFileSync(
		path.join(reportsDir, 'document-image-asset-errors.csv'),
		toCsv(
			['filename', 'url', 'detail'],
			resolution.assetErrors.map((row) => [row.filename, row.url, row.detail]),
		),
	)
}
