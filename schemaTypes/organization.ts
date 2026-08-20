import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {LinkIcon} from '@sanity/icons/Link'
import {PinIcon} from '@sanity/icons/Pin'
import {UsersIcon} from '@sanity/icons/Users'
import {defineType} from 'sanity'

import {
	historicalEntityFields,
	historicalEntityPreviewPrepare,
	historicalEntityPreviewSelect,
} from './shared/historicalEntityFields'

export const organization = defineType({
	name: 'organization',
	title: 'Organization',
	type: 'document',
	icon: UsersIcon,
	groups: [
		{name: 'identity', title: 'Identity', icon: InfoOutlineIcon, default: true},
		{name: 'place', title: 'Place', icon: PinIcon},
		{name: 'relations', title: 'Relations', icon: LinkIcon},
	],
	fields: historicalEntityFields({
		nameTitle: 'Organization Name',
		nameDescription:
			'e.g., Great Valley Presbyterian Church, Lincoln Institution, Devon Horse Show',
		contextDescription: 'Historical context for this civic, community, or institutional group.',
		ownersTitle: 'Leaders / Associated People',
	}),
	orderings: [
		{
			title: 'Name, A–Z',
			name: 'nameAsc',
			by: [{field: 'name', direction: 'asc'}],
		},
	],
	preview: {
		select: historicalEntityPreviewSelect,
		prepare(selection) {
			return historicalEntityPreviewPrepare(selection, 'Unnamed Organization')
		},
	},
})
