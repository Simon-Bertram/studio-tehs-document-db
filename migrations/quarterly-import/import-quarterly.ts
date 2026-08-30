/**
 * TEHS Quarterly import entrypoint.
 *
 * Default: HTML body import for one volume (pilot).
 * Catalog: `--issues` then `--article-stubs`. `--extract` snapshots sources only.
 */
import {assertContentWriteAccess, createImportClient} from '../csv-import/lib/sanity-client'
import {parseQuarterlyCliConfig} from './lib/cli-config'
import {runCatalogExtract, runCatalogImport} from './lib/run-catalog-import'
import {runQuarterlyImport} from './lib/run-quarterly-import'

const config = parseQuarterlyCliConfig(process.argv.slice(2))
const client = createImportClient({dryRun: config.dryRun})

async function main() {
	if (config.mode === 'extract') {
		await runCatalogExtract(config)
		return
	}
	if (config.mode === 'issues' || config.mode === 'article-stubs') {
		if (!config.dryRun) await assertContentWriteAccess(client)
		await runCatalogImport(config, client)
		return
	}
	if (!config.dryRun) await assertContentWriteAccess(client)
	await runQuarterlyImport(config, client)
}

main().catch((err) => {
	console.error('Quarterly migration failed:', err)
	process.exit(1)
})
