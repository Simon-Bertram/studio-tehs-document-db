/**
 * Create or replace the published Public site navigation singleton.
 *
 *   bun run migrations/seed-site-navigation.ts
 */
import {
	SITE_NAVIGATION_DOCUMENT_ID,
	SITE_NAVIGATION_PRIMARY_LINKS,
	SITE_NAVIGATION_SECONDARY_LINKS,
} from '../schemaTypes/lib/siteNavigationSeed'
import {assertContentWriteAccess, createImportClient} from './csv-import/lib/sanity-client'

async function main() {
	const client = createImportClient({dryRun: false})
	await assertContentWriteAccess(client)

	await client.createOrReplace({
		_id: SITE_NAVIGATION_DOCUMENT_ID,
		_type: 'siteNavigation',
		primaryLinks: SITE_NAVIGATION_PRIMARY_LINKS,
		secondaryLinks: SITE_NAVIGATION_SECONDARY_LINKS,
	})

	console.log(`Published ${SITE_NAVIGATION_DOCUMENT_ID} with seeded header and Explore links.`)
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err)
	process.exit(1)
})
