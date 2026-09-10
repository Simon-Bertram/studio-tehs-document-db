/**
 * Apply TYPE_BY_CLIP_ID and comma-split keyword cells on documents-full.csv.
 */
import {DOCUMENTS_FULL_CSV, patchDocumentsFullCsv} from './lib/patch-documents-full-types'

const result = await patchDocumentsFullCsv(DOCUMENTS_FULL_CSV)
console.log(`Updated types on ${result.typesUpdated} rows`)
console.log(`Expanded comma-stuffed keywords on ${result.keywordRowsExpanded} rows`)
