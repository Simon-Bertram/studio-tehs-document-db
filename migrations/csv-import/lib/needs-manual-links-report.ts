import type {ImportedRecord} from './audit'

const TOWNSHIP_NAMES = new Set([
	'tredyffrin',
	'easttown',
	'upper merion',
	'willistown',
	'east whiteland',
	'west whiteland',
	'radnor',
	'schuylkill',
	'upper providence',
	'malvern',
	'lower providence',
	'west norriton',
	'haverford',
	'marple',
	'charlestown',
	'norristown',
	'frazer',
	'west chester',
	'bridgeport',
	'audubon',
	'malvern borough',
])

export type LinkKind = 'township' | 'subject' | 'donation' | 'other'

export function classifyUnmappedKeyword(keyword: string): LinkKind {
	const key = keyword.trim()
	if (/^donation:/i.test(key)) return 'donation'
	if (TOWNSHIP_NAMES.has(key.toLowerCase())) return 'township'
	return 'subject'
}

export function splitUnmappedKeywords(keywords: string[]): {
	township: string
	subject: string
	donation: string
	other: string
} {
	const buckets: Record<LinkKind, string[]> = {
		township: [],
		subject: [],
		donation: [],
		other: [],
	}
	for (const keyword of keywords) {
		const trimmed = keyword.trim()
		if (!trimmed) continue
		buckets[classifyUnmappedKeyword(trimmed)].push(trimmed)
	}
	return {
		township: buckets.township.join('; '),
		subject: buckets.subject.join('; '),
		donation: buckets.donation.join('; '),
		other: buckets.other.join('; '),
	}
}

function parseKeywordList(raw: string): string[] {
	return raw
		.split(';')
		.map((part) => part.trim())
		.filter(Boolean)
}

/**
 * Markdown grouped by missing township / subject / donation so editors can
 * fix one taxonomy document, then re-run the import.
 */
export function formatNeedsManualLinksMarkdown(
	records: ImportedRecord[],
	options?: {
		naturalKeyLabel?: string
		howToFix?: string
	},
): string {
	const naturalKeyLabel = options?.naturalKeyLabel ?? 'Archive ID'
	const howToFix =
		options?.howToFix ??
		[
			'1. In Studio, open **Taxonomies & Entities**.',
			'2. Find (or create) the Township or Subject listed below.',
			'3. Set **Migration key** to the exact CSV value (any casing).',
			'4. Re-run the import so those images link automatically.',
			'5. For a `donation:N` line, open **The Archive → Donations** and confirm Donation ID `N` exists. `donation:0` is invalid in MySQL — leave unlinked.',
		].join('\n')

	if (records.length === 0) {
		return [
			'# Needs manual links',
			'',
			'None. Every imported row mapped its township, subject, and donation.',
			'',
		].join('\n')
	}

	const groups = new Map<string, {kind: LinkKind; keyword: string; rows: ImportedRecord[]}>()
	for (const record of records) {
		for (const keyword of record.unmappedKeywords) {
			const trimmed = keyword.trim()
			if (!trimmed) continue
			const kind = classifyUnmappedKeyword(trimmed)
			const mapKey = `${kind}:${trimmed.toLowerCase()}`
			let group = groups.get(mapKey)
			if (!group) {
				group = {kind, keyword: trimmed, rows: []}
				groups.set(mapKey, group)
			}
			group.rows.push(record)
		}
	}

	const kindOrder: LinkKind[] = ['township', 'subject', 'donation', 'other']
	const kindTitle: Record<LinkKind, string> = {
		township: 'Townships',
		subject: 'Subjects',
		donation: 'Donations',
		other: 'Other',
	}

	const sections: string[] = []
	for (const kind of kindOrder) {
		const kindGroups = Array.from(groups.values())
			.filter((group) => group.kind === kind)
			.sort((a, b) => b.rows.length - a.rows.length || a.keyword.localeCompare(b.keyword))
		if (kindGroups.length === 0) continue

		sections.push(`## ${kindTitle[kind]}`, '')
		for (const group of kindGroups) {
			sections.push(`### ${group.keyword} (${group.rows.length})`, '')
			sections.push(`| ${naturalKeyLabel} | Title |`)
			sections.push('| --- | --- |')
			const seen = new Set<string>()
			for (const row of group.rows) {
				if (seen.has(row.clipId)) continue
				seen.add(row.clipId)
				const title = row.title.replace(/\|/g, '\\|')
				sections.push(`| ${row.clipId} | ${title} |`)
			}
			sections.push('')
		}
	}

	return [
		'# Needs manual links',
		'',
		`${records.length} imported ${records.length === 1 ? 'document' : 'documents'} could not be linked to a Township, Subject, and/or Donation. Grouped by the missing value so you can fix one taxonomy document, then re-run the import.`,
		'',
		'## How to fix',
		'',
		howToFix,
		'',
		...sections,
	].join('\n')
}

export function recordsFromManualLinksCsv(
	rows: {
		clipId: string
		title: string
		unmappedKeywords: string
		schemaType?: string
		action?: string
		sanityId?: string
	}[],
): ImportedRecord[] {
	return rows.map((row) => ({
		clipId: row.clipId,
		title: row.title,
		csvType: '',
		schemaType: row.schemaType ?? 'historicalImage',
		action: (row.action as ImportedRecord['action']) ?? 'dry_run',
		sanityId: row.sanityId || undefined,
		mappedKeywords: [],
		unmappedKeywords: parseKeywordList(row.unmappedKeywords),
	}))
}
