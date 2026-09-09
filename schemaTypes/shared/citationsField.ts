import {defineArrayMember, defineField} from 'sanity'

export const DEFAULT_CITATIONS_DESCRIPTION =
	'Link a TEHS Quarterly article or Then & Now feature that discusses this item. Create or reuse it under The Website, then add it here so many archive items can share one piece. Example: Arnold, Inns & Taverns, TEQ 44-1/2.'

export const HISTORICAL_IMAGE_CITATIONS_DESCRIPTION =
	'Link a TEHS Quarterly article or Then & Now document that discusses this photograph. Create or reuse it under The Website, then add it here so many images can share one piece. Example: Arnold, Inns & Taverns, TEQ 44-1/2. Books, PDFs, and other web links belong in References, not here.'

/**
 * Shared Quarterly citation references for archive documents (articles and Then & Now).
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
				to: [{type: 'quarterlyArticle'}, {type: 'thenAndNow'}],
			}),
		],
	})
}
