/**
 * Enable Studio’s built-in Portable Text table editing for a field that
 * includes the `table` object type in its `of` array.
 */
export function portableTextTablePlugins(props: {
	renderDefault: (props: unknown) => unknown
	plugins?: Record<string, unknown>
}) {
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
