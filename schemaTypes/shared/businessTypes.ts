export const BUSINESS_TYPES = [
	{title: 'Civic / Community', value: 'civic'},
	{title: 'Commercial / Industrial', value: 'commercial'},
	{title: 'Institutional', value: 'institutional'},
] as const

export type BusinessTypeValue = (typeof BUSINESS_TYPES)[number]['value']

export const BUSINESS_TYPE_LABELS: Record<BusinessTypeValue, string> = Object.fromEntries(
	BUSINESS_TYPES.map(({title, value}) => [value, title]),
) as Record<BusinessTypeValue, string>
