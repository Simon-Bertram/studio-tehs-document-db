import {LinkIcon} from '@sanity/icons/Link'
import {defineField, defineType} from 'sanity'

import {isSitePath} from '../lib/siteNavigationValidation'

export const navLink = defineType({
	name: 'navLink',
	title: 'Navigation link',
	type: 'object',
	icon: LinkIcon,
	fields: [
		defineField({
			name: 'label',
			title: 'Label',
			type: 'string',
			description: 'Public text in the menu.',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'href',
			title: 'Path',
			type: 'string',
			description: 'Site path starting with / (for example /images). Not a full URL.',
			validation: (Rule) =>
				Rule.required().custom((href) => {
					if (isSitePath(href)) return true
					return 'Use a path that starts with / (for example /quarterly). Do not paste a full URL.'
				}),
		}),
		defineField({
			name: 'kind',
			title: 'Kind',
			type: 'string',
			description:
				'Page is a text link. Search is the header search control; the path is still the results URL.',
			options: {
				list: [
					{title: 'Page', value: 'page'},
					{title: 'Search', value: 'search'},
				],
				layout: 'radio',
			},
			initialValue: 'page',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'purpose',
			title: 'Purpose (Studio only)',
			type: 'text',
			rows: 2,
			description: 'Hint for editors. Not shown on the public site.',
		}),
	],
	preview: {
		select: {
			label: 'label',
			href: 'href',
			kind: 'kind',
		},
		prepare({label, href, kind}) {
			const kindLabel = kind === 'search' ? 'Search' : 'Page'
			return {
				title: label || 'Untitled link',
				subtitle: [kindLabel, href].filter(Boolean).join(' · '),
			}
		},
	},
})
