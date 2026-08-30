import {describe, expect, test} from 'bun:test'

import {sourceKeyFromHref, parseVolumeCatalog} from './parse-toc'

const V22_ISSUE = `
<td class="tocCover"><img src="../covers/v22n1c150.jpg" alt="Cover v22n1"></td>
<td class="hqvitoc">
	<a name="tocN1"></a>
	<b>Volume 22 Number 1 — January 1984</b><br>
	<table class="vitoc">
		<tr><td class="tocPgNum">2</td><td class="tocTitle"><a href="../html/v22/v22n1p002.html">Foreword</a></td></tr>
		<tr><td class="tocPgNum">3</td><td class="tocTitle"><a href="../html/v22/v22n1p003.html">Glimpses of the History of St. Peter's Church</a> by Elizabeth Rumrill</td></tr>
	</table>
</td>
`

const DOUBLE_ISSUE = `
<td class="tocCover"><img src="../covers/v44n1+2c150.jpg" alt="Cover"></td>
<td class="hqvitoc">
	<b>Volume 44 Numbers 1 and 2 — Winter/Spring 2007</b><br>
	<table class="vitoc">
		<tr><td class="tocPgNum">15</td><td class="tocTitle"><a href="../html/v44/v44n1+2p015.html">Inns and Taverns</a> by Beth Arnold</td></tr>
		<tr><td class="tocPgNum">BC</td><td class="tocTitle"><a href="../html/v44/v44n1+2pbc.html">Back Cover</a></td></tr>
	</table>
</td>
`

const V1_ISSUE = `
<td class="tocCover"><img src="../covers/v1n1c150.jpg" alt="Cover"></td>
<td class="hqvitoc">
	<b>Volume 1 Number 1 — Autumn 1937</b><br>
	<table class="vitoc">
		<tr><td class="tocPgNum">1</td><td class="tocTitle"><a href="../html/v01/v01n1p001.html">Editorial: Objectives of the T-E History Club</a> by Anthony Wayne Baugh</td></tr>
	</table>
</td>
`

describe('sourceKeyFromHref', () => {
	test('keeps padded page digits and strips volume padding', () => {
		expect(sourceKeyFromHref('../html/v22/v22n1p003.html')).toBe('v22n1p003')
		expect(sourceKeyFromHref('../html/v01/v01n1p001.html')).toBe('v1n1p001')
	})

	test('encodes a double issue href', () => {
		expect(sourceKeyFromHref('../html/v44/v44n1+2p015.html')).toBe('v44n1+2p015')
	})
})

describe('parseVolumeCatalog', () => {
	test('parses a month-dated issue with cover and author', () => {
		const {issues, articles} = parseVolumeCatalog(`<table><tr>${V22_ISSUE}</tr></table>`, {
			baseUrl: 'https://www.tehistory.org/hqda',
			volume: 22,
		})
		expect(issues).toHaveLength(1)
		expect(issues[0]).toMatchObject({
			volume: 22,
			issueNumber: 1,
			combinedIssue: false,
			sourceKey: 'v22n1',
			publicationDate: {precision: 'month', year: 1984, month: 1},
		})
		expect(issues[0].coverUrl).toContain('v22n1c150.jpg')
		expect(articles[1]).toMatchObject({
			title: "Glimpses of the History of St. Peter's Church",
			authorText: 'Elizabeth Rumrill',
			startPage: 3,
			sourceKey: 'v22n1p003',
		})
	})

	test('parses a combined issue and non-numeric page', () => {
		const {issues, articles} = parseVolumeCatalog(`<table><tr>${DOUBLE_ISSUE}</tr></table>`, {
			baseUrl: 'https://www.tehistory.org/hqda',
			volume: 44,
		})
		expect(issues[0]).toMatchObject({
			volume: 44,
			issueNumber: 1,
			issueNumberEnd: 2,
			combinedIssue: true,
			sourceKey: 'v44n1+2',
		})
		expect(articles[0].sourceKey).toBe('v44n1+2p015')
		expect(articles[1]).toMatchObject({pageLabel: 'BC', startPage: undefined})
	})

	test('parses volume 1 padded hrefs', () => {
		const {issues, articles} = parseVolumeCatalog(`<table><tr>${V1_ISSUE}</tr></table>`, {
			baseUrl: 'https://www.tehistory.org/hqda',
			volume: 1,
		})
		expect(issues[0].season).toBe('autumn')
		expect(articles[0].sourceKey).toBe('v1n1p001')
		expect(articles[0].sourceUrl).toContain('/html/v01/v01n1p001.html')
	})
})
