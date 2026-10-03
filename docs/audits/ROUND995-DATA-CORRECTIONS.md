# Footle clue corrections, 2026-10-03

This audit covers specific comparison defects. It is not a claim that every live
player row or statistic has been verified. No live database query or write was
performed for this audit.

## Guinea-Bissau

The existing `continentMap` places Guinea-Bissau in Europe. Both independent
primary sources below identify it as African, checked on 2026-10-03:

- [UNGEGN country details](https://ungegn.un.org/dashboard/countries/details?id=624):
  M49 code 624, continent Africa, region Western Africa.
- [World Bank country metadata](https://databank.worldbank.org/metadataglossary/ida-results-measurement-system,-tier-i-database-%E2%80%93-wdi/country/GNB):
  Republic of Guinea-Bissau, region Sub-Saharan Africa.

The regression must compare a Guinea-Bissau guess against both an African and
a European target. Reinstating the old map value must reject those outcomes.

## Unknown leagues

`Other` is the existing fallback when a club's league is not mapped. Equality
between two fallback strings cannot establish that two different clubs share a
league. An exact club match remains known. A comparison with an unknown league
must not invent a same-league relationship. Tests must cover one unknown, both
unknown, known same league, known different leagues and an exact club match.

## Worked example and player pool

The old help example pairs Wirtz with Leverkusen while the bundled player pool
pairs him with Liverpool. The correction should derive the worked example from
the loaded puzzle data instead of introducing another hand-maintained club fact.
That removes the internal contradiction; it does not certify the pool's contents.

The initial Unlimited target was selected from bundled fallback players before
the loaded pool resolved. New puzzles should wait for pool resolution, including
the existing fallback on a failed request. A practice run should then keep its
chosen data snapshot so later refreshes cannot change a puzzle already in play.

## Missing scoring statistics

Both famous and obscure mapping loops currently turn nullable goals and assists
into numeric zeroes. This is a source-level defect: a null fixture establishes it
without a database probe. The presence or frequency of affected live rows is
unverified. A real zero must remain distinct from an unknown value. Any repair
must retain a neutral unknown comparison with no higher/lower arrow, and prove
that known zero still participates in an ordinary numerical comparison.

These statistics are snapshots. UI copy should not describe them as live totals
or assign a season that the underlying row does not establish.

## Acceptance

Implementation, effective negative controls and native evidence are pending.
Record the exact accepted commit and workflow before marking this round done.
