import {ImageIcon} from '@sanity/icons/Image'
import {defineArrayMember, defineField} from 'sanity'

import {IMAGE_ROLE_VALUES, IMAGE_ROLES, type ImageRoleValue} from './imageRoles'

const UPLOAD_IMAGE_DESCRIPTION =
	'Prefer Historical Image when the photograph is already in ' +
	'The Archive → Historical Images. Upload here only if it is not ' +
	'in that collection. If it belongs in the archive, catalog it ' +
	'there first, then insert it from the collection.'

interface PortableTextImageFieldOptions {
	captionDescription?: string
	altDescription?: string
	requireAltWarning?: boolean
}

/**
 * Shared fields for Portable Text inline image blocks.
 */
export function portableTextImageFields(options?: PortableTextImageFieldOptions) {
	const requireAltWarning = options?.requireAltWarning ?? true

	return [
		defineField({
			name: 'caption',
			title: 'Caption',
			type: 'string',
			...(options?.captionDescription ? {description: options.captionDescription} : {}),
		}),
		defineField({
			name: 'alt',
			title: 'Alt Text',
			type: 'string',
			description: options?.altDescription ?? 'Important for accessibility.',
			...(requireAltWarning
				? {
						validation: (Rule) => Rule.required().warning('Alt text helps accessibility and SEO'),
					}
				: {}),
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
					IMAGE_ROLE_VALUES.includes(value as ImageRoleValue) ? true : 'Choose a valid image role',
				),
		}),
	]
}

/**
 * Shared Portable Text image array member (hotspot + caption/alt/imageRole).
 */
export function portableTextImageMember(options?: {title?: string}) {
	return defineArrayMember({
		type: 'image',
		title: options?.title ?? 'Uploaded Image',
		icon: ImageIcon,
		description: UPLOAD_IMAGE_DESCRIPTION,
		options: {hotspot: true},
		fields: portableTextImageFields(),
	})
}
