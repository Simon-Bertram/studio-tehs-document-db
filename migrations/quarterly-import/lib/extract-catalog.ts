/**
 * Snapshot qtoc1, volume TOCs, and the HQ author-index PDF onto disk.
 */
import fs from 'node:fs'
import path from 'node:path'

import pLimit from 'p-limit'
import {extractText, getDocumentProxy} from 'unpdf'

import {tocFileName, tocPathForVolume} from './cli-config'
import {fetchText} from './fetch-text'
import {parseHqIndexText} from './parse-hq-index'

export const QTOC1_URL = 'https://www.tehistory.org/qtoc1.html'
export const HQDA_BASE_URL = 'https://www.tehistory.org/hqda'
export const DEFAULT_MAX_VOLUME = 58
export const HQ_INDEX_PDF = 'migrations/data/HQ_Index_V1-52.pdf'

export interface TocProbeResult {
	volume: number
	url: string
	status: number
	cachedPath?: string
}

export interface ExtractCatalogResult {
	qtoc1Path: string
	hqIndexTxtPath: string
	hqIndexJsonPath: string
	toc404Path: string
	tocResults: TocProbeResult[]
	hqIndexRows: number
}

const EXTRACT_CONCURRENCY = 4

async function ensureFile(options: {
	diskPath: string
	url: string
	refresh?: boolean
}): Promise<{path: string; status: number; text: string}> {
	if (!options.refresh && fs.existsSync(options.diskPath)) {
		return {path: options.diskPath, status: 200, text: fs.readFileSync(options.diskPath, 'utf8')}
	}
	const fetched = await fetchText(options.url)
	if (fetched.ok) {
		fs.mkdirSync(path.dirname(options.diskPath), {recursive: true})
		fs.writeFileSync(options.diskPath, fetched.text)
	}
	return {path: options.diskPath, status: fetched.status, text: fetched.text}
}

/**
 * Fetch qtoc1 + volume TOCs 1…maxVolume, extract HQ_Index PDF text/JSON.
 */
export async function extractCatalogSnapshots(options: {
	snapshotDir: string
	maxVolume?: number
	refresh?: boolean
	hqIndexPdf?: string
}): Promise<ExtractCatalogResult> {
	const snapshotDir = options.snapshotDir
	const maxVolume = options.maxVolume ?? DEFAULT_MAX_VOLUME
	fs.mkdirSync(snapshotDir, {recursive: true})

	const qtoc1Path = path.join(snapshotDir, 'qtoc1.html')
	console.log(`qtoc1: ${QTOC1_URL}`)
	const qtoc1 = await ensureFile({
		diskPath: qtoc1Path,
		url: QTOC1_URL,
		refresh: options.refresh,
	})
	if (!qtoc1.text && qtoc1.status !== 200) {
		console.warn(`[WARN] qtoc1 fetch failed: HTTP ${qtoc1.status}`)
	}

	const limit = pLimit(EXTRACT_CONCURRENCY)
	const tocResults: TocProbeResult[] = []
	const tasks = Array.from({length: maxVolume}, (_, i) => i + 1).map((volume) =>
		limit(async () => {
			const rel = tocPathForVolume(volume)
			const url = `${HQDA_BASE_URL}${rel}`
			const volumeDir = path.join(snapshotDir, `v${volume}`)
			const diskPath = path.join(volumeDir, tocFileName(volume))
			if (!options.refresh && fs.existsSync(diskPath)) {
				tocResults.push({volume, url, status: 200, cachedPath: diskPath})
				return
			}
			const fetched = await fetchText(url)
			if (fetched.ok) {
				fs.mkdirSync(volumeDir, {recursive: true})
				fs.writeFileSync(diskPath, fetched.text)
				tocResults.push({volume, url, status: fetched.status, cachedPath: diskPath})
				console.log(`[OK] volume ${volume} TOC (${fetched.status})`)
			} else {
				tocResults.push({volume, url, status: fetched.status})
				console.log(`[MISS] volume ${volume} TOC HTTP ${fetched.status}`)
			}
		}),
	)
	await Promise.all(tasks)
	tocResults.sort((a, b) => a.volume - b.volume)

	const missing = tocResults.filter((r) => r.status !== 200)
	const toc404Path = path.join(snapshotDir, 'toc-404s.json')
	fs.writeFileSync(
		toc404Path,
		JSON.stringify(
			missing.map((r) => ({volume: r.volume, url: r.url, status: r.status})),
			null,
			2,
		),
	)
	console.log(
		`Volume TOCs: ${tocResults.length - missing.length} cached, ${missing.length} missing`,
	)

	const pdfPath = path.resolve(options.hqIndexPdf ?? HQ_INDEX_PDF)
	const hqIndexTxtPath = path.join(snapshotDir, 'hq-index.txt')
	const hqIndexJsonPath = path.join(snapshotDir, 'hq-index.json')
	let hqIndexRows = 0

	if (fs.existsSync(pdfPath)) {
		console.log(`Extracting PDF: ${pdfPath}`)
		const buf = fs.readFileSync(pdfPath)
		const pdf = await getDocumentProxy(new Uint8Array(buf))
		const extracted = await extractText(pdf, {mergePages: true})
		const text = Array.isArray(extracted.text) ? extracted.text.join('\n') : extracted.text
		fs.writeFileSync(hqIndexTxtPath, text)
		const parsed = parseHqIndexText(text)
		hqIndexRows = parsed.rows.length
		fs.writeFileSync(
			hqIndexJsonPath,
			JSON.stringify(
				{
					rowCount: parsed.rows.length,
					unparsed: parsed.unparsedLines,
					rows: parsed.rows,
				},
				null,
				2,
			),
		)
		console.log(
			`HQ index: ${parsed.rows.length} rows, ${parsed.unparsedLines.length} unparsed lines`,
		)
	} else {
		console.warn(`[WARN] HQ index PDF not found: ${pdfPath}`)
	}

	return {
		qtoc1Path,
		hqIndexTxtPath,
		hqIndexJsonPath,
		toc404Path,
		tocResults,
		hqIndexRows,
	}
}

export function readHqIndexRows(snapshotDir: string): HqIndexRow[] {
	const jsonPath = path.join(snapshotDir, 'hq-index.json')
	if (!fs.existsSync(jsonPath)) return []
	const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as {rows?: HqIndexRow[]}
	return parsed.rows ?? []
}
