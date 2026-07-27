# MD Anik Hasan — portfolio

This repository contains the clean-room rebuild of [mdanikhasan.com](https://mdanikhasan.com). It is
a static, content-led Astro site for MD Anik Hasan's website development and custom software work,
verified project case studies, writing, and founder story.

The active application was started from an empty working tree. No source, content, visual system,
asset, CMS configuration, or generated output from the previous portfolio is used here.

## Local development

Use Node.js 22.22.3 or newer.

```sh
npm ci
npm run dev
```

The project stays static by default. Important content renders to HTML and must remain usable
without client-side JavaScript.

## Quality gates

```sh
npm run format:check
npm run check
npm test
npm run build
```

Additional accessibility, browser, link, HTML, performance, and bundle checks are added as the
rebuild reaches hardening.

## Content boundaries

Public copy must be traceable to `docs/brief/PORTFOLIO_SOURCE_OF_TRUTH.md`. Unknown contact details,
social links, dates, private Boilabin implementation details, and unverified metrics must not be
published.
