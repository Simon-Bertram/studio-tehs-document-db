import {UsersIcon} from '@sanity/icons/Users'
import {defineField, defineType} from 'sanity'
import {defineIncomingReferenceDecoration} from 'sanity/structure'

import {appendIncomingReference} from './lib/incoming-reference-array'
import {truncatePreviewText} from './lib/truncatePreviewText'

export const familyLine = defineType({
	name: 'familyLine',
	title: 'Family / Lineage',
	type: 'document',
	icon: UsersIcon,
	fields: [
		defineField({
			name: 'title',
			title: 'Family Name',
			type: 'string',
			description: 'e.g., The Bean Family, The Havard Family',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'description',
			title: 'Historical Background',
			type: 'text',
			description: 'A brief overview of the family’s origin or impact in the area.',
		}),
	],
	renderMembers: (members) => [
		...members,
		defineIncomingReferenceDecoration({
			name: 'people',
			title: 'People',
			description: 'Historical persons tagged with this family lineage.',
			types: [{type: 'person'}],
			onLinkDocument: appendIncomingReference('familyLines'),
		}),
	],
	orderings: [
		{
			title: 'Title, A–Z',
			name: 'titleAsc',
			by: [{field: 'title', direction: 'asc'}],
		},
	],
	preview: {
		select: {
			title: 'title',
			description: 'description',
		},
		prepare({title, description}) {
			return {
				title: title || 'Untitled family',
				subtitle: truncatePreviewText(description),
			}
		},
	},
})
