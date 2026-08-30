/**
 * Union issue records and merge article stubs from volume TOC, qtoc1, and PDF.
 */
import {type HistoricalDateValue} from '../../lib/parse-historical-date'
import {type QuarterlySeason} from '../../lib/parse-issue-heading'
import {quarterlyIssueSourceKey} from '../../lib/quarterly-issue-source-key'
import {articleStubSourceKey, normalizeTitle} from './article-source-key'
import type {HqIndexRow} from './parse-hq-index'
import type {Qtoc1Article, Qtoc1Issue} from './parse-qtoc1'
import type {TocArticle, TocIssue} from './parse-toc'

export type CatalogSource = 'volume-toc' | 'qtoc1' | 'pdf'

export interface CatalogIssue {
	volume: number
	issueNumber: number
	issueNumberEnd?: number
	combinedIssue: boolean
	season?: QuarterlySeason
	publicationDate?: HistoricalDateValue
	coverUrl?: string
	tocNotes?: string
	sourceKey: string
	source: CatalogSource
}

export interface CatalogStub {
	title: string
	authorText?: string
	issueSourceKey: string
	volume: number
	issueNumber: number
	startPage?: number
	endPage?: number
	pageLabel?: string
	sourceUrl?: string
	sourceKey: string
	summary?: string
	origin: CatalogSource
}

export interface UnmatchedIndexRow {
	authorText: string
	title: string
	citation: string
	volume: number
	issueNumber: number
	startPage: number
	reason: 'unmatched_issue' | 'unparsed'
}

function identityKey(volume: number, issueNumber: number): string {
	return `${volume}:${issueNumber}`
}

function fillIssue(preferred: CatalogIssue, fallback: CatalogIssue): CatalogIssue {
	return {
		...fallback,
		...preferred,
		season: preferred.season ?? fallback.season,
		publicationDate: preferred.publicationDate ?? fallback.publicationDate,
		coverUrl: preferred.coverUrl ?? fallback.coverUrl,
		tocNotes: preferred.tocNotes ?? fallback.tocNotes,
		issueNumberEnd: preferred.issueNumberEnd ?? fallback.issueNumberEnd,
		combinedIssue: preferred.combinedIssue || fallback.combinedIssue,
		sourceKey: preferred.combinedIssue
			? preferred.sourceKey
			: preferred.sourceKey || fallback.sourceKey,
		source: preferred.source,
	}
}

function fromTocIssue(issue: TocIssue): CatalogIssue {
	return {
		volume: issue.volume,
		issueNumber: issue.issueNumber,
		issueNumberEnd: issue.issueNumberEnd,
		combinedIssue: issue.combinedIssue,
		season: issue.season,
		publicationDate: issue.publicationDate,
		coverUrl: issue.coverUrl,
		tocNotes: issue.tocNotes,
		sourceKey: issue.sourceKey,
		source: 'volume-toc',
	}
}

function fromQtoc1Issue(issue: Qtoc1Issue): CatalogIssue {
	return {
		volume: issue.volume,
		issueNumber: issue.issueNumber,
		issueNumberEnd: issue.issueNumberEnd,
		combinedIssue: issue.combinedIssue,
		season: issue.season,
		publicationDate: issue.publicationDate,
		coverUrl: issue.coverUrl,
		tocNotes: issue.tocNotes,
		sourceKey: issue.sourceKey,
		source: 'qtoc1',
	}
}

function fromPdfIssue(row: HqIndexRow): CatalogIssue | null {
	const maxNumber = row.volume === 1 ? 5 : 4
	if (row.issueNumber < 1 || row.issueNumber > maxNumber) return null
	if (row.issueNumberEnd != null && row.issueNumberEnd > maxNumber) return null
	return {
		volume: row.volume,
		issueNumber: row.issueNumber,
		issueNumberEnd: row.issueNumberEnd,
		combinedIssue: row.issueNumberEnd != null && row.issueNumberEnd !== row.issueNumber,
		sourceKey: quarterlyIssueSourceKey(row.volume, row.issueNumber, row.issueNumberEnd),
		source: 'pdf',
	}
}

function putIssue(map: Map<string, CatalogIssue>, issue: CatalogIssue, preferred: boolean) {
	const key = identityKey(issue.volume, issue.issueNumber)
	const existing = map.get(key)
	if (!existing) {
		map.set(key, issue)
		return
	}
	map.set(key, preferred ? fillIssue(issue, existing) : fillIssue(existing, issue))
}

/**
 * Volume TOC heading wins, then qtoc1, then PDF-inferred volume+number.
 */
export function unionIssues(options: {
	tocIssues: TocIssue[]
	qtoc1Issues: Qtoc1Issue[]
	pdfRows: HqIndexRow[]
}): CatalogIssue[] {
	const map = new Map<string, CatalogIssue>()
	for (const row of options.pdfRows) {
		const inferred = fromPdfIssue(row)
		if (inferred) putIssue(map, inferred, false)
	}
	for (const issue of options.qtoc1Issues) putIssue(map, fromQtoc1Issue(issue), true)
	for (const issue of options.tocIssues) putIssue(map, fromTocIssue(issue), true)
	return [...map.values()].sort((a, b) => a.volume - b.volume || a.issueNumber - b.issueNumber)
}

function stubFromToc(article: TocArticle, issue: CatalogIssue): CatalogStub {
	return {
		title: article.title,
		authorText: article.authorText,
		issueSourceKey: issue.sourceKey,
		volume: issue.volume,
		issueNumber: issue.issueNumber,
		startPage: article.startPage,
		pageLabel: article.pageLabel,
		sourceUrl: article.sourceUrl,
		sourceKey: article.sourceKey ?? articleStubSourceKey(issue.sourceKey, article.title),
		origin: 'volume-toc',
	}
}

function stubFromQtoc1(article: Qtoc1Article, issue: CatalogIssue): CatalogStub {
	return {
		title: article.title,
		authorText: article.authorText,
		issueSourceKey: issue.sourceKey,
		volume: issue.volume,
		issueNumber: issue.issueNumber,
		sourceKey: articleStubSourceKey(issue.sourceKey, article.title),
		origin: 'qtoc1',
	}
}

function stubFromPdf(row: HqIndexRow, issue: CatalogIssue): CatalogStub {
	return {
		title: row.title,
		authorText: row.authorText,
		issueSourceKey: issue.sourceKey,
		volume: issue.volume,
		issueNumber: issue.issueNumber,
		startPage: row.startPage,
		endPage: row.endPage,
		sourceKey: articleStubSourceKey(issue.sourceKey, row.title),
		origin: 'pdf',
	}
}

function mergeStub(preferred: CatalogStub, fallback: CatalogStub): CatalogStub {
	return {
		...fallback,
		...preferred,
		title: preferred.title || fallback.title,
		authorText: preferred.authorText ?? fallback.authorText,
		startPage: preferred.startPage ?? fallback.startPage,
		endPage: preferred.endPage ?? fallback.endPage,
		pageLabel: preferred.pageLabel ?? fallback.pageLabel,
		sourceUrl: preferred.sourceUrl ?? fallback.sourceUrl,
		summary: preferred.summary ?? fallback.summary,
		sourceKey: preferred.sourceUrl
			? preferred.sourceKey
			: preferred.sourceKey || fallback.sourceKey,
		origin: preferred.origin,
	}
}

function findIssue(
	issues: CatalogIssue[],
	volume: number,
	issueNumber: number,
	issueNumberEnd?: number,
): CatalogIssue | undefined {
	const key = identityKey(volume, issueNumber)
	const byIdentity = issues.find((issue) => identityKey(issue.volume, issue.issueNumber) === key)
	if (byIdentity) return byIdentity
	if (issueNumberEnd != null) {
		return issues.find(
			(issue) =>
				issue.volume === volume &&
				issue.issueNumber === issueNumber &&
				issue.issueNumberEnd === issueNumberEnd,
		)
	}
	return undefined
}

function matchExisting(
	stubs: CatalogStub[],
	candidate: {title: string; startPage?: number; issueSourceKey: string},
): CatalogStub | undefined {
	const byPage =
		candidate.startPage != null
			? stubs.find(
					(stub) =>
						stub.issueSourceKey === candidate.issueSourceKey &&
						stub.startPage === candidate.startPage,
				)
			: undefined
	if (byPage) return byPage
	const normalized = normalizeTitle(candidate.title)
	return stubs.find(
		(stub) =>
			stub.issueSourceKey === candidate.issueSourceKey && normalizeTitle(stub.title) === normalized,
	)
}

function inferEndPages(stubs: CatalogStub[]): CatalogStub[] {
	const byIssue = new Map<string, CatalogStub[]>()
	for (const stub of stubs) {
		const list = byIssue.get(stub.issueSourceKey) ?? []
		list.push(stub)
		byIssue.set(stub.issueSourceKey, list)
	}
	for (const list of byIssue.values()) {
		const numbered = list
			.filter((stub) => stub.startPage != null)
			.sort((a, b) => (a.startPage ?? 0) - (b.startPage ?? 0))
		for (let i = 0; i < numbered.length - 1; i++) {
			const current = numbered[i]
			const next = numbered[i + 1]
			if (current.endPage != null) continue
			if (current.startPage == null || next.startPage == null) continue
			if (next.startPage <= current.startPage) continue
			current.endPage = next.startPage - 1
		}
	}
	return stubs
}

/**
 * Prefer volume TOC rows, then qtoc1, then PDF. PDF rows that cannot attach
 * to an issue are returned as unmatched.
 */
export function mergeArticleStubs(options: {
	issues: CatalogIssue[]
	tocArticles: TocArticle[]
	qtoc1Articles: Qtoc1Article[]
	pdfRows: HqIndexRow[]
}): {stubs: CatalogStub[]; unmatched: UnmatchedIndexRow[]} {
	const stubs: CatalogStub[] = []
	const unmatched: UnmatchedIndexRow[] = []

	for (const article of options.tocArticles) {
		const issue = findIssue(options.issues, article.volume, article.issue, article.issueNumberEnd)
		if (!issue) continue
		const next = stubFromToc(article, issue)
		const existing = matchExisting(stubs, next)
		if (existing) {
			const merged = mergeStub(next, existing)
			Object.assign(existing, merged)
		} else {
			stubs.push(next)
		}
	}

	for (const article of options.qtoc1Articles) {
		const issue = findIssue(
			options.issues,
			article.volume,
			article.issueNumber,
			article.issueNumberEnd,
		)
		if (!issue) continue
		const next = stubFromQtoc1(article, issue)
		const existing = matchExisting(stubs, next)
		if (existing) {
			const merged = mergeStub(existing, next)
			Object.assign(existing, merged)
			if (!existing.authorText && next.authorText) existing.authorText = next.authorText
		} else {
			stubs.push(next)
		}
	}

	for (const row of options.pdfRows) {
		const issue = findIssue(options.issues, row.volume, row.issueNumber, row.issueNumberEnd)
		if (!issue) {
			unmatched.push({
				authorText: row.authorText,
				title: row.title,
				citation: row.citation,
				volume: row.volume,
				issueNumber: row.issueNumber,
				startPage: row.startPage,
				reason: 'unmatched_issue',
			})
			continue
		}
		const next = stubFromPdf(row, issue)
		const existing = matchExisting(stubs, next)
		if (existing) {
			const merged = mergeStub(existing, next)
			Object.assign(existing, merged)
			if (!existing.authorText && next.authorText) existing.authorText = next.authorText
			if (existing.startPage == null) existing.startPage = next.startPage
			if (existing.endPage == null && next.endPage != null) existing.endPage = next.endPage
		} else {
			stubs.push(next)
		}
	}

	return {stubs: inferEndPages(stubs), unmatched}
}

export function catalogIssueDoc(issue: CatalogIssue): {
	_type: 'quarterlyIssue'
	volume: number
	issueNumber: number
	combinedIssue: boolean
	issueNumberEnd?: number
	season?: QuarterlySeason
	publicationDate?: HistoricalDateValue
	sourceKey: string
	tocNotes?: string
	coverUrl?: string
} {
	return {
		_type: 'quarterlyIssue',
		volume: issue.volume,
		issueNumber: issue.issueNumber,
		combinedIssue: issue.combinedIssue,
		issueNumberEnd: issue.issueNumberEnd,
		season: issue.season,
		publicationDate: issue.publicationDate,
		sourceKey: issue.sourceKey,
		tocNotes: issue.tocNotes,
		coverUrl: issue.coverUrl,
	}
}
