import {TagsIcon} from '@sanity/icons/Tags'
import {defineField, defineType} from 'sanity'

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
