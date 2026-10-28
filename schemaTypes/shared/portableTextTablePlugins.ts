/**
 * Enable Studio’s built-in Portable Text table editing for a field that
 * includes the `table` object type in its `of` array.
 */
import type {PortableTextPluginsProps} from 'sanity'

export function portableTextTablePlugins(props: PortableTextPluginsProps) {
	return props.renderDefault({
		...props,
		plugins: {
			...props.plugins,
			table: {
				enabled: true,
			},
		},
	})
}
