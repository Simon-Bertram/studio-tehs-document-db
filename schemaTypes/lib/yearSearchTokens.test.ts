import {describe, expect, test} from 'bun:test'

import {yearSearchTokens} from './yearSearchTokens'

describe('yearSearchTokens', () => {
	test('year precision stores full year and 3-digit prefix', () => {
		expect(yearSearchTokens({precision: 'year', qualifier: 'exact', year: 1954})).toBe('1954 195')
	})

	test('month precision uses the year field', () => {
		expect(yearSearchTokens({precision: 'month', qualifier: 'exact', year: 1984, month: 1})).toBe(
			'1984 198',
		)
	})

	test('day precision takes the year from the ISO date', () => {
		expect(yearSearchTokens({precision: 'day', qualifier: 'exact', date: '1937-10-01'})).toBe(
			'1937 193',
		)
	})

	test('returns undefined when the date is incomplete', () => {
		expect(yearSearchTokens(undefined)).toBeUndefined()
		expect(yearSearchTokens({precision: 'year', qualifier: 'exact'})).toBeUndefined()
		expect(yearSearchTokens({precision: 'day', qualifier: 'exact'})).toBeUndefined()
	})

	test('does not duplicate a 3-digit year as a prefix', () => {
		expect(yearSearchTokens({precision: 'year', qualifier: 'exact', year: 195})).toBe('195')
	})
})
