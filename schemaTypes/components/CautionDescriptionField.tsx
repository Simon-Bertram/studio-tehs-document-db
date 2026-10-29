import {Text} from '@sanity/ui'
import type {FieldProps} from 'sanity'

/**
 * Renders the field description in Sanity's caution (yellow) tone
 * so Studio-only note fields read as a warning.
 */
export function CautionDescriptionField(props: FieldProps) {
	const {description, renderDefault} = props

	if (!description) {
		return renderDefault(props)
	}

	return renderDefault({
		...props,
		description: (
			<Text size={1} as="p" style={{color: 'var(--card-caution-fg-color)'}}>
				{description}
			</Text>
		),
	})
}
