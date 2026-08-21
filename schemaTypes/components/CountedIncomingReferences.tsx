import {type ReactNode, useEffect, useState} from 'react'
import {type DecorationMember, getPublishedId, useClient} from 'sanity'
import {
	defineIncomingReferenceDecoration,
	type IncomingReferencesOptions,
	useDocumentPane,
} from 'sanity/structure'

import {SANITY_API_VERSION} from '../../lib/sanityEnv'

const COUNT_QUERY = `count(*[
	_type == $type &&
	references($id) &&
	(_id in path("drafts.**") || !defined(*[_id == "drafts." + ^._id][0]._id))
])`

/**
 * Incoming-reference decoration whose heading includes a live unique-document
 * count when at least one matching document exists (e.g. "Primary Source (3)").
 */
export function CountedIncomingReferences(options: IncomingReferencesOptions): ReactNode {
	const {documentId} = useDocumentPane()
	const client = useClient({apiVersion: SANITY_API_VERSION})
	const [count, setCount] = useState<number>()
	const documentType = options.types[0]?.type
	const publishedId = documentId ? getPublishedId(documentId) : ''

	useEffect(() => {
		if (!publishedId || !documentType) return undefined

		const params = {id: publishedId, type: documentType}
		let cancelled = false

		const updateCount = () => {
			client.fetch<number>(COUNT_QUERY, params).then(
				(value) => {
					if (!cancelled) setCount(value)
				},
				() => {
					if (!cancelled) setCount(undefined)
				},
			)
		}

		setCount(undefined)
		updateCount()
		const subscription = client
			.listen(`*[_type == $type && references($id)]{_id}`, params)
			.subscribe({next: updateCount})

		return () => {
			cancelled = true
			subscription.unsubscribe()
		}
	}, [client, documentType, publishedId])

	const label = options.title ?? options.name
	const title = count != null && count >= 1 ? `${label} (${count})` : label

	return defineIncomingReferenceDecoration({...options, title}).component as ReactNode
}

export function defineCountedIncomingReferenceDecoration(
	options: IncomingReferencesOptions,
): DecorationMember {
	return {
		kind: 'decoration',
		key: options.name,
		component: <CountedIncomingReferences {...options} />,
	}
}
