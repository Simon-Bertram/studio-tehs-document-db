import {at, defineMigration, unset} from 'sanity/migrate'

/**
 * Drop leftover geopoints on business and organization. Place is
 * associatedProperties; map pins live on the property.
 */
export default defineMigration({
	title: 'Unset historical entity coordinates',
	documentTypes: ['business', 'organization'],
	filter: 'defined(coordinates)',
	migrate: {
		document() {
			return [at('coordinates', unset())]
		},
	},
})
