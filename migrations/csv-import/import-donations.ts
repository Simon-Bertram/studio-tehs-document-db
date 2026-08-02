/**
 * Donations CSV import entrypoint.
 */
import {parseCliConfig} from './lib/cli-config'
import {runDonationsImport} from './lib/run-donations-import'
import {createImportClient} from './lib/sanity-client'

const config = parseCliConfig(process.argv.slice(2), {
	csvPath: 'migrations/data/donations.csv',
	reportsDir: 'migrations/csv-import/reports/donations',
})
const client = createImportClient({dryRun: config.dryRun})

runDonationsImport(config, client).catch((err) => {
	console.error('Donations migration failed:', err)
	process.exit(1)
})
