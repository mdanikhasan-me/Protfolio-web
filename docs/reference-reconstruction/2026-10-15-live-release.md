# Verify the release after upload

The public www domain rendered successfully in Edge on October 15. Apex and the
GitHub Pages URL redirected to it. The captured opening browser log contained no
warnings/errors. This establishes current availability from this machine, not
the cause of the user's earlier unavailable-site report.

Every production build now records its Git revision and SHA-256 of each public
output file in `release-manifest.json`. After Pages deployment, CI checks the
canonical domain for that revision and downloads every listed file with bounded
retries and six concurrent requests. Pretty page URLs are checked, not just
`index.html` files. Missing assets, stale releases and HTML fallback responses fail
the deployment verification. The manifest excludes itself and the hosting CNAME.
This has no client-side script, animation or rendering cost.

Validation before push: full build passes (65 files, zero type diagnostics, lint
passes, 23 pages, 21 indexed). Local production preview validates all 155 files /
7,734,136 bytes. A local HTTP fixture independently exercises successful delivery,
missing CSS, a soft 404, stale HTML and the wrong release revision. All checks pass.
The existing large JavaScript chunk build warning remains; no bundle-size or FPS
improvement is claimed by this change.

Live About comparison: the reference and portfolio editorial columns both start
at x=779.15625 with width=1133.34375 in the same browser viewport; body text is
18px / 30.6px in both. Different authored copy and reference explicit line breaks
account for the apparent line-width difference. No speculative layout patch was
made. Services still differs substantially from the reference feature composition.
Full visual parity, native motion and runtime performance acceptance remain OPEN.

The user explicitly requested pushing verified batches and checking the live site.
Subsequent batches use ordinary new commits; the recovered history is preserved.
