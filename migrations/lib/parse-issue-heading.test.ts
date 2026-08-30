import {describe, expect, test} from 'bun:test'

import {parseIssueHeading} from './parse-issue-heading'
import {quarterlyIssueSourceKey} from './quarterly-issue-source-key'

describe('parseIssueHeading', () => {
	test('parses a month-dated volume TOC heading', () => {
		const parsed = parseIssueHeading('Volume 22 Number 1 — January 1984')
		expect(parsed).toMatchObject({
			volume: 22,
			issueNumber: 1,
			combinedIssue: false,
			publicationDate: {precision: 'month', year: 1984, month: 1},
		})
		expect(parsed?.season).toBeUndefined()
	})

	test('parses a seasonal volume TOC heading', () => {
		const parsed = parseIssueHeading('Volume 1 Number 1 — Autumn 1937')
		expect(parsed).toMatchObject({
			volume: 1,
			issueNumber: 1,
			combinedIssue: false,
			season: 'autumn',
			publicationDate: {precision: 'year', year: 1937},
		})
	})

	test('parses a qtoc1 seasonal heading', () => {
		const parsed = parseIssueHeading('Spring 2026, Volume 58, Number 1')
		expect(parsed).toMatchObject({
			volume: 58,
			issueNumber: 1,
			combinedIssue: false,
			season: 'spring',
			publicationDate: {precision: 'year', year: 2026},
		})
	})

	test('maps Fall to autumn', () => {
		const parsed = parseIssueHeading('Fall 2008, Volume 45, Number 4')
		expect(parsed?.season).toBe('autumn')
		expect(parsed?.volume).toBe(45)
		expect(parsed?.issueNumber).toBe(4)
	})

	test('parses a double issue with and', () => {
		const parsed = parseIssueHeading(
			'Winter/Spring 2007. Volume 44, Numbers 1 and 2 (double issue)',
		)
		expect(parsed).toMatchObject({
			volume: 44,
			issueNumber: 1,
			issueNumberEnd: 2,
			combinedIssue: true,
			season: 'winter',
			publicationDate: {precision: 'year', year: 2007},
		})
	})

	test('parses Numbers 3 & 4', () => {
		const parsed = parseIssueHeading('February 2016, Volume 52, Numbers 3 & 4')
		expect(parsed).toMatchObject({
			volume: 52,
			issueNumber: 3,
			issueNumberEnd: 4,
			combinedIssue: true,
			publicationDate: {precision: 'month', year: 2016, month: 2},
		})
	})

	test('strips Table of Contents from a month heading', () => {
		const parsed = parseIssueHeading(
			'July 2012, Volume 49, Number 1 & 2 — Table of Contents',
		)
		expect(parsed).toMatchObject({
			volume: 49,
			issueNumber: 1,
			issueNumberEnd: 2,
			combinedIssue: true,
			publicationDate: {precision: 'month', year: 2012, month: 7},
		})
	})
})

describe('quarterlyIssueSourceKey', () => {
	test('encodes a single issue', () => {
		expect(quarterlyIssueSourceKey(22, 1)).toBe('v22n1')
	})

	test('encodes a double issue', () => {
		expect(quarterlyIssueSourceKey(44, 1, 2)).toBe('v44n1+2')
	})
})
