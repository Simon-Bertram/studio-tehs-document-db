import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {PinIcon} from '@sanity/icons/Pin'
import {SearchIcon} from '@sanity/icons/Search'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {formatHistoricalDate, type HistoricalDateValue} from './lib/formatHistoricalDate'
import {archiveIdField} from './shared/archiveIdField'
import {citationsField} from './shared/citationsField'
import {organizationsField} from './shared/organizationsField'
import {subjectsField} from './shared/subjectsField'
import {townshipWhenNoPlaceField} from './shared/townshipWhenNoPlaceField'

export const primarySource = defineType({
	name: 'primarySource',
	title: 'Primary Source',
	type: 'document',
	icon: DocumentTextIcon,
	description:
		'STOP: Use this ONLY for transcribing a single, historical piece of media (like a newspaper ad or old letter). If you want to publish an essay or piece of modern research, use the Research Article type instead.',
	groups: [
		{name: 'identity', title: 'Identity', icon: InfoOutlineIcon, default: true},
		{name: 'content', title: 'Content', icon: BlockElementIcon},
		{name: 'place', title: 'Place', icon: PinIcon},
		{name: 'research', title: 'Research', icon: SearchIcon},
	],
	fields: [
		archiveIdField('primarySource', 'Doc505', 'identity'),
		defineField({
			name: 'title',
			title: 'Headline / Subject Title',
			type: 'string',
			group: 'identity',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'date',
			title: 'Publication Date',
			type: 'historicalDate',
			group: 'identity',
			description:
				'Prefer year-only or month+year when the exact day is unknown. Use Exact day only when the full calendar date is known.',
		}),
		defineField({
			name: 'dateText',
			title: 'Publication Date (Legacy Text)',
			type: 'string',
			group: 'identity',
			deprecated: {
				reason: 'Use Publication Date (structured historical date) instead.',
			},
			readOnly: true,
			hidden: ({value}) => value === undefined,
			initialValue: undefined,
		}),
		defineField({
			name: 'newspaper',
			title: 'Source Publication Name',
			type: 'string',
			group: 'identity',
		}),
		defineField({
			name: 'articleImage',
			title: 'Scan of Clipping',
			type: 'image',
			group: 'content',
			options: {hotspot: true},
		}),
		defineField({
			name: 'transcription',
			title: 'Full Transcription Text',
			type: 'array',
			group: 'content',
			of: [defineArrayMember({type: 'block'})],
		}),
		defineField({
			name: 'isSheriffSale',
			title: "Is this a Sheriff's Sale?",
			type: 'boolean',
			group: 'content',
		}),
		defineField({
			name: 'legalWrit',
			title: 'Legal Writ Type',
			type: 'string',
			group: 'content',
			options: {
				list: [
					{title: 'Fieri Facias', value: 'fieriFacias'},
					{title: 'Levari Facias', value: 'levariFacias'},
					{title: 'Venditioni Exponas', value: 'venditioniExponas'},
				],
			},
			hidden: ({document}) => !document?.isSheriffSale,
		}),
		defineField({
			name: 'associatedProperties',
			title: 'Associated Properties',
			type: 'array',
			group: 'place',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'property'}],
				}),
			],
			description:
				'When set, prefer these over a standalone township. Add township/location on the property for geography.',
		}),
		townshipWhenNoPlaceField({
			hideWhenField: 'associatedProperties',
			group: 'place',
			description:
				'Standalone township when no associated properties are linked. Prefer linking a property when the place is known.',
		}),
		defineField({
			name: 'peopleMentioned',
			title: 'People Mentioned',
			type: 'array',
			group: 'place',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'person'}],
				}),
			],
		}),
		organizationsField('research'),
		subjectsField('research'),
		citationsField('research'),
	],
	orderings: [
		{
			title: 'Exact date, newest',
			name: 'dateDesc',
			by: [{field: 'date.date', direction: 'desc'}],
		},
		{
			title: 'Year, newest',
			name: 'yearDesc',
			by: [{field: 'date.year', direction: 'desc'}],
		},
		{
			title: 'Archive ID',
			name: 'archiveIdAsc',
			by: [{field: 'archiveId', direction: 'asc'}],
		},
		{
			title: 'Title, A–Z',
			name: 'titleAsc',
			by: [{field: 'title', direction: 'asc'}],
		},
	],
	preview: {
		select: {
			title: 'title',
			newspaper: 'newspaper',
			dateText: 'dateText',
			precision: 'date.precision',
			qualifier: 'date.qualifier',
			year: 'date.year',
			month: 'date.month',
			date: 'date.date',
			media: 'articleImage',
		},
		prepare({title, newspaper, dateText, precision, qualifier, year, month, date, media}) {
			const when =
				formatHistoricalDate({
					precision,
					qualifier,
					year,
					month,
					date,
				} as HistoricalDateValue) || dateText
			const subtitle = [newspaper, when].filter(Boolean).join(' · ')
			return {
				title: title || 'Untitled source',
				subtitle,
				media,
			}
		},
	},
})
