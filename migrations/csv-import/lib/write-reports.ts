import fs from 'node:fs'
import path from 'node:path'
import type {Audit} from './audit'

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
export function writeReports(audit: Audit, reportsDir: string): void {
	fs.mkdirSync(reportsDir, {recursive: true})

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

	fs.writeFileSync(
		manualPath,
		toCsv(
			[
				'clipId',
				'title',
				'schemaType',
				'action',
				'sanityId',
				'unmappedKeywords',
				'studioAction',
			],
			audit.needsManualLinks.map((r) => [
				r.clipId,
				r.title,
				r.schemaType,
				r.action,
				r.sanityId ?? '',
				joinList(r.unmappedKeywords),
				`In Studio, find ${r.schemaType} with Archive ID ${r.clipId}. Set Organisations / Subjects / Township for: ${joinList(r.unmappedKeywords)}. Entity names (e.g. Lincoln) belong on Organisations; themes on Subjects; places on Township.`,
			]),
		),
	)

	const missingRows = Array.from(audit.missingTaxonomyByKeyword.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([keyword, clipIds]) => [
			keyword,
			Array.from(clipIds).sort().join(';'),
			'unknown',
		])

	fs.writeFileSync(
		missingPath,
		toCsv(['keyword', 'clipIds', 'suggestedEntity'], missingRows),
	)

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
		`  ${manualPath}`,
		`  ${missingPath}`,
		'',
		'How to identify records:',
		'  imported            → Archive ID = clipId; schemaType is the Studio document type',
		'  skipped             → no Studio doc; use clipId + reason in skipped.csv',
		'  needs_manual_links  → doc exists; open by Archive ID and add links from unmappedKeywords',
		'  missing-taxonomies  → create migrationKey on org/category/township, then re-run import',
		'',
	].join('\n')

	fs.writeFileSync(summaryPath, summary)
}
