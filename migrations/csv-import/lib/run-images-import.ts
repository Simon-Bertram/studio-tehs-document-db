/**
 * Historical images CSV import pipeline (sample-images.csv).
 */
import fs from 'node:fs'
import path from 'node:path'
import type {SanityClient} from '@sanity/client'
import pLimit from 'p-limit'
import {SANITY_DATASET, SANITY_PROJECT_ID} from '../../../lib/sanityEnv'
import {Audit} from './audit'
import type {ImportConfig} from './cli-config'
import {buildImageLookups} from './image-lookups'
import type {HistoricalImageImportDoc, ImageCsvRow} from './map-image-row'
import {mapImageRow} from './map-image-row'
import {readCsvRows} from './read-csv'
import {hasAuthToken} from './sanity-client'
import {upsertByQuery} from './upsert-by-query'
import {writeReports} from './write-reports'

const CONCURRENCY = 3

async function uploadJpegIfNeeded(
	client: SanityClient,
	archiveId: string,
	psImagesRaw: string | null,
	existingHasImage: boolean,
	assetErrors: string[],
): Promise<HistoricalImageImportDoc['imageFile'] | undefined> {
	if (!psImagesRaw) {
		assetErrors.push(`${archiveId}: no embedded JPEG in psImages`)
		return undefined
	}
	if (existingHasImage) {
		return undefined
	}

	try {
		const buffer = Buffer.from(psImagesRaw, 'latin1')
		const asset = await client.assets.upload('image', buffer, {
			filename: `${archiveId}.jpg`,
			contentType: 'image/jpeg',
		})
		return {
			_type: 'image',
			asset: {_type: 'reference', _ref: asset._id},
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		assetErrors.push(`${archiveId}: asset upload failed — ${msg}`)
		return undefined
	}
}

export async function runImagesImport(
	config: ImportConfig,
	client: SanityClient,
): Promise<void> {
	const {dryRun, rowLimit, csvPath, reportsDir} = config
	const mode = dryRun ? 'DRY RUN' : 'LIVE'

	console.log(`--- Historical Images CSV Import (${mode}) ---`)
	console.log(`Source: ${csvPath}`)
	console.log(`Project: ${SANITY_PROJECT_ID} / ${SANITY_DATASET}`)
	if (rowLimit < Infinity) console.log(`Row limit: ${rowLimit}`)
	console.log()

	const lookups =
		dryRun && !hasAuthToken()
			? {townships: {}, categories: {}, donations: {}}
			: await buildImageLookups(client)

	const audit = new Audit()
	const assetErrors: string[] = []
	// latin1 preserves embedded JPEG bytes in psImages
	const rows = await readCsvRows<ImageCsvRow>(csvPath, rowLimit, {
		encoding: 'latin1',
	})
	audit.totalRows = rows.length
	console.log(`Parsed ${rows.length} image rows.\n`)

	const limit = pLimit(CONCURRENCY)
	const docs: HistoricalImageImportDoc[] = []

	const tasks = rows.map((row) =>
		limit(async () => {
			const mapped = mapImageRow(row, lookups, audit)
			if (!mapped) return

			const {doc, csvType, title, mappedKeywords, unmappedKeywords, psImagesRaw} =
				mapped

			if (dryRun) {
				docs.push(doc)
				audit.recordImported({
					clipId: doc.archiveId,
					title,
					csvType,
					schemaType: 'historicalImage',
					action: 'dry_run',
					mappedKeywords,
					unmappedKeywords,
				})
				const assetNote = psImagesRaw
					? `JPEG ${Buffer.byteLength(psImagesRaw, 'latin1')} bytes`
					: 'no JPEG'
				console.log(
					`[DRY RUN] historicalImage → ${doc.archiveId} (${assetNote})`,
				)
				return
			}

			try {
				const existing = await client.fetch<{
					_id: string
					imageFile?: unknown
				} | null>(
					`*[_type == "historicalImage" && archiveId == $archiveId && !(_id in path("drafts.**"))][0]{ _id, imageFile }`,
					{archiveId: doc.archiveId},
				)

				const imageFile = await uploadJpegIfNeeded(
					client,
					doc.archiveId,
					psImagesRaw,
					Boolean(existing?.imageFile),
					assetErrors,
				)
				if (imageFile) doc.imageFile = imageFile

				const result = await upsertByQuery(
					client,
					doc as unknown as {[key: string]: unknown; _type: string},
					`_type == "historicalImage" && archiveId == $archiveId`,
					{archiveId: doc.archiveId},
				)

				audit.recordImported({
					clipId: doc.archiveId,
					title,
					csvType,
					schemaType: 'historicalImage',
					action: result.action,
					sanityId: result.id,
					mappedKeywords,
					unmappedKeywords,
				})
				console.log(
					`[OK] ${result.action} historicalImage → ${doc.archiveId} (${result.id})`,
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

	fs.mkdirSync(reportsDir, {recursive: true})
	if (dryRun && docs.length > 0) {
		const previewPath = path.join(reportsDir, 'preview.ndjson')
		fs.writeFileSync(previewPath, docs.map((d) => JSON.stringify(d)).join('\n'))
		console.log(`\nPreview written to ${previewPath}`)
	}

	if (assetErrors.length > 0) {
		const assetPath = path.join(reportsDir, 'asset-errors.csv')
		const lines = [
			'archiveId,detail',
			...assetErrors.map((e) => {
				const [id, ...rest] = e.split(': ')
				const detail = rest.join(': ').replace(/"/g, '""')
				return `${id},"${detail}"`
			}),
		]
		fs.writeFileSync(assetPath, `${lines.join('\n')}\n`)
		console.log(`Asset errors written to ${assetPath} (${assetErrors.length})`)
	}

	writeReports(audit, reportsDir)
	console.log(`\nReports written to ${reportsDir}`)
	audit.print(reportsDir)
}
