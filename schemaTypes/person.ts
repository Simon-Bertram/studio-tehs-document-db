import {UserIcon} from '@sanity/icons/User'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const person = defineType({
  name: 'person',
  title: 'Historical Person',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'prefix',
      title: 'Title / Prefix',
      type: 'string',
      description: 'e.g., Capt., Rev., Dr., Justice',
    }),
    defineField({
      name: 'firstName',
      title: 'First Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lastName',
      title: 'Last Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'suffix',
      title: 'Suffix',
      type: 'string',
      description: 'e.g., Jr., Sr., III, Deceased',
    }),
    defineField({
      name: 'alternateSpellings',
      title: 'Alternate Spellings / Aliases',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      description: 'Add historical spelling variants found in records (e.g., Christman, Chrisman).',
    }),
    defineField({
      name: 'censusAppearances',
      title: 'Census / Occupation Records',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'censusRecord',
          fields: [
            defineField({
              name: 'year',
              title: 'Census Year',
              type: 'number',
            }),
            defineField({
              name: 'occupation',
              title: 'Recorded Occupation',
              type: 'string',
            }),
          ],
          preview: {
            select: {
              title: 'occupation',
              subtitle: 'year',
            },
            prepare({title, subtitle}) {
              return {
                title: title || 'Occupation unknown',
                subtitle: subtitle ? String(subtitle) : undefined,
              }
            },
          },
        }),
      ],
    }),
  ],
  orderings: [
    {
      title: 'Last name, A–Z',
      name: 'lastNameAsc',
      by: [
        {field: 'lastName', direction: 'asc'},
        {field: 'firstName', direction: 'asc'},
      ],
    },
    {
      title: 'First name, A–Z',
      name: 'firstNameAsc',
      by: [
        {field: 'firstName', direction: 'asc'},
        {field: 'lastName', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {
      prefix: 'prefix',
      first: 'firstName',
      last: 'lastName',
      suffix: 'suffix',
    },
    prepare(selection) {
      const {prefix, first, last, suffix} = selection
      const title = [prefix, first, last, suffix].filter(Boolean).join(' ')
      return {
        title: title || 'Unnamed Person',
      }
    },
  },
})
