import {BillIcon} from '@sanity/icons/Bill'
import {DocumentsIcon} from '@sanity/icons/Documents'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {PinIcon} from '@sanity/icons/Pin'
import {SearchIcon} from '@sanity/icons/Search'
import {UsersIcon} from '@sanity/icons/Users'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {formatHistoricalDate, type HistoricalDateValue} from './lib/formatHistoricalDate'
import {archiveIdField} from './shared/archiveIdField'

export const deed = defineType({
	name: 'deed',
	title: 'Deed / Land Instrument',
	type: 'document',
	icon: DocumentsIcon,
	description:
		'One conveyance or land instrument in a chain of title (deed, patent, will, tax return, etc.). Not for transcribing a single clipping—use Primary Source for that.',
	groups: [
		{name: 'identity', title: 'Identity', icon: InfoOutlineIcon, default: true},
		{name: 'parties', title: 'Parties', icon: UsersIcon},
		{name: 'terms', title: 'Terms', icon: BillIcon},
		{name: 'place', title: 'Place', icon: PinIcon},
		{name: 'research', title: 'Research', icon: SearchIcon},
	],
	fields: [
		archiveIdField('deed', 'G2-182', 'identity'),
		defineField({
			name: 'instrumentType',
			title: 'Instrument Type',
			type: 'string',
			group: 'identity',
			options: {
				list: [
					{title: 'Patent', value: 'patent'},
					{title: 'Deed', value: 'deed'},
					{title: 'Will', value: 'will'},
					{title: 'Probate', value: 'probate'},
					{title: 'Warrant', value: 'warrant'},
					{title: 'Survey', value: 'survey'},
					{title: 'Tax Return', value: 'taxReturn'},
					{title: 'Atlas', value: 'atlas'},
					{title: 'Other', value: 'other'},
				],
			},
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'reference',
			title: 'Reference',
			type: 'string',
			group: 'identity',
			description:
				'Deed book / patent / survey citation as recorded (e.g. G2-182, Patent A2-583; Warrant 3/3/1701).',
		}),
		defineField({
			name: 'dateText',
			title: 'Date (Textual)',
			type: 'string',
			group: 'identity',
			description:
				'As-recorded or uncertain date (e.g. "1799", "3/21/1775 (probate)", "circa 1755"). Prefer this for display.',
		}),
		defineField({
			name: 'date',
			title: 'Structured Date',
			type: 'historicalDate',
			group: 'identity',
			description:
				'Optional structured date for sorting and filtering. Prefer year-only when the day is unknown. Keep Date (Textual) for as-recorded wording.',
		}),
		defineField({
			name: 'grantors',
			title: 'Grantors (From)',
			type: 'array',
			group: 'parties',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'person'}],
				}),
			],
			description: 'Link people when profiles exist.',
		}),
		defineField({
			name: 'grantorsText',
			title: 'Grantors (Text)',
			type: 'string',
			group: 'parties',
			description:
				'As-recorded From parties when not yet in Historical Persons (e.g. executors, multi-name groups).',
		}),
		defineField({
			name: 'grantees',
			title: 'Grantees (To)',
			type: 'array',
			group: 'parties',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'person'}],
				}),
			],
			description: 'Link people when profiles exist.',
		}),
		defineField({
			name: 'granteesText',
			title: 'Grantees (Text)',
			type: 'string',
			group: 'parties',
			description: 'As-recorded To parties when not yet in Historical Persons.',
		}),
		defineField({
			name: 'areaText',
			title: 'Area',
			type: 'string',
			group: 'terms',
			description: 'As-recorded acreage (e.g. 490a, 73a 56p).',
		}),
		defineField({
			name: 'costText',
			title: 'Cost (Textual)',
			type: 'string',
			group: 'terms',
			description: 'As-recorded cost for display (e.g. £300, £244 10s, $11,700, £6 per annum).',
		}),
		defineField({
			name: 'costKind',
			title: 'Cost Kind',
			type: 'string',
			group: 'terms',
			options: {
				list: [
					{title: 'Sale / purchase', value: 'sale'},
					{title: 'Ground rent', value: 'groundRent'},
					{title: 'Other', value: 'other'},
				],
			},
			description: 'Optional. Mark ground rents so they can be excluded from sale-price sorts.',
		}),
		defineField({
			name: 'costCurrency',
			title: 'Cost Currency',
			type: 'string',
			group: 'terms',
			options: {
				list: [
					{title: 'GBP (£)', value: 'gbp'},
					{title: 'USD ($)', value: 'usd'},
				],
			},
			description:
				'Optional. Set with Cost Amount when you want currency-aware sorting or filters.',
		}),
		defineField({
			name: 'costAmount',
			title: 'Cost Amount (Normalized)',
			type: 'number',
			group: 'terms',
			description:
				'Optional major units for sort/filter: USD in dollars (762.5), GBP in pounds (244.5 for £244 10s). Leave empty when not comparable. Sort only within the same currency.',
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
			description: 'Tract(s) this conveyance concerns.',
		}),
		defineField({
			name: 'branchLabel',
			title: 'Branch Label',
			type: 'string',
			group: 'place',
			description:
				'Optional subdivision branch when this row is part of a branched title story (e.g. Branch A).',
		}),
		defineField({
			name: 'notes',
			title: 'Notes',
			type: 'text',
			group: 'research',
			description: 'Research notes for this conveyance.',
		}),
		defineField({
			name: 'scanImage',
			title: 'Scan / Survey Image',
			type: 'image',
			group: 'research',
			options: {hotspot: true},
			description: 'Optional image of the deed book page, survey, or patent.',
		}),
		defineField({
			name: 'scanSource',
			title: 'Full Transcription (Primary Source)',
			type: 'reference',
			group: 'research',
			to: [{type: 'primarySource'}],
			description: 'Optional. Link when the full instrument is transcribed in The Archive.',
		}),
	],
	orderings: [
		{
			title: 'Exact date, newest',
			name: 'dateDesc',
			by: [{field: 'date.date', direction: 'desc'}],
		},
		{
			title: 'Exact date, oldest',
			name: 'dateAsc',
			by: [{field: 'date.date', direction: 'asc'}],
		},
		{
			title: 'Year, newest',
			name: 'yearDesc',
			by: [{field: 'date.year', direction: 'desc'}],
		},
		{
			title: 'Year, oldest',
			name: 'yearAsc',
			by: [{field: 'date.year', direction: 'asc'}],
		},
		{
			title: 'Cost amount, high–low',
			name: 'costAmountDesc',
			by: [{field: 'costAmount', direction: 'desc'}],
		},
		{
			title: 'Reference, A–Z',
			name: 'referenceAsc',
			by: [{field: 'reference', direction: 'asc'}],
		},
		{
			title: 'Archive ID',
			name: 'archiveIdAsc',
			by: [{field: 'archiveId', direction: 'asc'}],
		},
	],
	preview: {
		select: {
			reference: 'reference',
			grantorsText: 'grantorsText',
			granteesText: 'granteesText',
			dateText: 'dateText',
			precision: 'date.precision',
			qualifier: 'date.qualifier',
			year: 'date.year',
			month: 'date.month',
			date: 'date.date',
			instrumentType: 'instrumentType',
			media: 'scanImage',
		},
		prepare({
			reference,
			grantorsText,
			granteesText,
			dateText,
			precision,
			qualifier,
			year,
			month,
			date,
			instrumentType,
			media,
		}) {
			const parties =
				grantorsText || granteesText
					? [grantorsText, granteesText].filter(Boolean).join(' → ')
					: undefined
			const title = reference || parties || 'Untitled instrument'
			const when =
				dateText ||
				formatHistoricalDate({
					precision,
					qualifier,
					year,
					month,
					date,
				} as HistoricalDateValue)
			const subtitle = [instrumentType, when].filter(Boolean).join(' · ')
			return {
				title,
				subtitle,
				media,
			}
		},
	},
})
