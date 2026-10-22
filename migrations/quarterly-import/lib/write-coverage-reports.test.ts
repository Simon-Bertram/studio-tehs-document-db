import {describe, expect, test} from 'bun:test'

import type {CatalogStub} from './merge-catalog'
import {buildPdfArticleRows, buildToc404Rows} from './write-coverage-reports'

describe('buildPdfArticleRows', () => {
	test('includes only PDF sourceUrl stubs with import flags', () => {
		const stubs: CatalogStub[] = [
			{
				title: 'HTML piece',
				issueSourceKey: 'v22n1',
				volume: 22,
				issueNumber: 1,
				sourceKey: 'v22n1p003',
				sourceUrl: 'https://www.tehistory.org/hqda/html/v22/v22n1p003.html',
				origin: 'volume-toc',
			},
			{
				title: 'PDF piece',
				issueSourceKey: 'v45n1',
				volume: 45,
				issueNumber: 1,
				sourceKey: 'v45n1p003',
				sourceUrl: 'https://www.tehistory.org/hqda/pdf/v45/v45n1p003.pdf',
				origin: 'volume-toc',
			},
		]
		const rows = buildPdfArticleRows(stubs)
		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			volume: 45,
			sourceKey: 'v45n1p003',
			willImportStub: 'yes',
			willImportBody: 'no',
			willUploadPdfAsset: 'no',
		})
	})
})

describe('buildToc404Rows', () => {
	test('marks qtoc1 as stub source for missing TOC volumes', () => {
		const rows = buildToc404Rows({
			baseUrl: 'https://www.tehistory.org/hqda',
			toc404Path: '/nonexistent/toc-404s.json',
			tocVolumesMissing: [56, 57],
			qtoc1Volumes: [56],
		})
		expect(rows).toHaveLength(2)
		expect(rows[0]).toMatchObject({
			volume: 56,
			stubSource: 'qtoc1',
			status: 'missing',
		})
		expect(rows[1].stubSource).toBe('none')
	})
})
