import {nanoid} from 'nanoid'
import type {InitialValueResolver, SanityDocument} from 'sanity'
import {type IncomingReferencesOptions, isIncomingReferenceCreation} from 'sanity/structure'

type IncomingReferenceArrayField = 'familyLines' | 'donationCategories'

type IncomingReference = Parameters<NonNullable<IncomingReferencesOptions['onLinkDocument']>>[1]

interface ArrayReferenceItem extends IncomingReference {
	_key: string
}

function asReferenceArray(value: unknown): ArrayReferenceItem[] {
	if (!Array.isArray(value)) return []
	return value.filter(
		(item): item is ArrayReferenceItem =>
			typeof item === 'object' && item !== null && '_ref' in item && typeof item._ref === 'string',
	)
}

/**
 * Append an incoming reference onto an array field when linking from a
 * family or category document. Skips the item if that `_ref` is already present.
 */
export function appendIncomingReference(
	fieldName: IncomingReferenceArrayField,
): NonNullable<IncomingReferencesOptions['onLinkDocument']> {
	return (document: SanityDocument, reference: IncomingReference) => {
		const existing = asReferenceArray(document[fieldName])
		if (existing.some((item) => item._ref === reference._ref)) {
			return document
		}

		return {
			...document,
			[fieldName]: [...existing, {...reference, _key: nanoid()}],
		}
	}
}

/**
 * Seed an array-of-references field when a document is created from an
 * incoming-reference decoration (e.g. People on a family lineage).
 */
export function incomingReferenceArrayInitialValue(
	fieldName: IncomingReferenceArrayField,
): InitialValueResolver<Record<string, unknown>, Record<string, unknown>> {
	return (params) => {
		if (!isIncomingReferenceCreation(params)) return {}
		return {
			[fieldName]: [{...params.reference, _key: nanoid()}],
		}
	}
}
