import {describe, expect, test} from 'bun:test'

import {collectPreflightIssues} from './image-preflight'
import type {ImageCsvRow} from './map-image-row'

function row(partial: Partial<ImageCsvRow> & Pick<ImageCsvRow, 'identifier'>): ImageCsvRow {
	return {
		identifier: partial.identifier,
		photographer: '',
		serialNumber: '',
		title: '',
		comment: '',
		contributor: '',
		description: '',
		rights: '',
		source: '',
		subject: partial.subject ?? 'House',
		township: partial.township ?? 'Tredyffrin',
		type: '',
		dateTaken: '',
		donationID: '',
		Synonyms: '',
		imageLocation: partial.imageLocation ?? 'a.jpg',
		fileLocation: '',
		archiveLocation: '',
		primaryPhoto: '',
		publicDisplay: partial.publicDisplay ?? '',
		photoLocation: '',
	}
}

describe('collectPreflightIssues', () => {
	test('flags missing imageLocation, private rows, typos, and place subjects', () => {
		const issues = collectPreflightIssues([
			row({identifier: 'A', imageLocation: ''}),
			row({identifier: 'B', publicDisplay: 'N'}),
			row({identifier: 'C', township: 'Tredyfrin'}),
			row({identifier: 'D', township: 'e'}),
			row({identifier: 'E', subject: 'Paoli Hardware Store'}),
		])
		expect(issues.map((i) => i.issue).sort()).toEqual([
			'missing_image_location',
			'place_or_business_subject',
			'public_display_n',
			'township_typo',
			'township_typo',
		])
	})

	test('flags duplicate identifiers once per id', () => {
		const issues = collectPreflightIssues([
			row({identifier: 'HLC08', imageLocation: 'a.jpg'}),
			row({identifier: 'HLC08', imageLocation: 'b.jpg'}),
		])
		expect(issues.some((i) => i.issue === 'duplicate_identifier')).toBe(true)
	})
})
