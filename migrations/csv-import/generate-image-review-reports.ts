/**
 * Generate skipped / missing-taxonomies / needs-manual-links HTML review
 * reports from live image-batch CSVs and the cumulative ledger.
 */
import {
	DEFAULT_IMAGE_REPORTS_DIR,
	generateImageReviewReports,
} from './lib/generate-image-review-reports'

async function main() {
	const files = await generateImageReviewReports({
		reportsDir: DEFAULT_IMAGE_REPORTS_DIR,
	})
	console.log('Wrote image review reports:')
	console.log(`  ${files.skipped}`)
	console.log(`  ${files.missingTaxonomies}`)
	console.log(`  ${files.needsManualLinks}`)
}

main().catch((err) => {
	console.error('Failed to generate image review reports:', err)
	process.exit(1)
})
