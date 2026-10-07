# Round1077: explore the leagues in your save

Club Manager's World Tables replaces its tiny horizontal league strip with
a compact browser. Search accepts league, country or club names, ignores
case and accents, and groups matching leagues by country. Each tile names
the league and its actual club count. A clear empty state offers a search reset.

Selecting a league returns to its existing table. Back or Escape cancels the
search and returns focus to Browse leagues. My league returns directly to the
managed club's table. The league browser occupies the table's space, with an
internally scrolling result list, instead of stacking a long list above it.

The list still comes from worldLeagueDefs(career). Historical starts, edited
memberships, saved standings, round numbers, tiebreak explanations and club
scouting retain their current sources and behavior. There are no new clubs,
player facts, simulation rules or save fields in this change.

## Accepted preparation, 2026-10-07

[Remote run37591285476](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37591285476),
job112693122221, completed successfully. Reviewed source:
`cd20f6bc7d4a8c269483ad56b31b239b13efcf86`; tree:
`5e9d62c42ade6c8dbf9c9f820b64c4e11083eeca`.

[Artifact11469347184](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37591285476/artifacts/11469347184)
is `manager-world-browser-37591285476-1`. The downloaded ZIP matches GitHub's
SHA256 `3f0165629783348e296ce4c60b6fbcd3175175e3c5fd23b40af9a0a484a2255e`.
Retained locally under
`C:/Users/antho/.codex/artifact-inspection/manager-world-browser-37591285476-1`.
The artifact's source head and tree match the reviewed checkout.

- App type check and build passed.
- All13 mounted outcomes passed with no normal skips. They cover the current
  world, four historical starts, actual edited and custom clubs, saved changed
  memberships, search, selection/focus, exact tables and scouting. The existing
  search case also proves lowercase Italy and Inter queries under a controlled
  Turkish default locale. Broad searches retain every matching league.
- All16 copied faults changed an exact executable anchor and failed their
  mapped assertion. Each run passed the named independent engine/table baseline
  and intentionally skipped11 unrelated outcomes. Retained changed source,
  mutation hashes and reports were inspected. All17 mounted source holds pass.
- Native Chromium passed320x780 dark touch/reduced motion,390x844 light touch,
  and1280x720 light keyboard profiles. All9 DOM faults changed measured text or layout,
  were rejected and restored. The18 displayed-table comparisons use actual
  engine rows, goals, rounds and tiebreak footnotes. Trusted input, focus/scroll,
  scouting, modern/edited/historical transitions and save isolation pass.
- All9 screenshots were inspected. The league browser fits each viewport,
  uses an internally scrolling list, has at least44px controls and12px text,
  and has no horizontal overflow. Actual template fonts and flags are retained.
  Existing LeagueTableCard typography is unchanged.
- Native reports contain zero page errors, gameplay storage writes or forwarded
  writes. Each profile retains and verifies the auth client's one temporary
  startup storage write/remove pair. The final storage remains the seeded theme.
  All10 native source hashes and all7 mounted hashes match reviewed local files
  after CRLF normalization; before/after source holds are unchanged.
- simWorld, simEraWorldTables, simClubManagerEraMidSeason and simWorldEditor pass.
  All20 closing readers pass: simAdsense, simBrand, simHeadTags, simHiddenPages,
  simHubs, simIndexNow, simIndexing, simInternalLinks, simNoRivalNames,
  simPrerender, simPrerenderBoot, simRetiredRoutes, simSchema, simSitemap,
  simSnapshotAssets, simSiteSearch, simGuideHeadings, simSeoMetaSplit,
  simHomeCopy and simHarnessAnchors. The engine/table/data hold against
  base2fff5e044160b70bd58b64d931793ee4e443cedd passes.

## Scope and next gate

This is accepted preparation for the actual component in an offline QA fixture,
not full-app integration, a final PR run, a merge or a live-site check. Public
snapshots, search payloads and production data were not regenerated or changed.
All application execution was remote; local work was static source/artifact
inspection. Chromium coverage does not claim other browser engines or devices.

The closing commit changes only this receipt, PROJECT-STATE, WORKBOARD and the
workflow triggers. Product/native source remains at cd20f6bc. The temporary push
trigger is removed; manual dispatch and the existing path-scoped PR triggers
remain. Root owns the final PR/checks and external handoff. Claude retains1040
league/roster work,1045 season architecture, integration and publication.
