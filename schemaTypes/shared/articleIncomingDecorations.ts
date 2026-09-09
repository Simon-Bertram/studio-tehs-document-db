import {defineIncomingReferenceDecoration} from 'sanity/structure'

import {
	appendIncomingReference,
	type IncomingReferenceArrayField,
} from '../lib/incoming-reference-array'

export type ArticleIncomingReferenceField = Extract<
	IncomingReferenceArrayField,
	'organizations' | 'peopleMentioned' | 'propertiesMentioned'
>

/**
 * Incoming TEHS Quarterly articles, Then & Now features, and research articles
 * that tag this entity via the given array-of-references field on the article.
 */
export function articleIncomingDecorations(fieldName: ArticleIncomingReferenceField) {
	return [
		defineIncomingReferenceDecoration({
			name: 'quarterlyArticles',
			title: 'TEHS Quarterly Articles',
			description: 'TEHS Quarterly articles that tag this record.',
			types: [{type: 'quarterlyArticle'}],
			onLinkDocument: appendIncomingReference(fieldName),
		}),
		defineIncomingReferenceDecoration({
			name: 'thenAndNow',
			title: 'Then & Now',
			description: 'Then & Now features that tag this record.',
			types: [{type: 'thenAndNow'}],
			onLinkDocument: appendIncomingReference(fieldName),
		}),
		defineIncomingReferenceDecoration({
			name: 'researchArticles',
			title: 'Research Articles',
			description: 'Research articles that tag this record.',
			types: [{type: 'researchArticle'}],
			onLinkDocument: appendIncomingReference(fieldName),
		}),
	]
}
