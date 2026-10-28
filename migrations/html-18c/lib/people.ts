/**
 * Parse display names into person field parts for review / import.
 */
export interface PersonParts {
	displayName: string
	prefix: string
	firstName: string
	middleName: string
	lastName: string
	suffix: string
	/** Not a person document (e.g. Havard family). */
	isFamilyGroup: boolean
	notes: string
}

const PREFIXES = [
	{re: /^(captain|capt\.?)\s+/i, value: 'Capt.'},
	{re: /^(rev\.?|reverend)\s+/i, value: 'Rev.'},
	{re: /^(dr\.?|doctor)\s+/i, value: 'Dr.'},
	{re: /^(col\.?|colonel)\s+/i, value: 'Col.'},
	{re: /^(lt\.?|lieutenant)\s+/i, value: 'Lt.'},
	{re: /^(gen\.?|general)\s+/i, value: 'Gen.'},
	{re: /^(maj\.?|major)\s+/i, value: 'Maj.'},
]

const SUFFIXES = [
	{re: /\s+(senior|sen\.?|sr\.?)$/i, value: 'Sr.'},
	{re: /\s+(junior|jun\.?|jr\.?)$/i, value: 'Jr.'},
	{re: /\s+(iii)$/i, value: 'III'},
	{re: /\s+(ii)$/i, value: 'II'},
]

export function parsePersonName(displayName: string): PersonParts {
	let rest = displayName.replace(/\s+/g, ' ').trim()
	const notes: string[] = []
	let isFamilyGroup = false

	if (/\bfamily\b/i.test(rest)) {
		isFamilyGroup = true
		notes.push('Family group — skip person import or handle as familyLine')
		const familyName = rest.replace(/\s+family\s*$/i, '').trim()
		return {
			displayName,
			prefix: '',
			firstName: familyName || rest,
			middleName: '',
			lastName: 'family',
			suffix: '',
			isFamilyGroup: true,
			notes: notes.join('; '),
		}
	}

	let prefix = ''
	for (const p of PREFIXES) {
		const m = rest.match(p.re)
		if (m) {
			prefix = p.value
			rest = rest.slice(m[0].length).trim()
			break
		}
	}

	let suffix = ''
	for (const s of SUFFIXES) {
		const m = rest.match(s.re)
		if (m) {
			suffix = s.value
			rest = rest.slice(0, m.index).trim()
			break
		}
	}

	const parts = rest.split(/\s+/).filter(Boolean)
	let firstName = ''
	let middleName = ''
	let lastName = ''

	if (parts.length === 0) {
		notes.push('Could not parse name parts')
	} else if (parts.length === 1) {
		lastName = parts[0]
		firstName = parts[0]
		notes.push('Single-token name — review first/last')
	} else if (parts.length === 2) {
		firstName = parts[0]
		lastName = parts[1]
	} else {
		firstName = parts[0]
		lastName = parts[parts.length - 1]
		middleName = parts.slice(1, -1).join(' ')
	}

	return {
		displayName,
		prefix,
		firstName,
		middleName,
		lastName,
		suffix,
		isFamilyGroup,
		notes: notes.join('; '),
	}
}

export function normalizePersonKey(parts: {
	prefix?: string
	firstName: string
	lastName: string
	suffix?: string
}): string {
	return [
		(parts.prefix || '').toLocaleLowerCase('en-US').trim(),
		parts.firstName.toLocaleLowerCase('en-US').trim(),
		parts.lastName.toLocaleLowerCase('en-US').trim(),
		(parts.suffix || '').toLocaleLowerCase('en-US').trim(),
	].join('|')
}

export function suggestPropertyType(name: string, note: string): 'dwelling' | 'estate' {
	const hay = `${name} ${note}`.toLowerCase()
	if (/\bfarm\b/.test(hay) && !/\bfarmhouse\b/.test(hay) && !/\bhouse\b/.test(hay)) {
		return 'estate'
	}
	if (/\bfarm\b/.test(name.toLowerCase()) && !/farmhouse/i.test(name)) {
		return 'estate'
	}
	return 'dwelling'
}
