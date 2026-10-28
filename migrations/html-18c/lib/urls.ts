/**
 * Seed URLs, crawl rules, and exclusions for the 18c HTML migration.
 */

export const SITE_ORIGIN = 'https://www.the2nomads.site'
export const SITE_PREFIX = '/18cTredyffrin/'

export const SEED_URLS: string[] = [
	`${SITE_ORIGIN}${SITE_PREFIX}Buildings.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}SlavesInTredyffrin.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}Wars.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}Military/TheGeneralsQuarters.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}Military/MeetingForSuffering.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}InnsList.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}Industries/IntroductionToMills.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}MaryJonesDiary/MaryJonesDiary.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}Railroads/PRR.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}Railroads/ChesterValleyRailroad.html`,
	'https://www.tehistory.org/hqda/html/v44/v44n1+2p046.html',
	`${SITE_ORIGIN}${SITE_PREFIX}RoadOverview.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}Schools.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}TaxReturns.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}Genealogy.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}Currency.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}Trees.html`,
]

/** Hub pages that get an internalSubLinks block of child articles. */
export const HUB_URLS = new Set([
	`${SITE_ORIGIN}${SITE_PREFIX}Buildings.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}Wars.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}Military/TheGeneralsQuarters.html`,
	`${SITE_ORIGIN}${SITE_PREFIX}InnsList.html`,
])

export const EXCLUDED_PATH_SUFFIXES = [
	'/1798map.html',
	'/1777map.html',
	'/Taxes2016-10-1.xls',
]

export const EXCLUDED_EXTENSIONS = new Set([
	'.xls',
	'.xlsx',
	'.pdf',
	'.doc',
	'.docx',
	'.zip',
	'.mp3',
	'.mp4',
	'.mov',
])

/** Names listed on Buildings.html for the human property review list. */
export const EXPECTED_BUILDING_NAMES = [
	'Acker Farmhouse',
	'Baugh Farmhouse',
	'George Beaver House',
	'Charles Bloomhart Farmhouse',
	'Chesterbrook Farmhouse',
	'Christie Farm',
	'Church Road Cabin',
	'Mordecai Cornog Farmhouse',
	'Davis Farmhouse',
	'Detwiler-Andrews House',
	'Duportail’s Quarters',
	'John Garber House',
	'Great Valley House',
	'Miller’s House, Great Valley Mill',
	'Greene’s Quarters',
	'Greenwood Farm',
	'Joseph Hampton Log House',
	'Thomas Hampton Log House',
	'Iddings House',
	'Knox’s Quarters',
	'Knyphausen’s & Woodford’s Quarters',
	'Lafayette’s Quarters',
	'Lee and Bradford’s Quarters',
	'Joseph Mitchell House',
	'Howe’s and Scott’s Quarters',
	'Mifflin’s Quarters',
	'Neilly Log Cabin',
	'Potter’s Quarters',
	'William Pugh House',
	'Pulaski’s Quarters',
	'Rees Homestead (Cornwallis’ Quarters)',
	'Rickabaugh Farmhouse',
	'Rickabaugh Tenant House',
	'John Roberts Farmhouse',
	'Robinson - Conard House',
	'John Rowland House',
	'Benjamin Shank House',
	'Stirling’s Quarters',
	'Wayne-Landis House',
	'Wayne’s Quarters',
	'David Wilson Farmhouse',
]

/** People listed on SlavesInTredyffrin for the human person review list. */
export const EXPECTED_SLAVES_PAGE_PEOPLE = [
	'Richard Britain',
	'James Brown',
	'John Brown',
	'Sarah Christie',
	'John Cloyd',
	'William Currie',
	'Benjamin Davis',
	'Elizabeth David',
	'Isaac David',
	'James David senior',
	'Captain John Davis',
	'Dr. John Davis',
	'William Dewees',
	'William Godfrey',
	'Isaac Griffith',
	'John Gronow',
	'Lewis Gronow',
	'Havard family',
	'Ann Havard',
	'David Havard',
	'John Havard',
	'Sarah Havard',
	'Samuel Havard',
	'John Jarvis',
	'Samuel John',
	'David Jones',
	'Levi Jones',
	'Joseph Mitchell',
	'Edward Physick',
	'Richard Robinson',
	'Rev. John Simonton',
	'Samuel Smith',
	'Abijah Stephens',
	'Thomas Waters',
	'Benjamin Weatherby',
	'John Williams',
	'David Wilson',
	'John Wilson',
]

export function normalizeUrl(raw: string, baseUrl: string): string | null {
	try {
		const url = new URL(raw, baseUrl)
		url.hash = ''
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
		return url.href
	} catch {
		return null
	}
}

export function isExcludedUrl(href: string): boolean {
	const lower = href.toLowerCase()
	for (const suffix of EXCLUDED_PATH_SUFFIXES) {
		if (lower.endsWith(suffix.toLowerCase())) return true
	}
	try {
		const pathname = new URL(href).pathname.toLowerCase()
		const dot = pathname.lastIndexOf('.')
		if (dot >= 0) {
			const ext = pathname.slice(dot)
			if (EXCLUDED_EXTENSIONS.has(ext)) return true
		}
	} catch {
		return true
	}
	return false
}

/**
 * Same-site article HTML under /18cTredyffrin/ (or the one tehistory seed).
 */
export function isInScopeArticleUrl(href: string): boolean {
	if (isExcludedUrl(href)) return false
	try {
		const url = new URL(href)
		const path = url.pathname
		if (!path.toLowerCase().endsWith('.html') && !path.toLowerCase().endsWith('.htm')) {
			return false
		}
		if (url.hostname === 'www.the2nomads.site' || url.hostname === 'the2nomads.site') {
			return path.includes('/18cTredyffrin/')
		}
		if (url.hostname === 'www.tehistory.org' || url.hostname === 'tehistory.org') {
			return href === 'https://www.tehistory.org/hqda/html/v44/v44n1+2p046.html'
		}
		return false
	} catch {
		return false
	}
}

/**
 * Whether a linked URL from a seed page should be crawled as another article.
 * Follows same-site /18cTredyffrin/*.html links from hubs and building pages.
 */
export function shouldFollowLink(href: string, fromUrl: string): boolean {
	if (!isInScopeArticleUrl(href)) return false
	if (href === fromUrl) return false
	return true
}
