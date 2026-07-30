import {defineField} from 'sanity'

/**
 * Township reference that hides when a more specific place field is set.
 */
export function townshipWhenNoPlaceField(options: {
	hideWhenField: string
	description: string
	group?: string
}) {
	const {hideWhenField, description, group} = options

	return defineField({
		name: 'township',
		title: 'Township',
		type: 'reference',
		...(group ? {group} : {}),
		to: [{type: 'township'}],
		description,
		hidden: ({document}) => Boolean(document?.[hideWhenField]),
	})
}
