# Deadline Day, design contract (Round 721)

Route `/deadline-day`. Master spec item "New game idea: Deadline Day". Written
before the screen was built, against the engine frame already in
`src/lib/deadlineDay.ts`.

## Gate questions

- **Is it different from what exists?** Yes. Club Manager's transfer desk
  (Rounds 466 and 506) is one negotiation at a time inside a season, with no
  clock beyond match weeks and no grade for the window as a whole. Contract
  Chaos is the agent's side with generated players. Budget Builder picks an XI
  under a budget with no negotiation at all. Nothing on the site is a timed day
  of several deals at once, judged on how well the money was spent.
- **Can an existing engine power it?** Entirely. The club, squad, XI, market,
  asks, patience, closeness meter, valuation desk, rival hijack, terms table,
  signing and sale are Club Manager's (`clubManager.ts`, `clubManagerDeals.ts`)
  imported unchanged. The seeded stream, the registration guard and the club
  pool are Manager Hot Seat's (`withSeed`, `onStaticWorld`, `hotSeatPool`).
  The frame adds only the brief, the clock, the rivals' hour and the grade.
- **Reason to come back?** A different real club every day for everybody, and
  free play at any club. The grade is a number people compare.

## Objective (ten seconds)

Fill the board's three or four needs before the window shuts at 11pm, and do
not overpay doing it.

## Core loop

Each turn you pick one deal and push it: a bid at the fee table, an offer of
personal terms, or a sale of a bench player to raise money. Each of those costs
one hour of twelve. Phoning a club to open talks and walking away cost nothing.
Decision N differs from N minus 1 because the seller's ask has moved, his
patience has dropped, a rival may have come in for a man you left alone (and
can close inside the hour), and there is one hour less. The tension is the
engine's own: pitch low and you need more hours, pay near the ask and you
close now.

## Controls, mobile first

- Overview: a clock and budget strip, the needs as chips, and the queue as
  small tiles (one per approach). Tap a tile to open that deal on its own
  panel with a back button (small tiles plus a back button, never one long
  stacked page). Sales and the ticker sit on the overview.
- Deal panel: their ask, patience dots, the rival line, the typed bid with the
  engine's closeness meter above it, quick buttons (haggle, meet the ask, beat
  the rival), walk away. At the terms table: what he is asking, length
  buttons, wage and bonus inputs and the terms meter.
- Every button 44px high. No hover only mechanic. Results land in view through
  `useRevealScroll`.

## Scoring

The grade is 0 to 100: needs filled 50, value for money 30 (full for a fee at
or under the player's real value, nothing at 1.5 times it, averaged over the
signings), budget left 20 (scaled by the share of needs filled, so a window
that signs nobody scores nothing). Letters at 90, 80, 65, 50 and 35.

The daily is comparable across players because it is the same club, the same
seed and the same dice for everybody on an Eastern day: the same bids on the
same man meet the same answers. Across days it is a different club, so the
number compares players, not days.

For now the play is recorded with no score (the Round 644 unscored row), like
Manager Hot Seat and Contract Chaos, while the points economy is rebuilt. The
cap row is written with a null ceiling and notes the engine ceiling of 100.

## Daily and unlimited

- Daily: `dailyDeadlineDay(date)` picks from Manager Hot Seat's pool, half a
  pool on from Hot Seat's own pick so the two dailies are not the same club on
  the same day, with a seed mixed from the date. One go per day; a refresh
  rebuilds the window from the seed and the stored actions.
- Free play: any club, a fresh random seed every time. Free play never sees
  the daily's seed, so it cannot leak the daily's dice.

## Help

Rules and a worked example in a `RulesGate` before play, reopenable from the
"?" button, plus the full guide under the game.

## Data

No new table and no new fact. Every player, club, rating, age, asking price
and real value is the Club Manager engine's baked data. Needs are derived
from the engine's own XI and the budget from what the approaches cost.
Partial clubs (`isPartialClub`, the `CM_PARTIAL` convention) are never offered
as sellers, generated players never appear, and a place the market cannot fill
is skipped rather than invented for.

## Harness, `scripts/simDeadlineDay.mjs`

- Strongest signal: two scripted managers on the same windows and the same
  dice, one pricing off the valuation desk and one paying the ask. The desk
  must grade higher, win most decided pairs and take more value points (bands
  from six streams in its header).
- Hard sections: unfinished deals collapse at the shut and are never charged;
  the daily is one window per date and a new one each day; a window replays
  from its actions; the budget never goes negative even for a reckless manager
  who never looks at it; Club Manager's module registrations survive a run.
- Winnable at all: section 1 holds that the budget covers the cheapest man for
  every need at his sticker, so every window can be completed, and that it
  does not cover the dearest man for every need, so it is a choice.
- Negative controls: blind, noclock, frozen, drift, overdraw and leak, each
  proven to turn its own section red.

## Legal lines

- No logos, crests, kits or photos. Names and factual numbers only.
- Voices are roles: the board, the selling club, his agent. Narration never
  quotes a real player and never gives one words or deeds he did not do.
  Rival clubs moving for a player are the game's simulation, said as such in
  the guide.
- No gambling mechanic: no packs, no wagers, no random rewards bought with
  anything.

## Registration checklist

Page `src/pages/DeadlineDay.tsx`, hook `src/hooks/useDeadlineDay.ts`, board
`src/components/deadline-day/DeadlineDayBoard.tsx`, lazy route in `App.tsx`,
GameDef under Soccer with `daily` and `addedOn`, SEO meta, guide in
`src/data/gameContent`, harness, search keywords regenerated, What's New
line, and the unapplied `game_score_caps` migration. The saved page, its
sitemap row and the `simIndexNow` floor are the lead's at release.
