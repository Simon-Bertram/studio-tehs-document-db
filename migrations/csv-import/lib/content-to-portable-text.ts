/**
 * Convert document CSV `content` HTML into Portable Text with
 * historicalImageEmbed placeholders for <img> tags and table blocks for
 * HTML data tables and tab-separated grids.
 */
import {htmlToBlocks} from '@portabletext/block-tools'
import {Schema} from '@sanity/schema'
import {JSDOM} from 'jsdom'
import {nanoid} from 'nanoid'

import {cleanString, decodeHtmlEntities} from './clean'
import type {DocumentImageCatalog} from './document-image-catalog'
import {classifyDocumentImageSrc} from './document-image-catalog'

export interface PortableTextSpan {
	_type: 'span'
	_key: string
	text: string
	marks?: string[]
}

export interface PortableTextTextBlock {
	_type: 'block'
	_key: string
	style?: string
	listItem?: string
	level?: number
	markDefs?: {_type: string; _key: string; href?: string}[]
	children: PortableTextSpan[]
}

export interface HistoricalImageEmbedPending {
	_type: 'historicalImageEmbed'
	_key: string
	historicalImage: {_type: 'reference'; _ref: string}
	imageRole: 'figure'
	alt?: string
	caption?: string
	/** Catalog archiveId to look up, or empty when importing a new image. */
	_pendingArchiveId?: string
	/** Deterministic import _id when creating without Archive ID. */
	_pendingImportId?: string
	/** Original src for upload / reporting. */
	_pendingSrc: string
	_pendingFilename: string
}

export interface TableCellBlock {
	_type: 'cell'
	_key: string
	value: PortableTextTextBlock[]
}

export interface TableRowBlock {
	_type: 'row'
	_key: string
	cells: TableCellBlock[]
}

export interface TableBlock {
	_type: 'table'
	_key: string
	headerRows: number
	rows: TableRowBlock[]
}

export type ContentBlock = PortableTextTextBlock | HistoricalImageEmbedPending | TableBlock

export interface ContentToPortableTextResult {
	blocks: ContentBlock[]
	warnings: string[]
}

const compiledSchema = Schema.compile({
	name: 'documentContentImport',
	types: [
		{
			name: 'historicalImage',
			type: 'document',
			fields: [{name: 'title', type: 'string'}],
		},
		{
			name: 'table',
			type: 'object',
			fields: [
				{name: 'headerRows', type: 'number'},
				{
					name: 'rows',
					type: 'array',
					of: [
						{
							type: 'object',
							name: 'row',
							fields: [
								{
									name: 'cells',
									type: 'array',
									of: [
										{
											type: 'object',
											name: 'cell',
											fields: [
												{
													name: 'value',
													type: 'array',
													of: [{type: 'block'}],
												},
											],
										},
									],
								},
							],
						},
					],
				},
			],
		},
		{
			name: 'post',
			type: 'document',
			fields: [
				{
					name: 'body',
					type: 'array',
					of: [
						{
							type: 'block',
							marks: {
								decorators: [
									{title: 'Strong', value: 'strong'},
									{title: 'Emphasis', value: 'em'},
								],
								annotations: [
									{
										name: 'link',
										type: 'object',
										fields: [{name: 'href', type: 'url'}],
									},
								],
							},
							styles: [
								{title: 'Normal', value: 'normal'},
								{title: 'H2', value: 'h2'},
								{title: 'H3', value: 'h3'},
								{title: 'Quote', value: 'blockquote'},
							],
							lists: [
								{title: 'Bullet', value: 'bullet'},
								{title: 'Number', value: 'number'},
							],
						},
						{
							name: 'historicalImageEmbed',
							type: 'object',
							fields: [
								{
									name: 'historicalImage',
									type: 'reference',
									to: [{type: 'historicalImage'}],
								},
								{name: 'caption', type: 'string'},
								{name: 'alt', type: 'string'},
								{name: 'imageRole', type: 'string'},
							],
						},
						{type: 'table'},
					],
				},
			],
		},
	],
})

const blockContentType = compiledSchema
	.get('post')
	.fields.find((field: {name: string}) => field.name === 'body').type

function looksLikeHtml(value: string): boolean {
	return /<\/?[a-z][\s\S]*>/i.test(value)
}

/**
 * Turn repeated <br> pairs into paragraph breaks so clipping text
 * becomes multiple PT blocks.
 */
export function preprocessContentHtml(html: string): string {
	return html.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p>')
}

function plainTextBlock(text: string): PortableTextTextBlock {
	return {
		_type: 'block',
		_key: nanoid(),
		style: 'normal',
		markDefs: [],
		children: [{_type: 'span', _key: nanoid(), text, marks: []}],
	}
}

function cellFromText(text: string): TableCellBlock {
	const trimmed = text.replace(/\s+/g, ' ').trim()
	return {
		_type: 'cell',
		_key: nanoid(),
		value: trimmed ? [plainTextBlock(trimmed)] : [],
	}
}

function emptyCell(): TableCellBlock {
	return {_type: 'cell', _key: nanoid(), value: []}
}

/**
 * Strip HTML tags for photo-type historicalImage.description.
 */
export function stripHtmlToPlainText(value: string): string {
	const decoded = decodeHtmlEntities(value)
	if (!looksLikeHtml(decoded)) return decoded.replace(/\s+/g, ' ').trim()
	const withBreaks = decoded.replace(/<br\s*\/?>/gi, ' ')
	const dom = new JSDOM(`<div id="root">${withBreaks}</div>`)
	const text = dom.window.document.querySelector('#root')?.textContent ?? withBreaks
	return text.replace(/\s+/g, ' ').trim()
}

function usableAlt(alt: string | null | undefined): string | undefined {
	const cleaned = cleanString(alt)
	if (!cleaned) return undefined
	if (cleaned.toLowerCase().includes('image not found')) return undefined
	return cleaned
}

function isLayoutChromeRow(tr: Element): boolean {
	return Boolean(
		tr.querySelector('.NavHintBox, .Navlinks, .TitleBox, .Navlink, .tt18cHint') ||
		tr.classList.contains('NavHintBox') ||
		tr.classList.contains('TitleBox'),
	)
}

function isLayoutTable(table: Element): boolean {
	const cls = table.getAttribute('class') ?? ''
	if (/\bcontent[12]\b/i.test(cls)) return true
	if (table.querySelector('.NavHintBox, .Navlinks, .TitleBox, .Navlink')) return true
	return false
}

/**
 * Replace layout/chrome wrapper tables with their non-chrome cell HTML so
 * nested data tables and prose remain for normal conversion.
 */
export function unwrapLayoutTables(html: string): string {
	const dom = new JSDOM(`<div id="root">${html}</div>`)
	const root = dom.window.document.querySelector('#root')
	if (!root) return html

	const tables = [...root.querySelectorAll('table')].reverse()
	for (const table of tables) {
		if (!isLayoutTable(table)) continue

		const parts: string[] = []
		const rows = table.querySelectorAll(':scope > tbody > tr, :scope > thead > tr, :scope > tr')
		for (const tr of rows) {
			if (isLayoutChromeRow(tr)) continue
			for (const cell of tr.querySelectorAll(':scope > td, :scope > th')) {
				parts.push(cell.innerHTML)
			}
		}

		const wrapper = table.ownerDocument!.createElement('div')
		wrapper.innerHTML = parts.join('\n')
		table.replaceWith(...Array.from(wrapper.childNodes))
	}

	return root.innerHTML
}

function cellPlainText(cell: Element): string {
	const clone = cell.cloneNode(true) as Element
	clone.querySelectorAll('br').forEach((br) => br.replaceWith(' '))
	const text = clone.textContent ?? ''
	return decodeHtmlEntities(text).replace(/\s+/g, ' ').trim()
}

function tableRowElements(table: Element): Element[] {
	return [
		...table.querySelectorAll(':scope > thead > tr'),
		...table.querySelectorAll(':scope > tbody > tr'),
		...table.querySelectorAll(':scope > tr'),
	]
}

/**
 * Expand HTML table rows into a rectangular grid. colspan/rowspan are
 * flattened (merged cells become the source text in the origin cell and
 * empty fillers elsewhere).
 */
export function htmlTableElementToBlock(table: Element): {
	block: TableBlock
	simplified: boolean
} {
	const trs = tableRowElements(table)
	let simplified = false
	const grid: (string | null)[][] = []
	const occupied = new Set<string>()

	for (let r = 0; r < trs.length; r++) {
		if (!grid[r]) grid[r] = []
		let c = 0
		const cells = [...trs[r].querySelectorAll(':scope > td, :scope > th')]
		for (const cell of cells) {
			while (occupied.has(`${r},${c}`)) c++

			const colspan = Math.max(1, Number(cell.getAttribute('colspan')) || 1)
			const rowspan = Math.max(1, Number(cell.getAttribute('rowspan')) || 1)
			if (colspan > 1 || rowspan > 1) simplified = true

			const text = cellPlainText(cell)
			for (let dr = 0; dr < rowspan; dr++) {
				for (let dc = 0; dc < colspan; dc++) {
					const rr = r + dr
					const cc = c + dc
					if (!grid[rr]) grid[rr] = []
					occupied.add(`${rr},${cc}`)
					grid[rr][cc] = dr === 0 && dc === 0 ? text : ''
				}
			}
			c += colspan
		}
	}

	const colCount = grid.reduce((max, row) => Math.max(max, row?.length ?? 0), 0)
	const rows: TableRowBlock[] = grid.map((row) => {
		const cells: TableCellBlock[] = []
		for (let c = 0; c < colCount; c++) {
			const text = row?.[c] ?? ''
			cells.push(text ? cellFromText(text) : emptyCell())
		}
		return {_type: 'row', _key: nanoid(), cells}
	})

	const firstRow = trs[0]
	const firstIsHeader =
		Boolean(firstRow) &&
		[...firstRow.querySelectorAll(':scope > th, :scope > td')].every(
			(el) => el.tagName.toLowerCase() === 'th',
		) &&
		firstRow.querySelector(':scope > th') !== null

	return {
		block: {
			_type: 'table',
			_key: nanoid(),
			headerRows: firstIsHeader ? 1 : 0,
			rows,
		},
		simplified,
	}
}

function looksLikeTsvHeaderRow(cells: string[]): boolean {
	const nonEmpty = cells.map((c) => c.trim()).filter(Boolean)
	if (nonEmpty.length < 2) return false
	return nonEmpty.every((cell) => {
		if (cell.length > 24) return false
		if (/\d{4}/.test(cell)) return false
		return /[a-zA-Z]/.test(cell)
	})
}

function tsvRunToTable(lines: string[]): TableBlock {
	const parsed = lines.map((line) => line.split('\t').map((c) => decodeHtmlEntities(c)))
	const colCount = parsed.reduce((max, row) => Math.max(max, row.length), 0)
	const headerRows = looksLikeTsvHeaderRow(parsed[0] ?? []) ? 1 : 0

	const rows: TableRowBlock[] = parsed.map((cells) => ({
		_type: 'row',
		_key: nanoid(),
		cells: Array.from({length: colCount}, (_, i) => {
			const text = (cells[i] ?? '').replace(/\s+/g, ' ').trim()
			return text ? cellFromText(text) : emptyCell()
		}),
	}))

	return {
		_type: 'table',
		_key: nanoid(),
		headerRows,
		rows,
	}
}

function tabCount(line: string): number {
	return (line.match(/\t/g) ?? []).length
}

/**
 * Split plain (or mixed) content into PT blocks, converting consecutive
 * tab-separated column runs into table blocks.
 */
export function plainContentWithTsvToBlocks(content: string): ContentBlock[] {
	const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
	const blocks: ContentBlock[] = []
	let i = 0

	while (i < lines.length) {
		const tabs = tabCount(lines[i])
		if (tabs >= 2) {
			const run: string[] = []
			const expectedTabs = tabs
			while (i < lines.length && tabCount(lines[i]) === expectedTabs) {
				run.push(lines[i])
				i++
			}
			const dataRows = run.filter((line) => line.split('\t').some((cell) => cell.trim()))
			if (dataRows.length >= 2) {
				blocks.push(tsvRunToTable(dataRows))
			} else {
				for (const line of dataRows) {
					const text = decodeHtmlEntities(line.replace(/\t/g, ' ')).replace(/\s+/g, ' ').trim()
					if (text) blocks.push(plainTextBlock(text))
				}
			}
			continue
		}

		const text = decodeHtmlEntities(lines[i]).replace(/\s+/g, ' ').trim()
		if (text) blocks.push(plainTextBlock(text))
		i++
	}

	return blocks
}

/**
 * Convert document content to Portable Text. Images become embeds with
 * pending fields that run-import resolves to real Sanity references.
 * HTML data tables and tab-separated grids become `table` blocks.
 */
export function contentToPortableText(
	content: string,
	catalog: DocumentImageCatalog,
): ContentBlock[] {
	return contentToPortableTextDetailed(content, catalog).blocks
}

/**
 * Same as contentToPortableText, plus warnings (e.g. colspan/rowspan flattened).
 */
export function contentToPortableTextDetailed(
	content: string,
	catalog: DocumentImageCatalog,
): ContentToPortableTextResult {
	const warnings: string[] = []
	const trimmed = content.trim()
	if (!trimmed) return {blocks: [], warnings}

	if (!looksLikeHtml(trimmed)) {
		return {blocks: plainContentWithTsvToBlocks(trimmed), warnings}
	}

	const unwrapped = unwrapLayoutTables(trimmed)
	const prepared = preprocessContentHtml(unwrapped)
	const wrapped = /<\s*p[\s>]/i.test(prepared) ? prepared : `<p>${prepared}</p>`

	const blocks = htmlToBlocks(wrapped, blockContentType, {
		parseHtml: (html) => new JSDOM(html).window.document,
		rules: [
			{
				deserialize(el, _next, block) {
					if (el.nodeType !== 1) return undefined
					const element = el as Element
					const tag = element.tagName?.toLowerCase()

					if (tag === 'table') {
						if (isLayoutTable(element)) return undefined
						const {block: tableBlock, simplified} = htmlTableElementToBlock(element)
						if (tableBlock.rows.length === 0) return undefined
						if (simplified) {
							warnings.push(
								'table-simplified: HTML colspan/rowspan flattened into a rectangular grid',
							)
						}
						// block-tools expects an index signature; our typed blocks are plain objects.
						return block({...tableBlock})
					}

					if (tag !== 'img') return undefined

					const src = element.getAttribute('src')?.trim() ?? ''
					if (!src) return undefined

					const classified = classifyDocumentImageSrc(src, catalog)
					if (classified.kind === 'skip') return undefined

					const alt = usableAlt(element.getAttribute('alt'))
					const pending: HistoricalImageEmbedPending = {
						_type: 'historicalImageEmbed',
						_key: nanoid(),
						historicalImage: {_type: 'reference', _ref: 'pending'},
						imageRole: 'figure',
						...(alt ? {alt} : {}),
						_pendingSrc: classified.src,
						_pendingFilename: classified.filename,
						...(classified.kind === 'catalog'
							? {_pendingArchiveId: classified.archiveId}
							: {_pendingImportId: classified.importId}),
					}

					return block({...pending})
				},
			},
		],
	}) as ContentBlock[]

	// htmlToBlocks may leave tab-separated plain text inside a single block when
	// content was HTML-wrapped but still contains TSV sections — expand those.
	const expanded: ContentBlock[] = []
	for (const b of blocks) {
		if (b._type !== 'block') {
			expanded.push(b)
			continue
		}
		const text = b.children?.map((c) => c.text).join('') ?? ''
		if (tabCount(text) >= 2 || text.includes('\n')) {
			const maybeTsv = plainContentWithTsvToBlocks(text)
			if (maybeTsv.some((x) => x._type === 'table')) {
				expanded.push(...maybeTsv)
				continue
			}
		}
		expanded.push(b)
	}

	return {blocks: expanded, warnings}
}

/**
 * Strip pending_* fields after references are resolved.
 */
export function stripPendingImageFields(blocks: ContentBlock[]): ContentBlock[] {
	return blocks.map((block) => {
		if (block._type !== 'historicalImageEmbed') return block
		const {
			_pendingArchiveId: _a,
			_pendingImportId: _i,
			_pendingSrc: _s,
			_pendingFilename: _f,
			...rest
		} = block as HistoricalImageEmbedPending
		return rest as HistoricalImageEmbedPending
	})
}
