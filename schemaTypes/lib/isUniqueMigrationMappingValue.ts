import type {CustomValidator, ValidationContext} from 'sanity'

import {SANITY_API_VERSION} from '../../lib/sanityEnv'

function publishedAndDraftIds(context: ValidationContext): {
	id: string
	draftId: string
} {
	const rawId = context.document?._id ?? ''
	const id = rawId.replace(/^drafts\./, '')
	return {id, draftId: `drafts.${id}`}
}

function asStringList(value: unknown): string[] {
	if (!Array.isArray(value)) return []
	return value.filter((item): item is string => typeof item === 'string')
}

/**
 * Case-insensitive uniqueness across `migrationKey` and `migrationKeyAliases`
 * on other documents of the given type(s).
 */
export function isUniqueMigrationMappingValue(
	documentType: string | string[],
	message = 'Migration mapping key must be unique',
): CustomValidator<string | undefined> {
	const types = Array.isArray(documentType) ? documentType : [documentType]

	return async (value, context: ValidationContext) => {
		if (!value?.trim()) return true

		const client = context.getClient({apiVersion: SANITY_API_VERSION})
		const {id, draftId} = publishedAndDraftIds(context)
		const normalised = value.trim().toLowerCase()

		const count = await client.fetch<number>(
			`count(*[
				_type in $types &&
				!(_id in [$id, $draftId]) &&
				(
					lower(migrationKey) == $value ||
					count(coalesce(migrationKeyAliases, [])[lower(@) == $value]) > 0
				)
			])`,
			{
				types,
				value: normalised,
				id,
				draftId,
			},
		)

		return count === 0 || message
	}
}

/**
 * Array-level checks for migration key aliases: non-empty, no duplicates, and
 * not the same as this document's primary migration key. Uniqueness versus
 * other documents is validated per alias.
 */
export function validateMigrationKeyAliases(
	documentType: string | string[],
): CustomValidator<string[] | undefined> {
	const uniqueAmongTypes = isUniqueMigrationMappingValue(
		documentType,
		'Migration mapping key must be unique',
	)

	return async (aliases, context) => {
		if (!aliases?.length) return true

		const strings = asStringList(aliases)
		const ownKey =
			typeof context.document?.migrationKey === 'string'
				? context.document.migrationKey.trim().toLowerCase()
				: ''
		const seen = new Set<string>()

		for (const alias of strings) {
			const key = alias.trim().toLowerCase()
			if (!key) return 'Aliases cannot be empty'
			if (ownKey && key === ownKey) {
				return 'Alias cannot match this document’s Migration Mapping Key'
			}
			if (seen.has(key)) {
				return `Duplicate alias "${alias.trim()}"`
			}
			seen.add(key)
		}

		for (const alias of strings) {
			const result = await uniqueAmongTypes(alias, context)
			if (result !== true) return result
		}

		return true
	}
}

/**
 * Array-level checks for category aliases. Prefer `validateMigrationKeyAliases`
 * for new call sites.
 */
export function validateCategoryMigrationKeyAliases(): CustomValidator<string[] | undefined> {
	return validateMigrationKeyAliases('category')
}

/**
 * True when the primary key is also listed as an alias on the same document.
 */
export function migrationKeyMatchesOwnAlias(key: string | undefined, aliases: unknown): boolean {
	if (!key?.trim()) return false
	const normalised = key.trim().toLowerCase()
	return asStringList(aliases).some((alias) => alias.trim().toLowerCase() === normalised)
}
