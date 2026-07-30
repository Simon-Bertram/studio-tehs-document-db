import {BookIcon} from '@sanity/icons/Book'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {archiveIdField} from './shared/archiveIdField'

export const curatedEssay = defineType({
	name: 'curatedEssay',
	title: 'Curated Essay',
	type: 'document',
	icon: BookIcon,
	description:
		'Use this to publish long-form modern research, overviews, or interactive pages with maps and tables.',
	fields: [
		archiveIdField(
			'curatedEssay',
			'matching a CSV clipID from Book imports',
		),
		defineField({
			name: 'title',
			title: 'Page Title',
			type: 'string',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'slug',
			title: 'URL Slug',
			type: 'slug',
			options: {source: 'title'},
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'townships',
			title: 'Townships',
			type: 'array',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'township'}],
				}),
			],
		}),
		defineField({
			name: 'body',
			title: 'Page Content & Layout Canvas',
			type: 'array',
			of: [
				defineArrayMember({type: 'block'}),
				defineArrayMember({
					type: 'image',
					title: 'Uploaded Image',
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
						}),
						defineField({
							name: 'imageRole',
							title: 'Image Role',
							type: 'string',
							description:
								'Semantic role for the image in the essay (not CSS layout). Frontends map these to presentation.',
							options: {
								list: [
									{title: 'Figure (primary illustration)', value: 'figure'},
									{title: 'Aside (supporting, start side)', value: 'asideStart'},
									{title: 'Aside (supporting, end side)', value: 'asideEnd'},
								],
								layout: 'radio',
							},
							initialValue: 'figure',
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
				title: title || 'Untitled essay',
				subtitle,
			}
		},
	},
})
