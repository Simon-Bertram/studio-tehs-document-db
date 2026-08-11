# Charlestown people name extract

Extract unique landowner names from the Charlestown deed-history name index into an import-ready CSV for the Sanity `person` schema.

Source: [Charlestown.html](https://www.the2nomads.site/Charlestown/Charlestown.html) (Searching / land owners index).

This folder does **not** write to Sanity. Review `unique-people.csv`, then import in a separate pass.

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

## Run

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
