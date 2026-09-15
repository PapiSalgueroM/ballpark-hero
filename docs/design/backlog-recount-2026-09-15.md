# Backlog recount, 2026-09-15

The owner asked how far into the master list the build is and how much is left. This replaces
the 2026-09-07 figures in `docs/PROJECT-STATE.md` ("Reconciled size of the full backlog") once
merged there. Method: two read-only counters reproduced the 2026-09-07 audit (a Codex session of
that day, anchored at Round 502, commit 8edc2896) and moved an item only for a round that is an
ancestor of origin/main AND recorded live; a verifier spot checked the moves and the items still
open and corrected the counts. origin/main was 6c4dd400; the newest live round was 584.

## The owner's original tweak list (198 atomic requests)

| | 2026-09-07 | 2026-09-15 |
|---|---|---|
| Complete | 88 | 111 |
| Partial | 51 | 49 |
| Open | 59 | 38 |
| Done, half credit for partial | 57.3% | **68.4%** |
| Done, strictly | 44.4% | 56.1% |

Corrections the verifier made: Manager XP (Round 513) is partial, not complete, because the
owner asked for a web style skill tree with pricier tiers and bigger rewards and the code has
seven linear tracks. Flagged, not counted: the Round 514 display currency swaps the symbol and
never converts, so a non euro choice shows euro amounts with the wrong sign. Caveat: the 44
clause career and GM part of the original audit was only recoverable in encrypted form and was
rebuilt from `docs/TWEAKS-2026-08-28.md` against the baseline code, so it may differ by an item
or two. Rounds 585, 600 to 602 and 610 are not live and move at most one item.

## The master build spec (358 sections, 43 constrained by standing law, 315 actionable)

| | 2026-09-07 | 2026-09-15 |
|---|---|---|
| Complete | 32 | 33 |
| Partial | 214 | 223 |
| Open | 69 | 59 |
| Constrained | 43 | 43 |
| Done, half credit over 315 | 44.1% | **45.9%** |
| Done, strictly | 10.2% | 10.5% |

The plaintext section lists behind the 2026-09-07 audit exist in that Codex session and sum to
34, 216, 65 and 43; the recorded 32, 214 and 69 came from an earlier revision. Rebased on the
plaintext ledger the 2026-09-15 figure would be 46.8%.

## What is left, in big chunks, with rough round counts

1. Club Manager's world and people: more leagues and eras, a world editor and god mode, the 36
   club Champions League league phase with real Europa and Conference League places, more manager
   nationalities and styles, real managers, staff contracts, red card appeals, a media and
   conversation loop, and the skill trees as a real web. 10 to 14 rounds.
2. Online play for Club Manager rooms, Rebuild, Search and Discard and Sports Bingo. Needs a
   backend decision and a design doc first. 6 or more rounds.
3. College football and GM depth: rallies, strength of schedule, TV rights, GPA quotas, a real
   AP poll, broadcast desks, coach hiring, free agency pulls, player meetings. 6 to 8 rounds.
4. The NFL, NBA, MLB and NHL careers catching up to Soccer Career, plus college into pro. About 3.
5. Stadium Tycoon: packs and gems (Round 585) then Rounds 586 to 589. About 5.
6. Trustworthy points and profiles: scores checked on the server, and the owner's decision on the
   19,857 lost points. About 2 plus that decision.
7. The platform long tail of the master plan: friends and social, notifications, seasons, a Hall
   of Fame, Ball IQ, WNBA, the new game ideas and the arcade family. 50 or more rounds.

Never finished by nature: AdSense approval, Google indexing, data accuracy, new puzzles.
