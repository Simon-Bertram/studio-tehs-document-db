# Split TEHS Quarterly articles into issues

Creates `quarterlyIssue` documents from the denormalized `volume` / `issue`
fields on existing `quarterlyArticle` documents, then sets `issueRef` on each
article. Idempotent: existing issues are reused by volume+number or `sourceKey`
(e.g. `v22n1`).

Does **not** unset article `volume` / `issue` / `publishedDate` /
`publishedDateText`. After `issueRef` is set, drop those keys with
`bun run migrations:run unset-deprecated-legacy-fields`. This script still
reads `volume`/`issue` as a fallback when `issueRef` is missing.

```bash
# Dry-run
SANITY_AUTH_TOKEN=sk-… bun run migrations/split-quarterly-issue-article/run.ts

# Live
SANITY_AUTH_TOKEN=sk-… bun run migrations/split-quarterly-issue-article/run.ts -- --live
```

Export a dataset backup first:

```bash
bunx sanity datasets export production production-backup.tar.gz --no-assets
```
