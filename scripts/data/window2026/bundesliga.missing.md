# Bundesliga 2026 windows: players the market table has no 2026 row for

Round 737, checked 2026-10-01. `bundesliga.json` can only move a player who has a
2026 row in `player_market_values`, because the migration keys on the name. The men
below moved in the January 2026 or summer 2026 window (or were checked because the
board asked) but have no 2026 row at all, so nothing in this round can write them.
Where they have a 2025 row, Club Manager's bake falls back to it and shows them at
the 2025 club, which is why the list exists: the integration round, or a dataset
refresh, has to know these are stale.

Sources are the ones a data row would have carried: bundesliga.com's official
transfer centres (Bundesliga summer 2026 `37051`, Bundesliga January 2026 `35159`,
2. Bundesliga summer 2026 `37052`) and ESPN's 2026-27 squad page of the destination,
or the club's own site. One-source lines say so.

## Checked because the board named them, nothing to do

| Player | Table | Finding | Sources |
|---|---|---|---|
| Aleksandar Pavlovic | 2026 row at Bayern Munich | Stayed. Bayern refused every offer and he is on ESPN's 2026-27 Bayern squad. Row is right. | https://www.espn.com/soccer/team/squad/_/id/132 and https://amp.bundesliga.com/en/bundesliga/news/aleksandar-pavlovic-signs-bayern-munich-contract-extension-27822 |
| Serge Gnabry | 2025 row at Bayern Munich, no 2026 row | Stayed. Bayern extended him to 2028 in February 2026 and he is on ESPN's 2026-27 Bayern squad. The bake's 2025 fallback (Bayern) happens to be right, but he needs a 2026 row. | https://www.espn.com/soccer/team/squad/_/id/132 and https://fcbayern.com/en/news/2026/02/serge-gnabry-extends-with-bayern-to-2028 (the club page timed out twice on 2026-10-01; the URL is as the search index listed it) |

## Moved, no 2026 row (2025 row shown)

| Player | 2025 row | 2026-27 club | Window | Sources |
|---|---|---|---|---|
| Timo Werner | Tottenham Hotspur | San Jose Earthquakes (from Leipzig) | 2026-01 | bundesliga.com 35159 and https://www.espn.com/soccer/team/squad/_/id/191 |
| Luca Netz | Borussia Mönchengladbach (TWO 2025 rows, a duplicate worth fixing) | Nottingham Forest | 2026-01 | bundesliga.com 35159 and https://www.espn.com/soccer/team/squad/_/id/393 |
| Arne Maier | FC Augsburg | Újpest | 2026-01 | bundesliga.com 35159 only |
| Samuel Essende | FC Augsburg | BSC Young Boys | 2026-01 | bundesliga.com 35159 only (ESPN's Swiss squad pages still show 2025-26) |
| Michael Gregoritsch | SC Freiburg | FC Augsburg (January loan from Brøndby, made permanent in the summer) | 2026-01 and 2026-summer | bundesliga.com 35159, 37051 and https://www.espn.com/soccer/team/squad/_/id/3841 |
| Andreas Skov Olsen | VfL Wolfsburg | Istanbul Başakşehir (loan from Wolfsburg, after a January loan to Rangers) | 2026-summer | bundesliga.com 37052 and https://www.espn.com/soccer/team/squad/_/id/7914 |
| Marius Müller | VfL Wolfsburg | Aberdeen | 2026-summer | bundesliga.com 37052 and https://www.espn.com/soccer/team/squad/_/id/263 |
| Mads Pedersen | FC Augsburg | Hertha BSC | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/129 |
| Henri Koudossou | FC Augsburg | Arminia Bielefeld | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/2506 |
| Wisdom Mike | Bayern Munich | Club Brugge | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/570 |
| Armindo Sieb | 1.FSV Mainz 05 | Los Angeles FC (Bayern sold him after the Mainz loan ended) | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/18966 |
| Lovro Zvonarek | SK Sturm Graz | Estrela Amadora (from Bayern) | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/21610 |
| Daiki Hashioka | Luton Town | Borussia Mönchengladbach (loan from Slavia Prague) | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/268 |
| Louey Ben Farhat | Karlsruher SC | Freiburg signed him and loaned him straight back to Karlsruhe (ESPN spells him Louey Farhat) | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/4471 |
| Berkay Yilmaz | 1.FC Nuremberg | SC Freiburg (loan ended) | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/126 |
| Emir Sahiti | Hamburger SV | Hannover 96 | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/2428 |
| Robert Wagner | FC St. Pauli | Dynamo Dresden (Freiburg loan made permanent) | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/7017 |
| Jean-Luc Dompé | Hamburger SV | Konyaspor | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/7648 |
| Sheraldo Becker | Real Sociedad | 1.FSV Mainz 05 (January loan from Osasuna, made permanent) | 2026-01 and 2026-summer | bundesliga.com 35159, 37051 and https://www.espn.com/soccer/team/squad/_/id/2950 |
| Maximilian Wöber | Leeds United | FC Schalke 04 (after a Werder loan) | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/133 |
| Felix Uduokhai | Besiktas JK | 1.FC Union Berlin | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/598 |
| Marin Ljubicic | 1.FC Union Berlin | 1.FC Union Berlin (January loan to Fortuna Düsseldorf ended; the 2025 row is already right) | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/598 |
| Alex Král | RCD Espanyol Barcelona | FC Copenhagen (from Union Berlin) | 2026-summer | bundesliga.com 37051 and https://www.espn.com/soccer/team/squad/_/id/909 |
| Michy Batshuayi | Eintracht Frankfurt | Abha Club | 2026-summer | bundesliga.com 37051 only |

## Contract ended or career ended, no 2026 row

| Player | 2025 row | Finding | Source |
|---|---|---|---|
| Niklas Süle | Borussia Dortmund | Retired | bundesliga.com 37051 |
| Mahmoud Dahoud | Eintracht Frankfurt | Out of contract, no new club found | bundesliga.com 37051 |
| Maximilian Philipp | SC Freiburg | Out of contract, no new club found | bundesliga.com 37051 |
| Pascal Stenzel | VfB Stuttgart | Out of contract, no new club found | bundesliga.com 37051 |
| Kevin Kampl | no row | Contract terminated at Leipzig in January 2026, then retired | bundesliga.com 35159 |

## Not in the table in any year

Steve Mounié (Alanyaspor loan ended, back at Augsburg), Haris Tabaković (Hoffenheim
to Red Bull Salzburg) and Tim Drexler (Hoffenheim to Red Bull Salzburg in January)
have no row at all, so nothing can be stale for them. Listed so the next pass does not
look again.
