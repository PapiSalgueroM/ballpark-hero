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
      CM_PARTIAL exactly when it has fewer than 8 real players.

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
      does not.
   F. CUP UNDERDOGS (hard). A top flight career's domestic cup holds two or
      three clubs of its second tier, and a top flight winner over a second
      tier loser is never an upset while the reverse always is, asked from a
      top flight career and from a second tier one.
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
   Serie B (A to D): only Pisa, Verona and Cremonese carry 8 or more real
   men, so the one pair is Pisa (rated 74) over Cremonese (71); Verona (73)
   over Cremonese measured 8.7, 2.6, 2.2, 5.7, 8.8 and 3.5 points over 24
   seasons, SIM_SEED unset and 1 to 5, a two point rating gap that noise
   swamps, so it is not a pair. Six seasons a run were too few (Pisa's gap
   12.0, 4.0, 11.0), so the row plays 48: gap 10.3, 5.8, 7.9, 8.4, 6.4, 9.3
   (mean 8.0, standard deviation 1.7, band 2, 3.5 deviations clear); rank
   correlation over the 14 unmanaged clubs 0.755, 0.705, 0.633, 0.809,
   0.800, 0.755 (band 0.4). Day one: 119 real men, 208 flagged pads, 16 of
   20 clubs partial.

   Ligue 2 (the round's second step, which also takes Ligue 1's drop from
   three to two, the real league's): Nantes (14 real men), Saint-Étienne
   (13) and Reims (12) are its only squads at 8 or more and they are rated
   73, 72 and 72, so Nantes over Saint-Étienne measured 6.3, 4.0, 5.8, 2.4,
   3.6 and 7.0 points over 48 seasons, SIM_SEED unset and 1 to 5 (mean 4.9,
   standard deviation 1.7: a band of 2 would be a coin toss), and the row
   keeps no pair. Its part C is the rank correlation over the 12 unmanaged
   clubs: 0.629, 0.615, 0.671, 0.735, 0.565, 0.728 (band 0.4). Day one: 79
   real men, 213 flagged pads, 15 of 18 clubs partial, so its floor of real
   men is its own (realMin 60) rather than ten a club. The F part's Coupe de
   France holds 2 or 3 Ligue 2 clubs; part E trades ligue1 2 and ligue2 2.
   Parts E, G and the relegation career hold the board at full confidence
   before every entry: the engine sacked a mid table manager before his
   third summer in 21 of 29 careers, which starved E of summers (Mainz
   reached 4 of 6) and ended every one of G's four second seasons.

   The Segunda División (the round's third step): 20 of the real 22 clubs,
   the two reserve sides left out. Girona (13 real men), Mallorca (12), Real
   Oviedo (9) and Las Palmas (8) are its squads at 8 or more, so the pairs
   are Girona (rated 75) over Real Oviedo (69) and Mallorca (72) over Las
   Palmas (68). 48 seasons a run, SIM_SEED unset and 1 to 5: Girona over
   Oviedo 19.4, 21.8, 18.2, 19.5, 19.3, 17.4; Mallorca over Las Palmas 10.4,
   12.8, 8.3, 11.5, 12.6, 10.4 (mean 11.0, standard deviation 1.6, band 4,
   4.4 deviations clear); rank correlation over the 14 unmanaged clubs
   0.740, 0.682, 0.606, 0.789, 0.706, 0.805 (band 0.4). Day one: 87 real
   men, 239 flagged pads, 16 of 20 clubs partial (realMin 60, as Ligue 2).
   Part F also holds that neither reserve side is a club of the game.

   Round 1040's controls (each must turn the run red):
     CM_NEW_CONTROL=nopyramid  Serie A loses its second tier: E red;
     CM_NEW_CONTROL=emptypair  Serie B's pair sets Pisa against empty
                               Arezzo: the real squad pair rule red;
     CM_NEW_CONTROL=crowd      the summer news cap goes back to five lines:
                               E red (a Serie A career's sixth mover);
     CM_NEW_CONTROL=cupold     a cup club's division is "in my league or
                               not" again: F red;
     CM_NEW_CONTROL=ligue1drop3  Ligue 1 relegates three again: the Ligue 2
                               row's top flight drop (A) and E red;
     CM_NEW_CONTROL=reserve    Real Sociedad B joins the Segunda: its size
                               (A) and F's reserve check red.

   Run: node scripts/simClubManagerNewLeagues.mjs   (SIM_SEEDS=n, default 6; a row may ask for more)
        CM_NEW_PARTS=AD or EFG runs those parts, CM_NEW_ROWS=serieb those rows
*/
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const SEEDS_ALL = Number(process.env.SIM_SEEDS || 6);
const SEED_SET = process.env.SIM_SEED || "";
const CONTROL = process.env.CM_NEW_CONTROL || '';
const CONTROLS = ['dropcount', 'nocup', 'swap', 'invented', 'cupon', 'dropcount2', 'nopyramid', 'emptypair', 'crowd', 'cupold', 'ligue1drop3', 'reserve'];
/* Round 1040: parts E to G can be run alone (CM_NEW_PARTS=EFG), the A to D
   league rows alone (CM_NEW_PARTS=AD), or every part (unset). */
const PARTS = process.env.CM_NEW_PARTS || 'ADEFG';
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
  /* Round 1040: Serie B, Serie A's second tier. Only three of its twenty
     clubs carry 8 or more real men (Pisa 18, Verona 13, Cremonese 10, all
     three down from Serie A), so the one pair is Pisa over Cremonese (Verona
     over Cremonese is a two point rating gap noise swamps) and every other
     club is mostly youth pads. 48 seasons a run; MEASURED in the Round 1040
     header section. */
  {
    id: 'serieb', size: 20, drop: 3, topDrop: 3, cup: 'Coppa Italia', pairGap: 2, rhoMin: 0.4, realPairs: true, seeds: 48,
    pairs: [['Pisa', 'Cremonese']],
    managed: ['Palermo', 'Sampdoria', 'Empoli', 'Modena', 'Cesena', 'Padova'],
  },
  /* Round 1040: Ligue 2, Ligue 1's second tier. Nantes (14 real men),
     Saint-Étienne (13) and Reims (12) are the only clubs with 8 or more and
     they are rated 73, 72 and 72, so no pair of real squads has a rating
     gap noise does not swamp (Nantes over Saint-Étienne measured 2.4 to 7.0
     points over 48 seasons). The row keeps no pair, and part C here is the
     rank correlation alone. MEASURED in the Round 1040 header section. */
  {
    id: 'ligue2', size: 18, drop: 2, topDrop: 2, cup: 'Coupe de France', pairGap: 2, rhoMin: 0.4, realPairs: true, seeds: 48, realMin: 60,
    pairs: [],
    managed: ['Montpellier', 'Metz', 'Guingamp', 'Dunkerque', 'Annecy', 'Laval'],
  },
  /* Round 1040: the Segunda División, La Liga's second tier: 20 of the real
     22 clubs (the two reserve sides are left out). Girona (13 real men),
     Mallorca (12), Real Oviedo (9) and Las Palmas (8) carry 8 or more.
     MEASURED in the Round 1040 header section. */
  {
    id: 'segunda', size: 20, drop: 4, topDrop: 3, cup: 'Copa del Rey', pairGap: 4, rhoMin: 0.4, realPairs: true, seeds: 48, realMin: 60,
    pairs: [['Girona', 'Real Oviedo'], ['Mallorca', 'Las Palmas']],
    managed: ['Almería', 'Leganés', 'Sporting Gijón', 'Granada', 'Cádiz', 'Castellón'],
  },
];
/* Round 1040: a pair is only evidence when both clubs field real men, so a
   pair needs 8 or more baked players a side (the CM_PARTIAL line); the
   emptypair control swaps one in for an empty club and must turn this red. */
const PAIR_MIN_REAL = 8;
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
  if (CONTROL === 'cupold') src = mutateOnce(src, "return leagueRulesOf(lg.id).ladder === 'promotion' ? 2 : 1;", 'return lg.id === careerLeagueOf(state).id ? 1 : 2;', 'cupold');
  /* Private helpers the checks ask directly. */
  return `${src}\nexport { relegationSpots as __relegationSpots, buildSquad as __buildSquad, getPool as __getPool, isCupUpset as __isCupUpset };\n`;
}

async function bundleEngine() {
  const entry = path.join(TMP, 'entry.mjs');
  const out = path.join(TMP, 'engine.mjs');
  fs.writeFileSync(entry, `export * from '${ROOT_FWD}/src/lib/clubManager.ts';\n`);
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
  /* The weakest club by the engine's own preview is asked to stay up. */
  const byRating = [...lg.clubs].sort((a, b) => cm.clubPreviewRating(a) - cm.clubPreviewRating(b));
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
  const field = lg.clubs.filter(c => !managed.has(c) && perClub[c].length);
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
    if (isPartial !== (baked.length < 8)) fail(`${c} has ${baked.length} real players and CM_PARTIAL says ${isPartial}`);
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
    const pos = fin.history[fin.history.length - 1].position;
    finishes.push(pos);
    if (pos <= lg.clubs.length - pe.count) { Math.random = REAL_RANDOM; continue; }
    const prof = cm.wildernessProfile(fin);
    if (prof.departure !== 'relegated' || prof.relegations !== 1) fail(`R: ${club} finished ${pos}th of ${lg.clubs.length} and the record reads departure ${prof.departure}, ${prof.relegations} relegation(s)`);
    const next = cm.startNextSeason(fin);
    const nowIn = cm.careerLeagueOf(next).id;
    if (nowIn !== pe.second) fail(`R: ${club} went down ${pos}th and starts next season in ${nowIn}`);
    if (!(next.aiHeadlines ?? []).some(h => h.includes(`Relegated. ${club} go down to the ${secondDef.name}.`))) fail(`R: no Relegated line for ${club}: ${(next.aiHeadlines ?? []).slice(0, 3).join(' | ')}`);
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
  for (const [a, b] of NEW_LEAGUES.flatMap(r => r.pairs)) {
    if (done.has(a) || done.has(b)) continue;
    if (!(cm.CM_ROSTERS[a]?.length > (cm.CM_ROSTERS[b]?.length ?? 0))) { console.error(`control swap: ${a} does not carry a bigger roster than ${b}; refusing to run`); process.exit(1); }
    [cm.CM_ROSTERS[a], cm.CM_ROSTERS[b]] = [cm.CM_ROSTERS[b] ?? [], cm.CM_ROSTERS[a]];
    done.add(a); done.add(b);
  }
}
if (CONTROL === 'emptypair') {
  const row = NEW_LEAGUES.find(r => r.id === 'serieb');
  if (!row || row.pairs[0][1] !== 'Cremonese' || (cm.CM_ROSTERS.Arezzo?.length ?? 0) !== 0) { console.error('control emptypair: the Serie B pair or the empty Arezzo is not there; refusing to run'); process.exit(1); }
  row.pairs[0] = [row.pairs[0][0], 'Arezzo'];
  console.log('NEGATIVE CONTROL ON: a Serie B pair sets Pisa against empty Arezzo; the real squad pair rule must go red');
}
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
console.log(failures ? `simClubManagerNewLeagues: ${failures} failure(s)${CONTROL ? ` under control ${CONTROL}` : ''}` : `simClubManagerNewLeagues: all checks passed${CONTROL ? ` (control ${CONTROL} did NOT fire)` : ''}`);
process.exit(failures ? 1 : 0);
