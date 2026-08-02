/**
 * Historical images CSV import entrypoint (sample-images.csv).
 */
import {parseCliConfig} from './lib/cli-config'
import {runImagesImport} from './lib/run-images-import'
import {
	assertContentWriteAccess,
	createImportClient,
} from './lib/sanity-client'

const config = parseCliConfig(process.argv.slice(2), {
	csvPath: 'migrations/data/sample-images.csv',
	reportsDir: 'migrations/csv-import/reports/images',
})
const client = createImportClient({dryRun: config.dryRun})

async function main() {
	if (!config.dryRun) await assertContentWriteAccess(client)
	await runImagesImport(config, client)
}

main().catch((err) => {
	console.error('Images migration failed:', err)
	process.exit(1)
})
