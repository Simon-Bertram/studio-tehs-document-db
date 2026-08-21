import {EarthAmericasIcon} from '@sanity/icons/EarthAmericas'
import {defineField, defineType} from 'sanity'
import {defineIncomingReferenceDecoration} from 'sanity/structure'

import {setIncomingReference} from './lib/incoming-reference-array'
import {isUniqueStringField} from './lib/isUniqueStringField'

export const county = defineType({
	name: 'county',
	title: 'County',
	type: 'document',
	icon: EarthAmericasIcon,
	fields: [
		defineField({
			name: 'name',
			title: 'County Name',
			type: 'string',
			validation: (Rule) =>
				Rule.required().custom(isUniqueStringField('county', 'name', 'County name must be unique')),
		}),
	],
	renderMembers: (members) => [
		...members,
		defineIncomingReferenceDecoration({
			name: 'townships',
			title: 'Townships',
			description: 'Townships in this county.',
			types: [{type: 'township'}],
			onLinkDocument: setIncomingReference('county'),
		}),
	],
	orderings: [
		{
			title: 'Name, A–Z',
			name: 'nameAsc',
			by: [{field: 'name', direction: 'asc'}],
		},
	],
	preview: {
		select: {
			title: 'name',
		},
		prepare({title}) {
			return {
				title: title || 'Untitled county',
				subtitle: 'County',
			}
		},
	},
})
