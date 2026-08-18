import {describe, expect, test} from 'bun:test'

import {cleanDecodedString, decodeHtmlEntities} from './clean'

describe('decodeHtmlEntities', () => {
	test('decodes curly apostrophes from live MySQL titles', () => {
		expect(decodeHtmlEntities('Interior of Stirling&rsquo;s Quarters')).toBe(
			'Interior of Stirling\u2019s Quarters',
		)
	})

	test('decodes numeric entities', () => {
		expect(decodeHtmlEntities('Herb Fry&#8217;s Photos')).toBe('Herb Fry\u2019s Photos')
	})

	test('leaves paths without entities unchanged', () => {
		expect(decodeHtmlEntities('ValleyForge/BakeHouse/BKH1.jpg')).toBe(
			'ValleyForge/BakeHouse/BKH1.jpg',
		)
	})
})

describe('cleanDecodedString', () => {
	test('trims and decodes', () => {
		expect(cleanDecodedString('  Stirling&rsquo;s  ')).toBe('Stirling\u2019s')
	})
})
