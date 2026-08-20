import {TagIcon} from '@sanity/icons/Tag'
import {createElement} from 'react'
import {defineArrayMember, defineField, defineType, type PreviewValue} from 'sanity'

import {CategoryPreview} from './components/CategoryPreview'
import {
	isUniqueMigrationMappingValue,
	migrationKeyMatchesOwnAlias,
	validateCategoryMigrationKeyAliases,
} from './lib/isUniqueMigrationMappingValue'
import {truncatePreviewText} from './lib/truncatePreviewText'

const uniqueMappingKey = isUniqueMigrationMappingValue(
	'category',
	'Migration mapping key must be unique',
)

export const category = defineType({
	name: 'category',
	title: 'Subject Category',
	type: 'document',
	icon: TagIcon,
	description:
		'Themes for archive search and discovery (e.g. Schools, Railroads, Farms, Genealogy). Tag primary sources and historical images so related material can be filtered. Not the same as Property Type (building classification) or a named Business or Organization document.',
	fields: [
		defineField({
			name: 'title',
			title: 'Category Title',
			type: 'string',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'description',
			title: 'Historical Context / Description',
			type: 'text',
		}),
		defineField({
			name: 'migrationKey',
			title: 'Migration Mapping Key',
			type: 'string',
			description:
				'Used by the CSV script to map old keyword tags to this category. Visible during migration; hide after cutover.',
			validation: (Rule) =>
				Rule.custom(async (value, context) => {
					if (migrationKeyMatchesOwnAlias(value, context.document?.migrationKeyAliases)) {
						return 'Migration Mapping Key cannot also be listed as an alias'
					}
					return uniqueMappingKey(value, context)
				}),
		}),
		defineField({
			name: 'migrationKeyAliases',
			title: 'Migration Key Aliases',
			type: 'array',
			of: [defineArrayMember({type: 'string'})],
			description:
				'Extra CSV spellings that should map to this category (e.g. Inn when the primary key is Inns). Match is case-insensitive, same as the primary key.',
			validation: (Rule) => Rule.custom(validateCategoryMigrationKeyAliases()),
		}),
	],
	orderings: [
		{
			title: 'Title, A–Z',
			name: 'titleAsc',
			by: [{field: 'title', direction: 'asc'}],
		},
	],
	preview: {
		select: {
			title: 'title',
			description: 'description',
			_id: '_id',
		},
		prepare({title, description, _id}): PreviewValue {
			return {
				title: title || 'Untitled category',
				subtitle: createElement(CategoryPreview, {
					documentId: _id,
					description: truncatePreviewText(description),
				}) as unknown as string,
			}
		},
	},
})
