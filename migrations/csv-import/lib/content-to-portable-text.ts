/**
 * Convert document CSV `content` HTML into Portable Text with
 * historicalImageEmbed placeholders for <img> tags.
 */
import {htmlToBlocks} from '@portabletext/block-tools'
import {Schema} from '@sanity/schema'
import {JSDOM} from 'jsdom'
import {nanoid} from 'nanoid'

import {cleanString, decodeHtmlEntities} from './clean'
import type {DocumentImageCatalog} from './document-image-catalog'
import {classifyDocumentImageSrc} from './document-image-catalog'

export interface PortableTextSpan {
	_type: 'span'
	_key: string
	text: string
	marks?: string[]
}

export interface PortableTextTextBlock {
	_type: 'block'
	_key: string
	style?: string
	listItem?: string
	level?: number
	markDefs?: {_type: string; _key: string; href?: string}[]
	children: PortableTextSpan[]
}

export interface HistoricalImageEmbedPending {
	_type: 'historicalImageEmbed'
	_key: string
	historicalImage: {_type: 'reference'; _ref: string}
	imageRole: 'figure'
	alt?: string
	caption?: string
	/** Catalog archiveId to look up, or empty when importing a new image. */
	_pendingArchiveId?: string
	/** Deterministic import _id when creating without Archive ID. */
	_pendingImportId?: string
	/** Original src for upload / reporting. */
	_pendingSrc: string
	_pendingFilename: string
}

export type ContentBlock = PortableTextTextBlock | HistoricalImageEmbedPending

const compiledSchema = Schema.compile({
	name: 'documentContentImport',
	types: [
		{
			name: 'historicalImage',
			type: 'document',
			fields: [{name: 'title', type: 'string'}],
		},
		{
			name: 'post',
			type: 'document',
			fields: [
				{
					name: 'body',
					type: 'array',
					of: [
						{
							type: 'block',
							marks: {
								decorators: [
									{title: 'Strong', value: 'strong'},
									{title: 'Emphasis', value: 'em'},
								],
								annotations: [
									{
										name: 'link',
										type: 'object',
										fields: [{name: 'href', type: 'url'}],
									},
								],
							},
							styles: [
								{title: 'Normal', value: 'normal'},
								{title: 'H2', value: 'h2'},
								{title: 'H3', value: 'h3'},
								{title: 'Quote', value: 'blockquote'},
							],
							lists: [
								{title: 'Bullet', value: 'bullet'},
								{title: 'Number', value: 'number'},
							],
						},
						{
							name: 'historicalImageEmbed',
							type: 'object',
							fields: [
								{
									name: 'historicalImage',
									type: 'reference',
									to: [{type: 'historicalImage'}],
								},
								{name: 'caption', type: 'string'},
								{name: 'alt', type: 'string'},
								{name: 'imageRole', type: 'string'},
							],
						},
					],
				},
			],
		},
	],
})

const blockContentType = compiledSchema.get('post').fields.find(
	(field: {name: string}) => field.name === 'body',
).type

function looksLikeHtml(value: string): boolean {
	return /<\/?[a-z][\s\S]*>/i.test(value)
}

/**
 * Turn repeated <br> pairs into paragraph breaks so clipping text
 * becomes multiple PT blocks.
 */
export function preprocessContentHtml(html: string): string {
	return html.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>')
}

function plainTextBlock(text: string): PortableTextTextBlock {
	return {
		_type: 'block',
		_key: nanoid(),
		style: 'normal',
		markDefs: [],
		children: [{_type: 'span', _key: nanoid(), text, marks: []}],
	}
}

/**
 * Strip HTML tags for photo-type historicalImage.description.
 */
export function stripHtmlToPlainText(value: string): string {
	const decoded = decodeHtmlEntities(value)
	if (!looksLikeHtml(decoded)) return decoded.replace(/\s+/g, ' ').trim()
	const withBreaks = decoded.replace(/<br\s*\/?>/gi, ' ')
	const dom = new JSDOM(`<div id="root">${withBreaks}</div>`)
	const text = dom.window.document.querySelector('#root')?.textContent ?? withBreaks
	return text.replace(/\s+/g, ' ').trim()
}

function usableAlt(alt: string | null | undefined): string | undefined {
	const cleaned = cleanString(alt)
	if (!cleaned) return undefined
	if (cleaned.toLowerCase() === 'image not found') return undefined
	return cleaned
}

/**
 * Convert document content to Portable Text. Images become embeds with
 * pending fields that run-import resolves to real Sanity references.
 */
export function contentToPortableText(
	content: string,
	catalog: DocumentImageCatalog,
): ContentBlock[] {
	const trimmed = content.trim()
	if (!trimmed) return []

	if (!looksLikeHtml(trimmed)) {
		return [plainTextBlock(decodeHtmlEntities(trimmed))]
	}

	const prepared = preprocessContentHtml(trimmed)
	const wrapped = /<\s*p[\s>]/i.test(prepared)
		? prepared
		: `<p>${prepared}</p>`

	const blocks = htmlToBlocks(wrapped, blockContentType, {
		parseHtml: (html) => new JSDOM(html).window.document,
		rules: [
			{
				deserialize(el, _next, block) {
					if (el.nodeType !== 1) return undefined
					const element = el as Element
					if (element.tagName?.toLowerCase() !== 'img') return undefined

					const src = element.getAttribute('src')?.trim() ?? ''
					if (!src) return undefined

					const classified = classifyDocumentImageSrc(src, catalog)
					if (classified.kind === 'skip') return undefined

					const alt = usableAlt(element.getAttribute('alt'))
					const pending: HistoricalImageEmbedPending = {
						_type: 'historicalImageEmbed',
						_key: nanoid(),
						historicalImage: {_type: 'reference', _ref: 'pending'},
						imageRole: 'figure',
						...(alt ? {alt} : {}),
						_pendingSrc: classified.src,
						_pendingFilename: classified.filename,
						...(classified.kind === 'catalog'
							? {_pendingArchiveId: classified.archiveId}
							: {_pendingImportId: classified.importId}),
					}

					return block(pending)
				},
			},
		],
	})

	return blocks as ContentBlock[]
}

/**
 * Strip pending_* fields after references are resolved.
 */
export function stripPendingImageFields(blocks: ContentBlock[]): ContentBlock[] {
	return blocks.map((block) => {
		if (block._type !== 'historicalImageEmbed') return block
		const {
			_pendingArchiveId: _a,
			_pendingImportId: _i,
			_pendingSrc: _s,
			_pendingFilename: _f,
			...rest
		} = block as HistoricalImageEmbedPending
		return rest as HistoricalImageEmbedPending
	})
}
