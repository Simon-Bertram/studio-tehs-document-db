import fs from 'node:fs'
import path from 'node:path'

import type {Audit, ImportedRecord} from './audit'
import {formatNeedsManualLinksMarkdown, splitUnmappedKeywords} from './needs-manual-links-report'

export function escapeCsv(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

export function toCsv(headers: string[], rows: string[][]): string {
	const lines = [
		headers.map(escapeCsv).join(','),
		...rows.map((row) => row.map((cell) => escapeCsv(cell ?? '')).join(',')),
	]
	return `${lines.join('\n')}\n`
}

function joinList(items: string[]): string {
	return items.join('; ')
}

/**
 * Write editor-facing CSV reports and summary.txt into reportsDir.
 */
export function writeReports(
	audit: Audit,
	reportsDir: string,
	options?: {
		naturalKeyLabel?: string
		howToFix?: string
		/** Kept so existing callers compile; guidance now lives in needs-manual-links.md */
		studioAction?: (record: ImportedRecord) => string
	},
): void {
	fs.mkdirSync(reportsDir, {recursive: true})

	const naturalKeyLabel = options?.naturalKeyLabel ?? 'Archive ID'

	const importedPath = path.join(reportsDir, 'imported.csv')
	const skippedPath = path.join(reportsDir, 'skipped.csv')
	const manualPath = path.join(reportsDir, 'needs-manual-links.csv')
	const missingPath = path.join(reportsDir, 'missing-taxonomies.csv')
	const summaryPath = path.join(reportsDir, 'summary.txt')

	fs.writeFileSync(
		importedPath,
		toCsv(
			[
				'clipId',
				'title',
				'csvType',
				'schemaType',
				'action',
				'sanityId',
				'mappedKeywords',
				'unmappedKeywords',
			],
			audit.imported.map((r) => [
				r.clipId,
				r.title,
				r.csvType,
				r.schemaType,
				r.action,
				r.sanityId ?? '',
				joinList(r.mappedKeywords),
				joinList(r.unmappedKeywords),
			]),
		),
	)

	fs.writeFileSync(
		skippedPath,
		toCsv(
			['clipId', 'title', 'csvType', 'reason', 'detail'],
			audit.skipped.map((r) => [
				r.clipId ?? '',
				r.title ?? '',
				r.csvType ?? '',
				r.reason,
				r.detail,
			]),
		),
	)

	const diverted = audit.skipped.filter((r) => r.reason === 'diverted_quarterly')
	const divertedPath = path.join(reportsDir, 'diverted-quarterly.csv')
	fs.writeFileSync(
		divertedPath,
		toCsv(
			['clipId', 'title', 'csvType', 'reason', 'studioAction'],
			diverted.map((r) => [
				r.clipId ?? '',
				r.title ?? '',
				r.csvType ?? '',
				r.reason,
				'Import via bun run csv-import:quarterly (HTML archive) or create a TEHS Quarterly Article in Studio. Do not re-import this row as primarySource / historicalImage.',
			]),
		),
	)

	fs.writeFileSync(
		manualPath,
		toCsv(
			[
				'archiveId',
				'title',
				'missingTownship',
				'missingSubject',
				'missingDonation',
				'schemaType',
				'action',
				'sanityId',
			],
			audit.needsManualLinks.map((r) => {
				const split = splitUnmappedKeywords(r.unmappedKeywords)
				return [
					r.clipId,
					r.title,
					split.township,
					split.subject,
					split.donation,
					r.schemaType,
					r.action,
					r.sanityId ?? '',
				]
			}),
		),
	)

	const manualMarkdownPath = path.join(reportsDir, 'needs-manual-links.md')
	fs.writeFileSync(
		manualMarkdownPath,
		formatNeedsManualLinksMarkdown(audit.needsManualLinks, {
			naturalKeyLabel,
			howToFix: options?.howToFix,
		}),
	)

	const missingRows = Array.from(audit.missingTaxonomyByKeyword.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([keyword, clipIds]) => [keyword, Array.from(clipIds).sort().join(';'), 'unknown'])

	fs.writeFileSync(missingPath, toCsv(['keyword', 'clipIds', 'suggestedEntity'], missingRows))

	const summary = [
		'CSV Import Summary',
		'==================',
		`Total rows:          ${audit.totalRows}`,
		`Imported:            ${audit.successful}`,
		`Skipped / failed:    ${audit.failed}`,
		`Needs manual links:  ${audit.needsManualLinks.length}`,
		`Missing keywords:    ${audit.missingTaxonomyByKeyword.size}`,
		'',
		'Type breakdown:',
		...Object.entries(audit.typeCounts)
			.sort()
			.map(([type, count]) => `  ${type}: ${count}`),
		'',
		'Report files:',
		`  ${importedPath}`,
		`  ${skippedPath}`,
		`  ${divertedPath}`,
		`  ${manualPath}`,
		`  ${manualMarkdownPath}`,
		`  ${missingPath}`,
		'',
		'How to identify records:',
		`  imported            → ${naturalKeyLabel} = clipId; schemaType is the Studio document type`,
		'  skipped             → no Studio doc; use clipId + reason in skipped.csv',
		'  diverted-quarterly  → keyword TEHS; import as quarterlyArticle, not archive types',
		`  needs_manual_links  → needs-manual-links.md (grouped) or the CSV (one row per image)`,
		'  missing-taxonomies  → create migrationKey on the right entity type, then re-run import',
		'',
	].join('\n')

	fs.writeFileSync(summaryPath, summary)
}
