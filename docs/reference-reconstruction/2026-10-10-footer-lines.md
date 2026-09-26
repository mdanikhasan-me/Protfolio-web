# Footer construction lines, October 10

The footer drawing started when its navigation entered the viewport, clipped its
guides around the logo, and could only play once. The user asked for the reference's
construction-line treatment while preserving ANIK and the existing words.

## Retained change

- Observe the logo itself at 30% visibility; reset after it leaves the viewport.
- Align 19 guide paths with the existing letter edges and baselines. Let them extend
  outside the logo, converge, then fade as the outlines become filled letters.
- Keep static, faint guides with filled lettering under reduced motion. A more
  specific rule prevents the normal animation from overriding that preference.
- Preserve the four ANIK paths, navigation, wording and page layout.

This is a provisional improvement to the footer sequence, not reference parity.
The reference's live outro uses a scroll-triggered Lottie sequence. Its assets were
read for inspection only; no reference lettering or animation assets were shipped.

## Evidence and checks

Evidence root: `D:/Portfolio Evidence/current-20261009/footer-lines/`.
Narrow rollback: `SiteFooter.before.astro` and `studio-footer.before.css`.
Baseline: `before.jpg`. The first reduced-motion candidate failed because its CSS
selector lost to the animation selector; `after/` preserves that failed evidence.

`after-fixed-20261010/` and `verified-20261010/` each contain six sampled PNGs,
all individually reviewed. `fonts-ready-20261010/` adds an explicit font-readiness
wait and six more individually reviewed samples. A suspected missing-text issue
in the image preview was not present in the PNG pixels: all eight natural-time
captures have the same 2,947 bright pixels in the navigation region. Four of those
eight captures were individually reviewed. The settled diagnostic also shows
links and copyright. `natural-20261010/report.json` records actual sample times.
These are sampled headless Edge renders, not native video or an FPS measurement.

The report checks replay after exit in both motion modes, visible static guides
under reduced motion, and no horizontal overflow at 2040x974 and 390x844. All five
checks pass, with zero page errors. Normal mode has 23 CSS animations; reduced
motion has zero. Four normal samples use animation times 300/1000/1900/3500 ms.
The dist homepage SHA-256 is
`7cd3f43f3d602e8b019b7f9d01afca494be18e011b50c75256ca19e64604dd0c`.

`npm run build` passed: 53 Astro files checked with no errors, warnings or hints;
ESLint passed, 23 pages built and 21 indexed. Existing Vite bundle warnings remain.
`git diff --check` passed. The protected identity GLB SHA-256 still matches
`04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.

The browser connector reported no available browser. Visible Edge acceptance,
native frame pacing and chronological full-reference comparison remain open.
