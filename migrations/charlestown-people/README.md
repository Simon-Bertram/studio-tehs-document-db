# Charlestown people name extract + import

Extract unique landowner names from the Charlestown deed-history name index into an import-ready CSV for the Sanity `person` schema, then optionally create person stubs in Sanity.

Source: [Charlestown.html](https://www.the2nomads.site/Charlestown/Charlestown.html) (Searching / land owners index).

## Spelling strategy

| Situation | What to do |
| --- | --- |
| Same person, different spellings (`Susanna` / `Susannah`, `Ezekial` / `Ezekiel`, `Geiorge` / `George`) | **One** person row; canonical `firstName`/`lastName`; variants in `alternateSpellings` |
| Historically variable surnames (`Buckwalter` / `Buchwalder`, `David` / `Davies` / `Davis`, `John` / `Jones`) | Keep **separate people** unless you know it is the same individual. See `surname-aliases.csv` for search aids only |
| Same display name many times (`John Acker` deed 1…10) | **One** stub person; split later into Sr/Jr / different eras when dates prove multiple individuals |
| Index “see …” cross-refs | Not people — listed in `surname-aliases.csv` |
| Companies / school district / `&` partnerships | Excluded from the people CSV |

Canonical rule: prefer the corrected/common form; keep the index typo in `alternateSpellings`.

Map into Studio via **Alternate Spellings / Aliases** on Historical Person (see editor docs).

## Files

| File | Purpose |
| --- | --- |
| `Charlestown.html` | Saved source page (re-download to refresh) |
| `extract-names.ts` | Parser + merge logic |
| `unique-people.csv` | Import-ready unique people |
| `surname-aliases.csv` | Variable-surname / see-also map (not for person import) |
| `import-people.ts` | Sanity import entrypoint (dry-run default) |
| `lib/suspects.ts` | Near-duplicate pair detection |
| `lib/run-people-import.ts` | Import pipeline + reports |
| `reports/` | Generated import reports (gitignored) |

### CSV columns (`unique-people.csv`)

| Column | Maps to |
| --- | --- |
| `firstName` | `person.firstName` |
| `lastName` | `person.lastName` |
| `prefix` | `person.prefix` |
| `suffix` | `person.suffix` |
| `alternateSpellings` | `person.alternateSpellings` (pipe-separated) |
| `sourceNames` | Index display forms that collapsed into this row |
| `roles` | Index roles seen (`deed`, `patent`, `neighbor`, …) |

## Extract

```bash
# Refresh source HTML (optional)
curl -sL 'https://www.the2nomads.site/Charlestown/Charlestown.html' \
  -o migrations/charlestown-people/Charlestown.html

bun run migrations/charlestown-people/extract-names.ts

# Or point at another saved copy:
bun run migrations/charlestown-people/extract-names.ts -- \
  --input /path/to/Charlestown.html
```

Conservative first-name merges and full-name typo merges live at the top of `extract-names.ts` (`FIRST_NAME_CANONICAL`, `FULL_NAME_MERGES`). Extend those maps when you find more clear duplicates; do **not** auto-merge Buckwalter↔Buchwalder people.

## Import into Sanity

Dry-run is the default (no writes). Pass `--live` to create documents. Requires `SANITY_AUTH_TOKEN` with Editor (or Administrator) for live writes.

| Row type | Action |
| --- | --- |
| Clean unique name | Create `person` stub (or dry-run preview) |
| Already merged via `alternateSpellings` | Create one doc with aliases |
| Near-duplicate *pair* in CSV | **Skip both** → `reports/review-suspected-duplicates.csv` |
| Matches existing Sanity person (same first+last+suffix) | Skip → `reports/skipped.csv` (`already_exists`) |

```bash
# Dry-run (default) — writes reports only
bun run csv-import:people
bun run csv-import:people -- --limit 50

# Live create
bun run csv-import:people -- --live
```

### Reports (`migrations/charlestown-people/reports/`)

| File | Contents |
| --- | --- |
| `imported.csv` | Rows that would be / were created |
| `skipped.csv` | `suspected_duplicate`, `already_exists`, `api_error`, … |
| `review-suspected-duplicates.csv` | Near-duplicate pairs held for manual decision |
| `preview.ndjson` | Dry-run document payloads |

### Review workflow

1. Run dry-run and open `review-suspected-duplicates.csv`.
2. For each pair, either:
   - Add a merge to `FULL_NAME_MERGES` / `FIRST_NAME_CANONICAL` in `extract-names.ts`, re-extract, re-import; or
   - Create one or both people manually in Studio with aliases.
3. Run `--live` for the clean majority (~2.5k stubs on a full dry-run).
