# Technical foundation

## Rendering model

The site uses Astro with strict TypeScript and static output. Important routes produce complete HTML
at build time. Client JavaScript is reserved for isolated enhancements such as search, mobile
navigation refinement, and the homepage product-engine motion.

## Content model

Projects, services, articles, notes, and status entries will use Astro content collections with
Zod-backed schemas. Draft content is excluded from production. Dates are explicit frontmatter
values, never filesystem timestamps.

## Portability

The generated `dist/` directory is provider-neutral static output. Rendering does not depend on a
database, browser CMS, proprietary runtime, or third-party script. A contact endpoint may be added
only after a deployment provider and verified destination are available.

## Security baseline

Astro generates a hash-based Content Security Policy for bundled scripts and styles. External
scripts are absent. Production hosting must also supply HSTS, referrer, permissions, frame, and
content-type headers; those headers will be mapped only after the target host is verified.

## Dependency decisions

- Astro: static multi-page rendering and content collections.
- `@astrojs/mdx`: long-form case studies and writing.
- `@astrojs/sitemap`: production route discovery.
- `@astrojs/rss`: standards-compliant writing feed.
- Pagefind: static search loaded only on the search page.
- Fontsource packages: self-hosted, licensed font files with no third-party font request.

No frontend framework or general animation library is included.
