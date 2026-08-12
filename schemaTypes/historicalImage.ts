import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {ClipboardIcon} from '@sanity/icons/Clipboard'
import {ImageIcon} from '@sanity/icons/Image'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {PinIcon} from '@sanity/icons/Pin'
import {SearchIcon} from '@sanity/icons/Search'
import {defineField, defineType} from 'sanity'

import {
	formatHistoricalDateFromPreview,
	historicalDatePreviewSelect,
} from './lib/historicalDatePreview'
import {archiveIdField} from './shared/archiveIdField'
import {citationsField} from './shared/citationsField'
import {locationReferenceFields} from './shared/locationFields'
import {organizationsField} from './shared/organizationsField'
import {subjectsField} from './shared/subjectsField'

export const historicalImage = defineType({
	name: 'historicalImage',
	title: 'Historical Image',
	type: 'document',
	icon: ImageIcon,
	groups: [
		{name: 'identity', title: 'Identity', icon: InfoOutlineIcon, default: true},
		{name: 'content', title: 'Content', icon: BlockElementIcon},
		{name: 'place', title: 'Place', icon: PinIcon},
		{name: 'provenance', title: 'Provenance', icon: ClipboardIcon},
		{name: 'research', title: 'Research', icon: SearchIcon},
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
			title: 'Date Taken',
			type: 'historicalDate',
			group: 'identity',
			description:
				'Prefer year-only when the exact day is unknown. Use Exact day only when the full calendar date is known.',
		}),
		defineField({
			name: 'dateTakenText',
			title: 'Date Taken (Legacy Text)',
			type: 'string',
			group: 'identity',
			deprecated: {
				reason: 'Use Date Taken (structured historical date) instead.',
			},
			readOnly: true,
			hidden: ({value}) => value === undefined,
			initialValue: undefined,
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
		...locationReferenceFields({group: 'place'}),
		defineField({
			name: 'coordinates',
			title: 'Coordinates',
			type: 'geopoint',
			group: 'place',
			description:
				'Pinpoint the exact place shown in the image. (Powered by @sanity/google-maps-input)',
		}),
		organizationsField('research'),
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
			title: 'Donation',
			type: 'reference',
			group: 'provenance',
			to: [{type: 'donation'}],
			description:
				'Link this image to its accession / gift record. If this photograph is part of a new donation, create the Donation first (The Archive → Donations, or Create new here): name, donor, acquisition date, and donation categories—then link it. Reuse an existing Donation when the image belongs to a gift already recorded.',
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
			title: 'Date taken (exact day)',
			name: 'dateTakenAsc',
			by: [{field: 'dateTaken.date', direction: 'asc'}],
		},
		{
			title: 'Date taken (year)',
			name: 'dateTakenYearAsc',
			by: [{field: 'dateTaken.year', direction: 'asc'}],
		},
	],
	preview: {
		select: {
			title: 'title',
			archiveId: 'archiveId',
			media: 'imageFile',
			legacyDate: 'dateTakenText',
			...historicalDatePreviewSelect('dateTaken'),
		},
		prepare(selection) {
			const {title, archiveId, media, legacyDate} = selection
			const when = formatHistoricalDateFromPreview(selection) || legacyDate
			const subtitle = [archiveId, when].filter(Boolean).join(' · ')
			return {
				title: title || 'Untitled image',
				subtitle,
				media,
			}
		},
	},
})
