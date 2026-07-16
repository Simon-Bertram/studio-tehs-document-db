import {BookIcon} from '@sanity/icons/Book'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const quarterlyArticle = defineType({
  name: 'quarterlyArticle',
  title: 'TEHS Quarterly Article',
  type: 'document',
  icon: BookIcon,
  groups: [
    {name: 'publication', title: 'Publication Details', default: true},
    {name: 'content', title: 'Article Content'},
    {name: 'entities', title: 'Tagged Entities'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Article Title',
      type: 'string',
      group: 'publication',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'authorText',
      title: 'Author Name',
      type: 'string',
      group: 'publication',
      description: 'e.g., Mrs. E. H. TenBroeck',
    }),
    defineField({
      name: 'volume',
      title: 'Volume',
      type: 'number',
      group: 'publication',
    }),
    defineField({
      name: 'issue',
      title: 'Issue / Number',
      type: 'number',
      group: 'publication',
    }),
    defineField({
      name: 'publishedDate',
      title: 'Publication Date (Text)',
      type: 'string',
      group: 'publication',
      description: 'e.g., April 1968',
    }),
    defineField({
      name: 'startPage',
      title: 'Start Page',
      type: 'number',
      group: 'publication',
    }),
    defineField({
      name: 'body',
      title: 'Article Text',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({type: 'block'}),
        defineArrayMember({
          type: 'image',
          title: 'Inline Image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'caption',
              title: 'Caption',
              type: 'string',
            }),
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              description: 'Important for accessibility.',
            }),
          ],
        }),
        defineArrayMember({
          type: 'object',
          name: 'pageBreak',
          title: 'Original Print Page Break',
          fields: [
            defineField({
              name: 'pageNumber',
              title: 'Page Number',
              type: 'string',
              description: 'e.g., 3',
            }),
          ],
          preview: {
            select: {page: 'pageNumber'},
            prepare({page}) {
              return {title: `--- Page ${page} ---`}
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'propertiesMentioned',
      title: 'Properties / Historic Sites Mentioned',
      type: 'array',
      group: 'entities',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'property'}],
        }),
      ],
      description:
        'Link historic sites mentioned in the article for cross-site discovery.',
    }),
    defineField({
      name: 'peopleMentioned',
      title: 'Historical Figures Mentioned',
      type: 'array',
      group: 'entities',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'person'}],
        }),
      ],
    }),
  ],
  orderings: [
    {
      title: 'Start page',
      name: 'startPageAsc',
      by: [{field: 'startPage', direction: 'asc'}],
    },
    {
      title: 'Volume & issue',
      name: 'volumeIssueAsc',
      by: [
        {field: 'volume', direction: 'asc'},
        {field: 'issue', direction: 'asc'},
      ],
    },
    {
      title: 'Title, A–Z',
      name: 'titleAsc',
      by: [{field: 'title', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      volume: 'volume',
      issue: 'issue',
      date: 'publishedDate',
    },
    prepare({title, volume, issue, date}) {
      const volIssue = [volume != null && `Vol ${volume}`, issue != null && `No. ${issue}`]
        .filter(Boolean)
        .join(', ')
      const subtitle = [volIssue, date].filter(Boolean).join(' · ')
      return {
        title: title || 'Untitled Article',
        subtitle,
      }
    },
  },
})
