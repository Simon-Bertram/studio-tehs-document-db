import {at, defineMigration, setIfMissing, unset} from 'sanity/migrate'

/**
 * Align historicalImage place ref with property: specificLocation → location.
 */
export default defineMigration({
	title: 'Rename historicalImage.specificLocation to location',
	documentTypes: ['historicalImage'],
	filter: 'defined(specificLocation)',
	migrate: {
		document(doc) {
			if (!doc.specificLocation || doc.location) {
				return doc.specificLocation && doc.location ? [at('specificLocation', unset())] : []
			}
			return [
				at('location', setIfMissing(doc.specificLocation)),
				at('specificLocation', unset()),
			]
		},
	},
})
