import {TagIcon} from '@sanity/icons/Tag'
import {defineField, defineType} from 'sanity'

export const category = defineType({
  name: 'category',
  title: 'Subject Category',
  type: 'document',
  icon: TagIcon,
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
      subtitle: 'description',
    },
  },
})
