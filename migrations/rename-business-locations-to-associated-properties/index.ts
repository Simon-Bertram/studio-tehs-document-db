import {at, defineMigration, setIfMissing, unset} from 'sanity/migrate'

/**
 * Clarify business→property refs: locations → associatedProperties.
 */
export default defineMigration({
	title: 'Rename business.locations to associatedProperties',
	documentTypes: ['business'],
	filter: 'defined(locations)',
	migrate: {
		document(doc) {
			if (!doc.locations || doc.associatedProperties) {
				return doc.locations && doc.associatedProperties ? [at('locations', unset())] : []
			}
			return [
				at('associatedProperties', setIfMissing(doc.locations)),
				at('locations', unset()),
			]
		},
	},
})
