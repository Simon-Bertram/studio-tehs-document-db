/**
 * Historical images CSV import pipeline (sample-images.csv).
 * Uploads assets from public HTTP URLs built from imageLocation.
 */
import fs from 'node:fs'
import path from 'node:path'

import type {SanityClient} from '@sanity/client'
import pLimit from 'p-limit'

import {SANITY_DATASET, SANITY_PROJECT_ID} from '../../../lib/sanityEnv'
import {Audit} from './audit'
import {batchReportsDir, type ImportConfig} from './cli-config'
import {resolveDuplicateArchiveIds} from './duplicate-archive-ids'
import {
	type AssetErrorRow,
	contentTypeFromImagePath,
	fetchImageBuffer,
	filenameFromImagePath,
	ImageFetchError,
	probeImageUrl,
} from './image-asset-url'
import {buildImageLookups} from './image-lookups'
import {
	IMAGE_LEDGER_DIR,
	type LedgerRow,
	loadImageManualLedger,
	locationAndPeopleFromRow,
	mergeImageManualLedger,
	writeImageManualLedger,
} from './image-manual-ledger'
import {collectPreflightIssues} from './image-preflight'
import type {HistoricalImageImportDoc, ImageCsvRow} from './map-image-row'
import {mapImageRow} from './map-image-row'
import {readCsvRows} from './read-csv'
import {hasAuthToken} from './sanity-client'
import {upsertByQuery} from './upsert-by-query'
import {writeImageExtraReports} from './write-image-reports'
import {writeReports} from './write-reports'

const CONCURRENCY = 3

export interface ImagesImportResult {
	ok: boolean
	assetErrorCount: number
}

function assetErrorFromUnknown(archiveId: string, url: string, err: unknown): AssetErrorRow {
	if (err instanceof ImageFetchError) {
		return {
			archiveId,
			url: err.url,
			httpStatus: err.httpStatus != null ? String(err.httpStatus) : '',
			detail: err.message,
		}
	}
	return {
		archiveId,
		url,
		httpStatus: '',
		detail: err instanceof Error ? err.message : String(err),
	}
}

async function uploadFromUrlIfNeeded(
	client: SanityClient,
	archiveId: string,
	imageLocation: string,
	assetUrl: string,
	existingHasImage: boolean,
	assetErrors: AssetErrorRow[],
): Promise<HistoricalImageImportDoc['imageFile'] | undefined> {
	if (existingHasImage) return undefined

	try {
		const {buffer, contentType} = await fetchImageBuffer(assetUrl)
		const asset = await client.assets.upload('image', buffer, {
			filename: filenameFromImagePath(imageLocation),
			contentType: contentType || contentTypeFromImagePath(imageLocation),
		})
		return {
			_type: 'image',
			asset: {_type: 'reference', _ref: asset._id},
		}
	} catch (err) {
		assetErrors.push(assetErrorFromUnknown(archiveId, assetUrl, err))
		return undefined
	}
}

export async function runImagesImport(
	config: ImportConfig,
	client: SanityClient,
): Promise<ImagesImportResult> {
	const {dryRun, rowLimit, rowOffset, csvPath, reportsDir: reportsBase} = config
	const reportsDir = batchReportsDir(reportsBase, rowOffset, rowLimit)
	const mode = dryRun ? 'DRY RUN' : 'LIVE'

	console.log(`--- Historical Images CSV Import (${mode}) ---`)
	console.log(`Source: ${csvPath}`)
	console.log(`Project: ${SANITY_PROJECT_ID} / ${SANITY_DATASET}`)
	console.log(`Batch: offset ${rowOffset}, limit ${Number.isFinite(rowLimit) ? rowLimit : 'all'}`)
	console.log(`Reports: ${reportsDir}`)
	console.log()

	const lookups =
		dryRun && !hasAuthToken()
			? {townships: {}, categories: {}, donations: {}}
			: await buildImageLookups(client)

	const audit = new Audit()
	const assetErrors: AssetErrorRow[] = []
	const urlStatus: AssetErrorRow[] = []
	const locationRows: (LedgerRow & {photoLocation: string})[] = []
	const peopleRows: LedgerRow[] = []
	const allRows = await readCsvRows<ImageCsvRow>(csvPath, Infinity)
	const resolutionsAll = resolveDuplicateArchiveIds(allRows)
	const sliceEnd = Number.isFinite(rowLimit) ? rowOffset + rowLimit : allRows.length
	const rows = allRows.slice(rowOffset, sliceEnd)
	const resolutions = resolutionsAll.slice(rowOffset, sliceEnd)
	audit.totalRows = rows.length
	console.log(
		`Parsed ${allRows.length} image rows; this batch uses ${rows.length} (indexes ${rowOffset}–${Math.max(rowOffset, sliceEnd - 1)}).\n`,
	)

	const preflight = collectPreflightIssues(rows)
	const limit = pLimit(CONCURRENCY)
	const docs: HistoricalImageImportDoc[] = []

	const tasks = rows.map((row, index) =>
		limit(async () => {
			const resolution = resolutions[index]
			if (resolution.skip) {
				audit.skip({
					clipId: resolution.archiveId,
					title: row.title,
					csvType: row.type,
					reason: 'duplicate_identifier',
					detail: resolution.detail ?? 'Duplicate identifier with the same imageLocation.',
				})
				return
			}

			const mapped = mapImageRow(row, lookups, audit, {
				archiveId: resolution.archiveId || undefined,
			})
			if (!mapped) return

			const {doc, csvType, title, mappedKeywords, unmappedKeywords, assetUrl} = mapped

			if (!mapped.imageLocation || !assetUrl) {
				audit.skip({
					clipId: doc.archiveId,
					title,
					csvType,
					reason: 'missing_image_location',
					detail: 'Row has no imageLocation; fileLocation is not used as a URL.',
				})
				return
			}

			if (resolution.detail) audit.warn(resolution.detail)

			if (dryRun) {
				const probe = await probeImageUrl(assetUrl)
				urlStatus.push({
					archiveId: doc.archiveId,
					url: assetUrl,
					httpStatus: String(probe.httpStatus),
					detail: probe.detail ?? '',
				})
				if (probe.httpStatus >= 400 || probe.httpStatus === 0) {
					assetErrors.push({
						archiveId: doc.archiveId,
						url: assetUrl,
						httpStatus: String(probe.httpStatus),
						detail: probe.detail ?? `HTTP ${probe.httpStatus}`,
					})
				}
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
				console.log(`[DRY RUN] historicalImage → ${doc.archiveId} (${assetUrl})`)
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

				const existingHasImage = Boolean(existing?.imageFile)
				const imageFile = await uploadFromUrlIfNeeded(
					client,
					doc.archiveId,
					mapped.imageLocation,
					assetUrl,
					existingHasImage,
					assetErrors,
				)
				if (imageFile) doc.imageFile = imageFile

				if (!existingHasImage && !doc.imageFile) {
					audit.skip({
						clipId: doc.archiveId,
						title,
						csvType,
						reason: 'asset_error',
						detail: 'HTTP fetch/upload failed; document not upserted (imageFile is required).',
					})
					return
				}

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
				const extras = locationAndPeopleFromRow(row, doc.archiveId, title)
				if (extras.location) locationRows.push(extras.location)
				if (extras.person) peopleRows.push(extras.person)
				console.log(`[OK] ${result.action} historicalImage → ${doc.archiveId} (${result.id})`)
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

	writeImageExtraReports(reportsDir, {assetErrors, urlStatus, preflight})
	if (assetErrors.length > 0) {
		console.log(
			`Asset errors written to ${path.join(reportsDir, 'asset-errors.csv')} (${assetErrors.length})`,
		)
	}
	if (urlStatus.length > 0) {
		console.log(
			`URL status written to ${path.join(reportsDir, 'url-status.csv')} (${urlStatus.length})`,
		)
	}
	if (preflight.length > 0) {
		console.log(
			`Preflight written to ${path.join(reportsDir, 'preflight.csv')} (${preflight.length})`,
		)
	}

	writeReports(audit, reportsDir)
	console.log(`\nReports written to ${reportsDir}`)

	if (!dryRun) {
		const ledgerDir = path.resolve(IMAGE_LEDGER_DIR)
		const merged = mergeImageManualLedger(loadImageManualLedger(ledgerDir), {
			imported: audit.imported,
			locationRows,
			peopleRows,
		})
		writeImageManualLedger(ledgerDir, merged)
		console.log(`Cumulative ledger written to ${ledgerDir}`)
	}

	audit.print(reportsDir)

	const ok = dryRun || assetErrors.length === 0
	if (!ok) {
		console.error(`Live import had ${assetErrors.length} asset error(s).`)
	}

	return {ok, assetErrorCount: assetErrors.length}
}
