/**
 * Load existing quarterlyArticle slug.current values for uniqueness.
 */
import type {SanityClient} from '@sanity/client'

export async function loadTakenArticleSlugs(client: SanityClient): Promise<Set<string>> {
	const rows = await client.fetch<Array<{slug: string | null}>>(
		`*[_type == "quarterlyArticle" && defined(slug.current) && !(_id in path("drafts.**"))]{
			"slug": slug.current
		}`,
	)
	const taken = new Set<string>()
	for (const row of rows ?? []) {
		if (row.slug) taken.add(row.slug)
	}
	return taken
}

/** Map sourceKey → existing slug.current for sparse upserts. */
export async function loadArticleSlugsBySourceKey(
	client: SanityClient,
): Promise<Map<string, string>> {
	const rows = await client.fetch<Array<{sourceKey: string | null; slug: string | null}>>(
		`*[_type == "quarterlyArticle" && defined(sourceKey) && !(_id in path("drafts.**"))]{
			sourceKey,
			"slug": slug.current
		}`,
	)
	const map = new Map<string, string>()
	for (const row of rows ?? []) {
		if (row.sourceKey && row.slug) map.set(row.sourceKey, row.slug)
	}
	return map
}
