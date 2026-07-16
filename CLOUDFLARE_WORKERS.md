# Cloudflare Workers deployment

Studio and Docusaurus docs ship together as one static site from `dist/`, deployed to the existing Worker **`studio-tehs-document-db`**.

## Build and deploy

```bash
bun install
bun install --cwd documentation
bunx wrangler login   # once, if not already authenticated
bun run deploy:worker # builds then runs wrangler deploy
```

| Setting | Value |
| --- | --- |
| Worker name | `studio-tehs-document-db` |
| Build command | `bun install && bun install --cwd documentation && bun run build` |
| Assets directory | `dist` |

The build runs `docs:build` → `sanity build` → `docs:dist` (copies docs to `dist/documentation`).

`wrangler deploy` updates the existing Worker in place when `name` in [`wrangler.toml`](wrangler.toml) matches.

## SPA routing

[`wrangler.toml`](wrangler.toml) sets `not_found_handling = "single-page-application"` so unmatched Studio client routes serve `index.html`.

Do **not** ship a Netlify-style `_redirects` with `/* → /index.html 200` into `dist/` — Cloudflare Workers rejects that rule as an infinite loop (`code: 100324`). `docs:dist` removes any leftover `dist/_redirects` and does not copy the root file.

Static files under `dist/documentation/` are served first.

## Local preview

1. `bun run docs:build` (once, or after docs changes) then `bun run build` for a full `dist/`
2. `bun run preview:worker` — Wrangler serves `dist/` like production
3. For Studio + docs during development: `bun run docs:build` then `bun run dev`

## After deploy

1. Confirm the Worker origin (custom domain or `*.workers.dev`).
2. Add that origin to the Sanity project CORS allowlist (Sanity Manage → API → CORS origins), with credentials allowed.
3. Update `url` in `documentation/docusaurus.config.ts` if it still points at a Pages placeholder.

Prefer this Worker deploy over `sanity deploy` so Studio and docs stay same-origin.
