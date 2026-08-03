/**
 * TEHS Quarterly HTML import entrypoint (default volume 22 pilot).
 */
import {
	assertContentWriteAccess,
	createImportClient,
} from '../csv-import/lib/sanity-client'
import {parseQuarterlyCliConfig} from './lib/cli-config'
import {runQuarterlyImport} from './lib/run-quarterly-import'

const config = parseQuarterlyCliConfig(process.argv.slice(2))
const client = createImportClient({dryRun: config.dryRun})

async function main() {
	if (!config.dryRun) await assertContentWriteAccess(client)
	await runQuarterlyImport(config, client)
}

main().catch((err) => {
	console.error('Quarterly migration failed:', err)
	process.exit(1)
})
