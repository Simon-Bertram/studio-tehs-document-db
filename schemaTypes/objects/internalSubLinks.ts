import {defineArrayMember, defineField, defineType} from 'sanity'

export const internalSubLinks = defineType({
	name: 'internalSubLinks',
	title: 'Nested Navigation Portal Index',
	type: 'object',
	fields: [
		defineField({
			name: 'links',
			title: 'Links',
			type: 'array',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'curatedEssay'}],
				}),
			],
		}),
	],
})
