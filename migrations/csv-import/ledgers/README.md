# Image import ledgers

Cumulative punch list from **live** image batches (`bun run csv-import:images -- --live --offset N --limit 1000`).

Generated files (safe to commit):

- `images-manual-links.md` — grouped by missing township / subject / donation, plus location text and Person-subject review
- `images-manual-links.csv` — spreadsheet of outstanding taxonomy links
- `images-manual-links.json` — merge source for the next batch
- `images-import-evaluation.md` — volume / metadata evaluation (19 Aug 2026): gaps, 404s, next live batches

Per-batch `asset-errors.csv` / `url-status.csv` stay under `migrations/csv-import/reports/images/offset-*-limit-*` (gitignored).

Do not put Archive IDs (`STI3`, `FFF1`) on a township **Migration key**. That field is the CSV township name (`Tredyffrin`). Subject Categories can add extra CSV spellings on **Migration Key Aliases** (e.g. `Inn` when the primary key is `Inns`).
