/**
 * CLI flag parsing for the CSV import.
 * Isolates argv → ImportConfig so the pipeline never reads process.argv directly.
 */
import path from 'node:path'

export interface ImportConfig {
	dryRun: boolean
	rowLimit: number
	rowOffset: number
	csvPath: string
	reportsDir: string
}

export interface CliDefaults {
	csvPath: string
	reportsDir: string
}

const DEFAULT_DOCUMENTS: CliDefaults = {
	csvPath: 'migrations/data/documents.csv',
	reportsDir: 'migrations/csv-import/reports',
}

function flagNumber(argv: string[], flag: string): number | undefined {
	const idx = argv.indexOf(flag)
	if (idx === -1 || !argv[idx + 1]) return undefined
	const n = Number(argv[idx + 1])
	return Number.isFinite(n) ? n : undefined
}

/**
 * Per-batch report folder, e.g. `offset-1000-limit-1000`.
 */
export function batchReportsDir(baseDir: string, rowOffset: number, rowLimit: number): string {
	const limitLabel = Number.isFinite(rowLimit) ? String(rowLimit) : 'all'
	return path.join(baseDir, `offset-${rowOffset}-limit-${limitLabel}`)
}

export function parseCliConfig(
	argv: string[],
	defaults: CliDefaults = DEFAULT_DOCUMENTS,
): ImportConfig {
	const parsedLimit = flagNumber(argv, '--limit')
	const parsedOffset = flagNumber(argv, '--offset')
	const rowLimit = parsedLimit !== undefined && parsedLimit >= 0 ? parsedLimit : Infinity
	const rowOffset = parsedOffset !== undefined && parsedOffset >= 0 ? Math.floor(parsedOffset) : 0

	return {
		// Default is dry-run; pass --live to write to Sanity.
		dryRun: !argv.includes('--live'),
		rowLimit,
		rowOffset,
		csvPath: path.resolve(argv.find((a) => a.endsWith('.csv')) ?? defaults.csvPath),
		reportsDir: path.resolve(defaults.reportsDir),
	}
}
