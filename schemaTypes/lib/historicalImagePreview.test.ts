import {describe, expect, test} from 'bun:test'

/**
 * Mirrors historicalImage preview subtitle logic for Missing Archive ID.
 */
function archiveLabel(archiveId: unknown): string {
	return typeof archiveId === 'string' && archiveId.trim() ? archiveId : 'Missing Archive ID'
}

describe('historicalImage preview archive label', () => {
	test('uses Missing Archive ID when empty', () => {
		expect(archiveLabel(undefined)).toBe('Missing Archive ID')
		expect(archiveLabel('')).toBe('Missing Archive ID')
		expect(archiveLabel('   ')).toBe('Missing Archive ID')
	})

	test('keeps a real Archive ID', () => {
		expect(archiveLabel('BKH1')).toBe('BKH1')
	})
})
