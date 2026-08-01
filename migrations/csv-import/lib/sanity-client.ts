/**
 * Builds the Sanity client used by taxonomy lookups and live upserts.
 * Token is optional for dry-run; required when writing.
 */
import {createClient, type SanityClient} from '@sanity/client'
import {
	SANITY_API_VERSION,
	SANITY_DATASET,
	SANITY_PROJECT_ID,
} from '../../../lib/sanityEnv'

export function createImportClient(options: {
	dryRun: boolean
}): SanityClient {
	const token = process.env.SANITY_AUTH_TOKEN

	if (!options.dryRun && !token) {
		console.error('SANITY_AUTH_TOKEN is required for live writes. Aborting.')
		process.exit(1)
	}

	return createClient({
		projectId: SANITY_PROJECT_ID,
		dataset: SANITY_DATASET,
		apiVersion: SANITY_API_VERSION,
		token,
		useCdn: false,
	})
}

export function hasAuthToken(): boolean {
	return Boolean(process.env.SANITY_AUTH_TOKEN)
}
