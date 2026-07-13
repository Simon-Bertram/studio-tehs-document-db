import {BookIcon} from '@sanity/icons/Book'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const curatedEssay = defineType({
  name: 'curatedEssay',
  title: 'Curated Essay',
  type: 'document',
  icon: BookIcon,
  description:
    'Use this to publish long-form modern research, overviews, or interactive pages with maps and tables.',
  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'townships',
      title: 'Townships',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'township'}],
        }),
      ],
    }),
    defineField({
      name: 'body',
      title: 'Page Content & Layout Canvas',
      type: 'array',
      of: [
        defineArrayMember({type: 'block'}),
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
        }),
        defineArrayMember({
          type: 'object',
          name: 'mapEmbed',
          title: 'Interactive Map Module',
          fields: [
            defineField({
              name: 'mapYear',
              title: 'Historical Map Target Year',
              type: 'string',
            }),
            defineField({
              name: 'mapUrl',
              title: 'Engine Application Embedded URL',
              type: 'url',
            }),
          ],
        }),
        defineArrayMember({
          type: 'object',
          name: 'internalSubLinks',
          title: 'Nested Navigation Portal Index',
          fields: [
            defineField({
              name: 'links',
              title: 'Links',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'reference',
                  to: [{type: 'curatedEssay'}],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ],
  orderings: [
    {
      title: 'Title, A–Z',
      name: 'titleAsc',
      by: [{field: 'title', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'slug.current',
    },
  },
})
