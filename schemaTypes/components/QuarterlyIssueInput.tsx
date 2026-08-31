import {useEffect} from 'react'
import {type ObjectInputProps, set, unset} from 'sanity'

import {type HistoricalDateValue} from '../lib/formatHistoricalDate'
import {yearSearchTokens} from '../lib/yearSearchTokens'
import {DocumentWithDescription} from './DocumentWithDescription'

/**
 * Document input that keeps hidden yearSearch in sync with publicationDate
 * so Studio list/global search can match year prefixes (e.g. 195 → 1950–1959).
 */
export function QuarterlyIssueInput(props: ObjectInputProps) {
	const {onChange, value} = props
	const publicationDate = value?.publicationDate as HistoricalDateValue | undefined
	const tokens = yearSearchTokens(publicationDate)
	const current = typeof value?.yearSearch === 'string' ? value.yearSearch : undefined

	useEffect(() => {
		if (tokens === current) return
		if (tokens) onChange(set(tokens, ['yearSearch']))
		else if (current !== undefined) onChange(unset(['yearSearch']))
	}, [tokens, current, onChange])

	return <DocumentWithDescription {...props} />
}
