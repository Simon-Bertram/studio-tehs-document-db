/**
 * Classify document <img> filenames against the photo catalog.
 * Stems come from image-identifiers.csv; full IDs and path basenames from images.csv.
 */
import path from 'node:path'

import {cleanString, slugify} from './clean'
import {readCsvRows} from './read-csv'

export const IMAGE_IDENTIFIERS_CSV = 'migrations/data/image-identifiers.csv'
export const IMAGES_CSV = 'migrations/data/images.csv'

export const DOCUMENT_IMAGE_IMPORT_ID_PREFIX = 'historicalImage.import.'

export interface DocumentImageCatalog {
	/** Stem prefixes sorted longest-first (BEP before BE). */
	stems: string[]
	/** Lowercased catalog identifier → canonical archiveId casing from CSV. */
	identifiers: Map<string, string>
	/** Lowercased basename of imageLocation → catalog archiveId. */
	filenames: Map<string, string>
}

export type ClassifiedDocumentImage =
	| {kind: 'catalog'; archiveId: string; filename: string; src: string}
	| {kind: 'new'; filename: string; importId: string; src: string}
	| {kind: 'skip'; reason: string; src: string}

function basenameFromPath(value: string): string {
	const cleaned = value.replace(/\\/g, '/').split('?')[0]?.split('#')[0] ?? value
	const parts = cleaned.split('/')
	return parts[parts.length - 1] || cleaned
}

function filenameWithoutExtension(filename: string): string {
	const base = basenameFromPath(filename)
	const dot = base.lastIndexOf('.')
	return dot > 0 ? base.slice(0, dot) : base
}

/**
 * Deterministic Sanity _id for an imported document image with no Archive ID.
 * Never written into the archiveId field.
 */
export function importIdForFilename(filename: string): string {
	const stem = slugify(filenameWithoutExtension(filename)) || 'untitled'
	return `${DOCUMENT_IMAGE_IMPORT_ID_PREFIX}${stem}`
}

/**
 * Load stem prefixes and catalog identifiers once per import run.
 */
export async function loadDocumentImageCatalog(options?: {
	identifiersCsv?: string
	imagesCsv?: string
}): Promise<DocumentImageCatalog> {
	const identifiersCsv = path.resolve(options?.identifiersCsv ?? IMAGE_IDENTIFIERS_CSV)
	const imagesCsv = path.resolve(options?.imagesCsv ?? IMAGES_CSV)

	const stemRows = await readCsvRows<{iidentifier?: string}>(identifiersCsv, Infinity)
	const stems = stemRows
		.map((row) => cleanString(row.iidentifier)?.toUpperCase())
		.filter((stem): stem is string => Boolean(stem))
		.sort((a, b) => b.length - a.length || a.localeCompare(b))

	const uniqueStems = [...new Set(stems)]

	const identifiers = new Map<string, string>()
	const filenames = new Map<string, string>()

	const imageRows = await readCsvRows<{
		identifier?: string
		imageLocation?: string
	}>(imagesCsv, Infinity)

	for (const row of imageRows) {
		const archiveId = cleanString(row.identifier)
		if (!archiveId) continue
		identifiers.set(archiveId.toLowerCase(), archiveId)

		const imageLocation = cleanString(row.imageLocation)
		if (!imageLocation) continue
		const filename = basenameFromPath(imageLocation).toLowerCase()
		if (filename && !filenames.has(filename)) {
			filenames.set(filename, archiveId)
		}
	}

	return {stems: uniqueStems, identifiers, filenames}
}

/**
 * Extract a catalog archive ID from a filename using stem + digits
 * (e.g. BKH1-BakeHousesmall.jpg → BKH1). Longest stem wins.
 */
export function extractCatalogIdFromFilename(
	filename: string,
	stems: string[],
): string | null {
	const stem = filenameWithoutExtension(basenameFromPath(filename))
	const upper = stem.toUpperCase()
	for (const prefix of stems) {
		if (!upper.startsWith(prefix)) continue
		const rest = upper.slice(prefix.length)
		const digits = rest.match(/^(\d+)/)
		if (!digits) continue
		return `${prefix}${digits[1]}`
	}
	return null
}

/**
 * Classify an <img> src as a catalog link or a new identifier-less import.
 */
export function classifyDocumentImageSrc(
	src: string,
	catalog: DocumentImageCatalog,
): ClassifiedDocumentImage {
	const trimmed = src.trim()
	if (!trimmed) return {kind: 'skip', reason: 'empty_src', src}

	const filename = basenameFromPath(trimmed)
	if (!filename) return {kind: 'skip', reason: 'empty_filename', src: trimmed}

	const byFilename = catalog.filenames.get(filename.toLowerCase())
	if (byFilename) {
		return {kind: 'catalog', archiveId: byFilename, filename, src: trimmed}
	}

	const extracted = extractCatalogIdFromFilename(filename, catalog.stems)
	if (extracted) {
		const archiveId = catalog.identifiers.get(extracted.toLowerCase())
		if (archiveId) {
			return {kind: 'catalog', archiveId, filename, src: trimmed}
		}
	}

	return {
		kind: 'new',
		filename,
		importId: importIdForFilename(filename),
		src: trimmed,
	}
}

/**
 * Build an absolute URL for a document content image src.
 */
export function resolveDocumentImageUrl(src: string, baseUrl: string): string {
	const base = baseUrl.endsWith('/') || baseUrl.includes('?') ? baseUrl : `${baseUrl}/`
	return new URL(src, base).href
}

export function getDocumentImageBaseUrl(): string | null {
	return cleanString(process.env.DOCUMENT_IMAGE_BASE_URL)
}

export function basenameFromImageSrc(src: string): string {
	return basenameFromPath(src)
}
