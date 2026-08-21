import {PinIcon} from '@sanity/icons/Pin'
import {WarningOutlineIcon} from '@sanity/icons/WarningOutline'
import {Box} from '@sanity/ui'

/**
 * List preview media: township pin with a caution warning overlay
 * when the document has no county.
 */
export function TownshipMissingCountyMedia() {
	return (
		<Box style={{position: 'relative', width: '1em', height: '1em'}} title="No county">
			<PinIcon />
			<WarningOutlineIcon
				style={{
					position: 'absolute',
					right: '-0.35em',
					bottom: '-0.35em',
					width: '0.75em',
					height: '0.75em',
					color: 'var(--card-caution-fg-color)',
				}}
			/>
		</Box>
	)
}
