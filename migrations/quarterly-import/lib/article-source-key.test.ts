import {describe, expect, test} from 'bun:test'

import {articleSlug, slugifySourceKey, slugTitle} from './article-source-key'

describe('slugTitle', () => {
	test('slugifies titles', () => {
		expect(slugTitle("Five Boys Eat Apple Dumplings")).toBe('five-boys-eat-apple-dumplings')
		expect(slugTitle("Glimpses of the History of St. Peter's Church")).toBe(
			'glimpses-of-the-history-of-st-peters-church',
		)
	})
})

describe('slugifySourceKey', () => {
	test('normalizes archive and stub keys', () => {
		expect(slugifySourceKey('v22n1p003')).toBe('v22n1p003')
		expect(slugifySourceKey('v44n1+2p015')).toBe('v44n1-2p015')
		expect(slugifySourceKey('v22n1/foreword')).toBe('v22n1-foreword')
	})
})

describe('articleSlug', () => {
	test('uses title slug when free', () => {
		const taken = new Set<string>()
		expect(articleSlug('Editorial', 'v1n1p001', taken)).toBe('editorial')
		expect(taken.has('editorial')).toBe(true)
	})

	test('appends sourceKey when title slug collides', () => {
		const taken = new Set<string>()
		expect(articleSlug('Editorial', 'v1n1p001', taken)).toBe('editorial')
		expect(articleSlug('Editorial', 'v1n2p001', taken)).toBe('editorial-v1n2p001')
	})

	test('numbers further collisions on the same sourceKey-shaped slug', () => {
		const taken = new Set(['editorial', 'editorial-v1n2p001'])
		expect(articleSlug('Editorial', 'v1n2p001', taken)).toBe('editorial-v1n2p001-2')
	})
})
