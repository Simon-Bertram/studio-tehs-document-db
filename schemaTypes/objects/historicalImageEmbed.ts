import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'

import {portableTextImageFields} from '../shared/portableTextImageFields'

/**
 * Portable Text block that links an article to a cataloged Historical Image.
 */
export const historicalImageEmbed = defineType({
	name: 'historicalImageEmbed',
	title: 'Historical Image',
	type: 'object',
	icon: ImageIcon,
	fields: [
		defineField({
			name: 'historicalImage',
			title: 'Historical Image',
			type: 'reference',
			to: [{type: 'historicalImage'}],
			description:
				'Choose a cataloged photograph from The Archive → ' +
				'Historical Images. Search by caption, title, or Archive ID.',
			options: {
				disableNew: true,
			},
			validation: (Rule) => Rule.required(),
		}),
		...portableTextImageFields({
			captionDescription: 'Leave blank to use the catalog caption.',
			altDescription:
				'Leave blank to use the catalog caption. Add alt text if ' +
				'you need a different description for accessibility.',
			requireAltWarning: false,
		}),
	],
	preview: {
		select: {
			catalogTitle: 'historicalImage.title',
			archiveId: 'historicalImage.archiveId',
			media: 'historicalImage.imageFile',
			caption: 'caption',
		},
		prepare({catalogTitle, archiveId, media, caption}) {
			return {
				title: caption || catalogTitle || 'Historical image',
				subtitle: archiveId || undefined,
				media,
			}
		},
	},
})
