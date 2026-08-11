import {at, defineMigration, setIfMissing, unset} from 'sanity/migrate'

/**
 * Rename organisations → organizations on archive / research documents.
 */
export default defineMigration({
	title: 'Rename organisations to organizations',
	documentTypes: ['primarySource', 'historicalImage', 'researchArticle'],
	filter: 'defined(organisations)',
	migrate: {
		document(doc) {
			if (!doc.organisations || doc.organizations) return []
			return [at('organizations', setIfMissing(doc.organisations)), at('organisations', unset())]
		},
	},
})
