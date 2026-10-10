import {Box, Card, Select, Stack, Text} from '@sanity/ui'
import {type ChangeEvent, useCallback, useEffect, useMemo, useState} from 'react'
import {
	getDraftId,
	getPublishedId,
	set,
	type StringInputProps,
	useClient,
	useFormValue,
} from 'sanity'

import {SANITY_API_VERSION} from '../../lib/sanityEnv'
import {nextArchiveId} from '../lib/nextArchiveId'

interface ImageIdentifierOption {
	prefix: string
	description?: string | null
}

const PREFIXES_QUERY = `*[_type == "imageIdentifier" && defined(prefix)] | order(prefix asc) {
	prefix,
	description
}`

const ARCHIVE_IDS_QUERY = `*[
	_type == "historicalImage"
	&& defined(archiveId)
	&& archiveId match $prefixStar
	&& !(_id in [$id, $draftId])
]{ archiveId }`

/**
 * Archive ID input with imageIdentifier stem picker.
 * Selecting a stem queries Content Lake for existing IDs and fills the next
 * number in sequence. Empty values keep the imported-without-ID warning.
 */
export function HistoricalImageArchiveIdInput(props: StringInputProps) {
	const {value, onChange, renderDefault} = props
	const client = useClient({apiVersion: SANITY_API_VERSION})
	const documentId = useFormValue(['_id']) as string | undefined
	const [options, setOptions] = useState<ImageIdentifierOption[]>([])
	const [isLoadingNext, setIsLoadingNext] = useState(false)
	const [selectValue, setSelectValue] = useState('')
	const isMissing = !value?.trim()

	useEffect(() => {
		let cancelled = false
		client.fetch<ImageIdentifierOption[]>(PREFIXES_QUERY).then(
			(rows) => {
				if (!cancelled) setOptions(rows.filter((row) => row.prefix?.trim()))
			},
			() => {
				if (!cancelled) setOptions([])
			},
		)
		return () => {
			cancelled = true
		}
	}, [client])

	const selectOptions = useMemo(
		() =>
			options.map((row) => {
				const label = row.description?.trim()
					? `${row.prefix} — ${row.description.trim()}`
					: row.prefix
				return {prefix: row.prefix, label}
			}),
		[options],
	)

	const handleSelectPrefix = useCallback(
		async (event: ChangeEvent<HTMLSelectElement>) => {
			const prefix = event.currentTarget.value
			setSelectValue(prefix)
			if (!prefix) return

			setIsLoadingNext(true)
			try {
				const publishedId = documentId ? getPublishedId(documentId) : ''
				const draftId = publishedId ? getDraftId(publishedId) : ''
				const rows = await client.fetch<{archiveId: string}[]>(ARCHIVE_IDS_QUERY, {
					prefixStar: `${prefix}*`,
					id: publishedId || '__none__',
					draftId: draftId || '__none__',
				})
				const existingIds = rows
					.map((row) => row.archiveId)
					.filter((id): id is string => typeof id === 'string' && id.length > 0)
				onChange(set(nextArchiveId(prefix, existingIds)))
			} finally {
				setIsLoadingNext(false)
				setSelectValue('')
			}
		},
		[client, documentId, onChange],
	)

	const picker = (
		<Stack gap={2}>
			<Text size={1} muted>
				Choose a letter prefix to autofill the next Archive ID from existing images.
			</Text>
			<Select
				fontSize={1}
				padding={3}
				value={selectValue}
				disabled={isLoadingNext || selectOptions.length === 0}
				onChange={handleSelectPrefix}
			>
				<option value="">
					{selectOptions.length === 0
						? 'No image identifiers loaded'
						: isLoadingNext
							? 'Calculating next ID…'
							: 'Select image identifier…'}
				</option>
				{selectOptions.map((option) => (
					<option key={option.prefix} value={option.prefix}>
						{option.label}
					</option>
				))}
			</Select>
		</Stack>
	)

	const stringField = <Box>{renderDefault(props)}</Box>

	if (isMissing) {
		return (
			<Stack gap={3}>
				{picker}
				<Card
					padding={3}
					radius={2}
					tone="critical"
					border
					style={{borderColor: '#f03e2f', borderWidth: 2}}
				>
					<Stack gap={3}>
						<Text size={1} weight="semibold" style={{color: '#f03e2f'}}>
							Enter an Archive ID. This image was imported without one.
						</Text>
						<Box
							style={{
								outline: '2px solid #f03e2f',
								outlineOffset: 2,
								borderRadius: 3,
							}}
						>
							{stringField}
						</Box>
					</Stack>
				</Card>
			</Stack>
		)
	}

	return (
		<Stack gap={3}>
			{picker}
			{stringField}
		</Stack>
	)
}
