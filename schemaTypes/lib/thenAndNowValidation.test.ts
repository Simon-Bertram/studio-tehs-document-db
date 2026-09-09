import {describe, expect, test} from 'bun:test'

import {
	isThenAndNowSource,
	validateTakenYear,
	validateThenAndNowHistoricalImage,
	validateThenAndNowSource,
	validateThenAndNowUpload,
	validateThenAndNowViewPhoto,
	warnThenAndNowViewAlt,
} from './thenAndNowValidation'

describe('validateThenAndNowSource', () => {
	test('accepts catalog and upload sources', () => {
		expect(validateThenAndNowSource('historicalImage')).toBe(true)
		expect(validateThenAndNowSource('upload')).toBe(true)
		expect(isThenAndNowSource('historicalImage')).toBe(true)
	})

	test('rejects a missing or unknown source', () => {
		expect(validateThenAndNowSource(undefined)).toBe(
			'Choose Historical Image or Uploaded photograph',
		)
		expect(validateThenAndNowSource('figure')).toBe(
			'Choose Historical Image or Uploaded photograph',
		)
	})
})

describe('validateThenAndNowViewPhoto', () => {
	test('requires a cataloged Historical Image for that source', () => {
		expect(validateThenAndNowViewPhoto({source: 'historicalImage'})).toBe(
			'Choose a cataloged Historical Image',
		)
		expect(
			validateThenAndNowViewPhoto({
				source: 'historicalImage',
				historicalImage: {_ref: 'image-1'},
			}),
		).toBe(true)
	})

	test('requires an uploaded asset for that source', () => {
		expect(validateThenAndNowViewPhoto({source: 'upload'})).toBe('Upload a photograph')
		expect(
			validateThenAndNowViewPhoto({
				source: 'upload',
				image: {asset: {_ref: 'image-asset-1'}},
			}),
		).toBe(true)
	})
})

describe('field validators', () => {
	test('skip the hidden source', () => {
		expect(validateThenAndNowHistoricalImage(undefined, {source: 'upload'})).toBe(true)
		expect(validateThenAndNowUpload(undefined, {source: 'historicalImage'})).toBe(true)
	})

	test('require the visible source', () => {
		expect(validateThenAndNowHistoricalImage(undefined, {source: 'historicalImage'})).toBe(
			'Choose a cataloged Historical Image',
		)
		expect(validateThenAndNowUpload(undefined, {source: 'upload'})).toBe('Upload a photograph')
	})
})

describe('warnThenAndNowViewAlt', () => {
	test('warns only for uploads without alt text', () => {
		expect(warnThenAndNowViewAlt(undefined, {source: 'historicalImage'})).toBe(true)
		expect(warnThenAndNowViewAlt(undefined, {source: 'upload'})).toBe(
			'Alt text helps accessibility and SEO',
		)
		expect(warnThenAndNowViewAlt('  Paoli Inn, 2024  ', {source: 'upload'})).toBe(true)
	})
})

describe('validateTakenYear', () => {
	test('allows a blank year', () => {
		expect(validateTakenYear(undefined, 2026)).toBe(true)
	})

	test('rejects a non-integer or out-of-range year', () => {
		expect(validateTakenYear(1890.5, 2026)).toBe('Use a whole year')
		expect(validateTakenYear(1799, 2026)).toBe('Use a year between 1800 and 2027')
		expect(validateTakenYear(2028, 2026)).toBe('Use a year between 1800 and 2027')
	})

	test('accepts a plausible year', () => {
		expect(validateTakenYear(1890, 2026)).toBe(true)
		expect(validateTakenYear(2027, 2026)).toBe(true)
	})
})
