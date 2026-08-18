import {cleanString} from './clean'
import type {ImageCsvRow} from './map-image-row'

export interface DuplicateResolution {
	archiveId: string
	originalIdentifier: string | null
	skip: boolean
	reason?: 'duplicate_identifier'
	detail?: string
}

function normalizePath(value: string | null): string {
	return (value ?? '').replace(/\\/g, '/').trim().toLowerCase()
}

function primaryPhotoSortValue(row: ImageCsvRow, index: number): number {
	const raw = cleanString(row.primaryPhoto)
	if (!raw) return index
	const n = Number(raw)
	return Number.isFinite(n) ? n : index
}

/**
 * Duplicate `identifier` values must not share one archiveId on upsert.
 * Same path (SCU11): keep the earliest primaryPhoto, skip the rest.
 * Different files (HLC08): suffix with primaryPhoto, or -a/-b if missing.
 */
export function resolveDuplicateArchiveIds(rows: ImageCsvRow[]): DuplicateResolution[] {
	const results: DuplicateResolution[] = rows.map((row) => {
		const identifier = cleanString(row.identifier)
		return {
			archiveId: identifier ?? '',
			originalIdentifier: identifier,
			skip: false,
		}
	})

	const groups = new Map<string, number[]>()
	rows.forEach((row, index) => {
		const identifier = cleanString(row.identifier)
		if (!identifier) return
		const list = groups.get(identifier) ?? []
		list.push(index)
		groups.set(identifier, list)
	})

	for (const [identifier, indices] of groups) {
		if (indices.length < 2) continue

		const byPath = new Map<string, number[]>()
		for (const index of indices) {
			const pathKey = normalizePath(cleanString(rows[index].imageLocation))
			const list = byPath.get(pathKey) ?? []
			list.push(index)
			byPath.set(pathKey, list)
		}

		const keepers: number[] = []
		for (const pathIndices of byPath.values()) {
			const sorted = [...pathIndices].sort(
				(a, b) => primaryPhotoSortValue(rows[a], a) - primaryPhotoSortValue(rows[b], b) || a - b,
			)
			const keep = sorted[0]
			keepers.push(keep)
			for (const dup of sorted.slice(1)) {
				const keepPhoto = cleanString(rows[keep].primaryPhoto) ?? 'earlier row'
				results[dup] = {
					archiveId: identifier,
					originalIdentifier: identifier,
					skip: true,
					reason: 'duplicate_identifier',
					detail: `True duplicate of ${identifier} (same imageLocation as primaryPhoto ${keepPhoto}).`,
				}
			}
		}

		if (keepers.length < 2) continue

		const sortedKeepers = [...keepers].sort((a, b) => {
			const photoA = cleanString(rows[a].primaryPhoto)
			const photoB = cleanString(rows[b].primaryPhoto)
			const numA = photoA ? Number(photoA) : NaN
			const numB = photoB ? Number(photoB) : NaN
			if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) {
				return numA - numB
			}
			const pathA = cleanString(rows[a].imageLocation) ?? ''
			const pathB = cleanString(rows[b].imageLocation) ?? ''
			return pathA.localeCompare(pathB) || a - b
		})

		const letters = 'abcdefghijklmnopqrstuvwxyz'
		sortedKeepers.forEach((index, n) => {
			const primary = cleanString(rows[index].primaryPhoto)
			const archiveId = primary
				? `${identifier}-${primary}`
				: `${identifier}-${letters[n] ?? String(n)}`
			results[index] = {
				archiveId,
				originalIdentifier: identifier,
				skip: false,
				detail: `Disambiguated duplicate identifier ${identifier} → ${archiveId}.`,
			}
		})
	}

	return results
}
