# Round998: Rugby League challenge

## Design contract

Judge ten rugby league claims, then see how you did on premierships and Dally M
awards. This is a focused mode inside Champ or Not, using its existing records
and truth builder. It adds sport-specific play without another duplicate route.

Each run alternates five premiership claims and five medal claims. No category
and year pair repeats within a run. A player chooses Champ or Not, reads the
actual winner or shared winners, then explicitly advances. Results show the
earned total out of ten and each category out of five. Another ten starts a fresh
run. This mode has no ranked score, completion reward or durable save.

Worked instructions use a loaded record and appear before play. Help remains
reopenable. A compact ten-step progress row, readable claim card and large paired
answer controls keep the game usable on a phone. Focus changes use preventScroll.
Keep the original Daily and Unlimited hook mounted, preserve pending reveals and
saved answers, and retain rugby progress when switching modes within the page.

Both rugby banks must be usable. Missing or thin records produce a retry state,
never fabricated claims. Eligible history ends at 2025. The existing shared
scheduler also needs a bounded single-bank path: its retry loop otherwise waits
forever for a different competition when only one bank loads.

## Data boundary and sources

Production reads only the existing nrl_premiers and nrl_dally_m tables through
the existing competition loader. This round makes no production data changes or
database probes. QA uses a representative historical fixture, not a claimed
mirror or completeness audit of either production table.

The 13 premiership fixture rows cover 1997 through 2010, retaining both 1997
premiers and omitting the vacant 2007 and 2009 titles. Names and rows were copied
from the accepted migration 20260820_create_nrl_premiers.sql. The winners were
cross-checked on 2026-10-03 against the [official NRL roll](https://www.nrl.com/operations/the-game/premiership-winners/)
and [Topend Sports history](https://www.topendsports.com/sport/league/competition-nrl.htm).
The fixture keeps the migration's canonical club names where the official roll
uses abbreviated names. No scores, attendance or minor-premiership facts enter
the fixture.

The 11 medal fixture rows cover 2008 through 2016, including both winners in
2014 and 2016. Each year/name pair was checked on 2026-10-03 against the
[official NRL medal roll](https://www.nrl.com/hall-of-fame/dally-m-awards/winners-list/)
and [Rugby League Project award history](https://www.rugbyleagueproject.org/awards/dally-m-player-of-the-year).
Both sources also mark 1997 and 2003 as unawarded or cancelled. They are absent
from the fixture and must never become invented questions.

## Verification contract

- Model outcomes: ten distinct category/year pairs, five per category,
  alternating categories, actual truth against all co-winners, bounded handling
  of missing or thin banks, and unchanged ordinary Daily generation.
- Mounted outcomes: explicit reveals, accurate mixed results, duplicate-action
  protection, replay, help, mode retention, and exact Daily save preservation.
- Executable mutations must change one intended target and fail named outcomes
  while independent baselines pass. Timeout or import failure earns no credit.
- Existing Champ or Not reveal regression, actual app type gate, production
  build and all 17 built-output readers.
- Native 320/390/1440 layouts, touch, keyboard, reduced motion and light theme;
  screenshot review, no horizontal overflow, no page errors, and no extra score
  writes or protected-storage changes.

All runtime verification is remote. No local builds, tests, browser processes
or package installs are part of this round. No indexing submissions or AdSense
work is included.

## Status

Implementation is in PR113 on codex/rugby-league-challenge-998. No live
publication is claimed. Round997 is accepted but remains unpublished while the
Lovable editor cannot initialize its publishing controls.

The first remote run, 37122050532 at 944f7c3d, passed the real type/build gates,
15 normal cases, all 16 executable controls, both original compatibility gates,
all 17 built readers and five native profiles. Each control produced exactly
one intended assertion failure and two independent legacy passes. Representative
offline data is the coverage boundary, not production database completeness.

Visual review rejected the first layout despite those green gates. At 320px,
intro scrolling hid the instructions and worked example above Start. Answer
scrolling also hid the original claim above the receipt. The native checks had
measured actions and width without requiring that context to remain visible.
The repair compacts the active header and targets complete content blocks.
New native assertions require the example with Start, and the claim with its
receipt and Next, to remain readable together. Native scroll controls reproduce
the old loss of context, require the new assertions to reject it, then restore
the viewport and require the positive checks again. These are geometry controls,
separate from the 16 copied-source gameplay controls.

First-run artifact11274095985 has SHA256
3a734a715b83bc314f1fca3b7163b1c017023097a9230f9b852b7d0f94695a8c.
