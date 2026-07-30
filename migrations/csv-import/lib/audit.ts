export class Audit {
	totalRows = 0
	successful = 0
	failed = 0
	typeCounts: Record<string, number> = {}
	missingTaxonomies = new Set<string>()
	warnings: string[] = []
	errors: string[] = []

	succeed(schemaType: string) {
		this.successful++
		this.typeCounts[schemaType] = (this.typeCounts[schemaType] ?? 0) + 1
	}

	fail(message: string) {
		this.failed++
		this.errors.push(message)
		console.error(`[ERROR] ${message}`)
	}

	warn(message: string) {
		this.warnings.push(message)
		console.warn(`[WARN] ${message}`)
	}

	missingTaxonomy(keyword: string) {
		this.missingTaxonomies.add(keyword)
	}

	print() {
		console.log('\n=========================================')
		console.log('        POST-MIGRATION AUDIT REPORT      ')
		console.log('=========================================')
		console.log(`Total Rows Processed: ${this.totalRows}`)
		console.log(`Successful Imports:   ${this.successful}`)
		console.log(`Failed Imports:       ${this.failed}`)

		if (Object.keys(this.typeCounts).length > 0) {
			console.log('\nType Breakdown:')
			for (const [type, count] of Object.entries(this.typeCounts).sort()) {
				console.log(`  ${type}: ${count}`)
			}
		}

		if (this.missingTaxonomies.size > 0) {
			console.log('\nMISSING TAXONOMIES:')
			console.log(
				'The following CSV keywords have no matching migrationKey in Sanity.',
			)
			console.log(
				'Create these categories/townships, then re-run the script:',
			)
			const sorted = Array.from(this.missingTaxonomies).sort()
			for (const key of sorted) {
				console.log(`  - ${key}`)
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

		if (this.errors.length > 0) {
			console.log(`\nERRORS: ${this.errors.length}`)
			for (const e of this.errors.slice(0, 20)) {
				console.log(`  ${e}`)
			}
			if (this.errors.length > 20) {
				console.log(`  ...and ${this.errors.length - 20} more.`)
			}
		}

		console.log('\nSuggested Vision checks:')
		console.log(
			'  count(*[_type in ["historicalImage","primarySource","curatedEssay"] && defined(archiveId)])',
		)
		console.log('  *[_type == "primarySource" && !defined(subjects)]')
		console.log('=========================================\n')
	}
}
