import {defineArrayMember, defineField} from 'sanity'

import {formatHistoricalDateRange} from '../lib/formatHistoricalDate'
import {historicalDateFromPreview, historicalDatePreviewSelect} from '../lib/historicalDatePreview'
import {isUniqueStringField} from '../lib/isUniqueStringField'
import {associatedPropertiesField} from './locationFields'

export const HISTORICAL_ENTITY_TYPES = ['business', 'organization'] as const

/**
 * Name plus the identity / place / relations fields shared by business and
 * organization documents. Type-specific labels stay in each schema.
 */
export function historicalEntityFields(options: {
	nameTitle: string
	nameDescription: string
	contextDescription: string
	ownersTitle: string
}) {
	return [
		defineField({
			name: 'name',
			title: options.nameTitle,
			type: 'string',
			group: 'identity',
			description: options.nameDescription,
			validation: (Rule) => Rule.required(),
		}),
		defineField({
			name: 'migrationKey',
			title: 'Migration Mapping Key',
			type: 'string',
			group: 'identity',
			description:
				'Used by the CSV script to map legacy keywords (e.g. Lincoln) to this record. Visible during migration; hide after cutover.',
			validation: (Rule) =>
				Rule.custom(
					isUniqueStringField(
						[...HISTORICAL_ENTITY_TYPES],
						'migrationKey',
						'Migration mapping key must be unique',
					),
				),
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			group: 'identity',
			description: options.contextDescription,
		}),
		defineField({
			name: 'activeFrom',
			title: 'Active From',
			type: 'historicalDate',
			group: 'identity',
			description: 'Optional start of known activity (often year-only).',
		}),
		defineField({
			name: 'activeTo',
			title: 'Active To',
			type: 'historicalDate',
			group: 'identity',
			description: 'Optional end of known activity (often year-only).',
		}),
		defineField({
			name: 'yearsActive',
			title: 'Years Active (Legacy)',
			type: 'string',
			group: 'identity',
			description: 'Freeform date range, e.g. 1870–1920.',
			deprecated: {
				reason: 'Use Active From / Active To instead.',
			},
			readOnly: true,
			hidden: ({value}) => value === undefined,
			initialValue: undefined,
		}),
		associatedPropertiesField('place'),
		defineField({
			name: 'owners',
			title: options.ownersTitle,
			type: 'array',
			group: 'relations',
			of: [
				defineArrayMember({
					type: 'reference',
					to: [{type: 'person'}],
				}),
			],
		}),
	]
}

export const historicalEntityPreviewSelect = {
	title: 'name',
	yearsActive: 'yearsActive',
	...historicalDatePreviewSelect('activeFrom', 'from'),
	...historicalDatePreviewSelect('activeTo', 'to'),
}

export function historicalEntityPreviewPrepare(
	selection: Record<string, unknown>,
	unnamedTitle: string,
) {
	const title = typeof selection.title === 'string' ? selection.title : undefined
	const yearsActive = typeof selection.yearsActive === 'string' ? selection.yearsActive : undefined
	const range =
		formatHistoricalDateRange(
			historicalDateFromPreview(selection, 'from'),
			historicalDateFromPreview(selection, 'to'),
		) || yearsActive
	return {
		title: title || unnamedTitle,
		subtitle: range || undefined,
	}
}
