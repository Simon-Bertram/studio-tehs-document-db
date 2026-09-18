import {EnvelopeIcon} from '@sanity/icons/Envelope'
import {defineField, defineType} from 'sanity'

export const purposeEmail = defineType({
	name: 'purposeEmail',
	title: 'Purpose email',
	type: 'object',
	icon: EnvelopeIcon,
	fields: [
		defineField({
			name: 'purpose',
			title: 'Purpose',
			type: 'string',
			description: 'e.g. General inquiries, Membership, Archives.',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'address',
			title: 'Email',
			type: 'string',
			validation: (Rule) => Rule.required().email(),
		}),
	],
	preview: {
		select: {title: 'purpose', subtitle: 'address'},
	},
})
