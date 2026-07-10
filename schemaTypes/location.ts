import {defineField, defineType} from 'sanity'

export const location = defineType({
  name: 'location',
  title: 'Specific Location / Village',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Location Name',
      type: 'string',
      description: 'e.g., Paoli, Cedar Hollow, Berwyn',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'township',
      title: 'Parent Township',
      type: 'reference',
      to: [{type: 'township'}],
      validation: (Rule) => Rule.required(),
    }),
  ],
})
