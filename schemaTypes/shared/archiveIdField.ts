import type {ComponentType} from 'react'
import {defineField, type StringInputProps} from 'sanity'

import {isUniqueStringField} from '../lib/isUniqueStringField'

/**
 * Shared Archive ID field with per-document-type uniqueness.
 */
export function archiveIdField(
	documentType: string,
	example: string,
	group?: string,
	options?: {
		searchWeight?: number
		input?: ComponentType<StringInputProps>
		description?: string
	},
) {
	const searchWeight = options?.searchWeight
	const input = options?.input
	const description =
		options?.description ??
		`Official internal reference number for this item (e.g., ${example}). This identifier is unique.`

	return defineField({
		name: 'archiveId',
		title: 'Archive ID',
		type: 'string',
		...(group ? {group} : {}),
		description,
		...(searchWeight != null ? {options: {search: {weight: searchWeight}}} : {}),
		...(input ? {components: {input}} : {}),
		validation: (Rule) =>
			Rule.required().custom(
				isUniqueStringField(documentType, 'archiveId', 'Archive ID must be unique'),
			),
	})
}
