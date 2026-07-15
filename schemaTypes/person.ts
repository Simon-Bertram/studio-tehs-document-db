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
      name: 'born',
      title: 'Born',
      type: 'date',
      description: 'Optional. Use when the birth date is known.',
    }),
    defineField({
      name: 'died',
      title: 'Died',
      type: 'date',
      description: 'Optional. Use when the death date is known.',
      validation: (Rule) =>
        Rule.custom((died, context) => {
          const born = context.document?.born
          if (born && died && new Date(died) < new Date(born as string)) {
            return 'Died date must be on or after born date'
          }
          return true
        }),
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
    defineField({
      name: 'familyLines',
      title: 'Family Lineages',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'familyLine'}],
        }),
      ],
      description:
        'Tag this person to broader family groups (e.g., The Bean Family).',
    }),
    defineField({
      name: 'immediateRelatives',
      title: 'Known Immediate Relatives',
      type: 'array',
      description:
        'Log specific known relationships (Spouse, Parent, Child, Sibling).',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'immediateRelative',
          fields: [
            defineField({
              name: 'relative',
              title: 'Relative Profile',
              type: 'reference',
              to: [{type: 'person'}],
            }),
            defineField({
              name: 'relationshipType',
              title: 'Relationship to this person',
              type: 'string',
              options: {
                list: [
                  'Spouse',
                  'Parent',
                  'Child',
                  'Sibling',
                  'Cousin',
                  'Other',
                ],
              },
            }),
          ],
          preview: {
            select: {
              title: 'relative.firstName',
              lastName: 'relative.lastName',
              subtitle: 'relationshipType',
            },
            prepare({title, lastName, subtitle}) {
              return {
                title: [title, lastName].filter(Boolean).join(' ') || 'Unknown',
                subtitle,
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
