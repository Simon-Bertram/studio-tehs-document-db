/** Published singleton IDs for public-site chrome. */
export const SITE_NAVIGATION_DOCUMENT_ID = 'siteNavigation'
export const SITE_SETTINGS_DOCUMENT_ID = 'siteSettings'
export const HOME_PAGE_DOCUMENT_ID = 'homePage'

export const SITE_CHROME_SINGLETON_TYPES = [
	'siteNavigation',
	'siteSettings',
	'homePage',
] as const

export type SiteChromeSingletonType = (typeof SITE_CHROME_SINGLETON_TYPES)[number]

export function isSiteChromeSingletonType(schemaType: string): boolean {
	return (SITE_CHROME_SINGLETON_TYPES as readonly string[]).includes(schemaType)
}
