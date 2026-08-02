import type {CustomValidator, ValidationContext} from 'sanity'
import {SANITY_API_VERSION} from '../../lib/sanityEnv'

/**
 * Async uniqueness check for a number field on a document type.
 * Ignores the current document's draft and published IDs.
 */
export function isUniqueNumberField(
	documentType: string,
	fieldName: string,
	message = 'Value must be unique',
): CustomValidator<number | undefined> {
	return async (value, context: ValidationContext) => {
		if (value == null || Number.isNaN(value)) return true

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
