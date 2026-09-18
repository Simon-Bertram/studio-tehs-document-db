import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {defineField, defineType} from 'sanity'

import {DocumentWithDescription} from './components/DocumentWithDescription'
import {sitePageBodyMembers} from './shared/sitePageBody'

export const sitePage = defineType({
	name: 'sitePage',
	title: 'Site page',
	type: 'document',
	icon: DocumentTextIcon,
	description:
		'A public Society page (About, Membership copy, Donate, Archives, Collecting Policy, store shipping notes, Publications intro). Not for research essays — use Research Article. Not for meetings — use Society Event.',
	components: {
		input: DocumentWithDescription,
	},
	fields: [
		defineField({
			name: 'title',
			title: 'Page title',
			type: 'string',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'slug',
			title: 'URL slug',
			type: 'slug',
			options: {source: 'title'},
			validation: (Rule) => Rule.required(),
			description:
				'Public path without slash (about, membership, support, archives, store, publications, signup).',
		}),
		defineField({
			name: 'body',
			title: 'Page content',
			type: 'array',
			of: sitePageBodyMembers,
			validation: (Rule) => Rule.required().min(1),
		}),
		defineField({
			name: 'files',
			title: 'Downloadable files',
			type: 'array',
			of: [
				{
					type: 'file',
					fields: [
						defineField({
							name: 'label',
							title: 'Label',
							type: 'string',
							description: 'e.g. Membership application, Collecting policy.',
						}),
					],
				},
			],
			description: 'Optional PDFs (application form, archives catalogue, finding aids).',
		}),
	],
	preview: {
		select: {title: 'title', slug: 'slug.current'},
		prepare({title, slug}) {
			return {
				title: title || 'Untitled page',
				subtitle: slug ? `/${slug}` : 'Missing slug',
			}
		},
	},
})
