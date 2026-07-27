# Current repository audit

- Checkpoint: 1 — research and audit only
- Audited working directory: `P:\Projects\Protfolio\MyProtfolio`
- Audited HEAD before this checkpoint: `197d207aa93959a7a1b5f84a9a68a8c4faef9944`
- Audit branch: `rebuild/immersive-portfolio-v3`
- Default branch: `main` at `0d45bf4454aafade6603b7bd1bb848e361d7c7e7`

## Repository and safety state

- Git root matches the opened workspace.
- The former remote URL, `mdanikhasan-dev/Protfolio-web.git`, is a GitHub redirect. Git explicitly
  reported that the repository moved to `mdanikhasan-me/Protfolio-web.git`; `origin` now uses the
  canonical URL.
- `main` was not changed.
- The audit branch was created and pushed before research changes.
- The working tree already contained uncommitted prior-session production work. It was preserved in
  both backups and remains unstaged:
  - modified project/service components, four project MDX files, and `global.css`;
  - untracked workshop flow/evidence components;
  - an untracked SoctuKit image and public-media register.
- No prior-session production file has been overwritten, deleted, or staged by this checkpoint.

Verified external backups:

| Backup              | Path                                                                                        | SHA-256                                                            | Verification                                                           |
| ------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Complete Git bundle | `C:\Users\anikh\Downloads\portfolio-backups\Protfolio-web-20260727-205025.bundle`           | `4F1871C3081159A9CC244EB318B1C79980A3FB74F9AF344E8511599C189D2021` | `git bundle verify`: complete history                                  |
| Working-tree ZIP    | `C:\Users\anikh\Downloads\portfolio-backups\Protfolio-web-working-tree-20260727-205025.zip` | `583B56EA523696FB64CD6173FDBC3943B6BDA2A8779B85598E5CB76DEF72599A` | 118 entries; sampled tracked and untracked prior-session files present |

## Baseline validation

The following checks were run against the preserved current working tree, including the
prior-session changes:

| Check            | Result             | Evidence or limitation                                          |
| ---------------- | ------------------ | --------------------------------------------------------------- |
| Astro type check | Pass               | 43 files, 0 errors, 0 warnings, 0 hints                         |
| ESLint           | Pass               | Exit code 0                                                     |
| Vitest           | Technically passes | No test files exist; this is not meaningful behavioral coverage |
| Production build | Pass               | Static build produced 23 HTML pages; Pagefind indexed 21 pages  |
| Formatting check | Fail               | Three prior-session project MDX files need Prettier formatting  |
| Dependency audit | Pass at audit time | 0 known vulnerabilities across 670 dependency entries           |

The passing build is automated evidence only. No claim is made here about rendered quality,
interaction behavior, accessibility, browser flows, responsive coverage, or Lighthouse results.

## Architecture findings

The repository already uses Astro 7 static output, strict TypeScript, file-based routes, Astro
content collections, MDX, ordinary links, and limited client JavaScript. Those mechanisms align with
the eventual architecture requested by the master prompt. The official Astro documentation was
consulted for [routing](https://docs.astro.build/en/guides/routing/),
[components](https://docs.astro.build/en/basics/astro-components/),
[content collections](https://docs.astro.build/en/guides/content-collections/), and
[styling](https://docs.astro.build/en/guides/styling/).

The useful technical foundation and the rejected design are interleaved. “Preserve” below means
preserve the mechanism, not its current visual tokens, labels, or claims.

## Preserve, rewrite, or remove

| System                                | Current implementation                                                             | Decision                                                        | Reason and boundary                                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Git history and default branch        | Normal Git repository; `main` intact                                               | Preserve                                                        | Recoverable history exists and the rebuild can proceed on an isolated branch.                                                                     |
| Astro static rendering                | `output: 'static'`, trailing slashes, 23 generated pages                           | Preserve                                                        | Produces crawlable HTML and route-level output with little client JavaScript.                                                                     |
| TypeScript strictness                 | Astro strict config plus unchecked-index and exact-optional checks                 | Preserve                                                        | Factually and visually neutral safety infrastructure.                                                                                             |
| Formatter and linter                  | Prettier, ESLint, Astro and TypeScript rules                                       | Preserve                                                        | Useful neutral quality gates; later include audit scripts and Markdown scope.                                                                     |
| Package manager and lockfile          | npm and committed `package-lock.json`                                              | Preserve                                                        | Existing reproducible dependency surface; no reason to replace it.                                                                                |
| Astro content collections             | Projects, services, articles, and notes with Zod schemas                           | Preserve mechanism; rewrite schema                              | Collection loading is useful. The mandatory `workshop` field and rejected content model must go.                                                  |
| MDX content                           | Project, service, and writing files                                                | Preserve mechanism; rewrite content                             | Supports first-hand long-form pages. Current copy repeats claims and includes unsupported facts.                                                  |
| Dynamic static routes                 | `[slug].astro` with `getStaticPaths()`                                             | Preserve                                                        | Correct static pattern for collection-backed pages.                                                                                               |
| Shared layout semantics               | Canonical, description, Open Graph, RSS link, skip link, main landmark             | Preserve mechanism; rewrite values and presentation             | Neutral SEO/accessibility structure is useful; colours, icons, profile links, and factual values need correction.                                 |
| Standard link navigation              | Real `<a>` elements and `aria-current`                                             | Preserve behavior; rewrite composition                          | Keyboard- and crawl-friendly. Current branding, labels, and duplicated Hire/Contact entry points are rejected or unresolved.                      |
| Sitemap                               | `@astrojs/sitemap` integration                                                     | Preserve and retest                                             | Neutral route discovery. Filters and route set must follow approved IA.                                                                           |
| Robots endpoint                       | Static endpoint using configured origin                                            | Preserve and retest                                             | Useful mechanism; depends on approved canonical domain.                                                                                           |
| RSS                                   | `@astrojs/rss` over article collection                                             | Preserve mechanism; rewrite                                     | Useful for Stories; current “field notes” workshop language and `/writing/` links need approved IA.                                               |
| Static search                         | Pagefind and search-only client script                                             | Preserve and test                                               | Properly isolated client JavaScript and graceful no-script links. Copy and route labels need rewriting.                                           |
| Content Security Policy               | Astro hash-based CSP                                                               | Preserve and verify later                                       | Useful baseline; deployment headers, final media, WebGL, workers, and forms may require deliberate changes.                                       |
| Structured-data helpers               | WebSite, Person/ProfilePage, Service, Breadcrumb, BlogPosting, SoftwareApplication | Preserve mechanism; rewrite claims                              | Types are useful, but every emitted value must match visible approved content. `applicationCategory` and repository-dependent claims need review. |
| Image optimisation                    | Astro Picture plus Sharp in prior-session work                                     | Preserve capability; quarantine current input                   | AVIF/WebP generation works. The SoctuKit image is not approved evidence yet.                                                                      |
| Self-hosted fonts                     | Fontsource packages                                                                | Preserve self-hosting approach; replace visual choice if needed | Local delivery is useful; Fraunces/Manrope/IBM Plex Mono belong to the rejected direction.                                                        |
| Pagefind script safety                | Result excerpts converted to text before insertion                                 | Preserve                                                        | Avoids inserting Pagefind excerpt HTML into the document.                                                                                         |
| Environment template                  | Empty search-verification values; no analytics/form endpoint                       | Preserve pattern; revise keys later                             | Correctly avoids secrets. Canonical domain and form provider remain unresolved.                                                                   |
| Browser capture helper                | Four fixed Playwright/Edge screenshots                                             | Rewrite/expand later                                            | Useful seed, but it is not a test suite and does not cover the required viewports, reduced motion, zoom, fallback states, or flows.               |
| Vitest dependency and script          | `--passWithNoTests`                                                                | Rewrite                                                         | A green exit with zero tests is not validation. Add focused tests and remove the false-comfort gate.                                              |
| Playwright dependency                 | Installed, no managed browser binaries or test config                              | Preserve and complete                                           | System Chrome/Edge are usable; add explicit configuration and tests at the technical checkpoint.                                                  |
| Accessibility dependency              | `@axe-core/playwright` installed but unused                                        | Preserve and wire later                                         | No accessibility result exists yet.                                                                                                               |
| Performance tooling                   | No Lighthouse CI or bundle budgets                                                 | Add later                                                       | Required by the master prompt; no present evidence.                                                                                               |
| Internal-link and metadata validation | No dedicated checks                                                                | Add later                                                       | Build success does not prove links, canonical correctness, or structured data.                                                                    |
| Global CSS                            | 1,800+ lines of beige workshop/editorial styling                                   | Remove/rewrite                                                  | Explicitly rejected visual system and excessive coupling to workshop components.                                                                  |
| Design documents                      | `DESIGN_DIRECTION.md`, `TOKENS_AND_MOTION.md`                                      | Remove after audit approval                                     | They codify “Massive Builder Workshop,” prohibited colours, type, objects, and motion.                                                            |
| ProductEngine                         | Pixel silhouette, travellers, workshop outputs                                     | Remove                                                          | Explicitly rejected literal system diagram and banned “Product engine” identity.                                                                  |
| PageHero workshop layer               | `workshop`, gauges, “ASSEMBLY / READY”                                             | Remove/rewrite                                                  | Familiar route titles can remain; workshop labels and visual chrome cannot.                                                                       |
| Site header/footer identity           | AH pixel mark, “From pixels to systems,” workshop gauges                           | Remove/rewrite                                                  | Contains explicitly banned copy and rejected identity.                                                                                            |
| Generated icons                       | Workshop AH raster marks                                                           | Remove/replace later                                            | They are the rejected visual identity, not neutral infrastructure.                                                                                |
| Brand asset generator                 | Generates rejected workshop marks                                                  | Remove                                                          | Its only output is rejected.                                                                                                                      |
| Rejected public copy                  | Workshop labels, repeated summaries, generic/inferred case-study prose             | Rewrite later from approved fact matrix                         | Checkpoint 1 does not publish replacement copy.                                                                                                   |
| Existing source-of-truth document     | Former `PORTFOLIO_SOURCE_OF_TRUTH.md`                                              | Replace now                                                     | It included unsupported GitHub/repository claims and was superseded by the user-supplied source.                                                  |
| Existing README                       | Claims a clean-room empty tree and points to superseded brief                      | Rewrite                                                         | The literal claims are not reliable for the current branch and file path is obsolete.                                                             |
| `llms.txt`                            | Third service plus current work summaries                                          | Rewrite or remove                                               | If kept, it must mirror approved IA and claims; it is not an SEO shortcut.                                                                        |
| Prior-session ProjectFlow/ServiceFlow | Static technical workshop diagrams                                                 | Remove from future product                                      | They extend the rejected direction and are not approved art direction.                                                                            |
| Prior-session ProjectEvidence         | Real-image/placeholder framework                                                   | Preserve only the architectural idea                            | Authentic asset slots are needed, but the current workshop presentation and unverified screenshot cannot ship.                                    |
| Public icons/manifest colours         | Beige workshop colours and icons                                                   | Rewrite                                                         | Manifest mechanics can stay; identity fields must follow approved art direction.                                                                  |
| Source asset screenshot               | `soctukit-settings.png`                                                            | Quarantine                                                      | Unknown provenance. Do not call it authentic until Anik confirms it.                                                                              |
| `.openai/hosting.json`                | Absent                                                                             | No action at Checkpoint 1                                       | The repository is not attached to Sites hosting. Deployment is prohibited until later release checkpoints.                                        |

## Route audit

| Route area                                                                                                                                                  | Decision                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`, `/services/`, `/services/website-development/`, `/services/custom-software-development/`, `/work/`, project routes, `/about/`, `/search/`, `/privacy/` | Preserve route purpose; rebuild content and visual composition after approvals.                                                                       |
| `/writing/` and article routes                                                                                                                              | Preserve content mechanism; decide whether to redirect path to `/stories/` so public label and required IA match.                                     |
| `/lab/salty-potato-ai/`                                                                                                                                     | Preserve as the truthful technical-lab route. Include the user-approved “approximately 95 million parameters at the start” only with its exact scope. |
| `/boilabin/seller-interest/`                                                                                                                                | Optional; preserve only if Anik confirms it belongs in the first release.                                                                             |
| `/services/native-windows-software/`                                                                                                                        | Do not present as a third sold service. Fold into Custom Software or retain only as an approved supporting capability page.                           |
| `/hire/` and `/contact/`                                                                                                                                    | Consolidate after IA approval; they currently duplicate project intake.                                                                               |
| `/now/`, `/open-source/`, `/resume/`                                                                                                                        | Defer until Anik confirms usefulness and verified content.                                                                                            |
| `/play/`                                                                                                                                                    | Missing; add only after the separate game concept and prototype checkpoints.                                                                          |
| `/concept-lab/`                                                                                                                                             | Missing by design; add privately only after Checkpoint 2 approval.                                                                                    |

## Factual and content defects

1. The site still uses the old `mdanikhasan-dev` profile and repository URLs; the authentic public
   profile is `mdanikhasan-me`.
2. It claims that SoctuKit and the UIU Discord Bot repositories are public and that SoctuKit's
   release repository contains no source. Those facts are not established by the authentic source.
3. It claims the canonical domain without that domain appearing in the authentic source.
4. It says remote work is available; this is plausible but not explicitly established in the
   authentic source.
5. It uses a third marketed Native Windows service even though only Website Development and Custom
   Software Development should be sold.
6. It publishes two finished “first-hand” articles that are largely constructed from a short fact
   brief rather than supplied first-hand detail. They require Anik's review and likely should revert
   to drafts until the content checkpoint.
7. It repeats banned workshop language and the same project-status boundaries across Home, work
   pages, notes, service pages, writing, footer, and `llms.txt`.
8. The public note that the rebuild started from an empty active tree is at least misleading in the
   current repository/history context.
9. The prior-session SoctuKit image is used by the build, but its provenance is not recorded.
10. The project photos are not ready. No project page may present generated UI or an unapproved
    placeholder as evidence.

## Performance and accessibility hypotheses, not results

- The static Astro/content architecture is a strong candidate for the requested normal-page budget.
- The current build emitted no JavaScript bundle under `dist/_astro`; search loads Pagefind only on
  its route. This is a useful baseline, not a future-motion budget measurement.
- The generated output totals approximately 3.85 MB locally, dominated by current raster icons and
  generated image variants. Final budgets must be measured per route and over transfer compression.
- A skip link, semantic landmarks, standard links, focus styles, no-script search fallback, and CSP
  exist in source, but WCAG 2.2 AA has not been tested.
- No Three.js or game code exists, which should remain true on content pages.
- The rejected CSS is large and tightly coupled. Rebuilding it after art-direction approval is safer
  than trying to skin it.

## Checkpoint boundary

This audit does not approve any current visual direction, public copy, route consolidation, asset,
or production cutover. The next permitted work after the reference audit is approved is three
original art directions—not a homepage implementation.
