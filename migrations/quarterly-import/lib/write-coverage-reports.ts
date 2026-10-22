/**
 * Coverage reports: TOC 404s and PDF-only articles (stubs, no body/asset import).
 */
import fs from 'node:fs'
import path from 'node:path'

import {toCsv} from '../../csv-import/lib/write-reports'
import {tocPathForVolume} from './cli-config'
import type {CatalogStub} from './merge-catalog'
import {isPdfArticleUrl} from './parse-toc'

export interface Toc404Row {
	volume: number
	url: string
	status: number | string
	stubSource: string
	notes: string
}

export interface PdfArticleRow {
	volume: number
	issueSourceKey: string
	title: string
	sourceKey: string
	pdfUrl: string
	willImportStub: 'yes'
	willImportBody: 'no'
	willUploadPdfAsset: 'no'
	notes: string
}

const PDF_NOTES =
	'Metadata stub + issueRef only; no HTML body; PDF not uploaded to Sanity in this migration'

/**
 * Build TOC-404 rows from extract snapshot + missing-on-disk volumes.
 */
export function buildToc404Rows(options: {
	baseUrl: string
	toc404Path: string
	tocVolumesMissing: number[]
	qtoc1Volumes: number[]
}): Toc404Row[] {
	const byVolume = new Map<number, Toc404Row>()

	if (fs.existsSync(options.toc404Path)) {
		try {
			const raw = JSON.parse(fs.readFileSync(options.toc404Path, 'utf8')) as Array<{
				volume: number
				url?: string
				status?: number
			}>
			for (const row of raw) {
				const fromQtoc1 = options.qtoc1Volumes.includes(row.volume)
				byVolume.set(row.volume, {
					volume: row.volume,
					url: row.url ?? `${options.baseUrl}${tocPathForVolume(row.volume)}`,
					status: row.status ?? 404,
					stubSource: fromQtoc1 ? 'qtoc1' : 'none',
					notes: fromQtoc1
						? 'Volume TOC 404; article stubs still import from qtoc1'
						: 'Volume TOC 404; no qtoc1 coverage for this volume',
				})
			}
		} catch {
			// ignore malformed snapshot
		}
	}

	for (const volume of options.tocVolumesMissing) {
		if (byVolume.has(volume)) continue
		const fromQtoc1 = options.qtoc1Volumes.includes(volume)
		byVolume.set(volume, {
			volume,
			url: `${options.baseUrl}${tocPathForVolume(volume)}`,
			status: 'missing',
			stubSource: fromQtoc1 ? 'qtoc1' : 'none',
			notes: fromQtoc1
				? 'TOC file missing on disk; article stubs still import from qtoc1'
				: 'TOC file missing on disk; no qtoc1 coverage for this volume',
		})
	}

	return [...byVolume.values()].sort((a, b) => a.volume - b.volume)
}

/**
 * PDF-linked stubs (willImportBody=no).
 */
export function buildPdfArticleRows(stubs: CatalogStub[]): PdfArticleRow[] {
	const rows: PdfArticleRow[] = []
	for (const stub of stubs) {
		if (!isPdfArticleUrl(stub.sourceUrl)) continue
		rows.push({
			volume: stub.volume,
			issueSourceKey: stub.issueSourceKey,
			title: stub.title,
			sourceKey: stub.sourceKey,
			pdfUrl: stub.sourceUrl ?? '',
			willImportStub: 'yes',
			willImportBody: 'no',
			willUploadPdfAsset: 'no',
			notes: PDF_NOTES,
		})
	}
	return rows.sort(
		(a, b) => a.volume - b.volume || a.sourceKey.localeCompare(b.sourceKey),
	)
}

export function writeCoverageReports(
	reportsDir: string,
	options: {
		toc404Rows: Toc404Row[]
		pdfArticleRows: PdfArticleRow[]
	},
): {toc404Path: string; pdfArticlesPath: string} {
	fs.mkdirSync(reportsDir, {recursive: true})

	const toc404Path = path.join(reportsDir, 'toc-404s.csv')
	fs.writeFileSync(
		toc404Path,
		toCsv(
			['volume', 'url', 'status', 'stubSource', 'notes'],
			options.toc404Rows.map((row) => [
				String(row.volume),
				row.url,
				String(row.status),
				row.stubSource,
				row.notes,
			]),
		),
	)

	const pdfArticlesPath = path.join(reportsDir, 'pdf-articles.csv')
	fs.writeFileSync(
		pdfArticlesPath,
		toCsv(
			[
				'volume',
				'issueSourceKey',
				'title',
				'sourceKey',
				'pdfUrl',
				'willImportStub',
				'willImportBody',
				'willUploadPdfAsset',
				'notes',
			],
			options.pdfArticleRows.map((row) => [
				String(row.volume),
				row.issueSourceKey,
				row.title,
				row.sourceKey,
				row.pdfUrl,
				row.willImportStub,
				row.willImportBody,
				row.willUploadPdfAsset,
				row.notes,
			]),
		),
	)

	console.log(`TOC 404s: ${options.toc404Rows.length} → ${toc404Path}`)
	console.log(
		`PDF-only articles: ${options.pdfArticleRows.length} (stubs only; bodies/assets not imported) → ${pdfArticlesPath}`,
	)

	return {toc404Path, pdfArticlesPath}
}
