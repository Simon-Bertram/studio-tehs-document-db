import {describe, expect, test} from 'bun:test'

import {
	contentToPortableText,
	type HistoricalImageEmbedPending,
	preprocessContentHtml,
	stripHtmlToPlainText,
} from './content-to-portable-text'
import type {DocumentImageCatalog} from './document-image-catalog'

const emptyCatalog: DocumentImageCatalog = {
	stems: ['BKH'],
	identifiers: new Map([['bkh1', 'BKH1']]),
	filenames: new Map(),
}

describe('preprocessContentHtml', () => {
	test('turns double br into paragraph breaks', () => {
		expect(preprocessContentHtml('One<br><br>Two')).toBe('One</p><p>Two')
	})
})

describe('stripHtmlToPlainText', () => {
	test('removes tags for photo descriptions', () => {
		expect(stripHtmlToPlainText('Hello <strong>world</strong><br>again')).toBe('Hello world again')
	})
})

describe('contentToPortableText', () => {
	test('keeps plain text as a single block', () => {
		const blocks = contentToPortableText('Plain note', emptyCatalog)
		expect(blocks).toHaveLength(1)
		expect(blocks[0]._type).toBe('block')
		if (blocks[0]._type === 'block') {
			expect(blocks[0].children[0].text).toBe('Plain note')
		}
	})

	test('converts HTML paragraphs, links, and images', () => {
		const html =
			'<p>Hello <strong>world</strong> and <a href="https://example.com">link</a>.</p>' +
			'<p style="text-align:center"><img alt="Scan" src="../images/1854-02-07doc591small.jpg"><br></p>' +
			'<p>More text</p>'

		const blocks = contentToPortableText(html, emptyCatalog)
		expect(blocks.some((b) => b._type === 'block')).toBe(true)

		const embed = blocks.find((b) => b._type === 'historicalImageEmbed') as
			HistoricalImageEmbedPending | undefined
		expect(embed).toBeDefined()
		expect(embed?._pendingFilename).toBe('1854-02-07doc591small.jpg')
		expect(embed?._pendingImportId).toBe('historicalImage.import.1854-02-07doc591small')
		expect(embed?.alt).toBe('Scan')
		expect(embed?.imageRole).toBe('figure')
	})

	test('skips image-not-found alt text', () => {
		const html = '<img alt="image not found" src="../images/Doc408small.jpg">'
		const blocks = contentToPortableText(html, emptyCatalog)
		const embed = blocks.find((b) => b._type === 'historicalImageEmbed') as
			HistoricalImageEmbedPending | undefined
		expect(embed?.alt).toBeUndefined()
	})

	test('skips alts that contain image not found (e.g. CHE53 image not found)', () => {
		const html = '<img alt="CHE53 image not found" src="../images/CHE53small.jpg">'
		const blocks = contentToPortableText(html, emptyCatalog)
		const embed = blocks.find((b) => b._type === 'historicalImageEmbed') as
			HistoricalImageEmbedPending | undefined
		expect(embed?.alt).toBeUndefined()
	})

	test('marks catalog filenames with pending archive id', () => {
		const html = '<img src="BKH1-BakeHousesmall.jpg" alt="Bake House">'
		const blocks = contentToPortableText(html, emptyCatalog)
		const embed = blocks.find((b) => b._type === 'historicalImageEmbed') as
			HistoricalImageEmbedPending | undefined
		expect(embed?._pendingArchiveId).toBe('BKH1')
		expect(embed?._pendingImportId).toBeUndefined()
	})
})
