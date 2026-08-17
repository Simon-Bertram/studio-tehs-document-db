import {BasketIcon} from '@sanity/icons/Basket'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {TagsIcon} from '@sanity/icons/Tags'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {DonationUncategorizedMedia} from './components/DonationUncategorizedMedia'
import {
	formatHistoricalDateFromPreview,
	historicalDatePreviewSelect,
} from './lib/historicalDatePreview'
import {incomingReferenceArrayInitialValue} from './lib/incoming-reference-array'
import {isUniqueNumberField} from './lib/isUniqueNumberField'
import {warnMissingDonationCategory} from './lib/warnMissingDonationCategory'

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
			validation: (Rule) =>
				Rule.custom(warnMissingDonationCategory()).warning(),
		}),
	],
	initialValue: incomingReferenceArrayInitialValue('donationCategories'),
	preview: {
		select: {
			name: 'name',
			donationId: 'donationId',
			donor: 'donor',
			legacyDate: 'acquisitionDateText',
			cat0: 'donationCategories.0.title',
			cat1: 'donationCategories.1.title',
			cat2: 'donationCategories.2.title',
			...historicalDatePreviewSelect('acquisitionDate'),
		},
		prepare(selection) {
			const {name, donationId, donor, legacyDate, cat0, cat1, cat2} = selection
			const title = name || (donationId != null ? `Donation #${donationId}` : 'Untitled donation')
			const when = formatHistoricalDateFromPreview(selection) || legacyDate
			const hasLiveCategory = Boolean(cat0 || cat1 || cat2)
			const subtitle = [
				donor,
				when,
				hasLiveCategory ? undefined : 'No donation category',
			]
				.filter(Boolean)
				.join(' · ')
			return {
				title,
				subtitle: subtitle || undefined,
				...(hasLiveCategory ? {} : {media: DonationUncategorizedMedia}),
			}
		},
	},
})
