import {InfoOutlineIcon} from '@sanity/icons/InfoOutline'
import {LinkIcon} from '@sanity/icons/Link'
import {PinIcon} from '@sanity/icons/Pin'
import {UsersIcon} from '@sanity/icons/Users'
import {defineType} from 'sanity'

import {DocumentWithDescription} from './components/DocumentWithDescription'
import {
	historicalEntityFields,
	historicalEntityIncomingDecorations,
	historicalEntityPreviewPrepare,
	historicalEntityPreviewSelect,
} from './shared/historicalEntityFields'

export const organization = defineType({
	name: 'organization',
	title: 'Organization',
	type: 'document',
	icon: UsersIcon,
	description:
		'Use for a named civic, community, or institutional group—congregation, fire company, library, school as operator, military unit, horse show (e.g. Great Valley Presbyterian Church, Lincoln Institution, Devon Horse Show). For commercial or industrial firms, create a Business instead. The building or tract is a Property—link it under Associated Properties / Sites.',
	components: {
		input: DocumentWithDescription,
	},
	groups: [
		{name: 'identity', title: 'Identity', icon: InfoOutlineIcon},
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
	renderMembers: (members) => [...members, ...historicalEntityIncomingDecorations('organization')],
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
