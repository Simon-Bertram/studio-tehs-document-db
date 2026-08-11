/**
 * CLI flags for the TEHS Quarterly HTML import.
 */
import path from 'node:path'

export interface QuarterlyImportConfig {
	dryRun: boolean
	rowLimit: number
	volume: number
	reportsDir: string
	snapshotDir: string
	baseUrl: string
}

const DEFAULT_REPORTS = 'migrations/csv-import/reports/quarterly'
const DEFAULT_SNAPSHOT = 'migrations/data/quarterly'
const BASE_URL = 'https://www.tehistory.org/hqda'

export function parseQuarterlyCliConfig(argv: string[]): QuarterlyImportConfig {
	const limitIdx = argv.indexOf('--limit')
	const rowLimit = limitIdx !== -1 && argv[limitIdx + 1] ? Number(argv[limitIdx + 1]) : Infinity

	const volumeIdx = argv.indexOf('--volume')
	const volume = volumeIdx !== -1 && argv[volumeIdx + 1] ? Number(argv[volumeIdx + 1]) : 22

	if (!Number.isFinite(volume) || volume < 1) {
		console.error('Invalid --volume; expected a positive integer (default 22).')
		process.exit(1)
	}

	return {
		dryRun: !argv.includes('--live'),
		rowLimit,
		volume,
		reportsDir: path.resolve(DEFAULT_REPORTS),
		snapshotDir: path.resolve(DEFAULT_SNAPSHOT),
		baseUrl: BASE_URL,
	}
}

/** TOC path for a volume, e.g. volume 22 → /toc/qv22toc.html */
export function tocPathForVolume(volume: number): string {
	return `/toc/qv${volume}toc.html`
}
