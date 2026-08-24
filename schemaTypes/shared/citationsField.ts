import {defineArrayMember, defineField} from 'sanity'

export const DEFAULT_CITATIONS_DESCRIPTION =
	'Link a TEHS Quarterly article that discusses this item. Create or reuse the article under The Website → TEHS Quarterly Articles, then add it here so many archive items can share one article. Example: Arnold, Inns & Taverns, TEQ 44-1/2.'

export const HISTORICAL_IMAGE_CITATIONS_DESCRIPTION =
	'Link a TEHS Quarterly article document that discusses this photograph. Create or reuse the article under The Website → TEHS Quarterly Articles, then add it here so many images can share one article. Example: Arnold, Inns & Taverns, TEQ 44-1/2. Books, PDFs, and other web links belong in References, not here.'

/**
 * Shared Quarterly citation references for archive documents.
 */
export function citationsField(group?: string, description = DEFAULT_CITATIONS_DESCRIPTION) {
	return defineField({
		name: 'citations',
		title: 'Research References',
		type: 'array',
		...(group ? {group} : {}),
		description,
		of: [
			defineArrayMember({
				type: 'reference',
				to: [{type: 'quarterlyArticle'}],
			}),
		],
	})
}
