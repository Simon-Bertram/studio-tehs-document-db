import {HomeIcon} from '@sanity/icons/Home'
import {defineField, defineType} from 'sanity'

import {DocumentWithDescription} from './components/DocumentWithDescription'
import {canEditSiteNavigation} from './lib/canEditSiteNavigation'
import {sitePageBodyMembers} from './shared/sitePageBody'

export const homePage = defineType({
	name: 'homePage',
	title: 'Home page',
	type: 'document',
	icon: HomeIcon,
	description:
		'Welcome copy for the public home page. Next meeting comes from Society Events (soonest future start). Featured photographs use Historical Images marked Show in the public highlight grid. One document only.',
	components: {
		input: DocumentWithDescription,
	},
	readOnly: ({currentUser}) => !canEditSiteNavigation(currentUser),
	fields: [
		defineField({
			name: 'intro',
			title: 'Introduction',
			type: 'array',
			of: sitePageBodyMembers,
			validation: (Rule) => Rule.required().min(1),
		}),
		defineField({
			name: 'heroImage',
			title: 'Hero photograph',
			type: 'reference',
			to: [{type: 'historicalImage'}],
			description: 'Optional catalog photograph. Prefer a featured Historical Image.',
		}),
		defineField({
			name: 'noUpcomingEventNote',
			title: 'Note when no upcoming event',
			type: 'string',
			description:
				'Optional. Shown only when there is no future Society Event. Leave empty to hide the teaser.',
		}),
	],
	preview: {
		prepare() {
			return {
				title: 'Home page',
				subtitle: 'Public welcome',
			}
		},
	},
})
