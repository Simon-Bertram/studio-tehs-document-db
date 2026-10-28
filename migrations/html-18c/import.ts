/**
 * Import transformed NDJSON (dry-run by default).
 *
 * Usage:
 *   bun run migrations/html-18c/import.ts
 *   bun run migrations/html-18c/import.ts --live
 *   bun run migrations/html-18c/import.ts --live --limit 5
 */
import {parseImportArgs, runImport} from './lib/run-import'

const options = parseImportArgs(process.argv.slice(2))
await runImport(options)
