import {Box, Card, Stack, Text} from '@sanity/ui'
import type {StringInputProps} from 'sanity'

/**
 * Archive ID input that highlights an empty value in red so editors can
 * find imported historical images that still need an identifier.
 */
export function MissingArchiveIdInput(props: StringInputProps) {
	const {value, renderDefault} = props
	const isMissing = !value?.trim()

	return (
		<Stack gap={3}>
			{isMissing ? (
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
							{renderDefault(props)}
						</Box>
					</Stack>
				</Card>
			) : (
				renderDefault(props)
			)}
		</Stack>
	)
}
