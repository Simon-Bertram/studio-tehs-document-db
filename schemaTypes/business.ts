import {CaseIcon} from '@sanity/icons/Case'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {isUniqueStringField} from './lib/isUniqueStringField'
import {BUSINESS_TYPE_LABELS, BUSINESS_TYPES} from './shared/businessTypes'

export const business = defineType({
	name: 'business',
	title: 'Historical Organization',
	type: 'document',
	icon: CaseIcon,
	fields: [
		defineField({
			name: 'name',
			title: 'Organization Name',
			type: 'string',
			description:
				'e.g., Great Valley Presbyterian Church, H. & B.F. Bean’s Lumber Yard, Valley Forge Silica, Sand and Ore Company',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'businessType',
			title: 'Organization Type',
			type: 'string',
			options: {
				list: [...BUSINESS_TYPES],
			},
			description:
				'Organization classification for this entity (one type)—not a Subject Category. Categories like Businesses or Organizations are archive search themes for clippings/photos. Civic: fire company, library, conservancy, horse show. Commercial: mill operators, water companies, silica/ore firms. Institutional: Lincoln Institution, military units as operators.',
		}),
		defineField({
			name: 'migrationKey',
			title: 'Migration Mapping Key',
			type: 'string',
			description:
				'Used by the CSV script to map legacy keywords (e.g. Lincoln) to this organization. Visible during migration; hide after cutover.',
			validation: (Rule) =>
				Rule.custom(
					isUniqueStringField('business', 'migrationKey', 'Migration mapping key must be unique'),
				),
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			description: 'Historical context for this organization.',
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
				'Canonical link from this organization to the properties it occupied. Related organizations are found from a property via this field (not stored on the property).',
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
					? BUSINESS_TYPE_LABELS[businessType as keyof typeof BUSINESS_TYPE_LABELS]
					: businessType
			return {
				title: title || 'Unnamed Organization',
				subtitle: label || undefined,
			}
		},
	},
})
