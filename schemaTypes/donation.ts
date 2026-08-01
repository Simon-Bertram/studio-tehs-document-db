import {BasketIcon} from '@sanity/icons/Basket'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const donation = defineType({
	name: 'donation',
	title: 'Donation',
	type: 'document',
	icon: BasketIcon,
	fields: [
		defineField({
			name: 'name',
			title: 'Donation Name',
			type: 'string',
		}),
		defineField({
			name: 'donationId',
			title: 'Donation ID',
			type: 'number',
		}),
		defineField({
			name: 'acquisitionDate',
			title: 'Donation Acquisition Date',
			type: 'string',
		}),
		defineField({
			name: 'description',
			title: 'Donation Description',
			type: 'text',
		}),
		defineField({
			name: 'donor',
			title: 'Donor',
			type: 'string',
		}),
		defineField({
			name: 'donationCategories',
			title: 'Donation Categories',
			type: 'array',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'donationCategory'}],
				}),
			],
		}),
	],
})
