import type {CustomValidator, ValidationContext} from 'sanity'

import {SANITY_API_VERSION} from '../../lib/sanityEnv'

const MESSAGE = 'This donation is not related to a donation category'

function categoryIds(value: unknown): string[] {
	if (!Array.isArray(value)) return []

	const ids: string[] = []
	for (const item of value) {
		if (
			typeof item === 'object' &&
			item !== null &&
			'_ref' in item &&
			typeof item._ref === 'string' &&
			item._ref
		) {
			ids.push(item._ref)
		}
	}
	return ids
}

function publishedAndDraftIds(refs: string[]): string[] {
	const ids = new Set<string>()
	for (const ref of refs) {
		const published = ref.replace(/^drafts\./, '')
		ids.add(published)
		ids.add(`drafts.${published}`)
	}
	return [...ids]
}

/**
 * Warns when a donation has no live donation category: empty array or
 * all referenced documents have been deleted.
 */
export function warnMissingDonationCategory(): CustomValidator<unknown> {
	return async (value, context: ValidationContext) => {
		const refs = categoryIds(value)
		if (refs.length === 0) return MESSAGE

		const client = context.getClient({apiVersion: SANITY_API_VERSION})
		const count = await client.fetch<number>(
			`count(*[_type == "donationCategory" && _id in $ids])`,
			{ids: publishedAndDraftIds(refs)},
		)

		return count > 0 || MESSAGE
	}
}
