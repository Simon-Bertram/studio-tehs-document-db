import {BasketIcon} from '@sanity/icons/Basket'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {TagsIcon} from '@sanity/icons/Tags'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {
	formatHistoricalDateFromPreview,
	historicalDatePreviewSelect,
} from './lib/historicalDatePreview'
import {incomingReferenceArrayInitialValue} from './lib/incoming-reference-array'
import {isUniqueNumberField} from './lib/isUniqueNumberField'

export const donation = defineType({
	name: 'donation',
	title: 'Donation',
	type: 'document',
	icon: BasketIcon,
	groups: [
		{name: 'identity', title: 'Identity', icon: InfoOutlineIcon, default: true},
		{name: 'details', title: 'Details', icon: TagsIcon},
	],
	fields: [
		defineField({
			name: 'name',
			title: 'Donation Name',
			type: 'string',
			group: 'identity',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'donationId',
			title: 'Donation ID',
			type: 'number',
			group: 'identity',
			validation: (Rule) =>
				Rule.required().custom(
					isUniqueNumberField('donation', 'donationId', 'Donation ID must be unique'),
				),
		}),
		defineField({
			name: 'acquisitionDate',
			title: 'Donation Acquisition Date',
			type: 'historicalDate',
			group: 'identity',
		}),
		defineField({
			name: 'acquisitionDateText',
			title: 'Acquisition Date (Legacy Text)',
			type: 'string',
			group: 'identity',
			deprecated: {
				reason: 'Use Donation Acquisition Date (structured historical date) instead.',
			},
			readOnly: true,
			hidden: ({value}) => value === undefined,
			initialValue: undefined,
		}),
		defineField({
			name: 'description',
			title: 'Donation Description',
			type: 'text',
			group: 'details',
		}),
		defineField({
			name: 'donor',
			title: 'Donor',
			type: 'string',
			group: 'identity',
		}),
		defineField({
			name: 'donationCategories',
			title: 'Donation Categories',
			type: 'array',
			group: 'details',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'donationCategory'}],
				}),
			],
		}),
	],
	initialValue: incomingReferenceArrayInitialValue('donationCategories'),
	preview: {
		select: {
			name: 'name',
			donationId: 'donationId',
			donor: 'donor',
			legacyDate: 'acquisitionDateText',
			...historicalDatePreviewSelect('acquisitionDate'),
		},
		prepare(selection) {
			const {name, donationId, donor, legacyDate} = selection
			const title = name || (donationId != null ? `Donation #${donationId}` : 'Untitled donation')
			const when = formatHistoricalDateFromPreview(selection) || legacyDate
			const subtitle = [donor, when].filter(Boolean).join(' · ')
			return {
				title,
				subtitle: subtitle || undefined,
			}
		},
	},
})
