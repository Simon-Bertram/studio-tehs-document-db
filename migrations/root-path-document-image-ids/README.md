# Root-path document image ids

Document clipping scans imported without an Archive ID were stored under
deterministic ids like `historicalImage.import.{slug}`. Dotted ids are a
[private path](https://www.sanity.io/docs/content-lake/ids): the public site
(unauthenticated GROQ) cannot resolve them, so Portable Text embeds render
blank.

This migration copies each legacy doc to `historicalImage-import-{slug}`,
rewrites incoming references, and deletes the private-path originals.

```bash
bun run migrations/root-path-document-image-ids/run.ts
bun run migrations/root-path-document-image-ids/run.ts -- --live
```

Requires `SANITY_API_WRITE_TOKEN` for `--live`.
