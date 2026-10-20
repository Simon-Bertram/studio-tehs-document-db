import {describe, expect, test} from 'bun:test'

import {batchReportsDir, parseCliConfig, parseClipIdsFlag} from './cli-config'

describe('parseCliConfig', () => {
	test('defaults to dry-run, offset 0, unlimited rows', () => {
		const config = parseCliConfig([], {
			csvPath: 'migrations/data/sample-images.csv',
			reportsDir: 'migrations/csv-import/reports/images',
		})
		expect(config.dryRun).toBe(true)
		expect(config.rowOffset).toBe(0)
		expect(config.rowLimit).toBe(Infinity)
		expect(config.clipIds).toBeNull()
	})

	test('parses --live --offset --limit', () => {
		const config = parseCliConfig(['--live', '--offset', '1000', '--limit', '1000'], {
			csvPath: 'x.csv',
			reportsDir: 'reports',
		})
		expect(config.dryRun).toBe(false)
		expect(config.rowOffset).toBe(1000)
		expect(config.rowLimit).toBe(1000)
	})

	test('parses --clip-ids', () => {
		const config = parseCliConfig(['--clip-ids', '32,665,32, 701'], {
			csvPath: 'x.csv',
			reportsDir: 'reports',
		})
		expect(config.clipIds).toEqual(['32', '665', '701'])
	})
})

describe('parseClipIdsFlag', () => {
	test('returns null when flag is absent', () => {
		expect(parseClipIdsFlag(undefined)).toBeNull()
	})

	test('dedupes and trims comma-separated ids', () => {
		expect(parseClipIdsFlag(' 32, 665,,32 ')).toEqual(['32', '665'])
	})
})

describe('batchReportsDir', () => {
	test('names the folder from offset and limit', () => {
		expect(batchReportsDir('/tmp/images', 1000, 1000)).toBe('/tmp/images/offset-1000-limit-1000')
		expect(batchReportsDir('/tmp/images', 0, Infinity)).toBe('/tmp/images/offset-0-limit-all')
	})
})
