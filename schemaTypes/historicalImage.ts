import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'
import {archiveIdField} from './shared/archiveIdField'
import {citationsField} from './shared/citationsField'
import {organisationsField} from './shared/organisationsField'
import {subjectsField} from './shared/subjectsField'
import {townshipWhenNoPlaceField} from './shared/townshipWhenNoPlaceField'

export const historicalImage = defineType({
	name: 'historicalImage',
	title: 'Historical Image',
	type: 'document',
	icon: ImageIcon,
	groups: [
		{name: 'identity', title: 'Identity', default: true},
		{name: 'content', title: 'Content'},
		{name: 'place', title: 'Place'},
		{name: 'provenance', title: 'Provenance / Rights'},
		{name: 'research', title: 'Research'},
	],
	fields: [
		archiveIdField('historicalImage', 'MF37', 'identity'),
		defineField({
			name: 'serialNumber',
			title: 'Serial Number',
			type: 'string',
			group: 'identity',
		}),
		defineField({
			name: 'title',
			title: 'Caption / Title',
			type: 'string',
			group: 'identity',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'dateTaken',
			title: 'Date Taken (Textual or Exact)',
			type: 'string',
			group: 'identity',
		}),
		defineField({
			name: 'imageFile',
			title: 'Photograph',
			type: 'image',
			group: 'content',
			options: {hotspot: true},
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'description',
			title: 'Full Description',
			type: 'text',
			group: 'content',
		}),
		defineField({
			name: 'specificLocation',
			title: 'Specific Location',
			type: 'reference',
			group: 'place',
			to: [{type: 'location'}],
			description:
				'When set, township is taken from this location. Use the Township field only when there is no more specific place.',
		}),
		townshipWhenNoPlaceField({
			hideWhenField: 'specificLocation',
			group: 'place',
			description: 'Only needed when no specific location is set.',
		}),
		organisationsField('research'),
		subjectsField('research'),
		citationsField('research'),
		defineField({
			name: 'source',
			title: 'Source',
			type: 'string',
			group: 'provenance',
		}),
		defineField({
			name: 'contributor',
			title: 'Contributor',
			type: 'string',
			group: 'provenance',
		}),
		defineField({
			name: 'donation',
			title: 'Donation Metadata',
			type: 'string',
			group: 'provenance',
		}),
		defineField({
			name: 'photographer',
			title: 'Photographer / Artist',
			type: 'string',
			group: 'provenance',
		}),
		defineField({
			name: 'rights',
			title: 'Rights / Ownership',
			type: 'string',
			group: 'provenance',
		}),
		defineField({
			name: 'notes',
			title: 'Archivist Notes',
			type: 'text',
			group: 'provenance',
		}),
	],
	orderings: [
		{
			title: 'Archive ID',
			name: 'archiveIdAsc',
			by: [{field: 'archiveId', direction: 'asc'}],
		},
		{
			title: 'Caption, A–Z',
			name: 'titleAsc',
			by: [{field: 'title', direction: 'asc'}],
		},
		{
			title: 'Date taken',
			name: 'dateTakenAsc',
			by: [{field: 'dateTaken', direction: 'asc'}],
		},
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'archiveId',
			media: 'imageFile',
		},
	},
})
