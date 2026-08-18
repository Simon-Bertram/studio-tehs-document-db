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
 * Wrap singular location.township into townships array.
 */
export default defineMigration({
	title: 'Rename location.township to townships',
	documentTypes: ['location'],
	filter: 'defined(township)',
	migrate: {
		document(doc) {
			if (!isReference(doc.township) || doc.townships) return []

			const member = {
				_key: nanoid(),
				_type: 'reference' as const,
				_ref: doc.township._ref,
				...(doc.township._weak ? {_weak: true} : {}),
			}

			return [at('townships', setIfMissing([member])), at('township', unset())]
		},
	},
})
