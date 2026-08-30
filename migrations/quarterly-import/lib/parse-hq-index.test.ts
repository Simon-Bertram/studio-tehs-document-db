import {describe, expect, test} from 'bun:test'

import {parseHqIndexText} from './parse-hq-index'

const SAMPLE = `
Author Title Citation
(volume, issue,
page)
Aberle Dana Eliza Cathcart Home 1893-1992 31-2-059
Arnold Beth Inns and Taverns 44-1/2-15
Bellew Bill The Shoe Makers Shoe Maker, The Quici Family of Berwyn 44-3-112-114
Rumrill Elizabeth Glimpses of the History of St. Peter's Church 22-1-003
Andrews, Jr. William Town In Memoriam – William Town Andrews, May 8, 1926 – January 8, 2010; in
Notes and Comments
47-1-023
American Republican A Gypsy Camp in Easttown Township [November 25, 1856] 19-3-097
`

describe('parseHqIndexText', () => {
	const {rows} = parseHqIndexText(SAMPLE)

	test('parses Rumrill / St. Peter’s / 22-1:3', () => {
		const row = rows.find((r) => r.citation === '22-1-003')
		expect(row).toMatchObject({
			authorText: 'Elizabeth Rumrill',
			title: "Glimpses of the History of St. Peter's Church",
			volume: 22,
			issueNumber: 1,
			startPage: 3,
		})
	})

	test('parses Arnold / Inns / 44-1/2:15', () => {
		const row = rows.find((r) => r.citation === '44-1/2-15')
		expect(row).toMatchObject({
			authorText: 'Beth Arnold',
			title: 'Inns and Taverns',
			volume: 44,
			issueNumber: 1,
			issueNumberEnd: 2,
			startPage: 15,
		})
	})

	test('parses a page range and a wrapped line', () => {
		expect(rows.find((r) => r.citation === '44-3-112-114')?.endPage).toBe(114)
		expect(rows.find((r) => r.citation === '47-1-023')?.title).toContain('In Memoriam')
	})

	test('keeps a corporate author', () => {
		expect(rows.find((r) => r.citation === '19-3-097')?.authorText).toBe('American Republican')
	})
})
