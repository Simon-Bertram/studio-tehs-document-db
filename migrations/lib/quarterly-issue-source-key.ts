/**
 * Stable natural key for a TEHS Quarterly issue (e.g. v22n1).
 */
export function quarterlyIssueSourceKey(volume: number, issueNumber: number): string {
	return `v${volume}n${issueNumber}`
}
