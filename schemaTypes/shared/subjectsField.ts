import {defineArrayMember, defineField} from 'sanity'

const SUBJECTS_DESCRIPTION =
	'Archive search themes (e.g. Schools, Railroads, Farms). Not Property Type or Organisation type—those classify building and organisation entities under Taxonomies.'

/**
 * Shared subjects reference array for archive documents.
 */
export function subjectsField(group?: string) {
	return defineField({
		name: 'subjects',
		title: 'Subjects',
		type: 'array',
		...(group ? {group} : {}),
		description: SUBJECTS_DESCRIPTION,
		of: [
			defineArrayMember({
				type: 'reference',
				to: [{type: 'category'}],
			}),
		],
	})
}
