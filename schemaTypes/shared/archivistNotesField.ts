import {defineField} from 'sanity'

import {CautionDescriptionField} from '../components/CautionDescriptionField'
import {STUDIO_ONLY_NOTES_DESCRIPTION} from './internalCommentsField'

/**
 * Studio-only archivist working notes (Historical Image).
 * Preserves the existing `notes` field name for stored data.
 */
export function archivistNotesField(group?: string) {
	return defineField({
		name: 'notes',
		title: 'Archivist Notes',
		type: 'text',
		...(group ? {group} : {}),
		description: STUDIO_ONLY_NOTES_DESCRIPTION,
		components: {field: CautionDescriptionField},
	})
}
