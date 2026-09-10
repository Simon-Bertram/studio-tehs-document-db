/**
 * Shared Sanity project settings used by Studio config, CLI, and migrations.
 */
export const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID ?? 'z8o776vu'

export const SANITY_DATASET = process.env.SANITY_DATASET ?? 'production'

export const SANITY_API_VERSION = '2025-02-19'

/**
 * Editor/write robot token for migrations.
 * Keep this off `SANITY_AUTH_TOKEN` in `.env` — `sanity deploy` reloads `.env`
 * and treats that name as the CLI session, overriding `sanity login`.
 */
export function getSanityWriteToken(): string | undefined {
	return process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_AUTH_TOKEN || undefined
}
