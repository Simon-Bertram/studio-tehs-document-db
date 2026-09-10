import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {afterAll, describe, expect, test} from 'bun:test'

import type {ImportedRecord} from './audit'
import {
	buildDocumentMissingTaxonomiesPage,
	buildDocumentNeedsManualLinksPage,
	buildDocumentSkippedPage,
	DOCUMENT_STORAGE_PREFIX,
	type DocumentSkippedRow,
	generateDocumentReviewReports,
	groupUnknownTypeByCsvType,
} from './generate-document-review-reports'
import {renderReviewHtml} from './review-html-report'

function skipped(
	partial: Partial<DocumentSkippedRow> & Pick<DocumentSkippedRow, 'id' | 'reason'>,
): DocumentSkippedRow {
	return {
		clipId: partial.clipId ?? partial.id,
		title: partial.title ?? 'Title',
		csvType: partial.csvType ?? 'document',
		detail: partial.detail ?? '',
		...partial,
	}
}

function imported(
	clipId: string,
	title: string,
	unmapped: string[],
	schemaType = 'primarySource',
	sanityId?: string,
): ImportedRecord {
	return {
		clipId,
		title,
		csvType: 'document',
		schemaType,
		action: sanityId ? 'created' : 'dry_run',
		sanityId,
		mappedKeywords: [],
		unmappedKeywords: unmapped,
	}
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'document-review-'))

afterAll(() => {
	fs.rmSync(tmp, {recursive: true, force: true})
})

describe('groupUnknownTypeByCsvType', () => {
	test('orders unknown types by count then name', () => {
		const groups = groupUnknownTypeByCsvType([
			skipped({id: '1', reason: 'unknown_type', csvType: 'Will'}),
			skipped({id: '2', reason: 'unknown_type', csvType: 'Newspaper article'}),
			skipped({id: '3', reason: 'unknown_type', csvType: 'Newspaper article'}),
			skipped({id: '4', reason: 'unknown_type', csvType: 'NULL'}),
		])
		expect(groups.map((group) => group.csvType)).toEqual(['Newspaper article', 'NULL', 'Will'])
		expect(groups[0].rows.map((row) => row.id)).toEqual(['2', '3'])
	})
})

describe('buildDocumentSkippedPage', () => {
	test('uses document storage prefix and subgroups unknown types', () => {
		const html = renderReviewHtml(
			buildDocumentSkippedPage([
				skipped({
					id: '946',
					clipId: '946',
					title: 'Introduction',
					reason: 'unknown_type',
					csvType: 'NULL',
					detail: 'Unknown type "NULL"',
				}),
				skipped({
					id: '1',
					clipId: '1',
					title: 'Ad',
					reason: 'unknown_type',
					csvType: 'Newspaper advertisement',
					detail: 'Unknown type "Newspaper advertisement"',
				}),
				skipped({
					id: '944',
					clipId: '944',
					title: 'Presidents',
					reason: 'diverted_quarterly',
					csvType: 'document',
					detail: 'Keyword TEHS',
				}),
			]),
		)
		expect(html).toContain(`data-storage-prefix="${DOCUMENT_STORAGE_PREFIX}"`)
		expect(html).not.toContain('data-storage-prefix="tehs-image-review"')
		expect(html).toContain('Newspaper advertisement (1)')
		expect(html).toContain('NULL (1)')
		expect(html).toContain('Diverted to Quarterly')
		expect(html).not.toContain('Source URL')
		expect(html).not.toContain('HTTP')
		expect(html).toContain('TYPE_MAP')
	})
})

describe('buildDocumentNeedsManualLinksPage', () => {
	test('links Studio only when sanityId is present', () => {
		const html = renderReviewHtml(
			buildDocumentNeedsManualLinksPage(
				[
					imported('962', 'Lucy Sampson Photos', ['LSam'], 'primarySource'),
					imported('942', 'Wichita', ['Phase 2'], 'historicalImage', 'abc123'),
				],
				new Map([
					['962', 'primarySource'],
					['942', 'historicalImage'],
				]),
			),
		)
		expect(html).toContain('id="by-keyword"')
		expect(html).toContain('id="by-document"')
		expect(html).toContain('intent/edit/id=abc123;type=historicalImage')
		expect(html).toContain('data-id="962"')
		expect(html).not.toContain('intent/edit/id=;type=')
	})
})

describe('buildDocumentMissingTaxonomiesPage', () => {
	test('one keyword row with document storage prefix', () => {
		const html = renderReviewHtml(
			buildDocumentMissingTaxonomiesPage([imported('962', 'Lucy', ['LSam'])]),
		)
		expect(html).toContain('data-id="subject:lsam"')
		expect(html).toContain(`data-storage-prefix="${DOCUMENT_STORAGE_PREFIX}"`)
		expect(html).toContain('1 document')
	})
})

describe('generateDocumentReviewReports', () => {
	test('writes three HTML reports from a single reports folder', async () => {
		const reportsDir = path.join(tmp, 'reports')
		fs.mkdirSync(reportsDir, {recursive: true})
		fs.writeFileSync(
			path.join(reportsDir, 'skipped.csv'),
			[
				'clipId,title,csvType,reason,detail',
				'946,Introduction,NULL,unknown_type,"Unknown type ""NULL"""',
			].join('\n') + '\n',
		)
		fs.writeFileSync(
			path.join(reportsDir, 'needs-manual-links.csv'),
			[
				'archiveId,title,missingTownship,missingSubject,missingDonation,schemaType,action,sanityId',
				'962,Lucy Sampson Photos,,LSam,,primarySource,dry_run,',
			].join('\n') + '\n',
		)
		fs.writeFileSync(
			path.join(reportsDir, 'imported.csv'),
			[
				'clipId,title,csvType,schemaType,action,sanityId,mappedKeywords,unmappedKeywords',
				'962,Lucy Sampson Photos,document,primarySource,dry_run,,Easttown,LSam',
			].join('\n') + '\n',
		)

		const files = await generateDocumentReviewReports({reportsDir, outputDir: reportsDir})
		const skippedHtml = fs.readFileSync(files.skipped, 'utf8')
		const missingHtml = fs.readFileSync(files.missingTaxonomies, 'utf8')
		const manualHtml = fs.readFileSync(files.needsManualLinks, 'utf8')

		expect(skippedHtml).toContain('data-id="946"')
		expect(skippedHtml).toContain('NULL (1)')
		expect(skippedHtml).toContain('data-storage-prefix="tehs-document-review"')
		expect(missingHtml).toContain('data-id="subject:lsam"')
		expect(manualHtml).toContain('primarySource')
		expect(manualHtml).toContain('LSam')
		expect(manualHtml).not.toContain('Open source URL')
	})
})
