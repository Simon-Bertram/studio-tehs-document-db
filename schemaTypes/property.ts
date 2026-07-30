import {HomeIcon} from '@sanity/icons/Home'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const property = defineType({
  name: 'property',
  title: 'Property / Building',
  type: 'document',
  icon: HomeIcon,
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
      description:
        'Building classification for this site (one type). Not a Subject Category—those are themes for tagging archive clippings and photos (e.g. Churches, Railroads), not for classifying properties.',
      options: {
        list: [
          {title: 'Dwelling / House', value: 'dwelling'},
          {title: 'Estate / Farm', value: 'estate'},
          {title: 'Church', value: 'church'},
          {title: 'Inn / Tavern', value: 'inn'},
          {title: 'Industrial', value: 'industrial'},
          {title: 'Institutional', value: 'institutional'},
          {title: 'Railroad / Station', value: 'railroad'},
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coordinates',
      title: 'Coordinates',
      type: 'geopoint',
      description: 'Pinpoint the exact location. (Powered by @sanity/google-maps-input)',
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
      name: 'location',
      title: 'Specific Location',
      type: 'reference',
      to: [{type: 'location'}],
      description:
        'When set, township is taken from this location. Use Township only when there is no more specific place. For Valley Forge sites, set Location to Valley Forge.',
    }),
    defineField({
      name: 'township',
      title: 'Township',
      type: 'reference',
      to: [{type: 'township'}],
      description: 'Only needed when no specific location is set.',
      hidden: ({document}) => Boolean(document?.location),
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
      name: 'relatedBusinesses',
      title: 'Related Businesses / Organisations',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'business'}],
        }),
      ],
      description:
        'Link the organisation or company that operated or occupied this site (e.g. Paoli Library, a fire company). Create the business document first if needed.',
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
  orderings: [
    {
      title: 'Name, A–Z',
      name: 'nameAsc',
      by: [{field: 'historicalName', direction: 'asc'}],
    },
    {
      title: 'Property type',
      name: 'typeAsc',
      by: [
        {field: 'propertyType', direction: 'asc'},
        {field: 'historicalName', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {
      title: 'historicalName',
      type: 'propertyType',
      parent: 'parentEstate.historicalName',
      location: 'location.name',
      township: 'township.name',
    },
    prepare(selection) {
      const {title, type, parent, location, township} = selection
      const parts = [
        type ? type.toUpperCase() : undefined,
        location || township,
        parent ? `Part of ${parent}` : undefined,
      ].filter(Boolean)

      return {
        title: title || 'Unnamed Property',
        subtitle: parts.join(' · '),
      }
    },
  },
})
