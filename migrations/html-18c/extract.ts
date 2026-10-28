/**
 * Snapshot seed HTML pages and followed same-site article links.
 *
 * Usage: bun run migrations/html-18c/extract.ts
 */
import {runExtract} from './lib/run-extract'

await runExtract()
