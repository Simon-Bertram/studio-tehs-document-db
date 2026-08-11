/**
 * CLI flag parsing for the CSV import.
 * Isolates argv → ImportConfig so the pipeline never reads process.argv directly.
 */
import path from 'node:path'

export interface ImportConfig {
	dryRun: boolean
	rowLimit: number
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

export function parseCliConfig(
	argv: string[],
	defaults: CliDefaults = DEFAULT_DOCUMENTS,
): ImportConfig {
	const limitIdx = argv.indexOf('--limit')
	const rowLimit = limitIdx !== -1 && argv[limitIdx + 1] ? Number(argv[limitIdx + 1]) : Infinity

	return {
		// Default is dry-run; pass --live to write to Sanity.
		dryRun: !argv.includes('--live'),
		rowLimit,
		csvPath: path.resolve(argv.find((a) => a.endsWith('.csv')) ?? defaults.csvPath),
		reportsDir: path.resolve(defaults.reportsDir),
	}
}
