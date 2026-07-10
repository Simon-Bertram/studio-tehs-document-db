import {defineField, defineType} from 'sanity'

export const category = defineType({
  name: 'category',
  title: 'Subject Category',
  type: 'document',
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
  ],
})
