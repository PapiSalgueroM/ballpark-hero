# Release BA: sources receipt for PR239's Player Bingo facts

Written 2026-10-12 by the integrator of Release BA (desktop Claude lane). PR239 (codex/game-report-details, head
a3a98eb7) recorded its sources only in its own block of docs/PROJECT-STATE.md, and the release's merge rules keep the
base's text of that file, so the block would be lost. This file keeps it: the identity statement and the four source
lines verbatim, the code each one backs, and the verdict of the release's critic, who read every source again.

## What PR239 wrote (verbatim from its docs/PROJECT-STATE.md block, "Game reporting and Player Bingo Source candidate, 2026-10-11")

> Vitinha's reported rejection was reproduced at the Source/data boundary: the current PSG midfielder is a 2026 row, the title map stopped at 2025, and the existing age/name guard merged a separate Portuguese forward's history. The update adds PSG's verified 2026 title and scopes the extra nationality/role identity guard to Vitinha. Other players retain the prior position-history behavior. No database row or real statistic was invented or changed. Title and identity provenance is recorded below.
>
> - UEFA, 2026 final and winning lineup: https://www.uefa.com/uefachampionsleague/news/02a5-20c02e59f219-15e92acdc717-1000--paris-retain-champions-league-holders-edge-arsenal-on-pena/
> - PSG, second consecutive title: https://www.psg.fr/en/content/pr-paris-saint-germain-win-the-champions-league-for-the-second-successive-season
> - Midfielder identity: https://www.psg.fr/en/players/vitinha and https://www.uefa.com/uefachampionsleague/clubs/players/250101444--vitinha/
> - Forward identity: https://genoacfc.it/2024/02/01/vitinha-ufficiale-il-colpo-di-mercato-del-genoa/ and https://www.fpf.pt/Jogadores/Jogador/playerId/797077 (official indexed text, direct HTTP403 retained).

## The code each fact backs (src/lib/playerBingo.ts as merged)

| Fact | Code |
|---|---|
| Paris Saint-Germain won the 2025/26 UEFA Champions League | `UCL_WINNER_PAIRS`, the row `{ keys: ['paris saint-germain'], years: [2025, 2026] }` (2026 is the season end year, the table's convention) |
| Two Portuguese players named Vitinha share a birth year: a midfielder (PSG) and a forward (Braga, Marseille, Genoa) | `matchesBingoHistory`, which applies only to the normalised name "vitinha" and requires a history row's nationality and role (midfield or forward words in the position text) to match the pool row |

## The critic's verdict (Release BA brief, correction 13), two independent non wiki sources each

- PSG won the 2025/26 UEFA Champions League: UEFA's match report (the URL above: 1 to 1 after extra time, 4 to 3 on
  penalties against Arsenal, Saturday 30 May 2026, Puskas Arena, Budapest; Vitinha started) and The Associated Press
  as carried by NBC New York, https://www.nbcnewyork.com/news/sports/psg-wins-champions-league-shootout-victory-arsenal/6507169/?amp=1
  (same score, date and venue). The psg.fr release is a third source, from an interested party.
- The midfielder Vitinha, born 13 February 2000, Portugal, PSG:
  https://www.uefa.com/uefachampionsleague/clubs/players/250101444--vitinha/ and
  https://africa.espn.com/football/player/bio/_/id/288897/vitinha
- The forward Vitinha, Vitor Manuel Carvalho Oliveira, born 15 March 2000, Portugal (Braga, then Marseille, then
  Genoa): https://genoacfc.it/2024/02/01/vitinha-ufficiale-il-colpo-di-mercato-del-genoa/ and
  https://www.fotmob.com/players/1215057

So both facts stand, 2026 stays in `UCL_WINNER_PAIRS`, and the identity guard stays.

## Two data cautions, for the facts-fences reviewer (not reasons to hold)

1. FotMob lists the forward's second position as attacking midfielder, and the guard's role reading classes any
   position text containing "midfield" as a midfielder before it looks for forward words. A history row of the
   forward that reads "Attacking Midfield" would still be merged into the PSG man.
2. The Champions League tile credits every PSG row of year 2026, which is right only under the table's convention
   that year N is the club at the END of season N-1/N (playerBingo.ts lines 95 to 101, the YEAR SEMANTICS comment). PR239 did
   not recount the live support (its comment now says "Previously SQL-verified pool support: 62"), and the comment
   at lines 110 and 111 that reads "2011-2025" and "(62)" was left as it was.

One read only SELECT in the release's single live pass (the lead's, never an agent's) of the PSG rows of year 2026
and of the Vitinha rows (name, year, club, position) answers both; otherwise they stay recorded here as residual.
