/**
 * Parse a volume TOC page into issue records and article index entries.
 */
import {parseHTML} from 'linkedom'

import {type HistoricalDateValue} from '../../lib/parse-historical-date'
import {parseIssueHeading, type QuarterlySeason} from '../../lib/parse-issue-heading'
import {quarterlyIssueSourceKey} from '../../lib/quarterly-issue-source-key'
import {articleStubSourceKey} from './article-source-key'

export interface TocArticle {
	title: string
	authorText?: string
	volume: number
	issue: number
	issueNumberEnd?: number
	publishedDate?: string
	startPage?: number
	pageLabel?: string
	href?: string
	sourceKey?: string
	sourceUrl?: string
}

export type TocLinkedArticle = TocArticle & {
	startPage: number
	sourceKey: string
	sourceUrl: string
}

export interface TocIssue {
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

function resolveUrl(baseUrl: string, href: string): string {
	try {
		return new URL(href, `${baseUrl}/toc/`).href
	} catch {
		return href
	}
}

export function sourceKeyFromHref(href: string): string | null {
	const match = href.match(/v(\d+)n(\d+)(?:\+(\d+))?p(\d+)\.html?/i)
	if (!match) return null
	const volume = Number(match[1])
	const issueNumber = Number(match[2])
	const issueNumberEnd = match[3] ? Number(match[3]) : undefined
	const page = match[4]
	const issuePart =
		issueNumberEnd != null && issueNumberEnd !== issueNumber
			? `${issueNumber}+${issueNumberEnd}`
			: String(issueNumber)
	return `v${volume}n${issuePart}p${page}`
}

function combinedFromHref(href: string): {issueNumber: number; issueNumberEnd?: number} | null {
	const match = href.match(/v\d+n(\d+)(?:\+(\d+))?p/i)
	if (!match) return null
	const issueNumber = Number(match[1])
	const issueNumberEnd = match[2] ? Number(match[2]) : undefined
	return {issueNumber, issueNumberEnd}
}

function parsePage(raw: string): {startPage?: number; pageLabel?: string} {
	const text = raw.replace(/\s+/g, ' ').trim()
	if (!text) return {}
	const n = Number(text)
	if (Number.isFinite(n)) return {startPage: n}
	return {pageLabel: text}
}

function isLinkedArticle(article: TocArticle): article is TocLinkedArticle {
	return article.startPage != null && Boolean(article.sourceKey) && Boolean(article.sourceUrl)
}

/**
 * Extract article rows from TOC HTML for one volume page (HTML body import).
 * Skips rows without a numeric start page or article href.
 */
export function parseTocHtml(
	html: string,
	options: {baseUrl: string; volume: number},
): TocLinkedArticle[] {
	return parseVolumeCatalog(html, options).articles.filter(isLinkedArticle)
}

/**
 * Extract issues and article stubs from one volume TOC page.
 */
export function parseVolumeCatalog(
	html: string,
	options: {baseUrl: string; volume: number},
): {issues: TocIssue[]; articles: TocArticle[]} {
	const {document} = parseHTML(html)
	const issues: TocIssue[] = []
	const articles: TocArticle[] = []

	const volumeNote = document
		.querySelector('p.tocEditNote')
		?.textContent?.replace(/\s+/g, ' ')
		.trim()

	const issueBlocks = document.querySelectorAll('td.hqvitoc')
	for (const block of issueBlocks) {
		const headingEl = block.querySelector('b')
		const headingText = headingEl?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
		const issueMeta = parseIssueHeading(headingText)
		if (!issueMeta) continue

		const coverTd = block.previousElementSibling
		const coverSrc = coverTd?.querySelector?.('img')?.getAttribute('src')
		const coverUrl = coverSrc ? resolveUrl(options.baseUrl, coverSrc) : undefined

		let issueNumberEnd = issueMeta.issueNumberEnd
		let combinedIssue = issueMeta.combinedIssue

		const rows = [...block.querySelectorAll('table.vitoc tr')]
		for (const row of rows) {
			const titleCell = row.querySelector('td.tocTitle, td.tocsubTitle')
			const link = titleCell?.querySelector('a')
			const hrefAttr = link?.getAttribute('href') ?? undefined
			if (!hrefAttr) continue
			const fromHref = combinedFromHref(hrefAttr)
			if (fromHref?.issueNumberEnd != null) {
				issueNumberEnd = fromHref.issueNumberEnd
				combinedIssue = true
			}
		}

		const sourceKey = quarterlyIssueSourceKey(
			issueMeta.volume,
			issueMeta.issueNumber,
			issueNumberEnd,
		)

		issues.push({
			volume: issueMeta.volume,
			issueNumber: issueMeta.issueNumber,
			issueNumberEnd,
			combinedIssue,
			season: issueMeta.season,
			publicationDate: issueMeta.publicationDate,
			coverUrl,
			tocNotes: volumeNote || undefined,
			sourceKey,
		})

		for (const row of rows) {
			const pageCell = row.querySelector('td.tocPgNum')
			const titleCell = row.querySelector('td.tocTitle, td.tocsubTitle')
			if (!pageCell || !titleCell) continue

			const link = titleCell.querySelector('a')
			const hrefAttr = link?.getAttribute('href') ?? undefined
			const title = (link?.textContent ?? titleCell.textContent)?.replace(/\s+/g, ' ').trim()
			if (!title) continue

			const {startPage, pageLabel} = parsePage(pageCell.textContent ?? '')
			if (!hrefAttr && startPage == null && !pageLabel) continue

			const cellText = titleCell.textContent?.replace(/\s+/g, ' ').trim() ?? ''
			let authorText: string | undefined
			const byIdx = cellText.toLowerCase().indexOf(' by ')
			if (byIdx !== -1) {
				authorText = cellText.slice(byIdx + 4).trim() || undefined
			}

			const absoluteUrl = hrefAttr ? resolveUrl(options.baseUrl, hrefAttr) : undefined
			const htmlKey = hrefAttr
				? (sourceKeyFromHref(hrefAttr) ?? sourceKeyFromHref(absoluteUrl ?? '') ?? undefined)
				: undefined

			articles.push({
				title,
				authorText,
				volume: issueMeta.volume,
				issue: issueMeta.issueNumber,
				issueNumberEnd,
				publishedDate: issueMeta.dateText,
				startPage,
				pageLabel,
				href: hrefAttr,
				sourceKey: htmlKey ?? articleStubSourceKey(sourceKey, title),
				sourceUrl: hrefAttr ? absoluteUrl : undefined,
			})
		}
	}

	return {issues, articles}
}
