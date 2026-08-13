import type {CustomValidator, ValidationContext} from 'sanity'

import {SANITY_API_VERSION} from '../../lib/sanityEnv'

type PersonNameMatch = {
	_id: string
	prefix?: string
	firstName?: string
	middleName?: string
	lastName?: string
	suffix?: string
}

const MATCH_FETCH_LIMIT = 12
const MATCH_DISPLAY_LIMIT = 5

function publishedId(id: string): string {
	return id.replace(/^drafts\./, '')
}

function trimName(value: unknown): string {
	return String(value ?? '').trim()
}

function formatPersonName(person: PersonNameMatch): string {
	return [person.prefix, person.firstName, person.middleName, person.lastName, person.suffix]
		.filter(Boolean)
		.join(' ')
}

function uniqueMatches(matches: PersonNameMatch[]): PersonNameMatch[] {
	const unique = new Map<string, PersonNameMatch>()
	for (const match of matches) {
		const key = publishedId(match._id)
		if (!unique.has(key)) unique.set(key, match)
	}
	return [...unique.values()]
}

function listNames(people: PersonNameMatch[]): string {
	const listed = people.slice(0, MATCH_DISPLAY_LIMIT).map(formatPersonName).join('; ')
	const extraCount = people.length - MATCH_DISPLAY_LIMIT
	const extra = extraCount > 0 ? ` and ${extraCount} more` : ''
	return `${listed}${extra}`
}

/**
 * Warns when another Historical Person already has the same first + last name,
 * or the same first + middle + last name. Not a uniqueness constraint.
 */
export function warnDuplicatePersonName(): CustomValidator<string | undefined> {
	return async (_value, context: ValidationContext) => {
		const firstName = trimName(context.document?.firstName)
		const middleName = trimName(context.document?.middleName)
		const lastName = trimName(context.document?.lastName)
		if (!firstName || !lastName) return true

		const client = context.getClient({apiVersion: SANITY_API_VERSION})
		const rawId = context.document?._id ?? ''
		const id = publishedId(rawId)

		const matches = await client.fetch<PersonNameMatch[]>(
			`*[_type == "person" && lower(trim(firstName)) == lower($firstName) && lower(trim(lastName)) == lower($lastName) && !(_id in [$id, $draftId])][0...${MATCH_FETCH_LIMIT}]{_id, prefix, firstName, middleName, lastName, suffix}`,
			{
				firstName,
				lastName,
				id,
				draftId: `drafts.${id}`,
			},
		)

		const people = uniqueMatches(matches)
		if (people.length === 0) return true

		const fullMatches = people.filter(
			(person) => trimName(person.middleName).toLowerCase() === middleName.toLowerCase(),
		)
		const firstLastOnly = people.filter(
			(person) => trimName(person.middleName).toLowerCase() !== middleName.toLowerCase(),
		)

		const suffix =
			' Search for them before creating a duplicate. Same names are allowed when they are different people.'

		if (middleName && fullMatches.length > 0 && firstLastOnly.length > 0) {
			return `A person named ${firstName} ${middleName} ${lastName} already exists (${listNames(fullMatches)}). Others share the same first and last name (${listNames(firstLastOnly)}).${suffix}`
		}

		if (middleName && fullMatches.length > 0) {
			return `A person named ${firstName} ${middleName} ${lastName} already exists (${listNames(fullMatches)}).${suffix}`
		}

		return `A person named ${firstName} ${lastName} already exists (${listNames(people)}).${suffix}`
	}
}
