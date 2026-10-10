/**
 * Debug-only: report which Sanity identity the current process env uses.
 * Does not print secrets.
 */
import {appendFileSync} from 'node:fs'

const SESSION_ID = '018254'
const LOG_PATH =
	'/Users/si/Documents/web-dev/Projects/studio-tehs-document-db/.cursor/debug-018254.log'
const API = 'https://api.sanity.io/v2021-06-07'

function log(
	hypothesisId: string,
	location: string,
	message: string,
	data: Record<string, unknown>,
) {
	const payload = {
		sessionId: SESSION_ID,
		runId: process.env.DEBUG_RUN_ID ?? 'identity-3',
		hypothesisId,
		location,
		message,
		data,
		timestamp: Date.now(),
	}
	// #region agent log
	appendFileSync(LOG_PATH, `${JSON.stringify(payload)}\n`)
	// #endregion
	console.log(JSON.stringify({hypothesisId, location, message, data}))
}

const authToken = process.env.SANITY_AUTH_TOKEN
const writeToken = process.env.SANITY_API_WRITE_TOKEN
log('F', 'debug-sanity-identity.ts:env', 'env token presence', {
	authTokenPresent: Boolean(authToken),
	writeTokenPresent: Boolean(writeToken),
	runId: process.env.DEBUG_RUN_ID ?? 'identity-3',
})

if (!authToken) {
	log('F', 'debug-sanity-identity.ts:me', 'no SANITY_AUTH_TOKEN; CLI login would be used', {
		user: null,
	})
	process.exit(0)
}

const res = await fetch(`${API}/users/me`, {
	headers: {Authorization: `Bearer ${authToken}`},
})
const body = (await res.json()) as {
	id?: string
	name?: string
	email?: string
	provider?: string
	roles?: {name?: string; title?: string}[]
	error?: string
	message?: string
}

log('C', 'debug-sanity-identity.ts:me', '/users/me', {
	status: res.status,
	ok: res.ok,
	user: res.ok
		? {
				id: body.id,
				name: body.name,
				email: body.email ?? null,
				provider: body.provider,
				roles: body.roles?.map((r) => r.name) ?? [],
			}
		: null,
	error: res.ok ? undefined : {type: body.error, message: body.message},
})
