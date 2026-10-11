import {ThListIcon} from '@sanity/icons/ThList'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Canonical Portable Text table shape for Studio’s built-in table plugin
 * (@portabletext/plugin-table). Cells hold block content.
 */
export const table = defineType({
	name: 'table',
	title: 'Table',
	type: 'object',
	icon: ThListIcon,
	fields: [
		defineField({
			name: 'headerRows',
			title: 'Header rows',
			type: 'number',
			description: 'Number of leading rows treated as column headers (usually 0 or 1).',
			initialValue: 0,
			validation: (Rule) => Rule.min(0).integer(),
		}),
		defineField({
			name: 'rows',
			title: 'Rows',
			type: 'array',
			of: [
				defineArrayMember({
					type: 'object',
					name: 'row',
					fields: [
						defineField({
							name: 'cells',
							title: 'Cells',
							type: 'array',
							of: [
								defineArrayMember({
									type: 'object',
									name: 'cell',
									fields: [
										defineField({
											name: 'value',
											title: 'Cell content',
											type: 'array',
											of: [defineArrayMember({type: 'block'})],
										}),
									],
								}),
							],
						}),
					],
				}),
			],
		}),
	],
	preview: {
		select: {
			rows: 'rows',
			headerRows: 'headerRows',
		},
		prepare({rows, headerRows}) {
			const rowCount = Array.isArray(rows) ? rows.length : 0
			const colCount =
				Array.isArray(rows) && rows[0]?.cells ? rows[0].cells.length : 0
			return {
				title: rowCount ? `Table (${rowCount}×${colCount})` : 'Table',
				subtitle:
					typeof headerRows === 'number' && headerRows > 0
						? `${headerRows} header row${headerRows === 1 ? '' : 's'}`
						: undefined,
				media: ThListIcon,
			}
		},
	},
})
