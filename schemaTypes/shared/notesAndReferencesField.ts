import {LinkIcon} from '@sanity/icons/Link'
import {defineArrayMember, defineField} from 'sanity'

const NOTES_AND_REFERENCES_DESCRIPTION =
	'Bibliographic notes, endnotes, and web links shown with the article on the public site. Type the citation, select the title, and paste a URL to attach a link. Do not put private or unfinished notes here—use Internal Comments instead.'

/**
 * Shared published bibliography field for website article documents.
 */
export function notesAndReferencesField(group?: string) {
	return defineField({
		name: 'notesAndReferences',
		title: 'Notes & References',
		type: 'array',
		...(group ? {group} : {}),
		description: NOTES_AND_REFERENCES_DESCRIPTION,
		of: [
			defineArrayMember({
				type: 'block',
				styles: [{title: 'Normal', value: 'normal'}],
				lists: [{title: 'Bulleted list', value: 'bullet'}],
				marks: {
					decorators: [
						{title: 'Strong', value: 'strong'},
						{title: 'Italic', value: 'em'},
					],
					annotations: [
						{
							name: 'link',
							type: 'object',
							title: 'URL',
							icon: LinkIcon,
							fields: [
								defineField({
									name: 'href',
									title: 'URL',
									type: 'url',
									validation: (Rule) => Rule.uri({scheme: ['http', 'https']}),
								}),
							],
						},
					],
				},
			}),
		],
	})
}
