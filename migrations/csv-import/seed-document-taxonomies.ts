/**
 * Seed organization/subject migration keys used by the documents importer.
 * Idempotent: looks up by migrationKey (case-insensitive) before create/patch.
 *
 * bun run migrations/csv-import/seed-document-taxonomies.ts
 * bun run migrations/csv-import/seed-document-taxonomies.ts -- --live
 */
import {assertContentWriteAccess, createImportClient} from './lib/sanity-client'

const LINCOLN_ORG_ID = 'otUyWOFVcxQBV4wYWrsQUt'
const RAILROAD_CATEGORY_ID = 'fa943f2a-7bc9-4309-b984-874e5dcc8126'

interface SeedOrg {
	_type: 'organization' | 'business'
	name: string
	migrationKey: string
}

interface SeedCategory {
	title: string
	migrationKey: string
	migrationKeyAliases?: string[]
}

const ORGS: SeedOrg[] = [
	{_type: 'organization', name: 'Educational Home', migrationKey: 'EH'},
	{_type: 'business', name: 'Devon Inn', migrationKey: 'DevInn'},
	{_type: 'organization', name: 'Ponemah', migrationKey: 'Ponemah'},
]

const CATEGORIES: SeedCategory[] = [
	{title: 'Death records', migrationKey: 'Death'},
	{title: 'Annual reports', migrationKey: 'AnnualReport'},
	{title: 'Newspapers', migrationKey: 'Newspaper'},
	{title: 'Census', migrationKey: 'Census'},
	{title: 'Scholarships', migrationKey: 'Scholarships'},
	{title: 'Research', migrationKey: 'Research'},
]

async function main() {
	const live = process.argv.includes('--live')
	const client = createImportClient({dryRun: !live})
	if (live) await assertContentWriteAccess(client)

	const existingOrgs = await client.fetch<{_id: string; migrationKey?: string}[]>(
		`*[_type in ["organization", "business"] && defined(migrationKey)]{_id, migrationKey}`,
	)
	const orgByKey = new Map(
		existingOrgs
			.filter((doc) => doc.migrationKey)
			.map((doc) => [doc.migrationKey!.trim().toLowerCase(), doc._id]),
	)

	const existingCats = await client.fetch<
		{_id: string; migrationKey?: string; migrationKeyAliases?: string[]}[]
	>(`*[_type == "category" && defined(migrationKey)]{_id, migrationKey, migrationKeyAliases}`)
	const catByKey = new Map(
		existingCats
			.filter((doc) => doc.migrationKey)
			.map((doc) => [doc.migrationKey!.trim().toLowerCase(), doc._id]),
	)

	if (!live) {
		console.log('--- Seed document taxonomies (DRY RUN) ---')
	}

	if (live) {
		await client
			.patch(LINCOLN_ORG_ID)
			.set({migrationKeyAliases: ['LI']})
			.commit()
		console.log('[OK] Lincoln Institution aliases: LI')
		const railroad = existingCats.find((doc) => doc._id === RAILROAD_CATEGORY_ID)
		const aliases = new Set(
			(railroad?.migrationKeyAliases ?? []).map((alias) => alias.trim()).filter(Boolean),
		)
		aliases.add('BerwynRR')
		await client
			.patch(RAILROAD_CATEGORY_ID)
			.set({migrationKeyAliases: [...aliases]})
			.commit()
		console.log('[OK] Railroad category aliases include BerwynRR')
	} else {
		console.log('[DRY RUN] Would set Lincoln Institution alias LI')
		console.log('[DRY RUN] Would add BerwynRR alias on Railroad')
	}

	for (const org of ORGS) {
		const existing = orgByKey.get(org.migrationKey.toLowerCase())
		if (existing) {
			console.log(`[skip] ${org._type} ${org.name} already has key ${org.migrationKey}`)
			continue
		}
		if (!live) {
			console.log(`[DRY RUN] Would create ${org._type}: ${org.name} (${org.migrationKey})`)
			continue
		}
		const created = await client.create({
			_type: org._type,
			name: org.name,
			migrationKey: org.migrationKey,
		})
		console.log(`[OK] created ${org._type}: ${org.name} (${created._id})`)
	}

	for (const category of CATEGORIES) {
		const existing = catByKey.get(category.migrationKey.toLowerCase())
		if (existing) {
			console.log(`[skip] category ${category.title} already has key ${category.migrationKey}`)
			continue
		}
		if (!live) {
			console.log(`[DRY RUN] Would create category: ${category.title} (${category.migrationKey})`)
			continue
		}
		const created = await client.create({
			_type: 'category',
			title: category.title,
			migrationKey: category.migrationKey,
			...(category.migrationKeyAliases ? {migrationKeyAliases: category.migrationKeyAliases} : {}),
		})
		console.log(`[OK] created category: ${category.title} (${created._id})`)
	}
}

await main()
