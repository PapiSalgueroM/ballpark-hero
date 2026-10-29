# Round 1557: NBA My Career's national team, Part B2 (the medals on the shelf)

Branch r1557-nba-intl-case, built on Round 1544's closing head 2413427460 and merged with origin/main 5d1198389.
Rides ONE release with Rounds 1541 (Part A, the module, the ledger) and 1544 (Part B1, the call, the result
screen, the lazy load): 1544's "A medal goes in your Trophy Case" is true only with this round on the same train.
The proofs, runner names and numbers are in the lead's kit, dukb-handoff/2026-10-10/results-g/finish-1557.md;
this file keeps what the code will not say by itself.

## What a player meets

- The hub's Trophy Case tile counts a medal once: tile = rings plus the case plus the medals. The NBA binding's
  honours gain a row ("international medal" or "international medals") ONLY when he has one, so every save
  without a medal draws the tile it always drew.
- The case shows each medal kind as a row of its own after the season awards, in the same row markup
  ("Olympic bronze x1, 2004"). The line above ("n individual honours across m seasons") does not count medals
  (critic advice 20): a medal is the team's and the summer's. A case whose only rows are medals says "No
  individual honour yet." instead of "Nothing on the shelf yet."
- Under the rows, an International tile ("Called up by the national team once" or "n times") opens the
  International view: every summer he was called, oldest first, one tile each. A summer he went to opens Round
  1544's result screen (played again from the save) with Back to the list; a rested summer is a tile with no
  press. The list's own Back is the case. The view replaces the case and the badges; it is never stacked above
  them (critic advice 19). Leaving the trophies panel any way closes it.
- Three badges, before the closing five (NBA_BADGES 23 to 26): Medal for your country, Olympic gold, World Cup
  gold (the World Championship, its old name, counts). Game words only: no person, never "Team USA" or "Dream
  Team".

## How it stays light (the lead's rulings M1 and M11)

- The badges and the honours row read the summer rows on the save through one small reader,
  intlBadgeFactsOf in src/lib/careerBadges.ts (an edition id is "<competition>-<year>"). Neither careerBadges.ts
  nor nbaCareerLoop.ts nor nbaCareerSport.ts imports careerIntl.ts or the ledger; the reader treats a row it
  cannot read as nothing, because it runs every render, before the load repair has run on a hand edited save.
- The case rows come from the sport's face (trophyRows), which the board already holds for any save that
  carries a summer (Round 1544's load hunk). The International view, IntlSummersView, is a named export of
  src/components/us-career/IntlSummerResult.tsx (props only), so it loads in that lazy chunk with the result.
- The weight is in finish-1557.md: measured against the merge commit 60199687a (1544's head plus main), not
  against 2413427460 alone, because main's own changes since 1544's base move the page's chunks by themselves.

## The board (src/components/us-career/UsCareerBoard.tsx)

Round 1557's hunks: the lazy import; one state, intlOpen, declared with the board's other intl state above every
early return (the React error #310 rule); the panel's reveal key gains the view, and an effect closes the view
whenever the panel leaves the trophies; the trophies block (the view, or the case with its extra rows, its tile,
and the badges); and one term in the shared revealRef key, `reveal ? 'curtain' : ''`, so the curtain closing is a
screen change of its own and whatever follows (the call, the summer's card) arrives in view (1544's review,
minor 6). That last term moves every US career route's arrival after the curtain, by design.

## Also fixed here (the lead's M10)

- (a) the arrival after the curtain, above; playNbaIntl (g) measures it at 320 and 390.
- (b) simCareerIntl section 8 runs over every NBA save realSaves.mjs builds on 16 seeds (INTL_REAL_SEEDS), and
  the four planted blocks go into every one of them.
- (c) in a group's or a round's list, his own game reads like its neighbours ("USA 78-74 Turkey", bold), never
  "W 78-74 v Turkey" beside "Spain 104-62 Montenegro"; W or L stays in his own lists.
- (d) critic correction 9's print line: playNbaNumbers (this round's file) prints the calls its pages met. The
  other files of that list are not this round's (see "Owed").

## The copy (M5)

src/pages/NbaMyCareer.tsx's help reads "The Trophy Case holds 26 badges" (simNbaAwardsSense holds that number to
NBA_BADGES.length, unedited); scripts/playNbaNumbers.mjs reads the count off that page line, never a literal.
The guide, src/data/gameContent/basketball.ts: "Collect badges in the Trophy Case: 23 of them" and "Each of the
23 badges" now say 26; the frozen guide record was refreshed on a runner and the search index regenerated.

## Owed, not this round's

- The saved page public/nba-my-career/index.html and scripts/data/lastmod.json move at the release's build:seo
  (the help line and the guide's two sentences changed): the lead's.
- The /nba-my-career sweepWeight row is the lead's at the release (L7); the weight measured is in finish-1557.md.
- The What's New entry is Round 1544's file: it says "A medal goes in your Trophy Case", which this round makes
  true; it does not name the badges or the International view (the lead may add a clause).
- Critic correction 9's print line in the tests and walks outside this round's files (myCareerRestore,
  rivalryChoiceBoard, usCareerActionConfirm and the rest of that list): not done here, because those files are
  the shared US career set Round 1569 is editing at the same time.
