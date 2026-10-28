import {describe, expect, test} from 'bun:test'

import {parsePersonName, suggestPropertyType} from './people'

describe('parsePersonName', () => {
	test('parses Capt. and Dr. prefixes', () => {
		expect(parsePersonName('Captain John Davis')).toMatchObject({
			prefix: 'Capt.',
			firstName: 'John',
			lastName: 'Davis',
		})
		expect(parsePersonName('Dr. John Davis')).toMatchObject({
			prefix: 'Dr.',
			firstName: 'John',
			lastName: 'Davis',
		})
	})

	test('parses senior suffix', () => {
		expect(parsePersonName('James David senior')).toMatchObject({
			firstName: 'James',
			lastName: 'David',
			suffix: 'Sr.',
		})
	})

	test('flags Havard family as family group', () => {
		const parts = parsePersonName('Havard family')
		expect(parts.isFamilyGroup).toBe(true)
		expect(parts.firstName).toBe('Havard')
	})
})

describe('suggestPropertyType', () => {
	test('marks Christie Farm as estate', () => {
		expect(suggestPropertyType('Christie Farm', '')).toBe('estate')
	})

	test('marks farmhouses as dwelling', () => {
		expect(suggestPropertyType('Acker Farmhouse', 'demolished')).toBe('dwelling')
	})
})
