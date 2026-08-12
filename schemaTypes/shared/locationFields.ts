import {defineArrayMember, defineField} from 'sanity'

import {townshipWhenNoPlaceField} from './townshipWhenNoPlaceField'

const DEFAULT_LOCATION_DESCRIPTION =
	'When set, township is taken from this location. Use the Township field only when there is no more specific place.'

/**
 * Reference to a `location` document, plus optional paired township field
 * that hides when the location is set. Field name is always `location`.
 */
export function locationReferenceFields(options: {
	group?: string
	description?: string
	townshipDescription?: string
	includeTownship?: boolean
}) {
	const {
		group,
		description = DEFAULT_LOCATION_DESCRIPTION,
		townshipDescription = 'Only needed when no specific location is set.',
		includeTownship = true,
	} = options

	const locationField = defineField({
		name: 'location',
		title: 'Specific Location',
		type: 'reference',
		...(group ? {group} : {}),
		to: [{type: 'location'}],
		description,
	})

	if (!includeTownship) return [locationField]

	return [
		locationField,
		townshipWhenNoPlaceField({
			hideWhenField: 'location',
			group,
			description: townshipDescription,
		}),
	]
}

/**
 * Organization → property sites (`associatedProperties`).
 */
export function associatedPropertiesField(group?: string) {
	return defineField({
		name: 'associatedProperties',
		title: 'Associated Properties / Sites',
		type: 'array',
		...(group ? {group} : {}),
		of: [
			defineArrayMember({
				type: 'reference',
				to: [{type: 'property'}],
			}),
		],
		description:
			'Canonical link from this organization to the properties it occupied. Related organizations are found from a property via this field (not stored on the property).',
	})
}
