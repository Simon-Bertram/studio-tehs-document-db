import {TagsIcon} from '@sanity/icons/Tags'
import {defineField, defineType} from 'sanity'
import {isUniqueStringField} from './lib/isUniqueStringField'

export const donationCategory = defineType({
	name: 'donationCategory',
	title: 'Donation Category',
	type: 'document',
	icon: TagsIcon,
	description:
		'Material types for donations (e.g. Photographic prints, Postcards, Slides). Tag donation records so mixed gifts can list each material present.',
	fields: [
		defineField({
			name: 'title',
			title: 'Category Title',
			type: 'string',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
		}),
		defineField({
			name: 'migrationKey',
			title: 'Migration Mapping Key',
			type: 'string',
			description:
				'Used by the CSV script to map legacy dtype values to this category. Visible during migration; hide after cutover.',
			validation: (Rule) =>
				Rule.custom(
					isUniqueStringField(
						'donationCategory',
						'migrationKey',
						'Migration mapping key must be unique',
					),
				),
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
			subtitle: 'description',
		},
	},
})
