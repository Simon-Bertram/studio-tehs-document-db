/**
 * CLI flag parsing for the CSV import.
 * Isolates argv → ImportConfig so the pipeline never reads process.argv directly.
 */
import path from 'node:path'

export interface ImportConfig {
	dryRun: boolean
	rowLimit: number
	rowOffset: number
	/** When set, only rows whose normalized clipID is in this list are imported. */
	clipIds: string[] | null
	csvPath: string
	reportsDir: string
}

export interface CliDefaults {
	csvPath: string
	reportsDir: string
}

const DEFAULT_DOCUMENTS: CliDefaults = {
	csvPath: 'migrations/data/documents-full.csv',
	reportsDir: 'migrations/csv-import/reports',
}

function flagNumber(argv: string[], flag: string): number | undefined {
	const idx = argv.indexOf(flag)
	if (idx === -1 || !argv[idx + 1]) return undefined
	const n = Number(argv[idx + 1])
	return Number.isFinite(n) ? n : undefined
}

function flagString(argv: string[], flag: string): string | undefined {
	const idx = argv.indexOf(flag)
	if (idx === -1 || !argv[idx + 1]) return undefined
	return argv[idx + 1]
}

/**
 * Parse `--clip-ids 32,665,701` into a de-duplicated list (order preserved).
 */
export function parseClipIdsFlag(raw: string | undefined): string[] | null {
	if (raw === undefined) return null
	const seen = new Set<string>()
	const ids: string[] = []
	for (const part of raw.split(',')) {
		const id = part.trim()
		if (!id || seen.has(id)) continue
		seen.add(id)
		ids.push(id)
	}
	return ids.length > 0 ? ids : null
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
		clipIds: parseClipIdsFlag(flagString(argv, '--clip-ids')),
		csvPath: path.resolve(argv.find((a) => a.endsWith('.csv')) ?? defaults.csvPath),
		reportsDir: path.resolve(defaults.reportsDir),
	}
}
