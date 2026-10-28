/**
 * Parse snapshot HTML: title, body fragment, links, images, people headings.
 */
import {JSDOM} from 'jsdom'

import {decodeHtmlEntities} from '../../csv-import/lib/clean'
import {isExcludedUrl, normalizeUrl, shouldFollowLink} from './urls'

export interface ParsedLink {
	href: string
	text: string
	absoluteUrl: string
	follow: boolean
	excluded: boolean
}

export interface ParsedImage {
	src: string
	absoluteUrl: string
	alt: string
}

export interface ParsedPage {
	pageUrl: string
	title: string
	h2: string | null
	bodyHtml: string
	links: ParsedLink[]
	images: ParsedImage[]
	/** h3.indent headings (Meeting for Suffering style person sections). */
	personHeadings: string[]
}

function textContent(el: Element | null): string {
	if (!el) return ''
	return decodeHtmlEntities(el.textContent ?? '')
		.replace(/\s+/g, ' ')
		.trim()
}

/**
 * Prefer #commonText1 inner content; fall back to table.content1.
 */
export function extractBodyHtml(document: Document): string {
	const common = document.querySelector('#commonText1')
	if (common) {
		const contentTable = common.querySelector('table.content1, table.content2')
		if (contentTable) {
			const cells = contentTable.querySelectorAll(':scope > tbody > tr > td, :scope > tr > td')
			if (cells.length > 0) {
				return Array.from(cells)
					.map((c) => c.innerHTML)
					.join('\n')
			}
			return contentTable.innerHTML
		}
		return common.innerHTML
	}

	const contentTable = document.querySelector('table.content1, table.content2')
	if (contentTable) {
		return contentTable.innerHTML
	}

	const body = document.body
	if (!body) return ''
	const clone = body.cloneNode(true) as Element
	clone.querySelectorAll('#menu, #navigation, #footer, script').forEach((n) => n.remove())
	return clone.innerHTML
}

export function parseHtmlPage(html: string, pageUrl: string): ParsedPage {
	const dom = new JSDOM(html)
	const {document} = dom.window

	const title = textContent(document.querySelector('title')) || 'Untitled'
	const h2 = textContent(document.querySelector('.tt18cTitleBox h2, #navigation h2, h2')) || null
	const bodyHtml = extractBodyHtml(document)

	const bodyDom = new JSDOM(`<div id="root">${bodyHtml}</div>`)
	const root = bodyDom.window.document.querySelector('#root')!

	const links: ParsedLink[] = []
	const seen = new Set<string>()
	for (const a of root.querySelectorAll('a[href]')) {
		const href = a.getAttribute('href')?.trim() ?? ''
		if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) continue
		const absoluteUrl = normalizeUrl(href, pageUrl)
		if (!absoluteUrl || seen.has(absoluteUrl)) continue
		seen.add(absoluteUrl)
		const excluded = isExcludedUrl(absoluteUrl)
		links.push({
			href,
			text: textContent(a),
			absoluteUrl,
			follow: !excluded && shouldFollowLink(absoluteUrl, pageUrl),
			excluded,
		})
	}

	const images: ParsedImage[] = []
	const seenImg = new Set<string>()
	for (const img of root.querySelectorAll('img[src]')) {
		const src = img.getAttribute('src')?.trim() ?? ''
		if (!src) continue
		const absoluteUrl = normalizeUrl(src, pageUrl)
		if (!absoluteUrl || seenImg.has(absoluteUrl)) continue
		seenImg.add(absoluteUrl)
		const lower = absoluteUrl.toLowerCase()
		if (
			lower.includes('spacer') ||
			lower.includes('bullet') ||
			lower.includes('pixel') ||
			lower.endsWith('.gif') && lower.includes('nav')
		) {
			continue
		}
		images.push({
			src,
			absoluteUrl,
			alt: textContent(img) || img.getAttribute('alt')?.trim() || '',
		})
	}

	const personHeadings = Array.from(document.querySelectorAll('h3.indent, h3'))
		.map((h) => textContent(h))
		.filter((t) => t.length > 0 && t.length < 80)

	return {
		pageUrl,
		title,
		h2,
		bodyHtml,
		links,
		images,
		personHeadings,
	}
}

export interface BuildingListItem {
	name: string
	note: string
	href: string
	absoluteUrl: string
}

/**
 * Extract the Buildings.html name list (li > a.linktext).
 */
export function extractBuildingList(html: string, pageUrl: string): BuildingListItem[] {
	const dom = new JSDOM(html)
	const items: BuildingListItem[] = []
	const seen = new Set<string>()

	for (const li of dom.window.document.querySelectorAll('#commonText1 li, table.content1 li')) {
		const a = li.querySelector('a.linktext, a')
		if (!a) continue
		const href = a.getAttribute('href')?.trim() ?? ''
		if (!href || !/Buildings\//i.test(href)) continue
		const absoluteUrl = normalizeUrl(href, pageUrl)
		if (!absoluteUrl || seen.has(absoluteUrl)) continue
		seen.add(absoluteUrl)
		const name = textContent(a)
		const full = textContent(li)
		let note = full.slice(name.length).trim()
		note = note.replace(/^[(\s]+|[)\s]+$/g, '').trim()
		items.push({name, note, href, absoluteUrl})
	}

	return items
}
