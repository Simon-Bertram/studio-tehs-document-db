export const SITE_NAVIGATION_EDITOR_ROLES = ['administrator', 'editor', 'developer'] as const

type RoleHolder = {
	roles?: {name: string}[]
}

/**
 * True when the Studio user may change public site navigation.
 * Contributors and viewers catalog archive content; they do not edit menus.
 */
export function canEditSiteNavigation(user?: RoleHolder | null): boolean {
	const names = user?.roles?.map((role) => role.name) ?? []
	return names.some((name) => (SITE_NAVIGATION_EDITOR_ROLES as readonly string[]).includes(name))
}
