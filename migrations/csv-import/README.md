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
| `bun run csv-export:images` | DreamHost MySQL via tunnel | writes `sample-images.csv` (no BLOBs) | — |
| `bun run mysql-tunnel` | SSH `-L 3307:mysql.the2nomads.site:3306` | — | — |
| `bun run csv-import:quarterly` | tehistory.org HTML (TOC + articles) | quarterlyArticle | `reports/quarterly/` |

## Documents / primary sources

Maps CSV `type` → Sanity: `document` → `primarySource`, `photo` → `historicalImage`,
`book` → `researchArticle`. Natural key is `archiveId` from `clipID`. Keyword
priority: township → organization → category.

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

## DreamHost MySQL MCP (read-only)

Cursor talks to the image database through `@benborla29/mcp-server-mysql` in [`.cursor/mcp.json`](../../.cursor/mcp.json) (gitignored). **Do not put `mysql.the2nomads.site` in `MYSQL_HOST`.** That hostname is the SSH `-L` destination only.

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

CLI smoke-test (same host/port as MCP):

```bash
mysql -h 127.0.0.1 -P 3307 -u images_ro -p -D tehsimages2 -e "SHOW TABLES;"
```

In Cursor, after reloading MCP:

1. `SHOW TABLES;`
2. `DESCRIBE` the images table (confirm `identifier` + `imageLocation` / `fileLocation`).
3. `SELECT identifier, imageLocation, title FROM … LIMIT 5;` — **never** select `psImages` (BLOB, out of scope).
4. Confirm a write (`INSERT`/`UPDATE`) is denied.

Sanity is already available via the Cursor Sanity plugin (`query_documents`, `get_schema`, `whoami`). Do not add a second Sanity server to `mcp.json`.

## Export CSV from MySQL

MCP does not feed the importer. After the SELECT is settled, export metadata + paths only:

```bash
MYSQL_USER=images_ro MYSQL_PASS='…' MYSQL_DB=tehsimages2 bun run csv-export:images
```

Writes [`migrations/data/sample-images.csv`](../data/sample-images.csv). Blob columns (`psImages`) are excluded. The committed file is a 3-row URL-path sample until you run a full export.

## Photo catalog bootstrap

Dry-run is the default. There is **no** `--dryRun` flag; pass `--live` to write.

```bash
bun run csv-import:donations -- --limit 10          # dry-run
bun run csv-import:donations -- --live              # seed categories + donations
bun run csv-import:images -- --limit 3              # dry-run (logs constructed URLs)
bun run csv-import:images -- --live --limit 3       # write 3 docs + HTTP asset fetch
bun run csv-import:images -- --live                 # full image import
```

### Images dry-run then live

1. Confirm a public JPEG with `curl -I` (not a markdown fetch tool):

   ```bash
   curl -sI -A 'Mozilla/5.0' \
     'https://www.the2nomads.site/TEHSImageDatabase/ValleyForge/BakeHouse/BKH1-BakeHousesmall.jpg'
   ```

   Expect `200` and `content-type: image/jpeg`. DreamHost varies by `User-Agent`; the importer sends a browser UA.

2. Dry-run: `bun run csv-import:images -- --limit 3` — console should print constructed URLs; `reports/images/preview.ndjson` is metadata only (no asset upload).
3. Live sample: `bun run csv-import:images -- --live --limit 3` (Editor token in `.env`).
4. Full run: `bun run csv-import:images -- --live`.
5. Vision / Sanity MCP: `*[_type == "historicalImage" && archiveId == "BKH1"][0]`

## Run order

1. **Donations** — seeds seven canonical Donation Categories, upserts by `donationId`.
2. **Images** — upserts by `archiveId` (`identifier`), links `donation` via `donationID`, fetches JPEG from `https://www.the2nomads.site/TEHSImageDatabase/` + `imageLocation`.
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
| imageLocation (fallback: fileLocation) | imageFile (HTTP fetch + upload on `--live`) |

Ignored: resolution, digitization metadata, publicDisplay, `psImages` (BLOB, not migrated), type (all rows → historicalImage).

CSV is UTF-8. Relative paths such as `ValleyForge/BakeHouse/BKH1-BakeHousesmall.jpg` are joined to `https://www.the2nomads.site/TEHSImageDatabase/`. Original filename is passed to `assets.upload`. Existing `imageFile` is not re-uploaded.

## Editor reports

Each importer writes under its reports folder:

| File | Use |
| --- | --- |
| `imported.csv` | Ledger: schema + natural key (`clipId`) + action + sanityId |
| `skipped.csv` | Rows that never became docs |
| `diverted-quarterly.csv` | Keyword TEHS rows skipped by archive importers |
| `needs-manual-links.csv` | Imported but missing taxonomy / donation links |
| `missing-taxonomies.csv` | Keywords still needing a `migrationKey` |
| `asset-errors.csv` | (images only) HTTP fetch / JPEG upload failures |
| `summary.txt` | Counts |

### Vision checks

```groq
count(*[_type == "donation" && defined(donationId)])
count(*[_type == "historicalImage" && defined(archiveId)])
count(*[_type == "quarterlyArticle" && volume == 22])
*[_type == "historicalImage" && archiveId == "BKH1"][0]
*[_type == "quarterlyArticle" && sourceKey == "v22n1p003"][0]
```
