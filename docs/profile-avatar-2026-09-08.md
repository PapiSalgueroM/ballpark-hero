# Round 523: profile avatar identity

Claimed September 8, 2026 from Round 522 `2b60a88d`. Local draft candidate.

## Evidence and scope

The header uses the viewed player's avatar, then the signed-in visitor's
metadata avatar without an identity check. If neither has an avatar, its
initial uses the viewed display name, then the visitor's email. Another
player without a photo/name therefore appears with the visitor's identity.
The viewed username is ignored in the initial fallback.

The share-card is separate and contains no avatar. Its text comes from the
viewed player. Do not turn this fix into a share-card redesign or profile
labeling rewrite. No saved records, auth/provider protocol, dates or backend
will change. Tests capture synthetic share output locally, never externally.

## Plan and acceptance

1. Real-component tests with exact synthetic backend fixtures must reproduce
   the wrong avatar and initial. Cover own-to-other navigation, saved avatar
   precedence, own metadata/avatar and email fallback, username and neutral
   fallback. Existing average/isolation cases must remain unchanged.
2. Permit auth fallback only for the matching viewed user ID. Use viewed
   identity for other profiles without creating new state or a new avatar
   component. No real photo downloads or production requests.
3. Prove exact source controls, run both types/build and all fifteen
   generated-site fences. Browser-check phone/desktop with transport denied
   and data-URI avatars. Independent review before draft push.

## Results

Main and the test author independently reproduced five exact assertion
failures across twelve real-component cases. Another player without a photo
displayed the visitor's synthetic red avatar. With no display name, a viewed
alpha username displayed Z from the visitor's email rather than A. An own
bravo username also displayed Z rather than B. Same-component navigation
retained the owner's photo, and a signed-out reader saw U instead of the
viewed username initial. Seven preservation cases passed, including saved
avatar precedence, own metadata/email fallback, neutral U and the existing
share-card/clipboard identity. There were no setup, transport, storage or
unhandled errors in either reproduced baseline.

Production derives one matching avatar account by user ID and uses it for
both metadata and email fallback. The viewed profile's saved avatar remains
first. The initial uses display name, username, matching account email, then
U. This is four added lines and two removed, with no new state or component.

The final combined run passed twelve avatar, sixteen isolation and eight
average cases (36 total), followed by both exact type gates. Navigation checks
both the original photo and the destination identity in one behavior assertion.
The final other-player username is charlie_fixture, distinct from display name
Alpha Fixture, so removing display-name precedence demonstrably fails.

All fourteen source controls passed their exact assertion sets, 51 intended
failures total. The normal wrapper passed 12/12 with zero suite/unhandled errors.
Main independently reran the normal wrapper and account, display, username and
backend controls. Each changes one exact source anchor in a unique OS-temp copy,
never src or dist, and checks process status and all positive preservation cases.

Build passed in 28.16 seconds (2841 modules). Both exact type gates and all
fifteen generated-site fences passed. Profile isolation passed eight built
states, average passed 28 states, ActivityDays passed six cases and SessionMarks
passed. Preview 4198 serves index-B_xhTMiA.js and Profile-BBzEKmJi.js.

The unchanged Round 522 browser baseline reproduced six identity failures in
nine states with zero boundary/runtime errors. The first baseline attempt hit
a harness selector mistake: the hidden share-card duplicated the handle text.
Scoping to the actual header paragraph corrected the selector. That first run
is retained separately and is not counted as product evidence.

The corrected Round 523 browser passes eighteen states across 390 and 1440.
It uses the real Account menu, My Profile and browser Back with one document
request and an unchanged document token. Six identity controls each cause
exactly one named identity failure. Two height-only controls clip an unchanged
72px avatar while preserving every other measured geometry property. No
runtime errors or boundary violations occurred. Only exact local synthetic
reads are allowed, writes and WebSockets are denied, and photos are data URIs.
The browser author inspected all twenty normal/control screenshots. Main
independently inspected phone, desktop and forced-clipping screenshots.

Artifacts under C:/Users/antho/AppData/Local/Temp:

- Original selector error: dukb-profile-avatar-uGDH2g.
- Genuine baseline: dukb-profile-avatar-Xf46mW/report.json.
- Final browser: dukb-profile-avatar-QzKdTO/report.json.
- Identity controls: B4AT9i, mtIWFC, NZXb8V, 058sIZ, F128b8 and 37iE4m,
  all with the dukb-profile-avatar- prefix and report.json.
- Related isolation: dukb-profile-isolation-XJDTne/report.json.
- Related average: dukb-profile-average-ra6HVt/report.json.

Final independent review covered production, all twelve tests and both
harnesses with no actionable finding. This is scoped local verification, not
full-suite or live-backend verification. No real user/backend record, calendar,
auth provider or share-card design was changed. No merge or publication.
