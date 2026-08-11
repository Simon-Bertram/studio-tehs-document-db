import {SplitHorizontalIcon} from '@sanity/icons/SplitHorizontal'
import {defineField, defineType} from 'sanity'

export const pageBreak = defineType({
	name: 'pageBreak',
	title: 'Original Print Page Break',
	type: 'object',
	icon: SplitHorizontalIcon,
	fields: [
		defineField({
			name: 'pageNumber',
			title: 'Page Number',
			type: 'string',
			description: 'e.g., 3',
		}),
	],
	preview: {
		select: {page: 'pageNumber'},
		prepare({page}) {
			return {title: `--- Page ${page || '?'} ---`}
		},
	},
})
