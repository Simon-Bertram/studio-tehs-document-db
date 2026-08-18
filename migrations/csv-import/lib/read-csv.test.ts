import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {afterAll, describe, expect, test} from 'bun:test'

import {readCsvRows} from './read-csv'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-offset-'))
const csvPath = path.join(tmp, 'rows.csv')
fs.writeFileSync(csvPath, 'id,name\na,one\nb,two\nc,three\nd,four\n')

afterAll(() => {
	fs.rmSync(tmp, {recursive: true, force: true})
})

describe('readCsvRows', () => {
	test('honors offset then limit', async () => {
		const rows = await readCsvRows<{id: string; name: string}>(csvPath, 2, {rowOffset: 1})
		expect(rows.map((row) => row.id)).toEqual(['b', 'c'])
	})

	test('offset 0 with limit matches the first n rows', async () => {
		const rows = await readCsvRows<{id: string}>(csvPath, 2)
		expect(rows.map((row) => row.id)).toEqual(['a', 'b'])
	})
})
