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
      name: 'migrationKey',
      title: 'Migration Mapping Key',
      type: 'string',
      description: 'Used by the CSV script to map old MySQL records to this township.',
      hidden: true,
      validation: (Rule) =>
        Rule.custom(
          isUniqueStringField('township', 'migrationKey', 'Migration mapping key must be unique'),
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
    },
  },
})
