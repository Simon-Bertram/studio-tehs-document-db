/**
 * Write human-review CSVs for properties and people. Query Content Lake when
 * a token is available to mark existing matches.
 */
import fs from 'node:fs'
import path from 'node:path'

import type {SanityClient} from '@sanity/client'

import {createImportClient, hasAuthToken} from '../../csv-import/lib/sanity-client'
import {writeCsv} from './csv'
import {
	EXTRACTED_DIR,
	MANIFEST_PATH,
	MEETING_PEOPLE_REVIEW_PATH,
	PROPERTIES_REVIEW_PATH,
	REVIEW_DIR,
	SLAVES_PEOPLE_REVIEW_PATH,
} from './paths'
import {extractBuildingList, parseHtmlPage} from './parse-page'
import {normalizePersonKey, parsePersonName, suggestPropertyType} from './people'
import type {Manifest} from './run-extract'
import {EXPECTED_SLAVES_PAGE_PEOPLE, SITE_ORIGIN, SITE_PREFIX} from './urls'

type ExistingPerson = {
	_id: string
	firstName?: string
	lastName?: string
	prefix?: string
	suffix?: string
}

type ExistingProperty = {
	_id: string
	historicalName?: string
}

function loadManifest(): Manifest {
	if (!fs.existsSync(MANIFEST_PATH)) {
		throw new Error(`Missing manifest at ${MANIFEST_PATH}. Run extract first.`)
	}
	return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest
}

function readSnapshot(localPath: string): string {
	return fs.readFileSync(path.join(EXTRACTED_DIR, localPath), 'utf8')
}

async function loadExistingPeople(client: SanityClient | null): Promise<ExistingPerson[]> {
	if (!client) return []
	return client.fetch<ExistingPerson[]>(
		`*[_type == "person" && !(_id in path("drafts.**"))]{_id, firstName, lastName, prefix, suffix}`,
	)
}

async function loadExistingProperties(client: SanityClient | null): Promise<ExistingProperty[]> {
	if (!client) return []
	return client.fetch<ExistingProperty[]>(
		`*[_type == "property" && !(_id in path("drafts.**"))]{_id, historicalName}`,
	)
}

function propertyMatchMap(existing: ExistingProperty[]): Map<string, ExistingProperty> {
	const map = new Map<string, ExistingProperty>()
	for (const p of existing) {
		const key = (p.historicalName || '').toLocaleLowerCase('en-US').trim()
		if (key && !map.has(key)) map.set(key, p)
	}
	return map
}

function personMatchMap(existing: ExistingPerson[]): Map<string, ExistingPerson> {
	const map = new Map<string, ExistingPerson>()
	for (const p of existing) {
		const key = normalizePersonKey({
			prefix: p.prefix,
			firstName: p.firstName || '',
			lastName: p.lastName || '',
			suffix: p.suffix,
		})
		if (!map.has(key)) map.set(key, p)
		// Also match without prefix/suffix for softer hits
		const soft = normalizePersonKey({
			firstName: p.firstName || '',
			lastName: p.lastName || '',
		})
		if (!map.has(`soft:${soft}`)) map.set(`soft:${soft}`, p)
	}
	return map
}

function findPerson(
	map: Map<string, ExistingPerson>,
	parts: ReturnType<typeof parsePersonName>,
): ExistingPerson | undefined {
	const hard = normalizePersonKey(parts)
	if (map.has(hard)) return map.get(hard)
	// Soft match (first+last only) when the review row has no prefix/suffix,
	// so Capt. vs Dr. John Davis stay distinct.
	if (parts.prefix || parts.suffix) return undefined
	const soft = normalizePersonKey({
		firstName: parts.firstName,
		lastName: parts.lastName,
	})
	return map.get(`soft:${soft}`)
}

export async function runReview(): Promise<void> {
	fs.mkdirSync(REVIEW_DIR, {recursive: true})
	const manifest = loadManifest()

	const client = hasAuthToken() ? createImportClient({dryRun: true}) : null
	if (!client) {
		console.log('No SANITY_API_WRITE_TOKEN — review files will not include lake matches.')
	}

	const [existingPeople, existingProperties] = await Promise.all([
		loadExistingPeople(client),
		loadExistingProperties(client),
	])
	const peopleMap = personMatchMap(existingPeople)
	const propertyMap = propertyMatchMap(existingProperties)

	const buildingsUrl = `${SITE_ORIGIN}${SITE_PREFIX}Buildings.html`
	const buildingsPage = manifest.pages.find((p) => p.url === buildingsUrl)
	if (!buildingsPage?.ok) {
		throw new Error('Buildings.html snapshot missing or failed. Re-run extract.')
	}

	const buildingItems = extractBuildingList(
		readSnapshot(buildingsPage.localPath),
		buildingsPage.url,
	)

	const propertyRows = buildingItems.map((item) => {
		const match = propertyMap.get(item.name.toLocaleLowerCase('en-US').trim())
		const propertyType = suggestPropertyType(item.name, item.note)
		return [
			item.name,
			item.note,
			item.absoluteUrl,
			propertyType,
			match?._id ?? '',
			match ? 'matched' : 'new',
			'', // approved: human fills yes
			'', // notes
		]
	})

	writeCsv(
		PROPERTIES_REVIEW_PATH,
		[
			'historicalName',
			'note',
			'articleUrl',
			'suggestedPropertyType',
			'existingSanityId',
			'status',
			'approved',
			'notes',
		],
		propertyRows,
	)

	const slavesRows = EXPECTED_SLAVES_PAGE_PEOPLE.map((displayName) => {
		const parts = parsePersonName(displayName)
		const match = parts.isFamilyGroup ? undefined : findPerson(peopleMap, parts)
		return [
			displayName,
			parts.prefix,
			parts.firstName,
			parts.middleName,
			parts.lastName,
			parts.suffix,
			parts.isFamilyGroup ? 'family_group' : match ? 'matched' : 'new',
			match?._id ?? '',
			'', // approved
			parts.notes,
		]
	})

	writeCsv(
		SLAVES_PEOPLE_REVIEW_PATH,
		[
			'displayName',
			'prefix',
			'firstName',
			'middleName',
			'lastName',
			'suffix',
			'status',
			'existingSanityId',
			'approved',
			'notes',
		],
		slavesRows,
	)

	const meetingUrl = `${SITE_ORIGIN}${SITE_PREFIX}Military/MeetingForSuffering.html`
	const meetingPage = manifest.pages.find((p) => p.url === meetingUrl)
	const meetingNames = new Set<string>()
	if (meetingPage?.ok) {
		const parsed = parseHtmlPage(readSnapshot(meetingPage.localPath), meetingPage.url)
		for (const heading of parsed.personHeadings) {
			// Skip page title-like headings
			if (/quaker|meeting|suffering|tredyffrin history/i.test(heading)) continue
			meetingNames.add(heading)
		}
		// Also capture Lewis Gronow from prose via a known list from the article
		meetingNames.add('Lewis Gronow')
		meetingNames.add('John Marshall')
		meetingNames.add('John Lloyd')
		meetingNames.add('David Briggs')
		meetingNames.add('Jeremiah Eardly')
		meetingNames.add('John Maxwell')
		meetingNames.add('Anthony Wayne')
	}

	const meetingRows = [...meetingNames]
		.sort((a, b) => a.localeCompare(b))
		.map((displayName) => {
			const parts = parsePersonName(displayName)
			const match = findPerson(peopleMap, parts)
			return [
				displayName,
				parts.prefix,
				parts.firstName,
				parts.middleName,
				parts.lastName,
				parts.suffix,
				match ? 'matched' : 'new',
				match?._id ?? '',
				match ? 'yes' : '', // auto-approve matches for linking; new need human yes
				parts.notes || (match ? 'Already in Content Lake — will link' : 'Create only if approved'),
			]
		})

	writeCsv(
		MEETING_PEOPLE_REVIEW_PATH,
		[
			'displayName',
			'prefix',
			'firstName',
			'middleName',
			'lastName',
			'suffix',
			'status',
			'existingSanityId',
			'approved',
			'notes',
		],
		meetingRows,
	)

	console.log(`Wrote ${PROPERTIES_REVIEW_PATH} (${propertyRows.length} properties)`)
	console.log(`Wrote ${SLAVES_PEOPLE_REVIEW_PATH} (${slavesRows.length} people)`)
	console.log(`Wrote ${MEETING_PEOPLE_REVIEW_PATH} (${meetingRows.length} people)`)
	console.log(
		'Set approved=yes on rows to create or link, then run transform + import.',
	)
}
