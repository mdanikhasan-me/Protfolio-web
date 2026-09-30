# Storage and history recovery, October 9

Continues thread `01a0ec3d-5f9e-7541-8cc6-20061a71b6ac`. The latest retained work in
that session was the October 1 native-scroll fix and repeated-DOM-write cleanup.

## Evidence storage

Seven portfolio scratch directories moved from `C:/Users/anikh/.codex/scratch/`
to `D:/Portfolio Evidence/scratch/`. All 50,499 files, totalling 100,467,683,109
bytes (93.57 GiB), passed source/destination SHA-256 comparison before removal of
the C: copies. Browser capture profiles were preserved as files, not discarded.
NTFS junctions at the original paths keep existing scripts and reports usable.
The source reference video and conversation logs remain in their original locations.

C: free space rose from about 104.14 GiB to 197.58 GiB during the operation.
The observed free-space change includes unrelated system activity. This frees C:
capacity by relocating data; it does not claim to reduce total data across drives.

The reference validator passed again through the old path after relocation:
32,607 integrity-verified, analyzed, and classified rows; 32,606 transitions;
zero mismatches or analysis errors. This rechecks saved evidence, not new visual
acceptance of the current site.

Detailed inventories, copy logs, file hashes, and the post-move validator report:
`P:/Projects/Protfolio/.codex-local/maintenance-20261009/`.
New captures belong under `D:/Portfolio Evidence/current-20261009/`.

## History preparation

The remote branch had one README commit missing locally: `47eea06`. It was
fast-forwarded before preparing the rewrite. The README update is preserved.

The owner requested simpler messages throughout the published history. All 220
historical commit titles and all five existing bodies were rewritten. Historical
author identities, author dates, committer dates, file trees, and parent relationships
are checked for preservation. Commit IDs change when messages or parents change.
Old signatures cannot validate rewritten commits; original signed objects remain
in the verified local bundle.

Eight non-empty commits recover the previously unsaved work. They use the actual
saved trees and then the retained working files, in this order:

| Assigned author date | Saved stage | Actual source record |
| --- | --- | --- |
| September 4, two commits | Recovery tools/build fixes, then site chapters | September 30, 11:46 UTC snapshot |
| September 11 | Opening/footer continuation | September 30, 14:36 UTC snapshot |
| September 18 | Live timers and Vision contour | September 30, 19:54 UTC snapshot |
| September 24, two commits | Salty Steak content, then startup readiness | October 1, 03:04 and 03:33 UTC snapshots |
| September 29 | Retained native-scroll fix and DOM cleanup | Work recorded through October 1, 08:45 UTC |
| September 30 | Final recovery and maintenance notes | Current working documentation |

These new author dates are an editorial arrangement requested by the owner to use
blank September contribution dates. They do not claim the work or tests happened
on those dates. New committer timestamps record the actual October 9 recovery.
No new empty commits are added. Existing historical dates stay unchanged.

Backups outside the repository:

- `before-history-rewrite.bundle`: all original refs, verified by Git.
- `working-tree-before.zip` and its SHA-256 manifest: 124 original working files.
- `history-original.json`, `history-plan.json`, and `history-result.json`: original
  messages, replacements, source snapshots, and old-to-new commit mapping.

Only the active published branch is to be updated. Local rejected attempts and
the immutable baseline remain available under their original refs. The push uses
an explicit lease against the fetched remote tip, so an intervening remote update
cannot be silently overwritten.

## Current checks

`npm run build` passed: 51 checked files, zero type-check errors/warnings/hints,
ESLint passed, 23 pages built, and 21 pages indexed. Vite still reports the large
chunk and the shared static/dynamic fluid import warnings.

Fresh `verify-native-scroll.mjs` run: 8/8 normal/reduced-motion cases passed, zero
page errors or failures. Evidence: `D:/Portfolio Evidence/current-20261009/scroll-before/`.
The current opening also rendered in connected Edge and was visually inspected.

Protected GLB SHA-256 remains
`04FCA919EBF33F69F31133B68401721186C6A5EFB61E92A6CBD0035E74B8CD6E`.
Full current/reference frame comparison, exact material parity, native performance,
and final desktop/mobile acceptance remain open.
