# Club Manager Thun opening departures, 2026-27

The modern Club Manager roster represents August 2026 after the summer window. This correction concerns two players assigned to Thun in that snapshot.

## Club membership

- **Franz-Ethan Meichtry moved permanently from Thun to Genoa.** Genoa announced the signing through its official channel and recorded him among its new signings at first-team training on 9 July 2026. The Swiss FA records his Thun spell ending and his Genoa spell beginning on 6 July. Lega Serie A also identifies him as a midfield arrival from Thun for Genoa's 2026-27 squad. [Genoa signing announcement](https://www.youtube.com/watch?v=qlzCyXzb6ag), [Genoa first-team report](https://genoacfc.it/2026/07/09/raduno-e-primo-giorno-di-lavoro-per-il-genoa/), [Swiss FA player record](https://www.football.ch/fr/asf/equipes-nationales/m21/team.aspx/t-41643/p-950344/), [Lega Serie A season preview](https://en.legaseriea.it/news/under-the-radar-youngsters-talents-to-watch-in-the-new-serie-a-campaign)
- **Uros Vasic joined FC Biel-Bienne 1896 on 1 July 2025.** The club cites his previous season at Thun and his spring loan to Naters. It announced his renewal for 2026-27 on 2 May 2026. The regional association match sheet records him playing for Biel-Bienne in the Promotion League on 30 August 2026. [Biel-Bienne signing](https://www.fcbiel-bienne.ch/fr/n/uros-vasic,-un-renfort-polyvalent), [Biel-Bienne renewal](https://www.fcbiel-bienne.ch/fr/n/prolongation-de-contrat-pour-trois-joueurs-du-fc-biel-bienne-1896), [Association match sheet](https://matchcenter.fvnws.ch/Default.aspx?lng=1&ls=25789&oid=8&sg=70226&t=52536&tg=4314644&v=777819)

Genoa is modeled in the Club Manager world. The Swiss playable league is the Super League, and FC Biel-Bienne 1896 plays in the unmodeled Promotion League. Its name can identify the contract owner in the career ledger. Vasic should have no Thun place, free-agent listing or transfer-market listing from Biel-Bienne. [Swiss FA cup draw with league memberships](https://www.football.ch/desktopdefault.aspx/tabid-3813/11153_read-280548/)

## Data and save identity

The row order in `src/data/clubManagerRosters.ts` and the corresponding tuples in `scripts/data/cmAgesBasis2026.json` pin both source rows to the 2026 market snapshot.

| Stored name | Market row ID | Baked position and age | Thun-origin world key |
| --- | ---: | --- | --- |
| Franz-Ethan Meichtry | 162987 | CM, 21 | `["now","Thun","Franz-Ethan Meichtry","CM",2005,0]` |
| Uros Vasic | 121942 | LM, 23 | `["now","Thun","Uros Vasic","LM",2003,0]` |

The keys use the original simulation age anchors. The simulated start assigns permanent ownership before career market and squad consumers read it. Keeping the original keys allows later negotiations, loans, job changes and rollover to use the ordinary ownership ledger. Existing saves continue on their recorded ownership. The shared roster source also serves Manager Hot Seat and Deadline Day, whose earlier date deals use per-club name-order digests.

## Exact prior-save control

The local baseline loaded engine imports from merged commit `190a448a343354118484e00b8de3441d3e604fee`, tree `6e99280087e42b2ce196ffb5641db8a71879c4c8`. It took the genuine Thun starters at seed `1244`, recorded both permanent moves to Porto in a Real Madrid career at seed `116137`, and saved using the normal active and parked serializers. Both serializers chose the same plain representation for this opening fixture. Reloads placed both players solely at Porto with the two keys above, IDs `p-franz-ethan-meichtry` and `p-uros-vasic`, Switzerland display and the recorded transfer lines.

A test-only import moved the bare Meichtry row to Genoa and removed the Vasic row from Thun while reusing the same save bytes. The Thun-origin record still placed Meichtry at Porto, and the new Genoa projection placed a second copy at Genoa. Vasic still loaded at his recorded Porto club. The raw fixture SHA-256 is `a68e917374e01d55146dcb8c641f0dc4b56874036c184a74ce3cedaeca73aae7`.
