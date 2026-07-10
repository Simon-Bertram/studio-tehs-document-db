import {defineArrayMember, defineField, defineType} from 'sanity'
import {isUniqueStringField} from './lib/isUniqueStringField'

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
      validation: (Rule) =>
        Rule.custom(isUniqueStringField('primarySource', 'docId', 'Document ID must be unique')),
    }),
    defineField({
      name: 'title',
      title: 'Headline / Subject Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'dateText',
      title: 'Publication Date (Textual)',
      type: 'string',
      description: 'Use for uncertain or non-exact dates (e.g., "circa 1890", "Spring 1912").',
    }),
    defineField({
      name: 'date',
      title: 'Exact Publication Date',
      type: 'date',
      description: 'Optional. Use when the exact calendar date is known (helps sorting and filtering).',
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
      description:
        'Standalone township when no associated property is linked. Prefer linking a property when the place is known.',
      hidden: ({document}) => Boolean(document?.associatedProperty),
    }),
    defineField({
      name: 'associatedProperty',
      title: 'Associated Property',
      type: 'reference',
      to: [{type: 'property'}],
      description:
        'When set, prefer this over a standalone township. Add township/location on the property for geography.',
    }),
    defineField({
      name: 'peopleMentioned',
      title: 'People Mentioned',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'person'}],
        }),
      ],
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
      name: 'subjects',
      title: 'Subjects',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'category'}],
        }),
      ],
    }),
    defineField({
      name: 'citations',
      title: 'Research References',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'quarterlyArticle'}],
        }),
      ],
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
