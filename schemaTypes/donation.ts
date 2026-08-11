import {BasketIcon} from '@sanity/icons/Basket'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {TagsIcon} from '@sanity/icons/Tags'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {formatHistoricalDate, type HistoricalDateValue} from './lib/formatHistoricalDate'
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
		}),
		defineField({
			name: 'donationId',
			title: 'Donation ID',
			type: 'number',
			group: 'identity',
			validation: (Rule) =>
				Rule.custom(isUniqueNumberField('donation', 'donationId', 'Donation ID must be unique')),
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
	preview: {
		select: {
			name: 'name',
			donationId: 'donationId',
			donor: 'donor',
			legacyDate: 'acquisitionDateText',
			precision: 'acquisitionDate.precision',
			qualifier: 'acquisitionDate.qualifier',
			year: 'acquisitionDate.year',
			month: 'acquisitionDate.month',
			date: 'acquisitionDate.date',
		},
		prepare({name, donationId, donor, legacyDate, precision, qualifier, year, month, date}) {
			const title = name || (donationId != null ? `Donation #${donationId}` : 'Untitled donation')
			const when =
				formatHistoricalDate({
					precision,
					qualifier,
					year,
					month,
					date,
				} as HistoricalDateValue) || legacyDate
			const subtitle = [donor, when].filter(Boolean).join(' · ')
			return {
				title,
				subtitle: subtitle || undefined,
			}
		},
	},
})
