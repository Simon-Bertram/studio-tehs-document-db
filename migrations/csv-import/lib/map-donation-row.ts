import {nanoid} from 'nanoid'

import {type HistoricalDateValue, parseHistoricalDate} from '../../lib/parse-historical-date'
import type {Audit} from './audit'
import {cleanString} from './clean'
import {DTYPE_MAP, DTYPE_NO_CATEGORIES} from './donation-dtype-map'

export interface DonationCsvRow {
	donationID: string
	name: string
	acquisitionDate: string
	dDescription: string
	donor: string
	dtype: string
}

export interface DonationImportDoc {
	_type: 'donation'
	donationId: number
	name?: string
	acquisitionDate?: HistoricalDateValue
	description?: string
	donor?: string
	donationCategories?: {_type: 'reference'; _key: string; _ref: string}[]
}

export interface MapDonationResult {
	doc: DonationImportDoc
	csvType: string
	title: string
	mappedKeywords: string[]
	unmappedKeywords: string[]
}

function ref(id: string) {
	return {_type: 'reference' as const, _key: nanoid(), _ref: id}
}

/**
 * Resolve dtype to category refs using DTYPE_MAP + category lookup.
 */
export function mapDonationRow(
	row: DonationCsvRow,
	categoryLookup: Record<string, string>,
	audit: Audit,
): MapDonationResult | null {
	const idRaw = cleanString(row.donationID)
	const donationId = idRaw ? Number(idRaw) : NaN
	const name = cleanString(row.name)

	if (!Number.isFinite(donationId)) {
		audit.skip({
			clipId: idRaw ?? undefined,
			title: name ?? undefined,
			csvType: cleanString(row.dtype) ?? undefined,
			reason: 'missing_clip_id',
			detail: 'Row missing or invalid donationID.',
		})
		return null
	}

	const doc: DonationImportDoc = {
		_type: 'donation',
		donationId,
	}
	if (name) doc.name = name
	const acquisitionDate = cleanString(row.acquisitionDate)
	if (acquisitionDate) {
		const parsed = parseHistoricalDate(acquisitionDate)
		if (parsed) doc.acquisitionDate = parsed
	}
	const description = cleanString(row.dDescription)
	if (description) doc.description = description
	const donor = cleanString(row.donor)
	if (donor) doc.donor = donor

	const mappedKeywords: string[] = []
	const unmappedKeywords: string[] = []
	const dtypeRaw = cleanString(row.dtype)
	const csvType = dtypeRaw ?? String(row.dtype ?? '')

	if (!dtypeRaw) {
		unmappedKeywords.push('(missing dtype)')
		audit.missingTaxonomy('(missing dtype)', String(donationId))
	} else {
		const key = dtypeRaw.toLowerCase()
		if (DTYPE_NO_CATEGORIES.has(key)) {
			unmappedKeywords.push(dtypeRaw)
			audit.missingTaxonomy(dtypeRaw, String(donationId))
		} else {
			const titles = DTYPE_MAP[key]
			if (!titles) {
				unmappedKeywords.push(dtypeRaw)
				audit.missingTaxonomy(dtypeRaw, String(donationId))
			} else {
				const refs = []
				const seen = new Set<string>()
				for (const title of titles) {
					const id = categoryLookup[title.toLowerCase()]
					if (!id) {
						unmappedKeywords.push(title)
						audit.missingTaxonomy(title, String(donationId))
						continue
					}
					if (seen.has(id)) continue
					seen.add(id)
					refs.push(ref(id))
					mappedKeywords.push(title)
				}
				if (refs.length > 0) doc.donationCategories = refs
			}
		}
	}

	// STV report: if description empty, store the dtype text as description
	if (
		dtypeRaw?.toLowerCase() ===
			'report by the stv company to the pennsylvania turnpike commission' &&
		!doc.description
	) {
		doc.description = dtypeRaw
	}

	return {
		doc,
		csvType,
		title: name || `Donation ${donationId}`,
		mappedKeywords,
		unmappedKeywords,
	}
}
