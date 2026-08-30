import type {CustomValidator, ValidationContext} from 'sanity'

import {SANITY_API_VERSION} from '../../lib/sanityEnv'

function asNumber(value: unknown): number | undefined {
	return typeof value === 'number' && !Number.isNaN(value) ? value : undefined
}

/**
 * Async uniqueness check for the (volume, issueNumber) pair on
 * quarterlyIssue. Ignores the current document's draft and published IDs.
 */
export function isUniqueVolumeIssue(
	message = 'This volume and issue number already exist',
): CustomValidator<number | undefined> {
	return async (value, context: ValidationContext) => {
		const pathHead = context.path?.[0]
		const volume = pathHead === 'volume' ? asNumber(value) : asNumber(context.document?.volume)
		const issueNumber =
			pathHead === 'issueNumber' ? asNumber(value) : asNumber(context.document?.issueNumber)

		if (volume == null || issueNumber == null) return true

		const client = context.getClient({apiVersion: SANITY_API_VERSION})
		const rawId = context.document?._id ?? ''
		const id = rawId.replace(/^drafts\./, '')

		const count = await client.fetch<number>(
			`count(*[_type == "quarterlyIssue" && volume == $volume && issueNumber == $issueNumber && !(_id in [$id, $draftId])])`,
			{
				volume,
				issueNumber,
				id,
				draftId: `drafts.${id}`,
			},
		)

		return count === 0 || message
	}
}
