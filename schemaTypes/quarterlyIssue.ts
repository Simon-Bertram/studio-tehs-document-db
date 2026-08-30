import {BookIcon} from '@sanity/icons/Book'
import {CommentIcon} from '@sanity/icons/Comment'
import {ImageIcon} from '@sanity/icons/Image'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {defineField, defineType} from 'sanity'

import {defineCountedIncomingReferenceDecoration} from './components/CountedIncomingReferences'
import {DocumentWithDescription} from './components/DocumentWithDescription'
import {
	formatHistoricalDateFromPreview,
	historicalDatePreviewSelect,
} from './lib/historicalDatePreview'
import {setIncomingReference} from './lib/incoming-reference-array'
import {isUniqueStringField} from './lib/isUniqueStringField'
import {isUniqueVolumeIssue} from './lib/isUniqueVolumeIssue'

const uniqueVolumeIssue = isUniqueVolumeIssue()

export const quarterlyIssue = defineType({
	name: 'quarterlyIssue',
	title: 'TEHS Quarterly Issue',
	type: 'document',
	icon: BookIcon,
	description:
		'One printed TEHS Quarterly issue (volume and number). Articles in this issue are separate documents that reference it.',
	components: {
		input: DocumentWithDescription,
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
			validation: (Rule) => [Rule.required(), Rule.custom(uniqueVolumeIssue)],
		}),
		defineField({
			name: 'publicationDate',
			title: 'Publication Date',
			type: 'historicalDate',
			group: 'publication',
			description: 'Usually month and year (e.g. January 1984).',
		}),
		defineField({
			name: 'sourceKey',
			title: 'Source Key',
			type: 'string',
			group: 'publication',
			description:
				'Stable key from the digital archive (e.g. v22n1). Used by the Quarterly import for idempotent upserts.',
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
			cover: 'coverImage',
			...historicalDatePreviewSelect('publicationDate'),
		},
		prepare(selection) {
			const {volume, issueNumber, cover} = selection
			const volIssue = [
				volume != null && `Vol. ${volume}`,
				issueNumber != null && `No. ${issueNumber}`,
			]
				.filter(Boolean)
				.join(', ')
			return {
				title: volIssue || 'Untitled Issue',
				subtitle: formatHistoricalDateFromPreview(selection),
				media: cover,
			}
		},
	},
})
