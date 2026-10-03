# Footle clue corrections, 2026-10-03

This audit covers specific comparison defects. It is not a claim that every live
player row or statistic has been verified. No live database query or write was
performed for this audit.

## Guinea-Bissau

The previous `continentMap` placed Guinea-Bissau in Europe. Both independent
primary sources below identify it as African, checked on 2026-10-03:

- [UNGEGN country details](https://ungegn.un.org/dashboard/countries/details?id=624):
  M49 code 624, continent Africa, region Western Africa.
- [World Bank country metadata](https://databank.worldbank.org/metadataglossary/ida-results-measurement-system,-tier-i-database-%E2%80%93-wdi/country/GNB):
  Republic of Guinea-Bissau, region Sub-Saharan Africa.

The corrected map places it in Africa. The regression compares a Guinea-Bissau
guess against both African and European targets. Reinstating the old map value
rejects those outcomes.

## Unknown leagues

`Other` is the existing fallback when a club's league is not mapped. Equality
between two fallback strings cannot establish that two different clubs share a
league. An exact club match remains known. Unknown leagues now produce a neutral
unknown clue. Tests cover one unknown, both unknown, known same league, known
different leagues and an exact club match.

## Worked example and player pool

The old help example pairs Wirtz with Leverkusen while the bundled player pool
pairs him with Liverpool. The corrected worked example derives from the loaded
puzzle data instead of introducing another hand-maintained club fact.
That removes the internal contradiction; it does not certify the pool's contents.

The initial Unlimited target was selected from bundled fallback players before
the loaded pool resolved. New puzzles now wait for pool resolution, including
the existing fallback on a failed request. Practice runs keep their chosen data
snapshot so later refreshes cannot change a puzzle already in play.

## Missing scoring statistics

Both famous and obscure mapping loops previously turned nullable goals and
assists into numeric zeroes. Both now preserve null. Fixtures establish the
repair without a database probe; the presence or frequency of affected live
rows remains unverified. Unknown values produce neutral comparisons with no
higher/lower arrow. Tests prove known zero still participates in an ordinary
numerical comparison.

These statistics are snapshots. The UI labels them that way and does not assign
a season that the underlying row does not establish.

## Acceptance

Accepted through PR110, merged as `ed85d5cc`, on 2026-10-03. Exact PR head
`f7e89608ec089d02bd4662436ef7b0caefda3230` passed
[CI37112042254](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37112042254).
The tested merge includes main `bab172a3`, including the accepted four-career
prospect integration. Real types/build, 25 normal cases and 25 effective
controls, 35 existing tests, five offline families, all 17 built readers and
complete native runs at 320px, 390px and 1440px passed. Native play verifies
reloads, Daily/Unlimited isolation, unknown clues, difficulty, keyboard/touch,
reduced motion and visible next actions. Screenshots were reviewed.

The 28 behavior modes executed 282 cases: 244 passes, exactly 38 intended
assertion rejections and zero unexpected problems. The three native runs
completed 15 puzzles and 36 practice guesses, with zero score writes, overflow
or native failures. Both stored Daily bytes and played Unlimited clues/tier
remained unchanged. Every Next action was visible before driver scrolling.

Artifact `11270118917` has verified SHA256
`87cc9c396b832eeb149f92db2fe6c535eae651619f106db72e046bc33e42e981`.
Full evidence is retained at
`C:/Users/antho/AppData/Local/Temp/dukb-footle995-ci-2026-10-03/f7e89608/`.
The sibling `f7e89608-accepted-summary.md` records all gate names and limits.

This is scoped Footle verification. No claim is made about every live player row
or the full repository suite. Production publication remains separate.
