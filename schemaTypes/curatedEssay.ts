import {defineField, defineType} from 'sanity'

export const curatedEssay = defineType({
  name: 'curatedEssay',
  title: 'Curated Essay',
  type: 'document',
  description:
    'Use this to publish long-form modern research, overviews, or interactive pages with maps and tables.',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
  ],
})
