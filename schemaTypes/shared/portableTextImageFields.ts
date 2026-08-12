import {ImageIcon} from '@sanity/icons/Image'
import {defineArrayMember, defineField} from 'sanity'

import {IMAGE_ROLE_VALUES, IMAGE_ROLES, type ImageRoleValue} from './imageRoles'

/**
 * Shared fields for Portable Text inline image blocks.
 */
export function portableTextImageFields() {
	return [
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
		options: {hotspot: true},
		fields: portableTextImageFields(),
	})
}
