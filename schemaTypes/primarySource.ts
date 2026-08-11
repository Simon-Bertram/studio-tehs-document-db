import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {archiveIdField} from './shared/archiveIdField'
import {citationsField} from './shared/citationsField'
import {organisationsField} from './shared/organisationsField'
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
		{name: 'identity', title: 'Identity', default: true},
		{name: 'content', title: 'Content'},
		{name: 'place', title: 'Place'},
		{name: 'research', title: 'Research'},
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
			name: 'dateText',
			title: 'Publication Date (Textual)',
			type: 'string',
			group: 'identity',
			description: 'Use for uncertain or non-exact dates (e.g., "circa 1890", "Spring 1912").',
		}),
		defineField({
			name: 'date',
			title: 'Exact Publication Date',
			type: 'date',
			group: 'identity',
			description:
				'Optional. Use when the exact calendar date is known (helps sorting and filtering).',
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
			name: 'associatedProperty',
			title: 'Associated Property',
			type: 'reference',
			group: 'place',
			to: [{type: 'property'}],
			description:
				'When set, prefer this over a standalone township. Add township/location on the property for geography.',
		}),
		townshipWhenNoPlaceField({
			hideWhenField: 'associatedProperty',
			group: 'place',
			description:
				'Standalone township when no associated property is linked. Prefer linking a property when the place is known.',
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
		organisationsField('research'),
		subjectsField('research'),
		citationsField('research'),
	],
	orderings: [
		{
			title: 'Exact date, newest',
			name: 'dateDesc',
			by: [{field: 'date', direction: 'desc'}],
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
			date: 'date',
			media: 'articleImage',
		},
		prepare({title, newspaper, dateText, date, media}) {
			const when = dateText || date
			const subtitle = [newspaper, when].filter(Boolean).join(' · ')
			return {
				title: title || 'Untitled source',
				subtitle,
				media,
			}
		},
	},
})
