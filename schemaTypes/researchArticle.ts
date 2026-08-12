import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {PinIcon} from '@sanity/icons/Pin'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {DocumentWithDescription} from './components/DocumentWithDescription'
import {archiveIdField} from './shared/archiveIdField'
import {organizationsField} from './shared/organizationsField'
import {portableTextImageMember} from './shared/portableTextImageFields'

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
		organizationsField('context'),
		defineField({
			name: 'body',
			title: 'Page Content & Layout Canvas',
			type: 'array',
			group: 'content',
			of: [
				defineArrayMember({type: 'block'}),
				portableTextImageMember({title: 'Uploaded Image'}),
				defineArrayMember({type: 'mapEmbed'}),
				defineArrayMember({type: 'internalSubLinks'}),
			],
		}),
	],
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
	],
	preview: {
		select: {
			title: 'title',
			archiveId: 'archiveId',
			slug: 'slug.current',
		},
		prepare({title, archiveId, slug}) {
			const subtitle = [archiveId, slug].filter(Boolean).join(' · ')
			return {
				title: title || 'Untitled research article',
				subtitle,
			}
		},
	},
})
