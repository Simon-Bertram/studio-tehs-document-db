import {defineField} from 'sanity'

const INTERNAL_COMMENTS_DESCRIPTION =
	'Studio-only working notes. Content in this field will not appear on the public site.'

/**
 * Shared editor-only comments field for website article documents.
 */
export function internalCommentsField(group?: string) {
	return defineField({
		name: 'internalComments',
		title: 'Internal Comments',
		type: 'text',
		...(group ? {group} : {}),
		description: INTERNAL_COMMENTS_DESCRIPTION,
	})
}
