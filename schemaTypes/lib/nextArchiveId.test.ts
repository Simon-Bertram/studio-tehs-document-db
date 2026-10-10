import {describe, expect, test} from 'bun:test'

import {maxArchiveIdSuffix, nextArchiveId} from './nextArchiveId'

describe('maxArchiveIdSuffix', () => {
	test('returns 0 when none match', () => {
		expect(maxArchiveIdSuffix('AS', [])).toBe(0)
		expect(maxArchiveIdSuffix('AS', ['BE1', 'BEP12'])).toBe(0)
	})

	test('takes highest numeric suffix', () => {
		expect(maxArchiveIdSuffix('AS', ['AS1', 'AS10', 'AS2'])).toBe(10)
	})

	test('does not steal longer stems', () => {
		expect(maxArchiveIdSuffix('BE', ['BE1', 'BE9', 'BEP12', 'BE232'])).toBe(232)
		expect(maxArchiveIdSuffix('BEP', ['BE1', 'BEP12', 'BEP3'])).toBe(12)
	})

	test('ignores non digit suffixes', () => {
		expect(maxArchiveIdSuffix('AS', ['AS', 'ASx', 'AS2a', 'AS3'])).toBe(3)
	})
})

describe('nextArchiveId', () => {
	test('starts at 1 when empty', () => {
		expect(nextArchiveId('AS', [])).toBe('AS1')
	})

	test('increments past max', () => {
		expect(nextArchiveId('AS', ['AS2'])).toBe('AS3')
		expect(nextArchiveId('DFF', ['DFF20', 'DFF7'])).toBe('DFF21')
	})
})
