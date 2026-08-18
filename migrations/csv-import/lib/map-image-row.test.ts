import {describe, expect, test} from 'bun:test'

import {Audit} from './audit'
import {CATCHALL_DONATION_ID, type ImageCsvRow, mapImageRow} from './map-image-row'

function row(partial: Partial<ImageCsvRow> & Pick<ImageCsvRow, 'identifier'>): ImageCsvRow {
	return {
		identifier: partial.identifier,
		photographer: '',
		serialNumber: '',
		title: partial.title ?? 'A title',
		comment: '',
		contributor: '',
		description: '',
		rights: '',
		source: '',
		subject: '',
		township: '',
		type: partial.type ?? 'Postcard',
		dateTaken: '',
		donationID: partial.donationID ?? '',
		Synonyms: partial.Synonyms ?? '',
		imageLocation: partial.imageLocation ?? 'ValleyForge/BakeHouse/BKH1.jpg',
		fileLocation: partial.fileLocation ?? 'VFNHP Views & BuildingsBake House',
		archiveLocation: partial.archiveLocation ?? 'Box 12',
		primaryPhoto: '',
		publicDisplay: partial.publicDisplay ?? '',
		photoLocation: '',
	}
}

const lookups = {
	townships: {},
	categories: {},
	donations: {1: 'donation-catchall', '2': 'donation-fry'},
}

describe('mapImageRow', () => {
	test('decodes HTML entities in titles', () => {
		const mapped = mapImageRow(
			row({identifier: 'STI3', title: 'Interior of Stirling&rsquo;s Quarters'}),
			lookups,
			new Audit(),
		)
		expect(mapped?.doc.title).toBe('Interior of Stirling\u2019s Quarters')
	})

	test('stores archive folder notes, not as a URL', () => {
		const mapped = mapImageRow(row({identifier: 'BKH1'}), lookups, new Audit())
		expect(mapped?.doc.notes).toContain('Archive folder: VFNHP Views & BuildingsBake House')
		expect(mapped?.doc.notes).toContain('Archive location: Box 12')
		expect(mapped?.doc.notes).toContain('Legacy type: Postcard')
		expect(mapped?.imageLocation).toBe('ValleyForge/BakeHouse/BKH1.jpg')
		expect(mapped?.assetUrl).toContain('ValleyForge/BakeHouse/BKH1.jpg')
		expect(mapped?.assetUrl).not.toContain('VFNHP')
	})

	test('does not link the catch-all donation', () => {
		const mapped = mapImageRow(
			row({identifier: 'BKH1', donationID: CATCHALL_DONATION_ID}),
			lookups,
			new Audit(),
		)
		expect(mapped?.doc.donation).toBeUndefined()
	})

	test('links a real donation id', () => {
		const mapped = mapImageRow(row({identifier: 'BKH1', donationID: '2'}), lookups, new Audit())
		expect(mapped?.doc.donation?._ref).toBe('donation-fry')
	})

	test('skips private publicDisplay=N rows', () => {
		const audit = new Audit()
		const mapped = mapImageRow(row({identifier: 'BKH1', publicDisplay: 'N'}), lookups, audit)
		expect(mapped).toBeNull()
		expect(audit.skipped[0]?.reason).toBe('private_image')
	})

	test('uses a disambiguated archiveId when provided', () => {
		const mapped = mapImageRow(row({identifier: 'HLC08'}), lookups, new Audit(), {
			archiveId: 'HLC08-2590',
		})
		expect(mapped?.doc.archiveId).toBe('HLC08-2590')
	})
})
