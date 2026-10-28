/**
 * Write property and person review CSVs for human approval.
 *
 * Usage: bun run migrations/html-18c/review.ts
 */
import {runReview} from './lib/run-review'

await runReview()
