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

const DEFAULT_CSV = 'migrations/data/documents.csv'
const DEFAULT_REPORTS = 'migrations/csv-import/reports'

export function parseCliConfig(argv: string[]): ImportConfig {
	const limitIdx = argv.indexOf('--limit')
	const rowLimit =
		limitIdx !== -1 && argv[limitIdx + 1]
			? Number(argv[limitIdx + 1])
			: Infinity

	return {
		// Default is dry-run; pass --live to write to Sanity.
		dryRun: !argv.includes('--live'),
		rowLimit,
		csvPath: path.resolve(
			argv.find((a) => a.endsWith('.csv')) ?? DEFAULT_CSV,
		),
		reportsDir: path.resolve(DEFAULT_REPORTS),
	}
}
