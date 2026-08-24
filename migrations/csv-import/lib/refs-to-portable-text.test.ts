import {describe, expect, test} from 'bun:test'

import {REFS_URL_BASE, refsToPortableText} from './refs-to-portable-text'

const IT1_REFS =
	'The Wayside Inns on the Lancaster Roadside between Philadelphia and Lancaster, by Julius F. Sachse, Self published, 1915 (2nd Edition); \u000b<a href="http://www.tehistory.org/hqda/html/v44/v44n1+2p015.html" target="Q">Inns & Taverns by Beth Arnold,</a> TEQ 44-1/2 (Winter/Spring 2007) Early History of Paoli by Mike Bertram, TE Quarterly, vol. 51, #1 (April 2014). Julius Sachse <a href="People/Sachse/Biography.pdf" target="blank">biographical article</a>\r\n\r\n'

function plainText(blocks: NonNullable<ReturnType<typeof refsToPortableText>>): string {
	return blocks.map((block) => block.children.map((span) => span.text).join('')).join('\n')
}

describe('refsToPortableText', () => {
	test('returns null for empty refs', () => {
		expect(refsToPortableText('')).toBeNull()
		expect(refsToPortableText('  ')).toBeNull()
		expect(refsToPortableText('nan')).toBeNull()
	})

	test('converts plain text without links', () => {
		const blocks = refsToPortableText('Sachse, Wayside Inns, 1915')
		expect(blocks).toHaveLength(1)
		expect(plainText(blocks!)).toBe('Sachse, Wayside Inns, 1915')
		expect(blocks![0].markDefs).toEqual([])
	})

	test('decodes HTML entities in citation prose', () => {
		const blocks = refsToPortableText('Stirling&rsquo;s Quarters')
		expect(plainText(blocks!)).toBe('Stirling\u2019s Quarters')
	})

	test('keeps absolute http(s) hrefs and resolves relative PDFs', () => {
		const blocks = refsToPortableText(IT1_REFS)
		expect(blocks).toHaveLength(1)
		const block = blocks![0]
		const hrefs = block.markDefs.map((mark) => mark.href)
		expect(hrefs).toEqual([
			'http://www.tehistory.org/hqda/html/v44/v44n1+2p015.html',
			`${REFS_URL_BASE}People/Sachse/Biography.pdf`,
		])

		const arnold = block.children.find((span) => span.text.includes('Beth Arnold'))
		const pdf = block.children.find((span) => span.text.includes('biographical article'))
		expect(arnold?.marks).toEqual([block.markDefs[0]._key])
		expect(pdf?.marks).toEqual([block.markDefs[1]._key])
		expect(plainText(blocks!)).toContain('Wayside Inns')
		expect(plainText(blocks!)).not.toContain('\u000b')
		expect(plainText(blocks!)).not.toContain('<a')
	})

	test('keeps link text when href is not http(s)', () => {
		const blocks = refsToPortableText('See <a href="javascript:void(0)">this note</a> here')
		expect(plainText(blocks!)).toBe('See this note here')
		expect(blocks![0].markDefs).toEqual([])
	})
})
