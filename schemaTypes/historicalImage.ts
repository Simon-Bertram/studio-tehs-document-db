import {BlockElementIcon} from '@sanity/icons/BlockElement'
import {ClipboardIcon} from '@sanity/icons/Clipboard'
import {ImageIcon} from '@sanity/icons/Image'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {LinkIcon} from '@sanity/icons/Link'
import {PinIcon} from '@sanity/icons/Pin'
import {SearchIcon} from '@sanity/icons/Search'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {
	formatHistoricalDateFromPreview,
	historicalDatePreviewSelect,
} from './lib/historicalDatePreview'
import {incomingReferenceArrayInitialValueBySource} from './lib/incoming-reference-array'
import {archiveIdField} from './shared/archiveIdField'
import {citationsField, HISTORICAL_IMAGE_CITATIONS_DESCRIPTION} from './shared/citationsField'
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
		archiveIdField('historicalImage', 'MF37', 'identity', {searchWeight: 10}),
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
			options: {
				search: {weight: 10},
			},
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
		defineField({
			name: 'people',
			title: 'People Depicted',
			type: 'array',
			group: 'content',
			description:
				'Historical persons shown in this photograph. Create or reuse a person under Taxonomies & Entities.',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'person'}],
				}),
			],
			validation: (Rule) => Rule.unique(),
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
		citationsField('research', HISTORICAL_IMAGE_CITATIONS_DESCRIPTION),
		defineField({
			name: 'references',
			title: 'References',
			type: 'array',
			group: 'research',
			description:
				'Bibliographic notes and web links that are not TEHS Quarterly articles in this Studio. Type the citation, select the title, and paste a URL to attach a link. Example: Sachse, The Wayside Inns on the Lancaster Roadside (1915, 2nd ed.); Julius Sachse biographical PDF. Digitized Quarterly pieces belong on Research References.',
			of: [
				defineArrayMember({
					type: 'block',
					styles: [{title: 'Normal', value: 'normal'}],
					lists: [{title: 'Bulleted list', value: 'bullet'}],
					marks: {
						decorators: [
							{title: 'Strong', value: 'strong'},
							{title: 'Italic', value: 'em'},
						],
						annotations: [
							{
								name: 'link',
								type: 'object',
								title: 'URL',
								icon: LinkIcon,
								fields: [
									defineField({
										name: 'href',
										title: 'URL',
										type: 'url',
										validation: (Rule) => Rule.uri({scheme: ['http', 'https']}),
									}),
								],
							},
						],
					},
				}),
			],
		}),
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
				'Link this image to its accession / gift record. If this photograph is part of a new donation, create the Donation first (The Archive → Donations) add the new donation to an existing category and link it here. Reuse an existing Donation when the image belongs to a gift already recorded.',
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
	initialValue: incomingReferenceArrayInitialValueBySource({
		person: 'people',
		category: 'subjects',
	}),
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
