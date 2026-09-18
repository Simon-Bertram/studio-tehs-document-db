import {defineArrayMember, defineField} from 'sanity'
import {defineIncomingReferenceDecoration} from 'sanity/structure'

import {formatHistoricalDateRange} from '../lib/formatHistoricalDate'
import {historicalDateFromPreview, historicalDatePreviewSelect} from '../lib/historicalDatePreview'
import {appendIncomingReference} from '../lib/incoming-reference-array'
import {
	isUniqueMigrationMappingValue,
	migrationKeyMatchesOwnAlias,
	validateMigrationKeyAliases,
} from '../lib/isUniqueMigrationMappingValue'
import {articleIncomingDecorations} from './articleIncomingDecorations'
import {associatedPropertiesField} from './locationFields'

export const HISTORICAL_ENTITY_TYPES = ['business', 'organization'] as const

const uniqueEntityMappingKey = isUniqueMigrationMappingValue(
	[...HISTORICAL_ENTITY_TYPES],
	'Migration mapping key must be unique',
)

const uniqueEntityMappingAliases = validateMigrationKeyAliases([...HISTORICAL_ENTITY_TYPES])

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
				Rule.custom(async (value, context) => {
					if (migrationKeyMatchesOwnAlias(value, context.document?.migrationKeyAliases)) {
						return 'Migration Mapping Key cannot also be listed as an alias'
					}
					return uniqueEntityMappingKey(value, context)
				}),
		}),
		defineField({
			name: 'migrationKeyAliases',
			title: 'Migration Key Aliases',
			type: 'array',
			group: 'identity',
			of: [defineArrayMember({type: 'string'})],
			description:
				'Extra CSV spellings that should map to this record (e.g. LI when the primary key is Lincoln). Match is case-insensitive, same as the primary key.',
			validation: (Rule) => Rule.custom(uniqueEntityMappingAliases),
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

/**
 * Incoming historical images that tag this business or organization via
 * `historicalImage.organizations`.
 */
export function historicalEntityIncomingImagesDecoration(entityLabel: 'business' | 'organization') {
	return defineIncomingReferenceDecoration({
		name: 'historicalImages',
		title: 'Historical Images',
		description: `Photographs this ${entityLabel} is tagged in.`,
		types: [{type: 'historicalImage'}],
		onLinkDocument: appendIncomingReference('organizations'),
	})
}

/**
 * Incoming historical images plus quarterly and research articles that tag
 * this business or organization.
 */
export function historicalEntityIncomingDecorations(entityLabel: 'business' | 'organization') {
	return [
		historicalEntityIncomingImagesDecoration(entityLabel),
		...articleIncomingDecorations('organizations'),
	]
}

export const historicalEntityPreviewSelect = {
	title: 'name',
	...historicalDatePreviewSelect('activeFrom', 'from'),
	...historicalDatePreviewSelect('activeTo', 'to'),
}

export function historicalEntityPreviewPrepare(
	selection: Record<string, unknown>,
	unnamedTitle: string,
) {
	const title = typeof selection.title === 'string' ? selection.title : undefined
	const range = formatHistoricalDateRange(
		historicalDateFromPreview(selection, 'from'),
		historicalDateFromPreview(selection, 'to'),
	)
	return {
		title: title || unnamedTitle,
		subtitle: range || undefined,
	}
}
