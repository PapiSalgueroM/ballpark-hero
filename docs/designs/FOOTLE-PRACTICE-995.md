# Footle five-puzzle run, Round 995

Guess five different players in eight tries each, then see how many you solved.
This extends Footle using its existing board and comparison engine. Daily and
Unlimited remain available; the run gives practice a finish and a useful receipt.

- Entry: Five-puzzle run mode, plus Play five more on the completed daily.
- Choose Easy, Hard or Insane before starting. Five distinct targets must match
  that tier and exclude the daily answer selected when the run starts. If fewer
  than five eligible players exist, explain and leave Start run disabled.
- Each guess provides the existing eight clues. Solving, eight misses or Give up
  ends one puzzle. Next puzzle advances exactly once; finishing five shows solved
  count, total submitted guesses and all five answer cards. No sitewide score is
  awarded. Existing daily scoring, completion calls and daily saves stay intact.
- Save key: footle-practice-run-v1. Save the selected tier, five target names,
  current index, five guess/status records and the complete guessable pool snapshot.
  Save synchronously after actions. Restore only structurally and semantically
  valid saves. Switching modes keeps progress; reload resumes the active run.
  A storage failure is visible and does not claim progress was saved.
- First Unlimited and new run targets wait for the pool fetch to settle. A failed
  fetch uses the already shipped fallback. No new facts, DB writes or probes.
- Help is available before starting and through the existing question button.
  A worked example uses a loaded non-answer player, with hypothetical numbers
  explicitly labelled. Stats and values are described as puzzle snapshots, not
  live totals. Missing goals/assists remain null and compare as unknown, while
  measured zero stays zero. No daily pool membership or source rows change.
- Controls are at least 44px, support keyboard/touch and use preventScroll for
  focus restoration. Compact progress and answer tiles replace long stacked copy.
- No shared ResultScreen changes, new route, branded assets or player likenesses.

## Correctness and sources

Different clubs with either league unknown receive the existing unknown status,
not a claim that their leagues match or differ. Exact club matches remain green.
The hardcoded Wirtz example is replaced with loaded-pool examples.

Guinea-Bissau is Africa. Parent independently verified both primary sources on
2026-10-03 before authorizing this correction:

- https://ungegn.un.org/dashboard/countries/details?id=624
  (Continent 1: Africa; Region 5: Western Africa).
- https://databank.worldbank.org/metadataglossary/ida-results-measurement-system,-tier-i-database-%E2%80%93-wdi/country/GNB
  (Region: Sub-Saharan Africa).

## Verification contract

Mounted real-hook/page tests must finish five puzzles with wins and misses, prove
exact receipt counts, distinct tier-correct targets, daily exclusion, double-input
guards, same snapshot after reload and pool changes, invalid-save recovery, and
unchanged daily bytes/completion. Separate comparisons cover known/unknown leagues
and Guinea-Bissau. Effective source controls must break the corresponding outcomes
while unrelated outcomes still pass. Native built-app runs cover 320/390 touch and
1440 keyboard, real search, Give up, reload, finished receipt, focus/scroll and
horizontal overflow. CI owns execution; no local heavy jobs under memory pressure.
