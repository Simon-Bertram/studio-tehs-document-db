/**
 * Build a case-insensitive lookup from migration keys and aliases to Sanity ids.
 */

export interface MigrationKeyDoc {
	_id: string
	migrationKey?: string | null
	migrationKeyAliases?: string[] | null
}

export type MigrationKeyCollisionHandler = (
	key: string,
	existingId: string,
	incomingId: string,
) => void

function cleanId(id: string): string {
	return id.replace(/^drafts\./, '')
}

function normalizeKey(value: string): string | null {
	const trimmed = value.trim().toLowerCase()
	return trimmed || null
}

function collectKeys(doc: MigrationKeyDoc): string[] {
	const keys: string[] = []
	if (doc.migrationKey) {
		const key = normalizeKey(doc.migrationKey)
		if (key) keys.push(key)
	}
	for (const alias of doc.migrationKeyAliases ?? []) {
		if (typeof alias !== 'string') continue
		const key = normalizeKey(alias)
		if (key) keys.push(key)
	}
	return keys
}

const defaultCollisionHandler: MigrationKeyCollisionHandler = (key, existingId, incomingId) => {
	console.warn(
		`Migration key collision for "${key}": ${existingId} vs ${incomingId}; keeping ${incomingId}.`,
	)
}

/**
 * Index `migrationKey` and `migrationKeyAliases` (trimmed, lowercased) to the
 * published document id. Last write wins; collisions call `onCollision`.
 */
export function indexMigrationKeys(
	docs: MigrationKeyDoc[],
	onCollision: MigrationKeyCollisionHandler = defaultCollisionHandler,
): Record<string, string> {
	const lookup: Record<string, string> = {}

	for (const doc of docs) {
		const id = cleanId(doc._id)
		for (const key of collectKeys(doc)) {
			const existing = lookup[key]
			if (existing && existing !== id) {
				onCollision(key, existing, id)
			}
			lookup[key] = id
		}
	}

	return lookup
}
