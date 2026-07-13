import {DocumentIcon} from '@sanity/icons/Document'
import {defineField, defineType} from 'sanity'

export const quarterlyArticle = defineType({
  name: 'quarterlyArticle',
  title: 'TEHS Quarterly Article',
  type: 'document',
  icon: DocumentIcon,
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
  orderings: [
    {
      title: 'Published date, newest',
      name: 'publishedDateDesc',
      by: [{field: 'publishedDate', direction: 'desc'}],
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
      author: 'author',
      volume: 'volume',
      issue: 'issue',
    },
    prepare({title, author, volume, issue}) {
      const volIssue = [volume && `Vol. ${volume}`, issue && `No. ${issue}`]
        .filter(Boolean)
        .join(', ')
      const subtitle = [author, volIssue].filter(Boolean).join(' · ')
      return {
        title: title || 'Untitled article',
        subtitle,
      }
    },
  },
})
