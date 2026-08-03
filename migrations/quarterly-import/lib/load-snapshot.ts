/**
 * Fetch and snapshot TOC + article HTML for a volume.
 */
import fs from 'node:fs'
import path from 'node:path'
import {
	parseTocHtml,
	type TocArticle,
} from './parse-toc'
import {tocPathForVolume} from './cli-config'

export interface SnapshotArticle extends TocArticle {
	htmlPath: string
	rawHtml: string
}

async function fetchText(url: string): Promise<string> {
	const res = await fetch(url)
	if (!res.ok) {
		throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
	}
	return res.text()
}

/**
 * Load TOC (from disk cache or network), then each article HTML.
 */
export async function loadVolumeSnapshot(options: {
	volume: number
	baseUrl: string
	snapshotDir: string
	rowLimit: number
	refresh?: boolean
}): Promise<{articles: SnapshotArticle[]; tocPath: string}> {
	const volumeDir = path.join(options.snapshotDir, `v${options.volume}`)
	fs.mkdirSync(volumeDir, {recursive: true})

	const tocRel = tocPathForVolume(options.volume)
	const tocUrl = `${options.baseUrl}${tocRel}`
	const tocDiskPath = path.join(volumeDir, `qv${options.volume}toc.html`)
	const indexPath = path.join(volumeDir, 'index.json')

	let tocHtml: string
	if (!options.refresh && fs.existsSync(tocDiskPath)) {
		tocHtml = fs.readFileSync(tocDiskPath, 'utf8')
		console.log(`TOC cache: ${tocDiskPath}`)
	} else {
		console.log(`Fetching TOC: ${tocUrl}`)
		tocHtml = await fetchText(tocUrl)
		fs.writeFileSync(tocDiskPath, tocHtml)
	}

	let articles = parseTocHtml(tocHtml, {
		baseUrl: options.baseUrl,
		volume: options.volume,
	})

	if (options.rowLimit < Infinity) {
		articles = articles.slice(0, options.rowLimit)
	}

	fs.writeFileSync(indexPath, JSON.stringify(articles, null, 2))

	const snapshots: SnapshotArticle[] = []
	for (const article of articles) {
		const htmlPath = path.join(volumeDir, `${article.sourceKey}.html`)
		let rawHtml: string
		if (!options.refresh && fs.existsSync(htmlPath)) {
			rawHtml = fs.readFileSync(htmlPath, 'utf8')
		} else {
			console.log(`Fetching article: ${article.sourceUrl}`)
			rawHtml = await fetchText(article.sourceUrl)
			fs.writeFileSync(htmlPath, rawHtml)
		}
		snapshots.push({...article, htmlPath, rawHtml})
	}

	return {articles: snapshots, tocPath: tocDiskPath}
}
