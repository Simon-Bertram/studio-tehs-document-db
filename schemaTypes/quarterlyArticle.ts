import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {BookIcon} from '@sanity/icons/Book'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {TagIcon} from '@sanity/icons/Tag'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {
	formatHistoricalDateFromPreview,
	historicalDatePreviewSelect,
} from './lib/historicalDatePreview'
import {isUniqueStringField} from './lib/isUniqueStringField'
import {portableTextImageMember} from './shared/portableTextImageFields'

export const quarterlyArticle = defineType({
	name: 'quarterlyArticle',
	title: 'TEHS Quarterly Article',
	type: 'document',
	icon: BookIcon,
	groups: [
		{name: 'publication', title: 'Publication Details', icon: InfoOutlineIcon, default: true},
		{name: 'content', title: 'Article Content', icon: BlockElementIcon},
		{name: 'entities', title: 'Tagged Entities', icon: TagIcon},
	],
	fields: [
		defineField({
			name: 'title',
			title: 'Article Title',
			type: 'string',
			group: 'publication',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'authorText',
			title: 'Author Name',
			type: 'string',
			group: 'publication',
			description: 'e.g., Mrs. E. H. TenBroeck',
		}),
		defineField({
			name: 'volume',
			title: 'Volume',
			type: 'number',
			group: 'publication',
		}),
		defineField({
			name: 'issue',
			title: 'Issue / Number',
			type: 'number',
			group: 'publication',
		}),
		defineField({
			name: 'publishedDate',
			title: 'Publication Date',
			type: 'historicalDate',
			group: 'publication',
			description: 'Usually month and year (e.g. April 1968).',
		}),
		defineField({
			name: 'publishedDateText',
			title: 'Publication Date (Legacy Text)',
			type: 'string',
			group: 'publication',
			deprecated: {
				reason: 'Use Publication Date (structured historical date) instead.',
			},
			readOnly: true,
			hidden: ({value}) => value === undefined,
			initialValue: undefined,
		}),
		defineField({
			name: 'startPage',
			title: 'Start Page',
			type: 'number',
			group: 'publication',
		}),
		defineField({
			name: 'sourceKey',
			title: 'Source Key',
			type: 'string',
			group: 'publication',
			description:
				'Stable key from the digital archive path stem (e.g. v22n1p003). Used by the Quarterly import for idempotent upserts.',
			validation: (Rule) =>
				Rule.custom(
					isUniqueStringField('quarterlyArticle', 'sourceKey', 'Source key must be unique'),
				),
		}),
		defineField({
			name: 'sourceUrl',
			title: 'Source URL',
			type: 'url',
			group: 'publication',
			description: 'Canonical tehistory.org article URL for QA and redirects.',
		}),
		defineField({
			name: 'body',
			title: 'Article Text',
			type: 'array',
			group: 'content',
			of: [
				defineArrayMember({type: 'block'}),
				portableTextImageMember({title: 'Inline Image'}),
				defineArrayMember({type: 'pageBreak'}),
			],
		}),
		defineField({
			name: 'propertiesMentioned',
			title: 'Properties / Historic Sites Mentioned',
			type: 'array',
			group: 'entities',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'property'}],
				}),
			],
			description: 'Link historic sites mentioned in the article for cross-site discovery.',
		}),
		defineField({
			name: 'peopleMentioned',
			title: 'People Mentioned',
			type: 'array',
			group: 'entities',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'person'}],
				}),
			],
		}),
	],
	orderings: [
		{
			title: 'Start page',
			name: 'startPageAsc',
			by: [{field: 'startPage', direction: 'asc'}],
		},
		{
			title: 'Volume & issue',
			name: 'volumeIssueAsc',
			by: [
				{field: 'volume', direction: 'asc'},
				{field: 'issue', direction: 'asc'},
			],
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
			volume: 'volume',
			issue: 'issue',
			legacyDate: 'publishedDateText',
			...historicalDatePreviewSelect('publishedDate'),
		},
		prepare(selection) {
			const {title, volume, issue, legacyDate} = selection
			const volIssue = [volume != null && `Vol ${volume}`, issue != null && `No. ${issue}`]
				.filter(Boolean)
				.join(', ')
			const when = formatHistoricalDateFromPreview(selection) || legacyDate
			const subtitle = [volIssue, when].filter(Boolean).join(' · ')
			return {
				title: title || 'Untitled Article',
				subtitle,
			}
		},
	},
})
