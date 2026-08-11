import {LinkIcon} from '@sanity/icons/Link'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const internalSubLinks = defineType({
	name: 'internalSubLinks',
	title: 'Nested Navigation Portal Index',
	type: 'object',
	icon: LinkIcon,
	fields: [
		defineField({
			name: 'links',
			title: 'Links',
			type: 'array',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'researchArticle'}],
				}),
			],
		}),
	],
	preview: {
		select: {
			link0: 'links.0.title',
			link1: 'links.1.title',
			link2: 'links.2.title',
			link3: 'links.3.title',
		},
		prepare({link0, link1, link2, link3}) {
			const titles = [link0, link1, link2].filter(Boolean)
			const hasMore = Boolean(link3)
			const countLabel =
				titles.length === 0
					? 'No links'
					: hasMore
						? `${titles.length}+ links`
						: `${titles.length} link${titles.length === 1 ? '' : 's'}`
			return {
				title: 'Navigation links',
				subtitle: titles.length > 0 ? `${countLabel}: ${titles.join(', ')}` : countLabel,
			}
		},
	},
})
