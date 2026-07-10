import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'township',
  title: 'Township',
  type: 'document',
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
    }),
  ],
})
