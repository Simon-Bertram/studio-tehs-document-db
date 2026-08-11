import type {CustomValidator, ValidationContext} from 'sanity'

import {SANITY_API_VERSION} from '../../lib/sanityEnv'

const ALLOWED_FIELD_NAMES = new Set(['archiveId', 'migrationKey', 'sourceKey'])

/**
 * Async uniqueness check for a string field on a document type.
 * Ignores the current document's draft and published IDs.
 */
export function isUniqueStringField(
	documentType: string,
	fieldName: string,
	message = 'Value must be unique',
): CustomValidator<string | undefined> {
	if (!ALLOWED_FIELD_NAMES.has(fieldName)) {
		throw new Error(`isUniqueStringField: fieldName "${fieldName}" is not in the allowlist`)
	}

	return async (value, context: ValidationContext) => {
		if (!value) return true

		const client = context.getClient({apiVersion: SANITY_API_VERSION})
		const rawId = context.document?._id ?? ''
		const id = rawId.replace(/^drafts\./, '')

		const count = await client.fetch<number>(
			`count(*[_type == $type && ${fieldName} == $value && !(_id in [$id, $draftId])])`,
			{
				type: documentType,
				value,
				id,
				draftId: `drafts.${id}`,
			},
		)

		return count === 0 || message
	}
}
