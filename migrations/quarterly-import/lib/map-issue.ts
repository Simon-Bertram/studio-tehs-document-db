/**
 * Map TOC issue metadata into a quarterlyIssue document shape.
 */
import {type HistoricalDateValue, parseHistoricalDate} from '../../lib/parse-historical-date'
import {quarterlyIssueSourceKey} from '../../lib/quarterly-issue-source-key'

export interface QuarterlyIssueImportDoc {
	_type: 'quarterlyIssue'
	volume: number
	issueNumber: number
	sourceKey: string
	publicationDate?: HistoricalDateValue
}

export function mapSnapshotToIssue(article: {
	volume: number
	issue: number
	publishedDate?: string
}): QuarterlyIssueImportDoc {
	const doc: QuarterlyIssueImportDoc = {
		_type: 'quarterlyIssue',
		volume: article.volume,
		issueNumber: article.issue,
		sourceKey: quarterlyIssueSourceKey(article.volume, article.issue),
	}
	if (article.publishedDate) {
		const parsed = parseHistoricalDate(article.publishedDate)
		if (parsed) doc.publicationDate = parsed
	}
	return doc
}

/**
 * One issue document per unique volume + number, in first-seen order.
 */
export function uniqueIssuesFromArticles(
	articles: Array<{volume: number; issue: number; publishedDate?: string}>,
): QuarterlyIssueImportDoc[] {
	const byKey = new Map<string, QuarterlyIssueImportDoc>()
	for (const article of articles) {
		const key = quarterlyIssueSourceKey(article.volume, article.issue)
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
