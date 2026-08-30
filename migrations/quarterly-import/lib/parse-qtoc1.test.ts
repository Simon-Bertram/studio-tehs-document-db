import {describe, expect, test} from 'bun:test'

import {parseQtoc1} from './parse-qtoc1'

const QTOC1 = `
<table>
	<tr>
		<td class="coverImg"><img src="images/hqc/Qv58n1Cover_200.jpg" alt="Cover"></td>
		<td align="left">
			<p>
				<b>Spring 2026, Volume 58, Number 1</b><br>
				<i>Murder by Cake</i> &ndash; Jacques Gordon<br>
				<i>Notes and Comments:</i>
			</p>
			<ul>
				<li><i>Excursion to the Mill at Anselma</i> &ndash; John O. Senior</li>
			</ul>
			<p>
				<i>Support Recognition</i><br>
				<a class="linktext" href="qswc/q5801/toc.html">Supplemental Web Content</a>
			</p>
		</td>
	</tr>
	<tr>
		<td class="coverImg"><a href="hqda/toc/qv44toc.html#tocN1+2"><img src="images/hqc/Qv44n1+2Cover_100.jpg" alt="Cover"></a></td>
		<td align="left">
			<p>
				<b>Winter/Spring 2007. Volume 44, Numbers 1 and 2 (double issue)</b><br>
				&ndash; Special double issue celebrating the 300th Anniversary of Tredyffrin Township<br>
				<i>The History of Tredyffrin Township 1707 &ndash; 2007</i> &ndash; Mike Bertram, editor<br>
			</p>
		</td>
	</tr>
	<tr>
		<td class="coverImg"><img src="images/hqc/Qv55n4Cover_100.jpg" alt="Cover"></td>
		<td>
			<p>
				<b>Winter 2021, Volume 55, Number 4</b><br>
				<b>The Devon Inn</b> (Special Edition Expanded Issue )
			</p>
			<p>
				<i>The Devon Inn Story: Further Discoveries</i>
			</p>
			<ul>
				<li>Devon Inn History Timeline</li>
				<li>The Architects of the Devon Inns &ndash; Greg Prichard</li>
			</ul>
		</td>
	</tr>
</table>
`

describe('parseQtoc1', () => {
	const parsed = parseQtoc1(QTOC1)

	test('parses a seasonal issue, nested notes, and skips Support Recognition', () => {
		expect(parsed.issues[0]).toMatchObject({
			volume: 58,
			issueNumber: 1,
			season: 'spring',
			sourceKey: 'v58n1',
		})
		expect(parsed.issues[0].coverUrl).toContain('Qv58n1Cover_200.jpg')
		expect(parsed.issues[0].tocNotes).toContain('Supplemental web content')

		const titles = parsed.articles.filter((a) => a.volume === 58).map((a) => a.title)
		expect(titles).toContain('Murder by Cake')
		expect(titles).toContain('Excursion to the Mill at Anselma')
		expect(titles.some((t) => /support recognition/i.test(t))).toBe(false)
		expect(parsed.skipped.some((s) => s.reason === 'boilerplate')).toBe(true)
	})

	test('parses a double issue', () => {
		expect(parsed.issues[1]).toMatchObject({
			volume: 44,
			issueNumber: 1,
			issueNumberEnd: 2,
			combinedIssue: true,
			sourceKey: 'v44n1+2',
			season: 'winter',
		})
	})

	test('nested authored subheads become stubs; unauthored subheads are reported', () => {
		const devon = parsed.articles.filter((a) => a.volume === 55)
		expect(devon.some((a) => a.title === 'The Devon Inn Story: Further Discoveries')).toBe(true)
		expect(devon.some((a) => a.authorText === 'Greg Prichard')).toBe(true)
		expect(parsed.skipped.some((s) => s.title === 'Devon Inn History Timeline')).toBe(true)
	})
})
