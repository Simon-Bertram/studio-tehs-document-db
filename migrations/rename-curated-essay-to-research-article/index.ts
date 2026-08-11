import {at, defineMigration, set} from 'sanity/migrate'

/**
 * Rename curatedEssay document type to researchArticle.
 */
export default defineMigration({
	title: 'Rename curatedEssay document type to researchArticle',
	documentTypes: ['curatedEssay'],
	migrate: {
		document() {
			return at('_type', set('researchArticle'))
		},
	},
})
