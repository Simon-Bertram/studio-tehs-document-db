import {UsersIcon} from '@sanity/icons/Users'
import {defineField, defineType} from 'sanity'

import {RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_TYPES} from '../shared/relationshipTypes'

export const immediateRelative = defineType({
	name: 'immediateRelative',
	title: 'Immediate Relative',
	type: 'object',
	icon: UsersIcon,
	fields: [
		defineField({
			name: 'relative',
			title: 'Relative Profile',
			type: 'reference',
			to: [{type: 'person'}],
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'relationshipType',
			title: 'Relationship to this person',
			type: 'string',
			options: {
				list: [...RELATIONSHIP_TYPES],
			},
			validation: (Rule) => Rule.required(),
		}),
	],
	preview: {
		select: {
			title: 'relative.firstName',
			lastName: 'relative.lastName',
			relationshipType: 'relationshipType',
		},
		prepare({title, lastName, relationshipType}) {
			const subtitle =
				relationshipType && relationshipType in RELATIONSHIP_TYPE_LABELS
					? RELATIONSHIP_TYPE_LABELS[relationshipType as keyof typeof RELATIONSHIP_TYPE_LABELS]
					: relationshipType

			return {
				title: [title, lastName].filter(Boolean).join(' ') || 'Unknown',
				subtitle,
			}
		},
	},
})
