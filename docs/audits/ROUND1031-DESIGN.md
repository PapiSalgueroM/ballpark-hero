# Round 1031: career entry guides and main controls

## Player outcome

NBA, NFL, MLB and NHL My Career open their existing instructions, rules and
worked examples on the first visit once real guide content loads. The existing
asynchronous guide loader remains in place; this round adds no board-loading
gate. Returning visitors keep a closed, reopenable How to play button.

The help target is at least 44 by 44 pixels. Main Play and season-reveal Continue
have a 44px minimum height for both prospect careers and older saved careers.
Guide additions explain Career Log's saved-year review, missing older values,
retirement review, and the ordinary decision result's actual changes. The worked
example uses existing engine behavior: Health 98 plus a recovery gain of 10 caps
at 100, so the result shows +2 and Continue does not apply it again.

## State boundary

GameHelp gains an opt-in firstVisit prop, used only by the four page wrappers.
Other games keep their existing manual help behavior and trigger sizing.
The browser flag is rules-gate-seen:/nba-my-career, /nfl-my-career,
/mlb-my-career or /nhl-my-career, with the full rules-gate-seen: prefix on each
route and value 1. No version or career-save field is added.

Only dismissal of a loaded, open guide records the flag. Mounting, pending or
empty content, cancelled route loads and prerender do not record it. A failed
storage read opens the guide; a failed write still permits closing and reopening.
If the browser cannot remember dismissal, a later visit can open the guide again.
The existing dialog retains its controls, keyboard behavior and trigger focus.

Career engines, saved career bytes, random draws, season progression, scores and
completion calls are outside this change. No new sports data is introduced.

## Verification contract

The focused mounted suite has eight intended outcomes and eighteen copied-source
controls. Every mutant must change an exact executable anchor, reject its named
assertion and retain an independent baseline. Import, query, timeout and runtime
failures do not earn control credit. Normal and control modes are all attempted.

Native verification covers four sports at 320 by 780 and 390 by 844 touch, plus
1280 by 720 mouse and keyboard. It checks first and returning visits, reopening,
exact career state preservation, real fonts and themes, reduced motion, visible
guide context, and the main 44px controls. Three changed-and-restored DOM controls
exercise target sizing, clipping and horizontal overflow. New guide tests do not
preseed the seen flag.

The five older round-specific career drivers and seven standalone career drivers
seed only their active US Career route to model a returning visitor. Soccer and
unrelated first-visit tests remain unchanged. The historical board projection
removes only the two new min-h-11 sizing classes from main Play and season Continue.
Its fixture JSON, save comparisons, random-draw checks and rejection controls stay
unchanged. The fixture SHA256 remains
377535A181DA7F03B301F04F039E34E1E863E1F8B9E851F9599B640966A9E5F6.

The dedicated remote workflow uses Ubuntu, Node 24 and Python 3.12, runs the real
app type gate and build, generates only the four career snapshots, regenerates
the sitemap and ledger, preserves those candidate files, then rebuilds. It runs
the focused controls, all established built readers, guide and harness-anchor
checks, and native verification. Evidence uploads on every outcome for one day
under career-entry-guide-artifacts. Candidate generation is temporary CI work;
accepted generated files still require release integration.

## Status

Source is prepared for remote verification. No local build, test, browser,
installation or database probe was run for this implementation. Round 1009 is
awaiting its repair run; no 1031 acceptance, integration or publication is claimed.
Root owns Git, remote acceptance, generated-file integration and publication.
