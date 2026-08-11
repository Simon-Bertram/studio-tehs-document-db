import {EarthGlobeIcon} from '@sanity/icons/EarthGlobe'
import {defineField, defineType} from 'sanity'

export const mapEmbed = defineType({
	name: 'mapEmbed',
	title: 'Interactive Map Module',
	type: 'object',
	icon: EarthGlobeIcon,
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
	preview: {
		select: {
			mapYear: 'mapYear',
			mapUrl: 'mapUrl',
		},
		prepare({mapYear, mapUrl}) {
			return {
				title: mapYear ? `Map ${mapYear}` : 'Map embed',
				subtitle: mapUrl || undefined,
			}
		},
	},
})
