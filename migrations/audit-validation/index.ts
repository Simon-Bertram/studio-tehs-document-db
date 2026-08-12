/**
 * Read-only GROQ audit for validation-hardening blockers.
 * Exit 1 if any blocker count is > 0.
 *
 * Usage: bun run audit:validation
 */
import {createImportClient} from '../csv-import/lib/sanity-client'

const ARCHIVE_TYPES = [
	'primarySource',
	'historicalImage',
	'deed',
	'researchArticle',
] as const

const SAMPLE_LIMIT = 20

interface IdSample {
	_id: string
}

interface AuditSection {
	label: string
	count: number
	samples: string[]
}

function printSection(section: AuditSection) {
	const status = section.count === 0 ? 'ok' : 'BLOCKER'
	console.log(`\n[${status}] ${section.label}: ${section.count}`)
	if (section.samples.length > 0) {
		for (const id of section.samples) {
			console.log(`  - ${id}`)
		}
		if (section.count > section.samples.length) {
			console.log(`  … and ${section.count - section.samples.length} more`)
		}
	}
}

async function sampleIds(
	client: ReturnType<typeof createImportClient>,
	query: string,
	params: Record<string, unknown> = {},
): Promise<{count: number; samples: string[]}> {
	const [count, samples] = await Promise.all([
		client.fetch<number>(`count(${query})`, params),
		client.fetch<IdSample[]>(`${query}[0...${SAMPLE_LIMIT}]{_id}`, params),
	])
	return {count, samples: samples.map((d) => d._id)}
}

async function main() {
	const client = createImportClient({dryRun: true})
	const sections: AuditSection[] = []

	console.log('Validation hardening audit')
	console.log(`project=${client.config().projectId} dataset=${client.config().dataset}`)

	for (const type of ARCHIVE_TYPES) {
		const missing = await sampleIds(
			client,
			`*[_type == $type && (!defined(archiveId) || archiveId == "")]`,
			{type},
		)
		sections.push({
			label: `${type}: missing/empty archiveId`,
			...missing,
		})

		// Published only — draft+published of the same doc share identity fields.
		const duplicates = await sampleIds(
			client,
			`*[
				_type == $type &&
				!(_id in path("drafts.**")) &&
				defined(archiveId) &&
				archiveId != "" &&
				count(*[
					_type == $type &&
					!(_id in path("drafts.**")) &&
					archiveId == ^.archiveId
				]) > 1
			]`,
			{type},
		)
		sections.push({
			label: `${type}: duplicate archiveId`,
			...duplicates,
		})
	}

	const missingSlug = await sampleIds(
		client,
		`*[_type == "researchArticle" && (!defined(slug.current) || slug.current == "")]`,
	)
	sections.push({label: 'researchArticle: missing slug.current', ...missingSlug})

	const duplicateSlug = await sampleIds(
		client,
		`*[
			_type == "researchArticle" &&
			!(_id in path("drafts.**")) &&
			defined(slug.current) &&
			slug.current != "" &&
			count(*[
				_type == "researchArticle" &&
				!(_id in path("drafts.**")) &&
				slug.current == ^.slug.current
			]) > 1
		]`,
	)
	sections.push({label: 'researchArticle: duplicate slug.current', ...duplicateSlug})

	const missingDonationName = await sampleIds(
		client,
		`*[_type == "donation" && (!defined(name) || name == "")]`,
	)
	sections.push({label: 'donation: missing/empty name', ...missingDonationName})

	const missingDonationId = await sampleIds(
		client,
		`*[_type == "donation" && !defined(donationId)]`,
	)
	sections.push({label: 'donation: missing donationId', ...missingDonationId})

	const missingDonationBoth = await sampleIds(
		client,
		`*[_type == "donation" && (!defined(name) || name == "") && !defined(donationId)]`,
	)
	sections.push({label: 'donation: missing both name and donationId', ...missingDonationBoth})

	const duplicateDonationId = await sampleIds(
		client,
		`*[
			_type == "donation" &&
			!(_id in path("drafts.**")) &&
			defined(donationId) &&
			count(*[
				_type == "donation" &&
				!(_id in path("drafts.**")) &&
				donationId == ^.donationId
			]) > 1
		]`,
	)
	sections.push({label: 'donation: duplicate donationId', ...duplicateDonationId})

	const missingBusinessType = await sampleIds(
		client,
		`*[_type == "business" && (!defined(businessType) || businessType == "")]`,
	)
	sections.push({label: 'business: missing/empty businessType', ...missingBusinessType})

	const incompleteRelatives = await sampleIds(
		client,
		`*[_type == "person" && count((immediateRelatives[])[!defined(relative._ref) || !defined(relationshipType) || relationshipType == ""]) > 0]`,
	)
	sections.push({
		label: 'person: incomplete immediateRelatives rows',
		...incompleteRelatives,
	})

	let blockers = 0
	for (const section of sections) {
		printSection(section)
		if (section.count > 0) blockers += section.count
	}

	console.log('\n---')
	if (blockers > 0) {
		console.error(`FAIL: ${blockers} blocker document(s) across checks above.`)
		process.exit(1)
	}

	console.log('PASS: no validation blockers found.')
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err)
	process.exit(1)
})
