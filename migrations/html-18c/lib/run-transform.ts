/**
 * Transform HTML snapshots into NDJSON for people, properties, images, articles.
 * Reads approved review CSVs; unapproved rows are skipped for entity create/link.
 */
import fs from 'node:fs'
import path from 'node:path'

import {nanoid} from 'nanoid'

import {createImportClient, hasAuthToken} from '../../csv-import/lib/sanity-client'
import {isApproved, readCsv, writeCsv} from './csv'
import {
	convertPageBody,
	finalizeBodyBlocks,
	makeInternalSubLinks,
} from './html-to-article'
import {
	formatArticleArchiveId,
	formatImageArchiveId,
	personImportId,
	propertyImportId,
	researchArticleId,
	slugFromUrl,
} from './ids'
import {
	ARCHIVE_IDS_REPORT_PATH,
	ARTICLES_NDJSON_PATH,
	EXTRACTED_DIR,
	IMAGES_NDJSON_PATH,
	MANIFEST_PATH,
	MEETING_PEOPLE_REVIEW_PATH,
	PEOPLE_NDJSON_PATH,
	PROPERTIES_NDJSON_PATH,
	PROPERTIES_REVIEW_PATH,
	REPORTS_DIR,
	SLAVES_PEOPLE_REVIEW_PATH,
	TRANSFORM_WARNINGS_PATH,
	TRANSFORMED_DIR,
} from './paths'
import {parseHtmlPage} from './parse-page'
import {parsePersonName} from './people'
import type {Manifest} from './run-extract'
import {HUB_URLS} from './urls'

function ensureDir(dir: string): void {
	fs.mkdirSync(dir, {recursive: true})
}

function loadManifest(): Manifest {
	if (!fs.existsSync(MANIFEST_PATH)) {
		throw new Error(`Missing manifest at ${MANIFEST_PATH}. Run extract first.`)
	}
	return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest
}

function writeNdjson(filePath: string, docs: Record<string, unknown>[]): void {
	const body = docs.map((d) => JSON.stringify(d)).join('\n')
	fs.writeFileSync(filePath, body ? `${body}\n` : '', 'utf8')
}

function ref(id: string): {_type: 'reference'; _ref: string; _key: string} {
	return {_type: 'reference', _ref: id, _key: nanoid()}
}

interface ResolvedPerson {
	displayName: string
	sanityId: string
	create: boolean
	doc?: Record<string, unknown>
}

function resolvePeopleFromReview(filePath: string): ResolvedPerson[] {
	const rows = readCsv(filePath)
	const out: ResolvedPerson[] = []
	for (const row of rows) {
		if ((row.status || '').toLowerCase() === 'family_group') continue
		const existingId = (row.existingSanityId || '').trim()
		const approved = isApproved(row.approved)
		const parts = {
			prefix: (row.prefix || '').trim(),
			firstName: (row.firstName || '').trim(),
			middleName: (row.middleName || '').trim(),
			lastName: (row.lastName || '').trim(),
			suffix: (row.suffix || '').trim(),
		}
		if (!parts.firstName || !parts.lastName) continue

		if (existingId) {
			if (approved || (row.status || '').toLowerCase() === 'matched') {
				out.push({
					displayName: row.displayName || `${parts.firstName} ${parts.lastName}`,
					sanityId: existingId,
					create: false,
				})
			}
			continue
		}

		if (!approved) continue

		const id = personImportId(parts)
		const doc: Record<string, unknown> = {
			_id: id,
			_type: 'person',
			firstName: parts.firstName,
			lastName: parts.lastName,
		}
		if (parts.prefix) doc.prefix = parts.prefix
		if (parts.middleName) doc.middleName = parts.middleName
		if (parts.suffix) doc.suffix = parts.suffix
		out.push({
			displayName: row.displayName || `${parts.firstName} ${parts.lastName}`,
			sanityId: id,
			create: true,
			doc,
		})
	}
	return out
}

function resolvePropertiesFromReview(): {
	byArticleUrl: Map<string, string>
	docs: Record<string, unknown>[]
} {
	const rows = readCsv(PROPERTIES_REVIEW_PATH)
	const byArticleUrl = new Map<string, string>()
	const docs: Record<string, unknown>[] = []

	for (const row of rows) {
		const name = (row.historicalName || '').trim()
		const articleUrl = (row.articleUrl || '').trim()
		if (!name || !articleUrl) continue
		if (!isApproved(row.approved)) continue

		const existingId = (row.existingSanityId || '').trim()
		const id = existingId || propertyImportId(name)
		byArticleUrl.set(articleUrl, id)

		if (!existingId) {
			docs.push({
				_id: id,
				_type: 'property',
				historicalName: name,
				propertyType: (row.suggestedPropertyType || 'dwelling').trim() || 'dwelling',
			})
		}
	}

	return {byArticleUrl, docs}
}

async function lookupTredyffrinTownshipId(): Promise<string | null> {
	if (!hasAuthToken()) return null
	const client = createImportClient({dryRun: true})
	return client.fetch<string | null>(
		`*[_type == "township" && !(_id in path("drafts.**")) && (
			migrationKey == "Tredyffrin" ||
			name == "Tredyffrin"
		)][0]._id`,
	)
}

export async function runTransform(): Promise<void> {
	ensureDir(TRANSFORMED_DIR)
	ensureDir(REPORTS_DIR)

	const manifest = loadManifest()
	const okPages = manifest.pages.filter((p) => p.ok)
	const tredyffrinId = await lookupTredyffrinTownshipId()
	if (tredyffrinId) {
		console.log(`Linking articles to township ${tredyffrinId}`)
	} else {
		console.log('Tredyffrin township not found — articles will omit townships.')
	}

	const urlToArticleId = new Map<string, string>()
	for (const page of okPages) {
		urlToArticleId.set(page.url, researchArticleId(page.url))
	}

	const slavesPeople = resolvePeopleFromReview(SLAVES_PEOPLE_REVIEW_PATH)
	const meetingPeople = resolvePeopleFromReview(MEETING_PEOPLE_REVIEW_PATH)
	const peopleByKey = new Map<string, ResolvedPerson>()
	for (const p of [...slavesPeople, ...meetingPeople]) {
		peopleByKey.set(p.sanityId, p)
	}
	const peopleDocs = [...peopleByKey.values()]
		.filter((p) => p.create && p.doc)
		.map((p) => p.doc!)

	const {byArticleUrl: propertyByArticleUrl, docs: propertyDocs} =
		resolvePropertiesFromReview()

	const slavesArticleUrl = [...urlToArticleId.keys()].find((u) =>
		u.includes('SlavesInTredyffrin'),
	)
	const meetingArticleUrl = [...urlToArticleId.keys()].find((u) =>
		u.includes('MeetingForSuffering'),
	)

	const imageDocs = new Map<string, Record<string, unknown>>()
	const articles: Record<string, unknown>[] = []
	const archiveIdRows: string[][] = []
	const warningRows: string[][] = []
	let articleIndex = 0
	let imageIndex = 0

	// Stable sort for deterministic archive IDs
	const sortedPages = [...okPages].sort((a, b) => a.url.localeCompare(b.url))

	for (const page of sortedPages) {
		articleIndex += 1
		const articleId = researchArticleId(page.url)
		const archiveId = formatArticleArchiveId(articleIndex)
		const html = fs.readFileSync(path.join(EXTRACTED_DIR, page.localPath), 'utf8')
		const parsed = parseHtmlPage(html, page.url)
		const title = parsed.h2 || parsed.title || slugFromUrl(page.url)

		const {blocks, pendingImages, warnings} = convertPageBody(
			parsed.bodyHtml,
			page.url,
			urlToArticleId,
		)

		for (const w of warnings) {
			warningRows.push([page.url, w])
		}

		for (const embed of pendingImages) {
			const imgId = embed._pendingImportId!
			if (imageDocs.has(imgId)) continue
			imageIndex += 1
			const imgArchiveId = formatImageArchiveId(imageIndex)
			const caption =
				embed.alt ||
				embed._pendingFilename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
			imageDocs.set(imgId, {
				_id: imgId,
				_type: 'historicalImage',
				archiveId: imgArchiveId,
				title: caption.slice(0, 200) || `Image from ${title}`,
				imageFile: {
					_type: 'image',
					// Placeholder until import uploads; import replaces with asset
					_pendingUploadUrl: embed._pendingSrc,
					_pendingFilename: embed._pendingFilename,
				},
				description: `Migrated from ${page.url}`,
			})
			archiveIdRows.push([
				'historicalImage',
				imgArchiveId,
				imgId,
				embed._pendingSrc,
			])
		}

		let body = finalizeBodyBlocks(blocks)

		if (HUB_URLS.has(page.url) && page.childUrls.length > 0) {
			const childIds = page.childUrls
				.map((u) => urlToArticleId.get(u))
				.filter((id): id is string => Boolean(id))
			if (childIds.length > 0) {
				body = [makeInternalSubLinks(childIds), ...body]
			}
		}

		const peopleMentioned: {_type: 'reference'; _ref: string; _key: string}[] = []
		if (page.url === slavesArticleUrl) {
			for (const p of slavesPeople) {
				peopleMentioned.push(ref(p.sanityId))
			}
		}
		if (page.url === meetingArticleUrl) {
			for (const p of meetingPeople) {
				peopleMentioned.push(ref(p.sanityId))
			}
		}

		const propertiesMentioned: {_type: 'reference'; _ref: string; _key: string}[] = []
		const propertyId = propertyByArticleUrl.get(page.url)
		if (propertyId) {
			propertiesMentioned.push(ref(propertyId))
		}

		const doc: Record<string, unknown> = {
			_id: articleId,
			_type: 'researchArticle',
			archiveId,
			title,
			slug: {current: slugFromUrl(page.url)},
			body,
			internalComments: `Migrated from HTML: ${page.url}`,
		}
		if (tredyffrinId) {
			doc.townships = [ref(tredyffrinId)]
		}
		if (peopleMentioned.length > 0) doc.peopleMentioned = peopleMentioned
		if (propertiesMentioned.length > 0) {
			doc.propertiesMentioned = propertiesMentioned
		}

		articles.push(doc)
		archiveIdRows.push(['researchArticle', archiveId, articleId, page.url])
	}

	writeNdjson(PEOPLE_NDJSON_PATH, peopleDocs)
	writeNdjson(PROPERTIES_NDJSON_PATH, propertyDocs)
	writeNdjson(IMAGES_NDJSON_PATH, [...imageDocs.values()])
	writeNdjson(ARTICLES_NDJSON_PATH, articles)
	writeCsv(
		ARCHIVE_IDS_REPORT_PATH,
		['documentType', 'archiveId', 'sanityId', 'source'],
		archiveIdRows,
	)
	writeCsv(TRANSFORM_WARNINGS_PATH, ['pageUrl', 'warning'], warningRows)

	console.log(`People to create: ${peopleDocs.length}`)
	console.log(`Properties to create: ${propertyDocs.length}`)
	console.log(`Historical images: ${imageDocs.size}`)
	console.log(`Research articles: ${articles.length}`)
	console.log(`Archive ID report: ${ARCHIVE_IDS_REPORT_PATH}`)
	console.log(
		'Review archive-ids.csv and review/*.csv (approved=yes) before --live import.',
	)
}

/** Re-export for Meeting people heading parse used in tests. */
export {parsePersonName}
