# Cloudflare Pages deployment

Studio and Docusaurus docs ship together as one static site from `dist/`.

## Build settings

| Setting | Value |
| --- | --- |
| Build command | `bun install && bun install --cwd documentation && bun run build` |
| Build output directory | `dist` |
| Root directory | repository root (default) |

The build runs `docs:build` → `sanity build` → `docs:dist` (copies docs to `dist/documentation` and `_redirects` to `dist/_redirects`).

## SPA redirects

Root [`_redirects`](_redirects) is copied into `dist/` by `docs:dist`:

```txt
/documentation/*  /documentation/:splat  200
/*                /index.html            200
```

Static files are served first; the catch-all covers Sanity Studio client routes.

## Local development

1. `bun run docs:build` (once, or after docs changes)
2. `bun run dev` — Studio Vite middleware serves `documentation/build` at `/documentation/`

## After first deploy

1. Note the Pages origin (`https://<project>.pages.dev` or your custom domain).
2. Add that origin to the Sanity project CORS allowlist (Sanity Manage → API → CORS origins), with credentials allowed.
3. Update `url` in `documentation/docusaurus.config.ts` if it differs from the placeholder `https://tehs-document-db.pages.dev`.

Prefer Pages over `sanity deploy` for this repo so Studio and docs stay same-origin.
