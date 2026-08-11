# CSV Archive Import

Import scripts for legacy MySQL exports (and the TEHS Quarterly HTML archive)
into Sanity. Dry-run is the default; pass `--live` to write. Bun loads `.env`
(`SANITY_AUTH_TOKEN`). Live writes need an **Editor** or **Administrator** API
token (Deploy Studio tokens cannot create documents).

Optional env: `SANITY_PROJECT_ID`, `SANITY_DATASET`.

## Scripts

| Command | Source | Target types | Reports |
| --- | --- | --- | --- |
| `bun run csv-import` | `migrations/data/documents.csv` | primarySource, historicalImage, researchArticle | `reports/` |
| `bun run csv-import:donations` | `migrations/data/donations.csv` | donation (+ seeds donationCategory) | `reports/donations/` |
| `bun run csv-import:images` | `migrations/data/sample-images.csv` | historicalImage | `reports/images/` |
| `bun run csv-import:quarterly` | tehistory.org HTML (TOC + articles) | quarterlyArticle | `reports/quarterly/` |

## Documents / primary sources

Maps CSV `type` → Sanity: `document` → `primarySource`, `photo` → `historicalImage`,
`book` → `researchArticle`. Natural key is `archiveId` from `clipID`. Keyword
priority: township → organisation → category.

```bash
bun run csv-import -- --limit 20    # dry-run (default)
bun run csv-import -- --live        # write to Sanity
```

Reports: `migrations/csv-import/reports/`.

### TEHS keyword → divert to Quarterly

If any keyword slot (`key1`…`key7`, `keywords`) equals `tehs` after lowercasing
(exact token match), the row is **not** imported as an archive type. It is
recorded as `diverted_quarterly` in `skipped.csv` and `diverted-quarterly.csv`.
Import those articles with `csv-import:quarterly` (or create a TEHS Quarterly
Article in Studio). The same divert applies to `csv-import:images` when
`subject` is `TEHS` (any case).

## TEHS Quarterly (HTML)

Source of truth is the [digital archive](https://www.tehistory.org/hqda/qtoc2.html):
volume TOC pages (e.g. [qv22toc.html](https://www.tehistory.org/hqda/toc/qv22toc.html))
and per-article HTML. Default pilot volume is **22**.

```bash
bun run csv-import:quarterly -- --limit 5              # dry-run Vol 22
bun run csv-import:quarterly -- --volume 22 --live     # write Vol 22
bun run csv-import:quarterly -- --volume 22 --limit 3  # dry-run first 3 articles
```

- Snapshots under `migrations/data/quarterly/v{N}/` (HTML + `index.json`; gitignored).
- Upserts by unique `sourceKey` (URL stem, e.g. `v22n1p003`).
- Body → Portable Text with `pageBreak` for original “Page N” markers; images
  upload on `--live` only.
- Reports: `migrations/csv-import/reports/quarterly/`.

Volume 45+ lean on PDF conversion on the public site — this importer targets
HTML volumes first.

## Photo catalog bootstrap

```bash
bun run csv-import:donations -- --limit 10          # dry-run
bun run csv-import:donations -- --live              # seed categories + donations
bun run csv-import:images -- --limit 3              # dry-run
bun run csv-import:images -- --live                 # images + JPEG upload
```

## Run order

1. **Donations** — seeds seven canonical Donation Categories, upserts by `donationId`.
2. **Images** — upserts by `archiveId` (`identifier`), links `donation` via `donationID`, uploads JPEG from embedded `psImages`.
3. **Documents** — independent of donations/images; TEHS-keyword rows diverted.
4. **Quarterly** — independent HTML scrape; can run anytime (Editor token required for `--live`).

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
| `diverted-quarterly.csv` | Keyword TEHS rows skipped by archive importers |
| `needs-manual-links.csv` | Imported but missing taxonomy / donation links |
| `missing-taxonomies.csv` | Keywords still needing a `migrationKey` |
| `asset-errors.csv` | (images only) JPEG upload failures |
| `summary.txt` | Counts |

### Vision checks

```groq
count(*[_type == "donation" && defined(donationId)])
count(*[_type == "historicalImage" && defined(archiveId)])
count(*[_type == "quarterlyArticle" && volume == 22])
*[_type == "historicalImage" && archiveId == "BKH1"][0]
*[_type == "quarterlyArticle" && sourceKey == "v22n1p003"][0]
```
