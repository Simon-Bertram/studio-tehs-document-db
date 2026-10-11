import {describe, expect, test} from 'bun:test'

import {
	contentToPortableText,
	contentToPortableTextDetailed,
	type HistoricalImageEmbedPending,
	type TableBlock,
	preprocessContentHtml,
	stripHtmlToPlainText,
	unwrapLayoutTables,
} from './content-to-portable-text'
import type {DocumentImageCatalog} from './document-image-catalog'

const emptyCatalog: DocumentImageCatalog = {
	stems: ['BKH'],
	identifiers: new Map([['bkh1', 'BKH1']]),
	filenames: new Map(),
}

function cellTexts(table: TableBlock): string[][] {
	return table.rows.map((row) =>
		row.cells.map((cell) => cell.value.map((b) => b.children[0]?.text ?? '').join('')),
	)
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

describe('unwrapLayoutTables', () => {
	test('strips nav chrome and keeps inner content', () => {
		const html = `
			<table class="content2">
				<tr><td class="NavHintBox"><a class="Navlink" href="/">Home</a></td></tr>
				<tr><td class="TitleBox"><h2>Document Collection</h2></td></tr>
				<tr><td><p>Inner prose</p><table border="1"><tr><td>A</td><td>B</td></tr></table></td></tr>
			</table>`
		const out = unwrapLayoutTables(html)
		expect(out).toContain('Inner prose')
		expect(out).toContain('<table border="1">')
		expect(out).not.toContain('NavHintBox')
		expect(out).not.toContain('class="content2"')
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
		expect(embed?._pendingImportId).toBe('historicalImage-import-1854-02-07doc591small')
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

	test('converts HTML data tables to table blocks', () => {
		const html = `
			<p>Signers</p>
			<table border="1">
				<tbody>
					<tr><td>Benjamin Steward</td><td>Nicholas Bean</td></tr>
					<tr><td>Jacob Knous</td><td>James Saanders</td></tr>
				</tbody>
			</table>`
		const blocks = contentToPortableText(html, emptyCatalog)
		const table = blocks.find((b) => b._type === 'table') as TableBlock | undefined
		expect(table).toBeDefined()
		expect(table?.headerRows).toBe(0)
		expect(cellTexts(table!)).toEqual([
			['Benjamin Steward', 'Nicholas Bean'],
			['Jacob Knous', 'James Saanders'],
		])
		expect(blocks.some((b) => b._type === 'block')).toBe(true)
	})

	test('sets headerRows when the first row is th', () => {
		const html = `
			<table>
				<tr><th>From</th><th>To</th></tr>
				<tr><td>A</td><td>B</td></tr>
			</table>`
		const table = contentToPortableText(html, emptyCatalog).find(
			(b) => b._type === 'table',
		) as TableBlock
		expect(table.headerRows).toBe(1)
		expect(cellTexts(table)[0]).toEqual(['From', 'To'])
	})

	test('does not emit a table for layout chrome wrappers', () => {
		const html = `
			<table class="content2">
				<tr><td class="NavHintBox"><a class="Navlink" href="/">Home</a></td></tr>
				<tr><td class="TitleBox"><h2>Document Collection</h2></td></tr>
				<tr><td><p>Only prose left</p></td></tr>
			</table>`
		const {blocks} = contentToPortableTextDetailed(html, emptyCatalog)
		expect(blocks.some((b) => b._type === 'table')).toBe(false)
		const text = blocks
			.filter((b) => b._type === 'block')
			.map((b) => (b._type === 'block' ? b.children.map((c) => c.text).join('') : ''))
			.join(' ')
		expect(text).toContain('Only prose left')
	})

	test('warns when colspan or rowspan is flattened', () => {
		const html = `
			<table>
				<tr><th colspan="2">Coins</th></tr>
				<tr><td>Gold</td><td>1oz</td></tr>
			</table>`
		const {blocks, warnings} = contentToPortableTextDetailed(html, emptyCatalog)
		expect(blocks.some((b) => b._type === 'table')).toBe(true)
		expect(warnings.some((w) => w.startsWith('table-simplified'))).toBe(true)
	})

	test('converts tab-separated deed-history grids to tables between headings', () => {
		const content = [
			'Valley Creek Preserve',
			'',
			'From\tTo\tDate\tArea\tCost\tReference',
			'Sheriff\tCharles S. Powell\t12/18/1913\t3 tracts\t$12,510\tD13-286',
			'Charles S. Powell\tGrace L. Wedge\t12/26/1913\t3 tracts\t$1\tP14-224',
			'',
			'Cool Valley Preserve',
			'',
			'From\tTo\tDate\tArea\tCost\tReference',
			'A\tB\t1910\t1a\t\tX1',
			'C\tD\t1911\t2a\t\tX2',
		].join('\n')

		const blocks = contentToPortableText(content, emptyCatalog)
		const tables = blocks.filter((b) => b._type === 'table') as TableBlock[]
		expect(tables).toHaveLength(2)
		expect(tables[0].headerRows).toBe(1)
		expect(cellTexts(tables[0])[0]).toEqual([
			'From',
			'To',
			'Date',
			'Area',
			'Cost',
			'Reference',
		])
		expect(cellTexts(tables[0])).toHaveLength(3)

		const headings = blocks
			.filter((b) => b._type === 'block')
			.map((b) => (b._type === 'block' ? b.children[0]?.text : ''))
		expect(headings).toContain('Valley Creek Preserve')
		expect(headings).toContain('Cool Valley Preserve')
	})
})
