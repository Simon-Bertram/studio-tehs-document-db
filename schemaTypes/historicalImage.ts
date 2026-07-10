import {defineArrayMember, defineField, defineType} from 'sanity'
import {isUniqueStringField} from './lib/isUniqueStringField'

export const historicalImage = defineType({
  name: 'historicalImage',
  title: 'Historical Image',
  type: 'document',
  fields: [
    defineField({
      name: 'identifier',
      title: 'Identifier (e.g., MF37)',
      type: 'string',
      validation: (Rule) =>
        Rule.custom(isUniqueStringField('historicalImage', 'identifier', 'Identifier must be unique')),
    }),
    defineField({
      name: 'serialNumber',
      title: 'Serial Number',
      type: 'string',
    }),
    defineField({
      name: 'title',
      title: 'Caption / Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'dateTaken',
      title: 'Date Taken (Textual or Exact)',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Full Description',
      type: 'text',
    }),
    defineField({
      name: 'imageFile',
      title: 'Photo File Upgrade',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'specificLocation',
      title: 'Specific Location',
      type: 'reference',
      to: [{type: 'location'}],
      description:
        'When set, township is taken from this location. Use the Township field only when there is no more specific place.',
    }),
    defineField({
      name: 'township',
      title: 'Township',
      type: 'reference',
      to: [{type: 'township'}],
      description: 'Only needed when no specific location is set.',
      hidden: ({document}) => Boolean(document?.specificLocation),
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
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
    }),
    defineField({
      name: 'contributor',
      title: 'Contributor',
      type: 'string',
    }),
    defineField({
      name: 'donation',
      title: 'Donation Metadata',
      type: 'string',
    }),
    defineField({
      name: 'photographer',
      title: 'Photographer / Artist',
      type: 'string',
    }),
    defineField({
      name: 'rights',
      title: 'Rights / Ownership',
      type: 'string',
    }),
    defineField({
      name: 'notes',
      title: 'Archivist Notes',
      type: 'text',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'identifier',
      media: 'imageFile',
    },
  },
})
