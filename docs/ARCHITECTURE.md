# Project Architecture

## Source layout

- `src/pages/` — route source files for static pages
- `src/admin/` — Decap CMS admin panel (`/sawlper/`)
- `src/content/posts/` — markdown blog content used as the CMS-backed data source
- `public/` — assets copied directly to the published site
  - `public/assets/css/main.css`
  - `public/assets/js/`
  - `public/assets/` images/icons/open-graph assets
  - `public/uploads/` CMS-uploaded media
- `scripts/build-site.js` — static build pipeline that publishes to `dist/`
- `dist/` — generated production output for Netlify

## Build flow

1. Copy `public/` to `dist/`
2. Copy `src/pages/` into routed output folders
3. Copy CMS admin from `src/admin/` to `/sawlper/`
4. Read markdown from `src/content/posts/`
5. Generate blog index, blog post pages, `feed.json`, and `sitemap.xml`

## Reason

- clear separation between source, content, static assets, and generated output
- easier path management for GitHub + Netlify deployment
- CMS content stays in a dedicated content layer instead of mixing with page files
- generated files remain disposable because `dist/` is rebuilt from source
