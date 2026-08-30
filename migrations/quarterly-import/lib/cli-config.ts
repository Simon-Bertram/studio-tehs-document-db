/**
 * CLI flags for the TEHS Quarterly HTML and catalog import.
 */
import path from 'node:path'

export type QuarterlyImportMode = 'html-volume' | 'issues' | 'article-stubs' | 'extract'

export interface QuarterlyImportConfig {
	dryRun: boolean
	rowLimit: number
	volume?: number
	maxVolume: number
	mode: QuarterlyImportMode
	refresh: boolean
	reportsDir: string
	snapshotDir: string
	baseUrl: string
}

const DEFAULT_REPORTS = 'migrations/csv-import/reports/quarterly'
const DEFAULT_SNAPSHOT = 'migrations/data/quarterly'
const BASE_URL = 'https://www.tehistory.org/hqda'
const DEFAULT_MAX_VOLUME = 58

function flagNumber(argv: string[], flag: string): number | undefined {
	const idx = argv.indexOf(flag)
	if (idx === -1 || argv[idx + 1] == null) return undefined
	const n = Number(argv[idx + 1])
	return Number.isFinite(n) ? n : undefined
}

export function parseQuarterlyCliConfig(argv: string[]): QuarterlyImportConfig {
	const hasIssues = argv.includes('--issues')
	const hasStubs = argv.includes('--article-stubs')
	const hasExtract = argv.includes('--extract')

	let mode: QuarterlyImportMode = 'html-volume'
	if (hasExtract && !hasIssues && !hasStubs) mode = 'extract'
	else if (hasStubs) mode = 'article-stubs'
	else if (hasIssues) mode = 'issues'

	const volume = flagNumber(argv, '--volume')
	if (mode === 'html-volume') {
		const resolved = volume ?? 22
		if (!Number.isFinite(resolved) || resolved < 1) {
			console.error('Invalid --volume; expected a positive integer (default 22).')
			process.exit(1)
		}
	}

	const maxVolume = flagNumber(argv, '--max-volume') ?? DEFAULT_MAX_VOLUME
	const rowLimit = flagNumber(argv, '--limit') ?? Infinity

	return {
		dryRun: !argv.includes('--live'),
		rowLimit,
		volume: mode === 'html-volume' ? (volume ?? 22) : volume,
		maxVolume,
		mode,
		refresh: argv.includes('--refresh'),
		reportsDir: path.resolve(DEFAULT_REPORTS),
		snapshotDir: path.resolve(DEFAULT_SNAPSHOT),
		baseUrl: BASE_URL,
	}
}

export function tocFileName(volume: number): string {
	return `qv${String(volume).padStart(2, '0')}toc.html`
}

/** TOC path for a volume, e.g. volume 1 → /toc/qv01toc.html, 22 → /toc/qv22toc.html */
export function tocPathForVolume(volume: number): string {
	return `/toc/${tocFileName(volume)}`
}
