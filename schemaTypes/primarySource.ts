import {defineField, defineType} from 'sanity'

export const primarySource = defineType({
  name: 'primarySource',
  title: 'Primary Source',
  type: 'document',
  description:
    'STOP: Use this ONLY for transcribing a single, historical piece of media (like a newspaper ad or old letter). If you want to publish an essay or piece of modern research, use the Curated Essay type instead.',
  fields: [
    defineField({
      name: 'docId',
      title: 'Legacy Document ID (e.g., Doc505)',
      type: 'string',
    }),
    defineField({
      name: 'title',
      title: 'Headline / Subject Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Publication Date',
      type: 'date',
    }),
    defineField({
      name: 'newspaper',
      title: 'Source Publication Name',
      type: 'string',
    }),
    defineField({
      name: 'township',
      title: 'Township',
      type: 'reference',
      to: [{type: 'township'}],
    }),
    defineField({
      name: 'associatedProperty',
      title: 'Associated Property',
      type: 'reference',
      to: [{type: 'property'}],
    }),
    defineField({
      name: 'peopleMentioned',
      title: 'People Mentioned',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'person'}]}],
    }),
    defineField({
      name: 'isSheriffSale',
      title: "Is this a Sheriff's Sale?",
      type: 'boolean',
    }),
    defineField({
      name: 'legalWrit',
      title: 'Legal Writ Type',
      type: 'string',
      options: {
        list: ['Fieri Facias', 'Levari Facias', 'Venditioni Exponas'],
      },
      hidden: ({document}) => !document?.isSheriffSale,
    }),
    defineField({
      name: 'transcription',
      title: 'Full Transcription Text',
      type: 'text',
    }),
    defineField({
      name: 'articleImage',
      title: 'Scan of Clipping',
      type: 'image',
    }),
    defineField({
      name: 'categories',
      title: 'Associated Subjects',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'category'}]}],
    }),
    defineField({
      name: 'citations',
      title: 'Research References',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'quarterlyArticle'}]}],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'newspaper',
      media: 'articleImage',
    },
  },
})
