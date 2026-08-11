/**
 * Charlestown unique-people.csv → Sanity person import.
 * Dry-run by default; near-duplicate pairs are held for review.
 */
import fs from 'node:fs'
import path from 'node:path'

import type {SanityClient} from '@sanity/client'
import pLimit from 'p-limit'

import {SANITY_DATASET, SANITY_PROJECT_ID} from '../../../lib/sanityEnv'
import type {ImportConfig} from '../../csv-import/lib/cli-config'
import {readCsvRows} from '../../csv-import/lib/read-csv'
import {hasAuthToken} from '../../csv-import/lib/sanity-client'
import {findSuspectPairs, type PeopleCsvRow, peopleRowKey} from './suspects'

const CONCURRENCY = 5

export type PersonImportDoc = {
	_type: 'person'
	firstName: string
	lastName: string
	prefix?: string
	suffix?: string
	alternateSpellings?: string[]
}

type ExistingPerson = {
	_id: string
	firstName: string
	lastName: string
	prefix?: string
	suffix?: string
}

type ImportedRecord = {
	key: string
	firstName: string
	lastName: string
	prefix: string
	suffix: string
	action: string
	sanityId: string
}

type SkippedRecord = {
	key: string
	firstName: string
	lastName: string
	prefix: string
	suffix: string
	reason: string
	detail: string
}

function casefold(text: string): string {
	return text.replace(/\s+/g, ' ').trim().toLocaleLowerCase('en-US')
}

function existingKey(p: {
	firstName: string
	lastName: string
	prefix?: string
	suffix?: string
}): string {
	return [
		casefold(p.prefix || ''),
		casefold(p.firstName || ''),
		casefold(p.lastName || ''),
		casefold(p.suffix || ''),
	].join('|')
}

function mapRow(row: PeopleCsvRow): PersonImportDoc | null {
	const firstName = (row.firstName || '').trim()
	const lastName = (row.lastName || '').trim()
	if (!firstName || !lastName) return null

	const doc: PersonImportDoc = {
		_type: 'person',
		firstName,
		lastName,
	}

	const prefix = (row.prefix || '').trim()
	const suffix = (row.suffix || '').trim()
	if (prefix) doc.prefix = prefix
	if (suffix) doc.suffix = suffix

	const aliases = (row.alternateSpellings || '')
		.split('|')
		.map((s) => s.trim())
		.filter(Boolean)
	if (aliases.length > 0) doc.alternateSpellings = aliases

	return doc
}

function csvEscape(value: string): string {
	if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
	return value
}

function writeCsv(filePath: string, headers: string[], rows: string[][]): void {
	const lines = [headers.join(',')]
	for (const row of rows) {
		lines.push(row.map(csvEscape).join(','))
	}
	fs.writeFileSync(filePath, lines.join('\n') + '\n')
}

function displayName(row: PeopleCsvRow): string {
	return [row.prefix, row.firstName, row.lastName, row.suffix].filter(Boolean).join(' ')
}

async function loadExistingPeople(
	client: SanityClient,
	dryRun: boolean,
): Promise<Map<string, ExistingPerson>> {
	const map = new Map<string, ExistingPerson>()
	if (dryRun && !hasAuthToken()) {
		console.log('No SANITY_AUTH_TOKEN in dry-run — skipping existing-person lookup.\n')
		return map
	}

	try {
		const people = await client.fetch<ExistingPerson[]>(
			`*[_type == "person" && !(_id in path("drafts.**"))]{
				_id,
				firstName,
				lastName,
				prefix,
				suffix
			}`,
		)

		for (const person of people) {
			map.set(existingKey(person), person)
		}
		console.log(`Loaded ${map.size} existing person documents.\n`)
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		if (dryRun) {
			console.warn(
				`Could not load existing persons in dry-run (${msg}). Continuing without already_exists checks.\n`,
			)
			return map
		}
		throw err
	}

	return map
}

export async function runPeopleImport(config: ImportConfig, client: SanityClient): Promise<void> {
	const {dryRun, rowLimit, csvPath, reportsDir} = config
	const mode = dryRun ? 'DRY RUN' : 'LIVE'

	console.log(`--- Charlestown People Import (${mode}) ---`)
	console.log(`Source: ${csvPath}`)
	console.log(`Project: ${SANITY_PROJECT_ID} / ${SANITY_DATASET}`)
	if (rowLimit < Infinity) console.log(`Row limit: ${rowLimit}`)
	console.log()

	const rows = await readCsvRows<PeopleCsvRow>(csvPath, rowLimit)
	console.log(`Parsed ${rows.length} people rows.\n`)

	const {pairs, suspectKeys} = findSuspectPairs(rows)
	console.log(
		`Suspect near-duplicate pairs: ${pairs.length} (${suspectKeys.size} rows held for review)\n`,
	)

	const existing = await loadExistingPeople(client, dryRun)

	const imported: ImportedRecord[] = []
	const skipped: SkippedRecord[] = []
	const previewDocs: PersonImportDoc[] = []
	const limit = pLimit(CONCURRENCY)

	const tasks = rows.map((row) =>
		limit(async () => {
			const key = peopleRowKey(row)
			const title = displayName(row)

			if (suspectKeys.has(key)) {
				skipped.push({
					key,
					firstName: row.firstName,
					lastName: row.lastName,
					prefix: row.prefix || '',
					suffix: row.suffix || '',
					reason: 'suspected_duplicate',
					detail: 'Held for review — see review-suspected-duplicates.csv',
				})
				return
			}

			const doc = mapRow(row)
			if (!doc) {
				skipped.push({
					key,
					firstName: row.firstName,
					lastName: row.lastName,
					prefix: row.prefix || '',
					suffix: row.suffix || '',
					reason: 'invalid_row',
					detail: 'Missing firstName or lastName',
				})
				return
			}

			const match = existing.get(existingKey(doc))
			if (match) {
				skipped.push({
					key,
					firstName: row.firstName,
					lastName: row.lastName,
					prefix: row.prefix || '',
					suffix: row.suffix || '',
					reason: 'already_exists',
					detail: match._id,
				})
				return
			}

			if (dryRun) {
				previewDocs.push(doc)
				imported.push({
					key,
					firstName: doc.firstName,
					lastName: doc.lastName,
					prefix: doc.prefix || '',
					suffix: doc.suffix || '',
					action: 'dry_run',
					sanityId: '',
				})
				console.log(`[DRY RUN] person → ${title}`)
				return
			}

			try {
				const created = await client.create(doc)
				existing.set(existingKey(doc), {
					_id: created._id,
					firstName: doc.firstName,
					lastName: doc.lastName,
					prefix: doc.prefix,
					suffix: doc.suffix,
				})
				imported.push({
					key,
					firstName: doc.firstName,
					lastName: doc.lastName,
					prefix: doc.prefix || '',
					suffix: doc.suffix || '',
					action: 'created',
					sanityId: created._id,
				})
				console.log(`[OK] created person → ${title} (${created._id})`)
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				skipped.push({
					key,
					firstName: row.firstName,
					lastName: row.lastName,
					prefix: row.prefix || '',
					suffix: row.suffix || '',
					reason: 'api_error',
					detail: msg,
				})
			}
		}),
	)

	await Promise.all(tasks)

	fs.mkdirSync(reportsDir, {recursive: true})

	if (dryRun && previewDocs.length > 0) {
		const previewPath = path.join(reportsDir, 'preview.ndjson')
		fs.writeFileSync(previewPath, previewDocs.map((d) => JSON.stringify(d)).join('\n') + '\n')
		console.log(`\nPreview written to ${previewPath}`)
	}

	writeCsv(
		path.join(reportsDir, 'imported.csv'),
		['key', 'firstName', 'lastName', 'prefix', 'suffix', 'action', 'sanityId'],
		imported.map((r) => [r.key, r.firstName, r.lastName, r.prefix, r.suffix, r.action, r.sanityId]),
	)

	writeCsv(
		path.join(reportsDir, 'skipped.csv'),
		['key', 'firstName', 'lastName', 'prefix', 'suffix', 'reason', 'detail'],
		skipped.map((r) => [r.key, r.firstName, r.lastName, r.prefix, r.suffix, r.reason, r.detail]),
	)

	writeCsv(
		path.join(reportsDir, 'review-suspected-duplicates.csv'),
		[
			'lastName',
			'nameA',
			'firstNameA',
			'suffixA',
			'nameB',
			'firstNameB',
			'suffixB',
			'reason',
			'score',
			'sourceNamesA',
			'sourceNamesB',
			'alternateSpellingsA',
			'alternateSpellingsB',
		],
		pairs.map((p) => [
			p.a.lastName,
			displayName(p.a),
			p.a.firstName,
			p.a.suffix || '',
			displayName(p.b),
			p.b.firstName,
			p.b.suffix || '',
			p.reason,
			p.score.toFixed(3),
			p.a.sourceNames || '',
			p.b.sourceNames || '',
			p.a.alternateSpellings || '',
			p.b.alternateSpellings || '',
		]),
	)

	const held = skipped.filter((s) => s.reason === 'suspected_duplicate').length
	const exists = skipped.filter((s) => s.reason === 'already_exists').length
	const errors = skipped.filter((s) => s.reason === 'api_error').length

	console.log(`\nReports written to ${reportsDir}`)
	console.log(`  imported: ${imported.length}`)
	console.log(`  skipped:  ${skipped.length} (held ${held}, exists ${exists}, errors ${errors})`)
	console.log(`  review pairs: ${pairs.length}`)
}
