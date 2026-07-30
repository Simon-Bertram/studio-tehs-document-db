import {defineField, defineType} from 'sanity'

export const mapEmbed = defineType({
	name: 'mapEmbed',
	title: 'Interactive Map Module',
	type: 'object',
	fields: [
		defineField({
			name: 'mapYear',
			title: 'Historical Map Target Year',
			type: 'string',
		}),
		defineField({
			name: 'mapUrl',
			title: 'Engine Application Embedded URL',
			type: 'url',
		}),
	],
})
