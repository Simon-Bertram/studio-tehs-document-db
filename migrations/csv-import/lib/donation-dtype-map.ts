/**
 * Maps legacy donations.csv dtype strings to canonical Donation Category titles.
 * Keys are cleanString(dtype).toLowerCase(). Values are one or more canonical titles.
 */
export const CANONICAL_DONATION_CATEGORIES = [
	'Photographic prints',
	'Digital photographs',
	'Newspaper clipping',
	'Postcards',
	'Slides',
	'Drawings',
	'Posters',
] as const

export type CanonicalDonationCategory =
	(typeof CANONICAL_DONATION_CATEGORIES)[number]

/** Raw dtype (lowercased) → canonical category title(s). */
export const DTYPE_MAP: Record<string, CanonicalDonationCategory[]> = {
	'photographic prints': ['Photographic prints'],
	'photographic print': ['Photographic prints'],
	'photographic images': ['Photographic prints'],
	'original photos': ['Photographic prints'],
	'photographs in frames': ['Photographic prints'],
	images: ['Photographic prints'],
	'digital photographs': ['Digital photographs'],
	'digital images': ['Digital photographs'],
	'digital image': ['Digital photographs'],
	postcards: ['Postcards'],
	slides: ['Slides'],
	drawings: ['Drawings'],
	newspapers: ['Newspaper clipping'],
	'newspaper articles and poster': ['Newspaper clipping', 'Posters'],
	'photographic prints and postcards': ['Photographic prints', 'Postcards'],
	'photographic images and postcards': ['Photographic prints', 'Postcards'],
	'photographic prints and digital images': [
		'Photographic prints',
		'Digital photographs',
	],
}

/** dtype values that intentionally map to no categories (editor follow-up). */
export const DTYPE_NO_CATEGORIES = new Set([
	'multiple',
	'report by the stv company to the pennsylvania turnpike commission',
])
