# Round 1544: NBA My Career's national team, Part B1 (the call up beat, the result screen, the lazy load)

Branch r1544-nba-team-usa-screens. Rides one release with Rounds 1541 (Part A) and 1557 (Part B2: the Trophy
Case rows, the International view, the badges). The proofs, runner names and numbers are in the lead's kit,
dukb-handoff/2026-10-10/results-g/finish-1544.md; this file keeps what the code will not say by itself.

## What a player meets

After a season rated 87 or better (the lead's ruling L1), at 36 or younger, with health 50 or more, not
suspended and not ending his career, in an Olympic or World Cup summer, the season's curtain ends on "The US
national team wants you this summer. You decide next." The call card comes after the retirement talk and
before the summer's cards (which were dealt at the press and are never touched by the call). Go plays the
tournament on the career's own keyed stream and shows the result: the medal or place, the record, his numbers
a game, the hurt line, the field and format lines, and two tiles, Your games and The bracket, each a view with
Back (the bracket shows his group and his path first and opens other groups and rounds one at a time). Rest
writes the row and goes on. A reload mid beat asks again; a reload after it asks nothing.

## The lazy split (L5)

- src/lib/nbaCareerIntlGate.ts is the only static piece: the edition summers, the game's own cycles, the bar,
  the lift and knock numbers, the curtain line and the help's words. It is a second copy of what the ledger
  says about the calendar and the help's facts, fenced by scripts/simCareerIntl.mjs section 2 (every summer
  2004 to 2050, the cycles, the help's facts; control gateyear). A data round that edits the ledger's calendar
  (src/data/basketballIntl.ts) edits the gate in the same commit, or section 2 goes red.
- The binding's `intl` is now UsIntlLazy: `pendingYear` and `curtainLine` from the gate, and `load()`, a dynamic
  import of src/lib/nbaCareerIntl.ts (with the ledger and src/lib/careerIntl.ts, about 7.6K gzipped). Section 12
  reads the page's bundle graph and fails if any of the three, or either screen, turns static (control
  staticledger).
- Round 1557 (B2) must use the same face: the Trophy Case rows and the International view load through
  `sport.intl.load()` (or ride the result chunk), never a static import of nbaCareerIntl.ts, or the weight
  comes back and section 12 goes red.

## Words

"the USA" and "the US national team" only; nobody speaks. A drawn field says "This field is the game's own."
and a projected edition "Host and field are the game's own." (critic advice 15: nothing about the real world
that goes false on a date). A played summer says its groups and results are this career's own. The line "The
game plays its two group rounds as one, into a round of 16." shows only on a World Cup really played with two
group rounds (2019, 2023): no page read on 2026-10-22 holds the format of 2027 or 2031, and a projected World Cup
has none (the review of Round 1544). src/test/nbaIntlResultLines.test.tsx holds every one of these lines.

## Owed, not this round's

- The saved page public/nba-my-career/index.html and the lastmod ledger move at the release's build:seo (the
  SEO description of src/pages/NbaMyCareer.tsx changed, and the guide's two sentences): the lead's.
- A data round after the 2027 World Cup final (12 September 2027): BASKETBALL_LAST_PLAYED_SUMMER, the 2027 field
  and places, and the gate's copy if the calendar moves.
- Critic advice 23: a summer card that narrates a quiet summer at home can follow an Olympic summer; a later
  filter can read the summer's row.
- The /nba-my-career weight row and the /nfl-my-career budget (the shared board grew) are the lead's (L7).
  Measured with sweepWeight's method on runners: /nba-my-career 579.0K at BASE (32e8f7da with adb715be3, no
  1541) and 581.5K on this branch, +2.5K where L5 asked for about 0.5K (the route chunk +1.8K: the gate about
  0.5K and the help's words about 1.3K; the shared board chunk +0.7K); /nfl-my-career 493.5K to 494.1K against
  its 493K row, so sweepWeight is red there. A lazy help (a GameHelp change, outside this round) would take
  about 1.3K off /nba-my-career only; /nfl-my-career carries just the board's hunks and stays over 493 either
  way. The lead rules: raise the rows, or order the lazy help and still raise /nfl-my-career.
- From the review, left for Round 1557 or later: in a group or round list his own game reads "W 78-74 v Turkey"
  beside "Spain 104-62 Montenegro" (GameLine could draw his game the neutral way when `bare`); critic correction
  9's print line in each walk and test that plants a high NBA season; a retry in the holding box if the face's
  chunk fails twice; an old save already inside its summer cards meets the call once, after them.
- From the review, also left (the lead waives or names a round): the call has no arrival of its own after the
  season's curtain closes. intlCallYear joins the revealRef key at the press, in the same render as the curtain,
  so the curtain closing is no key change. The base's summer card does the same (measured on 33d435858), and a
  player who scrolls only as far as the button meets the call in view (7 of 7 runs); one who has scrolled far
  down first can land below its top. One key term, or a useRevealScroll in the beat, would fix the call and the
  summer card together, but it moves the board's scroll for every US career and needs a walk at 320, 390 and
  1280 to prove the page never jumps, and it adds bytes to the shared board (see the weight above).
- From the review, also left: section 8's first check of scripts/simCareerIntl.mjs ("the repair leaves every
  real NBA save byte identical") runs over the 2 NBA saves scripts/realSaves.mjs builds, neither with an intl
  block, so the repair returns at its first line and the check is true but nearly free. The repair's real paths
  are the planted saves of the same section (59 equal, 59 unequal, 63 written by Round 1541's own code). A
  wider real save set with a block is owed to whichever round next grows realSaves.mjs.

## The release (the lead's, binding)

- Rounds 1541, 1544 and 1557 ship on one train or not at all. "A medal goes in your Trophy Case" is on the
  call card (src/components/us-career/IntlCallUpCard.tsx), in the help (the gate's rules,
  src/lib/nbaCareerIntlGate.ts) and in What's New, and nothing on this branch reads the medal: the Trophy Case
  rows are Round 1557's. If 1557 leaves the train, 1541 and 1544 leave with it.
- The release's vitest line carries src/test/nbaCareerIntl.test.ts, src/lib/careerIntl.test.ts and
  src/test/nbaIntlResultLines.test.tsx beside src/test/usCareerIntlBoard.test.tsx. The review's mutations M2,
  M4, M13 and M14 were caught only by those unit files while the harness sections that own the rule stayed
  green; the fix's N1, N2, N2b, N4, N5 and N9 guard lines that only those files test; and FMT (the format
  line) is caught by them first and by the walk.
- The replay is derived on read (L4), so src/lib/careerIntl.test.ts pins three literal toy summers (the key, the
  draw order, the generated field). A round that moves those numbers changes what every live save's past summers
  show: it must mean to, and say what happens to the saves already written.
