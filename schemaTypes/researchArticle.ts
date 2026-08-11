import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {ImageIcon} from '@sanity/icons/Image'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {PinIcon} from '@sanity/icons/Pin'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {DocumentWithDescription} from './components/DocumentWithDescription'
import {archiveIdField} from './shared/archiveIdField'
import {IMAGE_ROLE_VALUES, IMAGE_ROLES, type ImageRoleValue} from './shared/imageRoles'
import {organisationsField} from './shared/organisationsField'

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
			options: {source: 'title'},
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
		organisationsField('context'),
		defineField({
			name: 'body',
			title: 'Page Content & Layout Canvas',
			type: 'array',
			group: 'content',
			of: [
				defineArrayMember({type: 'block'}),
				defineArrayMember({
					type: 'image',
					title: 'Uploaded Image',
					icon: ImageIcon,
					options: {hotspot: true},
					fields: [
						defineField({
							name: 'caption',
							title: 'Caption',
							type: 'string',
						}),
						defineField({
							name: 'alt',
							title: 'Alt Text',
							type: 'string',
							description: 'Important for accessibility.',
							validation: (Rule) => Rule.required().warning('Alt text helps accessibility and SEO'),
						}),
						defineField({
							name: 'imageRole',
							title: 'Image Role',
							type: 'string',
							description:
								'Primary = main illustration; Supporting = secondary. The website decides layout.',
							options: {
								list: [...IMAGE_ROLES],
								layout: 'radio',
								direction: 'vertical',
							},
							initialValue: 'figure',
							validation: (Rule) =>
								Rule.required().custom((value) =>
									IMAGE_ROLE_VALUES.includes(value as ImageRoleValue)
										? true
										: 'Choose a valid image role',
								),
						}),
					],
				}),
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
