import {nanoid} from 'nanoid'
import {at, defineMigration, setIfMissing, unset} from 'sanity/migrate'

type SanityReference = {_type: 'reference'; _ref: string; _weak?: boolean}

function isReference(value: unknown): value is SanityReference {
	return (
		typeof value === 'object' &&
		value !== null &&
		'_type' in value &&
		(value as {_type: unknown})._type === 'reference' &&
		'_ref' in value &&
		typeof (value as {_ref: unknown})._ref === 'string'
	)
}

/**
 * Wrap singular associatedProperty into associatedProperties array.
 */
export default defineMigration({
	title: 'Rename associatedProperty to associatedProperties',
	documentTypes: ['primarySource'],
	filter: 'defined(associatedProperty)',
	migrate: {
		document(doc) {
			if (!isReference(doc.associatedProperty) || doc.associatedProperties) return []

			const member = {
				_key: nanoid(),
				_type: 'reference' as const,
				_ref: doc.associatedProperty._ref,
				...(doc.associatedProperty._weak ? {_weak: true} : {}),
			}

			return [
				at('associatedProperties', setIfMissing([member])),
				at('associatedProperty', unset()),
			]
		},
	},
})
