import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {BookIcon} from '@sanity/icons/Book'
import {CommentIcon} from '@sanity/icons/Comment'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {TagIcon} from '@sanity/icons/Tag'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {isIncomingReferenceCreation} from 'sanity/structure'

import {incomingReferenceArrayInitialValueBySource} from './lib/incoming-reference-array'
import {isUniqueStringField} from './lib/isUniqueStringField'
import {internalCommentsField} from './shared/internalCommentsField'
import {notesAndReferencesField} from './shared/notesAndReferencesField'
import {organizationsField} from './shared/organizationsField'
import {peopleMentionedField} from './shared/peopleMentionedField'
import {portableTextImageMember} from './shared/portableTextImageFields'
import {propertiesMentionedField} from './shared/propertiesMentionedField'
import {subjectsField} from './shared/subjectsField'

export const quarterlyArticle = defineType({
	name: 'quarterlyArticle',
	title: 'TEHS Quarterly Article',
	type: 'document',
	icon: BookIcon,
	groups: [
		{name: 'publication', title: 'Publication Details', icon: InfoOutlineIcon, default: true},
		{name: 'content', title: 'Article Content', icon: BlockElementIcon},
		{name: 'entities', title: 'Tagged Entities', icon: TagIcon},
		{name: 'internal', title: 'Internal', icon: CommentIcon},
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
			name: 'issueRef',
			title: 'Issue',
			type: 'reference',
			group: 'publication',
			to: [{type: 'quarterlyIssue'}],
			description: 'The printed TEHS Quarterly issue this article appeared in.',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'startPage',
			title: 'Start Page',
			type: 'number',
			group: 'publication',
		}),
		defineField({
			name: 'endPage',
			title: 'End Page',
			type: 'number',
			group: 'publication',
			description: 'Last printed page when known. Leave empty if only the start page is recorded.',
			validation: (Rule) =>
				Rule.custom((endPage, context) => {
					const startPage = context.document?.startPage
					if (endPage == null || typeof startPage !== 'number') return true
					if (typeof endPage !== 'number') return true
					if (endPage < startPage) return 'End page must be on or after the start page'
					return true
				}),
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
			name: 'summary',
			title: 'Summary / Abstract',
			type: 'text',
			group: 'content',
			description: 'Optional short abstract for search and issue indexes.',
		}),
		defineField({
			name: 'body',
			title: 'Article Text',
			type: 'array',
			group: 'content',
			of: [
				defineArrayMember({type: 'block'}),
				defineArrayMember({type: 'historicalImageEmbed'}),
				portableTextImageMember({title: 'Inline Image'}),
				defineArrayMember({type: 'pageBreak'}),
			],
		}),
		notesAndReferencesField('content'),
		internalCommentsField('internal'),
		subjectsField('entities'),
		propertiesMentionedField('entities'),
		peopleMentionedField('entities'),
		organizationsField('entities'),
	],
	initialValue: (params, context) => {
		if (!isIncomingReferenceCreation(params)) return {}
		if (params.from.type === 'quarterlyIssue') {
			return {issueRef: params.reference}
		}
		return incomingReferenceArrayInitialValueBySource({
			category: 'subjects',
			business: 'organizations',
			organization: 'organizations',
			person: 'peopleMentioned',
			property: 'propertiesMentioned',
		})(params, context)
	},
	orderings: [
		{
			title: 'Start page',
			name: 'startPageAsc',
			by: [{field: 'startPage', direction: 'asc'}],
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
			volume: 'issueRef.volume',
			issueNumber: 'issueRef.issueNumber',
			startPage: 'startPage',
			endPage: 'endPage',
		},
		prepare({title, volume, issueNumber, startPage, endPage}) {
			const volIssue = [
				volume != null && `Vol. ${volume}`,
				issueNumber != null && `No. ${issueNumber}`,
			]
				.filter(Boolean)
				.join(', ')
			let pages = ''
			if (startPage != null) {
				pages =
					endPage != null && endPage !== startPage
						? `pp. ${startPage}–${endPage}`
						: `p. ${startPage}`
			}
			const subtitle = [volIssue, pages].filter(Boolean).join(' · ')
			return {
				title: title || 'Untitled Article',
				subtitle,
			}
		},
	},
})
