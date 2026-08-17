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

/**
 * Prefer imageLocation, then fileLocation. Both exist on the legacy export.
 */
export function relativeImagePath(row: {
	imageLocation?: string
	fileLocation?: string
}): string | null {
	return cleanString(row.imageLocation) ?? cleanString(row.fileLocation)
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

export async function fetchImageBuffer(assetUrl: string): Promise<{
	buffer: Buffer
	contentType: string
}> {
	const res = await fetch(assetUrl, {headers: IMAGE_FETCH_HEADERS})
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} fetching ${assetUrl}`)
	}
	const buffer = Buffer.from(await res.arrayBuffer())
	const headerType = res.headers.get('content-type')?.split(';')[0]?.trim()
	return {
		buffer,
		contentType: headerType || 'image/jpeg',
	}
}
