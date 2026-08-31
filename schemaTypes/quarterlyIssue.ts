import {BookIcon} from '@sanity/icons/Book'
import {CommentIcon} from '@sanity/icons/Comment'
import {ImageIcon} from '@sanity/icons/Image'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {defineField, defineType} from 'sanity'

import {defineCountedIncomingReferenceDecoration} from './components/CountedIncomingReferences'
import {QuarterlyIssueInput} from './components/QuarterlyIssueInput'
import {
	formatHistoricalDateFromPreview,
	historicalDatePreviewSelect,
} from './lib/historicalDatePreview'
import {setIncomingReference} from './lib/incoming-reference-array'
import {isUniqueStringField} from './lib/isUniqueStringField'
import {isUniqueVolumeIssue} from './lib/isUniqueVolumeIssue'

const uniqueVolumeIssue = isUniqueVolumeIssue()

function capitalizeSeason(season: unknown): string | undefined {
	if (typeof season !== 'string' || !season) return undefined
	return season.charAt(0).toUpperCase() + season.slice(1)
}

export const quarterlyIssue = defineType({
	name: 'quarterlyIssue',
	title: 'TEHS Quarterly Issue',
	type: 'document',
	icon: BookIcon,
	description:
		'One printed TEHS Quarterly issue (volume and number). Articles in this issue are separate documents that reference it.',
	components: {
		input: QuarterlyIssueInput,
	},
	groups: [
		{name: 'publication', title: 'Publication Details', icon: InfoOutlineIcon, default: true},
		{name: 'media', title: 'Cover & PDF', icon: ImageIcon},
		{name: 'notes', title: 'Notes', icon: CommentIcon},
	],
	fields: [
		defineField({
			name: 'volume',
			title: 'Volume',
			type: 'number',
			group: 'publication',
			validation: (Rule) => [Rule.required(), Rule.custom(uniqueVolumeIssue)],
		}),
		defineField({
			name: 'issueNumber',
			title: 'Issue / Number',
			type: 'number',
			group: 'publication',
			description: 'The printed issue number (1–4, or 5 on Volume 1).',
			validation: (Rule) => [Rule.required(), Rule.custom(uniqueVolumeIssue)],
		}),
		defineField({
			name: 'combinedIssue',
			title: 'Combined / double issue',
			type: 'boolean',
			group: 'publication',
			initialValue: false,
			description:
				'Check only when one physical magazine covers two numbers (e.g. Vol. 44, Numbers 1 and 2).',
		}),
		defineField({
			name: 'issueNumberEnd',
			title: 'Also numbered as',
			type: 'number',
			group: 'publication',
			hidden: ({document}) => document?.combinedIssue !== true,
			description:
				'The higher number in a double issue (e.g. 2 when this issue is Nos. 1 and 2). Not a page number.',
			validation: (Rule) =>
				Rule.custom((end, context) => {
					if (context.document?.combinedIssue !== true) return true
					if (end == null) return 'Enter the higher number for this combined issue'
					const start = context.document?.issueNumber
					if (typeof start === 'number' && typeof end === 'number' && end <= start) {
						return 'Must be greater than Issue / Number'
					}
					return true
				}),
		}),
		defineField({
			name: 'season',
			title: 'Season',
			type: 'string',
			group: 'publication',
			options: {
				list: [
					{title: 'Spring', value: 'spring'},
					{title: 'Summer', value: 'summer'},
					{title: 'Autumn', value: 'autumn'},
					{title: 'Winter', value: 'winter'},
				],
				layout: 'radio',
			},
			description:
				'When the issue is dated by season (e.g. Spring 2026). Do not invent a month from the season.',
		}),
		defineField({
			name: 'publicationDate',
			title: 'Publication Date',
			type: 'historicalDate',
			group: 'publication',
			description: 'Usually month and year (e.g. January 1984). Year only when dated by season.',
		}),
		defineField({
			name: 'yearSearch',
			title: 'Year Search',
			type: 'string',
			hidden: true,
			group: 'publication',
			description: 'Derived tokens for Studio search (full year plus 3-digit prefix).',
			options: {
				search: {weight: 10},
			},
		}),
		defineField({
			name: 'sourceKey',
			title: 'Source Key',
			type: 'string',
			group: 'publication',
			description:
				'Stable key from the digital archive (e.g. v22n1, or v44n1+2 for a double issue). Used by the Quarterly import for idempotent upserts.',
			validation: (Rule) =>
				Rule.custom(
					isUniqueStringField('quarterlyIssue', 'sourceKey', 'Source key must be unique'),
				),
		}),
		defineField({
			name: 'coverImage',
			title: 'Cover Image',
			type: 'image',
			group: 'media',
			options: {hotspot: true},
			description: 'Optional scan of the printed issue cover.',
		}),
		defineField({
			name: 'pdfAsset',
			title: 'Issue PDF',
			type: 'file',
			group: 'media',
			options: {
				accept: 'application/pdf',
			},
			description:
				'Optional scan or download of the printed issue. Empty for HTML-imported volumes.',
		}),
		defineField({
			name: 'tocNotes',
			title: 'Table of Contents Notes',
			type: 'text',
			group: 'notes',
			description:
				'Optional editorial blurb. The public table of contents is generated from articles in this issue, ordered by start page.',
		}),
	],
	renderMembers: (members) => [
		...members,
		defineCountedIncomingReferenceDecoration({
			name: 'articles',
			title: 'Articles',
			types: [{type: 'quarterlyArticle'}],
			onLinkDocument: setIncomingReference('issueRef'),
		}),
	],
	orderings: [
		{
			title: 'Volume & issue',
			name: 'volumeIssueAsc',
			by: [
				{field: 'volume', direction: 'asc'},
				{field: 'issueNumber', direction: 'asc'},
			],
		},
	],
	preview: {
		select: {
			volume: 'volume',
			issueNumber: 'issueNumber',
			issueNumberEnd: 'issueNumberEnd',
			combinedIssue: 'combinedIssue',
			season: 'season',
			cover: 'coverImage',
			...historicalDatePreviewSelect('publicationDate'),
		},
		prepare(selection) {
			const {volume, issueNumber, issueNumberEnd, combinedIssue, season, cover} = selection
			const numbers =
				combinedIssue && issueNumberEnd != null && issueNumberEnd !== issueNumber
					? `Nos. ${issueNumber}–${issueNumberEnd}`
					: issueNumber != null
						? `No. ${issueNumber}`
						: null
			const volIssue = [volume != null && `Vol. ${volume}`, numbers].filter(Boolean).join(', ')
			const when = [season && capitalizeSeason(season), formatHistoricalDateFromPreview(selection)]
				.filter(Boolean)
				.join(' ')
			return {
				title: volIssue || 'Untitled Issue',
				subtitle: when,
				media: cover,
			}
		},
	},
})
