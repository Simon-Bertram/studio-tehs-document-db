/**
 * One-off: set slug.current on quarterlyArticle docs that lack a URL Slug.
 *
 *   bun run migrations/quarterly-import/backfill-article-slugs.ts
 *   bun run migrations/quarterly-import/backfill-article-slugs.ts --live
 */
import {assertContentWriteAccess, createImportClient} from '../csv-import/lib/sanity-client'
import {articleSlug, slugField} from './lib/article-source-key'
import {loadTakenArticleSlugs} from './lib/load-article-slugs'

const live = process.argv.includes('--live')

type MissingSlugRow = {
	_id: string
	title?: string | null
	sourceKey?: string | null
}

async function main() {
	const client = createImportClient({dryRun: !live})
	if (live) await assertContentWriteAccess(client)

	const missing = await client.fetch<MissingSlugRow[]>(
		`*[_type == "quarterlyArticle" && !defined(slug.current) && !(_id in path("drafts.**"))]{
			_id, title, sourceKey
		} | order(sourceKey asc)`,
	)

	const taken = await loadTakenArticleSlugs(client)
	console.log(
		`--- Backfill quarterlyArticle slugs (${live ? 'LIVE' : 'DRY RUN'}) ---`,
	)
	console.log(`Missing slug: ${missing.length}; already taken: ${taken.size}`)

	let assigned = 0
	for (const row of missing) {
		const title = row.title?.trim() || 'Untitled'
		const sourceKey = row.sourceKey?.trim() || row._id
		const current = articleSlug(title, sourceKey, taken)
		assigned += 1
		console.log(`[${live ? 'PATCH' : 'DRY RUN'}] ${sourceKey} → ${current}`)
		if (!live) continue
		await client.patch(row._id).set({slug: slugField(current)}).commit()
	}

	console.log(`Done. Assigned ${assigned} slug(s).`)
}

main().catch((err) => {
	console.error('Slug backfill failed:', err)
	process.exit(1)
})
