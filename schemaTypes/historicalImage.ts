import {defineField, defineType} from 'sanity'

export const historicalImage = defineType({
  name: 'historicalImage',
  title: 'Historical Image',
  type: 'document',
  fields: [
    defineField({
      name: 'identifier',
      title: 'Identifier (e.g., MF37)',
      type: 'string',
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
      name: 'township',
      title: 'Township',
      type: 'reference',
      to: [{type: 'township'}],
    }),
    defineField({
      name: 'specificLocation',
      title: 'Specific Location',
      type: 'reference',
      to: [{type: 'location'}],
    }),
    defineField({
      name: 'subjects',
      title: 'Subjects',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'category'}]}],
    }),
    defineField({
      name: 'citations',
      title: 'Research References',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'quarterlyArticle'}]}],
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
