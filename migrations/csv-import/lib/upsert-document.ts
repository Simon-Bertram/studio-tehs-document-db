/**
 * Live write path: find an existing published doc by archiveId, then patch
 * or create. Natural key is archiveId — never uses deterministic Sanity _ids.
 */
import type {SanityClient} from '@sanity/client'
import type {ImportDoc} from './map-row'

export type UpsertAction = 'patched' | 'created'

export async function upsertByArchiveId(
	client: SanityClient,
	doc: ImportDoc,
): Promise<{action: UpsertAction; id: string}> {
	const existingId = await client.fetch<string | null>(
		`*[_type == $type && archiveId == $archiveId && !(_id in path("drafts.**"))][0]._id`,
		{type: doc._type, archiveId: doc.archiveId},
	)

	if (existingId) {
		const {_type, ...fields} = doc
		await client.patch(existingId).set(fields).commit()
		return {action: 'patched', id: existingId}
	}

	const created = await client.create(
		doc as unknown as {[key: string]: unknown; _type: string},
	)
	return {action: 'created', id: created._id}
}
