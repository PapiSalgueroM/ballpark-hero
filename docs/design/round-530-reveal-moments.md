# Round 530 design contract: animation across every sim, the reveal moments

Written 2026-09-11 by the desktop lane. His words (2026-08-28): "More animation across every
sim: reveals, draft nights, celebrations. Reading text is not a game feel." And 2026-09-11: "i
also want animations and a lot of work done". The inventory behind this is
`docs/audits/animation-inventory-2026-09-11.md`: every announced moment in every sim, with the
ones already animated marked so nobody rebuilds them.

## The rule set every builder follows

- The shared kit is `src/components/club-manager/Celebration.tsx`: ConfettiBurst,
  CelebrationStyles, and the classes cm-rise, cm-slam, cm-win-pulse, cm-loss-shake, cm-gold-glow,
  cm-tick-in. Use it. Do not write a second confetti or a second keyframe set for the same
  effect. Round 530 adds one helper to it, `revealDelay(i, start?, step?)`, returning the
  animation delay string for the i-th line of a staggered list (default start 0.6s, step 0.22s,
  the Round 186 timings), so every feed and bullet list on the site ticks at the same pace.
- Animate the ARRIVAL of a fact, never a number through values that were never true (Round
  147). `CountUp` is removed from the site in this round and every call site prints the final
  value.
- Reduced motion lands content on its final frame (the DraftNightCard rule). Decoration may
  hide. Every `<style>` block with a keyframe in a touched file carries a prefers-reduced-motion
  rule; the two files that loop forever without one (StadiumTycoon, WonderkidFactory) get one.
- Pure presentation over engine values. A reveal component takes the facts the engine already
  produced; it never chooses or computes a fact.
- A staggered list re-animates when its content changes (key the list on the week or season, so
  React remounts the rows), and never on an unrelated re-render.
- The no scroll rule: a reveal never moves the page. Mount inside the existing reveal refs.
- Site copy stays casual. No em dashes anywhere. No rival names.

## The moments this round animates, by builder

1. **Front offices** (`src/components/front-office/FrontOfficeBoard.tsx`, the NBA, MLB and NHL
   boards, `front-office-shared/GmPressCard.tsx`, `front-office-shared/DraftNightCard.tsx`):
   the weekly news feed ticks in line by line (injury, trade, retirement, free agency, player
   development, the new mandate); a completed trade or a signed free agent slams in at the top of
   the feed; the press card's content rises. And the named gap from Round 519: the FINAL pick of a
   draft is narrated. The draft screen is held after the last pick until the DraftNightCard has
   finished, with a Continue button to the hub, on all four boards.
2. **US careers** (the four `*MyCareerBoard.tsx` files and `src/components/us-career/*`): draft
   day becomes a reveal card ("With pick N, the Titans select you" slams in, the two lines tick
   in after it) built as a new shared `us-career/DraftDayCard.tsx` over the values the boards
   already put in the feed; retirement: the verdict slams, the bullets tick, the badges rise, the
   legacy score prints its final value; ExtensionCard and FreeAgencyPanel rise in; TrophyCase rows
   tick; RivalryEventCard slams; the coach's season result becomes lines that tick in.
3. **Dynasties** (`src/components/cfb-dynasty/CfbDynastyBoard.tsx`,
   `src/components/cbb-dynasty/CbbDynastyBoard.tsx`): the champion line slams, the title game and
   bracket lines tick in, confetti when it is your title, the Heisman and player of the year lines
   land after the champion, the weekly result feed ticks, a recruit signing slams.
4. **Club Manager** (`src/pages/ClubManager.tsx`, `src/components/club-manager/MatchReportCard.tsx`,
   `XpScreen.tsx`): the season end children block ticks in line by line (champions, trophies,
   golden boot, player of the season, Ballon d'Or, UCL qualification, objectives, transfer
   business), the sacked screen shakes, job offer cards rise, the match report's injury, card and
   sub chips tick in, and a skill point earned slams on the XP screen.
5. **Soccer Career** (`src/pages/SoccerCareer.tsx`, read in slices): the Ballon d'Or nominee
   countdown ticks in from tenth to first with the winner's headline landing last, the retirement
   stat grid ticks in and the legacy score prints its final value, the manager's season result
   rows tick in, the newspaper headlines stagger, the injury line shakes, and a transfer or
   contract signed gets a slam card under the toast (the toast stays).
6. **Rebuild and the idle games** (`src/components/rebuild/RebuildBoard.tsx`,
   `src/pages/IdleArena.tsx`, `src/pages/StadiumTycoon.tsx`, `src/pages/WonderkidFactory.tsx`):
   Rebuild's final grade slams and the before and after ratings rise; Idle Arena's trophy lift
   gets a confetti card naming the trophies lifted and a badge earned slams in; Stadium Tycoon's
   division promotion gets a card and its styles get the reduced motion rule; Wonderkid's region
   move gets the same treatment.

Not in this round: the Imperialism champion card and round recap (Round 529 owns those files).

## The harness

`scripts/simRevealMoments.mjs`:

1. Source level. `CountUp` has no importer in `src` (a ratchet at zero). Every file touched by
   this round that carries a keyframe carries a prefers-reduced-motion rule. Comments stripped
   before matching.
2. Render level, react-dom/server inside a MemoryRouter, over fixtures: for each new or changed
   reveal card (DraftDayCard, the dynasty recap, the retirement card, the front office feed, the
   Club Manager season end block, the Ballon d'Or countdown), every fact in the fixture appears in
   the markup, every number printed equals the fixture's number, and the staggered elements
   carry strictly increasing animation delays in engine order.
3. Behaviour, a vitest test beside `FrontOfficeSeasonClose.test.tsx`: after the final pick of a
   draft on each of the four boards, the DraftNightCard is in the document and the hub is not
   until Continue is pressed.

Controls, each refusing to run if its rewrite changed nothing: `REVEAL_CONTROL=countup` (a
CountUp import put back into one board, section 1 must go red), `REVEAL_CONTROL=motion` (the
reduced motion rule stripped from one touched file, section 1 must go red),
`REVEAL_CONTROL=nostagger` (every delay in one list set equal, section 2 must go red).

Browser: `scripts/playReducedMotion.mjs` already walks routes with the setting on; the touched
routes are added to its list. `playGames` at 390 wide over every touched route, 0 findings.
