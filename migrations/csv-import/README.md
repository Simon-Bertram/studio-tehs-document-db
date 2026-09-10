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
| `bun run csv-import:documents-review-reports` | `reports/skipped.csv` + `needs-manual-links.csv` | — | `reports/{skipped,missing-taxonomies,needs-manual-links}.html` |
| `bun run csv-import:donations` | `migrations/data/donations.csv` | donation (+ seeds donationCategory) | `reports/donations/` |
| `bun run csv-import:images` | `migrations/data/sample-images.csv` | historicalImage | `reports/images/offset-*-limit-*` + `ledgers/` |
| `bun run csv-import:images-review-reports` | live batch CSVs + `ledgers/images-manual-links.csv` | — | `reports/images/{skipped,missing-taxonomies,needs-manual-links}.html` |
| `bun run csv-export:images` | DreamHost MySQL via tunnel (bun/`mysql2`, no `mysql` CLI) | writes `sample-images.csv` (no BLOBs) | — |
| `bun run mysql-tunnel` | SSH `-L 3307:mysql.the2nomads.site:3306` | — | — |
| `bun run csv-import:quarterly` | tehistory.org catalog + HTML | quarterlyIssue + quarterlyArticle | `reports/quarterly/` |

## Documents / primary sources

Maps CSV `type` → Sanity (case-insensitive). `document` / newspaper ads, articles,
clippings, letters, wills, genealogical records, and similar → `primarySource`.
`book` / publication / thesis / report → `researchArticle`. `photo` →
`historicalImage`. `NULL`, `miscellaneous`, and `article` stay unmapped — set
those CSV types by row (see `lib/patch-documents-full-types.ts` for the full-file
overrides). Natural key is `archiveId` from `clipID`. Keyword
priority: township → organization → category. Comma-separated keyword cells
(`DEV, DEVRam, DevInn`) are split into individual tokens.

Organization documents also support **Migration Key Aliases** (same as Subject
Categories). Lincoln Institution uses primary key `Lincoln` and alias `LI`.
Do not alias Phase1/Phase2 onto Lincoln — those are research-batch tags.

Seed missing document taxonomies (Educational Home, Devon Inn, Death, …):

```bash
bun run migrations/csv-import/seed-document-taxonomies.ts          # dry-run
bun run migrations/csv-import/seed-document-taxonomies.ts -- --live
```

```bash
bun run csv-import -- --limit 20    # dry-run (default)
bun run csv-import -- --live        # write to Sanity
bun run csv-import -- migrations/data/documents-full.csv   # dry-run the full export
```

Reports: `migrations/csv-import/reports/`. The importer also writes three HTML review files (`skipped.html`, `missing-taxonomies.html`, `needs-manual-links.html`) after each run. Regenerating without re-importing: `bun run csv-import:documents-review-reports`. Resolved checkboxes use a separate browser key (`tehs-document-review`) from the image reports.

### TEHS keyword → divert to Quarterly

If any keyword slot (`key1`…`key7`, `keywords`) equals `tehs` after lowercasing
(exact token match), the row is **not** imported as an archive type. It is
recorded as `diverted_quarterly` in `skipped.csv` and `diverted-quarterly.csv`.
Import those articles with `csv-import:quarterly` (or create a TEHS Quarterly
Article in Studio). The same divert applies to `csv-import:images` when
`subject` is `TEHS` (any case).

## TEHS Quarterly

Two phases: **catalog** (issues, then article stubs), then optional **HTML body** import
for volumes that have per-article HTML. Dry-run is the default; `--live` writes.
Do not run `--live` until the dry-run reports look right.

### Phase 1–2: issues then stubs

Sources (snapshotted under `migrations/data/quarterly/`, gitignored):

- [qtoc1.html](https://www.tehistory.org/qtoc1.html) — Vol. 41–58 covers, seasonal
  headings, titles/authors (no page numbers, no article HTML)
- hqda volume TOCs (`/toc/qv01toc.html` … `qv58toc.html`) — issue headings, start
  pages, article URLs, covers
- [`HQ_Index_V1-52.pdf`](../data/HQ_Index_V1-52.pdf) — author/title index for Vol. 1–52

```bash
bun run csv-import:quarterly -- --extract                 # snapshot sources only
bun run csv-import:quarterly -- --issues                 # dry-run issue upsert
bun run csv-import:quarterly -- --issues --limit 5
bun run csv-import:quarterly -- --article-stubs            # dry-run stubs (upserts issues first)
bun run csv-import:quarterly -- --issues --live           # write issues
bun run csv-import:quarterly -- --article-stubs --live     # write stubs
```

- Upserts `quarterlyIssue` by `sourceKey` (`v22n1`, or `v44n1+2` for a double issue).
  Season and **Combined / double issue** come from headings. Cover images upload on
  `--live` only. Re-runs do not overwrite editor-set `pdfAsset`, cover, date, season,
  or `tocNotes`.
- Article stubs: title, `authorText`, pages, `issueRef`. `sourceKey` is the HTML stem
  (`v22n1p003`) when a URL exists, otherwise `v58n1/${slug(title)}`. No `body` in this
  pass. PDF rows that do not match a stub or issue go to `unmatched-index.csv`.
- Reports: `migrations/csv-import/reports/quarterly/` (`issues-preview.ndjson`,
  `stubs-preview.ndjson`, `unmatched-index.csv`).

### HTML article bodies (later pass)

Source of truth for Portable Text is the [digital archive](https://www.tehistory.org/hqda/qtoc2.html):
volume TOC pages (e.g. [qv22toc.html](https://www.tehistory.org/hqda/toc/qv22toc.html))
and per-article HTML. Default pilot volume is **22**.

```bash
bun run csv-import:quarterly -- --limit 5              # dry-run Vol 22 bodies
bun run csv-import:quarterly -- --volume 22 --live     # write Vol 22 bodies
bun run csv-import:quarterly -- --volume 22 --limit 3  # dry-run first 3 articles
```

- Snapshots under `migrations/data/quarterly/v{N}/` (HTML + `index.json`; gitignored).
- Upserts `quarterlyIssue` by `sourceKey`, then `quarterlyArticle` by unique article
  `sourceKey` (URL stem, e.g. `v22n1p003`) with `issueRef`.
- Body → Portable Text with `pageBreak` for original “Page N” markers; images
  upload on `--live` only.
- Reports: `migrations/csv-import/reports/quarterly/`.

Existing articles imported before the issue split can be linked with:

```bash
bun run migrations/split-quarterly-issue-article/run.ts          # dry-run
bun run migrations/split-quarterly-issue-article/run.ts -- --live
```

Volume 45+ lean on PDF conversion on the public site — the HTML body importer
targets HTML volumes; catalog stubs still cover later issues from qtoc1.

## DreamHost MySQL MCP (read-only)

Cursor talks to the image database through `@benborla29/mcp-server-mysql` in [`.cursor/mcp.json`](../../.cursor/mcp.json) (gitignored). Use **`bunx`** (not `npx`) so the project `preinstall` `only-allow bun` hook cannot trip when Cursor starts the server. **Do not put `mysql.the2nomads.site` in `MYSQL_HOST`.** That hostname is the SSH `-L` destination only.

| mcp.json | Value |
| --- | --- |
| `MYSQL_HOST` | `127.0.0.1` (local side of the tunnel) |
| `MYSQL_PORT` | `3307` |
| `MYSQL_USER` | `images_ro` (DreamHost panel user; SELECT only). If you created `tehs_images_ro` instead, change this to match. |
| `MYSQL_DB` | `tehsimages2` |
| `SSH_ENABLED` | `false` |
| writes | `ALLOW_INSERT/UPDATE/DELETE_OPERATION` all `false` |

Start the tunnel **before** Cursor loads the MySQL MCP:

```bash
# DreamHost SSH / shell user — NOT images_ro (that is MySQL only)
SSH_USER=your_dreamhost_shell_user bun run mysql-tunnel
# If Pattern A (the2nomads.site) refuses login:
TUNNEL_PATTERN=B SSH_USER=your_dreamhost_shell_user bun run mysql-tunnel
bun run mysql-tunnel:stop
```

`images_ro` / `MYSQL_PASS` are for MySQL through the tunnel after SSH succeeds. They will not log you into `the2nomads.site`.

Pattern A: `ssh -N -L 3307:mysql.the2nomads.site:3306 USER@the2nomads.site`  
Pattern B: `ssh -N -L 3307:127.0.0.1:3306 USER@mysql.the2nomads.site`

CLI smoke-test (same host/port as MCP): `MYSQL_PASS='…' bun run csv-export:images` (optional `IMAGE_EXPORT_LIMIT=5`). The `mysql` binary is not required.

In Cursor, after reloading MCP:

1. `SHOW TABLES;`
2. `DESCRIBE` the images table (confirm `identifier` + `imageLocation` / `fileLocation`).
3. `SELECT identifier, imageLocation, title FROM … LIMIT 5;` — **never** select `psImages` (BLOB, out of scope).
4. Confirm a write (`INSERT`/`UPDATE`) is denied.

Sanity is already available via the Cursor Sanity plugin (`query_documents`, `get_schema`, `whoami`). Do not add a second Sanity server to `mcp.json`.

## Export CSV from MySQL

MCP does not feed the importer. After the SELECT is settled, export metadata + paths only (bun client to `127.0.0.1:3307`; no `mysql` CLI):

```bash
MYSQL_USER=images_ro MYSQL_PASS='…' MYSQL_DB=tehsimages2 bun run csv-export:images
IMAGE_EXPORT_LIMIT=20 MYSQL_PASS='…' bun run csv-export:images
```

Writes [`migrations/data/sample-images.csv`](../data/sample-images.csv). Blob columns (`psImages`) are excluded. Includes `primaryPhoto`, `publicDisplay`, `archiveLocation`, `photoLocation`, and `refs` for duplicate handling and notes. The committed file is a 3-row URL-path sample until you run a full export.

Fallback if you have the `mysql` binary: `bun run csv-export:images:mysql-cli`.

## Photo catalog bootstrap

Dry-run is the default. There is **no** `--dryRun` flag; pass `--live` to write.

```bash
bun run csv-import:donations -- --limit 10          # dry-run
bun run csv-import:donations -- --live              # seed categories + donations
bun run csv-import:images -- --limit 3              # dry-run (logs constructed URLs)
bun run csv-import:images -- --live --limit 3       # write 3 docs + HTTP asset fetch
# Phased live import (~7141 rows). Set township/subject migrationKey first.
bun run csv-import:images -- --live --offset 0 --limit 1000
bun run csv-import:images -- --live --offset 1000 --limit 1000
# … then offset 2000, 3000, … until a batch returns fewer than 1000 rows
```

### Images dry-run then live

1. Confirm a public JPEG with `curl -I` (not a markdown fetch tool):

   ```bash
   curl -sI -A 'Mozilla/5.0' \
     'https://www.the2nomads.site/TEHSImageDatabase/ValleyForge/BakeHouse/BKH1-BakeHousesmall.jpg'
   ```

   Expect `200` and `content-type: image/jpeg`. DreamHost varies by `User-Agent`; the importer sends a browser UA.

2. Dry-run: `bun run csv-import:images -- --limit 3` — console should print constructed URLs; `reports/images/offset-0-limit-3/url-status.csv` has HEAD/GET status; `preview.ndjson` is metadata only (no asset upload).
3. Live sample: `bun run csv-import:images -- --live --limit 3` (Editor token in `.env`). Failed fetches skip the row (no invalid `historicalImage` without `imageFile`) and exit non-zero.
4. Phased full run (recommended): `--live --offset N --limit 1000`. Duplicate identifiers are resolved on the **whole** CSV before the slice, then disambiguated (`HLC08-2590`) or skipped when the path is identical (`SCU11`).
5. Vision / Sanity MCP: `*[_type == "historicalImage" && archiveId == "BKH1"][0]`

`--limit` without `--offset` still means “first N rows.” Each batch writes gitignored reports to `reports/images/offset-{offset}-limit-{limit}/`. Live batches merge a lasting punch list into [`ledgers/images-manual-links.md`](ledgers/images-manual-links.md) (not gitignored): outstanding township / subject / donation links, plus `photoLocation` text and Person-subject rows to review in Studio. IDs that linked on a later batch are dropped from the ledger. Set **Migration key** on Township / Subject docs to the CSV name (`Tredyffrin`, `House`) before or between batches — never put Archive IDs on that field. Subject Categories can also list extra CSV spellings on **Migration Key Aliases** (`Inn` when the key is `Inns`).

## Run order

1. **Donations** — seeds seven canonical Donation Categories, upserts by `donationId`.
2. **Images** — upserts by `archiveId` (`identifier`), links `donation` via `donationID` (skips catch-all `1`), fetches JPEG from `https://www.the2nomads.site/TEHSImageDatabase/` + `imageLocation` only.
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
| type | notes (`Legacy type: …`); all rows still become `historicalImage` |
| fileLocation / archiveLocation | notes only (`Archive folder` / `Archive location`) — never a URL |
| township | township ref (`migrationKey`) |
| subject | subjects[] (`migrationKey` or `migrationKeyAliases`; case-insensitive) |
| donationID | donation ref (skipped when `1` = “not in any”) |
| refs | references (Portable Text; HTML `<a>` → URL marks; relative hrefs resolved against `https://www.tehistory.org/hqda/html/`) |
| imageLocation | imageFile (HTTP fetch + upload on `--live`) |
| publicDisplay | `N` rows are skipped; empty / `Y` / `1` import as public |
| primaryPhoto | used to disambiguate duplicate `identifier` values |

Ignored: resolution, digitization metadata, `psImages` (BLOB, not migrated). `photoLocation` is listed on the cumulative ledger for a later `location` pass; `people[]` is not auto-linked (Person subject → review section). `citations` (Research References / Quarterly article documents) is not auto-filled; editors link those in Studio. Titles and notes decode HTML entities (`&rsquo;` → `’`).

CSV is UTF-8. Relative paths such as `ValleyForge/BakeHouse/BKH1-BakeHousesmall.jpg` are joined to `https://www.the2nomads.site/TEHSImageDatabase/`. Original filename is passed to `assets.upload`. Existing `imageFile` is not re-uploaded.

## Editor reports

Each importer writes under its reports folder. Image batches use `reports/images/offset-{offset}-limit-{limit}/` (gitignored). Live image batches also update [`ledgers/`](ledgers/) (safe to commit).

| File | Use |
| --- | --- |
| `imported.csv` | Ledger: schema + natural key (`clipId`) + action + sanityId |
| `skipped.csv` | Rows that never became docs |
| `diverted-quarterly.csv` | Keyword TEHS rows skipped by archive importers |
| `needs-manual-links.md` | This batch: images grouped by missing township / subject / donation |
| `needs-manual-links.csv` | Same data as a spreadsheet |
| `ledgers/images-manual-links.md` | Cumulative punch list across live batches (taxonomy + location text + people review) |
| `ledgers/images-manual-links.csv` | Cumulative spreadsheet of outstanding taxonomy links |
| `reports/images/skipped.html` | Human review: skipped images, grouped by reason, with Resolved checkboxes |
| `reports/images/missing-taxonomies.html` | Human review: CSV keywords still needing a Migration key |
| `reports/images/needs-manual-links.html` | Human review: imported images missing township / subject / donation |
| `reports/skipped.html` | Human review: skipped documents, grouped by reason (unknown CSV types split by `type`) |
| `reports/missing-taxonomies.html` | Human review: document CSV keywords still needing a Migration key |
| `reports/needs-manual-links.html` | Human review: imported documents missing township / subject / donation |
| `missing-taxonomies.csv` | Keywords still needing a `migrationKey` |
| `asset-errors.csv` | (images) HTTP fetch / JPEG upload failures: `archiveId,url,httpStatus,detail` |
| `url-status.csv` | (images dry-run) HEAD/GET probe: `archiveId,url,httpStatus,detail` |
| `preflight.csv` | (images) missing `imageLocation`, `publicDisplay=N`, duplicate identifiers, township typos, place-like subjects |
| `summary.txt` | Counts |

Open the three HTML files in a browser after `bun run csv-import:images-review-reports`. Each row has a Resolved checkbox (stored in that browser; Export JSON to share). Regenerating the HTML does not wipe checkmarks.

Document HTML reports (`reports/skipped.html` and siblings) work the same way after `bun run csv-import` (or `bun run csv-import:documents-review-reports`). Their checkmarks are stored under `tehs-document-review`, not the image key.

### Vision checks

```groq
count(*[_type == "donation" && defined(donationId)])
count(*[_type == "historicalImage" && defined(archiveId)])
count(*[_type == "quarterlyIssue" && volume == 22])
count(*[_type == "quarterlyArticle" && issueRef->volume == 22])
*[_type == "historicalImage" && archiveId == "BKH1"][0]
*[_type == "quarterlyArticle" && sourceKey == "v22n1p003"][0]
```
