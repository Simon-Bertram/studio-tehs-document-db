export const THEN_AND_NOW_SOURCES = [
	{title: 'Historical Image', value: 'historicalImage'},
	{title: 'Uploaded photograph', value: 'upload'},
] as const

export type ThenAndNowSourceValue = (typeof THEN_AND_NOW_SOURCES)[number]['value']

export const THEN_AND_NOW_SOURCE_VALUES: readonly ThenAndNowSourceValue[] =
	THEN_AND_NOW_SOURCES.map((item) => item.value)

export type ThenAndNowViewValue = {
	source?: ThenAndNowSourceValue | string
	historicalImage?: {_ref?: string}
	image?: {asset?: {_ref?: string}}
	alt?: string
	takenYear?: number
}

const SOURCE_REQUIRED = 'Choose Historical Image or Uploaded photograph'
const HISTORICAL_IMAGE_REQUIRED = 'Choose a cataloged Historical Image'
const UPLOAD_REQUIRED = 'Upload a photograph'
const ALT_WARNING = 'Alt text helps accessibility and SEO'

export function isThenAndNowSource(value: string | undefined): value is ThenAndNowSourceValue {
	return THEN_AND_NOW_SOURCE_VALUES.includes(value as ThenAndNowSourceValue)
}

export function validateThenAndNowSource(value: string | undefined): string | true {
	return isThenAndNowSource(value) ? true : SOURCE_REQUIRED
}

/**
 * Require the photo that matches the chosen source.
 */
export function validateThenAndNowViewPhoto(view: ThenAndNowViewValue | undefined): string | true {
	const sourceError = validateThenAndNowSource(view?.source)
	if (sourceError !== true) return sourceError

	if (view?.source === 'historicalImage' && !view.historicalImage?._ref) {
		return HISTORICAL_IMAGE_REQUIRED
	}
	if (view?.source === 'upload' && !view.image?.asset?._ref) {
		return UPLOAD_REQUIRED
	}
	return true
}

export function validateThenAndNowHistoricalImage(
	ref: {_ref?: string} | undefined,
	parent: ThenAndNowViewValue | undefined,
): string | true {
	if (parent?.source !== 'historicalImage') return true
	return ref?._ref ? true : HISTORICAL_IMAGE_REQUIRED
}

export function validateThenAndNowUpload(
	image: {asset?: {_ref?: string}} | undefined,
	parent: ThenAndNowViewValue | undefined,
): string | true {
	if (parent?.source !== 'upload') return true
	return image?.asset?._ref ? true : UPLOAD_REQUIRED
}

/**
 * Warn when an uploaded photograph has no alt text. Catalog images can fall
 * back to the Historical Image caption.
 */
export function warnThenAndNowViewAlt(
	alt: string | undefined,
	parent: ThenAndNowViewValue | undefined,
): string | true {
	if (parent?.source !== 'upload') return true
	return alt?.trim() ? true : ALT_WARNING
}

export function validateTakenYear(
	year: number | undefined,
	currentYear = new Date().getFullYear(),
): string | true {
	if (year == null) return true
	if (!Number.isInteger(year)) return 'Use a whole year'
	const max = currentYear + 1
	if (year < 1800 || year > max) {
		return `Use a year between 1800 and ${max}`
	}
	return true
}
