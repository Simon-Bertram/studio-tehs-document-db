/**
 * Parse the HQ_Index_V1-52 author/title index (extracted PDF text).
 */

export interface HqIndexRow {
	authorText: string
	title: string
	volume: number
	issueNumber: number
	issueNumberEnd?: number
	startPage: number
	endPage?: number
	citation: string
	raw: string
}

export interface HqIndexParseResult {
	rows: HqIndexRow[]
	unparsedLines: string[]
}

const CITE_RE = /(\d{1,2})-(\d+(?:\/\d+)?)-(\d{1,3})(?:-(\d{1,3}))?\s*$/

const SKIP_LINE = new RegExp(
	[
		'^\\d+$',
		'^Printed on',
		'^Index to the Quarterly',
		'^Volumes?\\s+\\d',
		'^\\(C/M/R\\)',
		'^\\(N/C\\)',
		'^Pink highlighting',
		'^Yellow highlighting',
		'^Green highlighting',
		'^Blue highlighting',
		'^Author Title Citation',
		'^\\(volume, issue',
		'^page\\)',
	].join('|'),
	'i',
)

const CORPORATE_AUTHORS = ['American Republican', 'American Weekly Mercury']

function parseCitation(raw: string): {
	volume: number
	issueNumber: number
	issueNumberEnd?: number
	startPage: number
	endPage?: number
	citation: string
} | null {
	const match = raw.match(CITE_RE)
	if (!match) return null
	const volume = Number(match[1])
	const issuePart = match[2]
	const startPage = Number(match[3])
	const endPage = match[4] ? Number(match[4]) : undefined
	const slash = issuePart.split('/')
	const issueNumber = Number(slash[0])
	const issueNumberEnd = slash[1] ? Number(slash[1]) : undefined
	if (!Number.isFinite(volume) || !Number.isFinite(issueNumber) || !Number.isFinite(startPage)) {
		return null
	}
	return {
		volume,
		issueNumber,
		issueNumberEnd:
			issueNumberEnd != null && issueNumberEnd !== issueNumber ? issueNumberEnd : undefined,
		startPage,
		endPage,
		citation: match[0].trim(),
	}
}

function splitAuthorTitle(rest: string): {authorText: string; title: string} {
	const trimmed = rest.replace(/\s+/g, ' ').trim()
	for (const corp of CORPORATE_AUTHORS) {
		if (trimmed.toLowerCase().startsWith(corp.toLowerCase() + ' ')) {
			return {authorText: corp, title: trimmed.slice(corp.length).trim()}
		}
	}

	const tokens = trimmed.split(' ')
	if (tokens.length < 3) {
		return {authorText: trimmed, title: trimmed}
	}

	let take = 2
	const third = tokens[2] ?? ''
	if (/^(Jr\.?|Sr\.?|III|II|IV)$/i.test(third)) take = 3
	else if (/^[A-Z]\.$/.test(third)) take = 3
	else if (
		/^[A-Z][a-z]+$/.test(third) &&
		tokens.length > 3 &&
		/^(The|A|An|In|Notes|Editorial|Club|Things|Train|Found|Old|Valley|Vanished|Christmas|Howellville)\b/i.test(
			tokens[3] ?? '',
		)
	) {
		take = 3
	}

	return {
		authorText: [...tokens.slice(1, take), tokens[0]].join(' '),
		title: tokens.slice(take).join(' '),
	}
}

function joinWrappedLines(lines: string[]): string[] {
	const joined: string[] = []
	let pending = ''
	for (const raw of lines) {
		const line = raw.replace(/\s+/g, ' ').trim()
		if (!line || SKIP_LINE.test(line)) continue
		if (pending) {
			pending = `${pending} ${line}`
			if (CITE_RE.test(pending)) {
				joined.push(pending)
				pending = ''
			}
			continue
		}
		if (CITE_RE.test(line)) {
			joined.push(line)
			continue
		}
		pending = line
	}
	if (pending) joined.push(pending)
	return joined
}

/**
 * Turn extracted HQ index text into structured citation rows.
 */
export function parseHqIndexText(text: string): HqIndexParseResult {
	const lines = text.split(/\r?\n/)
	const joined = joinWrappedLines(lines)
	const rows: HqIndexRow[] = []
	const unparsedLines: string[] = []

	for (const line of joined) {
		const cite = parseCitation(line)
		if (!cite) {
			unparsedLines.push(line)
			continue
		}
		const rest = line.slice(0, line.length - cite.citation.length).trim()
		if (!rest) {
			unparsedLines.push(line)
			continue
		}
		const {authorText, title} = splitAuthorTitle(rest)
		if (!title) {
			unparsedLines.push(line)
			continue
		}
		rows.push({
			authorText,
			title,
			volume: cite.volume,
			issueNumber: cite.issueNumber,
			issueNumberEnd: cite.issueNumberEnd,
			startPage: cite.startPage,
			endPage: cite.endPage,
			citation: cite.citation,
			raw: line,
		})
	}

	return {rows, unparsedLines}
}
