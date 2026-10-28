/**
 * Minimal CSV read/write helpers for review reports.
 */
import fs from 'node:fs'

export function csvEscape(value: string): string {
	if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
	return value
}

export function writeCsv(filePath: string, headers: string[], rows: string[][]): void {
	const lines = [
		headers.map(csvEscape).join(','),
		...rows.map((row) => row.map((cell) => csvEscape(cell ?? '')).join(',')),
	]
	fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8')
}

/**
 * Parse a simple CSV with header row. Does not support multiline quoted cells.
 */
export function readCsv(filePath: string): Record<string, string>[] {
	if (!fs.existsSync(filePath)) return []
	const text = fs.readFileSync(filePath, 'utf8')
	const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
	if (lines.length === 0) return []

	const headers = splitCsvLine(lines[0])
	const rows: Record<string, string>[] = []
	for (const line of lines.slice(1)) {
		const cells = splitCsvLine(line)
		const row: Record<string, string> = {}
		headers.forEach((h, i) => {
			row[h] = cells[i] ?? ''
		})
		rows.push(row)
	}
	return rows
}

function splitCsvLine(line: string): string[] {
	const cells: string[] = []
	let current = ''
	let inQuotes = false
	for (let i = 0; i < line.length; i++) {
		const ch = line[i]
		if (inQuotes) {
			if (ch === '"') {
				if (line[i + 1] === '"') {
					current += '"'
					i++
				} else {
					inQuotes = false
				}
			} else {
				current += ch
			}
		} else if (ch === '"') {
			inQuotes = true
		} else if (ch === ',') {
			cells.push(current)
			current = ''
		} else {
			current += ch
		}
	}
	cells.push(current)
	return cells
}

export function isApproved(value: string | undefined): boolean {
	const v = (value || '').trim().toLowerCase()
	return v === 'yes' || v === 'y' || v === 'true' || v === '1' || v === 'approved'
}
