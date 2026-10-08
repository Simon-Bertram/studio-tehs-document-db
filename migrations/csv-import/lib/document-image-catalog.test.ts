import {describe, expect, test} from 'bun:test'

import {
	classifyDocumentImageSrc,
	extractCatalogIdFromFilename,
	importIdForFilename,
	resolveDocumentImageUrl,
	type DocumentImageCatalog,
} from './document-image-catalog'

function catalog(partial?: Partial<DocumentImageCatalog>): DocumentImageCatalog {
	return {
		stems: partial?.stems ?? ['BEP', 'BKH', 'BE', 'DAY', 'HLC'],
		identifiers: partial?.identifiers ?? new Map([
			['bkh1', 'BKH1'],
			['bep60', 'BEP60'],
			['be232', 'BE232'],
			['day1', 'DAY1'],
		]),
		filenames: partial?.filenames ?? new Map([
			['bkh1-bakehousesmall.jpg', 'BKH1'],
		]),
	}
}

describe('extractCatalogIdFromFilename', () => {
	test('uses longest stem first so BEP beats BE', () => {
		expect(extractCatalogIdFromFilename('BEP60-BerwynandRadnorFire1small.jpg', catalog().stems)).toBe(
			'BEP60',
		)
		expect(extractCatalogIdFromFilename('BE232.jpg', catalog().stems)).toBe('BE232')
	})

	test('reads stem+digits from Bake House style names', () => {
		expect(extractCatalogIdFromFilename('BKH1-BakeHousesmall.jpg', catalog().stems)).toBe('BKH1')
	})
})

describe('classifyDocumentImageSrc', () => {
	test('links catalog filenames by imageLocation basename', () => {
		const result = classifyDocumentImageSrc(
			'ValleyForge/BakeHouse/BKH1-BakeHousesmall.jpg',
			catalog(),
		)
		expect(result).toEqual({
			kind: 'catalog',
			archiveId: 'BKH1',
			filename: 'BKH1-BakeHousesmall.jpg',
			src: 'ValleyForge/BakeHouse/BKH1-BakeHousesmall.jpg',
		})
	})

	test('links stem+digits when identifier exists in catalog', () => {
		const result = classifyDocumentImageSrc('somewhere/BKH1-extra.jpg', catalog())
		expect(result.kind).toBe('catalog')
		if (result.kind === 'catalog') expect(result.archiveId).toBe('BKH1')
	})

	test('treats clipping scans as new images without Archive ID', () => {
		const result = classifyDocumentImageSrc(
			'../images/1854-02-07doc591small.jpg',
			catalog(),
		)
		expect(result).toEqual({
			kind: 'new',
			filename: '1854-02-07doc591small.jpg',
			importId: 'historicalImage.import.1854-02-07doc591small',
			src: '../images/1854-02-07doc591small.jpg',
		})
	})

	test('skips empty src', () => {
		expect(classifyDocumentImageSrc('  ', catalog()).kind).toBe('skip')
	})
})

describe('importIdForFilename', () => {
	test('builds a stable slug id', () => {
		expect(importIdForFilename('Daylesford,1897atlas.JPG')).toBe(
			'historicalImage.import.daylesford-1897atlas',
		)
	})
})

describe('resolveDocumentImageUrl', () => {
	test('resolves relative ../images paths against the document base URL', () => {
		expect(
			resolveDocumentImageUrl(
				'../images/1854-02-07doc591small.jpg',
				'https://www.tehistory.org/hqda/html/',
			),
		).toBe('https://www.tehistory.org/hqda/images/1854-02-07doc591small.jpg')
	})
})
