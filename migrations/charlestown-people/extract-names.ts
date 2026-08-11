/**
 * Extract unique person names from the Charlestown landowner index HTML.
 *
 * Usage:
 *   bun run migrations/charlestown-people/extract-names.ts
 *   bun run migrations/charlestown-people/extract-names.ts -- --input path/to/Charlestown.html
 */

import {readFileSync, writeFileSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseHTML} from 'linkedom'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEFAULT_INPUT = join(__dirname, 'Charlestown.html')
const PEOPLE_OUT = join(__dirname, 'unique-people.csv')
const ALIASES_OUT = join(__dirname, 'surname-aliases.csv')

/** First-name forms to collapse before uniqueness (typos / clear variants). */
const FIRST_NAME_CANONICAL: Record<string, string> = {
	ezekial: 'Ezekiel',
	geiorge: 'George',
	annue: 'Annie',
	susannah: 'Susanna',
	isabella: 'Isabel',
	catharine: 'Catherine',
	harriett: 'Harriet',
	margret: 'Margaret',
	madeline: 'Madeline',
}

/**
 * Full display-name merges (index typos). Key = casefold source, value = canonical display.
 */
const FULL_NAME_MERGES: Record<string, string> = {
	'john bryers': 'John Byers',
	'benjamin bower': 'Benjamin Boyer',
	'geiorge w. bean': 'George W. Bean',
	'annue bean': 'Annie Bean',
}

const NON_PERSON_RE =
	/\b(company|district|school)\b|&|\band\b|,/i

type RawEntry = {
	displayName: string
	role: string
}

type PersonRow = {
	firstName: string
	lastName: string
	prefix: string
	suffix: string
	alternateSpellings: string[]
	sourceNames: string[]
	roles: string[]
}

function parseArgs(argv: string[]) {
	let input = DEFAULT_INPUT
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--input' && argv[i + 1]) {
			input = resolve(argv[i + 1])
			i++
		}
	}
	return {input}
}

function decodeEntities(text: string): string {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&rsquo;/g, '\u2019')
		.replace(/&lsquo;/g, '\u2018')
		.replace(/&rdquo;/g, '\u201d')
		.replace(/&ldquo;/g, '\u201c')
		.replace(/&nbsp;/g, ' ')
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
}

function normalizeWhitespace(text: string): string {
	return text.replace(/\s+/g, ' ').trim()
}

function casefold(text: string): string {
	return normalizeWhitespace(text).toLocaleLowerCase('en-US')
}

function isNonPerson(displayName: string): boolean {
	const n = displayName.trim()
	if (!n) return true
	if (/^see\b/i.test(n)) return true
	if (NON_PERSON_RE.test(n)) return true
	return false
}

function extractRole(raw: string): string | null {
	const text = normalizeWhitespace(decodeEntities(raw)).replace(/^-\s*/, '')
	const m = text.match(
		/^(deed|patent|neighbor|atlas|taxes|quit rent)(?:\s+\d+)?(?:\s*\([^)]*\))?/i,
	)
	if (!m) return null
	return m[1].toLowerCase()
}

function extractIndexEntries(html: string): RawEntry[] {
	const {document} = parseHTML(html)
	const entries: RawEntry[] = []

	for (const li of Array.from(document.querySelectorAll('li'))) {
		const anchor = li.querySelector('a')
		if (!anchor) continue
		const displayName = normalizeWhitespace(
			decodeEntities(anchor.textContent || ''),
		)
		if (!displayName || /^see\b/i.test(displayName)) continue

		const liText = normalizeWhitespace(decodeEntities(li.textContent || ''))
		const after = normalizeWhitespace(
			liText.replace(displayName, '').replace(/^-\s*/, ''),
		)
		const role = extractRole(after)
		if (!role) continue

		entries.push({displayName, role})
	}

	return entries
}

function extractSurnameAliases(html: string): {from: string; to: string; note: string}[] {
	const {document} = parseHTML(html)
	const rows: {from: string; to: string; note: string}[] = []

	// Intro examples: Buchwalder/Buckwalter, …
	const intro = document.body?.textContent || ''
	const introMatch = intro.match(
		/variable,\s*e\.g\.\s*([^.]+)\./i,
	)
	if (introMatch) {
		for (const group of introMatch[1].split(',')) {
			const forms = group
				.replace(/^\s*and\s+/i, '')
				.split('/')
				.map((s) => normalizeWhitespace(s))
				.filter(Boolean)
			if (forms.length < 2) continue
			const canonical = forms[forms.length - 1]
			for (const form of forms.slice(0, -1)) {
				rows.push({
					from: form,
					to: canonical,
					note: 'Intro note: historically variable surnames (do not auto-merge people)',
				})
			}
		}
	}

	for (const li of Array.from(document.querySelectorAll('li'))) {
		if (li.querySelector('a')) continue
		const text = normalizeWhitespace(decodeEntities(li.textContent || ''))
		if (!/see/i.test(text)) continue

		const m = text.match(
			/^(.+?)\s*[-–]?\s*(?:also\s+)?see(?:\s+also)?\s+(.+)$/i,
		)
		if (!m) continue
		const from = normalizeWhitespace(m[1].replace(/\s+or\s+/gi, ' / '))
		const to = normalizeWhitespace(m[2])
		rows.push({
			from,
			to,
			note: 'Index cross-reference (surname search aid; not a person row)',
		})
	}

	return rows
}

const PREFIXES = [
	'Capt.',
	'Captain',
	'Rev.',
	'Reverend',
	'Dr.',
	'Doctor',
	'Justice',
	'Judge',
	'Col.',
	'Colonel',
	'Maj.',
	'Major',
	'Gen.',
	'General',
	'Lt.',
	'Lieut.',
	'Sgt.',
	'Mrs.',
	'Mr.',
	'Miss',
]

const SUFFIXES = ['Jr.', 'Jr', 'Sr.', 'Sr', 'II', 'III', 'IV', 'Deceased', 'Esq.', 'Esq']

function splitName(displayName: string): {
	prefix: string
	firstName: string
	lastName: string
	suffix: string
	aliasNote: string
} {
	let working = normalizeWhitespace(displayName)
	let aliasNote = ''

	const paren = working.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
	if (paren) {
		working = normalizeWhitespace(paren[1])
		aliasNote = normalizeWhitespace(paren[2])
	}

	// Index noise like "George Weed 1" (tract counter glued into link text)
	working = working.replace(/\s+\d+$/, '')

	let tokens = working.split(' ').filter(Boolean)
	let prefix = ''
	let suffix = ''

	if (
		tokens.length > 1 &&
		PREFIXES.some((p) => casefold(p) === casefold(tokens[0]))
	) {
		prefix = tokens[0]
		tokens = tokens.slice(1)
	}

	if (
		tokens.length > 1 &&
		SUFFIXES.some((s) => casefold(s) === casefold(tokens[tokens.length - 1]))
	) {
		suffix = tokens[tokens.length - 1]
		tokens = tokens.slice(0, -1)
	}

	if (aliasNote && casefold(aliasNote) === 'deceased' && !suffix) {
		suffix = 'Deceased'
		aliasNote = ''
	}

	if (tokens.length === 0) {
		return {
			prefix,
			firstName: displayName,
			lastName: 'Unknown',
			suffix,
			aliasNote,
		}
	}
	if (tokens.length === 1) {
		return {
			prefix,
			firstName: tokens[0],
			lastName: tokens[0],
			suffix,
			aliasNote,
		}
	}

	const lastName = tokens[tokens.length - 1]
	const firstName = tokens.slice(0, -1).join(' ')
	return {prefix, firstName, lastName, suffix, aliasNote}
}

function canonicalizeFirstName(firstName: string): {canonical: string; original?: string} {
	const parts = firstName.split(' ')
	const mapped = parts.map((part) => {
		const key = casefold(part.replace(/\./g, ''))
		// Only map whole given names / clear typos, not bare initials
		if (part.length <= 2 && part.endsWith('.')) return part
		const canon = FIRST_NAME_CANONICAL[casefold(part)]
		return canon || part
	})
	const canonical = mapped.join(' ')
	if (casefold(canonical) === casefold(firstName)) {
		return {canonical: firstName}
	}
	return {canonical, original: firstName}
}

function applyDisplayMerges(displayName: string): {canonical: string; original?: string} {
	const merged = FULL_NAME_MERGES[casefold(displayName)]
	if (merged && casefold(merged) !== casefold(displayName)) {
		return {canonical: merged, original: displayName}
	}
	return {canonical: displayName}
}

function csvEscape(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

function toCsv(headers: string[], rows: string[][]): string {
	const lines = [headers.join(',')]
	for (const row of rows) {
		lines.push(row.map(csvEscape).join(','))
	}
	return lines.join('\n') + '\n'
}

function buildPeople(entries: RawEntry[]): PersonRow[] {
	type Acc = {
		prefix: string
		firstName: string
		lastName: string
		suffix: string
		alternateSpellings: Set<string>
		sourceNames: Set<string>
		roles: Set<string>
	}

	const byKey = new Map<string, Acc>()

	for (const entry of entries) {
		if (isNonPerson(entry.displayName)) continue

		const displayMerge = applyDisplayMerges(entry.displayName)
		let workingName = displayMerge.canonical
		const sourceNames = new Set<string>([entry.displayName])
		if (displayMerge.original) sourceNames.add(displayMerge.original)

		const split = splitName(workingName)
		const firstCanon = canonicalizeFirstName(split.firstName)
		const firstName = firstCanon.canonical
		const lastName = split.lastName
		const prefix = split.prefix
		const suffix = split.suffix

		const alternateSpellings = new Set<string>()
		if (
			firstCanon.original &&
			casefold(firstCanon.original) !== casefold(firstName)
		) {
			alternateSpellings.add(`${firstCanon.original} ${lastName}`.trim())
		}
		if (displayMerge.original) {
			alternateSpellings.add(displayMerge.original)
		}
		if (split.aliasNote) {
			alternateSpellings.add(`${firstName} ${lastName} (${split.aliasNote})`)
			alternateSpellings.add(split.aliasNote)
		}

		const key = [
			casefold(prefix),
			casefold(firstName),
			casefold(lastName),
			casefold(suffix),
		].join('|')

		let acc = byKey.get(key)
		if (!acc) {
			acc = {
				prefix,
				firstName,
				lastName,
				suffix,
				alternateSpellings: new Set(),
				sourceNames: new Set(),
				roles: new Set(),
			}
			byKey.set(key, acc)
		}

		for (const s of sourceNames) acc.sourceNames.add(s)
		for (const a of alternateSpellings) {
			const assembled = [prefix, firstName, lastName, suffix].filter(Boolean).join(' ')
			if (casefold(a) !== casefold(assembled)) acc.alternateSpellings.add(a)
		}
		acc.roles.add(entry.role)
	}

	const rows: PersonRow[] = [...byKey.values()].map((acc) => ({
		prefix: acc.prefix,
		firstName: acc.firstName,
		lastName: acc.lastName,
		suffix: acc.suffix,
		alternateSpellings: [...acc.alternateSpellings].sort((a, b) =>
			a.localeCompare(b),
		),
		sourceNames: [...acc.sourceNames].sort((a, b) => a.localeCompare(b)),
		roles: [...acc.roles].sort((a, b) => a.localeCompare(b)),
	}))

	rows.sort(
		(a, b) =>
			a.lastName.localeCompare(b.lastName) ||
			a.firstName.localeCompare(b.firstName) ||
			a.suffix.localeCompare(b.suffix),
	)

	return rows
}

function main() {
	const {input} = parseArgs(process.argv.slice(2))
	const html = readFileSync(input, 'utf8')
	const entries = extractIndexEntries(html)
	const people = buildPeople(entries)
	const aliases = extractSurnameAliases(html)

	const peopleCsv = toCsv(
		[
			'firstName',
			'lastName',
			'prefix',
			'suffix',
			'alternateSpellings',
			'sourceNames',
			'roles',
		],
		people.map((p) => [
			p.firstName,
			p.lastName,
			p.prefix,
			p.suffix,
			p.alternateSpellings.join('|'),
			p.sourceNames.join('|'),
			p.roles.join('|'),
		]),
	)

	const aliasesCsv = toCsv(
		['from', 'to', 'note'],
		aliases.map((a) => [a.from, a.to, a.note]),
	)

	writeFileSync(PEOPLE_OUT, peopleCsv)
	writeFileSync(ALIASES_OUT, aliasesCsv)

	console.log(`Input: ${input}`)
	console.log(`Index entries: ${entries.length}`)
	console.log(`Unique people: ${people.length} → ${PEOPLE_OUT}`)
	console.log(`Surname aliases: ${aliases.length} → ${ALIASES_OUT}`)
}

main()
