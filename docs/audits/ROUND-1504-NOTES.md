# Round 1504: Soccer Career's summer cards go live

Branch r1504-soccer-deck-live, base release-bi-gate at 8293c758. Round 1334 built the deck dark (see
ROUND-1334-NOTES.md); this round deals it. What changed against that dark round, for a cold reader:

- The page loads the deck. `src/pages/SoccerCareer.tsx` calls `loadSoccerDeck()` (src/lib/soccerDeckGate.ts) as soon
  as a live career is on screen, so ROUND-1334-NOTES.md's "nothing calls loadSoccerDeck" and "on this round's build no
  deck card can be dealt" are no longer true. The page is the one caller (simSoccerDeck section 10).
- Nothing waits at a season end: a deal made before the chunk lands has no deck card that summer. Only the press on a
  deck card already on screen waits for the chunk, at most DECK_WAIT_MS (8 s, set from the walk's throttled reading).
- Training is never free (the lead's ruling 3 on Round 1334): each of the 20 training options trains one skill +1 and
  takes one from another skill of the same group next season. soccerDeckProblems refuses an option whose skill costs
  differ from what it trains (since the review of 2026-10-17), so a pack with free training deals nothing; simSoccerDeck
  section 1 holds it with the onefree control. Section 8's legacy band (1.2) alone does not separate the costed pack
  from a free one on the paired fleet (the free pack reads BEST +1.13, WORST +1.17); the bind rule is what holds the
  cost. So ROUND-1334-NOTES.md's "training still moves legacy +1.66" describes Round 1334's free pack; the costed
  pack reads BEST -0.38, WORST -0.42, NEUTRAL 0.00 (rc r1504-s1).
- A deck card's toast prints the season log line of what landed, never the button's promise; with no line (the
  option that moves nothing, or a card the engine skipped) it says "Nothing changes".

## The rollback plan (the lead's ruling 2 on Round 1334)

- If the site is rolled back to a build without this round (Release BI's dark build or older): a save holding a
  pending deck card loads unchanged; its press goes through the old page, Round 667's skip drops the card (its stamp
  handed back) and the old toast prints the card's saved words (for example "Shooting next season +1, Dribbling next
  season -1") although nothing lands. That happens once per save that had a deck card on screen at the rollback: one
  card, one summer, no other harm. Boosts already queued by answered cards stay, and the deck's stamps (ids 700 to
  999) sit unused in eventLastFired.
- On this build, if the chunk cannot be had: a deal before it lands has no deck card (the walk's fasttap case); a
  pending deck card's press waits up to DECK_WAIT_MS, then says "Still loading. Tap again in a moment." or "This card
  could not load. Tap again to retry." and the card stays (late and noreload cases). The next tap after a failed load
  reloads the page when it can (online, saves settled), and the save brings the card back; offline it tries the
  import again and says so again (noreload case, both taps). A fresh tab whose chunk fails reloads once by
  freshBuild's stale chunk rule and comes back on its card with its save (reload case). If the career changes while a
  press waits (a session banked at the training ground), the answer lands on the career on screen while that card is
  still first there. Nothing ever toasts an effect that did not land.

## Where the proof lives

- scripts/simSoccerDeck.mjs (sections 1 to 10 and 19 controls), scripts/simEventDeck.mjs (the kit; reach as a fleet
  statistic), src/lib/soccerDeck.test.ts, and the browser walk scripts/playSoccerDeck.mjs at 390 and 1280 (cases deal,
  fasttap, answer, delayed, late, noreload, reload, ceiling, help). The walk's delayed case presses the other option
  second, so it goes red if the page's second press guard is removed.
