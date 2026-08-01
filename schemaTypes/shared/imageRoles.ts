export const IMAGE_ROLES = [
	{title: 'Primary illustration', value: 'figure'},
	{title: 'Supporting image', value: 'aside'},
] as const

export type ImageRoleValue = (typeof IMAGE_ROLES)[number]['value']

export const IMAGE_ROLE_VALUES: readonly ImageRoleValue[] = IMAGE_ROLES.map(
	(role) => role.value,
)
