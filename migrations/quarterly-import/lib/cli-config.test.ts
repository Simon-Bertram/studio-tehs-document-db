import {describe, expect, test} from 'bun:test'

import {parseQuarterlyCliConfig, tocFileName, tocPathForVolume} from './cli-config'

describe('parseQuarterlyCliConfig', () => {
	test('defaults to html-volume 22 dry-run', () => {
		const config = parseQuarterlyCliConfig([])
		expect(config.mode).toBe('html-volume')
		expect(config.volume).toBe(22)
		expect(config.dryRun).toBe(true)
	})

	test('selects catalog modes', () => {
		expect(parseQuarterlyCliConfig(['--issues']).mode).toBe('issues')
		expect(parseQuarterlyCliConfig(['--article-stubs']).mode).toBe('article-stubs')
		expect(parseQuarterlyCliConfig(['--extract']).mode).toBe('extract')
		expect(parseQuarterlyCliConfig(['--issues', '--live']).dryRun).toBe(false)
	})

	test('treats --volume as a catalog filter, not a default', () => {
		expect(parseQuarterlyCliConfig(['--issues']).volume).toBeUndefined()
		expect(parseQuarterlyCliConfig(['--issues', '--volume', '22']).volume).toBe(22)
	})
})

describe('tocPathForVolume', () => {
	test('pads volume 1 as qv01toc.html', () => {
		expect(tocFileName(1)).toBe('qv01toc.html')
		expect(tocPathForVolume(1)).toBe('/toc/qv01toc.html')
		expect(tocPathForVolume(22)).toBe('/toc/qv22toc.html')
	})
})
