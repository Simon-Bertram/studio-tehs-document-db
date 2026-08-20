import {DocumentsIcon} from '@sanity/icons/Documents'
import {TagIcon} from '@sanity/icons/Tag'
import type {StructureBuilder} from 'sanity/structure'

import {SANITY_API_VERSION} from '../lib/sanityEnv'
import {CATEGORY_DOCUMENTS_FILTER} from './category-documents'

export function subjectCategoriesListItem(S: StructureBuilder) {
	return S.documentTypeListItem('category')
		.title('Subject Categories')
		.icon(TagIcon)
		.child(
			S.documentTypeList('category')
				.title('Subject Categories')
				.child((categoryId) =>
					S.list()
						.title('Category')
						.items([
							S.listItem()
								.id('edit')
								.title('Edit category')
								.icon(TagIcon)
								.child(S.document().schemaType('category').documentId(categoryId)),
							S.listItem()
								.id('documents')
								.title('Documents')
								.icon(DocumentsIcon)
								.child(
									S.documentList()
										.apiVersion(SANITY_API_VERSION)
										.title('Documents')
										.filter(CATEGORY_DOCUMENTS_FILTER)
										.params({categoryId}),
								),
						]),
				),
		)
}
