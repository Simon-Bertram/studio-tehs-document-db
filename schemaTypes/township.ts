import {PinIcon} from '@sanity/icons/Pin'
import {defineField, defineType} from 'sanity'
import {isUniqueStringField} from './lib/isUniqueStringField'

export const township = defineType({
  name: 'township',
  title: 'Township',
  type: 'document',
  icon: PinIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Township Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'legacyKeyword',
      title: 'Legacy Keyword',
      type: 'string',
      description: 'e.g., Cclip, used for mapping old MySQL records.',
      validation: (Rule) =>
        Rule.custom(
          isUniqueStringField('township', 'legacyKeyword', 'Legacy keyword must be unique'),
        ),
    }),
  ],
  orderings: [
    {
      title: 'Name, A–Z',
      name: 'nameAsc',
      by: [{field: 'name', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'legacyKeyword',
    },
  },
})
