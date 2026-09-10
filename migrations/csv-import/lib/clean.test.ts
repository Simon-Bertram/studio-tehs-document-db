import {describe, expect, test} from 'bun:test'

import {
	cleanDecodedString,
	decodeHtmlEntities,
	resolveSchemaType,
	splitCommaSeparatedKeywords,
} from './clean'

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

describe('resolveSchemaType', () => {
	test('maps newspaper spellings and trailing backslash to primarySource', () => {
		expect(resolveSchemaType('Newspaper advertisement')).toBe('primarySource')
		expect(resolveSchemaType('Newspaper advertisement\\')).toBe('primarySource')
		expect(resolveSchemaType('newspaper advertisment')).toBe('primarySource')
		expect(resolveSchemaType('Letter')).toBe('primarySource')
	})

	test('maps publication and thesis to researchArticle', () => {
		expect(resolveSchemaType('publication')).toBe('researchArticle')
		expect(resolveSchemaType('Thesis')).toBe('researchArticle')
	})

	test('leaves NULL, miscellaneous, and article unmapped', () => {
		expect(resolveSchemaType('NULL')).toBeNull()
		expect(resolveSchemaType('miscellaneous')).toBeNull()
		expect(resolveSchemaType('article')).toBeNull()
		expect(resolveSchemaType('Article')).toBeNull()
	})
})

describe('splitCommaSeparatedKeywords', () => {
	test('splits stuffed collection codes', () => {
		expect(splitCommaSeparatedKeywords('DEV, DEVRam, DevInn')).toEqual(['DEV', 'DEVRam', 'DevInn'])
	})

	test('returns a single token when there is no comma', () => {
		expect(splitCommaSeparatedKeywords('Lincoln')).toEqual(['Lincoln'])
	})
})
