/**
 * Convert cleaned article HTML fragments into Portable Text + pageBreaks.
 */
import {parseHTML} from 'linkedom'
import {nanoid} from 'nanoid'

export type PortableTextSpan = {
	_type: 'span'
	_key: string
	text: string
	marks?: string[]
}

export type PortableTextBlock = {
	_type: 'block'
	_key: string
	style?: string
	markDefs?: {_type: string; _key: string; href?: string}[]
	children: PortableTextSpan[]
}

export type PageBreakBlock = {
	_type: 'pageBreak'
	_key: string
	pageNumber: string
}

export type ImagePlaceholderBlock = {
	_type: 'image'
	_key: string
	alt?: string
	caption?: string
	imageRole?: 'figure' | 'aside'
	/** Absolute URL for later upload on --live */
	_pendingSrc?: string
	asset?: {_type: 'reference'; _ref: string}
}

export type BodyBlock = PortableTextBlock | PageBreakBlock | ImagePlaceholderBlock

function textBlock(text: string, style: string = 'normal'): PortableTextBlock | null {
	const cleaned = text.replace(/\s+/g, ' ').trim()
	if (!cleaned) return null
	return {
		_type: 'block',
		_key: nanoid(),
		style,
		markDefs: [],
		children: [
			{
				_type: 'span',
				_key: nanoid(),
				text: cleaned,
			},
		],
	}
}

function pageBreak(pageNumber: string): PageBreakBlock {
	return {
		_type: 'pageBreak',
		_key: nanoid(),
		pageNumber,
	}
}

/**
 * Walk article content nodes into Portable Text-ish blocks.
 * Images become placeholders with `_pendingSrc` for live upload.
 */
export function htmlFragmentToBody(htmlFragment: string, baseUrl: string): BodyBlock[] {
	const wrapped = `<div id="root">${htmlFragment}</div>`
	const {document} = parseHTML(wrapped)
	const root = document.querySelector('#root')
	if (!root) return []

	const blocks: BodyBlock[] = []

	for (const node of Array.from(root.childNodes)) {
		if (node.nodeType !== 1) continue
		const el = node as Element
		const tag = el.tagName.toLowerCase()
		const className = el.getAttribute('class') ?? ''

		if (className.includes('DQpagenum') || /^Page\s+\d+/i.test(el.textContent ?? '')) {
			const pageMatch = (el.textContent ?? '').match(/Page\s+(\d+)/i)
			if (pageMatch) {
				blocks.push(pageBreak(pageMatch[1]))
				continue
			}
		}

		if (className.includes('DQsubtitle') || tag === 'h2' || tag === 'h3') {
			const block = textBlock(el.textContent ?? '', 'h3')
			if (block) blocks.push(block)
			continue
		}

		if (tag === 'img' || el.querySelector?.('img')) {
			const img = (tag === 'img' ? el : el.querySelector('img')) as Element | null
			if (img) {
				const src = img.getAttribute('src')
				if (src) {
					let absolute = src
					try {
						absolute = new URL(src, baseUrl).href
					} catch {
						/* keep relative */
					}
					blocks.push({
						_type: 'image',
						_key: nanoid(),
						alt: img.getAttribute('alt') ?? undefined,
						imageRole: 'figure',
						_pendingSrc: absolute,
					})
				}
			}
			continue
		}

		if (
			className.includes('DQbodytext') ||
			className.includes('DQauthor') ||
			tag === 'p' ||
			tag === 'div'
		) {
			// Nested page numbers sometimes sit inside body wrappers
			const pageEl = el.querySelector?.('.DQpagenum')
			if (pageEl && pageEl === el.firstElementChild) {
				const pageMatch = (pageEl.textContent ?? '').match(/Page\s+(\d+)/i)
				if (pageMatch) blocks.push(pageBreak(pageMatch[1]))
			}

			const cloneText = el.textContent ?? ''
			const block = textBlock(cloneText)
			if (block) blocks.push(block)
			continue
		}

		if (tag === 'a' && className.includes('DQnavlink')) {
			continue
		}

		const fallback = textBlock(el.textContent ?? '')
		if (fallback) blocks.push(fallback)
	}

	return blocks
}

/**
 * Strip chrome and return the main article content HTML + metadata line.
 */
export function extractArticleContent(html: string): {
	contentHtml: string
	sourceLine?: string
} {
	const {document} = parseHTML(html)

	// Prefer the digital archives content region when present
	const contentRoot =
		document.querySelector('#commonText1') ?? document.querySelector('td.hqdaText') ?? document.body

	if (!contentRoot) return {contentHtml: ''}

	// Remove nav / menus / headers
	for (const sel of ['#menu', 'table.topmenu', '.tocNavHintBox', 'script', 'style']) {
		contentRoot.querySelectorAll(sel).forEach((el) => el.remove())
	}

	let sourceLine: string | undefined
	const allText = contentRoot.textContent ?? ''
	const sourceMatch = allText.match(/Source:\s*([^\n]+)/i)
	if (sourceMatch) sourceLine = sourceMatch[1].trim()

	// Collect only DQ* content paragraphs and related nodes in document order
	const pieces: string[] = []
	const candidates = contentRoot.querySelectorAll(
		'p.DQbodytext, p.DQsubtitle, p.DQpagenum, p.DQauthor, p.DQtitle, img',
	)

	if (candidates.length > 0) {
		for (const el of candidates) {
			pieces.push(el.outerHTML)
		}
		return {contentHtml: pieces.join('\n'), sourceLine}
	}

	return {contentHtml: contentRoot.innerHTML ?? '', sourceLine}
}
