import {UserIcon} from '@sanity/icons/User'
import {defineField, defineType} from 'sanity'

export const familyLine = defineType({
  name: 'familyLine',
  title: 'Family / Lineage',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Family Name',
      type: 'string',
      description: 'e.g., The Bean Family, The Havard Family',
    }),
    defineField({
      name: 'description',
      title: 'Historical Background',
      type: 'text',
      description: 'A brief overview of the family’s origin or impact in the area.',
    }),
  ],
})
