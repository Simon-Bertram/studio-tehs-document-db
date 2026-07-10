import {defineField, defineType} from 'sanity'

export const quarterlyArticle = defineType({
  title: 'TEHS Quarterly Article',
  type: 'document',
  name: 'quarterlyArticle',
  fields: [
    defineField({
      name: 'title',
      title: 'Article Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
    }),
    defineField({
      name: 'volume',
      title: 'Volume Number',
      type: 'string',
    }),
    defineField({
      name: 'issue',
      title: 'Issue Number',
      type: 'string',
    }),
    defineField({
      name: 'publishedDate',
      title: 'Date Published',
      type: 'date',
    }),
  ],
})
