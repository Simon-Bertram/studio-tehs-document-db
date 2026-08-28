import {defineField} from 'sanity'

import {isUniqueStringField} from '../lib/isUniqueStringField'

/**
 * Shared Archive ID field with per-document-type uniqueness.
 */
export function archiveIdField(
	documentType: string,
	example: string,
	group?: string,
	options?: {searchWeight?: number},
) {
	const searchWeight = options?.searchWeight

	return defineField({
		name: 'archiveId',
		title: 'Archive ID',
		type: 'string',
		...(group ? {group} : {}),
		description: `Official internal reference number for this item (e.g., ${example}).`,
		...(searchWeight != null ? {options: {search: {weight: searchWeight}}} : {}),
		validation: (Rule) =>
			Rule.required().custom(
				isUniqueStringField(documentType, 'archiveId', 'Archive ID must be unique'),
			),
	})
}
