/**
 * Flag a diversified set of Tredyffrin/Easttown photographs for the public
 * highlight grid. Does not auto-flag the whole catalog.
 *
 *   bun run migrations/seed-featured-images.ts
 */
import {assertContentWriteAccess, createImportClient} from './csv-import/lib/sanity-client'

const FUZZY = new Set(['person', 'people', 'place', 'view', 'cultural'])
const CONCRETE = new Set(['house', 'church', 'school', 'railroad', 'inn', 'farm', 'mill'])
const CORE = new Set(['tredyffrin', 'easttown'])
const LIMIT = 24

type Candidate = {
	_id: string
	title?: string
	archiveId?: string
	description?: string
	year?: number
	township?: string
	subjects?: string[]
}

function score(image: Candidate): number {
	const title = (image.title ?? '').toLowerCase()
	if (!title || title.startsWith('untitled')) return -1000
	if (/^ola/i.test(image.archiveId ?? '')) return -1000
	let value = 0
	const township = (image.township ?? '').toLowerCase()
	if (CORE.has(township)) value += 40
	if (image.year) {
		value += 25
		if (image.year >= 1900 && image.year <= 1930) value += 15
	}
	const subjects = (image.subjects ?? []).map((item) => item.toLowerCase())
	if (subjects.some((item) => CONCRETE.has(item))) value += 20
	if (subjects.length > 0 && subjects.every((item) => FUZZY.has(item))) value -= 30
	if (image.description?.trim()) value += 10
	return value
}

function pick(candidates: Candidate[]): Candidate[] {
	const ranked = [...candidates]
		.sort((a, b) => score(b) - score(a))
		.filter((item) => score(item) > 0)
	const chosen: Candidate[] = []
	const subjectCounts = new Map<string, number>()
	const decadeCounts = new Map<number, number>()
	for (const image of ranked) {
		if (chosen.length >= LIMIT) break
		const primary = (image.subjects?.[0] ?? '').toLowerCase()
		const decade = image.year ? Math.floor(image.year / 10) * 10 : undefined
		if (primary && (subjectCounts.get(primary) ?? 0) >= 4) continue
		if (decade != null && (decadeCounts.get(decade) ?? 0) >= 4) continue
		chosen.push(image)
		if (primary) subjectCounts.set(primary, (subjectCounts.get(primary) ?? 0) + 1)
		if (decade != null) decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1)
	}
	return chosen
}

async function main() {
	const client = createImportClient({dryRun: false})
	await assertContentWriteAccess(client)

	const candidates = await client.fetch<Candidate[]>(
		`*[_type == "historicalImage" && defined(imageFile.asset) && defined(dateTaken.year) && defined(description) && defined(title) && township->name in ["Tredyffrin", "Easttown"]][0...200]{
			_id,
			title,
			archiveId,
			description,
			"year": dateTaken.year,
			"township": township->name,
			"subjects": subjects[]->title
		}`,
	)

	const chosen = pick(candidates)
	if (chosen.length === 0) {
		console.log('No qualifying images found. Nothing was changed.')
		return
	}

	const chosenIds = new Set(chosen.map((image) => image._id))
	const previouslyFeatured = await client.fetch<string[]>(
		`*[_type == "historicalImage" && featuredOnSite == true]._id`,
	)

	const transaction = client.transaction()
	for (const id of previouslyFeatured) {
		if (!chosenIds.has(id)) {
			transaction.patch(id, {unset: ['featuredOnSite', 'featuredRank']})
		}
	}
	chosen.forEach((image, index) => {
		transaction.patch(image._id, {
			set: {featuredOnSite: true, featuredRank: index + 1},
		})
	})
	await transaction.commit()

	console.log(`Featured ${chosen.length} images:`)
	for (const [index, image] of chosen.entries()) {
		console.log(`  ${index + 1}. ${image.archiveId ?? image._id} — ${image.title}`)
	}
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err)
	process.exit(1)
})
