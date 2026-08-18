import type {ImportSchemaType} from './map-row'

export type SkipReason =
	| 'missing_clip_id'
	| 'unknown_type'
	| 'api_error'
	| 'diverted_quarterly'
	| 'duplicate_identifier'
	| 'asset_error'
	| 'missing_image_location'
	| 'private_image'
export type ImportAction = 'dry_run' | 'created' | 'patched'

export interface ImportedRecord {
	clipId: string
	title: string
	csvType: string
	/** Sanity document type, e.g. primarySource, donation, historicalImage */
	schemaType: ImportSchemaType | 'donation' | string
	action: ImportAction
	sanityId?: string
	mappedKeywords: string[]
	unmappedKeywords: string[]
}

export interface SkippedRecord {
	clipId?: string
	title?: string
	csvType?: string
	reason: SkipReason
	detail: string
}

export class Audit {
	totalRows = 0
	imported: ImportedRecord[] = []
	skipped: SkippedRecord[] = []
	warnings: string[] = []
	/** keyword → clipIds that referenced it without a migrationKey match */
	missingTaxonomyByKeyword = new Map<string, Set<string>>()

	get successful() {
		return this.imported.length
	}

	get failed() {
		return this.skipped.length
	}

	get typeCounts(): Record<string, number> {
		const counts: Record<string, number> = {}
		for (const row of this.imported) {
			counts[row.schemaType] = (counts[row.schemaType] ?? 0) + 1
		}
		return counts
	}

	get needsManualLinks(): ImportedRecord[] {
		return this.imported.filter((r) => r.unmappedKeywords.length > 0)
	}

	recordImported(record: ImportedRecord) {
		this.imported.push(record)
	}

	skip(record: SkippedRecord) {
		this.skipped.push(record)
		const label = record.clipId ? `clipID ${record.clipId}` : 'row'
		console.error(`[SKIP] ${label}: ${record.reason} — ${record.detail}`)
	}

	warn(message: string) {
		this.warnings.push(message)
		console.warn(`[WARN] ${message}`)
	}

	missingTaxonomy(keyword: string, clipId?: string) {
		let set = this.missingTaxonomyByKeyword.get(keyword)
		if (!set) {
			set = new Set()
			this.missingTaxonomyByKeyword.set(keyword, set)
		}
		if (clipId) set.add(clipId)
	}

	print(reportsDir?: string) {
		console.log('\n=========================================')
		console.log('        POST-MIGRATION AUDIT REPORT      ')
		console.log('=========================================')
		console.log(`Total Rows Processed: ${this.totalRows}`)
		console.log(`Imported:             ${this.successful}`)
		console.log(`Skipped / Failed:     ${this.failed}`)
		console.log(`Needs Manual Links:   ${this.needsManualLinks.length}`)

		if (Object.keys(this.typeCounts).length > 0) {
			console.log('\nType Breakdown:')
			for (const [type, count] of Object.entries(this.typeCounts).sort()) {
				console.log(`  ${type}: ${count}`)
			}
		}

		if (this.missingTaxonomyByKeyword.size > 0) {
			console.log('\nMISSING TAXONOMIES:')
			console.log('CSV keywords with no matching migrationKey in Sanity:')
			for (const keyword of Array.from(this.missingTaxonomyByKeyword.keys()).sort()) {
				const clips = Array.from(this.missingTaxonomyByKeyword.get(keyword)!)
				console.log(`  - ${keyword} (clipIDs: ${clips.join(', ')})`)
			}
		}

		if (this.warnings.length > 0) {
			console.log(`\nWARNINGS: ${this.warnings.length}`)
			for (const w of this.warnings.slice(0, 20)) {
				console.log(`  ${w}`)
			}
			if (this.warnings.length > 20) {
				console.log(`  ...and ${this.warnings.length - 20} more.`)
			}
		}

		if (this.skipped.length > 0) {
			console.log(`\nSKIPPED: ${this.skipped.length}`)
			for (const s of this.skipped.slice(0, 20)) {
				console.log(`  ${s.clipId ?? '?'} [${s.reason}] ${s.detail}`)
			}
			if (this.skipped.length > 20) {
				console.log(`  ...and ${this.skipped.length - 20} more.`)
			}
		}

		if (reportsDir) {
			console.log('\nEditor report files:')
			console.log(`  ${reportsDir}/imported.csv`)
			console.log(`  ${reportsDir}/skipped.csv`)
			console.log(`  ${reportsDir}/diverted-quarterly.csv`)
			console.log(`  ${reportsDir}/needs-manual-links.csv`)
			console.log(`  ${reportsDir}/missing-taxonomies.csv`)
			console.log(`  ${reportsDir}/summary.txt`)
		}

		console.log('\nSuggested Vision checks:')
		console.log(
			'  count(*[_type in ["historicalImage","primarySource","researchArticle"] && defined(archiveId)])',
		)
		console.log('  *[_type == $type && archiveId == $id][0]  // find one imported doc')
		console.log('=========================================\n')
	}
}
