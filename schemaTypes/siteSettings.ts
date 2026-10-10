import {CogIcon} from '@sanity/icons/Cog'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {DocumentWithDescription} from './components/DocumentWithDescription'
import {canEditSiteNavigation} from './lib/canEditSiteNavigation'

export const siteSettings = defineType({
	name: 'siteSettings',
	title: 'Site settings',
	type: 'document',
	icon: CogIcon,
	description:
		'Address, purpose emails, social links, and Mailchimp signup for the public site. One document only. Contributors cannot edit this.',
	components: {
		input: DocumentWithDescription,
	},
	readOnly: ({currentUser}) => !canEditSiteNavigation(currentUser),
	fields: [
		defineField({
			name: 'postalAddress',
			title: 'Postal address',
			type: 'text',
			rows: 4,
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'emails',
			title: 'Purpose emails',
			type: 'array',
			of: [defineArrayMember({type: 'purposeEmail'})],
			description:
				'Contact page list (General, Membership, Archives, Quarterly, Board, Webmaster).',
		}),
		defineField({
			name: 'facebookUrl',
			title: 'Facebook URL',
			type: 'url',
			validation: (Rule) => Rule.uri({scheme: ['http', 'https']}),
		}),
		defineField({
			name: 'twitterUrl',
			title: 'Twitter / X URL',
			type: 'url',
			validation: (Rule) => Rule.uri({scheme: ['http', 'https']}),
		}),
		defineField({
			name: 'mailchimpEmbedUrl',
			title: 'Mailchimp signup URL',
			type: 'url',
			description:
				'Hosted form or embed action. Subscribers stay in Mailchimp — do not store the list in Studio. Free list only; no paid newsletter.',
			validation: (Rule) => Rule.uri({scheme: ['http', 'https']}),
		}),
		defineField({
			name: 'privacySentence',
			title: 'Email privacy sentence',
			type: 'text',
			rows: 3,
			description: 'Shown next to signup. Mailchimp provides the unsubscribe link in campaigns.',
		}),
	],
	preview: {
		prepare() {
			return {
				title: 'Site settings',
				subtitle: 'Address, email, Mailchimp',
			}
		},
	},
})
