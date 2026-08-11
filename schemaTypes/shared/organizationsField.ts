import {defineArrayMember, defineField} from 'sanity'

const ORGANIZATIONS_DESCRIPTION =
	'Historical organizations this item relates to (e.g. Lincoln Institution). Distinct from Subject Categories, which are archive search themes.'

/**
 * Shared organizations reference array for archive documents.
 */
export function organizationsField(group?: string) {
	return defineField({
		name: 'organizations',
		title: 'Organizations',
		type: 'array',
		...(group ? {group} : {}),
		description: ORGANIZATIONS_DESCRIPTION,
		of: [
			defineArrayMember({
				type: 'reference',
				to: [{type: 'business'}],
			}),
		],
	})
}
