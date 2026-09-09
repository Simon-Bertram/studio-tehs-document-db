/**
 * Load catalog snapshots from disk (extract first if missing).
 */
import fs from 'node:fs'
import path from 'node:path'

import {tocFileName} from './cli-config'
import {
	DEFAULT_MAX_VOLUME,
	extractCatalogSnapshots,
	HQDA_BASE_URL,
	readHqIndexRows,
} from './extract-catalog'
import {type HqIndexRow, parseHqIndexText} from './parse-hq-index'
import {
	parseQtoc1,
	QTOC1_BASE_URL,
	type Qtoc1Article,
	type Qtoc1Issue,
	type Qtoc1Skip,
} from './parse-qtoc1'
import {parseVolumeCatalog, type TocArticle, type TocIssue} from './parse-toc'

export interface LoadedCatalog {
	tocIssues: TocIssue[]
	tocArticles: TocArticle[]
	qtoc1Issues: Qtoc1Issue[]
	qtoc1Articles: Qtoc1Article[]
	qtoc1Skipped: Qtoc1Skip[]
	pdfRows: HqIndexRow[]
	tocVolumesLoaded: number[]
	tocVolumesMissing: number[]
}

export async function loadCatalogSources(options: {
	snapshotDir: string
	maxVolume?: number
	refresh?: boolean
	extractIfMissing?: boolean
}): Promise<LoadedCatalog> {
	const snapshotDir = options.snapshotDir
	const maxVolume = options.maxVolume ?? DEFAULT_MAX_VOLUME
	const qtoc1Path = path.join(snapshotDir, 'qtoc1.html')

	if (options.refresh || (options.extractIfMissing && !fs.existsSync(qtoc1Path))) {
		await extractCatalogSnapshots({
			snapshotDir,
			maxVolume,
			refresh: options.refresh,
		})
	}

	let qtoc1Issues: Qtoc1Issue[] = []
	let qtoc1Articles: Qtoc1Article[] = []
	let qtoc1Skipped: Qtoc1Skip[] = []
	if (fs.existsSync(qtoc1Path)) {
		const parsed = parseQtoc1(fs.readFileSync(qtoc1Path, 'utf8'), QTOC1_BASE_URL)
		qtoc1Issues = parsed.issues
		qtoc1Articles = parsed.articles
		qtoc1Skipped = parsed.skipped
	}

	const tocIssues: TocIssue[] = []
	const tocArticles: TocArticle[] = []
	const tocVolumesLoaded: number[] = []
	const tocVolumesMissing: number[] = []

	for (let volume = 1; volume <= maxVolume; volume++) {
		const tocPath = path.join(snapshotDir, `v${volume}`, tocFileName(volume))
		if (!fs.existsSync(tocPath)) {
			tocVolumesMissing.push(volume)
			continue
		}
		const parsed = parseVolumeCatalog(fs.readFileSync(tocPath, 'utf8'), {
			baseUrl: HQDA_BASE_URL,
			volume,
		})
		tocIssues.push(...parsed.issues)
		tocArticles.push(...parsed.articles)
		tocVolumesLoaded.push(volume)
	}

	let pdfRows = readHqIndexRows(snapshotDir)
	if (pdfRows.length === 0) {
		const txtPath = path.join(snapshotDir, 'hq-index.txt')
		if (fs.existsSync(txtPath)) {
			pdfRows = parseHqIndexText(fs.readFileSync(txtPath, 'utf8')).rows
		}
	}

	return {
		tocIssues,
		tocArticles,
		qtoc1Issues,
		qtoc1Articles,
		qtoc1Skipped,
		pdfRows,
		tocVolumesLoaded,
		tocVolumesMissing,
	}
}
