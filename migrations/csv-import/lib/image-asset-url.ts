import {cleanString} from './clean'

export const IMAGE_BASE_URL = 'https://www.the2nomads.site/TEHSImageDatabase/'

/** DreamHost varies responses by User-Agent; send a browser UA for fetches. */
export const IMAGE_FETCH_HEADERS: Record<string, string> = {
	'User-Agent':
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
	Referer: IMAGE_BASE_URL,
}

const CONTENT_TYPES: Record<string, string> = {
	gif: 'image/gif',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	png: 'image/png',
	tif: 'image/tiff',
	tiff: 'image/tiff',
	webp: 'image/webp',
}

const RETRY_STATUSES = new Set([403, 408, 425, 429, 500, 502, 503, 504])
const MAX_RETRIES = 3

export class ImageFetchError extends Error {
	readonly url: string
	readonly httpStatus: number | undefined

	constructor(url: string, httpStatus: number | undefined, message: string) {
		super(message)
		this.name = 'ImageFetchError'
		this.url = url
		this.httpStatus = httpStatus
	}
}

export interface AssetErrorRow {
	archiveId: string
	url: string
	httpStatus: string
	detail: string
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function cancelBody(res: Response): Promise<void> {
	try {
		await res.body?.cancel()
	} catch {
		// ignore
	}
}

/**
 * Public web path only. Never use fileLocation / archiveLocation — those are
 * archive-folder notes, not URLs.
 */
export function relativeImagePath(row: {imageLocation?: string}): string | null {
	return cleanString(row.imageLocation)
}

/**
 * Join the public TEHS Image Database base URL with a relative file path.
 * Encodes each path segment so commas in filenames stay valid URLs.
 */
export function buildImageAssetUrl(relativePath: string): string {
	const trimmed = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
	const encoded = trimmed
		.split('/')
		.filter(Boolean)
		.map((segment) => encodeURIComponent(segment))
		.join('/')
	return `${IMAGE_BASE_URL}${encoded}`
}

export function filenameFromImagePath(relativePath: string): string {
	const base = relativePath.replace(/\\/g, '/').split('/').pop()
	return base && base.length > 0 ? base : 'image.jpg'
}

export function contentTypeFromImagePath(relativePath: string): string {
	const ext = relativePath.toLowerCase().split('.').pop() ?? ''
	return CONTENT_TYPES[ext] ?? 'image/jpeg'
}

export async function probeImageUrl(assetUrl: string): Promise<{
	httpStatus: number
	detail?: string
}> {
	try {
		const head = await fetch(assetUrl, {
			method: 'HEAD',
			headers: IMAGE_FETCH_HEADERS,
		})
		await cancelBody(head)
		if (head.ok || head.status === 404) {
			return {httpStatus: head.status}
		}

		const get = await fetch(assetUrl, {
			method: 'GET',
			headers: IMAGE_FETCH_HEADERS,
		})
		const status = get.status
		await cancelBody(get)
		return {
			httpStatus: status,
			detail: head.status !== status ? `HEAD ${head.status}; GET ${status}` : undefined,
		}
	} catch (err) {
		return {
			httpStatus: 0,
			detail: err instanceof Error ? err.message : String(err),
		}
	}
}

export async function fetchImageBuffer(assetUrl: string): Promise<{
	buffer: Buffer
	contentType: string
}> {
	let lastStatus: number | undefined
	let lastMessage = `Failed fetching ${assetUrl}`

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		if (attempt > 0) await sleep(500 * 2 ** (attempt - 1))

		try {
			const res = await fetch(assetUrl, {headers: IMAGE_FETCH_HEADERS})
			lastStatus = res.status
			if (res.ok) {
				const buffer = Buffer.from(await res.arrayBuffer())
				const headerType = res.headers.get('content-type')?.split(';')[0]?.trim()
				return {
					buffer,
					contentType: headerType || 'image/jpeg',
				}
			}

			lastMessage = `HTTP ${res.status} fetching ${assetUrl}`
			await cancelBody(res)
			if (!RETRY_STATUSES.has(res.status)) break
		} catch (err) {
			if (err instanceof ImageFetchError) throw err
			lastMessage = err instanceof Error ? err.message : String(err)
		}
	}

	throw new ImageFetchError(assetUrl, lastStatus, lastMessage)
}
