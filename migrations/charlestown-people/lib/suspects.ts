/**
 * Near-duplicate first-name detection within the same surname.
 * Used to hold suspect pairs out of auto-import for manual review.
 */

export type PeopleCsvRow = {
	firstName: string
	lastName: string
	prefix: string
	suffix: string
	alternateSpellings: string
	sourceNames: string
	roles: string
}

export type SuspectPair = {
	a: PeopleCsvRow
	b: PeopleCsvRow
	reason: string
	score: number
}

function casefold(text: string): string {
	return text.replace(/\s+/g, ' ').trim().toLocaleLowerCase('en-US')
}

function rowKey(row: PeopleCsvRow): string {
	return [
		casefold(row.prefix || ''),
		casefold(row.firstName || ''),
		casefold(row.lastName || ''),
		casefold(row.suffix || ''),
	].join('|')
}

/** Dice / bigram-ish similarity via SequenceMatcher-style ratio. */
export function nameSimilarity(a: string, b: string): number {
	const s = casefold(a)
	const t = casefold(b)
	if (s === t) return 1
	if (!s.length || !t.length) return 0

	const longer = s.length >= t.length ? s : t
	const shorter = s.length >= t.length ? t : s
	if (longer.length === 0) return 1

	const matches = longestCommonSubsequenceLength(s, t)
	return (2 * matches) / (s.length + t.length)
}

function longestCommonSubsequenceLength(a: string, b: string): number {
	const m = a.length
	const n = b.length
	const dp = Array.from({length: m + 1}, () => Array(n + 1).fill(0))
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
			else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
		}
	}
	return dp[m][n]
}

export function editDistance(a: string, b: string): number {
	const s = casefold(a)
	const t = casefold(b)
	const m = s.length
	const n = t.length
	const dp = Array.from({length: m + 1}, () => Array(n + 1).fill(0))
	for (let i = 0; i <= m; i++) dp[i][0] = i
	for (let j = 0; j <= n; j++) dp[0][j] = j
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const cost = s[i - 1] === t[j - 1] ? 0 : 1
			dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
		}
	}
	return dp[m][n]
}

/** True when both have a given name + single-letter middle that differs. */
function hasDistinctMiddleInitials(a: string, b: string): boolean {
	const pa = casefold(a).split(' ')
	const pb = casefold(b).split(' ')
	if (pa.length < 2 || pb.length < 2) return false
	if (pa[0] !== pb[0]) return false
	const ma = pa.slice(1).join(' ')
	const mb = pb.slice(1).join(' ')
	const midA = ma.replace(/\./g, '')
	const midB = mb.replace(/\./g, '')
	if (midA.length === 1 && midB.length === 1 && midA !== midB) return true
	return false
}

function isNearDuplicateFirstName(
	a: string,
	b: string,
): {
	match: boolean
	reason: string
	score: number
} {
	if (casefold(a) === casefold(b)) {
		return {match: true, reason: 'identical_first_name', score: 1}
	}
	if (hasDistinctMiddleInitials(a, b)) {
		return {match: false, reason: '', score: 0}
	}

	const score = nameSimilarity(a, b)
	const dist = editDistance(a, b)
	const firstA = casefold(a).split(' ')[0] || ''
	const firstB = casefold(b).split(' ')[0] || ''
	const sameGiven = firstA.length > 0 && firstA === firstB

	if (score >= 0.85) {
		return {
			match: true,
			reason: `similar_first_name (score ${score.toFixed(2)})`,
			score,
		}
	}
	if (sameGiven && dist >= 1 && dist <= 2) {
		return {
			match: true,
			reason: `same_given_edit_distance_${dist}`,
			score,
		}
	}
	if (firstA[0] && firstA[0] === firstB[0] && dist >= 1 && dist <= 2 && score >= 0.75) {
		return {
			match: true,
			reason: `shared_initial_edit_distance_${dist}`,
			score,
		}
	}

	return {match: false, reason: '', score}
}

/**
 * Find near-duplicate pairs within the same last name.
 * Returns pairs and a set of row keys that should be held for review.
 */
export function findSuspectPairs(rows: PeopleCsvRow[]): {
	pairs: SuspectPair[]
	suspectKeys: Set<string>
} {
	const byLast = new Map<string, PeopleCsvRow[]>()
	for (const row of rows) {
		const last = casefold(row.lastName || '')
		if (!last) continue
		const list = byLast.get(last) ?? []
		list.push(row)
		byLast.set(last, list)
	}

	const pairs: SuspectPair[] = []
	const suspectKeys = new Set<string>()
	const seenPairKeys = new Set<string>()

	for (const group of byLast.values()) {
		if (group.length < 2) continue
		for (let i = 0; i < group.length; i++) {
			for (let j = i + 1; j < group.length; j++) {
				const a = group[i]
				const b = group[j]
				// Different suffixes (Jr/Sr) are distinct people
				if (casefold(a.suffix || '') !== casefold(b.suffix || '')) continue

				const result = isNearDuplicateFirstName(a.firstName, b.firstName)
				if (!result.match) continue

				const ka = rowKey(a)
				const kb = rowKey(b)
				const pairKey = [ka, kb].sort().join('::')
				if (seenPairKeys.has(pairKey)) continue
				seenPairKeys.add(pairKey)

				pairs.push({a, b, reason: result.reason, score: result.score})
				suspectKeys.add(ka)
				suspectKeys.add(kb)
			}
		}
	}

	pairs.sort(
		(p, q) =>
			q.score - p.score ||
			p.a.lastName.localeCompare(q.a.lastName) ||
			p.a.firstName.localeCompare(q.a.firstName),
	)

	return {pairs, suspectKeys}
}

export function peopleRowKey(row: PeopleCsvRow): string {
	return rowKey(row)
}
