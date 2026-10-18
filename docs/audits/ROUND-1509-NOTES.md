# Round 1509 notes: the Europa League followed every season beside the Champions League

Branch r1509-cm-europa-watch, base origin/main 77556430 (Release BJ). Brief:
dukb-handoff/2026-10-10/briefs/brief-1509.md. This file is kept at every push; the builder's scratch notes live in
.tmp-fx and are never committed.

## Step 1, the ledger (dark: nothing imports it)

- scripts/data/cmEuroAccess.json (39 rows) and its receipt, src/lib/euroAccess.ts (constants and
  EURO_ACCESS_PARTIAL only), scripts/simWorldEuro.mjs section 0 with the controls onesource, wiki, thinused and
  receipt.
- Read on 2026-10-17. The access rows stand on Bert Kassies' Access List 2026/27 (v7.2) and UEFA's list of who
  qualified for the 2026/27 league phase (15 October 2026); the routes on UEFA's 2026/27 Europa League regulations,
  Article 3, beside the Premier League's explainer and the access list's footnotes; the cup winners on two
  publishers each (page titles off a web search, said in the receipt); the nights on the access list's calendar
  and UEFA's dates page.
- Only Serie A (A2) and the Bundesliga (A4) have a real 2026/27 access equal to the game's LEAGUE_RULES row. The
  Premier League and La Liga had a fifth Champions League place (a European Performance Spot), Ligue 1 sends
  fourth to Champions League qualifying, and the other ten associations either send a league club the game's row
  does not (one publisher, the access list alone) or send their cup winner alone. All thirteen are in
  EURO_ACCESS_PARTIAL; the game keeps its own places and the screen will say so. LEAGUE_RULES is not edited.
- Season one's cup winners: Manchester City, Inter Milan, Real Sociedad, Bayern Munich, Lens, AZ Alkmaar,
  Celtic, Trabzonspor, Union Saint-Gilloise, LASK, OFI, FC Midtjylland, St. Gallen, Dinamo Zagreb; Portugal's
  winner Torreense is not a club of this world (second tier), so its place passes to the league. The 2025-26
  Conference League winner, Crystal Palace, is in season one's field (row C0).
- Russia and Ukraine (the critic's 9(g)): the one Russian league of today's world has no European row, and no
  European league is Russian or Ukrainian; section 0.9 holds both.

## A design note for step 4 and step 6 (the board agreement)

The watched Champions League's fill takes the fifth placed club of the four deepest leagues (Bundesliga, La Liga,
Premier League, Serie A) every season unless it is my club. So in those leagues the Europa League's league place
passes from fifth to sixth whenever the fifth is in the Champions League. euroPlaceOf at a season end therefore
reads the same Champions League the rollover will draw (the finished tables, the holder, my club kept out), so
that it agrees with the rule run without the exclusion; mid season it reads my league's places and the cup final
only, as the lead's ruling e says.
