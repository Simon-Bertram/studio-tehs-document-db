import {TagIcon} from '@sanity/icons/Tag'
import {defineArrayMember, defineField, defineType} from 'sanity'

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
		'Themes for archive search and discovery (e.g. Schools, Railroads, Farms, Genealogy). Tag primary sources and historical images so related material can be filtered. Not the same as Property Type or Organization type—those classify a building or organization entity.',
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
		},
		prepare({title, description}) {
			return {
				title: title || 'Untitled category',
				subtitle: truncatePreviewText(description),
			}
		},
	},
})
