import {defineArrayMember, defineField} from 'sanity'

const PROPERTIES_MENTIONED_DESCRIPTION =
	'Link historic sites mentioned in the article for cross-site discovery.'

/**
 * Shared properties-mentioned reference array for quarterly and research
 * articles.
 */
export function propertiesMentionedField(group?: string) {
	return defineField({
		name: 'propertiesMentioned',
		title: 'Properties / Historic Sites Mentioned',
		type: 'array',
		...(group ? {group} : {}),
		description: PROPERTIES_MENTIONED_DESCRIPTION,
		of: [
			defineArrayMember({
				type: 'reference',
				to: [{type: 'property'}],
			}),
		],
	})
}
