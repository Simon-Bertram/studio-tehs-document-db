import {CaseIcon} from '@sanity/icons/Case'
import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {LinkIcon} from '@sanity/icons/Link'
import {PinIcon} from '@sanity/icons/Pin'
import {defineType} from 'sanity'

import {
	historicalEntityFields,
	historicalEntityIncomingImagesDecoration,
	historicalEntityPreviewPrepare,
	historicalEntityPreviewSelect,
} from './shared/historicalEntityFields'

export const business = defineType({
	name: 'business',
	title: 'Business',
	type: 'document',
	icon: CaseIcon,
	groups: [
		{name: 'identity', title: 'Identity', icon: InfoOutlineIcon, default: true},
		{name: 'place', title: 'Place', icon: PinIcon},
		{name: 'relations', title: 'Relations', icon: LinkIcon},
	],
	fields: historicalEntityFields({
		nameTitle: 'Business Name',
		nameDescription:
			'e.g., H. & B.F. Bean’s Lumber Yard, Valley Forge Silica, Sand and Ore Company',
		contextDescription: 'Historical context for this commercial or industrial business.',
		ownersTitle: 'Owners / Operators',
	}),
	renderMembers: (members) => [...members, historicalEntityIncomingImagesDecoration('business')],
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
			return historicalEntityPreviewPrepare(selection, 'Unnamed Business')
		},
	},
})
