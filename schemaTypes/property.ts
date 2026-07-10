import {defineArrayMember, defineField, defineType} from 'sanity'

export const property = defineType({
  name: 'property',
  title: 'Property / Building',
  type: 'document',
  fields: [
    defineField({
      name: 'historicalName',
      title: 'Historical Name',
      type: 'string',
      description: 'e.g., Glenhardie Farm, Apple Tree House, Weedon Hall',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'propertyType',
      title: 'Property Type',
      type: 'string',
      options: {
        list: [
          {title: 'Estate / Large Farm', value: 'estate'},
          {title: 'Dwelling House / Tenant House', value: 'dwelling'},
          {title: 'Outbuilding / Barn / Shop', value: 'outbuilding'},
          {title: 'Subdivision Lot', value: 'subdivisionLot'},
        ],
      },
    }),
    defineField({
      name: 'parentEstate',
      title: 'Parent Estate / Land Tract',
      type: 'reference',
      to: [{type: 'property'}],
      description:
        'If this is a house inside a larger farm, link to the main estate here (e.g., Link "By-The-Creek" to "Glenhardie Farm").',
      hidden: ({document}) => document?.propertyType === 'estate',
    }),
    defineField({
      name: 'evolutionNotes',
      title: 'Structural Evolution & Origins',
      type: 'text',
      description:
        'Log what this building was adapted from (e.g., "Formerly a chicken coop", "Constructed from an old blacksmith shop").',
    }),
    defineField({
      name: 'notableResidents',
      title: 'Notable Residents / Owners',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'person'}],
        }),
      ],
      description:
        'Link to profile cards for John R.K. Scott, Harold B. Stassen, Norm Van Brocklin, etc.',
    }),
    defineField({
      name: 'modernAddress',
      title: 'Modern Address',
      type: 'string',
    }),
    defineField({
      name: 'yearBuilt',
      title: 'Estimated Year Built / Converted',
      type: 'string',
    }),
    defineField({
      name: 'deedCitations',
      title: 'Chester County Deed Book References',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      description: 'e.g., "U15 P466", "P15 P25"',
    }),
  ],
  preview: {
    select: {
      title: 'historicalName',
      type: 'propertyType',
      parent: 'parentEstate.historicalName',
    },
    prepare(selection) {
      const {title, type, parent} = selection
      let subtitle = type ? type.toUpperCase() : ''
      if (parent) subtitle += ` (Part of ${parent})`

      return {
        title: title || 'Unnamed Property',
        subtitle,
      }
    },
  },
})
