/**
 * Convert legacy MySQL/CSV image `refs` HTML into Portable Text for
 * historicalImage.references.
 */
import {parseHTML} from 'linkedom'
import {nanoid} from 'nanoid'

import {cleanString, decodeHtmlEntities} from './clean'

/** Same host as the Quarterly importer; used to absolutize relative hrefs. */
export const REFS_URL_BASE = 'https://www.tehistory.org/hqda/html/'

export interface ReferenceLinkMark {
	_type: 'link'
	_key: string
	href: string
}

export interface ReferenceSpan {
	_type: 'span'
	_key: string
	text: string
	marks: string[]
}

export interface ReferenceBlock {
	_type: 'block'
	_key: string
	style: 'normal'
	markDefs: ReferenceLinkMark[]
	children: ReferenceSpan[]
}

function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value)
		return url.protocol === 'http:' || url.protocol === 'https:'
	} catch {
		return false
	}
}

function resolveHref(rawHref: string): string | null {
	const href = rawHref.trim()
	if (!href) return null
	try {
		const absolute = new URL(href, REFS_URL_BASE).href
		return isHttpUrl(absolute) ? absolute : null
	} catch {
		return null
	}
}

function normalizeText(value: string): string {
	return decodeHtmlEntities(value.replace(/\u000b/g, ' ')).replace(/\s+/g, ' ')
}

function appendSpan(children: ReferenceSpan[], text: string, marks: string[]) {
	const normalized = normalizeText(text)
	if (!normalized || normalized === ' ') return

	const last = children[children.length - 1]
	const sameMarks =
		last &&
		last.marks.length === marks.length &&
		last.marks.every((mark, index) => mark === marks[index])
	if (sameMarks && last) {
		last.text += normalized
		return
	}

	children.push({
		_type: 'span',
		_key: nanoid(),
		text: normalized,
		marks: [...marks],
	})
}

function walk(
	node: Node,
	children: ReferenceSpan[],
	markDefs: ReferenceLinkMark[],
	marks: string[],
) {
	if (node.nodeType === 3) {
		appendSpan(children, node.textContent ?? '', marks)
		return
	}
	if (node.nodeType !== 1) return

	const el = node as Element
	const tag = el.tagName.toLowerCase()

	if (tag === 'br') {
		appendSpan(children, ' ', marks)
		return
	}

	if (tag === 'a') {
		const href = resolveHref(el.getAttribute('href') ?? '')
		let nextMarks = marks
		if (href) {
			const key = nanoid()
			markDefs.push({_type: 'link', _key: key, href})
			nextMarks = [...marks, key]
		}
		for (const child of Array.from(el.childNodes)) {
			walk(child, children, markDefs, nextMarks)
		}
		return
	}

	for (const child of Array.from(el.childNodes)) {
		walk(child, children, markDefs, marks)
	}
}

function trimBlockEdges(children: ReferenceSpan[]) {
	if (children.length === 0) return
	children[0].text = children[0].text.replace(/^\s+/, '')
	const last = children[children.length - 1]
	last.text = last.text.replace(/\s+$/, '')
	const kept = children.filter((span) => span.text.length > 0)
	children.length = 0
	children.push(...kept)
}

function elementToBlock(root: Element): ReferenceBlock | null {
	const children: ReferenceSpan[] = []
	const markDefs: ReferenceLinkMark[] = []
	for (const child of Array.from(root.childNodes)) {
		walk(child, children, markDefs, [])
	}
	trimBlockEdges(children)
	if (children.length === 0) return null
	return {
		_type: 'block',
		_key: nanoid(),
		style: 'normal',
		markDefs,
		children,
	}
}

/**
 * Parse a legacy `refs` string into Portable Text blocks.
 * Returns null when the value is empty or yields no text.
 */
export function refsToPortableText(raw: unknown): ReferenceBlock[] | null {
	const cleaned = cleanString(raw)
	if (!cleaned) return null

	const wrapped = `<div id="root">${cleaned.replace(/\u000b/g, ' ')}</div>`
	const {document} = parseHTML(wrapped)
	const root = document.querySelector('#root')
	if (!root) return null

	const paragraphs = Array.from(root.childNodes).filter(
		(node): node is Element =>
			node.nodeType === 1 && (node as Element).tagName.toLowerCase() === 'p',
	)
	if (paragraphs.length > 0) {
		const blocks = paragraphs
			.map((paragraph) => elementToBlock(paragraph))
			.filter((block): block is ReferenceBlock => block != null)
		return blocks.length > 0 ? blocks : null
	}

	const block = elementToBlock(root)
	return block ? [block] : null
}
