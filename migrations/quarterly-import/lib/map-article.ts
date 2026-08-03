/**
 * Map a snapped article into a quarterlyArticle document shape.
 */
import type {SanityClient} from '@sanity/client'
import {
	extractArticleContent,
	htmlFragmentToBody,
	type BodyBlock,
	type ImagePlaceholderBlock,
} from './html-to-portable-text'
import type {SnapshotArticle} from './load-snapshot'

export interface QuarterlyImportDoc {
	_type: 'quarterlyArticle'
	title: string
	authorText?: string
	volume: number
	issue: number
	publishedDate?: string
	startPage: number
	sourceKey: string
	sourceUrl: string
	body?: BodyBlock[]
}

async function uploadPendingImages(
	client: SanityClient,
	blocks: BodyBlock[],
): Promise<BodyBlock[]> {
	const out: BodyBlock[] = []
	for (const block of blocks) {
		if (block._type !== 'image' || !('_pendingSrc' in block) || !block._pendingSrc) {
			if (block._type === 'image') {
				const {_pendingSrc: _, ...rest} = block as ImagePlaceholderBlock
				out.push(rest as BodyBlock)
			} else {
				out.push(block)
			}
			continue
		}

		const src = block._pendingSrc
		try {
			const res = await fetch(src)
			if (!res.ok) throw new Error(`${res.status}`)
			const buffer = Buffer.from(await res.arrayBuffer())
			const filename = src.split('/').pop() || 'image.jpg'
			const asset = await client.assets.upload('image', buffer, {filename})
			const {_pendingSrc: _, ...rest} = block
			out.push({
				...rest,
				asset: {_type: 'reference', _ref: asset._id},
			} as BodyBlock)
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			console.warn(`[WARN] image upload failed (${src}): ${msg}`)
			// Drop failed image rather than leaving a broken block
		}
	}
	return out
}

export function mapSnapshotToDoc(article: SnapshotArticle): QuarterlyImportDoc {
	const {contentHtml} = extractArticleContent(article.rawHtml)
	const body = htmlFragmentToBody(contentHtml, article.sourceUrl)

	const doc: QuarterlyImportDoc = {
		_type: 'quarterlyArticle',
		title: article.title,
		volume: article.volume,
		issue: article.issue,
		startPage: article.startPage,
		sourceKey: article.sourceKey,
		sourceUrl: article.sourceUrl,
	}
	if (article.authorText) doc.authorText = article.authorText
	if (article.publishedDate) doc.publishedDate = article.publishedDate
	if (body.length > 0) doc.body = body
	return doc
}

export async function finalizeDocForLive(
	client: SanityClient,
	doc: QuarterlyImportDoc,
): Promise<QuarterlyImportDoc> {
	if (!doc.body?.length) return doc
	const body = await uploadPendingImages(client, doc.body)
	return {...doc, body}
}

/** Strip internal pending fields before NDJSON preview / create. */
export function sanitizeDocForWrite(
	doc: QuarterlyImportDoc,
): Record<string, unknown> {
	if (!doc.body) return {...doc}
	const body = doc.body.map((block) => {
		if (block._type === 'image' && '_pendingSrc' in block) {
			const {_pendingSrc: _, ...rest} = block as ImagePlaceholderBlock
			return rest
		}
		return block
	})
	return {...doc, body}
}
