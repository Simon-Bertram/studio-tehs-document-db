/**
 * Streams a CSV file into row objects.
 * Caps at rowLimit so --limit can sample without loading the full export.
 */
import fs from 'node:fs'
import csvParser from 'csv-parser'

export async function readCsvRows<T extends Record<string, string> = Record<string, string>>(
	csvPath: string,
	rowLimit: number,
	options?: {encoding?: BufferEncoding},
): Promise<T[]> {
	if (!fs.existsSync(csvPath)) {
		console.error(`CSV file not found: ${csvPath}`)
		process.exit(1)
	}

	const rows: T[] = []
	const encoding = options?.encoding

	await new Promise<void>((resolve, reject) => {
		fs.createReadStream(csvPath, encoding ? {encoding} : undefined)
			.pipe(csvParser())
			.on('data', (row: T) => {
				if (rows.length < rowLimit) rows.push(row)
			})
			.on('end', resolve)
			.on('error', reject)
	})

	return rows
}
