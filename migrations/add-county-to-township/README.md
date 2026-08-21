# Add county documents and retire the Chester County township

Creates unique `county` documents (Chester, Delaware, Montgomery), unsets
the township link on the one archive image that pointed at the mis-typed
**Chester County** township, then deletes that township.

Sanity will not change `_type` on an existing `_id`, so the township is
replaced by a new county document rather than retyped.

Does **not** assign counties to remaining townships; those were left for editors to assign in Studio.

```bash
# Dry-run
SANITY_AUTH_TOKEN=sk-… bun run migrations/add-county-to-township/run.ts

# Live
SANITY_AUTH_TOKEN=sk-… bun run migrations/add-county-to-township/run.ts -- --live
```

Export a dataset backup first:

```bash
bunx sanity datasets export production production-backup.tar.gz --no-assets
```
