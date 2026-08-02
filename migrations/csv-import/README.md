# CSV Archive Import

Import scripts for legacy MySQL exports into Sanity. Dry-run is the default;
pass `--live` to write. Bun loads `.env` (`SANITY_AUTH_TOKEN`).

Optional env: `SANITY_PROJECT_ID`, `SANITY_DATASET`.

## Scripts

| Command | Source CSV | Target types | Reports |
| --- | --- | --- | --- |
| `bun run csv-import` | `migrations/data/documents.csv` | primarySource, historicalImage, curatedEssay | `reports/` |
| `bun run csv-import:donations` | `migrations/data/donations.csv` | donation (+ seeds donationCategory) | `reports/donations/` |
| `bun run csv-import:images` | `migrations/data/sample-images.csv` | historicalImage | `reports/images/` |

```bash
# Recommended order for photo catalog bootstrap
bun run csv-import:donations -- --limit 10          # dry-run
bun run csv-import:donations -- --live              # seed categories + donations
bun run csv-import:images -- --limit 3              # dry-run
bun run csv-import:images -- --live                 # images + JPEG upload
```

## Run order

1. **Donations** — seeds seven canonical Donation Categories, upserts by `donationId`.
2. **Images** — upserts by `archiveId` (`identifier`), links `donation` via `donationID`, uploads JPEG from embedded `psImages`.
3. **Documents** (existing) — independent of donations/images.

## Archive ID stems (Image Identifiers)

Legacy image IDs are `{STEM}{n}`: a 2–3 letter stem plus a number (e.g. `BE232`, `BKH1`, `MAX10`). Stems name a place or collection (e.g. `BE` = Berwyn). This is documentation only — there is no stem document type in Sanity. The import stores the full identifier on `historicalImage.archiveId`.

## Donations: `dtype` → Donation Category

Canonical categories (title = `migrationKey`): Photographic prints, Digital photographs, Newspaper clipping, Postcards, Slides, Drawings, Posters.

| Raw `dtype` (case-insensitive) | Maps to |
| --- | --- |
| Photographic prints / print; Photographic images; original photos; Photographs in frames; images | Photographic prints |
| Digital photographs / images / image (any casing) | Digital photographs |
| Postcards | Postcards |
| Slides | Slides |
| Drawings | Drawings |
| newspapers | Newspaper clipping |
| Newspaper articles and poster | Newspaper clipping + Posters |
| Photographic prints/images and postcards | Photographic prints + Postcards |
| Photographic prints and digital images | Photographic prints + Digital photographs |
| Multiple | none — `needs-manual-links` |
| nan / NULL / empty | none — reported |
| Report by the STV company… | none — not a material type |

## Images: field map (sample)

| CSV | Sanity |
| --- | --- |
| identifier | archiveId |
| serialNumber, title, dateTaken, photographer, contributor, source, rights | same-named fields |
| description + comment | description |
| Synonyms | notes (when present) |
| township | township ref (`migrationKey`) |
| subject | subjects[] (`migrationKey`; case-insensitive) |
| donationID | donation ref |
| psImages | imageFile (JPEG extract + upload on `--live`) |

Ignored: resolution, file paths, digitization metadata, publicDisplay, type (all rows → historicalImage).

CSV encoding is **latin-1** so embedded JPEG bytes in `psImages` survive.

## Editor reports

Each importer writes under its reports folder:

| File | Use |
| --- | --- |
| `imported.csv` | Ledger: schema + natural key (`clipId`) + action + sanityId |
| `skipped.csv` | Rows that never became docs |
| `needs-manual-links.csv` | Imported but missing taxonomy / donation links |
| `missing-taxonomies.csv` | Keywords still needing a `migrationKey` |
| `asset-errors.csv` | (images only) JPEG upload failures |
| `summary.txt` | Counts |

## Documents import (existing)

See pipeline under `lib/` (`run-import`, `map-row`, `taxonomy`). Natural key is `archiveId` from `clipID`. Keyword priority: township → organisation → category.

### Vision checks

```groq
count(*[_type == "donation" && defined(donationId)])
count(*[_type == "historicalImage" && defined(archiveId)])
*[_type == "historicalImage" && archiveId == "BKH1"][0]
```
