import fs from 'node:fs'
import path from 'node:path'

import type {AssetErrorRow} from './image-asset-url'
import type {PreflightIssue} from './image-preflight'
import {toCsv} from './write-reports'

export function writeImageExtraReports(
	reportsDir: string,
	options: {
		assetErrors: AssetErrorRow[]
		urlStatus: AssetErrorRow[]
		preflight: PreflightIssue[]
	},
): void {
	fs.mkdirSync(reportsDir, {recursive: true})

	const assetPath = path.join(reportsDir, 'asset-errors.csv')
	fs.writeFileSync(
		assetPath,
		toCsv(
			['archiveId', 'url', 'httpStatus', 'detail'],
			options.assetErrors.map((row) => [row.archiveId, row.url, row.httpStatus, row.detail]),
		),
	)

	const urlPath = path.join(reportsDir, 'url-status.csv')
	fs.writeFileSync(
		urlPath,
		toCsv(
			['archiveId', 'url', 'httpStatus', 'detail'],
			options.urlStatus.map((row) => [row.archiveId, row.url, row.httpStatus, row.detail]),
		),
	)

	const preflightPath = path.join(reportsDir, 'preflight.csv')
	fs.writeFileSync(
		preflightPath,
		toCsv(
			['archiveId', 'issue', 'detail'],
			options.preflight.map((row) => [row.archiveId, row.issue, row.detail]),
		),
	)
}
