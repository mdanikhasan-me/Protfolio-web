# October 15: supplied copy rewrite

Applied the user's `Website copy rewrite Previous and New.md` to the homepage,
About, Services, Hire, Contact, Boilabin, UIU Discord Bot, both posts, and seven
search descriptions. Converted three romanized Bengali passages to Bengali
script while retaining English words. Corrected accidental English spelling and
grammar; retained the requested casual "meh".

Removed the About location box, specified assembly/workshop labels, and both
article contents lists. Preserved article URLs, project dates, brand identity,
the Studying and Currently building boxes, and the contact illustration. The
longer Vision heading uses a smaller responsive size to fit its existing panel.

Validation:

- `npm run build`: 65 Astro files, zero diagnostics; lint and 23-page build pass.
  Vite still reports the existing large-chunk advisory.
- One-off draft-to-built-HTML comparison: 88 text chunks, 84 exact normalized
  matches; remaining four reviewed (three intentional copy corrections and
  one inline-link whitespace difference). All seven descriptions, three
  translations, and requested-removal checks pass.
- Edge rendered review: About, Services, notice-bot article, desktop Vision,
  and 390 x 844 mobile Vision. Text fits at the clear reading position. Existing
  scroll-driven transition blur was not changed or counted as motion parity.
- Evidence and comparison report:
  `D:/Portfolio Evidence/copy-rewrite-20261015/`.
- Narrow rollback is the source diff against
  `2ac67edcdadb6d37d8cb53574d8b67275b51d1a6` in that evidence directory.

Accepted for the supplied-copy scope. SoctuKit, Salty Steak lab, service-detail
bodies, open-source, and seller-interest retain existing copy because the draft
explicitly has no replacements for them. Shared service labels/intros do update
their detail headers. Whole-site reference and runtime-performance gates remain
OPEN; this copy pass does not close them.
