# 18c Tredyffrin HTML → Sanity

Migrates static HTML from [the2nomads.site/18cTredyffrin](https://www.the2nomads.site/18cTredyffrin/) (plus one tehistory.org article) into:

- `researchArticle` — page body as Portable Text (tables + `historicalImageEmbed`)
- `historicalImage` — photographs uploaded from page `<img>` URLs
- `property` / `person` — only after you approve rows in `review/*.csv`

## Pipeline

```bash
# 1. Snapshot HTML (seeds + followed same-site article links)
bun run html-18c:extract

# 2. Human review lists (properties, Slaves-page people, Meeting for Suffering)
bun run html-18c:review

# 3. Edit review/*.csv — set approved=yes where you want create/link

# 4. Build NDJSON (articles always; people/properties only if approved)
bun run html-18c:transform

# 5. Check counts / embed refs
bun run html-18c:validate

# 6. Dry-run import (default), then live after you accept archive-ids.csv
bun run html-18c:import
bun run html-18c:import -- --live
```

## Human gates

| File | Purpose |
| --- | --- |
| [`review/properties.csv`](review/properties.csv) | Buildings.html names → `property` |
| [`review/people-slaves-in-tredyffrin.csv`](review/people-slaves-in-tredyffrin.csv) | Named people from Slaves page |
| [`review/people-meeting-for-suffering.csv`](review/people-meeting-for-suffering.csv) | Meeting for Suffering names vs Content Lake |
| [`reports/archive-ids.csv`](reports/archive-ids.csv) | Assigned `WEB18C-*` / `WEB18CIMG-*` Archive IDs |
| [`reports/link-inventory.csv`](reports/link-inventory.csv) | Followed / skipped / external links |

Excluded: `Taxes2016-10-1.xls`, `1798map.html`, non-HTML downloads.

## IDs

- Articles: `_id` = `researchArticle-18c-{slug}`, `archiveId` = `WEB18C-NNN`
- Images: `_id` = `historicalImage-18c-{stem}-{hash}`, `archiveId` = `WEB18CIMG-NNNN`
- Deterministic IDs + `createOrReplace` make re-runs safe

## Layout

```
migrations/html-18c/
  extract.ts | review.ts | transform.ts | import.ts | validate.ts
  lib/                 # implementation
  extracted/           # HTML snapshots (gitignored)
  transformed/         # NDJSON (gitignored)
  review/              # CSVs for human approval (committed after review)
  reports/             # inventories + validate summary
```
