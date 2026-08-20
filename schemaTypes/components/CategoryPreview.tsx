import {useEffect, useMemo, useState} from 'react'
import {useClient} from 'sanity'

import {SANITY_API_VERSION} from '../../lib/sanityEnv'
import {
	CATEGORY_DOCUMENTS_COUNT_QUERY,
	formatCategoryDocumentCount,
} from '../../structure/category-documents'

interface CategoryPreviewProps {
	documentId?: string
	description?: string
}

export function CategoryPreview({documentId, description}: CategoryPreviewProps) {
	const client = useClient({apiVersion: SANITY_API_VERSION})
	const [count, setCount] = useState<number>()

	useEffect(() => {
		if (!documentId) return undefined

		let cancelled = false
		client
			.fetch<number>(CATEGORY_DOCUMENTS_COUNT_QUERY, {id: documentId})
			.then((value) => {
				if (!cancelled) setCount(value)
			})
			.catch(() => {
				if (!cancelled) setCount(undefined)
			})

		return () => {
			cancelled = true
		}
	}, [client, documentId])

	const label = useMemo(() => {
		if (count == null) return description
		const countLabel = formatCategoryDocumentCount(count)
		return description ? `${countLabel} · ${description}` : countLabel
	}, [count, description])

	return label ?? null
}
