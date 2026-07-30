export const RELATIONSHIP_TYPES = [
	{title: 'Spouse', value: 'spouse'},
	{title: 'Parent', value: 'parent'},
	{title: 'Child', value: 'child'},
	{title: 'Sibling', value: 'sibling'},
	{title: 'Cousin', value: 'cousin'},
	{title: 'Other', value: 'other'},
] as const

export type RelationshipTypeValue = (typeof RELATIONSHIP_TYPES)[number]['value']

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipTypeValue, string> =
	Object.fromEntries(
		RELATIONSHIP_TYPES.map(({title, value}) => [value, title]),
	) as Record<RelationshipTypeValue, string>
