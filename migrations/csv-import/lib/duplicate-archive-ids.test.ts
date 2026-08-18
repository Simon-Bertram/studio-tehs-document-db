import {describe, expect, test} from 'bun:test'

import {resolveDuplicateArchiveIds} from './duplicate-archive-ids'
import type {ImageCsvRow} from './map-image-row'

function row(partial: Partial<ImageCsvRow> & Pick<ImageCsvRow, 'identifier'>): ImageCsvRow {
	return {
		identifier: partial.identifier,
		photographer: '',
		serialNumber: '',
		title: partial.title ?? '',
		comment: '',
		contributor: '',
		description: '',
		rights: '',
		source: '',
		subject: '',
		township: '',
		type: 'photo',
		dateTaken: '',
		donationID: '',
		Synonyms: '',
		imageLocation: partial.imageLocation ?? '',
		fileLocation: '',
		archiveLocation: '',
		primaryPhoto: partial.primaryPhoto ?? '',
		publicDisplay: '',
		photoLocation: '',
	}
}

describe('resolveDuplicateArchiveIds', () => {
	test('leaves unique identifiers unchanged', () => {
		const rows = [row({identifier: 'BKH1', imageLocation: 'a.jpg'})]
		expect(resolveDuplicateArchiveIds(rows)[0]).toMatchObject({
			archiveId: 'BKH1',
			skip: false,
		})
	})

	test('skips true duplicates that share a path (SCU11)', () => {
		const rows = [
			row({
				identifier: 'SCU11',
				primaryPhoto: '7161',
				imageLocation: 'ValleyForge/SchuylkillRiver/SCU11small.jpg',
			}),
			row({
				identifier: 'SCU11',
				primaryPhoto: '7176',
				imageLocation: 'ValleyForge/SchuylkillRiver/SCU11small.jpg',
			}),
		]
		const resolved = resolveDuplicateArchiveIds(rows)
		expect(resolved[0].skip).toBe(false)
		expect(resolved[0].archiveId).toBe('SCU11')
		expect(resolved[1].skip).toBe(true)
		expect(resolved[1].reason).toBe('duplicate_identifier')
	})

	test('suffixes distinct files with primaryPhoto (HLC08)', () => {
		const rows = [
			row({
				identifier: 'HLC08',
				primaryPhoto: '3596',
				imageLocation: 'HousesandFarms/AtleeErdmanLogCabin/HLC08-b.jpg',
			}),
			row({
				identifier: 'HLC08',
				primaryPhoto: '2590',
				imageLocation: 'HousesandFarms/JosephHamptonLogCabin/HLC08-a.jpg',
			}),
		]
		const resolved = resolveDuplicateArchiveIds(rows)
		expect(resolved[0].skip).toBe(false)
		expect(resolved[1].skip).toBe(false)
		expect(resolved.map((r) => r.archiveId).sort()).toEqual(['HLC08-2590', 'HLC08-3596'])
	})

	test('uses letter suffixes when primaryPhoto is missing', () => {
		const rows = [
			row({identifier: 'HLC11', imageLocation: 'b.jpg'}),
			row({identifier: 'HLC11', imageLocation: 'a.jpg'}),
		]
		const resolved = resolveDuplicateArchiveIds(rows)
		expect(resolved.map((r) => r.archiveId).sort()).toEqual(['HLC11-a', 'HLC11-b'])
	})
})
