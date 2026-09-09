import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {CommentIcon} from '@sanity/icons/Comment'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {PinIcon} from '@sanity/icons/Pin'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {DocumentWithDescription} from './components/DocumentWithDescription'
import {incomingReferenceArrayInitialValueBySource} from './lib/incoming-reference-array'
import {archiveIdField} from './shared/archiveIdField'
import {featuredOnSiteFields} from './shared/featuredOnSiteFields'
import {internalCommentsField} from './shared/internalCommentsField'
import {notesAndReferencesField} from './shared/notesAndReferencesField'
import {organizationsField} from './shared/organizationsField'
import {peopleMentionedField} from './shared/peopleMentionedField'
import {portableTextImageMember} from './shared/portableTextImageFields'
import {propertiesMentionedField} from './shared/propertiesMentionedField'

export const researchArticle = defineType({
	name: 'researchArticle',
	title: 'Research Article',
	type: 'document',
	icon: DocumentTextIcon,
	description:
		'Use this to publish long-form modern research articles, overviews, or interactive pages with maps and tables.',
	components: {
		input: DocumentWithDescription,
	},
	groups: [
		{name: 'identity', title: 'Identity', icon: InfoOutlineIcon, default: true},
		{name: 'content', title: 'Content', icon: BlockElementIcon},
		{name: 'context', title: 'Context', icon: PinIcon},
		{name: 'internal', title: 'Internal', icon: CommentIcon},
	],
	fields: [
		archiveIdField('researchArticle', 'matching a CSV clipID from Book imports', 'identity'),
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
				// Default Sanity behavior: unique per document type; keep explicit for clarity.
				isUnique: (slug, context) => context.defaultIsUnique(slug, context),
			},
			validation: (Rule) => Rule.required(),
		}),
		...featuredOnSiteFields('identity', 'researchArticle'),
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
		defineField({
			name: 'body',
			title: 'Page Content & Layout Canvas',
			type: 'array',
			group: 'content',
			of: [
				defineArrayMember({type: 'block'}),
				defineArrayMember({type: 'historicalImageEmbed'}),
				portableTextImageMember({title: 'Uploaded Image'}),
				defineArrayMember({type: 'mapEmbed'}),
				defineArrayMember({type: 'internalSubLinks'}),
			],
		}),
		notesAndReferencesField('content'),
		internalCommentsField('internal'),
	],
	initialValue: incomingReferenceArrayInitialValueBySource({
		business: 'organizations',
		organization: 'organizations',
		person: 'peopleMentioned',
		property: 'propertiesMentioned',
	}),
	orderings: [
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
			archiveId: 'archiveId',
			slug: 'slug.current',
			featuredOnSite: 'featuredOnSite',
			featuredRank: 'featuredRank',
		},
		prepare({title, archiveId, slug, featuredOnSite, featuredRank}) {
			const featured =
				featuredOnSite === true
					? featuredRank
						? `Featured · ${featuredRank}`
						: 'Featured'
					: undefined
			const subtitle = [featured, archiveId, slug].filter(Boolean).join(' · ')
			return {
				title: title || 'Untitled research article',
				subtitle,
			}
		},
	},
})
