# Collapse business ↔ property bidirectional refs

Copies `property.relatedBusinesses` onto `business.locations` (canonical),
then unsets `relatedBusinesses` on properties.

```bash
# Dry-run
SANITY_AUTH_TOKEN=sk-… bun run migrations/collapse-business-property-refs/run.ts

# Live
SANITY_AUTH_TOKEN=sk-… bun run migrations/collapse-business-property-refs/run.ts -- --live
```

Run this **before** deploying the schema that removes `relatedBusinesses`,
or run it while the field still exists so source data can be read.
