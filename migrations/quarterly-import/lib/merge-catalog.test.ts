import {describe, expect, test} from 'bun:test'

import {mergeArticleStubs, unionIssues} from './merge-catalog'
import type {HqIndexRow} from './parse-hq-index'
import type {Qtoc1Article, Qtoc1Issue} from './parse-qtoc1'
import type {TocArticle, TocIssue} from './parse-toc'

describe('unionIssues', () => {
	test('prefers volume TOC heading over qtoc1 and PDF', () => {
		const pdfRows: HqIndexRow[] = [
			{
				authorText: 'Arnold Beth',
				title: 'Inns and Taverns',
				volume: 44,
				issueNumber: 1,
				issueNumberEnd: 2,
				startPage: 15,
				citation: '44-1/2-15',
				raw: '',
			},
		]
		const qtoc1Issues: Qtoc1Issue[] = [
			{
				volume: 44,
				issueNumber: 1,
				issueNumberEnd: 2,
				combinedIssue: true,
				season: 'winter',
				sourceKey: 'v44n1+2',
				coverUrl: 'https://example.org/qtoc1.jpg',
			},
		]
		const tocIssues: TocIssue[] = [
			{
				volume: 44,
				issueNumber: 1,
				issueNumberEnd: 2,
				combinedIssue: true,
				sourceKey: 'v44n1+2',
				coverUrl: 'https://example.org/toc.jpg',
				publicationDate: {precision: 'year', year: 2007, qualifier: 'exact'},
			},
		]
		const issues = unionIssues({tocIssues, qtoc1Issues, pdfRows})
		expect(issues).toHaveLength(1)
		expect(issues[0].source).toBe('volume-toc')
		expect(issues[0].coverUrl).toBe('https://example.org/toc.jpg')
		expect(issues[0].season).toBe('winter')
	})
})

describe('mergeArticleStubs', () => {
	test('TOC wins title/url; PDF fills pages when missing', () => {
		const issues = unionIssues({
			tocIssues: [
				{
					volume: 22,
					issueNumber: 1,
					combinedIssue: false,
					sourceKey: 'v22n1',
				},
			],
			qtoc1Issues: [],
			pdfRows: [],
		})
		const tocArticles: TocArticle[] = [
			{
				title: "Glimpses of the History of St. Peter's Church",
				authorText: 'Elizabeth Rumrill',
				volume: 22,
				issue: 1,
				startPage: 3,
				sourceKey: 'v22n1p003',
				sourceUrl: 'https://www.tehistory.org/hqda/html/v22/v22n1p003.html',
			},
			{
				title: 'Foreword',
				volume: 22,
				issue: 1,
				startPage: 2,
				sourceKey: 'v22n1p002',
				sourceUrl: 'https://www.tehistory.org/hqda/html/v22/v22n1p002.html',
			},
		]
		const qtoc1Articles: Qtoc1Article[] = [
			{
				title: "Glimpses of the History of St. Peter's Church",
				volume: 22,
				issueNumber: 1,
				sourceKey: 'v22n1/glimpses',
			},
		]
		const pdfRows: HqIndexRow[] = [
			{
				authorText: 'Rumrill Elizabeth',
				title: "Glimpses of the History of St. Peter's Church",
				volume: 22,
				issueNumber: 1,
				startPage: 3,
				citation: '22-1-003',
				raw: '',
			},
		]
		const {stubs, unmatched} = mergeArticleStubs({
			issues,
			tocArticles,
			qtoc1Articles,
			pdfRows,
		})
		expect(unmatched).toHaveLength(0)
		const rumrill = stubs.find((s) => s.sourceKey === 'v22n1p003')
		expect(rumrill?.origin).toBe('volume-toc')
		expect(rumrill?.authorText).toBe('Elizabeth Rumrill')
		expect(rumrill?.endPage).toBeUndefined()
		const foreword = stubs.find((s) => s.sourceKey === 'v22n1p002')
		expect(foreword?.endPage).toBe(2)
	})

	test('PDF rows without an issue are unmatched', () => {
		const {unmatched} = mergeArticleStubs({
			issues: [],
			tocArticles: [],
			qtoc1Articles: [],
			pdfRows: [
				{
					authorText: 'X',
					title: 'Orphan',
					volume: 99,
					issueNumber: 1,
					startPage: 1,
					citation: '99-1-001',
					raw: '',
				},
			],
		})
		expect(unmatched).toHaveLength(1)
		expect(unmatched[0].reason).toBe('unmatched_issue')
	})

	test('does not invent a fifth issue from a bad PDF citation', () => {
		const issues = unionIssues({
			tocIssues: [
				{
					volume: 41,
					issueNumber: 4,
					combinedIssue: false,
					sourceKey: 'v41n4',
				},
			],
			qtoc1Issues: [],
			pdfRows: [
				{
					authorText: 'Notes and Comments',
					title: 'New Principal at Conestoga High School',
					volume: 41,
					issueNumber: 5,
					startPage: 135,
					citation: '41-5-135',
					raw: '',
				},
			],
		})
		expect(issues.map((i) => i.sourceKey)).toEqual(['v41n4'])
		const {unmatched} = mergeArticleStubs({
			issues,
			tocArticles: [],
			qtoc1Articles: [],
			pdfRows: [
				{
					authorText: 'Notes and Comments',
					title: 'New Principal at Conestoga High School',
					volume: 41,
					issueNumber: 5,
					startPage: 135,
					citation: '41-5-135',
					raw: '',
				},
			],
		})
		expect(unmatched).toHaveLength(1)
	})
})
