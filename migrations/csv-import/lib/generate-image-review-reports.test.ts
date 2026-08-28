import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {afterAll, describe, expect, test} from 'bun:test'

import type {ImportedRecord} from './audit'
import {
	buildMissingTaxonomiesPage,
	buildNeedsManualLinksPage,
	buildSkippedPage,
	collectMissingTaxonomyRows,
	generateImageReviewReports,
	groupSkippedByReason,
	recordsFromLedgerCsv,
	type SkippedReviewRow,
	suggestedTaxonomyAction,
} from './generate-image-review-reports'
import {escapeHtml, renderReviewHtml, uniqueRowIds} from './review-html-report'

function skipped(
	partial: Partial<SkippedReviewRow> & Pick<SkippedReviewRow, 'id' | 'reason'>,
): SkippedReviewRow {
	return {
		clipId: partial.clipId ?? partial.id,
		title: partial.title ?? 'Title',
		csvType: partial.csvType ?? 'Photo',
		detail: partial.detail ?? '',
		httpStatus: partial.httpStatus ?? '',
		url: partial.url ?? '',
		batch: partial.batch ?? 'offset-0-limit-1000',
		...partial,
	}
}

function imported(
	clipId: string,
	title: string,
	unmapped: string[],
	sanityId?: string,
): ImportedRecord {
	return {
		clipId,
		title,
		csvType: 'photo',
		schemaType: 'historicalImage',
		action: 'patched',
		sanityId,
		mappedKeywords: [],
		unmappedKeywords: unmapped,
	}
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'image-review-'))

afterAll(() => {
	fs.rmSync(tmp, {recursive: true, force: true})
})

describe('escapeHtml', () => {
	test('escapes markup in titles', () => {
		expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
			'&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
		)
	})
})

describe('groupSkippedByReason', () => {
	test('orders groups by size then reason', () => {
		const groups = groupSkippedByReason([
			skipped({id: 'B', reason: 'api_error'}),
			skipped({id: 'A1', reason: 'asset_error'}),
			skipped({id: 'A2', reason: 'asset_error'}),
			skipped({id: 'P', reason: 'private_image'}),
		])
		expect(groups.map((group) => group.reason)).toEqual([
			'asset_error',
			'api_error',
			'private_image',
		])
		expect(groups[0].rows.map((row) => row.id)).toEqual(['A1', 'A2'])
	})
})

describe('collectMissingTaxonomyRows', () => {
	test('one row per keyword with image counts and stable ids', () => {
		const rows = collectMissingTaxonomyRows([
			imported('STI3', 'Stirling', ['Tredyffrin', 'House']),
			imported('FFF1', 'Far Fields', ['Tredyffrin', 'Farm']),
			imported('DEI12', 'Deist', ['donation:0', 'Easttown']),
		])
		expect(rows.map((row) => row.id)).toEqual([
			'township:tredyffrin',
			'township:easttown',
			'subject:farm',
			'subject:house',
			'donation:donation:0',
		])
		expect(
			rows.find((row) => row.id === 'township:tredyffrin')?.images.map((image) => image.clipId),
		).toEqual(['STI3', 'FFF1'])
	})
})

describe('suggestedTaxonomyAction', () => {
	test('flags donation:0 and Schuylkill', () => {
		expect(suggestedTaxonomyAction('donation', 'donation:0')).toContain('invalid')
		expect(suggestedTaxonomyAction('township', 'Schuylkill')).toContain('river')
		expect(suggestedTaxonomyAction('subject', 'Place')).toContain('Subject Category')
	})
})

describe('recordsFromLedgerCsv', () => {
	test('joins township, subject, and donation columns', () => {
		const [record] = recordsFromLedgerCsv([
			{
				archiveId: 'STI3',
				title: 'Stirling',
				missingTownship: 'Tredyffrin',
				missingSubject: 'House; Farm',
				missingDonation: '',
			},
		])
		expect(record.unmappedKeywords).toEqual(['Tredyffrin', 'House', 'Farm'])
	})
})

describe('renderReviewHtml', () => {
	test('includes resolve controls, storage key, and zebra styles', () => {
		const html = renderReviewHtml(
			buildSkippedPage([
				skipped({
					id: 'IT3',
					clipId: 'IT3',
					title: 'White Horse <Tavern>',
					reason: 'asset_error',
					httpStatus: '404',
					url: 'https://example.com/IT3.jpg',
				}),
			]),
		)
		expect(html).toContain('data-report="skipped"')
		expect(html).toContain('tehs-image-review:')
		expect(html).toContain('class="resolve-toggle"')
		expect(html).toContain('data-id="IT3"')
		expect(html).toContain('data-export')
		expect(html).toContain('data-import')
		expect(html).toContain('data-status="open"')
		expect(html).toContain('Mark visible resolved')
		expect(html).toContain('#f6f6f4')
		expect(html).toContain('White Horse &lt;Tavern&gt;')
		expect(html).not.toContain('White Horse <Tavern>')
	})

	test('needs-manual-links syncs both views on the same Archive ID', () => {
		const html = renderReviewHtml(
			buildNeedsManualLinksPage(
				[imported('STI3', 'Stirling', ['Tredyffrin', 'House'])],
				new Map([['STI3', 'abc123']]),
			),
		)
		expect(html).toContain('id="by-keyword"')
		expect(html).toContain('id="by-image"')
		expect((html.match(/data-id="STI3"/g) ?? []).length).toBeGreaterThan(3)
		expect(html).toContain('intent/edit/id=abc123;type=historicalImage')
		expect(
			uniqueRowIds(buildNeedsManualLinksPage([imported('STI3', 'Stirling', ['House'])], new Map())),
		).toEqual(['STI3'])
	})

	test('missing taxonomies use kind:keyword ids', () => {
		const page = buildMissingTaxonomiesPage(
			collectMissingTaxonomyRows([imported('SCU10', 'Catfish', ['Schuylkill'])]),
		)
		const html = renderReviewHtml(page)
		expect(html).toContain('data-id="township:schuylkill"')
		expect(html).toContain('data-report="missing-taxonomies"')
		expect(html).toContain('river')
	})
})

describe('generateImageReviewReports', () => {
	test('writes three HTML reports from batch CSVs and the ledger', async () => {
		const reportsDir = path.join(tmp, 'reports')
		const ledgerDir = path.join(tmp, 'ledger')
		const batchDir = path.join(reportsDir, 'offset-0-limit-1000')
		fs.mkdirSync(batchDir, {recursive: true})
		fs.mkdirSync(ledgerDir, {recursive: true})
		fs.writeFileSync(
			path.join(batchDir, 'skipped.csv'),
			[
				'clipId,title,csvType,reason,detail',
				'IT3,White Horse,Photo,asset_error,HTTP fetch failed',
			].join('\n') + '\n',
		)
		fs.writeFileSync(
			path.join(batchDir, 'asset-errors.csv'),
			['archiveId,url,httpStatus,detail', 'IT3,https://example.com/IT3.jpg,404,HTTP 404'].join(
				'\n',
			) + '\n',
		)
		fs.writeFileSync(
			path.join(batchDir, 'imported.csv'),
			[
				'clipId,title,csvType,schemaType,action,sanityId,mappedKeywords,unmappedKeywords',
				'STI3,Stirling,photo,historicalImage,patched,abc123,,Tredyffrin',
			].join('\n') + '\n',
		)
		fs.writeFileSync(
			path.join(ledgerDir, 'images-manual-links.csv'),
			[
				'archiveId,title,missingTownship,missingSubject,missingDonation',
				'STI3,Stirling,Tredyffrin,House,',
			].join('\n') + '\n',
		)

		const files = await generateImageReviewReports({reportsDir, ledgerDir, outputDir: reportsDir})
		const skippedHtml = fs.readFileSync(files.skipped, 'utf8')
		const missingHtml = fs.readFileSync(files.missingTaxonomies, 'utf8')
		const manualHtml = fs.readFileSync(files.needsManualLinks, 'utf8')

		expect(skippedHtml).toContain('data-id="IT3"')
		expect(skippedHtml).toContain('https://example.com/IT3.jpg')
		expect(skippedHtml).toContain('404')
		expect(missingHtml).toContain('data-id="township:tredyffrin"')
		expect(missingHtml).toContain('data-id="subject:house"')
		expect(manualHtml).toContain('intent/edit/id=abc123;type=historicalImage')
		expect(manualHtml).toContain('Tredyffrin')
	})
})
