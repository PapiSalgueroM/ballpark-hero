# Premier League 2026: players the market table has no 2026 row for

Round 735, checked 2026-10-01. The window file (`premierLeague.json`) only moves
players who already have a 2026 row, because the migration keys on the name and
an `add` needs a position, an age and a value nobody should guess. These are the
players found while working the 2026 windows who could not go in for that reason.
Nothing here is in the data file, and nothing here invents a value: whoever adds
them takes position, age and value from a source at the time.

Sources used below:

- ESPN summer list: https://www.espn.com/soccer/story/_/id/48955344/premier-league-2026-summer-transfers-all-confirmed-ins-outs-every-club (updated 2026-09-04)
- ESPN squad pages for 2026-27: https://www.espn.com/soccer/team/squad/_/id/388/coventry-city, https://www.espn.com/soccer/team/squad/_/id/306/hull-city, https://www.espn.com/soccer/team/squad/_/id/373/ipswich-town

## The three promoted clubs

### Coventry City

Summer 2026 signings with no 2026 row (all on the ESPN summer list's Coventry ins and on ESPN's Coventry squad page):

| Player | From | Deal (ESPN summer list) |
|---|---|---|
| Loum Tchaouna | Burnley | undisclosed |
| Dan Bentley | Wolves | undisclosed |
| Stephen Mfuni | Manchester City | loan |
| Ethan Pinnock | Brentford | undisclosed |

Squad players on ESPN's Coventry 2026-27 page with no 2026 row at any club:
Ben Wilson, Jay Dasilva, Joel Latibeaudiere, Luke Woolfenden, Jake Bidwell.

### Hull City

Summer 2026 signings with no 2026 row (ESPN summer list's Hull ins, and ESPN's Hull squad page):

| Player | From | Deal (ESPN summer list) |
|---|---|---|
| Oscar Zambrano | Maribor | undisclosed |
| Lucas Herrington | Colorado Rapids | undisclosed |

Squad players on ESPN's Hull 2026-27 page with no 2026 row at any club:
Dillon Phillips, Archie Howard, Semi Ajayi, John Egan, Paddy McNair, Eliot Matazo,
Darko Gyabi, Matt Crooks, Kieran Dowell, Regan Slater.

### Ipswich Town

Summer 2026 signings with no 2026 row (ESPN summer list's Ipswich ins, and ESPN's Ipswich squad page):

| Player | From | Deal (ESPN summer list) |
|---|---|---|
| Cedric Kipre | Reims | undisclosed |
| Julio Enciso | Strasbourg | undisclosed |

Squad players on ESPN's Ipswich 2026-27 page with no 2026 row at any club:
Alex Palmer, David Button, Matthew Charles Compton.

## Moves whose destination club the table does not carry

Also recorded in `premierLeague.left-out.json`, so the harness's left-out
section keeps him out of the data file.

| Player | Move | Sources | Why not in the data file |
|---|---|---|---|
| Sverre Nypan | Manchester City to Lommel SK, season long loan, 2026-07-11 | https://www.sportsmole.co.uk/football/man-city/transfer-talk/news/man-city-midfielder-completes-loan-exit-that-will-be-viewed-as-step-back_601041.html for the Lommel loan, and https://www.mancity.com/news/mens/sverre-nypan-middlesbrough-loan-63905621 for his return from Middlesbrough in February 2026 | No 2026 row is spelled for Lommel, so there is no `db` to write, and the Lommel loan has one source (the Manchester City loan list page refused the fetch on 2026-10-01). His row still sits at Middlesbrough. |

## Stale rows that are not 2026 window moves

Also recorded in `premierLeague.left-out.json`, for the same reason.

| Player | Row sits at | Where he plays | Why not in the data file |
|---|---|---|---|
| Rodrigo Gomes | Estoril | Wolves, number 21 (https://www.wolves.co.uk/teams/mens-first-team/ and ESPN's Wolves squad page) | Estoril was his 2023-24 loan from Braga and he joined Wolves in summer 2024 (wolves.co.uk, 2024-06-12), so the move is neither 2026 window. The row is wrong, but it belongs to whoever corrects pre 2026 data. |
