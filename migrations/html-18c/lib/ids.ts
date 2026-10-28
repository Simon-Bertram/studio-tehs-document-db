/**
 * Deterministic Sanity IDs and Archive IDs for the 18c HTML migration.
 */
import {createHash} from 'node:crypto'

import {slugify} from '../../csv-import/lib/clean'

/** Research article Archive ID prefix — must not collide with CSV clipIDs. */
export const ARTICLE_ARCHIVE_PREFIX = 'WEB18C'

/** Historical image Archive ID prefix for newly created page images. */
export const IMAGE_ARCHIVE_PREFIX = 'WEB18CIMG'

export function slugFromUrl(pageUrl: string): string {
	const url = new URL(pageUrl)
	let path = url.pathname
	if (path.toLowerCase().endsWith('.html') || path.toLowerCase().endsWith('.htm')) {
		path = path.replace(/\.(html?|HTML?)$/, '')
	}
	path = path.replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '')
	const slug = slugify(path.replace(/\//g, '-')) || 'untitled'
	return slug.slice(0, 180)
}

export function researchArticleId(pageUrl: string): string {
	return `researchArticle-18c-${slugFromUrl(pageUrl)}`
}

export function historicalImageId(absoluteImageUrl: string): string {
	const hash = createHash('sha1').update(absoluteImageUrl).digest('hex').slice(0, 12)
	const url = new URL(absoluteImageUrl)
	const base = url.pathname.split('/').pop() ?? 'image'
	const stem = slugify(base.replace(/\.[^.]+$/, '')) || 'image'
	return `historicalImage-18c-${stem}-${hash}`
}

export function personImportId(parts: {
	prefix?: string
	firstName: string
	lastName: string
	suffix?: string
}): string {
	const key = [parts.prefix, parts.firstName, parts.lastName, parts.suffix]
		.map((p) => slugify(p || '') || '')
		.join('-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
	return `person-18c-${key || 'unknown'}`
}

export function propertyImportId(historicalName: string): string {
	return `property-18c-${slugify(historicalName) || 'unnamed'}`
}

export function formatArticleArchiveId(index: number): string {
	return `${ARTICLE_ARCHIVE_PREFIX}-${String(index).padStart(3, '0')}`
}

export function formatImageArchiveId(index: number): string {
	return `${IMAGE_ARCHIVE_PREFIX}-${String(index).padStart(4, '0')}`
}

export function articleSlugPath(pageUrl: string): string {
	return `/research/${slugFromUrl(pageUrl)}`
}
