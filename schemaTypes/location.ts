import {MarkerIcon} from '@sanity/icons/Marker'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const location = defineType({
	name: 'location',
	title: 'Specific Location / Village',
	type: 'document',
	icon: MarkerIcon,
	fields: [
		defineField({
			name: 'name',
			title: 'Location Name',
			type: 'string',
			description: 'e.g., Paoli, Cedar Hollow, Berwyn',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'townships',
			title: 'Townships',
			type: 'array',
			description: 'A location can span more than one township.',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'township'}],
				}),
			],
			validation: (Rule) => Rule.required().min(1).unique(),
		}),
		defineField({
			name: 'coordinates',
			title: 'Coordinates',
			type: 'geopoint',
			group: 'place',
			description: 'Pinpoint the exact location. (Powered by @sanity/google-maps-input)',
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
			township0: 'townships.0.name',
			township1: 'townships.1.name',
			township2: 'townships.2.name',
		},
		prepare({title, township0, township1, township2}) {
			const townships = [township0, township1, township2].filter(Boolean)

			return {
				title: title || 'Untitled location',
				subtitle: townships.length > 0 ? townships.join(', ') : undefined,
			}
		},
	},
})
