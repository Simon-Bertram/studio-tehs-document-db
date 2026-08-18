/**
 * Historical images CSV import entrypoint (sample-images.csv).
 * Dry-run is the default; pass --live to write. There is no --dryRun flag.
 */
import {parseCliConfig} from './lib/cli-config'
import {runImagesImport} from './lib/run-images-import'
import {assertContentWriteAccess, createImportClient} from './lib/sanity-client'

const config = parseCliConfig(process.argv.slice(2), {
	csvPath: 'migrations/data/sample-images.csv',
	reportsDir: 'migrations/csv-import/reports/images',
})
const client = createImportClient({dryRun: config.dryRun})

async function main() {
	if (!config.dryRun) await assertContentWriteAccess(client)
	const result = await runImagesImport(config, client)
	if (!result.ok) process.exit(1)
}

main().catch((err) => {
	console.error('Images migration failed:', err)
	process.exit(1)
})
