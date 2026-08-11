import {defineField} from 'sanity'

import {isUniqueStringField} from '../lib/isUniqueStringField'

/**
 * Shared Archive ID field with per-document-type uniqueness.
 */
export function archiveIdField(documentType: string, example: string, group?: string) {
	return defineField({
		name: 'archiveId',
		title: 'Archive ID',
		type: 'string',
		...(group ? {group} : {}),
		description: `Official internal reference number for this item (e.g., ${example}).`,
		validation: (Rule) =>
			Rule.custom(isUniqueStringField(documentType, 'archiveId', 'Archive ID must be unique')),
	})
}
