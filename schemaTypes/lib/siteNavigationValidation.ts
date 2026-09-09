type NavLinkValue = {
	href?: string
	kind?: string
}

export function isSitePath(href: string | undefined): boolean {
	if (!href) return false
	if (href === '/') return true
	return /^\/[A-Za-z0-9/_-]*$/.test(href)
}

/**
 * Unique hrefs across header and Explore menus; at most one Search item.
 */
export function validateSiteNavigationMenus(
	primaryLinks: NavLinkValue[] | undefined,
	secondaryLinks: NavLinkValue[] | undefined,
): string | true {
	const all = [...(primaryLinks ?? []), ...(secondaryLinks ?? [])]
	const hrefs = all.map((link) => link.href?.trim()).filter(Boolean) as string[]
	if (new Set(hrefs).size !== hrefs.length) {
		return 'Each path can appear only once across the header and Explore menus'
	}
	const searchCount = all.filter((link) => link.kind === 'search').length
	if (searchCount > 1) {
		return 'Only one Search item is allowed'
	}
	return true
}
