import {describe, expect, test} from 'bun:test'

import {TYPE_BY_CLIP_ID} from './patch-documents-full-types'

describe('TYPE_BY_CLIP_ID', () => {
	test('does not blanket-map empty-title NULL rows', () => {
		expect(TYPE_BY_CLIP_ID['279']).toBeUndefined()
		expect(TYPE_BY_CLIP_ID['652']).toBeUndefined()
	})

	test('maps article rows to specific TYPE_MAP spellings', () => {
		expect(TYPE_BY_CLIP_ID['639']).toBe('census')
		expect(TYPE_BY_CLIP_ID['643']).toBe('book')
		expect(TYPE_BY_CLIP_ID['645']).toBe('newspaper clipping')
		expect(TYPE_BY_CLIP_ID['940']).toBe('book')
	})
})
