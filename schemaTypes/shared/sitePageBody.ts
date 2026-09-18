import {defineArrayMember} from 'sanity'

import {portableTextImageMember} from './portableTextImageFields'

/**
 * Portable Text for Society chrome pages (About, Membership copy, store notes).
 * No map modules — those belong on Research Articles.
 */
export const sitePageBodyMembers = [
	defineArrayMember({type: 'block'}),
	defineArrayMember({type: 'historicalImageEmbed'}),
	portableTextImageMember({title: 'Uploaded Image'}),
]
