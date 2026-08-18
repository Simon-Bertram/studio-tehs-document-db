import {describe, expect, test} from 'bun:test'

import {
	classifyUnmappedKeyword,
	formatNeedsManualLinksMarkdown,
	splitUnmappedKeywords,
} from './needs-manual-links-report'

describe('classifyUnmappedKeyword', () => {
	test('recognizes townships, subjects, and donations', () => {
		expect(classifyUnmappedKeyword('Tredyffrin')).toBe('township')
		expect(classifyUnmappedKeyword('House')).toBe('subject')
		expect(classifyUnmappedKeyword('donation:0')).toBe('donation')
	})
})

describe('splitUnmappedKeywords', () => {
	test('splits mixed keywords into columns', () => {
		expect(splitUnmappedKeywords(['Tredyffrin', 'House', 'donation:0'])).toEqual({
			township: 'Tredyffrin',
			subject: 'House',
			donation: 'donation:0',
			other: '',
		})
	})
})

describe('formatNeedsManualLinksMarkdown', () => {
	test('groups images by missing keyword', () => {
		const md = formatNeedsManualLinksMarkdown([
			{
				clipId: 'STI3',
				title: 'Interior of Stirling’s Quarters',
				csvType: 'photo',
				schemaType: 'historicalImage',
				action: 'dry_run',
				mappedKeywords: [],
				unmappedKeywords: ['Tredyffrin', 'House'],
			},
			{
				clipId: 'WCU1',
				title: 'Margaret Currie',
				csvType: 'photo',
				schemaType: 'historicalImage',
				action: 'dry_run',
				mappedKeywords: [],
				unmappedKeywords: ['person'],
			},
		])
		expect(md).toContain('## Townships')
		expect(md).toContain('### Tredyffrin (1)')
		expect(md).toContain('| STI3 | Interior of Stirling’s Quarters |')
		expect(md).toContain('## Subjects')
		expect(md).toContain('### House (1)')
		expect(md).toContain('### person (1)')
		expect(md).not.toContain('Entity names (e.g. Lincoln)')
	})
})
