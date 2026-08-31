/**
 * Map TOC issue metadata into a quarterlyIssue document shape.
 */
import {yearSearchTokens} from '../../../schemaTypes/lib/yearSearchTokens'
import {type HistoricalDateValue, parseHistoricalDate} from '../../lib/parse-historical-date'
import {quarterlyIssueSourceKey} from '../../lib/quarterly-issue-source-key'

export interface QuarterlyIssueImportDoc {
	_type: 'quarterlyIssue'
	volume: number
	issueNumber: number
	issueNumberEnd?: number
	combinedIssue?: boolean
	sourceKey: string
	publicationDate?: HistoricalDateValue
	yearSearch?: string
}

export function mapSnapshotToIssue(article: {
	volume: number
	issue: number
	issueNumberEnd?: number
	publishedDate?: string
}): QuarterlyIssueImportDoc {
	const doc: QuarterlyIssueImportDoc = {
		_type: 'quarterlyIssue',
		volume: article.volume,
		issueNumber: article.issue,
		issueNumberEnd: article.issueNumberEnd,
		combinedIssue: article.issueNumberEnd != null && article.issueNumberEnd !== article.issue,
		sourceKey: quarterlyIssueSourceKey(article.volume, article.issue, article.issueNumberEnd),
	}
	if (article.publishedDate) {
		const parsed = parseHistoricalDate(article.publishedDate)
		if (parsed) {
			doc.publicationDate = parsed
			const yearSearch = yearSearchTokens(parsed)
			if (yearSearch) doc.yearSearch = yearSearch
		}
	}
	return doc
}

/**
 * One issue document per unique volume + number, in first-seen order.
 */
export function uniqueIssuesFromArticles(
	articles: Array<{
		volume: number
		issue: number
		issueNumberEnd?: number
		publishedDate?: string
	}>,
): QuarterlyIssueImportDoc[] {
	const byKey = new Map<string, QuarterlyIssueImportDoc>()
	for (const article of articles) {
		const key = quarterlyIssueSourceKey(article.volume, article.issue, article.issueNumberEnd)
		const existing = byKey.get(key)
		if (!existing) {
			byKey.set(key, mapSnapshotToIssue(article))
			continue
		}
		if (!existing.publicationDate && article.publishedDate) {
			byKey.set(key, mapSnapshotToIssue(article))
		}
	}
	return [...byKey.values()]
}
