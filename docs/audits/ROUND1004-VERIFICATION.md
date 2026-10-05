# Round 1004: short desktop Connections verification

2026-10-05. Verification only. No product, puzzle, save or scoring changes.

The earlier public browser-control session left 22px of NBA's action row below
a 720px viewport after changing drafts. That observation was real, but the
cause was not established. This round drives actual mouse coordinates, without
preparatory scrolling between draft A, B and A, against the accepted product.
The clipping did not reproduce. No layout fix is claimed or introduced.

Candidate b4d2499fb1c26e67cef7af7cc06f327cb4189599 passed both remote workflows:

- NBA run 37350136630, job 111898617762, artifact 11362611887.
  SHA256 4bf659ef7fb89b6090eeee6854fb84e86e8bbce7b8e4ba7f5de4874a2a8cded0.
- NHL run 37350136657, job 111898617526, artifact 11363230241.
  SHA256 f84237bb73408d570cb8fabc64f8c1628808f5f935e126970a64dbed71bc9184.

Both archives were downloaded and their digests verified before inspection.
Both passed the real app type check, build, mounted planning outcomes, source
controls (16 NBA, 15 NHL), loss/timer/completion regressions and all 17 existing
built-page/search/guide checks in their workflows. No local runtime gates ran.
All external native-browser requests were intercepted on the remote runner.

Each sport now covers seven profiles: 320, 390 and 430px touch; 1440px keyboard;
1280x720 mouse; the same mouse viewport with reduced motion; and a restored
Daily with one group already solved. Each finished for exactly 750 points once,
with zero page or console errors. Daily bytes and independent saved notes were
protected, including tab navigation, reload, correct locks and Unlimited reset.

On short desktop after the A/B/A sequence, the Submit bottom was 533px in both
fresh games, 504px in restored NBA and 505px in restored NHL. Feedback, draft
tabs and the editable grid remained in view, with focus on the clicked tab.
Screenshots of restored NBA and fresh NHL were inspected. The name grid may
scroll internally; the check requires visible editable names and reachable
actions, not every roster name to be simultaneously visible.

A changed-DOM control moves Submit to 22px below the viewport, requires proof
the rectangle changed, and catches the exact visibility assertion before
restoring it. This proves the check works; it does not reproduce a product bug.
The previous three geometry controls still pass, plus NBA's result-mode copy
control. No separate publication is necessary for test and documentation files.

Next: Round 1005 adds the visible Your picks shelf on Home and pin controls on
Home/Search. Claude retains Transfer Path 1010, Soccer Career 1011 to 1013,
Aussie Rules 1014 and the Front Office binds. No overlapping files are claimed.
