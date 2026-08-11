import {CalendarIcon} from '@sanity/icons/Calendar'
import {defineField, defineType} from 'sanity'

import {formatHistoricalDate, type HistoricalDateValue} from '../lib/formatHistoricalDate'

const MONTH_OPTIONS = [
	{title: 'January', value: 1},
	{title: 'February', value: 2},
	{title: 'March', value: 3},
	{title: 'April', value: 4},
	{title: 'May', value: 5},
	{title: 'June', value: 6},
	{title: 'July', value: 7},
	{title: 'August', value: 8},
	{title: 'September', value: 9},
	{title: 'October', value: 10},
	{title: 'November', value: 11},
	{title: 'December', value: 12},
]

export const historicalDate = defineType({
	name: 'historicalDate',
	title: 'Historical Date',
	type: 'object',
	icon: CalendarIcon,
	fields: [
		defineField({
			name: 'precision',
			title: 'Precision',
			type: 'string',
			options: {
				list: [
					{title: 'Year only', value: 'year'},
					{title: 'Month and year', value: 'month'},
					{title: 'Exact day', value: 'day'},
				],
				layout: 'radio',
			},
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'qualifier',
			title: 'Qualifier',
			type: 'string',
			options: {
				list: [
					{title: 'Exact / as recorded', value: 'exact'},
					{title: 'Circa', value: 'circa'},
					{title: 'Before', value: 'before'},
					{title: 'After', value: 'after'},
				],
				layout: 'radio',
			},
			initialValue: 'exact',
		}),
		defineField({
			name: 'year',
			title: 'Year',
			type: 'number',
			hidden: ({parent}) => parent?.precision === 'day',
			validation: (Rule) =>
				Rule.custom((year, context) => {
					const precision = (context.parent as HistoricalDateValue | undefined)?.precision
					if (precision === 'day') return true
					if (precision !== 'year' && precision !== 'month') return true
					if (year == null) return 'Year is required'
					if (!Number.isInteger(year)) return 'Year must be a whole number'
					if (year < 1000 || year > 2100) return 'Year must be between 1000 and 2100'
					return true
				}),
		}),
		defineField({
			name: 'month',
			title: 'Month',
			type: 'number',
			options: {
				list: MONTH_OPTIONS,
				layout: 'dropdown',
			},
			hidden: ({parent}) => parent?.precision !== 'month',
			validation: (Rule) =>
				Rule.custom((month, context) => {
					const precision = (context.parent as HistoricalDateValue | undefined)?.precision
					if (precision !== 'month') return true
					if (month == null) return 'Month is required'
					if (month < 1 || month > 12) return 'Month must be between 1 and 12'
					return true
				}),
		}),
		defineField({
			name: 'date',
			title: 'Date',
			type: 'date',
			description: 'Use the calendar when the exact day is known.',
			hidden: ({parent}) => parent?.precision !== 'day',
			validation: (Rule) =>
				Rule.custom((date, context) => {
					const precision = (context.parent as HistoricalDateValue | undefined)?.precision
					if (precision !== 'day') return true
					if (!date) return 'Exact date is required'
					return true
				}),
		}),
	],
	preview: {
		select: {
			precision: 'precision',
			qualifier: 'qualifier',
			year: 'year',
			month: 'month',
			date: 'date',
		},
		prepare(selection) {
			const title = formatHistoricalDate(selection as HistoricalDateValue)
			return {
				title: title || 'Date incomplete',
			}
		},
	},
})
