/**
 * Parse qtoc1.html (site-root recent-issue list, Vol. 41–58).
 */
import {parseHTML} from 'linkedom'

import {type HistoricalDateValue} from '../../lib/parse-historical-date'
import {parseIssueHeading, type QuarterlySeason} from '../../lib/parse-issue-heading'
import {quarterlyIssueSourceKey} from '../../lib/quarterly-issue-source-key'
import {articleStubSourceKey} from './article-source-key'

export const QTOC1_BASE_URL = 'https://www.tehistory.org'

export interface Qtoc1Issue {
	volume: number
	issueNumber: number
	issueNumberEnd?: number
	combinedIssue: boolean
	season?: QuarterlySeason
	publicationDate?: HistoricalDateValue
	coverUrl?: string
	tocNotes?: string
	sourceKey: string
}

export interface Qtoc1Article {
	title: string
	authorText?: string
	volume: number
	issueNumber: number
	issueNumberEnd?: number
	sourceKey: string
	summary?: string
}

export interface Qtoc1Skip {
	title: string
	reason: 'boilerplate' | 'subhead_no_author'
	issueSourceKey?: string
}

const BOILERPLATE = /^support recognition$/i
const NOTES_HEAD = /^notes(?:\s*&\s*|\s+and\s+)comments:?$/i
const ERRATA = /^errat(?:a|um)\b/i

function resolveUrl(baseUrl: string, href: string): string {
	try {
		return new URL(href, `${baseUrl.replace(/\/?$/, '/')}`).href
	} catch {
		return href
	}
}

function authorAfterItalic(el: Element): string | undefined {
	let node = el.nextSibling
	let buf = ''
	for (let i = 0; i < 8 && node; i++) {
		const name = node.nodeName
		if (name === 'I' || name === 'UL' || name === 'LI' || name === 'B') break
		buf += node.textContent ?? ''
		const compact = buf.replace(/\s+/g, ' ').trim()
		if (/^[–—-]\s*\S/.test(compact)) break
		node = node.nextSibling
	}
	const match = buf
		.replace(/\s+/g, ' ')
		.trim()
		.match(/^[–—-]\s*(.+)$/)
	const author = match?.[1]?.replace(/\s+/g, ' ').trim()
	return author || undefined
}

function splitTitleAuthor(text: string): {title: string; authorText?: string} {
	const parts = text.split(/\s+[–—-]\s+/)
	if (parts.length >= 2) {
		return {
			title: parts[0].replace(/\s+/g, ' ').trim(),
			authorText: parts.slice(1).join(' – ').replace(/\s+/g, ' ').trim() || undefined,
		}
	}
	return {title: text.replace(/\s+/g, ' ').trim()}
}

function collectNotes(contentTd: Element, headingEl: Element | null): string | undefined {
	const notes: string[] = []

	for (const bold of contentTd.querySelectorAll('b')) {
		if (bold === headingEl || headingEl?.contains(bold)) continue
		const text = bold.textContent?.replace(/\s+/g, ' ').trim()
		if (!text || /volume\s+\d+/i.test(text)) continue
		const parentP = bold.closest('p')?.textContent?.replace(/\s+/g, ' ').trim()
		if (parentP && ERRATA.test(parentP)) continue
		notes.push(parentP && parentP.length > text.length ? parentP : text)
	}

	for (const p of contentTd.querySelectorAll('p')) {
		const text = p.textContent?.replace(/\s+/g, ' ').trim() ?? ''
		if (ERRATA.test(text)) notes.push(text)
	}

	const contentText = contentTd.textContent?.replace(/\s+/g, ' ') ?? ''
	const special = contentText.match(/Special (?:double|edition|expanded)[^.]*?(?:issue)?/i)
	if (special) notes.push(special[0].replace(/\s+/g, ' ').trim())

	const seenHrefs = new Set<string>()
	for (const a of contentTd.querySelectorAll('a.linktext, a')) {
		const label = a.textContent?.replace(/\s+/g, ' ').trim() ?? ''
		if (!/supplemental/i.test(label) && !/^here$/i.test(label)) continue
		const href = a.getAttribute('href')
		if (!href || seenHrefs.has(href)) continue
		seenHrefs.add(href)
		notes.push(`Supplemental web content: ${href}`)
	}

	const unique = [...new Set(notes.filter(Boolean))]
	return unique.length > 0 ? unique.join('\n') : undefined
}

/**
 * Parse the recent-issue list into issues and article stubs (no page numbers).
 */
export function parseQtoc1(
	html: string,
	baseUrl = QTOC1_BASE_URL,
): {issues: Qtoc1Issue[]; articles: Qtoc1Article[]; skipped: Qtoc1Skip[]} {
	const {document} = parseHTML(html)
	const issues: Qtoc1Issue[] = []
	const articles: Qtoc1Article[] = []
	const skipped: Qtoc1Skip[] = []

	const coverCells = document.querySelectorAll('td.coverImg')
	for (const coverTd of coverCells) {
		const contentTd = coverTd.nextElementSibling
		if (!contentTd) continue

		const headingEl =
			[...contentTd.querySelectorAll('b')].find((el) =>
				parseIssueHeading(el.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
			) ?? null
		const headingText = headingEl?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
		const issueMeta = parseIssueHeading(headingText)
		if (!issueMeta) continue

		const img = coverTd.querySelector('img')
		const coverSrc = img?.getAttribute('src')
		const coverUrl = coverSrc ? resolveUrl(baseUrl, coverSrc) : undefined
		const sourceKey = quarterlyIssueSourceKey(
			issueMeta.volume,
			issueMeta.issueNumber,
			issueMeta.issueNumberEnd,
		)

		issues.push({
			volume: issueMeta.volume,
			issueNumber: issueMeta.issueNumber,
			issueNumberEnd: issueMeta.issueNumberEnd,
			combinedIssue: issueMeta.combinedIssue,
			season: issueMeta.season,
			publicationDate: issueMeta.publicationDate,
			coverUrl,
			tocNotes: collectNotes(contentTd, headingEl),
			sourceKey,
		})

		const seenTitles = new Set<string>()
		for (const iEl of contentTd.querySelectorAll('i')) {
			const rawTitle = iEl.textContent?.replace(/\s+/g, ' ').trim() ?? ''
			if (!rawTitle) continue
			if (BOILERPLATE.test(rawTitle)) {
				skipped.push({title: rawTitle, reason: 'boilerplate', issueSourceKey: sourceKey})
				continue
			}
			if (ERRATA.test(rawTitle)) continue

			const authorText = authorAfterItalic(iEl)
			if (NOTES_HEAD.test(rawTitle) && !authorText) continue

			const key = `${rawTitle}::${authorText ?? ''}`
			if (seenTitles.has(key)) continue
			seenTitles.add(key)

			articles.push({
				title: rawTitle.replace(/:$/, '').trim(),
				authorText,
				volume: issueMeta.volume,
				issueNumber: issueMeta.issueNumber,
				issueNumberEnd: issueMeta.issueNumberEnd,
				sourceKey: articleStubSourceKey(sourceKey, rawTitle),
			})
		}

		for (const li of contentTd.querySelectorAll('li')) {
			if (li.querySelector('i')) continue
			const text = li.textContent?.replace(/\s+/g, ' ').trim() ?? ''
			if (!text) continue
			const {title, authorText} = splitTitleAuthor(text)
			if (!authorText) {
				skipped.push({title, reason: 'subhead_no_author', issueSourceKey: sourceKey})
				continue
			}
			articles.push({
				title,
				authorText,
				volume: issueMeta.volume,
				issueNumber: issueMeta.issueNumber,
				issueNumberEnd: issueMeta.issueNumberEnd,
				sourceKey: articleStubSourceKey(sourceKey, title),
			})
		}
	}

	return {issues, articles, skipped}
}
