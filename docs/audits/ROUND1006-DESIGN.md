# Round 1006: Footle Unlimited sessions

Objective: keep playing fresh Footle puzzles and return to an unfinished one.

The existing Unlimited mode can select the same answer again immediately and
loses its current guesses on reload. Keep eight guesses, the existing tier
choices and full guessable player pool. Use the accepted player records only.

Each tier keeps a current puzzle, its frozen clue pool and normalized identities
already drawn. Next puzzle draws an unseen answer from that tier, excluding
today's Daily identity. An exhausted deck offers an explicit reshuffle. No
automatic repeat or new factual data is needed. Changing tiers preserves each
unfinished puzzle. Reload restores the last active Unlimited session.

An old saved answer that becomes today's unsolved Daily is paused without
revealing its name, clues or result. The save stays intact. A player may play
another tier or finish Daily first. An empty tier states that it is unavailable.

The interface shows Puzzle N, finished count and a clear Next puzzle or
Reshuffle deck action. Controls remain at least 44px, feedback uses the existing
reveal behavior and reduced motion is respected. Reopenable help explains the
saved decks and why Unlimited does not award Daily leaderboard points.

Storage is separate: footle-unlimited-session-v1. Daily and five-puzzle-run
formats do not change. Validate unknown saves before loading them; failed
persistence leaves the current puzzle playable with an honest warning.

Verification is remote only. Mounted tests cover freshness through exhaustion,
normalized duplicates, frozen clues after pool changes, exact reload, repeated
inputs, tier/mode isolation, give-up, paused Daily collision and failed storage.
Copied-source controls must fail their intended assertion while an independent
old-mode baseline passes. Native phone and desktop proof covers the actual page,
readable names, reachable controls, reload and zero Unlimited completion writes.
Existing 995, 1001, Daily, currency and search coverage remains load-bearing.

Claude's Transfer Path, career and Front Office lanes are separate. No database
changes, paid actions, AdSense or indexing submissions are part of this round.
