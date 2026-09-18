import {CalendarIcon} from '@sanity/icons/Calendar'
import {defineField, defineType} from 'sanity'

import {DocumentWithDescription} from './components/DocumentWithDescription'
import {sitePageBodyMembers} from './shared/sitePageBody'

function isAllowedVideoUrl(url: string): boolean {
	try {
		const host = new URL(url).hostname.replace(/^www\./, '')
		return (
			host === 'youtube.com' ||
			host === 'youtu.be' ||
			host === 'vimeo.com' ||
			host.endsWith('.youtube.com')
		)
	} catch {
		return false
	}
}

export const societyEvent = defineType({
	name: 'societyEvent',
	title: 'Society event',
	type: 'document',
	icon: CalendarIcon,
	description:
		'A public meeting, exhibit, or talk. The soonest future start appears on Home. Optional YouTube or Vimeo URL only — do not upload video to Sanity.',
	components: {
		input: DocumentWithDescription,
	},
	fields: [
		defineField({
			name: 'title',
			title: 'Title',
			type: 'string',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'slug',
			title: 'URL slug',
			type: 'slug',
			options: {source: 'title'},
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'kind',
			title: 'Kind',
			type: 'string',
			options: {
				list: [
					{title: 'Meeting / presentation', value: 'meeting'},
					{title: 'Exhibit', value: 'exhibit'},
					{title: 'Talk / video', value: 'talk'},
					{title: 'Other', value: 'other'},
				],
				layout: 'radio',
			},
			initialValue: 'meeting',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'startAt',
			title: 'Starts',
			type: 'datetime',
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'endAt',
			title: 'Ends',
			type: 'datetime',
		}),
		defineField({
			name: 'venue',
			title: 'Venue',
			type: 'string',
		}),
		defineField({
			name: 'speaker',
			title: 'Speaker / presenter',
			type: 'string',
		}),
		defineField({
			name: 'body',
			title: 'Description',
			type: 'array',
			of: sitePageBodyMembers,
		}),
		defineField({
			name: 'videoUrl',
			title: 'Video URL',
			type: 'url',
			description: 'YouTube or Vimeo only. Shown on News and the event page.',
			validation: (Rule) =>
				Rule.uri({scheme: ['http', 'https']}).custom((url) => {
					if (!url) return true
					return isAllowedVideoUrl(url) || 'Use a YouTube or Vimeo URL. Do not host video in Sanity.'
				}),
		}),
	],
	orderings: [
		{
			title: 'Start, newest',
			name: 'startDesc',
			by: [{field: 'startAt', direction: 'desc'}],
		},
		{
			title: 'Start, oldest',
			name: 'startAsc',
			by: [{field: 'startAt', direction: 'asc'}],
		},
	],
	preview: {
		select: {title: 'title', startAt: 'startAt', venue: 'venue'},
		prepare({title, startAt, venue}) {
			const when = startAt
				? new Date(startAt).toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'})
				: undefined
			return {
				title: title || 'Untitled event',
				subtitle: [when, venue].filter(Boolean).join(' · '),
			}
		},
	},
})
