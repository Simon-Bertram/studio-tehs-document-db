/**
 * Live upsert by an arbitrary equality filter (natural key).
 * Never uses deterministic Sanity _ids.
 */
import type {SanityClient} from '@sanity/client'

export type UpsertAction = 'patched' | 'created'

export async function upsertByQuery(
	client: SanityClient,
	doc: {[key: string]: unknown; _type: string},
	filter: string,
	params: Record<string, unknown>,
): Promise<{action: UpsertAction; id: string}> {
	const existingId = await client.fetch<string | null>(
		`*[${filter} && !(_id in path("drafts.**"))][0]._id`,
		params,
	)

	if (existingId) {
		const {_type, ...fields} = doc
		await client.patch(existingId).set(fields).commit()
		return {action: 'patched', id: existingId}
	}

	const created = await client.create(doc)
	return {action: 'created', id: created._id}
}
