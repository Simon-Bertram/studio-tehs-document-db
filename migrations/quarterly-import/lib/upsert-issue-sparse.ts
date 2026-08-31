/**
 * Sparse upsert for quarterlyIssue: fill empty fields only; never touch pdfAsset.
 */
import type {SanityClient} from '@sanity/client'

import {yearSearchTokens} from '../../../schemaTypes/lib/yearSearchTokens'
import type {HistoricalDateValue} from '../../lib/parse-historical-date'
import {FETCH_HEADERS} from './fetch-text'

interface IssueFields {
	_type: 'quarterlyIssue'
	volume: number
	issueNumber: number
	combinedIssue: boolean
	issueNumberEnd?: number
	season?: string
	publicationDate?: unknown
	yearSearch?: string
	sourceKey: string
	tocNotes?: string
	coverUrl?: string
}

interface ExistingIssue {
	_id: string
	season?: string
	publicationDate?: unknown
	tocNotes?: string
	coverImage?: unknown
	pdfAsset?: unknown
}

async function uploadCover(
	client: SanityClient,
	url: string,
): Promise<{_type: 'image'; asset: {_type: 'reference'; _ref: string}} | undefined> {
	try {
		const res = await fetch(url, {headers: FETCH_HEADERS})
		if (!res.ok) throw new Error(`HTTP ${res.status}`)
		const buffer = Buffer.from(await res.arrayBuffer())
		const filename = url.split('/').pop() || 'cover.jpg'
		const asset = await client.assets.upload('image', buffer, {filename})
		return {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		console.warn(`[WARN] cover upload failed (${url}): ${msg}`)
		return undefined
	}
}

/**
 * Create or sparsely patch a quarterlyIssue by sourceKey.
 */
export async function upsertIssueSparse(
	client: SanityClient,
	doc: IssueFields,
	options: {uploadCover: boolean},
): Promise<{action: 'created' | 'patched'; id: string}> {
	const existing = await client.fetch<ExistingIssue | null>(
		`*[_type == "quarterlyIssue" && sourceKey == $sourceKey && !(_id in path("drafts.**"))][0]{
			_id, season, publicationDate, tocNotes, coverImage, pdfAsset
		}`,
		{sourceKey: doc.sourceKey},
	)

	const coverImage =
		options.uploadCover && doc.coverUrl && !existing?.coverImage
			? await uploadCover(client, doc.coverUrl)
			: undefined

	const date = (doc.publicationDate ?? existing?.publicationDate) as HistoricalDateValue | undefined
	const yearSearch = doc.yearSearch ?? yearSearchTokens(date)

	if (!existing) {
		const created = await client.create({
			_type: 'quarterlyIssue',
			volume: doc.volume,
			issueNumber: doc.issueNumber,
			combinedIssue: doc.combinedIssue,
			...(doc.issueNumberEnd != null ? {issueNumberEnd: doc.issueNumberEnd} : {}),
			...(doc.season ? {season: doc.season} : {}),
			...(doc.publicationDate ? {publicationDate: doc.publicationDate} : {}),
			...(yearSearch ? {yearSearch} : {}),
			sourceKey: doc.sourceKey,
			...(doc.tocNotes ? {tocNotes: doc.tocNotes} : {}),
			...(coverImage ? {coverImage} : {}),
		})
		return {action: 'created', id: created._id}
	}

	const patch: Record<string, unknown> = {
		volume: doc.volume,
		issueNumber: doc.issueNumber,
		combinedIssue: doc.combinedIssue,
		sourceKey: doc.sourceKey,
	}
	if (doc.issueNumberEnd != null) patch.issueNumberEnd = doc.issueNumberEnd
	if (!existing.season && doc.season) patch.season = doc.season
	if (!existing.publicationDate && doc.publicationDate) patch.publicationDate = doc.publicationDate
	if (!existing.tocNotes && doc.tocNotes) patch.tocNotes = doc.tocNotes
	if (coverImage) patch.coverImage = coverImage
	if (yearSearch) patch.yearSearch = yearSearch

	const patchBuilder = client.patch(existing._id).set(patch)
	if (!yearSearch) {
		await patchBuilder.unset(['yearSearch']).commit()
	} else {
		await patchBuilder.commit()
	}
	return {action: 'patched', id: existing._id}
}
