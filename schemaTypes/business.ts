import {CaseIcon} from '@sanity/icons/Case'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {
	BUSINESS_TYPE_LABELS,
	BUSINESS_TYPES,
} from './shared/businessTypes'

export const business = defineType({
	name: 'business',
	title: 'Historical Business',
	type: 'document',
	icon: CaseIcon,
	fields: [
		defineField({
			name: 'name',
			title: 'Business Name',
			type: 'string',
			description: 'e.g., H. & B.F. Bean’s Business, Valley Forge Silica, Sand and Ore Company',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'businessType',
			title: 'Business Type',
			type: 'string',
			options: {
				list: [...BUSINESS_TYPES],
			},
			description:
				'Organisation classification for this entity (one type)—not a Subject Category. Categories like Businesses or Organizations are archive search themes for clippings/photos. Civic: fire company, library, conservancy, horse show. Commercial: mill operators, water companies, silica/ore firms. Institutional: Lincoln Institution, military units as operators.',
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			description: 'Historical context for this business or organisation.',
		}),
		defineField({
			name: 'yearsActive',
			title: 'Years Active',
			type: 'string',
			description: 'Freeform date range, e.g. 1870–1920.',
		}),
		defineField({
			name: 'owners',
			title: 'Owners / Operators',
			type: 'array',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'person'}],
				}),
			],
		}),
		defineField({
			name: 'locations',
			title: 'Associated Properties / Sites',
			type: 'array',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'property'}],
				}),
			],
			description:
				'Canonical link from this organisation to the properties it occupied. Related businesses are found from a property via this field (not stored on the property).',
		}),
	],
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
			businessType: 'businessType',
		},
		prepare(selection) {
			const {title, businessType} = selection
			const label =
				businessType && businessType in BUSINESS_TYPE_LABELS
					? BUSINESS_TYPE_LABELS[
							businessType as keyof typeof BUSINESS_TYPE_LABELS
						]
					: businessType
			return {
				title: title || 'Unnamed Business',
				subtitle: label || undefined,
			}
		},
	},
})
