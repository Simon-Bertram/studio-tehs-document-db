import fs from 'node:fs'
import path from 'node:path'

import type {Audit, ImportedRecord} from './audit'

function escapeCsv(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

function toCsv(headers: string[], rows: string[][]): string {
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
		studioAction?: (record: ImportedRecord) => string
	},
): void {
	fs.mkdirSync(reportsDir, {recursive: true})

	const naturalKeyLabel = options?.naturalKeyLabel ?? 'Archive ID'
	const studioAction =
		options?.studioAction ??
		((r: ImportedRecord) =>
			`In Studio, find ${r.schemaType} with ${naturalKeyLabel} ${r.clipId}. Set Organisations / Subjects / Township for: ${joinList(r.unmappedKeywords)}. Entity names (e.g. Lincoln) belong on Organisations; themes on Subjects; places on Township.`)

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
			['clipId', 'title', 'schemaType', 'action', 'sanityId', 'unmappedKeywords', 'studioAction'],
			audit.needsManualLinks.map((r) => [
				r.clipId,
				r.title,
				r.schemaType,
				r.action,
				r.sanityId ?? '',
				joinList(r.unmappedKeywords),
				studioAction(r),
			]),
		),
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
		`  ${missingPath}`,
		'',
		'How to identify records:',
		`  imported            → ${naturalKeyLabel} = clipId; schemaType is the Studio document type`,
		'  skipped             → no Studio doc; use clipId + reason in skipped.csv',
		'  diverted-quarterly  → keyword TEHS; import as quarterlyArticle, not archive types',
		`  needs_manual_links  → doc exists; open by ${naturalKeyLabel} and fix links from unmappedKeywords`,
		'  missing-taxonomies  → create migrationKey on the right entity type, then re-run import',
		'',
	].join('\n')

	fs.writeFileSync(summaryPath, summary)
}
