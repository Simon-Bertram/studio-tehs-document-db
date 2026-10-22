/**
 * Resolve Sanity quarterlyIssue document IDs by sourceKey.
 */
import type {SanityClient} from '@sanity/client'

/**
 * Fetch published quarterlyIssue IDs keyed by sourceKey.
 * Optionally restrict to one volume (via sourceKey prefix v{N}n).
 */
export async function fetchIssueIdsBySourceKey(
	client: SanityClient,
	options?: {volume?: number},
): Promise<Map<string, string>> {
	const volume = options?.volume
	const filter =
		volume != null
			? `*[_type == "quarterlyIssue" && volume == $volume && defined(sourceKey) && !(_id in path("drafts.**"))]{_id, sourceKey}`
			: `*[_type == "quarterlyIssue" && defined(sourceKey) && !(_id in path("drafts.**"))]{_id, sourceKey}`

	const rows = await client.fetch<Array<{_id: string; sourceKey: string}>>(
		filter,
		volume != null ? {volume} : {},
	)

	const map = new Map<string, string>()
	for (const row of rows) {
		if (row.sourceKey) map.set(row.sourceKey, row._id)
	}
	return map
}

/** Merge this-run upsert IDs into an existing map (later wins). */
export function mergeIssueIdMaps(
	base: Map<string, string>,
	extra: Map<string, string> | Iterable<[string, string]>,
): Map<string, string> {
	const out = new Map(base)
	for (const [key, id] of extra) out.set(key, id)
	return out
}

/** Dry-run / preview reference when the Sanity _id is not yet known. */
export function pendingIssueRef(sourceKey: string): {
	_type: 'reference'
	_ref: string
} {
	return {_type: 'reference', _ref: `pending:${sourceKey}`}
}
