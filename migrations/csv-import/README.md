# CSV Archive Import

Imports historical documents from a MySQL-exported CSV into Sanity as
`primarySource`, `historicalImage`, and `curatedEssay` documents.

## Prerequisites

1. Categories and townships exist in Sanity with `migrationKey` values
   matching the CSV keyword columns.
2. A `SANITY_AUTH_TOKEN` environment variable with write access (only
   required for live writes).

## Usage

```bash
# Dry-run the first 3 rows (no Sanity token needed)
bun run csv-import -- --limit 3

# Dry-run all rows (token needed if you want taxonomy lookups)
SANITY_AUTH_TOKEN=sk-… bun run csv-import

# Live write to production
SANITY_AUTH_TOKEN=sk-… bun run csv-import -- --live

# Live write to a test dataset
SANITY_AUTH_TOKEN=sk-… SANITY_DATASET=staging bun run csv-import -- --live

# Point to a different CSV file
bun run csv-import -- /path/to/full-export.csv --limit 10
```

Dry-run is the default. Pass `--live` to actually write to Sanity.

## What the script does

1. Parses the CSV (handles multiline fields, `nan`/`NULL` cleanup).
2. Maps each row's `type` column to a Sanity schema type.
3. Looks up `key1`–`key7` and `keywords` against category and township
   `migrationKey` dictionaries fetched from Sanity.
4. Builds a Sanity document with a deterministic `_id` (`imported-doc-{clipID}`).
5. In dry-run mode, writes `migrations/csv-import/reports/preview.ndjson`.
6. In live mode, writes via `createOrReplace` with p-limit(5) concurrency.
7. Prints an audit report with counts, missing taxonomies, and errors.

## Switching to createIfNotExists

Once archivists begin editing documents in Studio, change the mutation
in `import-documents.ts` from `createOrReplace` to `createIfNotExists`
so re-runs only create missing records without overwriting manual edits.

## Post-migration Vision checks

```groq
// Total imported count
count(*[_type in ["historicalImage","primarySource","curatedEssay"] && _id match "imported-doc-*"])

// Documents missing subject tags
*[_type == "primarySource" && !defined(subjects)]
```
