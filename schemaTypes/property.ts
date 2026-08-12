import {HomeIcon} from '@sanity/icons/Home'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {PinIcon} from '@sanity/icons/Pin'
import {SearchIcon} from '@sanity/icons/Search'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {locationReferenceFields} from './shared/locationFields'

export const property = defineType({
	name: 'property',
	title: 'Property / Building',
	type: 'document',
	icon: HomeIcon,
	groups: [
		{name: 'identity', title: 'Identity', icon: InfoOutlineIcon, default: true},
		{name: 'place', title: 'Place', icon: PinIcon},
		{name: 'research', title: 'Research', icon: SearchIcon},
	],
	fields: [
		defineField({
			name: 'historicalName',
			title: 'Historical Name',
			type: 'string',
			group: 'identity',
			description: 'e.g., Glenhardie Farm, Apple Tree House, Weedon Hall',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'propertyType',
			title: 'Property Type',
			type: 'string',
			group: 'identity',
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
			group: 'place',
			description: 'Pinpoint the exact location. (Powered by @sanity/google-maps-input)',
		}),
		defineField({
			name: 'parentEstate',
			title: 'Parent Estate / Land Tract',
			type: 'reference',
			group: 'place',
			to: [{type: 'property'}],
			description:
				'If this is a house inside a larger farm, link to the main estate here (e.g., Link "By-The-Creek" to "Glenhardie Farm").',
			hidden: ({document}) => document?.propertyType === 'estate',
		}),
		...locationReferenceFields({
			group: 'place',
			description:
				'When set, township is taken from this location. Use Township only when there is no more specific place. For Valley Forge sites, set Location to Valley Forge.',
		}),
		defineField({
			name: 'evolutionNotes',
			title: 'Structural Evolution & Origins',
			type: 'text',
			group: 'research',
			description:
				'Log what this building was adapted from (e.g., "Formerly a chicken coop", "Constructed from an old blacksmith shop").',
		}),
		defineField({
			name: 'notableResidents',
			title: 'Notable Residents / Owners',
			type: 'array',
			group: 'research',
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
			group: 'place',
		}),
		defineField({
			name: 'yearBuilt',
			title: 'Estimated Year Built / Converted',
			type: 'historicalDate',
			group: 'identity',
			description:
				'Usually year-only; use Circa when the year is approximate. Do not invent a day.',
		}),
		defineField({
			name: 'titleChain',
			title: 'Title Chain',
			type: 'array',
			group: 'research',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'deed'}],
				}),
			],
			description:
				'Ordered chain of title for this tract—link Deed / Land Instrument documents in chronological (or research) order.',
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
