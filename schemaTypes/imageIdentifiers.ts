import {HashIcon} from '@sanity/icons/Hash'
import {defineField, defineType} from 'sanity'

import {isUniqueStringField} from './lib/isUniqueStringField'
import {truncatePreviewText} from './lib/truncatePreviewText'

export const imageIdentifier = defineType({
	name: 'imageIdentifier',
	title: 'Image Identifier',
	type: 'document',
	icon: HashIcon,
	description:
		'Letter-prefix stems for historical image Archive IDs (e.g. BE = Berwyn, BKH = Bake House). Full IDs are stem + number (e.g. BE232).',
	fields: [
		defineField({
			name: 'prefix',
			title: 'Letter Prefix',
			type: 'string',
			validation: (Rule) =>
				Rule.required().custom(
					isUniqueStringField('imageIdentifier', 'prefix', 'Letter prefix must be unique'),
				),
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
		}),
		defineField({
			name: 'migrationKey',
			title: 'Migration Mapping Key',
			type: 'string',
			description:
				'Used by the CSV script to map legacy identifierID values to this stem. Visible during migration; hide after cutover.',
			validation: (Rule) =>
				Rule.custom(
					isUniqueStringField(
						'imageIdentifier',
						'migrationKey',
						'Migration mapping key must be unique',
					),
				),
		}),
	],
	orderings: [
		{
			title: 'Prefix, A–Z',
			name: 'prefixAsc',
			by: [{field: 'prefix', direction: 'asc'}],
		},
	],
	preview: {
		select: {
			title: 'prefix',
			description: 'description',
		},
		prepare({title, description}) {
			return {
				title: title || 'Untitled identifier',
				subtitle: truncatePreviewText(description),
			}
		},
	},
})
