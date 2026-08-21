import {nanoid} from 'nanoid'
import type {InitialValueResolver, SanityDocument} from 'sanity'
import {type IncomingReferencesOptions, isIncomingReferenceCreation} from 'sanity/structure'

type IncomingReferenceArrayField = 'familyLines' | 'donationCategories' | 'people' | 'subjects'

type IncomingReferenceField = 'county'

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
 * family, category, or person document. Skips the item if that `_ref` is
 * already present.
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
 * Set a single reference field when linking from an incoming-reference
 * decoration (e.g. township.county from a County document).
 */
export function setIncomingReference(
	fieldName: IncomingReferenceField,
): NonNullable<IncomingReferencesOptions['onLinkDocument']> {
	return (document: SanityDocument, reference: IncomingReference) => ({
		...document,
		[fieldName]: reference,
	})
}

/**
 * Seed a single reference field when a document is created from an
 * incoming-reference decoration (e.g. Township created from a County).
 */
export function incomingReferenceInitialValue(
	fieldName: IncomingReferenceField,
): InitialValueResolver<Record<string, unknown>, Record<string, unknown>> {
	return (params) => {
		if (!isIncomingReferenceCreation(params)) return {}
		return {
			[fieldName]: params.reference,
		}
	}
}

/**
 * Seed an array-of-references field when a document is created from an
 * incoming-reference decoration (e.g. People on a family lineage, or
 * Historical Images on a person).
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

/**
 * Seed an array-of-references field based on the document type the create
 * action came from (e.g. person → people, category → subjects).
 */
export function incomingReferenceArrayInitialValueBySource(
	fieldBySourceType: Record<string, IncomingReferenceArrayField>,
): InitialValueResolver<Record<string, unknown>, Record<string, unknown>> {
	return (params) => {
		if (!isIncomingReferenceCreation(params)) return {}
		const fieldName = fieldBySourceType[params.from.type]
		if (!fieldName) return {}
		return {
			[fieldName]: [{...params.reference, _key: nanoid()}],
		}
	}
}
