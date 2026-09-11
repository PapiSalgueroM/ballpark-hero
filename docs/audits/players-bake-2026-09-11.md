# players.ts becomes generated: the Round 531 bake, 2026-09-11

Piece one of Round 531 (`docs/design/round-531-data-sweep-part-one.md`). `src/data/players.ts`
was 748 hand typed rows (716 distinct names, 32 typed twice) dated by one comment, read by
Footle as its fallback and by Squad Deal, Club Manager, Perfect Lineup, Sports Bingo and
Gauntlet Draft. It is now written by `scripts/bakePlayers.mjs` from `player_market_values`
(year 2026, the same 5,496 rows the `player_market_values_dedup` view returns for that year,
checked row for row on 2026-09-11) plus the verified 2026 window overlay, and fenced by
`scripts/simPlayersPool.mjs`. The rules are in the bake's header and repeated in the generated
file's own header. This file records what the bake did to the old rows and every source used.

## Sources

The table: `player_market_values`, 2026 rows, read through the public anon key from
`src/integrations/supabase/client.ts` (5,496 rows, exact count from the first page's
content-range; every row has a position, an age, a nationality, goals and assists).

The overlay: `scripts/transferOverlay2026.mjs` (two sources per entry, recorded in its header).
Applied at bake time by exact name; it moved 0 rows because the Round 393 migration already
wrote every entry into the table and `simTransferOverlay` holds it there.

The 2026-27 memberships: `REAL_LEAGUES` in `src/lib/clubManager.ts` (verified 2026-08-13 and
2026-08-16 per its comments) through the table spellings in `scripts/lib/dbClubNames.mjs`
(lifted out of the roster bake, one copy). Two of those leagues were checked again today,
since the Premier League is the most guessed league on the site and the Championship decides
which relegated clubs the file may still call Premier League:

| League | Source one | Source two | Agree with `REAL_LEAGUES` |
|---|---|---|---|
| Premier League 2026-27 (20 clubs) | ESPN standings, https://www.espn.com/soccer/table/_/league/eng.1 (season label 2026-27) | Sky Sports, https://www.skysports.com/premier-league-table (last updated 10 September) | Yes: Coventry City, Hull City and Ipswich Town in; West Ham, Wolves and Burnley absent |
| EFL Championship 2026-27 (24 clubs) | ESPN standings, https://www.espn.com/soccer/table/_/league/eng.2 (season label 2026-27) | Sky Sports, https://www.skysports.com/championship-table (last updated 10 September) | Yes: all 24, Leicester City absent from both tiers |

Blocked or empty, not cited: https://www.premierleague.com/clubs and
https://www.premierleague.com/tables (returned navigation only, no club list), https://www.bbc.com
(unreachable from this session), https://www.worldfootball.net (HTTP 403).

For clubs outside the Club Manager world the league comes from the live pool's own club maps,
`CLUB_TO_LEAGUE` in `src/data/footleEnrichment.ts` (through `getEnrichment` with an empty
name, so the club alone decides) and `INSANE_CLUB_LEAGUE` in `src/lib/fetchFootlePlayerPool.ts`.
Both are 2025/26 lists (their own comments say so). They placed 17 and 6 rows respectively;
507 rows came from the 2026-27 memberships.

## What the bake produced

530 rows from 716 seed names: easy 158 (the 8 GOAT names in the pool plus the top 150 by
value), hard 200, insane 172. Four names matched by reversed word order (the table writes the
family name first for Korean players): Lee Kang-in to Kang-in Lee, Son Heung-min to Heung-min
Son, Hwang Hee-chan to Hee-chan Hwang, Lee Jae-sung to Jae-sung Lee.

GOAT names present, all easy whatever their value: Kylian Mbappé ($216m), Luis Suárez ($30m),
Cristiano Ronaldo ($13m), Lionel Messi ($13m), Neymar ($11m), Robert Lewandowski ($9m), Karim
Benzema ($6m), Luka Modrić ($4m). The other five GOAT names the pool fetch keeps (Ibrahimovic,
Iniesta, Xavi, Ramos, Bale) were never in the old file and have no 2026 row.

## Old row versus new row, for the 530 kept

Compared against the first old row carrying the same folded name.

| Field | Rows changed | Note |
|---|---|---|
| club (string) | 429 | 168 of these are the table's long spelling for the same club (PSG to Paris Saint-Germain, Chelsea to Chelsea FC) |
| club (a different club) | 261 | real moves the old file never learned: Rodri to Barcelona, Luis Díaz to Bayern, Bruno Guimarães to Arsenal, Sesko and Mbeumo to Manchester United, Ekitiké and Barcola to Liverpool, Leão to Galatasaray, and so on |
| league | 185 | follows the club; the first 25 are listed below |
| age | 186 | the table's 2026 rows are an autumn 2025 snapshot, so most are one year younger than the old file's February 2026 guess (Haaland 26 to 25, Rice 27 to 26) |
| market value | 485 | the old file's values were round guesses; the table's are the dataset's USD figures rounded to millions |
| goals | 422 | the table's season counts, low because of the snapshot date (Messi 0, Haaland 12) |
| assists | 415 | same |
| position | 175 | `POSITION_NORMALIZE` maps the table's Centre-Forward to CF, so the old file's ST rows read CF now, the same way the live pool does |
| nationality | 39 | the table's spelling or the table's answer (checked nowhere else: these 39 are the table's claim, not verified here) |
| difficulty | 248 | the value rank rule: hard to easy 51, insane to easy 23, easy to hard 29, insane to hard 72, hard to insane 53, easy to insane 20 |
| kit number | 387 | 375 rows now null (the enrichment list never had them, or the Round 495 guard dropped a number written under another league), 12 changed number, 143 kept |

League changes, the first 25 by value: Hugo Ekitiké Bundesliga to Premier League (Eintracht
Frankfurt to Liverpool FC); Rodri Premier League to La Liga (Manchester City to FC Barcelona);
Martín Zubimendi La Liga to Premier League (Real Sociedad to Arsenal FC); Bradley Barcola Ligue 1
to Premier League (PSG to Liverpool FC); Luis Díaz Premier League to Bundesliga (Liverpool to
Bayern Munich); Benjamin Sesko Bundesliga to Premier League (RB Leipzig to Manchester United);
Rafael Leão Serie A to Turkish Süper Lig (AC Milan to Galatasaray); Rayan Cherki Ligue 1 to
Premier League (Lyon to Manchester City); Anthony Gordon Premier League to La Liga (Newcastle to
FC Barcelona); Tijjani Reijnders Serie A to Saudi Pro League (AC Milan to Al-Qadsiah FC); Mason
Greenwood Ligue 1 to Turkish Süper Lig (Marseille to Fenerbahce); Cristian Romero Premier League
to La Liga (Tottenham to Atlético de Madrid); Ibrahima Konaté Premier League to La Liga
(Liverpool to Real Madrid); Karim Adeyemi Bundesliga to La Liga (Borussia Dortmund to FC
Barcelona); Marc Cucurella Premier League to La Liga (Chelsea to Real Madrid); Rasmus Højlund
Premier League to Serie A (Manchester United to SSC Napoli); Gianluigi Donnarumma Ligue 1 to
Premier League (PSG to Manchester City); Malick Thiaw Serie A to Premier League (AC Milan to
Newcastle United); Geovany Quenda Liga Portugal to Premier League (Sporting CP to Chelsea FC);
Antony Premier League to La Liga (Manchester United to Real Betis Balompié); Ethan Nwaneri
Premier League to Bundesliga (Arsenal to Borussia Dortmund); Marcus Rashford La Liga to Premier
League (Barcelona to Manchester United); Trevoh Chalobah Premier League to Serie A (Crystal
Palace to Como 1907); Conor Gallagher La Liga to Premier League (Atlético Madrid to Tottenham
Hotspur); Curtis Jones Premier League to Serie A (Liverpool to Inter Milan). Every one of these
is the overlay's verified move or the table's own row, never the old file.

## The 186 seed names not in the pool

The seed (`scripts/data/playersPoolSeed.json`) keeps every name, so a later import that carries
one of these brings the player back without anybody retyping him.

**No 2026 row in `player_market_values` (155).** Retired men (Arda Turan, Gervinho, Shinji
Okazaki, Yoshito Okubo, Dries Mertens, Mario Balotelli), players the dataset has under another
spelling the bake will not guess at (Dani Carvajal, Gabriel Magalhães, Andy Robertson,
Brozović, Jota, Neto, Torreira, Arrascaeta, Lucero, Merentiel, Ilkay Gündoğan), players with a
2025 row only (Antoine Griezmann: the overlay records that too), and players the import simply
does not carry:

Abdul Fatawu Issahaku, Abel Ruiz, Adam Wharton, Ahmed Hegazy, Albert Guðmundsson, Alexis
Sánchez, Ali Al-Bulaihi, Anderson Lopes, André Trindade, André Zambo Anguissa, André-Pierre
Gignac, Andrea Belotti, Andreas Skov Olsen, Andriy Yarmolenko, Andy Robertson, Ángel Correa,
Angelo Stiller, Ante Budimir, Antoine Griezmann, Antonio Sanabria, Arda Turan, Arnaut Danjuma,
Arrascaeta, Brozović, Bruno Petković, Bryan Cristante, Callum McGregor, Cenk Tosun, Charles
Aránguiz, Charles De Ketelaere, Cho Gue-sung, Christian Ramirez, Ciro Immobile, Dani Carvajal,
Danny Ings, David Alaba, David Ospina, DeAndre Yedlin, Denis Draguș, Denis Genreau, Deyverson,
Diego Rossi, Dimitri Payet, Diogo Jota, Dries Mertens, Eduardo Vargas, Emre Can, Enzo Copetti,
Eric Maxim Choupo-Moting, Éverton Ribeiro, Fabinho, Falcao, Gabigol, Gabriel Magalhães, Gary
Medel, Gerard Moreno, Germán Cano, Gervinho, Gianluca Lapadula, Giorgos Giakoumakis, Gleison
Bremer, Guido Burgstaller, Guillermo Ochoa, Héctor Herrera, Héctor Moreno, Henry Martín, Hwang
In-beom, Iago Aspas, Ilkay Gündoğan, Ivan Rakitić, James Tavernier, Jamie Maclaren, Jamie
Vardy, Jefferson Lerma, Jens Cajuste, João Félix, Joo Min-kyu, Jordi Alba, Josip Iličić, Jota,
Kamil Grosicki, Kasper Schmeichel, Keylor Navas, Ki Sung-yueng, Kostas Fortounis, Lorenzo
Insigne, Lucero, Luis Advíncula, Manuel Ugarte, Marcos Acuña, Marcus Edwards, Mario Balotelli,
Marko Livaja, Matteo Politano, Mattia De Sciglio, Max Kilman, Mehdi Taremi, Memphis Depay,
Merentiel, Michael Gregoritsch, Michy Batshuayi, Miguel Borja, Morten Hjulmand, Musashi Suzuki,
Mykhailo Mudryk, Nabil Bentaleb, Neto, Nicolas Capaldo, Nicolò Zaniolo, Olivier Giroud, Orel
Mangala, Paco Alcácer, Patrick Vieira Jr, Paulo Dybala, Pepelu, Percy Tau, Peter Shalulile,
Pietro Pellegri, Presnel Kimpembe, Rafa Silva, Rasmus Falk, Raúl de Tomás, Renato Sanches,
Robert Andrich, Robin Quaison, Romeo Lavia, Salem Al-Dawsari, Samu Omorodion, Sander Berge,
Sebastiano Esposito, Serge Gnabry, Sergio Busquets, Shinji Okazaki, Simon Mignolet, Simone
Verdi, Sofyan Amrabat, Stefan de Vrij, Sunil Chhetri, Suso, Themba Zwane, Thomas Müller, Timo
Werner, Torreira, Tyler Adams, Uroš Spajić, Valentín Castellanos, Vegetti, Viktor Claesson,
Vincenzo Grifo, Wout Weghorst, Xherdan Shaqiri, Yacine Adli, Yasser Al-Shahrani, Yoshito Okubo,
Youssouf Fofana.

**No club to league mapping knows the club (24).** Four are free agents ("Without Club":
Edinson Cavani, Georginio Wijnaldum, Stephan El Shaarawy, Willian), which the smell list
forbids. Nine sit on stray one-row club spellings the table carries beside its usual spelling
(see the migration below): Granit Xhaka (Sunderland), Harry Winks (Cagliari, also relegation
below), Hulk (Fluminense FC), Pierre-Emerick Aubameyang (Deportivo A Coruña). The rest are at
clubs no map on the site places in a league: Abdülkadir Ömür (Antalyaspor), Adam Bareiro
(Fortaleza Esporte Clube), Akram Afif and Roberto Firmino (Al-Sadd SC), Aleksandar Mitrović
(Al-Rayyan SC), Arturo Vidal (CSD Colo-Colo), Christian Benteke and Dusan Tadić (Al-Wahda FC),
Emam Ashour and Trézéguet (Al Ahly FC), Florinel Coman (Al-Gharafa SC), Hakim Ziyech (Wydad
Casablanca), Mohamed Daramy (Stade Reims), Nabil Fekir (Al-Jazira Club), Olimpiu Moruțan (FC
Rapid 1923), Yahia Attiyat Allah (FC Sochi), Yuki Soma (Machida Zelvia). Adding those clubs to
`CLUB_TO_LEAGUE` with a verified 2026-27 division brings them back; the bake did not invent one.

**A 2025/26 map places the club in a league it no longer belongs to (6).** The Club Manager
world lists these leagues completely for 2026-27 and does not name the club, so the club left
the league and its current division is unknown to the site: Azzedine Ounahi and Thomas Lemar
(Girona FC, out of La Liga), Takuma Asano (RCD Mallorca, out of La Liga), Harry Winks (Cagliari,
the stray spelling), Mostafa Mohamed (FC Nantes, out of Ligue 1), Stephy Mavididi (Leicester
City, out of the Championship per both ESPN and Sky Sports above).

**A second spelling of a name already in the pool (1).** Moisés Caicedo, folded to the same
key as Moises Caicedo.

Nothing was ambiguous: the table's two Edersons (the keeper at Fenerbahce and Éderson at
Atalanta) were told apart by the exact spelling before any folding.

## Table hygiene found on the way, for the desktop lane

Nine one-row club spellings sit beside the spelling every other row of that club uses
(Sunderland beside 24 rows of Sunderland AFC, Fenerbahçe beside 21 of Fenerbahce, Cagliari,
Juventus, Real Betis, Besiktas, Kasımpaşa, Fluminense FC, Deportivo A Coruña). They look like the
hand of a migration rather than the import. `supabase/migrations/20260911_round_531_club_spellings.sql`
normalises the nine by row id and is NOT applied; the desktop lane applies it through the MCP,
re-runs the bake, and Xhaka, Winks, Locatelli, Roca, Ndidi, Demirbay, Hulk and Aubameyang
resolve a league (the seed still names the first four and the last two).

The near variants the bake deliberately does not fold are real different teams: Chelsea FC U21,
Real Madrid Castilla, Sporting CP B, Liverpool FC Montevideo and the like.

## Follow ups the bake exposed (not fixed here)

- `CLUB_TO_LEAGUE` in `src/data/footleEnrichment.ts` and `INSANE_CLUB_LEAGUE` in
  `src/lib/fetchFootlePlayerPool.ts` are 2025/26 lists, so the LIVE Footle pool still labels
  Burnley FC, West Ham United and Wolverhampton Wanderers as Premier League and Coventry, Hull
  and Ipswich as Championship. The baked file follows the verified 2026-27 memberships, so the
  two disagree on those six clubs until the maps are re-based on 2026-27.
- `Vinicius Junior` in the table against `Vinícius Júnior` in the enrichment list: the kit
  number lookup is by exact name, so his row reads null, as it does in the live pool.
- Active players with no 2026 row (Carvajal, Gabriel Magalhães, Robertson, Griezmann, Dybala,
  Bremer, Gnabry, Müller) are worth a look at the import: some are spelling gaps, some are missing.
- `player_market_values` carries a `Defensive Midfield` position on only 46 of 5,496 rows and
  `Left Midfield` on 632, which reads like an import quirk and shapes every game that filters
  by position.

## Verification run

- `node scripts/bakePlayers.mjs`: 530 rows, byte identical on a second run.
- `node scripts/simPlayersPool.mjs`: green (header, smell list over 530 rows, 530 rows checked
  against the live table with 0 disagreements, fresh bake identical).
- `PLAYERS_CONTROL=handedit`: sections 3 and 4 red (Manchester Blue named). Control green.
- `PLAYERS_CONTROL=agezero`: section 2 red (age 0 named). Control green.
- tsc zero, `vitest run src/hooks/useGame.test.ts` 2 passed, `simSportsBingo` green (thinnest
  condition g15 at 1.9% against the 0.8% floor), `simCreateClub` green, `simSquadDealTopic`
  green, `simFootleDaily` and `simDailyReload` as recorded in the round summary.
