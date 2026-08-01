/**
 * Streams a CSV file into row objects.
 * Caps at rowLimit so --limit can sample without loading the full export.
 */
import fs from 'node:fs'
import csvParser from 'csv-parser'
import type {CsvRow} from './map-row'

export async function readCsvRows(
	csvPath: string,
	rowLimit: number,
): Promise<CsvRow[]> {
	if (!fs.existsSync(csvPath)) {
		console.error(`CSV file not found: ${csvPath}`)
		process.exit(1)
	}

	const rows: CsvRow[] = []

	await new Promise<void>((resolve, reject) => {
		fs.createReadStream(csvPath)
			.pipe(csvParser())
			.on('data', (row: CsvRow) => {
				if (rows.length < rowLimit) rows.push(row)
			})
			.on('end', resolve)
			.on('error', reject)
	})

	return rows
}
