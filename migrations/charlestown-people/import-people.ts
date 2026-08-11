/**
 * Charlestown people CSV → Sanity person import entrypoint.
 *
 * Dry-run is the default; pass --live to create documents.
 */
import {parseCliConfig} from '../csv-import/lib/cli-config'
import {assertContentWriteAccess, createImportClient} from '../csv-import/lib/sanity-client'
import {runPeopleImport} from './lib/run-people-import'

const config = parseCliConfig(process.argv.slice(2), {
	csvPath: 'migrations/charlestown-people/unique-people.csv',
	reportsDir: 'migrations/charlestown-people/reports',
})
const client = createImportClient({dryRun: config.dryRun})

async function main() {
	if (!config.dryRun) await assertContentWriteAccess(client)
	await runPeopleImport(config, client)
}

main().catch((err) => {
	console.error('People import failed:', err)
	process.exit(1)
})
