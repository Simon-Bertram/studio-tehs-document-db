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
bun run csv-import

# Live write to production
bun run csv-import -- --live

# Live write to a test dataset
SANITY_DATASET=staging bun run csv-import -- --live

# Point to a different CSV file
bun run csv-import -- /path/to/full-export.csv --limit 10
```

Dry-run is the default. Pass `--live` to actually write to Sanity.
Bun loads `.env` automatically (`SANITY_AUTH_TOKEN`).

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
7. Writes editor CSV reports under `migrations/csv-import/reports/` and
   prints an audit summary.

## Columns not imported

- **`public`** — legacy MySQL visibility flag. Intentionally ignored;
  there is no matching schema field. Visibility is not modeled in Studio yet.

## Editor reports

After every run (dry-run or live), open `migrations/csv-import/reports/`:

| File | What it is | How to use it |
| --- | --- | --- |
| `imported.csv` | Every row that mapped to a schema | Ledger of what landed where: `schemaType` + `clipId` (= Archive ID) + live `sanityId` |
| `skipped.csv` | Rows that never became a Sanity doc | `unknown_type` → pick the correct schema and create manually, or fix CSV and re-run; `missing_clip_id` / `api_error` as noted |
| `needs-manual-links.csv` | Imported docs with unmapped keywords | Open the doc by Archive ID (`clipId`) and set Organisations / Subjects / Township from `unmappedKeywords` |
| `missing-taxonomies.csv` | Unique keywords still lacking a `migrationKey` | Create the entity, set Migration Mapping Key to the keyword, re-run import to auto-link |
| `summary.txt` | Counts and file paths | Quick overview |

### How to identify each record category

- **Imported** — Studio document type is `schemaType`. Search by **Archive ID** = `clipId`. Vision: `*[_type == $schemaType && archiveId == $clipId][0]`.
- **Skipped** — no Studio document. Use `clipId` + `reason` in `skipped.csv`.
- **Needs manual links** — document exists (also listed in `imported.csv`) but keywords did not resolve. Use `studioAction` column.
- **Missing taxonomies** — create Organisations (entity names like `Lincoln`), Subjects (themes), or Townships (places) with matching `migrationKey`. `suggestedEntity` is `unknown` by default; editors choose.

Partial taxonomy failure still counts as **imported**; those rows also appear in `needs-manual-links.csv`.

## Post-migration Vision checks

```groq
// Count by archiveId presence
count(*[_type in ["historicalImage","primarySource","curatedEssay"] && defined(archiveId)])

// Find one imported document
*[_type == "primarySource" && archiveId == "941"][0]

// Documents missing subject tags
*[_type == "primarySource" && !defined(subjects)]
```
