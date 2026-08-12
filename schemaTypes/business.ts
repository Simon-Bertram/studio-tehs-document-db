import {CaseIcon} from '@sanity/icons/Case'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {LinkIcon} from '@sanity/icons/Link'
import {PinIcon} from '@sanity/icons/Pin'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {formatHistoricalDateRange} from './lib/formatHistoricalDate'
import {
	historicalDateFromPreview,
	historicalDatePreviewSelect,
} from './lib/historicalDatePreview'
import {isUniqueStringField} from './lib/isUniqueStringField'
import {BUSINESS_TYPE_LABELS, BUSINESS_TYPES} from './shared/businessTypes'
import {associatedPropertiesField} from './shared/locationFields'

export const business = defineType({
	name: 'business',
	title: 'Historical Organization',
	type: 'document',
	icon: CaseIcon,
	groups: [
		{name: 'identity', title: 'Identity', icon: InfoOutlineIcon, default: true},
		{name: 'place', title: 'Place', icon: PinIcon},
		{name: 'relations', title: 'Relations', icon: LinkIcon},
	],
	fields: [
		defineField({
			name: 'name',
			title: 'Organization Name',
			type: 'string',
			group: 'identity',
			description:
				'e.g., Great Valley Presbyterian Church, H. & B.F. Bean’s Lumber Yard, Valley Forge Silica, Sand and Ore Company',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'businessType',
			title: 'Organization Type',
			type: 'string',
			group: 'identity',
			options: {
				list: [...BUSINESS_TYPES],
			},
			description:
				'Organization classification for this entity (one type)—not a Subject Category. Categories like Businesses or Organizations are archive search themes for clippings/photos. Civic: fire company, library, conservancy, horse show. Commercial: mill operators, water companies, silica/ore firms. Institutional: Lincoln Institution, military units as operators.',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'migrationKey',
			title: 'Migration Mapping Key',
			type: 'string',
			group: 'identity',
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
			group: 'identity',
			description: 'Historical context for this organization.',
		}),
		defineField({
			name: 'activeFrom',
			title: 'Active From',
			type: 'historicalDate',
			group: 'identity',
			description: 'Optional start of known activity (often year-only).',
		}),
		defineField({
			name: 'activeTo',
			title: 'Active To',
			type: 'historicalDate',
			group: 'identity',
			description: 'Optional end of known activity (often year-only).',
		}),
		defineField({
			name: 'yearsActive',
			title: 'Years Active (Legacy)',
			type: 'string',
			group: 'identity',
			description: 'Freeform date range, e.g. 1870–1920.',
			deprecated: {
				reason: 'Use Active From / Active To instead.',
			},
			readOnly: true,
			hidden: ({value}) => value === undefined,
			initialValue: undefined,
		}),
		defineField({
			name: 'coordinates',
			title: 'Coordinates',
			type: 'geopoint',
			group: 'place',
			description: 'Pinpoint the exact location. (Powered by @sanity/google-maps-input)',
		}),
		defineField({
			name: 'owners',
			title: 'Owners / Operators',
			type: 'array',
			group: 'relations',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'person'}],
				}),
			],
		}),
		associatedPropertiesField('relations'),
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
			yearsActive: 'yearsActive',
			...historicalDatePreviewSelect('activeFrom', 'from'),
			...historicalDatePreviewSelect('activeTo', 'to'),
		},
		prepare(selection) {
			const {title, businessType, yearsActive} = selection
			const label =
				businessType && businessType in BUSINESS_TYPE_LABELS
					? BUSINESS_TYPE_LABELS[businessType as keyof typeof BUSINESS_TYPE_LABELS]
					: businessType
			const range =
				formatHistoricalDateRange(
					historicalDateFromPreview(selection, 'from'),
					historicalDateFromPreview(selection, 'to'),
				) || yearsActive
			const subtitle = [label, range].filter(Boolean).join(' · ')
			return {
				title: title || 'Unnamed Organization',
				subtitle: subtitle || undefined,
			}
		},
	},
})
