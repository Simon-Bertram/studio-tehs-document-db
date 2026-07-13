import {CaseIcon} from '@sanity/icons/Case'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const business = defineType({
  name: 'business',
  title: 'Historical Business',
  type: 'document',
  icon: CaseIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Business Name',
      type: 'string',
      description: 'e.g., H. & B.F. Bean’s Business, Valley Forge Silica, Sand and Ore Company',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'owners',
      title: 'Owners / Operators',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'person'}],
        }),
      ],
    }),
    defineField({
      name: 'locations',
      title: 'Place of Business',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'location'}, {type: 'property'}],
        }),
      ],
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
