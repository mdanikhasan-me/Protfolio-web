# Services panel treatment

The Services index previously displayed three plain list rows. Live inspection
of the reference stellla feature section confirmed bordered, edge-to-edge cells,
centered labels, a teal/navy/plum hover background and slow outlined lettering.
Reference feature rows use two large cells and four smaller illustrated cells;
this portfolio has three actual services. The adaptation uses three equal cells
and its own typography rather than presenting unrelated game-engine offerings.
It is not a claim of literal pixel parity with the six-cell reference page.

Changed only the Services index presentation. All three authored service names,
introductions, workshop labels and destinations remain. Each entire panel is now
a link with the service name as its accessible label. Hover and keyboard focus
reveal the gradient and moving outlined type; keyboard focus has a visible inset
outline. The animated decorative text is hidden from accessibility APIs.

No JavaScript, image asset or WebGL pass was added. CSS animation is paused on
inactive panels. This is a bounded implementation fact, not a measured FPS gain.
The repeating text was extended after review to avoid an empty interval on the
short Web label; each half of the final track exceeds the cell width.

Validation: full build passes (65 files, zero type diagnostics, lint passes,
23 routes). Edge desktop screenshot review, keyboard focus on Web and Software,
Enter navigation to Custom Software Development, 390px phone stacking and 1024px
tablet overflow checks pass. No captured warning/error logs. The phone view also
showed the pointer hover treatment on Software. Native frame-by-frame interaction
parity remains OPEN. No geometry, contact animation or home rendering changes.

Evidence and narrow rollback: `D:/Portfolio Evidence/services-20261015/` contains
the original two source files, live before/reference screenshots, desktop focus,
phone and final desktop captures. The decision is to retain this scoped Services
improvement provisionally; the wider reference audit and performance work remain.
