# Portfolio continuation

Read `docs/reference-reconstruction/00-master-state.md` before visual, animation, WebGL,
performance, or reference-validation work. It records the recovered conversation, evidence paths,
current work, and unresolved gates. Current user instructions take priority.

- Preserve the current workspace and existing improvements. Never restore an arbitrary historical
  commit, reset the repository, or replace the site with the reference.
- Preserve ANIK branding, typography assets, authored content, routes, and the identity GLB. Verify
  the protected GLB SHA-256 recorded in the master state after relevant changes.
- Keep large ANIK typography in the opening only; retain the existing project rail and
  project-driven background color. Do not freeze motion to hide defects or improve metrics.
- Change one visual or behavioral factor at a time. Save before evidence, a narrow rollback, after
  evidence, and the acceptance/rejection decision. Preserve unrelated user changes.
- Every chronological native source frame and adjacent transition is required for final parity
  validation. Sparse screenshots, contact sheets, builds, and HTTP checks are not substitutes. Reuse
  the completed reference corpus instead of regenerating it.
- Keep extraction, integrity, machine analysis, individual visual review, comparison, rendered
  proof, runtime performance, and acceptance separate. Report exact counts.
- Deterministic 1/120-second rendering is simulated replay, not verified native 120-fps capture or
  runtime performance. Current captures must record build/input/time provenance.
- Preserve composition/material quality under reduced motion. Desktop acceptance comes before
  mobile. Profile efficiency without removing the visual signature.
- Keep new large evidence on the SSD; bound jobs and preserve browser/account data.
- One GPT-6 Luna comparison agent is user-authorized when useful. Keep implementation and final
  evidence judgment with the primary agent; do not delegate overlapping source edits.
- Do not push or deploy without a request. Keep the local preview available during work.

Validation tooling lives in `scripts/validation/`. Local browser tooling is isolated under
`.codex-local/`; it must not become a production dependency. Do not lint/format generated evidence
or browser profiles. Run `npm run build` for source checks and production build, and run the
appropriate rendered evidence separately.
