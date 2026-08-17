import {CalendarIcon} from '@sanity/icons/Calendar'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {UserIcon} from '@sanity/icons/User'
import {UsersIcon} from '@sanity/icons/Users'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {defineIncomingReferenceDecoration} from 'sanity/structure'

import {compareHistoricalDates, type HistoricalDateValue} from './lib/formatHistoricalDate'
import {
	formatHistoricalDateFromPreview,
	historicalDatePreviewSelect,
} from './lib/historicalDatePreview'
import {
	appendIncomingReference,
	incomingReferenceArrayInitialValue,
} from './lib/incoming-reference-array'
import {warnDuplicatePersonName} from './lib/warnDuplicatePersonName'

export const person = defineType({
	name: 'person',
	title: 'Historical Person',
	type: 'document',
	icon: UserIcon,
	groups: [
		{name: 'identity', title: 'Identity', icon: InfoOutlineIcon, default: true},
		{name: 'genealogy', title: 'Genealogy', icon: UsersIcon},
		{name: 'records', title: 'Records', icon: CalendarIcon},
	],
	fields: [
		defineField({
			name: 'prefix',
			title: 'Title / Prefix',
			type: 'string',
			group: 'identity',
			description: 'e.g., Capt., Rev., Dr., Justice',
		}),
		defineField({
			name: 'firstName',
			title: 'First Name',
			type: 'string',
			group: 'identity',
			validation: (Rule) => [Rule.required(), Rule.custom(warnDuplicatePersonName()).warning()],
		}),
		defineField({
			name: 'middleName',
			title: 'Middle Name',
			type: 'string',
			group: 'identity',
			validation: (Rule) => [Rule.custom(warnDuplicatePersonName()).warning()],
		}),
		defineField({
			name: 'lastName',
			title: 'Last Name',
			type: 'string',
			group: 'identity',
			validation: (Rule) => [Rule.required(), Rule.custom(warnDuplicatePersonName()).warning()],
		}),
		defineField({
			name: 'suffix',
			title: 'Suffix',
			type: 'string',
			group: 'identity',
			description: 'e.g., Jr., Sr., III, Deceased',
		}),
		defineField({
			name: 'born',
			title: 'Born',
			type: 'historicalDate',
			group: 'identity',
			description:
				'Optional. Prefer year-only when the exact day is unknown. Use Exact day only when the full calendar date is known—do not invent a day or month.',
		}),
		defineField({
			name: 'died',
			title: 'Died',
			type: 'historicalDate',
			group: 'identity',
			description:
				'Optional. Prefer year-only when the exact day is unknown. Use Exact day only when the full calendar date is known—do not invent a day or month.',
			validation: (Rule) =>
				Rule.custom((died, context) => {
					const born = context.document?.born as HistoricalDateValue | undefined
					const diedValue = died as HistoricalDateValue | undefined
					if (!born?.precision || !diedValue?.precision) return true
					if (compareHistoricalDates(diedValue, born) < 0) {
						return 'Died date must be on or after born date'
					}
					return true
				}),
		}),
		defineField({
			name: 'alternateSpellings',
			title: 'Alternate Spellings / Aliases',
			type: 'array',
			group: 'genealogy',
			of: [defineArrayMember({type: 'string'})],
			description: 'Add historical spelling variants found in records (e.g., Christman, Chrisman).',
		}),
		defineField({
			name: 'censusAppearances',
			title: 'Census / Occupation Records',
			type: 'array',
			group: 'records',
			of: [defineArrayMember({type: 'censusRecord'})],
		}),
		defineField({
			name: 'familyLines',
			title: 'Family Lineages',
			type: 'array',
			group: 'genealogy',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'familyLine'}],
				}),
			],
			description: 'Tag this person to broader family groups (e.g., The Bean Family).',
		}),
		defineField({
			name: 'immediateRelatives',
			title: 'Known Immediate Relatives',
			type: 'array',
			group: 'genealogy',
			description: 'Log specific known relationships (spouse, parent, child, sibling).',
			of: [defineArrayMember({type: 'immediateRelative'})],
		}),
	],
	initialValue: incomingReferenceArrayInitialValue('familyLines'),
	renderMembers: (members) => [
		...members,
		defineIncomingReferenceDecoration({
			name: 'historicalImages',
			title: 'Historical Images',
			description: 'Photographs this person is tagged in.',
			types: [{type: 'historicalImage'}],
			onLinkDocument: appendIncomingReference('people'),
		}),
	],
	orderings: [
		{
			title: 'Last name, A–Z',
			name: 'lastNameAsc',
			by: [
				{field: 'lastName', direction: 'asc'},
				{field: 'firstName', direction: 'asc'},
			],
		},
		{
			title: 'First name, A–Z',
			name: 'firstNameAsc',
			by: [
				{field: 'firstName', direction: 'asc'},
				{field: 'lastName', direction: 'asc'},
			],
		},
	],
	preview: {
		select: {
			prefix: 'prefix',
			first: 'firstName',
			middle: 'middleName',
			last: 'lastName',
			suffix: 'suffix',
			...historicalDatePreviewSelect('born', 'born'),
			...historicalDatePreviewSelect('died', 'died'),
		},
		prepare(selection) {
			const {prefix, first, middle, last, suffix} = selection
			const title = [prefix, first, middle, last, suffix].filter(Boolean).join(' ')
			const bornLabel = formatHistoricalDateFromPreview(selection, 'born')
			const diedLabel = formatHistoricalDateFromPreview(selection, 'died')
			let subtitle: string | undefined
			if (bornLabel && diedLabel) subtitle = `${bornLabel}–${diedLabel}`
			else if (bornLabel) subtitle = `b. ${bornLabel}`
			else if (diedLabel) subtitle = `d. ${diedLabel}`

			return {
				title: title || 'Unnamed Person',
				subtitle,
			}
		},
	},
})
