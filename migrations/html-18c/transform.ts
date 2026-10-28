/**
 * Transform snapshots + approved review CSVs into NDJSON.
 *
 * Usage: bun run migrations/html-18c/transform.ts
 */
import {runTransform} from './lib/run-transform'

await runTransform()
