/**
 * Shared GROQ for archive documents tagged with a Subject Category
 * (`primarySource` / `historicalImage` via `subjects`).
 */

export const CATEGORY_DOCUMENTS_FILTER =
	'_type in ["primarySource", "historicalImage"] && references($categoryId)'

export const CATEGORY_DOCUMENTS_COUNT_QUERY = `count(*[
	_type in ["primarySource", "historicalImage"] &&
	references($id) &&
	(_id in path("drafts.**") || !defined(*[_id == "drafts." + ^._id][0]._id))
])`

export function formatCategoryDocumentCount(count: number) {
	return count === 1 ? '1 document' : `${count} documents`
}
