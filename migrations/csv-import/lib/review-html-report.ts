/**
 * Self-contained HTML review pages: zebra tables, filters, and per-row
 * resolved checkboxes persisted in localStorage.
 */

export interface ReviewChip {
	value: string
	label: string
	count: number
}

export interface ReviewRow {
	id: string
	filterValues: string[]
	searchText: string
	cells: string[]
}

export interface ReviewSection {
	id: string
	title: string
	blurb?: string
	headingGroup?: string
	headers: string[]
	rows: ReviewRow[]
}

export interface ReviewView {
	id: string
	title: string
	sections: ReviewSection[]
}

export interface ReviewPage {
	reportId: string
	title: string
	summary: string
	howToFix: string[]
	notes?: string[]
	chips: ReviewChip[]
	chipLegend: string
	views: ReviewView[]
}

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

export function badgeHtml(text: string, tone: 'neutral' | 'warn' | 'quiet' = 'neutral'): string {
	return `<span class="badge badge-${tone}">${escapeHtml(text)}</span>`
}

export function linkHtml(href: string, label: string): string {
	return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`
}

export function uniqueRowIds(page: ReviewPage): string[] {
	const ids = new Set<string>()
	for (const view of page.views) {
		for (const section of view.sections) {
			for (const row of section.rows) ids.add(row.id)
		}
	}
	return Array.from(ids)
}

function attr(value: string): string {
	return escapeHtml(value)
}

function renderRow(row: ReviewRow): string {
	const filter = attr(row.filterValues.join(' '))
	const search = attr(row.searchText.toLowerCase())
	const id = attr(row.id)
	const cells = row.cells
		.map((cell, index) => {
			const cls = index === 0 ? ' class="id-cell"' : ''
			return `\t\t\t\t<td${cls}>${cell}</td>`
		})
		.join('\n')
	return [
		`\t\t\t<tr data-id="${id}" data-filter="${filter}" data-search="${search}">`,
		`\t\t\t\t<td class="resolve-cell">`,
		`\t\t\t\t\t<label>`,
		`\t\t\t\t\t\t<input type="checkbox" class="resolve-toggle" data-id="${id}" />`,
		`\t\t\t\t\t\t<span>Resolved</span>`,
		`\t\t\t\t\t</label>`,
		`\t\t\t\t</td>`,
		cells,
		`\t\t\t</tr>`,
	].join('\n')
}

function renderSection(section: ReviewSection): string {
	const headers = ['Resolved', ...section.headers]
		.map((header) => `\t\t\t\t<th scope="col">${escapeHtml(header)}</th>`)
		.join('\n')
	const rows =
		section.rows.length > 0
			? section.rows.map(renderRow).join('\n')
			: `\t\t\t<tr class="empty-row"><td colspan="${headers ? section.headers.length + 1 : 1}">None.</td></tr>`
	const blurb = section.blurb
		? `\t\t<p class="section-blurb">${escapeHtml(section.blurb)}</p>\n`
		: ''
	return [
		`\t<section class="section" data-section="${attr(section.id)}" id="${attr(section.id)}">`,
		`\t\t<div class="section-head">`,
		`\t\t\t<h3>${escapeHtml(section.title)}</h3>`,
		`\t\t\t<div class="section-actions">`,
		`\t\t\t\t<button type="button" class="mark-visible" data-resolved="true">Mark visible resolved</button>`,
		`\t\t\t\t<button type="button" class="mark-visible" data-resolved="false">Mark visible unresolved</button>`,
		`\t\t\t</div>`,
		`\t\t</div>`,
		blurb,
		`\t\t<div class="table-wrap">`,
		`\t\t<table>`,
		`\t\t\t<thead>`,
		`\t\t\t\t<tr>`,
		headers,
		`\t\t\t\t</tr>`,
		`\t\t\t</thead>`,
		`\t\t\t<tbody>`,
		rows,
		`\t\t\t</tbody>`,
		`\t\t</table>`,
		`\t\t</div>`,
		`\t</section>`,
	].join('\n')
}

function renderView(view: ReviewView): string {
	const parts: string[] = [
		`<section class="view" id="${attr(view.id)}" data-view="${attr(view.id)}">`,
		`\t<h2>${escapeHtml(view.title)}</h2>`,
	]
	let lastGroup = ''
	for (const section of view.sections) {
		const group = section.headingGroup ?? ''
		if (group && group !== lastGroup) {
			parts.push(`\t<h3 class="kind-heading">${escapeHtml(group)}</h3>`)
			lastGroup = group
		}
		parts.push(renderSection(section))
	}
	if (view.sections.length === 0) {
		parts.push(`\t<p class="empty">None.</p>`)
	}
	parts.push(`</section>`)
	return parts.join('\n')
}

function renderChips(chips: ReviewChip[], legend: string, total: number): string {
	const buttons = [
		`<button type="button" class="chip is-active" data-chip="" aria-pressed="true">All (${total})</button>`,
		...chips.map(
			(chip) =>
				`<button type="button" class="chip" data-chip="${attr(chip.value)}" aria-pressed="false">${escapeHtml(
					chip.label,
				)} (${chip.count})</button>`,
		),
	]
	return [
		`<div class="chips" role="group" aria-label="${attr(legend)}">`,
		`\t<span class="legend">${escapeHtml(legend)}</span>`,
		`\t${buttons.join('\n\t')}`,
		`</div>`,
	].join('\n')
}

const REVIEW_CSS = `
:root {
	--text: #1a1a1a;
	--muted: #5c5c58;
	--bg: #ffffff;
	--zebra: #f6f6f4;
	--hover: #ecece8;
	--border: #e4e4e0;
	--badge: #eeeae4;
	--warn: #f3eee6;
}
* { box-sizing: border-box; }
html { color-scheme: light; }
body {
	margin: 0;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
	font-size: 15px;
	line-height: 1.45;
	color: var(--text);
	background: var(--bg);
}
.toolbar {
	position: sticky;
	top: 0;
	z-index: 5;
	background: var(--bg);
	border-bottom: 1px solid var(--border);
	padding: 12px 20px 14px;
}
.toolbar-top {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 16px;
	flex-wrap: wrap;
}
h1 { font-size: 1.35rem; font-weight: 650; margin: 0; }
h2 { font-size: 1.15rem; margin: 28px 0 8px; }
h3 { font-size: 1rem; margin: 0; }
.kind-heading { margin: 24px 0 8px; font-size: 1.05rem; color: var(--muted); font-weight: 650; }
.progress { margin: 0; color: var(--muted); font-variant-numeric: tabular-nums; }
.summary { margin: 8px 0 0; max-width: 72rem; }
.how-to { margin: 8px 0 0; }
.how-to summary { cursor: pointer; color: var(--muted); }
.how-to ol, .notes { margin: 8px 0 0; padding-left: 1.25rem; }
.notes { color: var(--muted); }
.controls {
	display: flex;
	flex-wrap: wrap;
	gap: 10px 14px;
	align-items: center;
	margin-top: 12px;
}
.status-filters, .chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.legend { color: var(--muted); font-size: 13px; margin-right: 4px; }
button, .import {
	font: inherit;
	font-size: 13px;
	border: 1px solid var(--border);
	background: var(--bg);
	color: var(--text);
	padding: 4px 10px;
	border-radius: 4px;
	cursor: pointer;
}
button.is-active { background: var(--badge); border-color: #d4d0c8; }
button:hover, .import:hover { background: var(--hover); }
input[type="search"] {
	font: inherit;
	font-size: 13px;
	padding: 4px 10px;
	border: 1px solid var(--border);
	border-radius: 4px;
	min-width: 16rem;
}
.import { display: inline-flex; align-items: center; gap: 6px; }
.import input { display: none; }
.view-nav { display: flex; gap: 12px; margin-top: 10px; }
.view-nav a { color: var(--text); }
main { padding: 8px 20px 48px; }
.section { margin: 12px 0 28px; }
.section-head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 6px;
}
.section-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.section-blurb { margin: 0 0 8px; color: var(--muted); max-width: 72rem; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td {
	text-align: left;
	vertical-align: top;
	padding: 7px 10px;
	border-bottom: 1px solid var(--border);
}
thead th {
	position: sticky;
	top: 0;
	background: var(--bg);
	font-weight: 650;
	font-size: 13px;
	color: var(--muted);
	z-index: 1;
}
tbody tr:nth-child(even) { background: var(--zebra); }
tbody tr.row-odd { background: var(--bg); }
tbody tr.row-even { background: var(--zebra); }
tbody tr:hover { background: var(--hover); }
tr.is-hidden { display: none; }
tr.is-resolved { color: #6a6a66; }
tr.is-resolved .id-cell { text-decoration: line-through; }
.resolve-cell { white-space: nowrap; width: 7.5rem; }
.resolve-cell label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.badge {
	display: inline-block;
	padding: 1px 7px;
	border-radius: 999px;
	background: var(--badge);
	font-size: 12px;
	font-weight: 600;
}
.badge-warn { background: var(--warn); }
.badge-quiet { background: transparent; border: 1px solid var(--border); color: var(--muted); }
code.keyword, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
.clip-list { margin: 8px 0 0; padding-left: 1.1rem; columns: 3; font-size: 13px; }
.clip-list li { break-inside: avoid; margin: 0 0 2px; }
.empty, .empty-row td { color: var(--muted); }
a { color: #1d4f7a; }
@media print {
	.toolbar .controls, .view-nav, .section-actions, .how-to { display: none; }
	.toolbar { position: static; border: 0; }
	thead th { position: static; }
	tr.is-resolved { color: #555; }
	a { color: inherit; }
}
`.trim()

const REVIEW_SCRIPT = `
(function () {
	var report = document.documentElement.getAttribute('data-report') || 'report'
	var key = 'tehs-image-review:' + report
	var statusFilter = 'all'
	var chipFilter = ''
	var query = ''

	function loadState() {
		try {
			var raw = localStorage.getItem(key)
			var parsed = raw ? JSON.parse(raw) : {}
			return parsed && typeof parsed === 'object' ? parsed : {}
		} catch (err) {
			return {}
		}
	}

	function saveState(state) {
		try {
			localStorage.setItem(key, JSON.stringify(state))
		} catch (err) {}
	}

	var state = loadState()

	function uniqueIds() {
		var ids = {}
		document.querySelectorAll('tr[data-id]').forEach(function (tr) {
			ids[tr.getAttribute('data-id')] = true
		})
		return Object.keys(ids)
	}

	function isResolved(id) {
		return Boolean(state[id])
	}

	function setResolved(id, resolved, quiet) {
		if (resolved) state[id] = new Date().toISOString()
		else delete state[id]
		saveState(state)
		document.querySelectorAll('tr[data-id]').forEach(function (tr) {
			if (tr.getAttribute('data-id') === id) tr.classList.toggle('is-resolved', resolved)
		})
		document.querySelectorAll('input.resolve-toggle').forEach(function (input) {
			if (input.getAttribute('data-id') === id) input.checked = resolved
		})
		if (!quiet) applyFilters()
	}

	function applyResolvedClass() {
		document.querySelectorAll('tr[data-id]').forEach(function (tr) {
			var id = tr.getAttribute('data-id')
			var resolved = isResolved(id)
			tr.classList.toggle('is-resolved', resolved)
		})
		document.querySelectorAll('input.resolve-toggle').forEach(function (input) {
			input.checked = isResolved(input.getAttribute('data-id'))
		})
	}

	function rowVisible(tr) {
		var id = tr.getAttribute('data-id')
		var resolved = isResolved(id)
		if (statusFilter === 'open' && resolved) return false
		if (statusFilter === 'resolved' && !resolved) return false
		if (chipFilter) {
			var filters = (tr.getAttribute('data-filter') || '').split(/\\s+/).filter(Boolean)
			if (filters.indexOf(chipFilter) === -1) return false
		}
		if (query) {
			var hay = tr.getAttribute('data-search') || ''
			if (hay.indexOf(query) === -1) return false
		}
		return true
	}

	function restripe(tbody) {
		var visible = Array.prototype.filter.call(tbody.querySelectorAll('tr[data-id]'), function (tr) {
			return !tr.classList.contains('is-hidden')
		})
		visible.forEach(function (tr, index) {
			tr.classList.toggle('row-even', index % 2 === 1)
			tr.classList.toggle('row-odd', index % 2 === 0)
		})
	}

	function applyFilters() {
		document.querySelectorAll('tr[data-id]').forEach(function (tr) {
			tr.classList.toggle('is-hidden', !rowVisible(tr))
		})
		document.querySelectorAll('section.section').forEach(function (section) {
			var shown = section.querySelector('tr[data-id]:not(.is-hidden)')
			section.hidden = !shown
		})
		document.querySelectorAll('h3.kind-heading').forEach(function (heading) {
			var next = heading.nextElementSibling
			var any = false
			while (next && !next.classList.contains('kind-heading') && next.tagName !== 'H2') {
				if (next.classList.contains('section') && !next.hidden) any = true
				next = next.nextElementSibling
			}
			heading.hidden = !any
		})
		document.querySelectorAll('tbody').forEach(restripe)
		var ids = uniqueIds()
		var resolvedCount = ids.filter(isResolved).length
		var progress = document.getElementById('progress')
		if (progress) progress.textContent = 'Resolved ' + resolvedCount + ' of ' + ids.length
	}

	document.querySelectorAll('.status-filters button').forEach(function (button) {
		button.addEventListener('click', function () {
			statusFilter = button.getAttribute('data-status') || 'all'
			document.querySelectorAll('.status-filters button').forEach(function (other) {
				other.classList.toggle('is-active', other === button)
				other.setAttribute('aria-pressed', other === button ? 'true' : 'false')
			})
			applyFilters()
		})
	})

	document.querySelectorAll('.chip').forEach(function (button) {
		button.addEventListener('click', function () {
			chipFilter = button.getAttribute('data-chip') || ''
			document.querySelectorAll('.chip').forEach(function (other) {
				other.classList.toggle('is-active', other === button)
				other.setAttribute('aria-pressed', other === button ? 'true' : 'false')
			})
			applyFilters()
		})
	})

	var search = document.getElementById('search')
	if (search) {
		search.addEventListener('input', function () {
			query = (search.value || '').trim().toLowerCase()
			applyFilters()
		})
	}

	document.addEventListener('change', function (event) {
		var target = event.target
		if (!target || !target.classList || !target.classList.contains('resolve-toggle')) return
		setResolved(target.getAttribute('data-id'), target.checked)
	})

	document.querySelectorAll('.mark-visible').forEach(function (button) {
		button.addEventListener('click', function () {
			var resolved = button.getAttribute('data-resolved') !== 'false'
			var section = button.closest('section.section')
			var scope = section || document
			scope.querySelectorAll('tr[data-id]:not(.is-hidden)').forEach(function (tr) {
				setResolved(tr.getAttribute('data-id'), resolved, true)
			})
			applyFilters()
		})
	})

	function parseImport(data) {
		if (data && typeof data.resolved === 'object' && data.resolved) {
			return {
				resolved: data.resolved,
				unresolved: Array.isArray(data.unresolved) ? data.unresolved : [],
			}
		}
		if (data && typeof data === 'object') {
			return {resolved: data, unresolved: []}
		}
		return {resolved: {}, unresolved: []}
	}

	var exportBtn = document.querySelector('[data-export]')
	if (exportBtn) {
		exportBtn.addEventListener('click', function () {
			var unresolved = uniqueIds().filter(function (id) { return !isResolved(id) })
			var payload = {
				report: report,
				exportedAt: new Date().toISOString(),
				resolved: state,
				unresolved: unresolved,
			}
			var blob = new Blob([JSON.stringify(payload, null, '\\t')], {type: 'application/json'})
			var url = URL.createObjectURL(blob)
			var a = document.createElement('a')
			a.href = url
			a.download = 'tehs-' + report + '-resolved.json'
			a.click()
			URL.revokeObjectURL(url)
		})
	}

	var importInput = document.querySelector('[data-import]')
	if (importInput) {
		importInput.addEventListener('change', function () {
			var file = importInput.files && importInput.files[0]
			if (!file) return
			var reader = new FileReader()
			reader.onload = function () {
				try {
					var parsed = parseImport(JSON.parse(String(reader.result || '{}')))
					Object.keys(parsed.resolved).forEach(function (id) {
						var value = parsed.resolved[id]
						if (value) state[id] = String(value)
					})
					parsed.unresolved.forEach(function (id) {
						delete state[id]
					})
					saveState(state)
					applyResolvedClass()
					applyFilters()
				} catch (err) {
					window.alert('Could not read that JSON file.')
				}
				importInput.value = ''
			}
			reader.readAsText(file)
		})
	}

	applyResolvedClass()
	applyFilters()
})()
`.trim()

export function renderReviewHtml(page: ReviewPage): string {
	const total = uniqueRowIds(page).length
	const howTo = page.howToFix.map((item) => `\t\t<li>${escapeHtml(item)}</li>`).join('\n')
	const notes =
		page.notes && page.notes.length > 0
			? `<ul class="notes">\n${page.notes.map((note) => `\t<li>${escapeHtml(note)}</li>`).join('\n')}\n</ul>`
			: ''
	const viewNav =
		page.views.length > 1
			? `<nav class="view-nav">${page.views
					.map((view) => `<a href="#${attr(view.id)}">${escapeHtml(view.title)}</a>`)
					.join(' · ')}</nav>`
			: ''
	const views = page.views.map(renderView).join('\n')

	return `<!DOCTYPE html>
<html lang="en" data-report="${attr(page.reportId)}">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${escapeHtml(page.title)}</title>
	<style>
${REVIEW_CSS}
	</style>
</head>
<body>
	<header class="toolbar">
		<div class="toolbar-top">
			<h1>${escapeHtml(page.title)}</h1>
			<p class="progress" id="progress">Resolved 0 of ${total}</p>
		</div>
		<p class="summary">${escapeHtml(page.summary)}</p>
		<details class="how-to">
			<summary>How to fix</summary>
			<ol>
${howTo}
			</ol>
			${notes}
		</details>
		<div class="controls">
			<div class="status-filters" role="group" aria-label="Resolution status">
				<span class="legend">Status</span>
				<button type="button" class="is-active" data-status="all" aria-pressed="true">All</button>
				<button type="button" data-status="open" aria-pressed="false">Open</button>
				<button type="button" data-status="resolved" aria-pressed="false">Resolved</button>
			</div>
			${renderChips(page.chips, page.chipLegend, total)}
			<label>
				<span class="legend">Search</span>
				<input id="search" type="search" placeholder="Archive ID or title" />
			</label>
			<button type="button" class="mark-visible" data-resolved="false">Mark visible unresolved</button>
			<button type="button" data-export>Export JSON</button>
			<label class="import">Import JSON<input type="file" accept="application/json" data-import /></label>
		</div>
		${viewNav}
	</header>
	<main>
${views}
	</main>
	<script>
${REVIEW_SCRIPT}
	</script>
</body>
</html>
`
}
