# Split civic / institutional businesses into `organization`

Creates new `organization` documents, rewrites incoming archive references,
then deletes the old `business` documents and drops leftover `businessType`
on commercial records.

Sanity will not change `_type` on an existing `_id` (createOrReplace and
delete+create in one transaction both fail with
`cannotModifyImmutableAttributeError`). New IDs are required.

```bash
# Dry-run
SANITY_AUTH_TOKEN=sk-… bun run migrations/split-business-to-organization/run.ts

# Live
SANITY_AUTH_TOKEN=sk-… bun run migrations/split-business-to-organization/run.ts -- --live
```

Export a dataset backup first:

```bash
bunx sanity datasets export production production-backup.tar.gz --no-assets
```

If a previous live attempt already weakened Lincoln’s incoming reference, this
script rewrites that reference onto the new organization document (and clears
`_weak`).
