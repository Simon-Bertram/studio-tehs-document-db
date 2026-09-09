export const SITE_NAVIGATION_DOCUMENT_ID = 'siteNavigation'

export type SiteNavLinkKind = 'page' | 'search'

export interface SiteNavLinkSeed {
	_key: string
	_type: 'navLink'
	label: string
	href: string
	kind: SiteNavLinkKind
	purpose: string
}

export const SITE_NAVIGATION_PRIMARY_LINKS: SiteNavLinkSeed[] = [
	{
		_key: 'nav-home',
		_type: 'navLink',
		label: 'Home',
		href: '/',
		kind: 'page',
		purpose: 'Site home',
	},
	{
		_key: 'nav-quarterly',
		_type: 'navLink',
		label: 'Quarterly',
		href: '/quarterly',
		kind: 'page',
		purpose: 'Volume index',
	},
	{
		_key: 'nav-images',
		_type: 'navLink',
		label: 'Images',
		href: '/images',
		kind: 'page',
		purpose: 'Catalog landing and search',
	},
	{
		_key: 'nav-documents',
		_type: 'navLink',
		label: 'Documents',
		href: '/documents',
		kind: 'page',
		purpose: 'Clippings and transcriptions',
	},
	{
		_key: 'nav-research',
		_type: 'navLink',
		label: 'Research',
		href: '/research',
		kind: 'page',
		purpose: 'Modern articles and township history',
	},
	{
		_key: 'nav-search',
		_type: 'navLink',
		label: 'Search',
		href: '/search',
		kind: 'search',
		purpose: 'Header search control; results page',
	},
]

export const SITE_NAVIGATION_SECONDARY_LINKS: SiteNavLinkSeed[] = [
	{
		_key: 'nav-places',
		_type: 'navLink',
		label: 'Places',
		href: '/places',
		kind: 'page',
		purpose: 'Tredyffrin, Easttown, then villages',
	},
	{
		_key: 'nav-people',
		_type: 'navLink',
		label: 'People',
		href: '/people',
		kind: 'page',
		purpose: 'A–Z; only people with public incoming links',
	},
	{
		_key: 'nav-subjects',
		_type: 'navLink',
		label: 'Subjects',
		href: '/subjects',
		kind: 'page',
		purpose: 'Theme index (concrete subjects, not fuzzy Person/Place/View)',
	},
	{
		_key: 'nav-about',
		_type: 'navLink',
		label: 'About',
		href: '/about',
		kind: 'page',
		purpose: 'Society context; remove if this site nests under tehistory.org',
	},
]
