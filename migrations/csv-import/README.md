# CSV Archive Import

Imports historical documents from a MySQL-exported CSV into Sanity as
`primarySource`, `historicalImage`, and `curatedEssay` documents.

## Prerequisites

1. Categories, townships, and organisations exist in Sanity with
   `migrationKey` values matching the CSV keyword columns (e.g. put
   `Lincoln` on the Lincoln Institution organisation document).
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

Optional env overrides: `SANITY_PROJECT_ID`, `SANITY_DATASET`.

## What the script does

1. Parses the CSV (handles multiline fields, `nan`/`NULL` cleanup).
2. Maps each row's `type` column to a Sanity schema type.
3. Looks up `key1`–`key7` and `keywords` against migrationKey
   dictionaries (priority: township → organisation/`business` →
   category). Entity keywords like `Lincoln` belong on a Historical
   Organisation, not a Subject Category.
4. Builds a Sanity document **without** a fixed `_id` (natural key is
   `archiveId` from `clipID`).
5. In dry-run mode, writes `migrations/csv-import/reports/preview.ndjson`.
6. In live mode, upserts by `archiveId`: patches an existing published
   document or creates one with a Sanity-generated `_id` (p-limit 5).
7. Prints an audit report with counts, missing taxonomies, and errors.

## Columns not imported

- **`public`** — legacy MySQL visibility flag. Intentionally ignored;
  there is no matching schema field. Visibility is not modeled in Studio yet.

## Post-migration Vision checks

```groq
// Count by archiveId presence
count(*[_type in ["historicalImage","primarySource","curatedEssay"] && defined(archiveId)])

// Documents missing subject tags
*[_type == "primarySource" && !defined(subjects)]
```
