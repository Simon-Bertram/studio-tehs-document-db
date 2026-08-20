import type {CustomValidator, ValidationContext} from 'sanity'

import {SANITY_API_VERSION} from '../../lib/sanityEnv'

const ALLOWED_FIELD_NAMES = new Set(['archiveId', 'migrationKey', 'sourceKey', 'title'])

/**
 * Async uniqueness check for a string field on one or more document types.
 * Ignores the current document's draft and published IDs.
 */
export function isUniqueStringField(
	documentType: string | string[],
	fieldName: string,
	message = 'Value must be unique',
): CustomValidator<string | undefined> {
	if (!ALLOWED_FIELD_NAMES.has(fieldName)) {
		throw new Error(`isUniqueStringField: fieldName "${fieldName}" is not in the allowlist`)
	}

	const types = Array.isArray(documentType) ? documentType : [documentType]

	return async (value, context: ValidationContext) => {
		if (!value) return true

		const client = context.getClient({apiVersion: SANITY_API_VERSION})
		const rawId = context.document?._id ?? ''
		const id = rawId.replace(/^drafts\./, '')

		const count = await client.fetch<number>(
			`count(*[_type in $types && ${fieldName} == $value && !(_id in [$id, $draftId])])`,
			{
				types,
				value,
				id,
				draftId: `drafts.${id}`,
			},
		)

		return count === 0 || message
	}
}
