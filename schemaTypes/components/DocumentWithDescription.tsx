import {Stack, Text} from '@sanity/ui'
import type {ObjectInputProps} from 'sanity'

/**
 * Renders the document schema `description` as visible form guidance
 * (Studio only shows it as a title-bar tooltip by default).
 */
export function DocumentWithDescription(props: ObjectInputProps) {
	const {schemaType, renderDefault} = props
	const description = schemaType.description

	return (
		<Stack space={4}>
			{description ? (
				<Text size={1} muted as="p">
					{description}
				</Text>
			) : null}
			{renderDefault(props)}
		</Stack>
	)
}
