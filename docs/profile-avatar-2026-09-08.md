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

Pending. The claim is based on source evidence, not a rendered reproduction.
