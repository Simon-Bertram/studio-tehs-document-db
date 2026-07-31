import {defineArrayMember, defineField} from 'sanity'

const ORGANISATIONS_DESCRIPTION =
	'Historical organisations this item relates to (e.g. Lincoln Institution). Distinct from Subject Categories, which are archive search themes.'

/**
 * Shared organisations reference array for archive documents.
 */
export function organisationsField(group?: string) {
	return defineField({
		name: 'organisations',
		title: 'Organisations',
		type: 'array',
		...(group ? {group} : {}),
		description: ORGANISATIONS_DESCRIPTION,
		of: [
			defineArrayMember({
				type: 'reference',
				to: [{type: 'business'}],
			}),
		],
	})
}
