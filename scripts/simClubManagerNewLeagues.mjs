/* Round 876: the leagues Club Manager gained, played for real.

   Brazil's Serie A came in as rows only (a LEAGUE_RULES row, a REAL_LEAGUES
   row, a nation, priors, colours, the name map and the bake). This harness
   plays it, so a row that reads right and plays wrong cannot ship. A later
   league (Liga MX is the next one) is one more entry in NEW_LEAGUES below.

   What this holds, per new league, on the real engine bundled with esbuild:

   A. ROWS (hard). The rules row carries the drop count and the cup the
      league's entry below says; the league has its real size; the engine's
      own drop count (relegationSpots) agrees; and the weakest club's board
      asks it to stay up, which is finishing size minus drop.
   B. SEASONS (hard). Over SEEDS seeded careers at mid table clubs a full
      season ends; every club of the league plays 2 x (size - 1) league
      matches, wins equal losses across the table; a league with a cup draws
      a bracket of its own nation's clubs, plays it to a winner and names
      the right cup; a league with no cup never schedules, draws or names one.
      The summer: a league with a modelled second tier trades exactly the
      drop count both ways; a league with none (Brazil) keeps its membership,
      which is the existing rule for every such league (the Primeira Liga,
      the Super Lig and the rest), and the drop count is the zone the board
      and the headlines read.
   C. STRENGTH (hard). The title odds follow squad strength: across the seeds
      each strong club of the league's sanity pairs (the bake's own pairs)
      takes more points on average than its weak partner by PAIR_GAP, and the
      rank correlation between each club's preview rating and its mean points
      is at least RHO_MIN.
   D. NO INVENTED MEN (hard). Every club of the league builds its day one
      squad from its real baked roster plus youth pads that are flagged as
      pads; no unflagged man is missing from the roster, and a club is in
      CM_PARTIAL exactly when it has fewer than 8 real players or (an
      A-League club, Release AH) the A-League list marks it for its values.

   MEASURED 2026-10-02, six seasons a run, SIM_SEED unset and 1 to 5:
     pair gap   Flamengo over Remo 37.3 to 48.2 points a season,
                Palmeiras over Chapecoense 42.2 to 53.3      band PAIR_GAP 20
     rank correlation, 14 unmanaged clubs, 0.908 to 0.971    band RHO_MIN 0.7
     (a table with no strength in it sits near 0 on both; the swap control
     measured -42.5 and -45.3)
     sacked careers 0 to 2 per run of six, each replaced by the next seed
     day one: 281 real men, 95 flagged pads, 4 partial clubs (Coritiba,
     Mirassol, Remo, Chapecoense)
   The whole run takes a few seconds.

   Round 883 added Liga MX, the first real league with no cup and no drop.
   Besides A to D it holds, for a league whose drop count is 0: no board of
   any of its clubs asks anybody to stay up, no headline over a full season
   talks of the drop (every headline is read, not just the newest eight), and
   finishing last is no relegation on the manager's record (wildernessProfile
   read last place, 18th, as one before this round). Its cupless rows ride
   on part B: no cup week, no bracket, no cup match, no cup name (every
   save's league names no cup).

   MEASURED 2026-10-02, Round 883 tree, six seasons a run, SIM_SEED unset
   and 1 to 5:
     Liga MX    América over Necaxa 8.5 to 17.5 points a season (rated 74
                against 69, both real squads of 19 and 10), Guadalajara over
                FC Juárez 14.5 to 21.2                       band pairGap 4
                rank correlation, 12 clubs, 0.843 to 0.942  band RHO_MIN 0.7
                244 to 259 headlines a run, none about the drop (the
                check asks for at least 10 a season, so it cannot pass
                on an empty feed)
     Brazil on the same tree: 39.0 to 52.7 and 43.3 to 51.2, rho 0.932 to
                0.956, above the Round 876 numbers and well clear of its band
     After the review's namesake fix (Palmeiras regain Paulinho, FC Juárez
                regain José Luis Rodríguez), SIM_SEED unset: Liga MX 20.8 and
                15.8, rho 0.963; Brazil 43.8 and 53.3, rho 0.958. 251 Liga MX
                headlines, none about the drop under the wider pattern. The
                cupon control now also trips the cup name check (16 fails),
                dropcount2 trips 38.

   NEGATIVE CONTROLS (each must turn the run red, and each refuses to run if
   the text it mutates is not in the source):
     CM_NEW_CONTROL=dropcount  Brazil's rules row drops 3, part A goes red;
     CM_NEW_CONTROL=nocup      Brazil's rules row loses its cup, part B goes red;
     CM_NEW_CONTROL=swap       the sanity pairs swap rosters in memory
                               (Flamengo with Remo, Palmeiras with
                               Chapecoense), part C goes red;
     CM_NEW_CONTROL=invented   makeYouth stops flagging its pads, part D goes red.
     CM_NEW_CONTROL=cupon      Liga MX's rules row gains a cup, parts A and B
                               go red;
     CM_NEW_CONTROL=dropcount2 Liga MX's rules row drops 2, part A and the
                               drop talk checks go red.
     CM_NEW_CONTROL=alpartial  the engine reads only the baked partial list,
                               forgetting the A-League one: part D goes red
                               (Central Coast Mariners).

   Round 1035 added the A-League Men, the first league with a cup that two
   of its clubs do not enter; those two are played by
   scripts/simClubManagerALeague.mjs. Its row plays twelve seasons, keeps one
   pair and leaves the rank correlation unbanded (the reasons and the numbers
   are beside its entry below).

   Round 1040 added the second tiers that make relegation real in Serie A
   (Serie B first), and three parts that play the pyramids, not one league:

   E. PYRAMIDS (hard). Careers at a mid table club of every modelled top
      flight play three summers each (3 x CM_NEW_E_SEEDS summers per pyramid,
      a sacked career replaced by the next seed). Every summer, in EVERY
      pyramid (whichever league the career is in): exactly the drop count
      moves each way, both sizes hold, the movers are exactly the bottom of
      the finished top table and the top of the finished second one, no club
      sits in two leagues, and the manager's own pyramid names every mover in
      the summer news (the cap no longer cuts them behind other pyramids'
      lines). Then a career at Serie A's weakest club is tried until it goes
      down (FAIL, not skip, if it never does): its record reads the
      relegation, it starts the next season in Serie B with the Relegated
      line, and its board asks with the promotion ladder. And the drop zone
      is read off the league's own size and drop: the first drop place of
      every modelled top flight reads as a relegation, the place above it
      does not. Round 1040 review: every season E and R finish must file its
      own league and that league's size on the season's record (the fields
      the drop zone is read from; without them the old 18th rule comes back
      and Ligue 1's 17th reads as no relegation), and no mover's summer line
      puts "the" before La Liga, Serie A or B, or Ligue 1 or 2.
      A drop zone finish in a SECOND tier (Serie B 18th to 20th, the Segunda
      17th to 20th, Ligue 2 17th and 18th, the Championship 22nd to 24th)
      also reads as a relegation on the manager's record, though the game has
      no third tier to send the club to: correction 8's formula, the same
      convention Brazil's drop zone already had on main. Recorded here and in
      wildernessProfile, on purpose, not checked as a defect.
   F. CUP UNDERDOGS (hard). A top flight career's domestic cup holds two or
      three clubs of its second tier, and a top flight winner over a second
      tier loser is never an upset while the reverse always is, asked from a
      top flight career and from a second tier one. Round 1040 review: MLS
      East and West are one division sharing the U.S. Open Cup, so neither
      beating the other is an upset (before the round the other conference
      was the "lower" one); the cupold control turns that red as well.
   THIN. The round's three facts with one 2026-27 source (THIN_FACTS below)
      must stay marked THIN for 2026-27 in their engine rows, and the run
      prints them.
   G. OLD SAVE (hard). scripts/data/cmSecondTierOldSaveFixture.json, written
      once by the engine BEFORE the round (release-ah fc30942e: a Valencia
      career seeded 1040, four league weeks left, 129,093 bytes, a world of
      22 leagues and no Serie B), loads, finishes, rolls its first summer
      without a throw while Serie A keeps its clubs (no Serie B table to read
      a finish from), and the summer after trades three each way.

   MEASURED 2026-10-06. Baseline, the round's base tree (release-ah
   fc30942e, a git archive): over three Bologna careers of three summers La
   Liga, Serie A and Ligue 1 took in 0 clubs; a top flight career's Coppa
   Italia, Copa del Rey and Coupe de France last sixteen held 0 second tier
   clubs (three seeds each); and five Championship seasons flagged a top
   flight club beating a Championship one as a giant killing 17 times.
   This tree: 0 such flags over 128 pairings in each of England and Italy
   and 64 in Germany; second tier clubs in the last sixteen 2 or 3 every
   time (England 3 2 3 2, Germany 2 3 2 3, Italy 2 3 3 2); every summer moved
   premier 3, championship 3, bundesliga 2, bundesliga2 2, seriea 3,
   serieb 3; Frosinone, Serie A's weakest (rated 73), went down 18th on the
   first try and its board asked "Make the promotion playoffs".
   RE-MEASURED 2026-10-07 for the three rows, after the round's review
   withheld every baked man at the new clubs that his club's ESPN 2026-27
   squad page leaves out (110 men; the roster ledger's round1040-review
   rows). The first build's numbers, a Pisa over Cremonese pair among them,
   were measured on squads that still held last season's departures. Every
   row plays 48 seasons a run, SIM_SEED unset and 1 to 5. A club with no
   baked man previews at the picker's 66 while it plays at its 61 prior, so
   the three rows leave those clubs out of the rank correlation (a
   placeholder is not a rating); the weakest club asked to stay up is the
   lowest preview, ties broken by the engine's own expectation rank.
   Serie B (A to D): only Pisa (12 real men, rated 72) and Verona (11, 71)
   carry 8 or more, a one point gap noise swamps, so the row keeps no pair
   (correction 9: skip only the pair). Rank correlation over the 12 unmanaged
   clubs with baked men 0.955, 0.941, 0.839, 0.912, 0.937, 0.837 (band 0.4).
   Day one: 78 real men, 244 flagged pads, 18 of 20 clubs partial (realMin
   60). The weakest, Ascoli (60), is asked to finish 17th or better.

   Ligue 2 (the round's second step, which also takes Ligue 1's drop from
   three to two, the real league's): Nantes (13 real men, rated 73),
   Saint-Étienne (9, 69) and Reims (8, 68) are its squads at 8 or more, so
   the pair is Nantes over Reims: 13.7, 13.5, 12.0, 11.6, 11.9, 10.8 points a
   season (mean 12.3, standard deviation 1.0, band 5, about half the lowest
   and 7 deviations clear). Rank correlation over the 7 unmanaged clubs with
   baked men 0.964, 0.889, 0.741, 0.964, 0.704, 0.741 (band 0.4). Day one:
   49 real men, 240 flagged pads, 15 of 18 clubs partial (realMin 36). The
   F part's Coupe de France holds 2 or 3 Ligue 2 clubs; part E trades ligue1
   2 and ligue2 2.
   Parts E, G and the relegation career hold the board at full confidence
   before every entry: the engine sacked a mid table manager before his
   third summer in 21 of 29 careers, which starved E of summers (Mainz
   reached 4 of 6) and ended every one of G's four second seasons.

   The Segunda División (the round's third step): 20 of the real 22 clubs,
   the two reserve sides left out. Girona (10 real men, rated 72) and
   Mallorca (8, 68) are its squads at 8 or more, so the pair is Girona over
   Mallorca: 11.9, 10.6, 10.7, 10.4, 12.4, 11.5 points a season (mean 11.3,
   standard deviation 0.8, band 5). Rank correlation over the 8 unmanaged
   clubs with baked men 0.939, 0.939, 0.939, 0.875, 0.939, 0.939 (band 0.4;
   with the six empty clubs left in it read 0.274 on the unset stream,
   which is why they are left out). Day one: 48 real men, 274 flagged pads,
   18 of 20 clubs partial (realMin 36). The weakest by preview ties at 61
   (Eibar, Burgos, Valladolid, Albacete); the engine ranks Albacete last and
   asks it to finish 16th or better. Part F also holds that neither reserve
   side is a club of the game.

   Round 1040's controls (each must turn the run red):
     CM_NEW_CONTROL=nopyramid  Serie A loses its second tier: E red;
     CM_NEW_CONTROL=emptypair  the Segunda's pair sets Girona against empty
                               Tenerife: the real squad pair rule red;
     CM_NEW_CONTROL=crowd      the summer news cap goes back to five lines:
                               E red (a Serie A career's sixth mover);
     CM_NEW_CONTROL=cupold     a cup club's division is "in my league or
                               not" again: F red;
     CM_NEW_CONTROL=ligue1drop3  Ligue 1 relegates three again: the Ligue 2
                               row's top flight drop (A) and E red;
     CM_NEW_CONTROL=reserve    Real Sociedad B joins the Segunda: its size
                               (A) and F's reserve check red.
   The review's controls:
     CM_NEW_CONTROL=nohistleague  finishSeason stops filing the league and
                               its size on the season's record (the
                               reviewer's mutant): E and R red;
     CM_NEW_CONTROL=article    the promotion line says "to the" before every
                               league again: E red;
     CM_NEW_CONTROL=thin       the Serie B row's THIN mark is dropped: the
                               THIN part red.

   Run: node scripts/simClubManagerNewLeagues.mjs   (SIM_SEEDS=n, default 6; a row may ask for more)
        CM_NEW_PARTS=AD or EFG runs those parts, CM_NEW_ROWS=serieb those rows
*/
import { build } from 'esbuild';
import { GATHERED_LEAGUES } from './lib/gatheredLeagues.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const SEEDS_ALL = Number(process.env.SIM_SEEDS || 6);
const SEED_SET = process.env.SIM_SEED || "";
const CONTROL = process.env.CM_NEW_CONTROL || '';
const CONTROLS = ['dropcount', 'nocup', 'swap', 'invented', 'cupon', 'dropcount2', 'alpartial', 'nopyramid', 'emptypair', 'crowd', 'cupold', 'ligue1drop3', 'reserve', 'nohistleague', 'article', 'thin', 'rudrop', 'rueuro', 'ruswap', 'ruflavour', 'rulabel', 'rumen'];
/* Round 1040: parts E to G can be run alone (CM_NEW_PARTS=EFG), the A to D
   league rows alone (CM_NEW_PARTS=AD), or every part (unset). */
const PARTS = process.env.CM_NEW_PARTS || 'ADEFGH';
/* CM_NEW_ROWS=serieb,ligue2 plays only those league rows in A to D. */
const ROWS = process.env.CM_NEW_ROWS ? process.env.CM_NEW_ROWS.split(',') : null;
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`CM_NEW_CONTROL=${CONTROL} is not one of ${CONTROLS.join(', ')}`); process.exit(1); }

/* One entry per league this round family added. size, drop and cup are the
   real format with its sources beside the LEAGUE_RULES row; pairs are the
   bake's sanity pairs; managed are the mid table clubs the careers run at,
   so the pairs are always played by the engine and never by the career. */
const NEW_LEAGUES = [
  {
    id: 'brasileirao', size: 20, drop: 4, cup: 'Copa do Brasil',
    pairs: [['Flamengo', 'Remo'], ['Palmeiras', 'Chapecoense']],
    managed: ['Santos', 'Grêmio', 'Internacional', 'Fluminense', 'Botafogo', 'Corinthians'],
  },
  {
    id: 'ligamx', size: 18, drop: 0, cup: null, pairGap: 4,
    pairs: [['América', 'Necaxa'], ['Guadalajara', 'FC Juárez']],
    managed: ['Pumas UNAM', 'León', 'Atlético San Luis', 'Pachuca', 'Monterrey', 'Tijuana'],
  },
  /* Round 1035: the A-League Men. Its managed clubs all enter the Australia
     Cup; the two that do not (Auckland FC, Wellington Phoenix) are played by
     scripts/simClubManagerALeague.mjs, which holds the cup exclusion. */
  /* Its squads are rated close together (best XI 57.5 to 60.9, previews 58
     to 61), so six seasons were too few: over six a run, the Melbourne City
     over Brisbane Roar pair (61 against 59) measured 2.0 to 11.5 points and
     the rank correlation over six unmanaged clubs 0.50 to 0.91, both inside
     what noise does. So the row first played twelve seasons, kept the one
     pair with a real rating gap (Adelaide United 61 over Central Coast
     Mariners 58), and left the rank correlation unbanded: ten of its twelve
     previews sit at 60 or 61, and a rank of ties is weak evidence. The
     review fix below plays 96 and bands both.
     MEASURED 2026-10-06, twelve seasons a run, SIM_SEED unset and 1 to 4:
     Adelaide over Central Coast 7.4, 6.0, 8.8, 2.4 and 8.7 points a season.
     A band of 1 sat about two standard deviations under that mean, a coin
     toss in waiting, so the review fix plays more seasons rather than
     loosening anything. The row's seasons are cheap (about 30 seconds for
     96), and the spread of the gap falls as one over the root of the count:
     twenty four seasons, SIM_SEED unset and 1 to 4: gap 5.7, 6.5, 7.3, 3.3,
     8.8, rho 0.806, 0.836, 0.794, 0.794, 0.971.
     NINETY SIX seasons, SIM_SEED unset and 1 to 7: gap 5.6, 6.6, 7.6, 5.6,
     5.2, 6.1, 6.6, 4.0; rho 0.736, 0.853, 0.971, 0.971, 0.971, 0.853,
     0.971, 0.853. Mean gap 5.9 with a standard deviation of 1.1, so the
     band is 2 (3.6 deviations clear; the swap control turns the gap
     negative), and the rank correlation over the
     six unmanaged clubs is banded at 0.4, far under the lowest of fourteen
     runs at 24 or 96 seasons (0.736): it is coarse with tied previews, so
     the band only catches strength stopping to matter. */
  {
    id: 'aleague', size: 12, drop: 0, cup: 'Australia Cup', pairGap: 2, seeds: 96, rhoMin: 0.4,
    pairs: [['Adelaide United', 'Central Coast Mariners']],
    managed: ['Perth Glory', 'Newcastle Jets', 'Melbourne Victory', 'Western Sydney Wanderers', 'Sydney FC', 'Macarthur FC'],
  },
  /* Round 1040: Serie B, Serie A's second tier. After the round's review
     withheld every man ESPN's 2026-27 squads leave out, only Pisa (12 real
     men) and Verona (11) carry 8 or more, rated 72 and 71: a one point gap
     noise swamps, so the row keeps no pair and part C is the rank
     correlation alone (correction 9: the pair is skipped, the rest is
     measured). 48 seasons a run; MEASURED in the Round 1040 header section. */
  {
    id: 'serieb', size: 20, drop: 3, topDrop: 3, cup: 'Coppa Italia', pairGap: 2, rhoMin: 0.4, realPairs: true, seeds: 48, realMin: 60,
    pairs: [],
    managed: ['Palermo', 'Sampdoria', 'Empoli', 'Modena', 'Cesena', 'Padova'],
  },
  /* Round 1040: Ligue 2, Ligue 1's second tier. After the review Nantes
     (13 real men), Saint-Étienne (9) and Reims (8) carry 8 or more, rated
     73, 69 and 68, so the pair is Nantes over Reims. MEASURED in the Round
     1040 header section. */
  {
    id: 'ligue2', size: 18, drop: 2, topDrop: 2, cup: 'Coupe de France', pairGap: 5, rhoMin: 0.4, realPairs: true, seeds: 48, realMin: 36,
    pairs: [['Nantes', 'Reims']],
    managed: ['Montpellier', 'Metz', 'Guingamp', 'Dunkerque', 'Annecy', 'Laval'],
  },
  /* Round 1040: the Segunda División, La Liga's second tier: 20 of the real
     22 clubs (the two reserve sides are left out). After the review Girona
     (10 real men) and Mallorca (8) carry 8 or more, rated 72 and 68, so the
     pair is Girona over Mallorca. MEASURED in the Round 1040 header section. */
  {
    id: 'segunda', size: 20, drop: 4, topDrop: 3, cup: 'Copa del Rey', pairGap: 5, rhoMin: 0.4, realPairs: true, seeds: 48, realMin: 36,
    pairs: [['Girona', 'Mallorca']],
    managed: ['Almería', 'Leganés', 'Sporting Gijón', 'Granada', 'Cádiz', 'Castellón'],
  },
  /* Round 1052: the Russian Premier League, the Brazil shape (a drop count
     with no second tier in the game). The pairs are set by rule and not by
     taste: strong is the two highest preview ratings of the league (Zenit
     76, Spartak Moscow 74), weak the two lowest among clubs that are not
     partial (Fakel Voronezh 62, Dynamo Makhachkala 65; no club of the
     league is partial). The managed clubs are the six in the middle by
     rating.
     MEASURED 2026-10-08 on a GitHub runner at b199f9b5, six seasons a run,
     SIM_SEED unset and 1 to 5. Zenit over Fakel Voronezh: 33.7, 38.3, 33.2,
     30.5, 36.7 and 40.5 points a season. Spartak Moscow over Dynamo
     Makhachkala: 27.5, 13.3, 17.3, 19.8, 17.5 and 25.7. The band is 6: at
     most half the smallest of those twelve means (13.3), rounded down. The
     rank correlation over the ten unmanaged clubs: 0.948, 0.886, 0.899,
     0.911, 0.911 and 0.948; the smallest is over 0.85, so it is banded at
     the house 0.7. 353 real men and 4 flagged pads take the field on day
     one, no partial club. The old world still plays the same in a bigger
     one: on this tree, default stream, brasileirao measured 46.5 and 51.8
     with rho 0.945, ligamx 16.0 and 8.0 with rho 0.944, both green on their
     own unchanged bands.
     Part H on the same six streams: Zenit won the league in 3 of 4, 7, 8, 5,
     7 and 7 seasons played and none of the 18 title winners started the
     next season in a Champions League group; 12 Russian Cup brackets a run,
     each the sixteen Russian clubs; 16 clubs on the job market, dugout size
     16, playing career size null; 7 past season rows at their own strength.
     Controls, default stream: rudrop 3 failures (part A: the row, the
     engine's count, Fakel's ask); rueuro 1 (H1, three title winners in the
     Champions League); ruflavour 7 (H4, every past season Russian club
     rated off the 2026 squad: Zenit 2015-16 at 76 where the engine gave
     83.5); ruswap turned both pairs negative (minus 26.7 and minus 20.3),
     part C red; under it Zenit carries Fakel's squad and wins no title, so
     part H is not read. */
  {
    id: 'russia', size: 16, drop: 2, cup: 'Russian Cup', pairGap: 6, rhoMin: 0.7,
    pairs: [['Zenit', 'Fakel Voronezh'], ['Krasnodar', 'Dynamo Makhachkala']],
    managed: ['Lokomotiv Moscow', 'Rubin Kazan', 'Rostov', 'Akhmat Grozny', 'Baltika', 'Akron Tolyatti'],
  },
];
/* Round 1040: a pair is only evidence when both clubs field real men, so a
   pair needs 8 or more baked players a side (the CM_PARTIAL line); the
   emptypair control swaps one in for an empty club and must turn this red. */
const PAIR_MIN_REAL = 8;
/* Round 1040 review, decision 4 of the round's brief: a fact with no second
   2026-27 source is marked THIN in the engine's comment AND here. These are
   the round's three; each row's comment must still say THIN for 2026-27 until
   a second 2026-27 source is written beside it, and the run prints them, so
   a green run never reads as "all two sourced".
     ligue1  the drop of two plus the barrage for 2026-27: Foot Mercato is the
             one 2026-27 publisher, the second source describes 2025-26.
     serieb  the promotion playoff rung (third to eighth, the board's target)
             for 2026-27: last season's places, the 2026-27 calendar release
             restates none.
     ligue2  the drop of two (seventeenth and eighteenth straight down) for
             2026-27: Foot Mercato again the one 2026-27 publisher. */
const THIN_FACTS = [
  { id: 'ligue1', fact: "Ligue 1's 2026-27 drop of two and the barrage" },
  { id: 'serieb', fact: "Serie B's 2026-27 promotion playoff rung (third to eighth)" },
  { id: 'ligue2', fact: "Ligue 2's 2026-27 drop of two" },
  /* Round 1052's Russian row has no THIN fact any more: its order for clubs level on points (head to head first,
     then wins) gained a second 2026-27 publisher in the round's review, and scripts/simClubManagerGathered.mjs
     holds every fact that row's comment cites to two publishers. */
];
function partThin() {
  let src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'clubManager.ts'), 'utf8').split('\r\n').join('\n');
  /* thin: the Serie B row's mark is dropped, as if the rung were two sourced. */
  if (CONTROL === 'thin') src = mutateOnce(src, '2026-05-08). THIN for 2026-27: the season', '2026-05-08). For 2026-27: the season', 'thin');
  for (const { id, fact } of THIN_FACTS) {
    const at = src.indexOf(`\n  ${id}: {\n    nationId:`);
    const open = at < 0 ? -1 : src.lastIndexOf('/*', at);
    const comment = open < 0 ? '' : src.slice(open, at);
    if (at < 0 || !comment.includes('*/') || !/THIN for 2026-27/.test(comment)) fail(`THIN: ${fact} has one 2026-27 source, and the ${id} row's comment no longer marks it THIN for 2026-27`);
    else console.log(`   THIN (one 2026-27 source, marked in the ${id} row): ${fact}`);
  }
}
/* Round 883: what a league that relegates nobody must never say. */
/* The review widened it past the three phrasings the engine used then to
   every way it words the drop today (grep of clubManager.ts on 2026-10-02:
   the drop, bottom three, survival, from safety, Stay up) plus the obvious
   next ones, so a new line about going down is caught too. */
const DROP_TALK = /relegat|from safety|stay up|surviv|the drop\b|drop zone|bottom (two|three|four)\b|going down\b/i;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const hashKey = s => { let h = 0x811c9dc5 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;
Date.now = () => 1790000000000;

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};

const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'cmnew-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });

/* Replace exactly one occurrence, refusing to run when it is absent: a
   control that changes nothing would leave the run green for nothing. */
function mutateOnce(src, from, to, label) {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`control ${label}: expected the text once in clubManager.ts, found it ${n} times; refusing to run`); process.exit(1); }
  return src.replace(from, to);
}

function transformEngine(src) {
  if (CONTROL === 'dropcount') src = mutateOnce(src, "brasileirao: {\n    nationId: 'brazil', flag: 'Brazil', cup: 'Copa do Brasil', europe: null, drop: 4,", "brasileirao: {\n    nationId: 'brazil', flag: 'Brazil', cup: 'Copa do Brasil', europe: null, drop: 3,", 'dropcount');
  if (CONTROL === 'nocup') src = mutateOnce(src, "brasileirao: {\n    nationId: 'brazil', flag: 'Brazil', cup: 'Copa do Brasil',", "brasileirao: {\n    nationId: 'brazil', flag: 'Brazil', cup: null,", 'nocup');
  if (CONTROL === 'cupon') src = mutateOnce(src, "ligamx: {\n    nationId: 'mexico', flag: 'Mexico', cup: null,", "ligamx: {\n    nationId: 'mexico', flag: 'Mexico', cup: 'Copa MX',", 'cupon');
  if (CONTROL === 'dropcount2') src = mutateOnce(src, "ligamx: {\n    nationId: 'mexico', flag: 'Mexico', cup: null, europe: null, drop: 0,", "ligamx: {\n    nationId: 'mexico', flag: 'Mexico', cup: null, europe: null, drop: 2,", 'dropcount2');
  if (CONTROL === 'invented') src = mutateOnce(src, '    isYouth: true,\n', '    isYouth: false,\n', 'invented');
  if (CONTROL === 'alpartial') src = mutateOnce(src, "import { CM_WORLD_ROSTERS as CM_ROSTERS, CM_WORLD_PARTIAL as CM_PARTIAL } from '@/data/clubManagerWorldRosters';", "import { CM_WORLD_ROSTERS as CM_ROSTERS } from '@/data/clubManagerWorldRosters';\nimport { CM_PARTIAL } from '@/data/clubManagerRosters';", 'alpartial');
  /* Round 1040's controls. nopyramid: Serie A loses its second tier, so it
     trades nobody (part E red). crowd: the summer news cap goes back to five
     lines, which cuts a Serie A career's own sixth line (part E red).
     cupold: a cup club's division goes back to "in my league or not", the
     test that called a top flight winner over a Championship side a giant
     killing (part F red). */
  if (CONTROL === 'nopyramid') src = mutateOnce(src, "drop: 3, tiebreak: 'h2h', secondTier: 'serieb', ladder: 'top'", "drop: 3, tiebreak: 'h2h', ladder: 'top'", 'nopyramid');
  if (CONTROL === 'crowd') src = mutateOnce(src, 'lines: [...lines, ...elsewhere].slice(0, Math.max(5, lines.length))', 'lines: [...lines, ...elsewhere].slice(0, 5)', 'crowd');
  /* ligue1drop3: Ligue 1 relegates three again, as it did before the round:
     the Ligue 2 row (its top flight's drop) and part E go red. */
  if (CONTROL === 'ligue1drop3') src = mutateOnce(src, "europe: { ucl: 3, uel: 4, uecl: 5 }, drop: 2, tiebreak: 'gdH2h', secondTier: 'ligue2'", "europe: { ucl: 3, uel: 4, uecl: 5 }, drop: 3, tiebreak: 'gdH2h', secondTier: 'ligue2'", 'ligue1drop3');
  /* reserve: Real Sociedad B joins the Segunda, the real league's 21st club:
     the row's size (A) goes red. */
  if (CONTROL === 'reserve') src = mutateOnce(src, "'Cádiz', 'FC Andorra', 'Ceuta', 'Albacete'],", "'Cádiz', 'FC Andorra', 'Ceuta', 'Albacete', 'Real Sociedad B'],", 'reserve');
  /* nohistleague (Round 1040 review): finishSeason stops filing the league
     and its size on the season's record, as the reviewer's mutant did:
     checkSeasonRecord in E and R goes red. */
  /* article: the summer's promotion line goes back to "to the" before every
     league name, as the round first shipped it: E red on Serie A, Ligue 1
     and La Liga careers. */
  if (CONTROL === 'article') src = mutateOnce(src, 'win promotion to ${toLeague(topDef.name)}.', 'win promotion to the ${topDef.name}.', 'article');
  if (CONTROL === 'nohistleague') src = mutateOnce(src, 'trophies: seasonTrophies, leagueId: careerLeagueOf(state).id, leagueSize: table.length },', 'trophies: seasonTrophies },', 'nohistleague');
  /* Round 1052's controls. rudrop: the Russian row drops three (part A red).
     rueuro: the Russian row hands out European places (H1 red). ruflavour:
     a past season no longer reads its own prior for a Champions League
     opponent, so a 2015-16 Zenit is rated off the 2026 squad (H4 red). */
  if (CONTROL === 'rudrop') src = mutateOnce(src, "cup: 'Russian Cup', europe: null, drop: 2, ladder: 'top'", "cup: 'Russian Cup', europe: null, drop: 3, ladder: 'top'", 'rudrop');
  if (CONTROL === 'rueuro') src = mutateOnce(src, "cup: 'Russian Cup', europe: null, drop: 2, ladder: 'top'", "cup: 'Russian Cup', europe: { ucl: 2, uel: 1, uecl: 1 }, drop: 2, ladder: 'top'", 'rueuro');
  if (CONTROL === 'ruflavour') src = mutateOnce(src, 'const eraPrior = state.eraId && isHistoricEra(state.eraId) ? eraEuroPrior(state.eraId, club) : null;', 'const eraPrior = null;', 'ruflavour');
  if (CONTROL === 'cupold') src = mutateOnce(src, "return leagueRulesOf(lg.id).ladder === 'promotion' ? 2 : 1;", 'return lg.id === careerLeagueOf(state).id ? 1 : 2;', 'cupold');
  /* Private helpers the checks ask directly. */
  return `${src}\nexport { relegationSpots as __relegationSpots, buildSquad as __buildSquad, getPool as __getPool, isCupUpset as __isCupUpset };\n`;
}

async function bundleEngine() {
  const entry = path.join(TMP, 'entry.mjs');
  const out = path.join(TMP, 'engine.mjs');
  fs.writeFileSync(entry, `export * from '${ROOT_FWD}/src/lib/clubManager.ts';\nexport * as __aleague from '${ROOT_FWD}/src/data/clubManagerALeague2026.ts';\nexport * as __jobs from '${ROOT_FWD}/src/lib/managerJobMarket.ts';\nexport * as __scl from '${ROOT_FWD}/src/lib/soccerCareerLeague.ts';\nexport { FALLBACK_CLUBS as __careerClubs } from '${ROOT_FWD}/src/lib/soccerCareerEngine.ts';\nexport { ensureAllEraRosters as __ensureAllEraRosters } from '${ROOT_FWD}/src/lib/clubManagerEras.ts';\n${GATHERED_LEAGUES.map(l => `export * as __g_${l.id} from '${ROOT_FWD}/${l.out}';`).join('\n')}\n`);
  const enginePath = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
    alias: { '@': `${ROOT_FWD}/src` }, logLevel: 'error',
    plugins: [{
      name: 'cm-new',
      setup(b) {
        /* The engine never reaches the network here: the client module is
           replaced by a stub that throws if anything asks it for data. */
        b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'sb', namespace: 'sb' }));
        b.onLoad({ filter: /.*/, namespace: 'sb' }, () => ({ contents: 'export const supabase = new Proxy({}, { get() { throw new Error("offline harness"); } }); export const SUPABASE_URL = "http://offline.invalid"; export const SUPABASE_PUBLISHABLE_KEY = "x";', loader: 'js' }));
        b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]clubManager\.ts$/ }, a => {
          let src = fs.readFileSync(a.path, 'utf8').replaceAll('\r\n', '\n');
          if (path.resolve(a.path) === path.resolve(enginePath)) src = transformEngine(src);
          return { contents: src, loader: 'ts', resolveDir: path.dirname(a.path) };
        });
      },
    }],
  });
  return import(pathToFileURL(out).href);
}

/* Every headline the season printed is kept, since the state holds only the
   newest eight. */
/* Round 1040: holdBoard keeps the board at full confidence before every
   entry, for the parts that measure pyramids and saves rather than the
   board (E, G and the relegation career): a mid table manager the engine
   plays for was sacked before his third summer in 21 of 29 careers
   (measured 2026-10-07), which starved part E of summers. */
function playSeason(cm, state, holdBoard = false) {
  let s = state;
  const headlines = new Set();
  for (let i = 0; i < 160; i++) {
    if (holdBoard) s.boardConfidence = 100;
    const r = cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    for (const h of s.aiHeadlines ?? []) headlines.add(h);
    if (r.kind === 'seasonOver') return { state: s, headlines };
    if (s.sacked) return { state: s, sacked: true, headlines };
  }
  return { state: s, stuck: true, headlines };
}

/* A. The rows say what the league is, and the engine reads them. */
function partRows(cm, row) {
  console.log(`A) ${row.id}: the rows`);
  /* Round 1040: the previous row's last summer registered its traded
     memberships (every pyramid trades in every career's summer), so the
     static world is put back before this row is read. */
  cm.registerLeagueOverrides(null);
  const lg = cm.REAL_LEAGUES.find(l => l.id === row.id);
  if (!lg) { fail(`${row.id} is not in REAL_LEAGUES`); return null; }
  const rules = cm.leagueRulesOf(row.id);
  if (lg.clubs.length !== row.size) fail(`${row.id} has ${lg.clubs.length} clubs, the real league has ${row.size}`);
  if (new Set(lg.clubs).size !== lg.clubs.length) fail(`${row.id} lists a club twice`);
  if (rules.drop !== row.drop) fail(`${row.id}'s rules row drops ${rules.drop}, the real league drops ${row.drop}`);
  if (cm.__relegationSpots(row.id) !== row.drop) fail(`the engine's drop count for ${row.id} is ${cm.__relegationSpots(row.id)}, not ${row.drop}`);
  if ((rules.cup ?? null) !== row.cup) fail(`${row.id}'s cup is ${rules.cup}, expected ${row.cup}`);
  if ((lg.cupName ?? null) !== row.cup) fail(`${row.id}'s league def names cup ${lg.cupName}, expected ${row.cup}`);
  /* Round 1040: a second tier row also holds the drop of the top flight
     above it, which is how many clubs the two trade each summer. */
  if (row.topDrop !== undefined) {
    const above = cm.PYRAMIDS.find(p => p.second === row.id);
    if (!above) fail(`${row.id} is no top flight's second tier`);
    else if (above.count !== row.topDrop || cm.__relegationSpots(above.top) !== row.topDrop) fail(`${above.top} sends ${above.count} down to ${row.id} (drop ${cm.__relegationSpots(above.top)}), the real league sends ${row.topDrop}`);
  }
  for (const c of lg.clubs) if (cm.leagueOf(c).id !== row.id) fail(`${c} resolves to league ${cm.leagueOf(c).id}`);
  /* The weakest club by the engine's own preview is asked to stay up.
     Round 1040 review: previews are rounded, so several thin Segunda squads
     tie at the bottom (61); the tie goes to the club the engine itself ranks
     weakest (its def's expectation), not to whichever the list names first. */
  const byRating = [...lg.clubs].sort((a, b) => cm.clubPreviewRating(a) - cm.clubPreviewRating(b) || cm.clubDefFor(b).expectation - cm.clubDefFor(a).expectation);
  Math.random = seeded(hashKey(`newleagues|${row.id}|weakest`));
  const weak = cm.startCareer(byRating[0], 'now');
  Math.random = REAL_RANDOM;
  const lgObj = (weak.boardObjectives ?? []).find(o => o.id === 'league');
  const want = row.drop > 0 ? row.size - row.drop : null;
  console.log(`   ${lg.clubs.length} clubs, drop ${rules.drop}, cup ${rules.cup}; weakest ${byRating[0]} (${cm.clubPreviewRating(byRating[0])}) is asked: ${lgObj?.label} (${lgObj?.target})`);
  if (want !== null && (!lgObj || lgObj.target !== want)) fail(`${byRating[0]}'s board asks ${lgObj?.label} (target ${lgObj?.target}), not to finish ${want}th or better`);
  /* Round 883: a league that relegates nobody has no board, of any of its
     clubs, asking anybody to stay up. */
  if (row.drop === 0) {
    const asks = new Set();
    for (const c of lg.clubs) {
      const o = cm.buildBoardObjectives(c, false, lg.clubs.length).find(x => x.id === 'league');
      if (!o) { fail(`${c}'s board sets no league objective`); continue; }
      asks.add(o.label);
      if (DROP_TALK.test(o.label)) fail(`${c}'s board asks "${o.label}" in a league nobody goes down from`);
      if (!(o.target >= 1 && o.target <= row.size)) fail(`${c}'s board target ${o.target} is off the table`);
    }
    console.log(`   every board of ${lg.clubs.length} asks one of: ${[...asks].join(' | ')}`);
  }
  return lg;
}

/* B. Full seasons. Returns each club's points per seed for part C. */
function partSeasons(cm, row, lg) {
  /* Round 1035: a row may ask for more seasons (the A-League, see its entry). */
  const SEEDS = process.env.SIM_SEEDS ? SEEDS_ALL : (row.seeds ?? SEEDS_ALL);
  console.log(`B) ${row.id}: ${SEEDS} seeded seasons`);
  const clubs = new Set(lg.clubs);
  const nationClubs = new Set(cm.REAL_LEAGUES.filter(l => cm.leagueRulesOf(l.id).nationId === cm.leagueRulesOf(row.id).nationId).flatMap(l => l.clubs));
  const perClub = Object.fromEntries(lg.clubs.map(c => [c, []]));
  const matchesEach = 2 * (row.size - 1);
  let ended = 0, sacked = 0, cupWeeks = 0, cupFinals = 0, cupNamed = 0, moved = 0, headlinesSeen = 0;
  let k = 0;
  /* A sacking ends a career before its season does, and the engine sacks a
     mid table manager now and then (3 of 18 measured), so a sacked seed is
     replaced by the next one, up to three times as many seeds. */
  for (; ended < SEEDS && k < 3 * SEEDS; k++) {
    const club = row.managed[k % row.managed.length];
    Math.random = seeded(hashKey(`newleagues${SEED_SET}|${row.id}|${k}`));
    const start = cm.startCareer(club, 'now');
    cupWeeks += start.calendar.filter(e => e.type === 'cup').length;
    if ((cm.careerLeagueOf(start).cupName ?? null) === row.cup) cupNamed += 1;
    const played = playSeason(cm, start);
    const s = played.state;
    if (played.stuck) { fail(`${row.id} seed ${k} at ${club}: the season never ended`); Math.random = REAL_RANDOM; continue; }
    if (played.sacked) { sacked += 1; Math.random = REAL_RANDOM; continue; }
    ended += 1;
    headlinesSeen += played.headlines.size;
    if (row.drop === 0) {
      /* Round 883: nobody goes down, so no headline counts anybody into a
         drop zone and a last place finish is no relegation on the manager's
         record either. */
      for (const h of played.headlines) if (DROP_TALK.test(h)) fail(`${row.id} seed ${k}: a headline talks of the drop: "${h}"`);
      const last = { ...s, history: [{ season: s.season, club, position: row.size, points: 0, trophies: [] }] };
      const prof = cm.wildernessProfile(last);
      if (prof.departure === 'relegated' || prof.relegations) fail(`${row.id} seed ${k}: finishing last at ${club} reads as ${prof.relegations} relegation(s), departure ${prof.departure}`);
    }
    const table = s.table ?? [];
    if (table.length !== row.size) fail(`${row.id} seed ${k}: the table has ${table.length} rows`);
    let w = 0, l = 0;
    for (const r of table) {
      if (!clubs.has(r.club)) fail(`${row.id} seed ${k}: ${r.club} is in the table and not in the league`);
      if (r.w + r.d + r.l !== matchesEach) fail(`${row.id} seed ${k}: ${r.club} played ${r.w + r.d + r.l}, not ${matchesEach}`);
      w += r.w; l += r.l;
      perClub[r.club]?.push(r.pts);
    }
    if (w !== l) fail(`${row.id} seed ${k}: ${w} wins against ${l} losses`);
    const bracket = s.cupBracket ?? [];
    if (row.cup) {
      for (const t of bracket) for (const c of [t.home, t.away]) if (c && !nationClubs.has(c)) fail(`${row.id} seed ${k}: ${c} drawn into the ${row.cup}`);
      const fin = bracket.find(t => t.round === 'F');
      if (fin?.winner) cupFinals += 1; else fail(`${row.id} seed ${k}: the ${row.cup} has no final winner`);
    } else {
      if (bracket.length) fail(`${row.id} seed ${k}: a cupless league drew a bracket`);
      if ((s.resultLog ?? []).some(r => r.competition === 'cup')) fail(`${row.id} seed ${k}: a cupless league played a cup match`);
    }
    /* The summer. */
    const fin = cm.finishSeason(s);
    const next = cm.startNextSeason(fin.state);
    const nextClubs = new Set(cm.careerLeagueOf(next).id === row.id ? cm.careerLeagueOf(next).clubs : (next.leagueOverrides?.[row.id] ?? lg.clubs));
    const gone = lg.clubs.filter(c => !nextClubs.has(c)).length;
    const second = cm.leagueRulesOf(row.id).secondTier;
    /* Round 1040: a second tier (Serie B) has no modelled tier under it, so
       its summer loses exactly the clubs it sends up, the top flight's drop
       count, and nobody goes down out of it. */
    const above = cm.PYRAMIDS.find(p => p.second === row.id);
    const wantGone = second ? row.drop : (above ? above.count : 0);
    if (gone !== wantGone) fail(`${row.id} seed ${k}: ${gone} clubs left the league in the summer, expected ${wantGone}`);
    if (nextClubs.size !== row.size) fail(`${row.id} seed ${k}: ${nextClubs.size} clubs next season`);
    moved += gone;
    Math.random = REAL_RANDOM;
  }
  console.log(`   ${ended} seasons ended, ${sacked} sacked, ${cupWeeks} cup weeks scheduled, ${cupFinals} cup finals won, cup named on ${cupNamed} saves, ${moved} clubs moved in the summers, ${headlinesSeen} headlines read`);
  if (row.drop === 0 && headlinesSeen < 10 * ended) fail(`only ${headlinesSeen} headlines over ${ended} seasons, too few to say none of them talks of the drop`);
  if (ended < SEEDS) fail(`only ${ended} of ${SEEDS} seasons reached the end in ${k} tries`);
  if (row.cup) {
    if (cupNamed !== k) fail(`the ${row.cup} was named on ${cupNamed} of ${k} saves`);
    if (cupWeeks !== 4 * k) fail(`${cupWeeks} cup weeks over ${k} saves, a cup league schedules four each`);
  } else {
    if (cupWeeks) fail(`${cupWeeks} cup weeks were scheduled in a cupless league`);
    /* The header's "no cup name": a cupless league's save names no cup. */
    if (cupNamed !== k) fail(`a cupless league named a cup on ${k - cupNamed} of ${k} saves`);
  }
  return perClub;
}

const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
function ranks(values) {
  const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(values.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j += 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}
function spearman(x, y) {
  const rx = ranks(x), ry = ranks(y);
  const mx = mean(rx), my = mean(ry);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
  return num / Math.sqrt(dx * dy);
}

/* C. Strength orders the table. Managed clubs are left out of the
   correlation, since a career's own club is the one the engine does not pick
   the team for. */
const PAIR_GAP = Number(process.env.CM_NEW_PAIR_GAP || 20);
const RHO_MIN = Number(process.env.CM_NEW_RHO_MIN || 0.7);
function partStrength(cm, row, lg, perClub) {
  console.log(`C) ${row.id}: strength orders the table`);
  for (const [strong, weak] of row.pairs) {
    /* Round 1040: a row that asks for real pairs gets them, or the pair
       would measure youth pads and priors rather than the data. */
    if (row.realPairs) {
      for (const c of [strong, weak]) {
        const n = cm.CM_ROSTERS[c]?.length ?? 0;
        if (n < PAIR_MIN_REAL) fail(`${row.id}'s pair ${strong} against ${weak}: ${c} carries ${n} real players, a pair needs ${PAIR_MIN_REAL} a side`);
      }
    }
    const gap = mean(perClub[strong] ?? []) - mean(perClub[weak] ?? []);
    console.log(`   ${strong} ${mean(perClub[strong]).toFixed(1)} pts (rated ${cm.clubPreviewRating(strong)}) against ${weak} ${mean(perClub[weak]).toFixed(1)} (rated ${cm.clubPreviewRating(weak)}): gap ${gap.toFixed(1)}`);
    const band = process.env.CM_NEW_PAIR_GAP ? PAIR_GAP : (row.pairGap ?? PAIR_GAP);
    if (!(gap >= band)) fail(`${strong} beat ${weak} by ${gap.toFixed(1)} points a season, the band is ${band}`);
  }
  const managed = new Set(row.managed);
  /* Round 1040 review: a club with no baked man previews at the 66 the
     picker fills an empty squad with, while it plays at its 61 prior, so its
     preview is a placeholder rather than a rating of anything; a row that
     asks for real pairs leaves those clubs out of the correlation. */
  const empty = row.realPairs ? lg.clubs.filter(c => !managed.has(c) && !(cm.CM_ROSTERS[c]?.length)) : [];
  const field = lg.clubs.filter(c => !managed.has(c) && perClub[c].length && !empty.includes(c));
  if (empty.length) console.log(`   ${empty.length} unmanaged clubs with no baked man left out of the correlation: ${empty.join(', ')}`);
  const rho = spearman(field.map(c => cm.clubPreviewRating(c)), field.map(c => mean(perClub[c])));
  console.log(`   rank correlation, preview rating against mean points, ${field.length} clubs: ${rho.toFixed(3)}`);
  /* Round 1035: a row whose clubs are rated too close together for a rank
     correlation to mean anything sets rhoMin null and leans on its pair. */
  const rhoMin = process.env.CM_NEW_RHO_MIN ? RHO_MIN : (row.rhoMin === undefined ? RHO_MIN : row.rhoMin);
  if (rhoMin === null) console.log(`   (not banded for ${row.id}: its clubs are rated too close together, the pair carries this part)`);
  else if (!(rho >= rhoMin)) fail(`the rank correlation is ${rho.toFixed(3)}, the band is ${rhoMin}`);
}

/* D. Nobody in the league is invented beyond the flagged youth pads. */
function partNoInvented(cm, row, lg) {
  console.log(`D) ${row.id}: no invented men`);
  let real = 0, pads = 0, partial = 0;
  for (const c of lg.clubs) {
    const baked = cm.CM_ROSTERS[c] ?? [];
    const allowed = new Set(baked.length ? baked.map(p => p.n) : cm.__getPool().filter(p => p.club === c).map(p => p.name));
    const squad = cm.__buildSquad(c, 0, 'now');
    for (const p of squad) {
      if (p.isYouth) { pads += 1; continue; }
      if (!allowed.has(p.name)) fail(`${c} fields ${p.name}, who is neither in its real roster nor flagged as a youth pad`);
      else real += 1;
    }
    const isPartial = cm.CM_PARTIAL.includes(c);
    /* Release AH: an A-League squad comes from its ledger, where partial
       also means the club's page has no value for most of its ledger rows
       (Round 1035 review F10; simClubManagerALeague holds that list to the
       ledgers), so the world's partial list must carry the A-League list as
       well as every thin squad. A baked club keeps the bake's rule. */
    const fromLedger = Object.prototype.hasOwnProperty.call(cm.__aleague.CM_ALEAGUE_ROSTERS, c);
    /* Round 1052: the same for every gathered league (scripts/lib/gatheredLeagues.mjs), each from its own generated list. */
    const gatheredMarks = GATHERED_LEAGUES.some(l => (cm[`__g_${l.id}`]?.[`CM_${l.prefix}_PARTIAL`] ?? []).includes(c));
    const wantPartial = baked.length < 8 || (fromLedger && cm.__aleague.CM_ALEAGUE_PARTIAL.includes(c)) || gatheredMarks;
    if (isPartial !== wantPartial) fail(`${c} has ${baked.length} real players${fromLedger ? `, the A-League list ${cm.__aleague.CM_ALEAGUE_PARTIAL.includes(c) ? 'marks' : 'does not mark'} it` : ''}, and CM_PARTIAL says ${isPartial}`);
    if (isPartial !== cm.isPartialClub(c)) fail(`${c}: isPartialClub disagrees with CM_PARTIAL`);
    if (isPartial) partial += 1;
  }
  console.log(`   ${real} real men and ${pads} flagged pads on day one, ${partial} partial clubs`);
  /* Round 1040: a thin second tier sets its own floor (realMin), measured
     and written beside its row; the floor still catches a bake that never
     reached the league. */
  const realFloor = row.realMin ?? 10 * row.size / 2;
  if (real < realFloor) fail(`only ${real} real men in ${row.id} (floor ${realFloor}), the bake did not reach it`);
}

/* E. PYRAMIDS (Round 1040). Every modelled pyramid, the count each pair
   trades every summer, and the mid table club whose career plays three
   summers of it. The relegation career runs at the weakest club of `top`. */
const PYRAMID_EXPECT = [
  { top: 'premier', second: 'championship', count: 3, club: 'Brentford' },
  { top: 'bundesliga', second: 'bundesliga2', count: 2, club: 'Mainz' },
  { top: 'seriea', second: 'serieb', count: 3, club: 'Bologna' },
  { top: 'ligue1', second: 'ligue2', count: 2, club: 'Toulouse' },
  { top: 'laliga', second: 'segunda', count: 3, club: 'Getafe' },
];
const RELEGATION_TOP = 'seriea';
const E_SEEDS = Number(process.env.CM_NEW_E_SEEDS || 2);
const R_TRIES = Number(process.env.CM_NEW_R_TRIES || 8);
const membersOf = (cm, s, id) => s.leagueOverrides?.[id] ?? cm.REAL_LEAGUES.find(l => l.id === id)?.clubs ?? [];
const finishedTable = (cm, s, id) => (cm.careerLeagueOf(s).id === id
  ? cm.sortedLeagueTable(s)
  : cm.sortedWorldTable(s, id, s.world?.[id]?.table ?? [])).map(r => r.club);
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

/* One summer: the finished season `fin` rolls into `next`. Returns the
   clubs moved per league, or null when the summer itself failed. */
/* The finished season's tables and the manager's league, read BEFORE
   startNextSeason registers next season's memberships: read after it, a
   manager relegated or promoted that summer has his finished table filed
   under his new league (measured: every Toulouse summer after a move).
   fin's own leagueOverrides say who was in each league. */
function finishedSnapshot(cm, fin) {
  const tables = {};
  for (const pe of PYRAMID_EXPECT) for (const id of [pe.top, pe.second]) tables[id] = finishedTable(cm, fin, id);
  return { own: cm.careerLeagueOf(fin).id, tables };
}

/* Round 1040 review: wentDown reads a finish against the league it was
   played in only when finishSeason files that league on the season's record
   (leagueId and the table's size). Without them it falls back to the old
   18th and below, which misses Ligue 1's 17th, and partWentDown alone would
   stay green because it writes both fields itself. So every season E and R
   play must file both, read before the summer re-registers the leagues.
   Control: CM_NEW_CONTROL=nohistleague. */
let seasonRecordsChecked = 0;
let summerLinesRead = 0;
function checkSeasonRecord(cm, fin, tag) {
  const h = fin.history[fin.history.length - 1];
  const lg = cm.careerLeagueOf(fin);
  seasonRecordsChecked += 1;
  if (!h || h.leagueId !== lg.id || h.leagueSize !== lg.clubs.length) fail(`${tag}: the finished season's record files league ${h?.leagueId} of size ${h?.leagueSize}, it was played in ${lg.id} of ${lg.clubs.length}`);
}

function checkSummer(cm, fin, next, tag, snap) {
  const moved = {};
  for (const pe of PYRAMID_EXPECT) {
    const p = cm.PYRAMIDS.find(x => x.top === pe.top);
    if (!p || p.second !== pe.second || p.count !== pe.count) { fail(`${tag}: the engine's pyramid for ${pe.top} is ${JSON.stringify(p)}, expected ${pe.second} trading ${pe.count}`); continue; }
    const topBefore = membersOf(cm, fin, pe.top), secBefore = membersOf(cm, fin, pe.second);
    const topAfter = membersOf(cm, next, pe.top), secAfter = membersOf(cm, next, pe.second);
    if (topAfter.length !== topBefore.length || secAfter.length !== secBefore.length) fail(`${tag}: ${pe.top} ${topBefore.length} to ${topAfter.length}, ${pe.second} ${secBefore.length} to ${secAfter.length}`);
    const down = topBefore.filter(c => !topAfter.includes(c));
    const up = topAfter.filter(c => !topBefore.includes(c));
    moved[pe.top] = up.length;
    moved[pe.second] = secAfter.filter(c => !secBefore.includes(c)).length;
    if (down.length !== pe.count || up.length !== pe.count) { fail(`${tag}: ${pe.top} sent ${down.length} down and took ${up.length} up, expected ${pe.count} each way`); continue; }
    const topTable = snap.tables[pe.top].filter(c => topBefore.includes(c));
    const secTable = snap.tables[pe.second].filter(c => secBefore.includes(c));
    if (!sameSet(down, topTable.slice(-pe.count))) fail(`${tag}: ${pe.top} relegated ${down.join(', ')}, its bottom ${pe.count} were ${topTable.slice(-pe.count).join(', ')}`);
    if (!sameSet(up, secTable.slice(0, pe.count))) fail(`${tag}: ${pe.second} promoted ${up.join(', ')}, its top ${pe.count} were ${secTable.slice(0, pe.count).join(', ')}`);
    if (!down.every(c => secAfter.includes(c)) || up.some(c => secAfter.includes(c))) fail(`${tag}: ${pe.second} did not take exactly the relegated clubs`);
    /* Correction 10: the manager's own pyramid gets a line per mover, in
       full, however many other pyramids traded. */
    const own = snap.own;
    if (own === pe.top || own === pe.second) {
      for (const c of [...up, ...down]) if (!(next.aiHeadlines ?? []).some(h => h.includes(c))) fail(`${tag}: no summer line names ${c}, who moved in the manager's own pyramid`);
    }
  }
  /* Round 1040 review: a mover's line names Serie A, Ligue 1, La Liga and
     their second tiers without a stray article ("to the Serie A" read wrong
     every summer). Control: CM_NEW_CONTROL=article. */
  for (const h of (next.aiHeadlines ?? []).filter(x => x.startsWith('\u{2B06}') || x.startsWith('\u{2B07}'))) {
    summerLinesRead += 1;
    if (/\bto the (La Liga|Serie [AB]|Ligue [12])\b/.test(h)) fail(`${tag}: the summer line "${h}" puts "the" before the league`);
  }
  const seen = new Map();
  for (const l of cm.REAL_LEAGUES) for (const c of membersOf(cm, next, l.id)) {
    if (seen.has(c)) fail(`${tag}: ${c} is in ${seen.get(c)} and ${l.id}`);
    seen.set(c, l.id);
  }
  return moved;
}

function partPyramids(cm) {
  console.log(`E) pyramids: ${PYRAMID_EXPECT.map(p => `${p.top}/${p.second} ${p.count}`).join(', ')}`);
  const movedTotals = {};
  let summers = 0, sacked = 0;
  /* A mid table manager the engine plays for is sacked now and then (5 of 6
     careers before their third summer, measured 2026-10-06), so each
     pyramid's careers run until they have played 3 x E_SEEDS summers, a
     sacked one replaced by the next seed, up to 4 x E_SEEDS careers. */
  for (const pe of PYRAMID_EXPECT) {
    let own = 0;
    for (let k = 0; k < 4 * E_SEEDS && own < 3 * E_SEEDS; k++) {
      Math.random = seeded(hashKey(`newleagues${SEED_SET}|E|${pe.top}|${k}`));
      let s = cm.startCareer(pe.club, 'now');
      for (let y = 0; y < 3 && own < 3 * E_SEEDS; y++) {
        const played = playSeason(cm, s, true);
        if (played.stuck) { fail(`E ${pe.club} seed ${k} season ${y + 1}: never ended`); break; }
        if (played.sacked) { sacked += 1; break; }
        const fin = cm.finishSeason(played.state).state;
        checkSeasonRecord(cm, fin, `E ${pe.club} seed ${k} season ${y + 1}`);
        const snap = finishedSnapshot(cm, fin);
        const next = cm.startNextSeason(fin);
        const moved = checkSummer(cm, fin, next, `E ${pe.club} seed ${k} summer ${y + 1}`, snap);
        for (const [id, n] of Object.entries(moved)) (movedTotals[id] ??= []).push(n);
        summers += 1;
        own += 1;
        s = next;
      }
      Math.random = REAL_RANDOM;
    }
    if (own < 3 * E_SEEDS) fail(`E ${pe.top}: only ${own} summers of a ${pe.club} career were played, ${3 * E_SEEDS} wanted`);
  }
  console.log(`   ${seasonRecordsChecked} finished seasons filed their own league and its size on the record; ${summerLinesRead} mover lines read for the league's name`);
  if (!summerLinesRead) fail('E: no mover line was read for the league name');
  if (!seasonRecordsChecked) fail('E: no finished season was checked for its league on the record');
  console.log(`   ${summers} summers checked (${sacked} careers sacked on the way); clubs moved into each league per summer: ${Object.entries(movedTotals).map(([id, a]) => `${id} ${[...new Set(a)].join('/')}`).join(', ')}`);
  partRelegatedCareer(cm);
  partWentDown(cm);
}

/* A career at the weakest club of RELEGATION_TOP, tried until it goes down
   (FAIL, not skip, when none does): it starts the next season in the second
   tier, its news opens with the Relegated line, and the board asks with the
   second tier's promotion ladder. */
function partRelegatedCareer(cm) {
  const pe = PYRAMID_EXPECT.find(p => p.top === RELEGATION_TOP);
  const lg = cm.REAL_LEAGUES.find(l => l.id === pe.top);
  const club = [...lg.clubs].sort((a, b) => cm.clubPreviewRating(a) - cm.clubPreviewRating(b))[0];
  const secondDef = cm.REAL_LEAGUES.find(l => l.id === pe.second);
  const ladderLabels = new Set([`Win the ${secondDef.name}`, 'Win automatic promotion', cm.leagueRulesOf(pe.second).playoff?.label, 'Finish in the top half', 'Stay up. Avoid relegation']);
  let tries = 0, finishes = [];
  for (; tries < R_TRIES; tries++) {
    Math.random = seeded(hashKey(`newleagues${SEED_SET}|R|${club}|${tries}`));
    const played = playSeason(cm, cm.startCareer(club, 'now'), true);
    if (played.stuck || played.sacked) { Math.random = REAL_RANDOM; finishes.push(played.sacked ? 'sacked' : 'stuck'); continue; }
    const fin = cm.finishSeason(played.state).state;
    checkSeasonRecord(cm, fin, `R ${club} try ${tries}`);
    const pos = fin.history[fin.history.length - 1].position;
    finishes.push(pos);
    if (pos <= lg.clubs.length - pe.count) { Math.random = REAL_RANDOM; continue; }
    const prof = cm.wildernessProfile(fin);
    if (prof.departure !== 'relegated' || prof.relegations !== 1) fail(`R: ${club} finished ${pos}th of ${lg.clubs.length} and the record reads departure ${prof.departure}, ${prof.relegations} relegation(s)`);
    const next = cm.startNextSeason(fin);
    const nowIn = cm.careerLeagueOf(next).id;
    if (nowIn !== pe.second) fail(`R: ${club} went down ${pos}th and starts next season in ${nowIn}`);
    if (!(next.aiHeadlines ?? []).some(h => h.includes(`Relegated. ${club} go down to ${secondDef.name}.`))) fail(`R: no Relegated line for ${club}: ${(next.aiHeadlines ?? []).slice(0, 3).join(' | ')}`);
    if (cm.leagueRulesOf(nowIn).ladder !== 'promotion') fail(`R: ${nowIn}'s ladder is ${cm.leagueRulesOf(nowIn).ladder}`);
    const ask = (next.boardObjectives ?? []).find(o => o.id === 'league');
    if (!ask || !ladderLabels.has(ask.label)) fail(`R: ${club}'s board in ${nowIn} asks "${ask?.label}", not a promotion ladder ask`);
    console.log(`   relegation career: ${club} (rated ${cm.clubPreviewRating(club)}) finishes ${finishes.join(', ')}; starts in ${nowIn}, the board asks "${ask?.label}"`);
    Math.random = REAL_RANDOM;
    return;
  }
  fail(`R: ${club} never went down in ${tries} tries (finishes ${finishes.join(', ')})`);
}

/* Correction 8: a finish is a relegation when it sits in the drop zone of
   the league it was played in (size minus drop), for every modelled top
   flight; the place above it is not. */
function partWentDown(cm) {
  for (const pe of PYRAMID_EXPECT) {
    const size = cm.REAL_LEAGUES.find(l => l.id === pe.top).clubs.length;
    const club = cm.REAL_LEAGUES.find(l => l.id === pe.top).clubs[0];
    const base = cm.startCareer(club, 'now');
    const rec = position => cm.wildernessProfile({ ...base, history: [{ season: 1, club, position, points: 30, trophies: [], leagueId: pe.top, leagueSize: size }] });
    const inZone = rec(size - pe.count + 1), above = rec(size - pe.count);
    if (inZone.departure !== 'relegated' || inZone.relegations !== 1) fail(`wentDown: ${size - pe.count + 1}th of ${size} in ${pe.top} reads ${inZone.departure}`);
    if (above.relegations !== 0) fail(`wentDown: ${size - pe.count}th of ${size} in ${pe.top} reads as a relegation`);
  }
  console.log(`   wentDown: the first drop place reads relegated and the place above it does not, in ${PYRAMID_EXPECT.map(p => p.top).join(', ')}`);
}

/* F. CUP UNDERDOGS (Round 1040). A top flight career's cup holds two or
   three second tier clubs of its nation, and the upset flag reads divisions
   (cupDivisionOf), never "in my league or not": from a top flight career and
   from a second tier one alike, a top flight winner over a second tier loser
   is never an upset and the reverse always is. */
const CUP_EXPECT = [
  { top: 'premier', second: 'championship', topClub: 'Brentford', secondClub: 'Middlesbrough' },
  { top: 'bundesliga', second: 'bundesliga2', topClub: 'Mainz', secondClub: null },
  { top: 'seriea', second: 'serieb', topClub: 'Bologna', secondClub: 'Palermo' },
  { top: 'ligue1', second: 'ligue2', topClub: 'Toulouse', secondClub: 'Montpellier' },
  { top: 'laliga', second: 'segunda', topClub: 'Getafe', secondClub: 'Almería' },
];
const F_SEEDS = Number(process.env.CM_NEW_F_SEEDS || 4);
function partCup(cm) {
  console.log('F) cup underdogs and the upset flag');
  /* The Segunda's two reserve sides do not play the Copa del Rey and are not
     in the game at all, so no draw can hold one. */
  for (const r of ['Real Sociedad B', 'Celta Fortuna']) if (cm.clubByName(r)) fail(`F: ${r}, a reserve side, is a club of the game`);
  for (const ce of CUP_EXPECT) {
    const counts = [];
    for (let k = 0; k < F_SEEDS; k++) {
      Math.random = seeded(hashKey(`newleagues${SEED_SET}|F|${ce.top}|${k}`));
      const s = cm.startCareer(ce.topClub, 'now');
      Math.random = REAL_RANDOM;
      const second = new Set(membersOf(cm, s, ce.second));
      const field = new Set((s.cupBracket ?? []).filter(t => t.round === 'R16').flatMap(t => [t.home, t.away]));
      const n = [...field].filter(c => second.has(c)).length;
      counts.push(n);
      if (field.size !== 16) fail(`F ${ce.topClub} seed ${k}: the cup's last sixteen holds ${field.size} clubs`);
      if (n < 2 || n > 3) fail(`F ${ce.topClub} seed ${k}: ${n} ${ce.second} clubs in the cup, expected 2 or 3`);
    }
    let misfires = 0, misses = 0, pairs = 0;
    for (const owner of [ce.topClub, ce.secondClub].filter(Boolean)) {
      const s = cm.startCareer(owner, 'now');
      const tops = membersOf(cm, s, ce.top).filter(c => c !== owner).slice(0, 8);
      const seconds = membersOf(cm, s, ce.second).filter(c => c !== owner).slice(0, 8);
      for (const t of tops) for (const d of seconds) {
        pairs += 1;
        if (cm.__isCupUpset(s, t, d)) misfires += 1;
        if (!cm.__isCupUpset(s, d, t)) misses += 1;
      }
    }
    console.log(`   ${ce.top}: ${ce.second} clubs in the last sixteen ${counts.join(' ')}; over ${pairs} pairings a top flight winner was flagged an upset ${misfires} times and a ${ce.second} winner went unflagged ${misses} times`);
    if (misfires) fail(`F ${ce.top}: a top flight club beating a ${ce.second} club was flagged a giant killing ${misfires} times`);
    if (misses) fail(`F ${ce.top}: a ${ce.second} club beating a top flight club went unflagged ${misses} times`);
  }
  /* Round 1040 review: cupDivisionOf reads a club's own ladder, so MLS East
     and MLS West, one division in two conferences that share the U.S. Open
     Cup, are both the top division. Before the round "not my league" made the
     other conference the lower division: two or three of its clubs were drawn
     as the underdogs and a win over them read as a giant killing. Neither
     conference beating the other is an upset now, and the draw seeds no
     second tier. The cupold control turns this red too. */
  {
    const owner = cm.REAL_LEAGUES.find(l => l.id === 'mlsEast').clubs[0];
    Math.random = seeded(hashKey(`newleagues${SEED_SET}|F|mls`));
    const s = cm.startCareer(owner, 'now');
    Math.random = REAL_RANDOM;
    const east = membersOf(cm, s, 'mlsEast').filter(c => c !== owner).slice(0, 8);
    const west = membersOf(cm, s, 'mlsWest').slice(0, 8);
    let flagged = 0, pairs = 0;
    for (const e of east) for (const w of west) {
      pairs += 2;
      if (cm.__isCupUpset(s, e, w)) flagged += 1;
      if (cm.__isCupUpset(s, w, e)) flagged += 1;
    }
    const r16 = (s.cupBracket ?? []).filter(t => t.round === 'R16');
    console.log(`   MLS (${owner}): ${r16.length} cup ties in the last sixteen; over ${pairs} East and West pairings ${flagged} flagged an upset`);
    if (!pairs) fail('F MLS: no East and West pairing was read');
    if (flagged) fail(`F MLS: a win between the two MLS conferences was flagged a giant killing ${flagged} times, but they are one division`);
  }
}

/* G. OLD SAVE (Round 1040). scripts/data/cmSecondTierOldSaveFixture.json is
   a save the engine wrote BEFORE this round (release-ah fc30942e: Valencia,
   four league weeks left, seed 1040, a world of 22 leagues with no Serie B).
   It loads, finishes, rolls its first summer without a throw while the
   pairs it has no table for stay put, and the summer after trades them. */
const OLD_SAVE_NEW_PAIRS = ['seriea', 'ligue1', 'laliga'];
function partOldSave(cm) {
  console.log('G) a save written before the round');
  const raw = fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'cmSecondTierOldSaveFixture.json'), 'utf8');
  const missing = OLD_SAVE_NEW_PAIRS.map(t => cm.PYRAMIDS.find(p => p.top === t)?.second).filter(id => JSON.parse(raw).world?.[id]);
  if (missing.length) { fail(`G: the fixture already carries a world table for ${missing.join(', ')}, so it is not a pre-round save`); return; }
  store.clear();
  store.set(cm.SAVE_KEY, raw);
  let s;
  try { s = cm.loadCareer(); } catch (e) { fail(`G: loading threw ${e.message}`); return; }
  if (!s || s.clubName !== 'Valencia') { fail(`G: the old save did not load (${s?.clubName})`); return; }
  Math.random = seeded(hashKey(`newleagues${SEED_SET}|G|1`));
  let fin1, next1;
  try {
    const played = playSeason(cm, s, true);
    if (played.stuck || played.sacked) { fail(`G: the old save's season did not finish (${played.sacked ? 'sacked' : 'stuck'})`); Math.random = REAL_RANDOM; return; }
    fin1 = cm.finishSeason(played.state).state;
    next1 = cm.startNextSeason(fin1);
  } catch (e) { fail(`G: the old save's first summer threw ${e.stack}`); Math.random = REAL_RANDOM; return; }
  for (const top of OLD_SAVE_NEW_PAIRS) {
    const stat = cm.REAL_LEAGUES.find(l => l.id === top).clubs;
    if (!sameSet(membersOf(cm, next1, top), stat)) fail(`G: ${top} traded in the first summer of a save that had no table for its second tier`);
  }
  const prem = membersOf(cm, next1, 'premier').filter(c => !cm.REAL_LEAGUES.find(l => l.id === 'premier').clubs.includes(c)).length;
  if (prem !== 3) fail(`G: the Premier League took ${prem} clubs up in the old save's first summer, the summer did not run`);
  let traded = null;
  for (let k = 0; k < 4 && traded === null; k++) {
    Math.random = seeded(hashKey(`newleagues${SEED_SET}|G|2|${k}`));
    const played = playSeason(cm, JSON.parse(JSON.stringify(next1)), true);
    if (played.stuck || played.sacked) continue;
    const fin2 = cm.finishSeason(played.state).state;
    const snap2 = finishedSnapshot(cm, fin2);
    const next2 = cm.startNextSeason(fin2);
    traded = OLD_SAVE_NEW_PAIRS.map(top => membersOf(cm, next2, top).filter(c => !membersOf(cm, fin2, top).includes(c)).length);
    checkSummer(cm, fin2, next2, `G summer 2 seed ${k}`, snap2);
  }
  Math.random = REAL_RANDOM;
  console.log(`   loaded, finished, first summer: ${OLD_SAVE_NEW_PAIRS.join(', ')} kept their clubs and the Premier League took ${prem} up; second summer traded ${traded?.join(', ')}`);
  if (traded === null) fail('G: no second season finished in four tries');
  else OLD_SAVE_NEW_PAIRS.forEach((top, i) => { if (traded[i] !== PYRAMID_EXPECT.find(p => p.top === top).count) fail(`G: ${top} traded ${traded[i]} in the second summer`); });
}

const cm = await bundleEngine();
if (CONTROL === 'swap') {
  /* Round 1040: Serie B's two pairs share Cremonese, so a club already
     swapped is not swapped back by the second pair. */
  const done = new Set();
  /* Round 1052: the Russian pairs have a control of their own (ruswap). This one refuses a pair whose
     strong club does not carry the bigger roster, and Zenit ships 20 men to Fakel Voronezh's 21 (a
     gathered squad is as long as two lists agree it is), so with the Russian pairs in it the control
     refused to run at all (remote check r1052-g2). */
  for (const [a, b] of NEW_LEAGUES.filter(r => r.id !== 'russia').flatMap(r => r.pairs)) {
    if (done.has(a) || done.has(b)) continue;
    if (!(cm.CM_ROSTERS[a]?.length > (cm.CM_ROSTERS[b]?.length ?? 0))) { console.error(`control swap: ${a} does not carry a bigger roster than ${b}; refusing to run`); process.exit(1); }
    [cm.CM_ROSTERS[a], cm.CM_ROSTERS[b]] = [cm.CM_ROSTERS[b] ?? [], cm.CM_ROSTERS[a]];
    done.add(a); done.add(b);
  }
}
if (CONTROL === 'emptypair') {
  /* Round 1040 review: Serie B keeps no pair after the review's withholds,
     so the control swaps the Segunda's pair to empty Tenerife instead. */
  const row = NEW_LEAGUES.find(r => r.id === 'segunda');
  if (!row || row.pairs[0]?.[1] !== 'Mallorca' || (cm.CM_ROSTERS.Tenerife?.length ?? 0) !== 0) { console.error('control emptypair: the Segunda pair or the empty Tenerife is not there; refusing to run'); process.exit(1); }
  row.pairs[0] = [row.pairs[0][0], 'Tenerife'];
  console.log('NEGATIVE CONTROL ON: a Segunda pair sets Girona against empty Tenerife; the real squad pair rule must go red');
}
if (CONTROL === 'ruswap') {
  /* Round 1052: the Russian pairs swap rosters in memory, nothing else moves: part C red for russia alone. */
  for (const [a, b] of NEW_LEAGUES.find(r => r.id === 'russia')?.pairs ?? []) {
    if (!(cm.CM_ROSTERS[a]?.length && cm.CM_ROSTERS[b]?.length) || cm.clubPreviewRating(a) <= cm.clubPreviewRating(b)) { console.error(`control ruswap: ${a} is not rated over ${b}; refusing to run`); process.exit(1); }
    [cm.CM_ROSTERS[a], cm.CM_ROSTERS[b]] = [cm.CM_ROSTERS[b], cm.CM_ROSTERS[a]];
  }
}

/* H. COUNTRIES (Round 1052). What a new country must not break, by outcome.
   H1. No Europe from Russia: a Zenit career has no Champions League group in
       season one, and a career that wins the league has none the season
       after (the title is played for, never forced: Zenit careers are played
       until three have won it).
   H2. The Russian Cup's last sixteen is the sixteen Russian clubs, no bye
       and no club of another nation, on every seed read.
   H3. The job market offers exactly the league's sixteen clubs under Russia
       with the league's name; the dugout's table knows the league is 16 and
       the playing career's table still does not; a manager's table at
       Spartak Moscow has sixteen places and names Zenit.
   H4. The past seasons keep their own Russia: every Russian club a past
       season's Champions League field names is rated, in a fresh career of
       that season seeded 1052, at exactly the value the engine gave BEFORE
       the round (src/test/fixtures/cmWorldIdentity1052.json, eraFlavour),
       never off the 2026 squad that now carries the same club name; and
       the side the engine would line up for that club in that season
       (oppRosterFor) holds no man of today's Russian squads. */
async function partCountries(cm) {
  console.log('H) the countries of Round 1052');
  /* ruswap hands Zenit the weakest squad of the league, so no title is won and H1 has nothing to read:
     that control is part C's, and this part says so rather than going red beside it. */
  if (CONTROL === 'ruswap') { console.log('   not read under ruswap (Zenit carries Fakel Voronezh\'s squad)'); return; }
  const ru = cm.REAL_LEAGUES.find(l => l.id === 'russia');
  if (!ru) { fail('H: russia is not in REAL_LEAGUES'); return; }
  /* the parts before this one traded clubs in their summers: the static world is put back first */
  cm.registerLeagueOverrides(null);
  /* H1 */
  Math.random = seeded(hashKey('newleagues|H1|start'));
  const z0 = cm.startCareer('Zenit', 'now');
  Math.random = REAL_RANDOM;
  if (z0.uclGroup) fail('H1: a Zenit career starts in a Champions League group');
  let titles = 0, played = 0, afterTitleInEurope = 0;
  for (let k = 0; k < 16 && titles < 3; k++) {
    Math.random = seeded(hashKey(`newleagues${SEED_SET}|H1|${k}`));
    const season = playSeason(cm, cm.startCareer('Zenit', 'now'), true);
    if (season.stuck || season.sacked) continue;
    played += 1;
    const fin = cm.finishSeason(season.state).state;
    if (fin.history[fin.history.length - 1].position !== 1) continue;
    titles += 1;
    const next = cm.startNextSeason(fin);
    if (next.uclGroup) afterTitleInEurope += 1;
  }
  Math.random = REAL_RANDOM;
  console.log(`   H1: Zenit won the league in ${titles} of ${played} seasons played; ${afterTitleInEurope} of those started the next season in a Champions League group`);
  if (titles < 3) fail(`H1: only ${titles} Zenit titles in ${played} seasons, three are needed to read the season after one`);
  if (afterTitleInEurope) fail(`H1: ${afterTitleInEurope} title winners started the next season in the Champions League`);
  /* H2 */
  let brackets = 0;
  for (const club of ['Zenit', 'Rostov', 'Fakel Voronezh']) for (let k = 0; k < 4; k++) {
    Math.random = seeded(hashKey(`newleagues${SEED_SET}|H2|${club}|${k}`));
    const s = cm.startCareer(club, 'now');
    Math.random = REAL_RANDOM;
    const field = new Set((s.cupBracket ?? []).filter(x => x.round === 'R16').flatMap(x => [x.home, x.away]));
    brackets += 1;
    if (field.size !== 16) fail(`H2 ${club} seed ${k}: the Russian Cup's last sixteen holds ${field.size} clubs`);
    const strangers = [...field].filter(c => !ru.clubs.includes(c));
    if (strangers.length) fail(`H2 ${club} seed ${k}: the Russian Cup drew ${strangers.join(', ')}`);
  }
  console.log(`   H2: ${brackets} Russian Cup brackets read, each the sixteen Russian clubs`);
  /* H3 */
  const offers = cm.__jobs.allOfferClubs().filter(o => o.country === 'Russia');
  const offered = offers.map(o => o.name ?? o.club).sort();
  if (JSON.stringify(offered) !== JSON.stringify([...ru.clubs].sort())) fail(`H3: the job market's Russian clubs are ${offered.length} (${offered.slice(0, 4).join(', ')}...), not the league's sixteen`);
  for (const o of offers) if (o.league !== ru.name) fail(`H3: the job market files ${o.name ?? o.club} under ${o.league}`);
  if (cm.__scl.leagueSizeFor(ru.name, 2026, true) !== 16) fail(`H3: the dugout's table says ${cm.__scl.leagueSizeFor(ru.name, 2026, true)} for ${ru.name}, not 16`);
  if (cm.__scl.leagueSizeFor(ru.name, 2026) !== null) fail(`H3: the playing career's table now sizes ${ru.name} (${cm.__scl.leagueSizeFor(ru.name, 2026)}); that table did not change`);
  /* The table a manager's season is played in, as the career builds it (soccerCareerEngine calls this with the
     career's club list and the job's league label): a job at Spartak Moscow under the label the market gives it.
     Control rulabel: the job's league label respelled, so the table finds no league under it and this goes red. */
  const spartak = offers.find(o => (o.name ?? o.club) === 'Spartak Moscow');
  if (!spartak) fail('H3: the job market offers no Spartak Moscow');
  else {
    const field = cm.__scl.managerLeagueField({ clubs: cm.__careerClubs, club: 'Spartak Moscow', league: CONTROL === 'rulabel' ? `${spartak.league} Of The Control` : spartak.league, year: 2026 }, seeded(hashKey('newleagues|H3|field')));
    if (field.size !== ru.clubs.length || field.sizeVerified !== true) fail(`H3: a manager's table at Spartak Moscow has ${field.size} places (verified ${field.sizeVerified}), the league has ${ru.clubs.length}`);
    if (!field.named.includes('Zenit')) fail(`H3: a manager's table at Spartak Moscow names ${field.named.join(', ') || 'nobody'}, not Zenit`);
    const strangers = field.named.filter(n => !ru.clubs.includes(n));
    if (strangers.length) fail(`H3: a manager's table at Spartak Moscow names ${strangers.join(', ')}, no member of ${ru.name}`);
    console.log(`   H3: a manager's table at Spartak Moscow under "${spartak.league}": ${field.size} places, size verified ${field.sizeVerified}, names ${field.named.join(', ') || 'nobody'}`);
  }
  console.log(`   H3: ${offers.length} Russian clubs on the job market under ${ru.name}; dugout size ${cm.__scl.leagueSizeFor(ru.name, 2026, true)}, playing career size ${cm.__scl.leagueSizeFor(ru.name, 2026)}`);
  /* H4 */
  await cm.__ensureAllEraRosters();
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'test', 'fixtures', 'cmWorldIdentity1052.json'), 'utf8'));
  const lcg = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
  let read = 0;
  const careers = new Map();
  for (const row of fixture.eraFlavour) {
    if (!careers.has(row.season)) { Math.random = lcg(1052); careers.set(row.season, cm.startCareer(fixture.eraClub, row.season)); Math.random = REAL_RANDOM; }
    const got = cm.strengthOf(careers.get(row.season), row.club);
    read += 1;
    if (got !== row.value) fail(`H4: ${row.club} in ${row.season} is rated ${got}, the engine gave ${row.value} before the round`);
    if (!ru.clubs.includes(row.club)) fail(`H4: ${row.club} is a past season's Russian club and no member of today's league, so this check reads nothing`);
  }
  console.log(`   H4: ${read} past season Russian clubs read, each at its own season's strength`);
  /* Second half: the MEN. A past season's Russian opponent is fielded from that season's own world, never from
     the 2026 squad that now carries the same club name: for every fixture row, the side the engine would line
     up against the manager (oppRosterFor, what the match text, the scorers and a shootout read) holds no man
     of today's generated Russian squads. Control rumen: the past season's career is handed today's squad for
     that club the way a missing era gate would, and this goes red. */
  const todays = new Set(ru.clubs.flatMap(c => (cm.CM_ROSTERS[c] ?? []).map(p => p.n)));
  if (todays.size < 300) fail(`H4: only ${todays.size} men in today's Russian squads, so the second half reads nothing`);
  let sides = 0, fielded = 0, leaked = 0;
  for (const row of fixture.eraFlavour) {
    const career = careers.get(row.season);
    const side = CONTROL === 'rumen' ? (cm.CM_ROSTERS[row.club] ?? []).map(p => ({ n: p.n })) : cm.oppRosterFor(career, row.club);
    sides += 1; fielded += side.length;
    const here = side.filter(p => todays.has(p.n ?? p.name)).map(p => p.n ?? p.name);
    if (here.length) { leaked += here.length; fail(`H4: ${row.club} in ${row.season} would field ${here.length} men of 2026 (${here.slice(0, 3).join(', ')})`); }
  }
  console.log(`   H4: ${sides} past season Russian sides read, ${fielded} men fielded, ${leaked} of them from today's squads`);
  if (read < 7) fail(`H4: only ${read} past season rows read, the fixture held 7`);
}

if (PARTS.includes('A')) { console.log('THIN facts'); partThin(); }
if (PARTS.includes('A') || PARTS.includes('D')) {
  for (const row of NEW_LEAGUES.filter(r => !ROWS || ROWS.includes(r.id))) {
    const lg = partRows(cm, row);
    if (!lg) continue;
    const perClub = partSeasons(cm, row, lg);
    partStrength(cm, row, lg, perClub);
    partNoInvented(cm, row, lg);
  }
}
if (PARTS.includes('E')) partPyramids(cm);
if (PARTS.includes('F')) partCup(cm);
if (PARTS.includes('G')) partOldSave(cm);
if (PARTS.includes('H')) await partCountries(cm);
console.log(failures ? `simClubManagerNewLeagues: ${failures} failure(s)${CONTROL ? ` under control ${CONTROL}` : ''}` : `simClubManagerNewLeagues: all checks passed${CONTROL ? ` (control ${CONTROL} did NOT fire)` : ''}`);
process.exit(failures ? 1 : 0);
