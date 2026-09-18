import {UserIcon} from '@sanity/icons/User'
import {defineField, defineType} from 'sanity'

export const awardRecipient = defineType({
	name: 'awardRecipient',
	title: 'Award recipient',
	type: 'object',
	icon: UserIcon,
	fields: [
		defineField({
			name: 'name',
			title: 'Name',
			type: 'string',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'posthumous',
			title: 'Posthumous',
			type: 'boolean',
			initialValue: false,
		}),
		defineField({
			name: 'deceased',
			title: 'Since deceased',
			type: 'boolean',
			initialValue: false,
		}),
		defineField({
			name: 'photo',
			title: 'Photograph',
			type: 'image',
			options: {hotspot: true},
		}),
		defineField({
			name: 'notes',
			title: 'Notes',
			type: 'text',
			rows: 2,
			description: 'Optional. Shown with this recipient on the public awards page.',
		}),
	],
	preview: {
		select: {title: 'name', media: 'photo', posthumous: 'posthumous'},
		prepare({title, media, posthumous}) {
			return {
				title: title || 'Unnamed recipient',
				subtitle: posthumous ? 'Posthumous' : undefined,
				media,
			}
		},
	},
})
