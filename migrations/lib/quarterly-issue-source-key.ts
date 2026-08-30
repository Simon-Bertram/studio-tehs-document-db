/**
 * Stable natural key for a TEHS Quarterly issue (e.g. v22n1, v44n1+2).
 */
export function quarterlyIssueSourceKey(
	volume: number,
	issueNumber: number,
	issueNumberEnd?: number,
): string {
	if (issueNumberEnd != null && issueNumberEnd !== issueNumber) {
		return `v${volume}n${issueNumber}+${issueNumberEnd}`
	}
	return `v${volume}n${issueNumber}`
}

export function parseIssueSourceKey(
	sourceKey: string,
): {volume: number; issueNumber: number; issueNumberEnd?: number} | null {
	const match = /^v(\d+)n(\d+)(?:\+(\d+))?$/i.exec(sourceKey.trim())
	if (!match) return null
	const volume = Number(match[1])
	const issueNumber = Number(match[2])
	const issueNumberEnd = match[3] ? Number(match[3]) : undefined
	return {volume, issueNumber, issueNumberEnd}
}
