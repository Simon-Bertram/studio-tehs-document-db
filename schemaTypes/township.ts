import {PinIcon} from '@sanity/icons/Pin'
import {defineField, defineType} from 'sanity'

import {TownshipMissingCountyMedia} from './components/TownshipMissingCountyMedia'
import {incomingReferenceInitialValue} from './lib/incoming-reference-array'
import {isUniqueStringField} from './lib/isUniqueStringField'

export const township = defineType({
	name: 'township',
	title: 'Township',
	type: 'document',
	icon: PinIcon,
	fields: [
		defineField({
			name: 'name',
			title: 'Township Name',
			type: 'string',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'county',
			title: 'County',
			type: 'reference',
			to: [{type: 'county'}],
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'migrationKey',
			title: 'Migration Mapping Key',
			type: 'string',
			description: 'Used by the CSV script to map old MySQL records to this township.',
			validation: (Rule) =>
				Rule.custom(
					isUniqueStringField('township', 'migrationKey', 'Migration mapping key must be unique'),
				),
		}),
	],
	initialValue: incomingReferenceInitialValue('county'),
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
			county: 'county.name',
		},
		prepare({title, county}) {
			return {
				title: title || 'Untitled township',
				subtitle: county || 'No county',
				...(county ? {} : {media: TownshipMissingCountyMedia}),
			}
		},
	},
})
