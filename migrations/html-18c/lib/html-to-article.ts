/**
 * Convert a snapshot HTML page into researchArticle-shaped Portable Text
 * with historicalImageEmbed placeholders and table blocks.
 */
import {nanoid} from 'nanoid'

import {
	contentToPortableTextDetailed,
	type ContentBlock,
	type HistoricalImageEmbedPending,
	type PortableTextTextBlock,
	stripPendingImageFields,
} from '../../csv-import/lib/content-to-portable-text'
import type {DocumentImageCatalog} from '../../csv-import/lib/document-image-catalog'
import {normalizeUrl} from './urls'
import {articleSlugPath, historicalImageId} from './ids'

const EMPTY_CATALOG: DocumentImageCatalog = {
	stems: [],
	identifiers: new Map(),
	filenames: new Map(),
}

const SKIP_IMAGE_PATTERNS = [
	/spacer/i,
	/bullet/i,
	/pixel/i,
	/clear\.gif/i,
	/1x1/i,
	/googlecs/i,
	/favicon/i,
	/logo/i,
	/navhint/i,
]

export function isDecorativeImageSrc(src: string): boolean {
	return SKIP_IMAGE_PATTERNS.some((re) => re.test(src))
}

/**
 * Rewrite relative img src to absolute URLs so pending fetch works.
 */
export function absolutizeImageSrcs(html: string, pageUrl: string): string {
	return html.replace(
		/<img\b([^>]*?)\bsrc\s*=\s*(["'])([^"']+)\2/gi,
		(full, pre: string, quote: string, src: string) => {
			const absolute = normalizeUrl(src, pageUrl)
			if (!absolute) return full
			return `<img${pre}src=${quote}${absolute}${quote}`
		},
	)
}

export function rewriteLinkMarkDefs(
	blocks: ContentBlock[],
	urlToArticleId: Map<string, string>,
): ContentBlock[] {
	return blocks.map((block) => {
		if (block._type !== 'block') return block
		const textBlock = block as PortableTextTextBlock
		if (!textBlock.markDefs?.length) return block

		const markDefs = textBlock.markDefs.map((def) => {
			if (def._type !== 'link' || !def.href) return def
			const absolute = normalizeUrl(def.href, 'https://www.the2nomads.site/')
			if (!absolute) return def
			const articleId = urlToArticleId.get(absolute)
			if (!articleId) return {...def, href: absolute}
			return {...def, href: articleSlugPath(absolute)}
		})

		return {...textBlock, markDefs}
	})
}

export interface ConvertPageResult {
	blocks: ContentBlock[]
	pendingImages: HistoricalImageEmbedPending[]
	warnings: string[]
}

/**
 * Convert page body HTML to Portable Text. Pending embeds use deterministic
 * historicalImage document ids derived from absolute image URLs.
 */
export function convertPageBody(
	bodyHtml: string,
	pageUrl: string,
	urlToArticleId: Map<string, string>,
): ConvertPageResult {
	const prepared = absolutizeImageSrcs(bodyHtml, pageUrl)
	const {blocks: rawBlocks, warnings} = contentToPortableTextDetailed(prepared, EMPTY_CATALOG)

	const pendingImages: HistoricalImageEmbedPending[] = []
	const blocks: ContentBlock[] = []

	for (const block of rawBlocks) {
		if (block._type !== 'historicalImageEmbed') {
			blocks.push(block)
			continue
		}

		const embed = block as HistoricalImageEmbedPending
		if (isDecorativeImageSrc(embed._pendingSrc) || isDecorativeImageSrc(embed._pendingFilename)) {
			warnings.push(`skipped-decorative-image:${embed._pendingSrc}`)
			continue
		}

		const absoluteSrc =
			normalizeUrl(embed._pendingSrc, pageUrl) ?? embed._pendingSrc
		const importId = historicalImageId(absoluteSrc)
		const next: HistoricalImageEmbedPending = {
			...embed,
			_pendingSrc: absoluteSrc,
			_pendingImportId: importId,
			_pendingArchiveId: undefined,
			historicalImage: {_type: 'reference', _ref: importId},
		}
		pendingImages.push(next)
		blocks.push(next)
	}

	const withLinks = rewriteLinkMarkDefs(blocks, urlToArticleId)
	return {blocks: withLinks, pendingImages, warnings}
}

export function makeInternalSubLinks(
	childArticleIds: string[],
): {_type: 'internalSubLinks'; _key: string; links: {_type: 'reference'; _ref: string; _key: string}[]} {
	return {
		_type: 'internalSubLinks',
		_key: nanoid(),
		links: childArticleIds.map((id) => ({
			_type: 'reference' as const,
			_ref: id,
			_key: nanoid(),
		})),
	}
}

export function finalizeBodyBlocks(blocks: ContentBlock[]): ContentBlock[] {
	return stripPendingImageFields(blocks)
}
