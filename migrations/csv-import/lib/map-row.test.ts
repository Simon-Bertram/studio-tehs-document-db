import {describe, expect, test} from 'bun:test'

import {Audit} from './audit'
import type {CsvRow} from './map-row'
import {mapRow} from './map-row'
import type {TaxonomyLookups} from './taxonomy'

function row(overrides: Partial<CsvRow>): CsvRow {
	return {
		clipID: '117',
		date: '',
		source: '',
		content: '',
		keywords: '',
		key1: '',
		key2: '',
		key3: '',
		key4: '',
		key5: '',
		key6: '',
		key7: '',
		title: 'First Ramble',
		type: 'book',
		Privatenotes: '',
		public: '',
		facilitators: '',
		...overrides,
	}
}

describe('mapRow taxonomy', () => {
	test('splits comma-stuffed keyword cells before lookup', () => {
		const audit = new Audit()
		const lookups: TaxonomyLookups = {
			categories: {},
			townships: {},
			organizations: {devinn: 'org-devon-inn'},
		}

		const result = mapRow(row({key1: 'DEV, DEVRam, DevInn'}), lookups, audit)

		expect(result?.unmappedKeywords).toEqual(['DEV', 'DEVRam'])
		expect(result?.mappedKeywords).toEqual(['DevInn'])
		expect(result?.doc.organizations?.[0]._ref).toBe('org-devon-inn')
	})
})
