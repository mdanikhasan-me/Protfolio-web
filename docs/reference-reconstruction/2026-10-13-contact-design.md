# Contact left-side redesign - October 13

User scope: redesign the left typography, color and style to fit the rest of the
site. Keep the animated illustration on the right. Animation is optional after
considering the composition.

## Analysis and implementation

The previous rounded Fredoka heading, cream foreground, red punctuation/rule and
purple kicker were disconnected from the site's angular identity, monochrome
interface and wireframe sculpture. The candidate uses existing Archivo typography,
uppercase spacing, cool white and a pale outline on the second line. The small
monospace kicker and circular arrow connect it to the existing navigation/footer.
The entire invitation now links to the existing Contact route, with visible focus
and outline-to-fill feedback. No speculative availability or business claims added.

Continuous melting was rejected for this composition: it would compete with the
retained illustration and obscure the call to action. A single 780ms transform
entrance with a 90ms second-line delay adds movement without an idle animation loop,
WebGL context or animated filter. It disconnects its observer after reveal and
reveals on keyboard focus. Existing reduced-motion preference gets static text;
this accessibility behavior is not the performance optimization strategy.

## Evidence and status

Root: `D:/Portfolio Evidence/contact-redesign-20261013`.
Before: `before.png`, `before.json`, `before-index.astro`, `before-global.css`.
Changes: homepage copy markup, its existing CSS, `contact-invitation.ts`.
Right illustration markup/assets and all its CSS declarations are unchanged.
`source-preservation.json` records the exact source checks, not rendered equality.

`build.log`: Astro checks (63 files, no errors/warnings/hints), ESLint and production
build passed; 23 pages and 21 indexed. Preview HTTP 200. These are source/build
checks only. After rebuilding, the browser connection disappeared before an aligned
after screenshot could be inspected. Browser inventory returned empty and the
native computer pipe was unavailable. Desktop composition, hover/focus, responsive
layout, entrance and rendered preservation of the right illustration remain OPEN.
Do not describe this candidate as visually accepted or reference-matched.

## October 14 removal and desktop check

User explicitly requested removal of "Have a project in mind?". Removed its
paragraph, decorative rule, unused CSS selectors and the invitation's reserved
top margin. `before-kicker-removal-index.astro` / `before-kicker-removal-global.css`
provide a narrow rollback. The heading, Contact link and right animation remain.

`kicker-removal-build.log` passes the full build (63 files, zero diagnostics,
lint, 23 built pages, 21 indexed). Normal Edge preview at 4421 was rebuilt and
reloaded. At 2040 x 973 CSS / DPR 1.25, scroll 13136, the complete Contact section
was inspected. `after-kicker-removal.png` shows the invitation and retained right
illustration with no kicker. DOM inspection: zero `.home-contact-kicker` nodes,
phrase absent, invitation href `/contact/`, original animated WebP retained.
This closes the requested text removal and this desktop composition check.
Entrance timing, hover/focus and mobile layout remain separate checks.

## October 14 keyboard follow-up

On the current 4421 build, before reaching Contact its copy was `data-reveal=pending`.
Tab from the preceding Vision link focused the invitation, scrolled it into view,
and set `data-reveal=visible`. The cool-white focus outline and filled second line
were visibly present; the full title and retained right illustration fit the
desktop viewport. `keyboard-focus.png` records this state. Enter opened `/contact/`
with the expected heading and email/Discord links. No message was sent.
This closes keyboard reveal/activation at desktop size, not native entrance timing
or responsive acceptance. Mobile and matched entrance capture remain open.
