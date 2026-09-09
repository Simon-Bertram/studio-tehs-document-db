import {ImageIcon} from '@sanity/icons/Image'
import {LinkIcon} from '@sanity/icons/Link'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {
	THEN_AND_NOW_SOURCES,
	type ThenAndNowViewValue,
	validateTakenYear,
	validateThenAndNowHistoricalImage,
	validateThenAndNowSource,
	validateThenAndNowUpload,
	validateThenAndNowViewPhoto,
	warnThenAndNowViewAlt,
} from '../lib/thenAndNowValidation'

/**
 * Portable Text for Then & Now commentary and introduction (blocks and links only).
 */
export function thenAndNowPortableTextMembers() {
	return [
		defineArrayMember({
			type: 'block',
			styles: [
				{title: 'Normal', value: 'normal'},
				{title: 'Heading 2', value: 'h2'},
				{title: 'Heading 3', value: 'h3'},
			],
			lists: [{title: 'Bulleted list', value: 'bullet'}],
			marks: {
				decorators: [
					{title: 'Strong', value: 'strong'},
					{title: 'Italic', value: 'em'},
				],
				annotations: [
					{
						name: 'link',
						type: 'object',
						title: 'URL',
						icon: LinkIcon,
						fields: [
							defineField({
								name: 'href',
								title: 'URL',
								type: 'url',
								validation: (Rule) => Rule.uri({scheme: ['http', 'https']}),
							}),
						],
					},
				],
			},
		}),
	]
}

/**
 * One side of a Then & Now comparison: a cataloged or uploaded photograph plus commentary.
 */
export const thenAndNowView = defineType({
	name: 'thenAndNowView',
	title: 'Photograph & commentary',
	type: 'object',
	icon: ImageIcon,
	fields: [
		defineField({
			name: 'source',
			title: 'Photograph source',
			type: 'string',
			description:
				'Prefer Historical Image when the photograph is already in The Archive → Historical Images. Upload only if it is not in that collection.',
			options: {
				list: [...THEN_AND_NOW_SOURCES],
				layout: 'radio',
				direction: 'vertical',
			},
			validation: (Rule) => Rule.required().custom((value) => validateThenAndNowSource(value)),
		}),
		defineField({
			name: 'historicalImage',
			title: 'Historical Image',
			type: 'reference',
			to: [{type: 'historicalImage'}],
			description:
				'Choose a cataloged photograph from The Archive → Historical Images. Search by caption, title, or Archive ID.',
			options: {
				disableNew: true,
			},
			hidden: ({parent}) => parent?.source !== 'historicalImage',
			validation: (Rule) =>
				Rule.custom((value, context) =>
					validateThenAndNowHistoricalImage(
						value as {_ref?: string} | undefined,
						context.parent as ThenAndNowViewValue | undefined,
					),
				),
		}),
		defineField({
			name: 'image',
			title: 'Uploaded photograph',
			type: 'image',
			description:
				'Upload here only if the photograph is not in The Archive → Historical Images. If it belongs in the archive, catalog it there first, then choose Historical Image.',
			options: {hotspot: true},
			hidden: ({parent}) => parent?.source !== 'upload',
			validation: (Rule) =>
				Rule.custom((value, context) =>
					validateThenAndNowUpload(
						value as {asset?: {_ref?: string}} | undefined,
						context.parent as ThenAndNowViewValue | undefined,
					),
				),
		}),
		defineField({
			name: 'takenYear',
			title: 'Year Taken',
			type: 'number',
			description:
				'Year the photograph was taken when it is not a cataloged Historical Image. Leave blank if unknown.',
			hidden: ({parent}) => parent?.source !== 'upload',
			validation: (Rule) => Rule.custom((value) => validateTakenYear(value)),
		}),
		defineField({
			name: 'caption',
			title: 'Caption',
			type: 'string',
			description: 'Leave blank to use the catalog caption when the source is a Historical Image.',
		}),
		defineField({
			name: 'alt',
			title: 'Alt Text',
			type: 'string',
			description:
				'Leave blank to use the catalog caption when the source is a Historical Image. Add alt text for uploaded photographs.',
			validation: (Rule) =>
				Rule.custom((value, context) =>
					warnThenAndNowViewAlt(
						value as string | undefined,
						context.parent as ThenAndNowViewValue | undefined,
					),
				).warning(),
		}),
		defineField({
			name: 'commentary',
			title: 'Commentary',
			type: 'array',
			description: 'Published notes for this photograph. The website decides layout.',
			of: thenAndNowPortableTextMembers(),
		}),
	],
	validation: (Rule) =>
		Rule.custom((value) => validateThenAndNowViewPhoto(value as ThenAndNowViewValue | undefined)),
	preview: {
		select: {
			source: 'source',
			catalogTitle: 'historicalImage.title',
			archiveId: 'historicalImage.archiveId',
			catalogMedia: 'historicalImage.imageFile',
			uploadMedia: 'image',
			caption: 'caption',
			takenYear: 'takenYear',
		},
		prepare({source, catalogTitle, archiveId, catalogMedia, uploadMedia, caption, takenYear}) {
			const isUpload = source === 'upload'
			const title = caption || catalogTitle || (isUpload ? 'Uploaded photograph' : 'Photograph')
			const sourceLabel = isUpload ? 'Uploaded' : archiveId || 'Historical Image'
			const subtitle = [sourceLabel, takenYear].filter(Boolean).join(' · ')
			return {
				title,
				subtitle,
				media: isUpload ? uploadMedia : catalogMedia,
			}
		},
	},
})
