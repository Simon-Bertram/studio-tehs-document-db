/**
 * Validate transformed NDJSON against the extract manifest.
 */
import fs from 'node:fs'

import {
	ARTICLES_NDJSON_PATH,
	IMAGES_NDJSON_PATH,
	MANIFEST_PATH,
	VALIDATE_REPORT_PATH,
} from './paths'
import type {Manifest} from './run-extract'

function readNdjson(filePath: string): Record<string, unknown>[] {
	if (!fs.existsSync(filePath)) return []
	const text = fs.readFileSync(filePath, 'utf8').trim()
	if (!text) return []
	return text.split('\n').map((line) => JSON.parse(line) as Record<string, unknown>)
}

function countTables(body: unknown): number {
	if (!Array.isArray(body)) return 0
	return body.filter((b) => b && typeof b === 'object' && b._type === 'table').length
}

function countEmbeds(body: unknown): number {
	if (!Array.isArray(body)) return 0
	return body.filter(
		(b) => b && typeof b === 'object' && b._type === 'historicalImageEmbed',
	).length
}

function embedRefs(body: unknown): string[] {
	if (!Array.isArray(body)) return []
	const ids: string[] = []
	for (const b of body) {
		if (!b || typeof b !== 'object' || b._type !== 'historicalImageEmbed') continue
		const ref = b.historicalImage?._ref
		if (typeof ref === 'string') ids.push(ref)
	}
	return ids
}

export function runValidate(): Record<string, unknown> {
	if (!fs.existsSync(MANIFEST_PATH)) {
		throw new Error('Missing manifest. Run extract first.')
	}
	const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest
	const okPages = manifest.pages.filter((p) => p.ok)
	const articles = readNdjson(ARTICLES_NDJSON_PATH)
	const images = readNdjson(IMAGES_NDJSON_PATH)
	const imageIds = new Set(images.map((d) => String(d._id)))

	const issues: string[] = []

	if (articles.length !== okPages.length) {
		issues.push(
			`article count ${articles.length} != ok snapshot pages ${okPages.length}`,
		)
	}

	const archiveIds = new Set<string>()
	for (const article of articles) {
		const aid = String(article.archiveId || '')
		if (!aid) issues.push(`article ${article._id} missing archiveId`)
		else if (archiveIds.has(aid)) issues.push(`duplicate article archiveId ${aid}`)
		else archiveIds.add(aid)

		if (!article.title) issues.push(`article ${article._id} missing title`)
		if (!article.slug || typeof article.slug !== 'object') {
			issues.push(`article ${article._id} missing slug`)
		}

		for (const refId of embedRefs(article.body)) {
			if (!imageIds.has(refId) && !refId.startsWith('dry-run:')) {
				issues.push(`article ${article._id} embed → missing image ${refId}`)
			}
		}
	}

	for (const image of images) {
		const aid = String(image.archiveId || '')
		if (!aid) issues.push(`image ${image._id} missing archiveId`)
		const imageFile = image.imageFile as {_pendingUploadUrl?: string} | undefined
		if (!imageFile?._pendingUploadUrl && !(imageFile as {asset?: unknown})?.asset) {
			issues.push(`image ${image._id} missing upload URL / asset`)
		}
	}

	const sample = articles.slice(0, 3).map((a) => ({
		id: a._id,
		title: a.title,
		archiveId: a.archiveId,
		tables: countTables(a.body),
		embeds: countEmbeds(a.body),
		bodyBlocks: Array.isArray(a.body) ? a.body.length : 0,
	}))

	const report = {
		ok: issues.length === 0,
		snapshotPagesOk: okPages.length,
		articles: articles.length,
		images: images.length,
		issues,
		sample,
		validatedAt: new Date().toISOString(),
	}

	fs.writeFileSync(VALIDATE_REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')
	console.log(JSON.stringify(report, null, 2))
	if (!report.ok) {
		console.error(`Validation found ${issues.length} issue(s). See ${VALIDATE_REPORT_PATH}`)
		process.exitCode = 1
	} else {
		console.log(`Validation OK → ${VALIDATE_REPORT_PATH}`)
	}
	return report
}
