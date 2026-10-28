/**
 * Import transformed NDJSON into Sanity with createOrReplace.
 * Default dry-run. Use --live to write. Uploads historical image assets first.
 */
import fs from 'node:fs'

import type {SanityClient} from '@sanity/client'
import pLimit from 'p-limit'

import {
	assertContentWriteAccess,
	createImportClient,
	hasAuthToken,
} from '../../csv-import/lib/sanity-client'
import {
	contentTypeFromImagePath,
	filenameFromImagePath,
	ImageFetchError,
	IMAGE_FETCH_HEADERS,
} from '../../csv-import/lib/image-asset-url'
import {
	ARTICLES_NDJSON_PATH,
	IMAGES_NDJSON_PATH,
	PEOPLE_NDJSON_PATH,
	PROPERTIES_NDJSON_PATH,
} from './paths'

export interface ImportOptions {
	dryRun: boolean
	limit?: number
}

function readNdjson(filePath: string): Record<string, unknown>[] {
	if (!fs.existsSync(filePath)) return []
	const text = fs.readFileSync(filePath, 'utf8').trim()
	if (!text) return []
	return text.split('\n').map((line) => JSON.parse(line) as Record<string, unknown>)
}

async function uploadFromUrl(
	client: SanityClient,
	url: string,
	filename: string,
): Promise<{_type: 'image'; asset: {_type: 'reference'; _ref: string}}> {
	const res = await fetch(url, {headers: IMAGE_FETCH_HEADERS})
	if (!res.ok) {
		throw new ImageFetchError(url, res.status, `HTTP ${res.status} fetching ${url}`)
	}
	const buffer = Buffer.from(await res.arrayBuffer())
	const contentType =
		res.headers.get('content-type') || contentTypeFromImagePath(filename) || 'image/jpeg'
	const asset = await client.assets.upload('image', buffer, {
		filename: filenameFromImagePath(filename),
		contentType,
	})
	return {
		_type: 'image',
		asset: {_type: 'reference', _ref: asset._id},
	}
}

async function importImages(
	client: SanityClient,
	docs: Record<string, unknown>[],
	dryRun: boolean,
): Promise<void> {
	const limit = pLimit(3)
	await Promise.all(
		docs.map((doc) =>
			limit(async () => {
				const imageFile = doc.imageFile as
					| {
							_pendingUploadUrl?: string
							_pendingFilename?: string
							asset?: unknown
					  }
					| undefined
				const uploadUrl = imageFile?._pendingUploadUrl
				const filename = imageFile?._pendingFilename || 'image.jpg'

				if (dryRun) {
					console.log(
						`[DRY RUN] historicalImage ${doc._id} archiveId=${doc.archiveId} from ${uploadUrl}`,
					)
					return
				}

				if (!uploadUrl) {
					console.warn(`Skip image ${doc._id}: missing upload URL`)
					return
				}

				try {
					const uploaded = await uploadFromUrl(client, uploadUrl, filename)
					const clean: Record<string, unknown> = {
						...doc,
						imageFile: {
							...uploaded,
							alt:
								typeof doc.title === 'string'
									? doc.title
									: filenameFromImagePath(filename),
						},
					}
					delete (clean.imageFile as Record<string, unknown>)._pendingUploadUrl
					delete (clean.imageFile as Record<string, unknown>)._pendingFilename
					await client.createOrReplace(clean as {_id: string; _type: string})
					console.log(`Upserted historicalImage ${doc.archiveId}`)
				} catch (err) {
					const detail = err instanceof Error ? err.message : String(err)
					console.error(`Failed image ${doc._id}: ${detail}`)
				}
			}),
		),
	)
}

async function importDocs(
	client: SanityClient,
	docs: Record<string, unknown>[],
	dryRun: boolean,
	label: string,
): Promise<void> {
	for (const doc of docs) {
		if (dryRun) {
			console.log(`[DRY RUN] ${label} ${doc._id}`)
			continue
		}
		await client.createOrReplace(doc as {_id: string; _type: string})
		console.log(`Upserted ${label} ${doc._id}`)
	}
}

export async function runImport(options: ImportOptions): Promise<void> {
	const dryRun = options.dryRun
	if (!dryRun && !hasAuthToken()) {
		console.error('SANITY_API_WRITE_TOKEN required for --live')
		process.exit(1)
	}

	const client = createImportClient({dryRun})
	if (!dryRun) {
		await assertContentWriteAccess(client)
	}

	let people = readNdjson(PEOPLE_NDJSON_PATH)
	let properties = readNdjson(PROPERTIES_NDJSON_PATH)
	let images = readNdjson(IMAGES_NDJSON_PATH)
	let articles = readNdjson(ARTICLES_NDJSON_PATH)

	if (options.limit != null) {
		people = people.slice(0, options.limit)
		properties = properties.slice(0, options.limit)
		images = images.slice(0, options.limit)
		articles = articles.slice(0, options.limit)
	}

	console.log(
		`${dryRun ? 'DRY RUN' : 'LIVE'}: people=${people.length} properties=${properties.length} ` +
			`images=${images.length} articles=${articles.length}`,
	)

	await importDocs(client, people, dryRun, 'person')
	await importDocs(client, properties, dryRun, 'property')
	await importImages(client, images, dryRun)
	await importDocs(client, articles, dryRun, 'researchArticle')
}

export function parseImportArgs(argv: string[]): ImportOptions {
	const dryRun = !argv.includes('--live')
	const limitIdx = argv.indexOf('--limit')
	const limit =
		limitIdx >= 0 && argv[limitIdx + 1]
			? Number.parseInt(argv[limitIdx + 1], 10)
			: undefined
	return {
		dryRun,
		limit: Number.isFinite(limit) ? limit : undefined,
	}
}
