/**
 * Export image metadata (never psImages / BLOB columns) through the local
 * SSH tunnel into migrations/data/sample-images.csv.
 *
 * Requires: running tunnel (scripts/start-mysql-tunnel.sh) and MYSQL_PASS
 * (same read-only DreamHost user as .cursor/mcp.json).
 */
import fs from 'node:fs'
import path from 'node:path'

import mysql from 'mysql2/promise'

import {escapeCsv} from '../migrations/csv-import/lib/write-reports'

const EXPORT_COLUMNS = [
	'identifier',
	'photographer',
	'serialNumber',
	'title',
	'comment',
	'contributor',
	'description',
	'rights',
	'source',
	'subject',
	'township',
	'type',
	'dateTaken',
	'donationID',
	'Synonyms',
	'imageLocation',
	'fileLocation',
	'archiveLocation',
	'primaryPhoto',
	'publicDisplay',
	'photoLocation',
	'refs',
] as const

function cell(value: unknown): string {
	if (value == null) return ''
	return String(value)
}

async function main() {
	const root = path.resolve(import.meta.dir, '..')
	const out = path.resolve(
		process.env.CSV_OUT ?? path.join(root, 'migrations/data/sample-images.csv'),
	)
	const host = process.env.MYSQL_HOST ?? '127.0.0.1'
	const port = Number(process.env.MYSQL_PORT ?? 3307)
	const user = process.env.MYSQL_USER ?? 'images_ro'
	const database = process.env.MYSQL_DB ?? 'tehsimages2'
	const password = process.env.MYSQL_PASS

	if (!password) {
		console.error('MYSQL_PASS is required (read-only DreamHost user password).')
		console.error('Example:')
		console.error("  MYSQL_USER=images_ro MYSQL_PASS='…' MYSQL_DB=tehsimages2 \\")
		console.error('    bun run csv-export:images')
		process.exit(1)
	}

	const limitRaw = process.env.IMAGE_EXPORT_LIMIT
	const limit = limitRaw ? Number(limitRaw) : NaN
	const limitSql = Number.isFinite(limit) && limit > 0 ? ` LIMIT ${Math.floor(limit)}` : ''
	const columnList = EXPORT_COLUMNS.map((name) => `\`${name}\``).join(', ')
	const sql = `SELECT ${columnList} FROM \`imageInformation\`${limitSql}`

	let connection
	try {
		connection = await mysql.createConnection({
			host,
			port,
			user,
			password,
			database,
		})
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		console.error(`Cannot reach MySQL at ${host}:${port}. ${msg}`)
		console.error('Start the tunnel first:')
		console.error('  SSH_USER=your_dreamhost_user bun run mysql-tunnel')
		process.exit(1)
	}

	try {
		const [rows] = await connection.query(sql)
		if (!Array.isArray(rows)) {
			throw new Error('Unexpected MySQL result (not a row set).')
		}

		const lines = [
			EXPORT_COLUMNS.join(','),
			...rows.map((row) => {
				const record = row as Record<string, unknown>
				return EXPORT_COLUMNS.map((col) => escapeCsv(cell(record[col]))).join(',')
			}),
		]
		fs.mkdirSync(path.dirname(out), {recursive: true})
		fs.writeFileSync(out, `${lines.join('\n')}\n`)
		console.log(`Wrote ${rows.length} data rows, ${EXPORT_COLUMNS.length} columns → ${out}`)
	} finally {
		await connection.end()
	}
}

main().catch((err) => {
	console.error('Image CSV export failed:', err)
	process.exit(1)
})
