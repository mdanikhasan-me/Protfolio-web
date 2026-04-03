# Project Architecture

## Directory overview

```
mdanikhasan-site/
├── src/                        Source files (never served directly)
│   ├── pages/                  HTML page templates, one per route
│   │   ├── index.html          Homepage  →  /
│   │   ├── about.html          About     →  /about/
│   │   ├── blog.html           Blog      →  /blog/
│   │   ├── contact.html        Contact   →  /contact/
│   │   ├── projects.html       Projects  →  /projects/
│   │   └── 404.html            Not found →  /404.html
│   │
│   ├── partials/               Reusable HTML fragments injected at build time
│   │   ├── seo.html            All meta tags, Open Graph, Twitter, JSON-LD
│   │   ├── nav.html            Site navigation shell (active state injected per page)
│   │   └── footer.html         Site footer (year injected dynamically)
│   │
│   ├── data/                   JavaScript config modules (build-time only)
│   │   ├── site.js             Site-wide constants: URL, name, social URLs, shared schemas
│   │   └── pages.js            Per-page SEO metadata: titles, descriptions, canonical, JSON-LD
│   │
│   ├── content/                CMS-managed content (written via SAWLPER, committed to Git)
│   │   ├── posts/              Blog posts as Markdown with YAML front matter
│   │   ├── projects/           Project entries as Markdown with YAML front matter
│   │   └── settings/           Site-wide settings as YAML
│   │       ├── social.yml      Social profile URLs (overrides defaults in site.js)
│   │       ├── general.yml     General site settings
│   │       └── seo.yml         SEO defaults
│   │
│   └── admin/                  Decap CMS source, copied to /sawlper/ at build time
│       ├── index.html          Login portal (Netlify Identity)
│       ├── decap.html          CMS editor shell
│       └── config.yml          CMS collections and field definitions
│
├── public/                     Static assets copied verbatim into dist/
│   ├── assets/
│   │   ├── css/
│   │   │   └── main.css        All site styles
│   │   ├── js/
│   │   │   ├── boot.js         Runs before CSS loads (class flags: js, reduce-motion, etc.)
│   │   │   ├── core.js         Shared utilities exposed as window.SiteCore
│   │   │   ├── fx.js           Background parallax and motion effects
│   │   │   └── interactions.js Nav, scroll, copy-email, nav-shutter effects
│   │   ├── bg/                 Background images (AVIF + WebP)
│   │   ├── icons/              Favicon and PWA icons
│   │   └── og/                 Open Graph preview image
│   ├── uploads/                CMS-uploaded media
│   ├── manifest.webmanifest    PWA manifest
│   └── robots.txt              Crawl rules
│
├── scripts/
│   └── build-site.js           Build pipeline: reads src/, outputs to dist/
│
├── dist/                       Generated output — Netlify publishes this folder
│   └── ...                     Never edit directly; always rebuilt from source
│
├── docs/
│   └── ARCHITECTURE.md         This file
│
├── netlify.toml                Netlify build config, headers, redirects
└── package.json                npm scripts
```
