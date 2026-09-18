/**
 * Create quarterlyIssue documents from existing quarterlyArticle volume/number
 * fields and point each article at its issue.
 *
 * Does not unset volume / issue / publishedDate on articles. After issueRef
 * is set, run `unset-deprecated-legacy-fields` to drop those keys. This
 * script still reads volume/issue as a fallback when issueRef is missing.
 *
 *   SANITY_AUTH_TOKEN=… bun run migrations/split-quarterly-issue-article/run.ts
 *   SANITY_AUTH_TOKEN=… bun run migrations/split-quarterly-issue-article/run.ts -- --live
 */
import {createClient} from '@sanity/client'

import {
	getSanityWriteToken,
	SANITY_API_VERSION,
	SANITY_DATASET,
	SANITY_PROJECT_ID,
} from '../../lib/sanityEnv'
import {quarterlyIssueSourceKey} from '../lib/quarterly-issue-source-key'

const DRY_RUN = !process.argv.includes('--live')

const token = getSanityWriteToken()
if (!DRY_RUN && !token) {
	console.error('SANITY_API_WRITE_TOKEN is required for live writes. Aborting.')
	process.exit(1)
}

const client = createClient({
	projectId: SANITY_PROJECT_ID,
	dataset: SANITY_DATASET,
	apiVersion: SANITY_API_VERSION,
	token,
	useCdn: false,
	perspective: 'raw',
})

interface HistoricalDateValue {
	_type?: 'historicalDate'
	precision?: string
	qualifier?: string
	year?: number
	month?: number
	date?: string
}

interface ArticleRow {
	_id: string
	volume?: number
	issue?: number
	publishedDate?: HistoricalDateValue
}

interface IssueRow {
	_id: string
	volume?: number
	issueNumber?: number
	sourceKey?: string
}

function isHistoricalDate(value: unknown): value is HistoricalDateValue {
	return typeof value === 'object' && value !== null && 'precision' in value
}

function publicationDateFromArticle(value: unknown): HistoricalDateValue | undefined {
	if (!isHistoricalDate(value) || !value.precision) return undefined
	return {
		_type: 'historicalDate',
		precision: value.precision,
		...(value.qualifier ? {qualifier: value.qualifier} : {}),
		...(value.year != null ? {year: value.year} : {}),
		...(value.month != null ? {month: value.month} : {}),
		...(value.date ? {date: value.date} : {}),
	}
}

function groupKey(volume: number, issueNumber: number): string {
	return `${volume}:${issueNumber}`
}

async function run() {
	console.log(`--- Split quarterly articles into issues (${DRY_RUN ? 'DRY RUN' : 'LIVE'}) ---`)

	const [articles, existingIssues] = await Promise.all([
		client.fetch<ArticleRow[]>(
			`*[_type == "quarterlyArticle" && !defined(issueRef)]{_id, volume, issue, publishedDate}`,
		),
		client.fetch<IssueRow[]>(
			`*[_type == "quarterlyIssue" && !(_id in path("drafts.**"))]{_id, volume, issueNumber, sourceKey}`,
		),
	])

	const issueIdByKey = new Map<string, string>()
	for (const issue of existingIssues) {
		if (issue.volume != null && issue.issueNumber != null) {
			issueIdByKey.set(groupKey(issue.volume, issue.issueNumber), issue._id)
		}
		if (issue.sourceKey) {
			issueIdByKey.set(issue.sourceKey, issue._id)
		}
	}

	const skipped: ArticleRow[] = []
	const groups = new Map<string, ArticleRow[]>()
	for (const article of articles) {
		if (typeof article.volume !== 'number' || typeof article.issue !== 'number') {
			skipped.push(article)
			continue
		}
		const key = groupKey(article.volume, article.issue)
		const list = groups.get(key) ?? []
		list.push(article)
		groups.set(key, list)
	}

	console.log(`Unlinked articles: ${articles.length}`)
	console.log(`Issue groups to ensure: ${groups.size}`)
	if (skipped.length > 0) {
		console.log(`Skipped (missing volume or issue): ${skipped.length}`)
		for (const article of skipped) {
			console.log(`  ${article._id}`)
		}
	}

	type PlannedIssue = {
		volume: number
		issueNumber: number
		sourceKey: string
		publicationDate?: HistoricalDateValue
		existingId?: string
		articleIds: string[]
	}

	const planned: PlannedIssue[] = []
	for (const [key, group] of groups) {
		const [volumeStr, issueStr] = key.split(':')
		const volume = Number(volumeStr)
		const issueNumber = Number(issueStr)
		const sourceKey = quarterlyIssueSourceKey(volume, issueNumber)
		const existingId = issueIdByKey.get(key) ?? issueIdByKey.get(sourceKey)
		let publicationDate: HistoricalDateValue | undefined
		for (const article of group) {
			publicationDate = publicationDateFromArticle(article.publishedDate)
			if (publicationDate) break
		}
		planned.push({
			volume,
			issueNumber,
			sourceKey,
			publicationDate,
			existingId,
			articleIds: group.map((article) => article._id),
		})
	}

	for (const issue of planned) {
		const action = issue.existingId ? `reuse ${issue.existingId}` : 'create'
		console.log(`  ${issue.sourceKey}: ${action}, link ${issue.articleIds.length} article(s)`)
	}

	if (DRY_RUN) {
		console.log('\nDry run complete. Pass --live to write.')
		return
	}

	for (const issue of planned) {
		let issueId = issue.existingId
		if (!issueId) {
			const created = await client.create({
				_type: 'quarterlyIssue',
				volume: issue.volume,
				issueNumber: issue.issueNumber,
				sourceKey: issue.sourceKey,
				...(issue.publicationDate ? {publicationDate: issue.publicationDate} : {}),
			})
			issueId = created._id
			issueIdByKey.set(groupKey(issue.volume, issue.issueNumber), issueId)
			issueIdByKey.set(issue.sourceKey, issueId)
			console.log(`  created quarterlyIssue ${issue.sourceKey} (${issueId})`)
		} else {
			console.log(`  reuse quarterlyIssue ${issue.sourceKey} (${issueId})`)
		}

		for (const articleId of issue.articleIds) {
			await client
				.patch(articleId)
				.set({
					issueRef: {_type: 'reference', _ref: issueId},
				})
				.commit({visibility: 'sync'})
			console.log(`  linked ${articleId} → ${issue.sourceKey}`)
		}
	}

	console.log('Migration complete.')
}

run().catch((err) => {
	console.error(err)
	process.exit(1)
})
