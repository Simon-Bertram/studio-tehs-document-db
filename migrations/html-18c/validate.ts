/**
 * Validate transformed NDJSON against the extract manifest.
 *
 * Usage: bun run migrations/html-18c/validate.ts
 */
import {runValidate} from './lib/run-validate'

runValidate()
