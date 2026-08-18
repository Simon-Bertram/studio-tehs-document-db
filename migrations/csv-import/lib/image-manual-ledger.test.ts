import {describe, expect, test} from 'bun:test'

import type {ImportedRecord} from './audit'
import {
	emptyLedger,
	formatCumulativeLedgerMarkdown,
	mergeImageManualLedger,
} from './image-manual-ledger'

function imported(clipId: string, title: string, unmapped: string[]): ImportedRecord {
	return {
		clipId,
		title,
		csvType: 'photo',
		schemaType: 'historicalImage',
		action: 'created',
		mappedKeywords: [],
		unmappedKeywords: unmapped,
	}
}

describe('mergeImageManualLedger', () => {
	test('unions new unmapped IDs and drops IDs that linked this run', () => {
		const previous = mergeImageManualLedger(emptyLedger(), {
			imported: [imported('STI3', 'Stirling', ['Tredyffrin', 'House'])],
			locationRows: [{clipId: 'STI3', title: 'Stirling', photoLocation: 'Valley Forge'}],
			peopleRows: [],
		})

		const merged = mergeImageManualLedger(previous, {
			imported: [imported('STI3', 'Stirling', []), imported('FFF1', 'Far Fields', ['Tredyffrin'])],
			locationRows: [{clipId: 'FFF1', title: 'Far Fields', photoLocation: 'Berwyn'}],
			peopleRows: [],
		})

		const tredyffrin = Object.values(merged.taxonomy).find(
			(group) => group.keyword === 'Tredyffrin',
		)
		expect(tredyffrin?.rows.map((row) => row.clipId)).toEqual(['FFF1'])
		expect(merged.taxonomy['subject:house']).toBeUndefined()
		expect(merged.locations['Valley Forge']).toBeUndefined()
		expect(merged.locations.Berwyn?.map((row) => row.clipId)).toEqual(['FFF1'])
	})

	test('keeps IDs from earlier batches that were not in this slice', () => {
		const previous = mergeImageManualLedger(emptyLedger(), {
			imported: [imported('MAX1', 'Maxwell', ['Tredyffrin'])],
			locationRows: [],
			peopleRows: [],
		})
		const merged = mergeImageManualLedger(previous, {
			imported: [imported('BKH1', 'Bake House', ['Upper Merion'])],
			locationRows: [],
			peopleRows: [],
		})
		const ids = Object.values(merged.taxonomy).flatMap((group) =>
			group.rows.map((row) => row.clipId),
		)
		expect(ids.sort()).toEqual(['BKH1', 'MAX1'])
	})

	test('accumulates Person-subject rows for later people[] review', () => {
		const merged = mergeImageManualLedger(emptyLedger(), {
			imported: [imported('WCU1', 'Margaret Currie', ['person'])],
			locationRows: [],
			peopleRows: [{clipId: 'WCU1', title: 'Margaret Currie'}],
		})
		expect(merged.peopleReview).toEqual([{clipId: 'WCU1', title: 'Margaret Currie'}])
	})
})

describe('formatCumulativeLedgerMarkdown', () => {
	test('includes location text and people review sections', () => {
		const ledger = mergeImageManualLedger(emptyLedger(), {
			imported: [imported('WCU1', 'Margaret Currie', ['person'])],
			locationRows: [{clipId: 'WCU1', title: 'Margaret Currie', photoLocation: 'Paoli'}],
			peopleRows: [{clipId: 'WCU1', title: 'Margaret Currie'}],
		})
		const md = formatCumulativeLedgerMarkdown(ledger)
		expect(md).toContain('## Location text (not auto-linked)')
		expect(md).toContain('### Paoli (1)')
		expect(md).toContain('## Review people depicted')
		expect(md).toContain('| WCU1 | Margaret Currie |')
	})
})
