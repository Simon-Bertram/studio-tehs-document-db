import {defineField, defineType} from 'sanity'

export default defineType({
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
