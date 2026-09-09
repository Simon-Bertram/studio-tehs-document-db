import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {BookIcon} from '@sanity/icons/Book'
import {CommentIcon} from '@sanity/icons/Comment'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {PinIcon} from '@sanity/icons/Pin'
import {SplitVerticalIcon} from '@sanity/icons/SplitVertical'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {isIncomingReferenceCreation} from 'sanity/structure'

import {DocumentWithDescription} from './components/DocumentWithDescription'
import {incomingReferenceArrayInitialValueBySource} from './lib/incoming-reference-array'
import {thenAndNowPortableTextMembers} from './objects/thenAndNowView'
import {featuredOnSiteFields} from './shared/featuredOnSiteFields'
import {internalCommentsField} from './shared/internalCommentsField'
import {notesAndReferencesField} from './shared/notesAndReferencesField'
import {organizationsField} from './shared/organizationsField'
import {peopleMentionedField} from './shared/peopleMentionedField'
import {propertiesMentionedField} from './shared/propertiesMentionedField'

const thenAndNowIncomingEntities = incomingReferenceArrayInitialValueBySource({
	business: 'organizations',
	organization: 'organizations',
	person: 'peopleMentioned',
	property: 'propertiesMentioned',
})

export const thenAndNow = defineType({
	name: 'thenAndNow',
	title: 'Then & Now',
	type: 'document',
	icon: SplitVerticalIcon,
	description:
		'Use this for a Then & Now feature: two photographs of the same landmark (historical and modern), each with commentary. It belongs to a Quarterly issue and also has its own public page. Use Research Article for long-form essays and TEHS Quarterly Article for digitized journal text.',
	components: {
		input: DocumentWithDescription,
	},
	groups: [
		{name: 'identity', title: 'Identity', icon: InfoOutlineIcon, default: true},
		{name: 'publication', title: 'Publication Details', icon: BookIcon},
		{name: 'content', title: 'Content', icon: BlockElementIcon},
		{name: 'context', title: 'Context', icon: PinIcon},
		{name: 'internal', title: 'Internal', icon: CommentIcon},
	],
	fields: [
		defineField({
			name: 'title',
			title: 'Page Title',
			type: 'string',
			group: 'identity',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'slug',
			title: 'URL Slug',
			type: 'slug',
			group: 'identity',
			options: {
				source: 'title',
				isUnique: (slug, context) => context.defaultIsUnique(slug, context),
			},
			validation: (Rule) => Rule.required(),
		}),
		...featuredOnSiteFields('identity', 'thenAndNow'),
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
			description: 'The printed TEHS Quarterly issue this Then & Now appeared in.',
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
			name: 'introduction',
			title: 'Introduction',
			type: 'array',
			group: 'content',
			description: 'Optional opening text that is not tied to either photograph.',
			of: thenAndNowPortableTextMembers(),
		}),
		defineField({
			name: 'then',
			title: 'Then',
			type: 'thenAndNowView',
			group: 'content',
			description: 'The historical photograph of this landmark, with commentary.',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'now',
			title: 'Now',
			type: 'thenAndNowView',
			group: 'content',
			description: 'The modern photograph of the same location, with commentary.',
			validation: (Rule) => Rule.required(),
		}),
		notesAndReferencesField('content'),
		defineField({
			name: 'townships',
			title: 'Townships',
			type: 'array',
			group: 'context',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'township'}],
				}),
			],
		}),
		peopleMentionedField('context'),
		propertiesMentionedField('context'),
		organizationsField('context'),
		internalCommentsField('internal'),
	],
	initialValue: (params, context) => {
		const defaults = {
			then: {source: 'historicalImage'},
			now: {source: 'upload'},
		}
		if (!isIncomingReferenceCreation(params)) return defaults
		if (params.from.type === 'quarterlyIssue') {
			return {...defaults, issueRef: params.reference}
		}
		return {
			...defaults,
			...thenAndNowIncomingEntities(params, context),
		}
	},
	orderings: [
		{
			title: 'Title, A–Z',
			name: 'titleAsc',
			by: [{field: 'title', direction: 'asc'}],
		},
		{
			title: 'Start page',
			name: 'startPageAsc',
			by: [{field: 'startPage', direction: 'asc'}],
		},
		{
			title: 'Featured order',
			name: 'featuredRankAsc',
			by: [
				{field: 'featuredRank', direction: 'asc'},
				{field: 'title', direction: 'asc'},
			],
		},
	],
	preview: {
		select: {
			title: 'title',
			volume: 'issueRef.volume',
			issueNumber: 'issueRef.issueNumber',
			startPage: 'startPage',
			endPage: 'endPage',
			slug: 'slug.current',
			featuredOnSite: 'featuredOnSite',
			featuredRank: 'featuredRank',
			thenCatalog: 'then.historicalImage.imageFile',
			thenUpload: 'then.image',
		},
		prepare({
			title,
			volume,
			issueNumber,
			startPage,
			endPage,
			slug,
			featuredOnSite,
			featuredRank,
			thenCatalog,
			thenUpload,
		}) {
			const featured =
				featuredOnSite === true
					? featuredRank
						? `Featured · ${featuredRank}`
						: 'Featured'
					: undefined
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
			const subtitle = [featured, volIssue, pages, slug].filter(Boolean).join(' · ')
			return {
				title: title || 'Untitled Then & Now',
				subtitle,
				media: thenCatalog || thenUpload,
			}
		},
	},
})
