# Image import evaluation

Snapshot of published `historicalImage` documents vs `migrations/data/sample-images.csv`, using batch reports under `reports/images/offset-*-limit-*` and this ledger. Counts from 19 August 2026.

Empty `people[]` and `location` are **not** failures. The importer never sets them (`photoLocation` and Person/People subjects stay on this ledger for later Studio work).

## Snapshot

| | Count |
| --- | --- |
| CSV rows | 7141 |
| Eligible (has identifier, not `publicDisplay=N`) | 7063 |
| Published `historicalImage` | **5845** |
| With `imageFile` | **5845** (100%) |
| Duplicate / missing `archiveId` | **0** (`bun run audit:validation` passed) |

Live batches wrote **5839** create/patch rows. Sanity has 6 extra docs (early samples such as `BKH1`).

| Field | Sanity | vs nonempty CSV on live-imported IDs |
| --- | --- | --- |
| title | 5845 | 5835 (1 fallback: `Untitled image BEP49`, empty CSV title) |
| photographer | 2137 | 2133 |
| description | 4129 | 4120 |
| notes | 5834 | almost all later docs get `Legacy type:` |
| dateTaken | **2556** | **~3691** CSV dates — see Dates below |
| township | 4715 | 4724 |
| subjects | 3831 | 5824 |
| donation | 3079 | 3076 real donation IDs |

Spot-checks `BKH1`, `FFF1`, `STI3`, `SCU10` match CSV captions, photographer, township, description, and HTML-entity titles. Catch-all `donationID=1` is correctly unlinked.

## Why ~1200 eligible rows have no document

### 1. Offset 6000 was never written live (largest gap)

`reports/images/offset-6000-limit-1000/imported.csv` is **999 `dry_run` rows**. Sample IDs from that slice (`TEH70`, `CHE55`, …) are absent in Sanity.

That dry-run also recorded **171 HTTP 404s**. A live run of the same slice will create the reachable JPEGs and skip the missing files (no document without `imageFile`).

```bash
bun run csv-import:images -- --live --offset 6000 --limit 1000
```

### 2. JPEG fetch failed (`asset_error`) — 219 live skips

The importer will not upsert a `historicalImage` without `imageFile`. Live `asset-errors.csv` (excluding the dry-run batch):

| HTTP status | Count | Meaning |
| --- | --- | --- |
| **404** | 190 | File is not at `https://www.the2nomads.site/TEHSImageDatabase/` + CSV `imageLocation`. Typical causes: file never published, renamed, or a bad path (encoding, `%2C` commas, typos such as `MiflinHouse`). Example: `IT3` → `…/Inns/IT3-WhiteHorseTavernsmall.jpg` returns 404 and is not in Sanity. |
| empty / socket | 29 | Connection dropped mid-fetch (`The socket connection was closed unexpectedly`). Transient network; retry often works. |

Fix 404s only if the JPEG exists under another path (correct `imageLocation` in CSV, or upload the file to DreamHost, then re-run that `--live` batch). Socket errors: re-run the same batch; existing docs are not re-uploaded.

### 3. Other skips (live)

| Reason | Count | What to do |
| --- | --- | --- |
| `private_image` | 76 | `publicDisplay=N` — left out on purpose. Set to `Y` in CSV only if they should be public, then re-run. |
| `api_error` | 5 | Sanity mutate timed out. Re-run the batch; upsert is idempotent by `archiveId`. |
| `duplicate_identifier` | 1 | True duplicate (same `imageLocation`). One doc is enough. |
| `missing_clip_id` | 1 | CSV row has no `identifier`. Add an ID or skip. |

## Dates that imported as empty

About **1100** live-imported rows have a CSV `dateTaken` that [`parseHistoricalDate`](../../lib/parse-historical-date.ts) rejects, so Sanity has no structured date. Examples: `1920s`, `1781 - 1782`, `Late October 1972`, `Christmas 1926`, `early 1900s`. The document and other metadata still imported.

Next step is editorial (type the date in Studio) or extend the parser for ranges/decades — not a re-fetch.

## Taxonomy still open

[`images-manual-links.md`](images-manual-links.md) lists **2177** imported docs missing township, subject, and/or donation.

- **Township:** 4715/5845 linked. Almost every nonempty CSV township mapped. Leftover “Schuylkill (14)” is CSV **subject** `Schuylkill` (river), not the township. `SCU10` already has township Upper Providence.
- **Subject:** ~1993 unmapped. Largest groups: Person, Place, View, Cultural, Road, Service (no matching category key, or place-like tags). `Inn` / `Businesses` / `Quarry` aliases exist but those images were imported **before** the aliases — re-run the live batches so upserts attach subjects without re-uploading JPEGs.
- **Donation:** 3079 linked. Unlinked is expected for `donationID=1` (catch-all, ~2558) and `donation:0` (202, invalid).

Person/People → ledger **Review people depicted** (`people[]` by hand). `photoLocation` → **Location text** (`location` by hand).

## What to run next

1. **Import the missing slice**

   ```bash
   bun run csv-import:images -- --live --offset 6000 --limit 1000
   ```

2. **Retry timeouts and socket failures** — same `--live --offset N --limit 1000` for batches that listed `api_error` or empty HTTP status in `asset-errors.csv` (offsets 0, 1000, 3000, 4000, …).

3. **Attach post-alias subjects** — re-run live batches 0–5000 and 7000 after Inn/Businesses/Quarry aliases. Existing `imageFile` is kept.

4. **404s** — inspect `asset-errors.csv` URLs. If the file is gone, leave unimported or add the JPEG on the public host and re-run. If the path is wrong, fix `imageLocation` in the CSV first.

5. **Do not score as import bugs:** `publicDisplay=N`, `donation:1` / `donation:0`, Person/Place/View without a category, empty `people[]` / `location`, unparseable dates.
