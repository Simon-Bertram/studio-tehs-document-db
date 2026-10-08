/**
 * Resolve document <img> embeds to historicalImage document _ids.
 * Catalog matches look up by archiveId; new scans upload with no archiveId.
 */
import type {SanityClient} from '@sanity/client'

import type {Audit} from './audit'
import type {HistoricalImageEmbedPending} from './content-to-portable-text'
import type {ContentBlock} from './content-to-portable-text'
import {
	getDocumentImageBaseUrl,
	resolveDocumentImageUrl,
} from './document-image-catalog'
import {
	contentTypeFromImagePath,
	fetchImageBuffer,
	filenameFromImagePath,
	ImageFetchError,
} from './image-asset-url'

export interface DocumentImageResolution {
	createdWithoutArchiveId: string[]
	linkedCatalogIds: string[]
	missingCatalogIds: string[]
	assetErrors: {filename: string; url: string; detail: string}[]
}

export interface EnsureDocumentImagesOptions {
	client: SanityClient
	dryRun: boolean
	parentClipId: string
	parentTitle: string
	/** In-memory cache: catalog archiveId or importId → Sanity _id */
	idCache: Map<string, string>
	audit: Audit
	resolution: DocumentImageResolution
}

function emptyResolution(): DocumentImageResolution {
	return {
		createdWithoutArchiveId: [],
		linkedCatalogIds: [],
		missingCatalogIds: [],
		assetErrors: [],
	}
}

export function createDocumentImageResolution(): DocumentImageResolution {
	return emptyResolution()
}

async function lookupByArchiveId(
	client: SanityClient,
	archiveId: string,
): Promise<string | null> {
	return client.fetch<string | null>(
		`*[_type == "historicalImage" && archiveId == $archiveId && !(_id in path("drafts.**"))][0]._id`,
		{archiveId},
	)
}

async function uploadImage(
	client: SanityClient,
	assetUrl: string,
	filename: string,
): Promise<{_type: 'image'; asset: {_type: 'reference'; _ref: string}}> {
	const {buffer, contentType} = await fetchImageBuffer(assetUrl)
	const asset = await client.assets.upload('image', buffer, {
		filename: filenameFromImagePath(filename),
		contentType: contentType || contentTypeFromImagePath(filename),
	})
	return {
		_type: 'image',
		asset: {_type: 'reference', _ref: asset._id},
	}
}

async function ensureNewHistoricalImage(
	options: EnsureDocumentImagesOptions,
	embed: HistoricalImageEmbedPending,
): Promise<string | null> {
	const {client, dryRun, parentClipId, parentTitle, idCache, audit, resolution} = options
	const importId = embed._pendingImportId
	if (!importId) return null

	const cached = idCache.get(importId)
	if (cached) return cached

	const baseUrl = getDocumentImageBaseUrl()
	let assetUrl: string | null = null
	try {
		if (!baseUrl) {
			if (!dryRun) {
				throw new Error(
					'DOCUMENT_IMAGE_BASE_URL is required to upload document content images on --live',
				)
			}
		} else {
			assetUrl = resolveDocumentImageUrl(embed._pendingSrc, baseUrl)
		}
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err)
		resolution.assetErrors.push({
			filename: embed._pendingFilename,
			url: embed._pendingSrc,
			detail,
		})
		audit.warn(
			`clipID ${parentClipId}: could not resolve image URL for ${embed._pendingFilename}: ${detail}`,
		)
		return null
	}

	if (dryRun) {
		idCache.set(importId, importId)
		resolution.createdWithoutArchiveId.push(embed._pendingFilename)
		if (assetUrl) {
			console.log(
				`[DRY RUN] would create historicalImage ${importId} from ${assetUrl}`,
			)
		} else {
			console.log(
				`[DRY RUN] would create historicalImage ${importId} (set DOCUMENT_IMAGE_BASE_URL for URL)`,
			)
		}
		return importId
	}

	if (!baseUrl || !assetUrl) {
		throw new Error(
			'DOCUMENT_IMAGE_BASE_URL is required to upload document content images on --live',
		)
	}

	const existing = await client.fetch<{
		_id: string
		imageFile?: unknown
		archiveId?: string
	} | null>(`*[_id == $id][0]{_id, imageFile, archiveId}`, {id: importId})

	if (existing?._id) {
		idCache.set(importId, existing._id)
		if (!existing.imageFile) {
			try {
				const imageFile = await uploadImage(client, assetUrl, embed._pendingFilename)
				await client.patch(existing._id).set({imageFile}).commit()
			} catch (err) {
				const detail =
					err instanceof ImageFetchError
						? err.message
						: err instanceof Error
							? err.message
							: String(err)
				resolution.assetErrors.push({
					filename: embed._pendingFilename,
					url: assetUrl,
					detail,
				})
				audit.warn(
					`clipID ${parentClipId}: image upload failed for existing ${importId}: ${detail}`,
				)
			}
		}
		return existing._id
	}

	let imageFile: {_type: 'image'; asset: {_type: 'reference'; _ref: string}}
	try {
		imageFile = await uploadImage(client, assetUrl, embed._pendingFilename)
	} catch (err) {
		const detail =
			err instanceof ImageFetchError
				? err.message
				: err instanceof Error
					? err.message
					: String(err)
		resolution.assetErrors.push({
			filename: embed._pendingFilename,
			url: assetUrl,
			detail,
		})
		audit.warn(
			`clipID ${parentClipId}: image upload failed for ${embed._pendingFilename}; embed omitted: ${detail}`,
		)
		return null
	}

	const title =
		embed.alt || parentTitle || `Document image ${embed._pendingFilename}`
	const notes = [
		`Imported from document clipID ${parentClipId}.`,
		`Source path: ${embed._pendingSrc}`,
		'Archive ID left empty for editor review.',
	].join('\n')

	await client.createIfNotExists({
		_id: importId,
		_type: 'historicalImage',
		title,
		notes,
		imageFile,
	})

	idCache.set(importId, importId)
	resolution.createdWithoutArchiveId.push(embed._pendingFilename)
	return importId
}

async function resolveEmbed(
	options: EnsureDocumentImagesOptions,
	embed: HistoricalImageEmbedPending,
): Promise<string | null> {
	const {client, dryRun, parentClipId, idCache, audit, resolution} = options

	if (embed._pendingArchiveId) {
		const archiveId = embed._pendingArchiveId
		const cached = idCache.get(`archive:${archiveId}`)
		if (cached) {
			resolution.linkedCatalogIds.push(archiveId)
			return cached
		}

		if (dryRun) {
			idCache.set(`archive:${archiveId}`, `dry-run:${archiveId}`)
			resolution.linkedCatalogIds.push(archiveId)
			return `dry-run:${archiveId}`
		}

		const existingId = await lookupByArchiveId(client, archiveId)
		if (!existingId) {
			resolution.missingCatalogIds.push(archiveId)
			audit.warn(
				`clipID ${parentClipId}: catalog image ${archiveId} not found in Sanity; embed omitted`,
			)
			return null
		}
		idCache.set(`archive:${archiveId}`, existingId)
		resolution.linkedCatalogIds.push(archiveId)
		return existingId
	}

	if (embed._pendingImportId) {
		return ensureNewHistoricalImage(options, embed)
	}

	return null
}

/**
 * Resolve pending historicalImageEmbed blocks in place. Drops embeds that
 * cannot be linked (missing catalog or failed upload).
 */
export async function resolveDocumentImageEmbeds(
	blocks: ContentBlock[],
	options: EnsureDocumentImagesOptions,
): Promise<ContentBlock[]> {
	const resolved: ContentBlock[] = []

	for (const block of blocks) {
		if (block._type !== 'historicalImageEmbed') {
			resolved.push(block)
			continue
		}

		const embed = block as HistoricalImageEmbedPending
		const refId = await resolveEmbed(options, embed)
		if (!refId) continue

		const {
			_pendingArchiveId: _a,
			_pendingImportId: _i,
			_pendingSrc: _s,
			_pendingFilename: _f,
			...rest
		} = embed

		resolved.push({
			...rest,
			historicalImage: {_type: 'reference', _ref: refId},
		})
	}

	return resolved
}
