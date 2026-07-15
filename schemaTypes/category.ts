import {TagIcon} from '@sanity/icons/Tag'
import {defineField, defineType} from 'sanity'

export const category = defineType({
  name: 'category',
  title: 'Subject Category',
  type: 'document',
  icon: TagIcon,
  description:
    'Use for the broad topics and themes from your original subject lists and advanced-search dropdowns (e.g., Schools, Railroads, Farms). Tag historical images and primary sources with these so related material can be filtered and discovered.',
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
    defineField({
      name: 'legacyIdentifier',
      title: 'Legacy Database Keyword',
      type: 'string',
      // Only shows up if the logged-in user has the 'administrator' role
      hidden: ({currentUser}: {currentUser: {roles?: {name: string}[]} | null}) =>
        !currentUser?.roles?.some((role) => role.name === 'administrator'),
      description:
        'Don\'t use the hidden property at all right now. Instead, create a Field Group called "Migration Settings" and put the field there. It keeps the UI clean but accessible. Once your migration is 100% finished and the old database is offline, you simply go back into category.js and add hidden: true or readOnly: true to lock it away forever.',
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
