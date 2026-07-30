import {defineArrayMember, defineField} from 'sanity'

/**
 * Shared Quarterly citation references for archive documents.
 */
export function citationsField(group?: string) {
	return defineField({
		name: 'citations',
		title: 'Research References',
		type: 'array',
		...(group ? {group} : {}),
		of: [
			defineArrayMember({
				type: 'reference',
				to: [{type: 'quarterlyArticle'}],
			}),
		],
	})
}
