# Collapse business ↔ property bidirectional refs

Copies `property.relatedBusinesses` onto `business.associatedProperties` (canonical),
then unsets `relatedBusinesses` on properties.

```bash
# Dry-run
SANITY_AUTH_TOKEN=sk-… bun run migrations/collapse-business-property-refs/run.ts

# Live
SANITY_AUTH_TOKEN=sk-… bun run migrations/collapse-business-property-refs/run.ts -- --live
```

Run this **before** deploying the schema that removes `relatedBusinesses`,
or run it while the field still exists so source data can be read.

If organizations still store the legacy `locations` field, run
`rename-business-locations-to-associated-properties` first (or rely on this
script’s read of both fields and write to `associatedProperties` only).
