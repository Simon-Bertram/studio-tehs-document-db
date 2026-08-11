/**
 * Parse a volume TOC page into article index entries.
 */
import {parseHTML} from 'linkedom'

export interface TocArticle {
	title: string
	authorText?: string
	volume: number
	issue: number
	publishedDate?: string
	startPage: number
	href: string
	sourceKey: string
	sourceUrl: string
}

function resolveUrl(baseUrl: string, href: string): string {
	try {
		return new URL(href, `${baseUrl}/toc/`).href
	} catch {
		return href
	}
}

function sourceKeyFromHref(href: string): string | null {
	const match = href.match(/(v\d+n\d+p\d+)\.html?/i)
	return match ? match[1].toLowerCase() : null
}

function parseIssueHeading(
	text: string,
): {volume: number; issue: number; publishedDate?: string} | null {
	// Volume 22 Number 1 — January 1984  (em dash or hyphen)
	const match = text.match(/Volume\s+(\d+)\s+Number\s+(\d+)\s*[—–\-]+\s*(.+)/i)
	if (!match) return null
	return {
		volume: Number(match[1]),
		issue: Number(match[2]),
		publishedDate: match[3].trim() || undefined,
	}
}

/**
 * Extract article rows from TOC HTML for one volume page.
 */
export function parseTocHtml(
	html: string,
	options: {baseUrl: string; volume: number},
): TocArticle[] {
	const {document} = parseHTML(html)
	const articles: TocArticle[] = []

	const issueBlocks = document.querySelectorAll('td.hqvitoc')
	for (const block of issueBlocks) {
		const headingEl = block.querySelector('b')
		const headingText = headingEl?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
		const issueMeta = parseIssueHeading(headingText)
		if (!issueMeta) continue

		const rows = block.querySelectorAll('table.vitoc tr')
		for (const row of rows) {
			const pageCell = row.querySelector('td.tocPgNum')
			const titleCell = row.querySelector('td.tocTitle')
			const link = titleCell?.querySelector('a')
			if (!pageCell || !titleCell || !link) continue

			const hrefAttr = link.getAttribute('href')
			if (!hrefAttr) continue

			const startPage = Number(pageCell.textContent?.trim())
			if (!Number.isFinite(startPage)) continue

			const title = link.textContent?.replace(/\s+/g, ' ').trim()
			if (!title) continue

			const cellText = titleCell.textContent?.replace(/\s+/g, ' ').trim() ?? ''
			let authorText: string | undefined
			const byIdx = cellText.toLowerCase().indexOf(' by ')
			if (byIdx !== -1) {
				authorText = cellText.slice(byIdx + 4).trim() || undefined
			}

			const absoluteUrl = resolveUrl(options.baseUrl, hrefAttr)
			const sourceKey = sourceKeyFromHref(hrefAttr) ?? sourceKeyFromHref(absoluteUrl)
			if (!sourceKey) continue

			articles.push({
				title,
				authorText,
				volume: issueMeta.volume,
				issue: issueMeta.issue,
				publishedDate: issueMeta.publishedDate,
				startPage,
				href: hrefAttr,
				sourceKey,
				sourceUrl: absoluteUrl,
			})
		}
	}

	return articles
}
