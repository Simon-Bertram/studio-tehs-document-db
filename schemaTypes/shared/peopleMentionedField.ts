import {defineArrayMember, defineField} from 'sanity'

const PEOPLE_MENTIONED_DESCRIPTION =
	'Historical persons mentioned in this item. Create or reuse a person under Taxonomies & Entities.'

/**
 * Shared people-mentioned reference array for sources and website articles.
 */
export function peopleMentionedField(group?: string) {
	return defineField({
		name: 'peopleMentioned',
		title: 'People Mentioned',
		type: 'array',
		...(group ? {group} : {}),
		description: PEOPLE_MENTIONED_DESCRIPTION,
		of: [
			defineArrayMember({
				type: 'reference',
				to: [{type: 'person'}],
			}),
		],
	})
}
