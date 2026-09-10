/**
 * Generate skipped / missing-taxonomies / needs-manual-links HTML review
 * reports from a documents CSV import reports folder.
 */
import {
	DEFAULT_DOCUMENT_REPORTS_DIR,
	generateDocumentReviewReports,
} from './lib/generate-document-review-reports'

async function main() {
	const files = await generateDocumentReviewReports({
		reportsDir: DEFAULT_DOCUMENT_REPORTS_DIR,
	})
	console.log('Wrote document review reports:')
	console.log(`  ${files.skipped}`)
	console.log(`  ${files.missingTaxonomies}`)
	console.log(`  ${files.needsManualLinks}`)
}

main().catch((err) => {
	console.error('Failed to generate document review reports:', err)
	process.exit(1)
})
