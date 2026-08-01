/**
 * CSV archive import entrypoint.
 * Parses CLI flags, builds a Sanity client, then hands off to runImport.
 * Pipeline details live under ./lib/.
 */
import {parseCliConfig} from './lib/cli-config'
import {runImport} from './lib/run-import'
import {createImportClient} from './lib/sanity-client'

const config = parseCliConfig(process.argv.slice(2))
const client = createImportClient({dryRun: config.dryRun})

runImport(config, client).catch((err) => {
	console.error('Migration failed:', err)
	process.exit(1)
})
