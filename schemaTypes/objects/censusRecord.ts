import {CalendarIcon} from '@sanity/icons/Calendar'
import {defineField, defineType} from 'sanity'

export const censusRecord = defineType({
	name: 'censusRecord',
	title: 'Census / Occupation Record',
	type: 'object',
	icon: CalendarIcon,
	fields: [
		defineField({
			name: 'year',
			title: 'Census Year',
			type: 'number',
		}),
		defineField({
			name: 'occupation',
			title: 'Recorded Occupation',
			type: 'string',
		}),
	],
	preview: {
		select: {
			title: 'occupation',
			subtitle: 'year',
		},
		prepare({title, subtitle}) {
			return {
				title: title || 'Occupation unknown',
				subtitle: subtitle ? String(subtitle) : undefined,
			}
		},
	},
})
