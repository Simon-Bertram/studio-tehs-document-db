# Split TEHS Quarterly articles into issues

Creates `quarterlyIssue` documents from the denormalized `volume` / `issue`
fields on existing `quarterlyArticle` documents, then sets `issueRef` on each
article. Idempotent: existing issues are reused by volume+number or `sourceKey`
(e.g. `v22n1`).

Does **not** unset the deprecated article fields (`volume`, `issue`,
`publishedDate`, `publishedDateText`). Those remain readable for QA.

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
