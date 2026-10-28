/**
 * Fetch seed pages and same-site article links; write HTML snapshots + manifest.
 */
import fs from 'node:fs'
import path from 'node:path'

import {fetchHtml} from './fetch-html'
import {EXTRACTED_DIR, LINK_INVENTORY_PATH, MANIFEST_PATH, REPORTS_DIR} from './paths'
import {parseHtmlPage} from './parse-page'
import {writeCsv} from './csv'
import {HUB_URLS, isExcludedUrl, SEED_URLS, shouldFollowLink} from './urls'

export interface ManifestPage {
	url: string
	localPath: string
	title: string
	h2: string | null
	isSeed: boolean
	isHub: boolean
	status: number
	ok: boolean
	childUrls: string[]
	imageCount: number
	fetchedAt: string
}

export interface Manifest {
	fetchedAt: string
	pages: ManifestPage[]
	skipped: {url: string; reason: string; fromUrl: string}[]
}

function snapshotRelPath(pageUrl: string): string {
	const url = new URL(pageUrl)
	let pathname = url.pathname
	if (pathname.endsWith('/')) pathname += 'index.html'
	if (!/\.html?$/i.test(pathname)) pathname += '.html'
	const host = url.hostname.replace(/^www\./, '')
	return path.join(host, pathname.replace(/^\//, ''))
}

function ensureDir(dir: string): void {
	fs.mkdirSync(dir, {recursive: true})
}

export async function runExtract(): Promise<Manifest> {
	ensureDir(EXTRACTED_DIR)
	ensureDir(REPORTS_DIR)

	const queue: {url: string; isSeed: boolean}[] = SEED_URLS.map((url) => ({
		url,
		isSeed: true,
	}))
	const seen = new Set<string>()
	const pages: ManifestPage[] = []
	const skipped: Manifest['skipped'] = []
	const linkRows: string[][] = []

	while (queue.length > 0) {
		const next = queue.shift()!
		if (seen.has(next.url)) continue
		seen.add(next.url)

		if (isExcludedUrl(next.url)) {
			skipped.push({url: next.url, reason: 'excluded', fromUrl: 'seed-or-link'})
			linkRows.push([next.url, '', 'skipped', 'excluded'])
			continue
		}

		console.log(`Fetching ${next.url}`)
		const result = await fetchHtml(next.url)
		const rel = snapshotRelPath(next.url)
		const abs = path.join(EXTRACTED_DIR, rel)
		ensureDir(path.dirname(abs))
		fs.writeFileSync(abs, result.text, 'utf8')

		if (!result.ok) {
			pages.push({
				url: next.url,
				localPath: rel,
				title: '',
				h2: null,
				isSeed: next.isSeed,
				isHub: HUB_URLS.has(next.url),
				status: result.status,
				ok: false,
				childUrls: [],
				imageCount: 0,
				fetchedAt: new Date().toISOString(),
			})
			linkRows.push([next.url, '', 'error', `http_${result.status}`])
			continue
		}

		const parsed = parseHtmlPage(result.text, next.url)
		const childUrls: string[] = []

		for (const link of parsed.links) {
			if (link.excluded) {
				skipped.push({url: link.absoluteUrl, reason: 'excluded', fromUrl: next.url})
				linkRows.push([link.absoluteUrl, next.url, 'skipped', 'excluded'])
				continue
			}
			const canFollow =
				next.isSeed && link.follow && shouldFollowLink(link.absoluteUrl, next.url)
			if (canFollow) {
				childUrls.push(link.absoluteUrl)
				linkRows.push([link.absoluteUrl, next.url, 'follow', link.text])
				if (!seen.has(link.absoluteUrl)) {
					// Depth-1 only: follow links from seed/hub pages, not recursively.
					queue.push({url: link.absoluteUrl, isSeed: false})
				}
			} else if (link.follow) {
				childUrls.push(link.absoluteUrl)
				linkRows.push([
					link.absoluteUrl,
					next.url,
					next.isSeed ? 'follow' : 'linked_not_crawled',
					link.text,
				])
			} else {
				linkRows.push([link.absoluteUrl, next.url, 'external_or_out_of_scope', link.text])
			}
		}

		pages.push({
			url: next.url,
			localPath: rel,
			title: parsed.title,
			h2: parsed.h2,
			isSeed: next.isSeed,
			isHub: HUB_URLS.has(next.url),
			status: result.status,
			ok: true,
			childUrls: [...new Set(childUrls)],
			imageCount: parsed.images.length,
			fetchedAt: new Date().toISOString(),
		})
		linkRows.push([next.url, '', 'imported', next.isSeed ? 'seed' : 'followed'])
	}

	const manifest: Manifest = {
		fetchedAt: new Date().toISOString(),
		pages,
		skipped,
	}

	fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8')
	writeCsv(
		LINK_INVENTORY_PATH,
		['url', 'fromUrl', 'disposition', 'detail'],
		linkRows,
	)

	console.log(
		`Extracted ${pages.filter((p) => p.ok).length} pages ` +
			`(${pages.filter((p) => !p.ok).length} errors, ${skipped.length} skipped).`,
	)
	console.log(`Manifest: ${MANIFEST_PATH}`)
	console.log(`Link inventory: ${LINK_INVENTORY_PATH}`)

	return manifest
}
