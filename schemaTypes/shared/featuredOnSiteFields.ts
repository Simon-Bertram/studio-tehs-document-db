import type {CustomValidator, ValidationContext} from 'sanity'
import {defineField} from 'sanity'

import {SANITY_API_VERSION} from '../../lib/sanityEnv'

export const FEATURED_RANK_MIN = 1
export const FEATURED_RANK_MAX = 24

function publishedId(id: string): string {
	return id.replace(/^drafts\./, '')
}

/**
 * Warn when another featured document of the same type already uses this rank.
 * Duplicate ranks are allowed; the website sorts by rank then title.
 */
export function warnDuplicateFeaturedRank(
	documentType: string,
): CustomValidator<number | undefined> {
	return async (rank, context: ValidationContext) => {
		if (rank == null || !context.document?.featuredOnSite) return true

		const client = context.getClient({apiVersion: SANITY_API_VERSION})
		const rawId = context.document?._id ?? ''
		const id = publishedId(rawId)
		const count = await client.fetch<number>(
			`count(*[_type == $type && featuredOnSite == true && featuredRank == $rank && !(_id in [$id, $draftId])])`,
			{type: documentType, rank, id, draftId: `drafts.${id}`},
		)

		if (count === 0) return true
		const noun =
			documentType === 'historicalImage'
				? 'image'
				: documentType === 'thenAndNow'
					? 'Then & Now'
					: 'research article'
		return `Another featured ${noun} already uses order ${rank}. Duplicates are allowed; lower numbers still appear first.`
	}
}

/**
 * Public highlight flags for home and unfiltered catalog landings.
 */
export function featuredOnSiteFields(group: string, documentType: string) {
	return [
		defineField({
			name: 'featuredOnSite',
			title: 'Show in the public highlight grid',
			type: 'boolean',
			group,
			description:
				'Include this item in the home and catalog highlight grids. Editors curating the public site should use this — not every cataloger. Rank is order, not quality.',
			initialValue: false,
		}),
		defineField({
			name: 'featuredRank',
			title: 'Highlight order',
			type: 'number',
			group,
			description: `Lower numbers appear first (${FEATURED_RANK_MIN}–${FEATURED_RANK_MAX}). Leave blank to sort by title after numbered items.`,
			hidden: ({parent, document}) => !(parent?.featuredOnSite ?? document?.featuredOnSite),
			validation: (Rule) =>
				Rule.integer()
					.min(FEATURED_RANK_MIN)
					.max(FEATURED_RANK_MAX)
					.custom(warnDuplicateFeaturedRank(documentType)),
		}),
	]
}
