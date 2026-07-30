import {TagIcon} from '@sanity/icons/Tag'
import {defineField, defineType} from 'sanity'
import {isUniqueStringField} from './lib/isUniqueStringField'

export const category = defineType({
  name: 'category',
  title: 'Subject Category',
  type: 'document',
  icon: TagIcon,
  description:
    'Themes for archive search and discovery (e.g. Schools, Railroads, Farms, Genealogy). Tag primary sources and historical images so related material can be filtered. Not the same as Property Type or Business Type—those classify a building or organisation entity.',
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
      description: 'Used by the CSV script to map old keyword tags to this category.',
      hidden: true,
      validation: (Rule) =>
        Rule.custom(
          isUniqueStringField('category', 'migrationKey', 'Migration mapping key must be unique'),
        ),
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
      subtitle: 'description',
    },
  },
})
