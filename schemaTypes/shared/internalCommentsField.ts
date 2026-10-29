import {defineField} from 'sanity'

import {CautionDescriptionField} from '../components/CautionDescriptionField'

export const STUDIO_ONLY_NOTES_DESCRIPTION =
	'Studio-only working notes. Content in this field will not appear on the public site.'

/**
 * Shared editor-only comments field for Studio documents.
 */
export function internalCommentsField(group?: string) {
	return defineField({
		name: 'internalComments',
		title: 'Internal Comments',
		type: 'text',
		...(group ? {group} : {}),
		description: STUDIO_ONLY_NOTES_DESCRIPTION,
		components: {field: CautionDescriptionField},
	})
}
