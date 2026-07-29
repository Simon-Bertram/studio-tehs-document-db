import {TagIcon} from '@sanity/icons/Tag'
import {defineField, defineType} from 'sanity'
import {isUniqueStringField} from './lib/isUniqueStringField'

export const category = defineType({
  name: 'category',
  title: 'Subject Category',
  type: 'document',
  icon: TagIcon,
  description:
    'Use for the broad topics and themes from your original subject lists and advanced-search dropdowns (e.g., Schools, Railroads, Farms). Tag historical images and primary sources with these so related material can be filtered and discovered.',
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
