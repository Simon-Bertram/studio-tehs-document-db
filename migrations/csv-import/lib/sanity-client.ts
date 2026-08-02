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

/** Roles that can read/deploy but cannot create dataset content. */
const NON_CONTENT_WRITE_ROLES = new Set([
	'deploy-studio',
	'viewer',
])

/**
 * Fail fast when SANITY_AUTH_TOKEN cannot create documents.
 * Deploy Studio tokens authenticate but return 403 on mutate.
 */
export async function assertContentWriteAccess(
	client: SanityClient,
): Promise<void> {
	type Whoami = {
		id?: string
		name?: string
		roles?: {name: string; title?: string}[]
	}

	let me: Whoami
	try {
		me = await client.request({uri: '/users/me', method: 'GET'})
	} catch (err) {
		console.error(
			'Could not verify SANITY_AUTH_TOKEN against Sanity /users/me.',
		)
		console.error(err instanceof Error ? err.message : err)
		process.exit(1)
	}

	const roles = me.roles?.map((r) => r.name) ?? []
	const cannotWrite =
		roles.length > 0 && roles.every((r) => NON_CONTENT_WRITE_ROLES.has(r))

	if (!cannotWrite) return

	const roleList = roles.join(', ')
	console.error(
		`SANITY_AUTH_TOKEN is authenticated as "${me.name ?? me.id}" with role(s): ${roleList}.`,
	)
	console.error(
		'That role cannot create documents (permission "create" required).',
	)
	console.error(
		'Create a new API token with Editor or Administrator permissions in Sanity Manage → API → Tokens, then set SANITY_AUTH_TOKEN in .env.',
	)
	process.exit(1)
}

export function hasAuthToken(): boolean {
	return Boolean(process.env.SANITY_AUTH_TOKEN)
}
