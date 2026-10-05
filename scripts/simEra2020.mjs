/**
 * Round 971 harness: the 2020-21 era is real, sealed, and plays like 2020-21.
 *
 * The fourth past season and the first born a full big five (the Premier
 * League, La Liga, Serie A, the Bundesliga and Ligue 1, 98 clubs), baked by
 * scripts/bakeEra2020.mjs through the shared extend step. The same promises
 * the 2015 era makes (scripts/simEra2015.mjs), measured the same way:
 *
 *   1. YEAR ZERO IDENTITY. A fresh 2020 save is handed the real 2020 squad,
 *      name for name both directions, age for age, rating through the
 *      documented uplift: Bayern, PSG, Manchester City and Barcelona.
 *   2. ERA ISOLATION AND THE NAMESAKE PASS. No 2026-only player on a 2020
 *      market and no 2020-only player on the 2026 one; every name the 2020
 *      world shares with today, 2015, 2010 or 2005 ages by that gap (a
 *      snapshot wobbles a year either side), unless it is a listed pair of
 *      two men, each with the evidence beside it.
 *   3. THE LADDER over all 98 clubs: the giants told to win it, the promoted
 *      thin squads told nothing of the sort, nobody promised the Conference
 *      League, every nation's own cup in the cup demand.
 *   4. SEASONS COMPLETE and land plausibly, six seeds each (numbers below).
 *   5. THE BAKE'S OWN ACCOUNTING: 98 clubs, the measured player count, the
 *      five thin clubs by name, one man at one club in the whole world, a
 *      sample of the summer 2020 window both ways (the movers where the
 *      records put them, the leavers gone), and the biggest movers NO
 *      record placed printed by name, so the gap is measured, not hidden.
 *   6. THE UPLIFT: 2020 money is close to 2026 money, so the gain is small
 *      (0.06): the uplifted top 50 sits within half a point of the modern
 *      top 50 on average (never read off the single best man), raw 93
 *      lands at 94, order is kept, 88 and below untouched.
 *   7. THE CHAMPIONS LEAGUE FIELD: the real 32 clubs of 2020-21, nineteen of
 *      them baked squads, eight groups into a round of 16, away goals on.
 *   8. THE MARKET AND THE CARD: every past season's transfer market files a
 *      man under the league his club plays in that season (the screen asks
 *      the save's era, never today's table), and the card's "every match
 *      here allows three" changes is the engine's MAX_SUBS. And leagueOf's
 *      fallback for a club only the past knows reads the eras in a fixed
 *      order, so reversing ERA_LEAGUES moves no club.
 *
 * MEASURED 2026-10-03 on this tree, six seeds each (the streams in section 4):
 *   Bayern 4,1,1,2,1,1 (mean 1.67), PSG 1,2,1,1,1,1 (mean 1.17), Manchester
 *   City 3,3,1,5,3,2 (mean 2.83), Crotone, the thinnest squad of the era with
 *   three real players, 20,19,20,20,20,19 (mean 19.67). The bands are on the
 *   MEANS: a giant must average 5.0 or better (2.17 places of headroom over
 *   the worst giant mean, City's) and Crotone 14 or worse (5.67 places of
 *   headroom). No band reads a single seed. The namesake floors of section 2
 *   sit at about half the men measured as shared: 821 with today, 572 with
 *   2015, 80 with 2010 and 10 with 2005.
 *
 * RE-MEASURED 2026-10-05 on the tree merged with Release AC (main's engine
 *   moved the random stream), under ten seed families (family f uses seeds
 *   i * 7919 + f * 1000003, family 0 is this harness's own, the scheme
 *   simEra2010 records). Manchester City's family means: 4.67, 2.00, 2.17,
 *   3.00, 2.33, 2.67, 1.83, 2.50, 2.33, 2.17 (centre about 2.6, spread
 *   about 0.8, and family 0 is the tail: 2,9,1,3,9,4). Against the 5.0 giant
 *   band that was a coin toss, so City has its own band, 6.0, over four
 *   spreads out and still far under the 10.5 a coin flip of a strength
 *   model averages. Bayern (1.00, 1.67, 2.67, 1.00, 1.33, 1.50, 1.00, 1.33,
 *   1.50, 1.33) and PSG (1.00, 1.50, 1.50, 1.00, 1.00, 1.83, 1.00, 1.00,
 *   1.17, 1.00) keep the 5.0 band with over two places to spare in every
 *   family, and Crotone (19.67, 19.50, 19.50, 19.83, 20.00, 19.83, 19.50,
 *   20.00, 20.00, 19.67) keeps its 14 floor. The bigger 2010-11 world shares
 *   165 names with 2020 now, five of them listed pairs of two men.
 *
 * RE-MEASURED 2026-10-05 after the review's bake fix (fifteen leavers out,
 *   Morata, Barreca, Juan Miranda and Pierre-Gabriel moved: 1,774 players),
 *   family 0: Bayern 2,1,3,1,1,1 (1.50), PSG 3,1,2,1,1,1 (1.50), Manchester
 *   City 6,7,2,3,1,2 (3.50), Crotone 20 every seed (20.00). Every mean sits
 *   inside the family spread above, so the bands stand.
 *
 * Eight negative controls, SIM_ERA2020_CONTROL=dupe|stale|fourleagues|nofield|swapfinish|nolift|modernmarket|eraorder,
 * each of which must end the run red (see the block where they are defined).
 *
 * Run: node scripts/simEra2020.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAG = `${process.pid}-${Date.now()}`;
const ENTRY = path.join(os.tmpdir(), `era2020Entry-${TAG}.mjs`);
const BUNDLE = path.join(os.tmpdir(), `era2020-${TAG}.bundle.mjs`);
const R = ROOT.replaceAll('\\', '/');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${R}/src/lib/clubManager.ts');
const eras = await import('${R}/src/lib/clubManagerEras.ts');
const e20 = await import('${R}/src/data/clubManagerEra2020.ts');
const e15 = await import('${R}/src/data/clubManagerEra2015.ts');
const e10 = await import('${R}/src/data/clubManagerEra2010.ts');
const e05 = await import('${R}/src/data/clubManagerEra2005.ts');
const modern = await import('${R}/src/data/clubManagerRosters.ts');
export { engine, eras, e20, e15, e10, e05, modern };
`);
/* esbuild through its JS API, resolved by walk-up, so the harness runs from
   the repo and from a worktree whose node_modules is the repo's. */
const { build } = await import('esbuild');
/* Control eraorder (section 8) is the one control that edits the engine as
   it is bundled: leagueOf's fallback loses its fixed era order and reads
   ERA_LEAGUES in insertion order again, as it did before the closing check.
   The anchor must be in the source or the control refuses (exit 2). */
const ERA_ORDER_ANCHOR = 'for (const eraId of ERA_FALLBACK_ORDER) {';
const plugins = process.env.SIM_ERA2020_CONTROL === 'eraorder' ? [{
  name: 'eraorder',
  setup(b) {
    b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]clubManager\.ts$/ }, a => {
      const src = fs.readFileSync(a.path, 'utf8');
      if (!src.includes(ERA_ORDER_ANCHOR)) { console.error('CONTROL eraorder did not apply: leagueOf has no fixed era order to remove'); process.exit(2); }
      return { contents: src.replace(ERA_ORDER_ANCHOR, 'for (const eraId of [] as string[]) {'), loader: 'ts' };
    });
  },
}] : [];
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', plugins });
const { engine: cm, eras: ER, e20: E20, e15: E15, e10: E10, e05: E05, modern: MOD } = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(ENTRY, { force: true });
fs.rmSync(BUNDLE, { force: true });
await ER.ensureAllEraRosters();
const { eraUpliftRating, CM_ERAS, eraById } = ER;
const {
  startCareer, playNextEntry, startNextSeason, sortedTable, buildMarket,
  buildBoardObjectives, ERA_LEAGUES, ERA_UCL_FIELDS, eraPlayableClubs, worldSeasonLabel,
  eraUclHasR16, uclFirstKoRound, careerLeagueOf, leagueOf, eraLeagueOf,
} = cm;
const { ERA2020_ROSTERS, ERA2020_META, ERA2020_PARTIAL } = E20;
const { CM_ROSTERS } = MOD;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
/* Section 4's bands, set from the measured runs in the header. */
const BAND_GIANT = 5.0;
/* City has a band of its own: the Premier League is the tightest of the
   five and this harness's own seed family is its tail (see the header). */
const BAND_CITY = 6.0;
const BAND_THIN = 14;

/* NEGATIVE CONTROLS. SIM_ERA2020_CONTROL=<name> breaks one thing IN MEMORY
   (nothing on disk is touched) and the run must then end red, exit 1. Each
   control first proves the thing it breaks is there and refuses with exit 2
   when it is not, so a control that changed nothing can never read as one
   that fired. A control run plays no seasons (section 4).
     dupe         Havertz at Chelsea AND back at Leverkusen: one man, one
                  club and the META count fail (the window sample only asks
                  whether he is at Chelsea, which he still is, so it cannot).
     stale        Havertz sent back to Leverkusen: the window sample fails.
     fourleagues  the era cut to its first four leagues for section 3: the
                  league count, the sizes and the 98 demands fail.
     nofield      the era's Champions League field emptied for section 7.
     swapfinish   Porto (quarter final) and Ferencvaros (groups) trade
                  finishes for section 7: the shape still reads
                  1,1,2,4,8,16, so only the per club pin can fail.
     nolift       section 6 reads the raw bake with no uplift: the top 50
                  gap reads -0.68 and leaves its +-0.5 band (Mbappe and
                  Messi drop off their pins too).
     modernmarket section 8 labels every past season's market with today's
                  leagues (the old transfer screen lookup): 2020-21 alone
                  files about 150 men under the wrong league.
     eraorder     leagueOf's fixed era order is taken out as the engine is
                  bundled (see the plugin above the build), so section 8's
                  reversal of ERA_LEAGUES moves the multi-era clubs. */
const CONTROL = process.env.SIM_ERA2020_CONTROL ?? '';
if (CONTROL && !['dupe', 'stale', 'fourleagues', 'nofield', 'swapfinish', 'nolift', 'modernmarket', 'eraorder'].includes(CONTROL)) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
const controlRefuse = why => { console.error(`CONTROL ${CONTROL} did not apply: ${why}`); process.exit(2); };
function controlHavertz(rosters, keepAtChelsea) {
  const row = (rosters['Chelsea'] ?? []).find(p => p.n === 'Kai Havertz');
  if (!row) controlRefuse('there is no Havertz at Chelsea to move');
  if ((rosters['Bayer Leverkusen'] ?? []).some(p => p.n === 'Kai Havertz')) controlRefuse('he is already at Leverkusen');
  console.log(`   CONTROL ${CONTROL} applied: Havertz is at Leverkusen${keepAtChelsea ? ' and at Chelsea' : ''}`);
  return { ...rosters, 'Chelsea': keepAtChelsea ? rosters['Chelsea'] : rosters['Chelsea'].filter(p => p !== row), 'Bayer Leverkusen': [...rosters['Bayer Leverkusen'], row] };
}

const playSeason = state => {
  let s = state;
  for (let i = 0; i < 80; i++) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
};

/* ---------- 1. Year zero identity ---------- */
console.log('1) A fresh 2020 save is the real 2020 squad, untouched');
{
  /* Name for name, both directions: every real player handed to the save is
     a bake row at his bake age and uplifted rating, and every bake row is in
     the squad. The marquee names are the summer 2020 window landing too. */
  const identity = (club, seed, marquee) => {
    Math.random = seeded(seed);
    const save = startCareer(club, 'era2020');
    /* The engine hands a save the 26 most valuable bake rows (buildSquad's
       documented cap, which leaves room to sign under the 30 man limit), and
       the bake is sorted by value, so the first 26 rows are the squad. */
    const rows = new Map(ERA2020_ROSTERS[club].slice(0, 26).map(p => [p.n, p]));
    let off = 0;
    for (const p of save.squad.filter(p => !p.isYouth && !p.generated)) {
      const b = rows.get(p.name);
      if (!b) { off += 1; fail(`${p.name} is in the 2020 ${club} squad but not in the bake`); continue; }
      if (b.a !== p.age || eraUpliftRating('era2020', b.r) !== p.rating) {
        off += 1;
        fail(`${club}'s ${p.name}: bake says age ${b.a} rating ${b.r}, squad says ${p.age}/${p.rating}`);
      }
    }
    for (const name of rows.keys()) {
      if (!save.squad.some(p => p.name === name)) { off += 1; fail(`${club}: bake row ${name} never reached the squad`); }
    }
    for (const name of marquee) {
      if (!save.squad.some(p => p.name === name)) fail(`2020 ${club} are missing ${name}`);
    }
    const gen = save.squad.filter(p => p.generated).length;
    console.log(`   ${club}: ${save.squad.length} in squad, ${rows.size} bake rows, ${off} mismatches, ${gen} generated`);
    if (gen !== 0) fail(`a dense 2020 club (${club}) got ${gen} generated players on day one`);
    if (save.startYear !== 2020) fail(`the ${club} save started in ${save.startYear}`);
    if (!/2020-21/.test(worldSeasonLabel(save))) fail(`season label reads ${worldSeasonLabel(save)}`);
    return save;
  };
  identity('Bayern Munich', 17, ['Robert Lewandowski', 'Thomas Müller', 'Manuel Neuer', 'Leroy Sané', 'Douglas Costa', 'Bouna Sarr']);
  identity('PSG', 19, ['Kylian Mbappé', 'Neymar', 'Marquinhos', 'Moise Kean', 'Alessandro Florenzi', 'Danilo Pereira']);
  identity('Manchester City', 23, ['Kevin De Bruyne', 'Raheem Sterling', 'Rúben Dias', 'Ferran Torres', 'Nathan Aké']);
  const barca = identity('Barcelona', 29, ['Lionel Messi', 'Miralem Pjanić', 'Philippe Coutinho', 'Pedri', 'Sergiño Dest']);
  const messi = barca.squad.find(p => p.name === 'Lionel Messi');
  if (messi && messi.age !== 32) fail(`2020 Messi is ${messi.age}, the bake says 32 (a spring 2020 snapshot)`);
  /* The window took these men away, so they must not be handed back. */
  for (const [club, gone] of [['Barcelona', 'Luis Suárez'], ['Barcelona', 'Arthur Melo'], ['Barcelona', 'Ivan Rakitic'], ['Barcelona', 'Arturo Vidal'], ['Bayern Munich', 'Thiago Alcántara'], ['PSG', 'Edinson Cavani'], ['PSG', 'Thiago Silva']]) {
    if (ERA2020_ROSTERS[club].some(p => p.n === gone)) fail(`2020 ${club} still hold ${gone}, who left that summer`);
  }
}

/* ---------- 2. Era isolation and the namesake pass ---------- */
console.log('2) Five worlds (2026, 2020, 2015, 2010, 2005), and none of them leak');
{
  Math.random = seeded(31);
  const market = buildMarket(startCareer('Real Madrid', 'era2020'));
  const names = new Set(market.map(p => p.name));
  // Stars of today who were not top flight players in the spring of 2020.
  for (const name of ['Lamine Yamal', 'Désiré Doué', 'Kenan Yildiz', 'Pau Cubarsí']) {
    if (names.has(name)) fail(`${name} is on the 2020 market`);
  }
  const kane = market.find(p => p.name === 'Harry Kane');
  if (!kane) fail('2020 Kane is not on the 2020 market');
  else if (kane.age !== 26) fail(`market Kane is ${kane.age}, the 2020 bake says 26`);

  Math.random = seeded(37);
  const nowNames = new Set(buildMarket(startCareer('Arsenal')).map(p => p.name));
  const modernNames = new Set(Object.values(CM_ROSTERS).flat().map(p => p.n));
  let checked = 0, leaked = 0;
  for (const roster of Object.values(ERA2020_ROSTERS)) for (const p of roster) {
    if (modernNames.has(p.n)) continue;
    checked += 1;
    if (nowNames.has(p.n)) { leaked += 1; if (leaked <= 3) fail(`2020-only ${p.n} is on the 2026 market`); }
  }
  console.log(`   ${checked} era-exclusive names checked against the 2026 market, ${leaked} leaks`);
  if (checked < 300) fail(`only ${checked} era-exclusive names? the worlds are suspiciously alike`);

  /* THE NAMESAKE PASS. A name the 2020 world shares with another world is
     the same human that many years apart (a snapshot wobbles a year either
     side, so the windows are the gap plus or minus two), unless it is two
     men wearing one string. Each pair below says who the two men are.
     Pairs earlier rounds verified with two publishers carry that round's
     name (the birth years are in scripts/simEra2015.mjs beside its own
     lists). Pairs new in this round name both men in full with a date of
     birth from two outside publishers each (Wikipedia used as a spot check
     only, never as one of the two), read 2026-10-05 for the closing check;
     the table's own ages agree with every date within the year a snapshot
     wobbles. That reading corrected two lines: the 2010 table's Fernando is
     Bordeaux's Menegazzo, not a Malaga man, and the 2020 table's Pedro
     Mendes is Montpellier's centre-back, not a striker. */
  const PAIRS = {
    now: {
      'Luis Suárez': 'Atletico\'s Uruguayan (b. 1987) and the Colombian striker (b. 1997), Round 175',
      'Paulinho': 'Leverkusen\'s Paulinho (b. 2000) and Toluca\'s (b. 1992), Rounds 876 and 883',
      'Allan': 'Everton\'s Allan Marques Loureiro (b. 1991) and Manchester City\'s Allan Andrade Elias (b. 2004), Round 883',
      'Aaron Ramsey': 'the Welsh midfielder at Juventus (b. 1990) and the English one (b. 2003), Round 175',
      'Idrissa Gueye': 'PSG\'s Idrissa Gana Gueye (b. 1989) and Udinese\'s striker (b. 2006), Round 899',
      'Pedro': 'Roma\'s Pedro Rodriguez (b. 1987) and Flamengo\'s Pedro (b. 1997), Round 876',
      'Gabriel Silva': 'Saint-Etienne\'s Brazilian left-back, Udinese\'s in 2015 (b. 1991), and Santa Clara\'s, Round 191',
      'João Pedro': 'Cagliari\'s João Pedro Galvão (b. 1992-03-09: national-football-teams.com, playmakerstats) and Chelsea\'s João Pedro Junqueira de Jesus (b. 2001-09-26: ESPN, chelseafc.com)',
      'Danilo': 'Juventus\' Danilo Luiz da Silva (b. 1991-07-15: ESPN, besoccer) and Botafogo\'s Danilo dos Santos de Oliveira (b. 2001-04-29: ESPN, footballtransfers.com)',
      'Matheus Pereira': 'West Brom\'s Matheus Fellipe Costa Pereira (b. 1996-05-05: premierleague.com, playmakerstats) and Toronto FC\'s Matheus Pereira de Souza (b. 2000-12-21: torontofc.ca, ESPN)',
    },
    era2015: {
      'Gabriel': 'Arsenal\'s centre-back (b. 1997) and Carpi\'s 2015 keeper (b. 1992), Round 191',
      'Paulinho': 'Leverkusen\'s Paulinho (b. 2000) and Tottenham\'s 2015 midfielder (b. 1988), Round 876',
      'Danilo': 'Juventus\' full-back (ESPN: b. 1991-07-15) and Udinese\'s 2015 centre-back (b. 1984), Round 191',
      'Ederson': 'Manchester City\'s keeper (b. 1993) and Lazio\'s 2015 playmaker (b. 1986), Round 191',
      'Sergio Álvarez': 'Eibar\'s Sergio Álvarez Díaz (b. 1992-01-23: ESPN, laliga.com) and Celta\'s 2015 keeper Sergio Álvarez Conde (b. 1986-08-03: ESPN, Sports Mole)',
    },
    era2010: {
      'David García': 'Osasuna\'s David García Zubiria (b. 1994-02-14: playmakerstats, besoccer) and Espanyol\'s 2010 defender David García de la Cruz (b. 1981-01-16: ESPN, playmakerstats)',
      /* Closing check fix: the 2010 table's Fernando is Bordeaux's, 28 and a
         holding midfielder, not Malaga's as this line used to say. */
      'Fernando': 'Sevilla\'s Fernando Reges (b. 1987-07-25: ESPN, playmakerstats) and Bordeaux\'s 2010 Fernando Menegazzo (b. 1981-05-03: ESPN, national-football-teams.com)',
      /* Three more once Round 901 gave 2010-11 its Serie A, Bundesliga and
         Ligue 1 (measured on the merged tree, 2026-10-05). */
      'Felipe': 'Atletico\'s Felipe Augusto de Almeida Monteiro (b. 1989-05-16: atleticodemadrid.com, sofifa) and Fiorentina\'s 2010 Felipe Dal Belo (b. 1984-07-31: playmakerstats, bdfutbol)',
      'Ederson': 'Manchester City\'s keeper Ederson Moraes (b. 1993-08-17: mancity.com, Sportskeeda) and Lyon\'s 2010 playmaker Ederson Honorato Campos (b. 1986-01-13: ESPN, playmakerstats), the man the era2015 list has at Lazio, Round 191',
      'Rafinha': 'PSG\'s Rafael Alcântara (b. 1993-02-12: playmakerstats, fbref) and Genoa\'s 2010 right-back Márcio Rafael Ferreira de Souza (b. 1985-09-07: fcbayern.com, national-football-teams.com)',
    },
    era2005: {
      'Dani García': 'Athletic\'s Daniel García Carrillo (b. 1990-05-24: ESPN, athletic-club.eus) and Espanyol\'s 2005 striker Daniel García Lara (b. 1974-12-22: national-football-teams.com, playmakerstats)',
      'Manu Sánchez': 'Atletico\'s Manuel Sánchez de la Peña (b. 2000-08-24: ESPN, playmakerstats) and Malaga\'s 2005 Antonio Manuel Sánchez Gómez (b. 1979-01-25: ESPN, bdfutbol)',
      'José Izquierdo': 'Brighton\'s José Heriberto Izquierdo Mena (b. 1992-07-07: ESPN, besoccer) and Osasuna\'s 2005 right-back José Izquierdo Martínez (b. 1980-08-03: bdfutbol, ceroacero)',
      'Álex Fernández': 'Cadiz\'s Alejandro Fernández Iglesias (b. 1992-10-15: ESPN, cadizcf.com) and Espanyol\'s 2005 Àlex Fernández Sánchez (b. 1974-02-14: ESPN, playmakerstats)',
      /* Closing check fix: the 2020 table's Pedro Mendes is Montpellier's
         centre-back, not a striker as this line used to say. */
      'Pedro Mendes': 'Montpellier\'s centre-back Pedro Filipe Teodósio Mendes (b. 1990-10-01: ESPN, Sports Mole) and Tottenham\'s 2005 midfielder Pedro Miguel da Silva Mendes (b. 1979-02-26: ESPN, tottenhamhotspur.com)',
      'David García': 'Osasuna\'s David García Zubiria (b. 1994) and Espanyol\'s 2005 defender, the 2010 man above (b. 1981, same sources)',
      'Fernando': 'Sevilla\'s Fernando Reges (b. 1987, sources above) and Betis\' 2005 Fernando Varela Ramos (b. 1979-09-01: bdfutbol, playmakerstats)',
    },
  };
  const byName = rosters => { const m = new Map(); for (const roster of Object.values(rosters)) for (const p of roster) m.set(p.n, p); return m; };
  const here = byName(ERA2020_ROSTERS);
  const worlds = [
    ['now', byName(CM_ROSTERS), 6, 400],
    ['era2015', byName(E15.ERA2015_ROSTERS), -5, 280],
    ['era2010', byName(E10.ERA2010_ROSTERS), -10, 40],
    ['era2005', byName(E05.ERA2005_ROSTERS), -15, 5],
  ];
  for (const [id, other, gap, floor] of worlds) {
    let shared = 0, pairs = 0;
    const odd = [];
    for (const [name, p] of here) {
      const q = other.get(name);
      if (!q) continue;
      shared += 1;
      if (PAIRS[id][name]) { pairs += 1; continue; }
      const g = q.a - p.a;
      if (Math.abs(g - gap) > 2) odd.push(`${name} (2020 ${p.a}, ${id} ${q.a})`);
    }
    const unused = Object.keys(PAIRS[id]).filter(n => !(here.has(n) && other.has(n)));
    console.log(`   2020 and ${id}: ${shared} shared names, ${pairs} listed pairs of two men, ${odd.length} unexplained`);
    if (odd.length) fail(`${odd.length} names shared by 2020 and ${id} age impossibly: ${odd.slice(0, 6).join(', ')}; verify each as two men before listing it`);
    if (unused.length) fail(`listed pairs no longer shared by 2020 and ${id}: ${unused.join(', ')}; take them off the list`);
    if (shared - pairs < floor) fail(`only ${shared - pairs} men are shared by 2020 and ${id} (floor ${floor}, measured about twice that); the age window itself may be wrong`);
  }
}

/* ---------- 3. The 2020-21 ladder ---------- */
console.log('3) Boards talk 2020-21: the giants told to win it, the promoted told to stay up');
{
  let leagues = ERA_LEAGUES['era2020'] ?? [];
  if (CONTROL === 'fourleagues') {
    if (leagues.length !== 5) controlRefuse(`the era holds ${leagues.length} leagues, there are not five to cut`);
    leagues = leagues.slice(0, 4);
    console.log('   CONTROL fourleagues applied: section 3 sees only the first four leagues');
  }
  if (leagues.length !== 5) fail(`era2020 has ${leagues.length} leagues`);
  const ids = leagues.map(l => l.id).join(',');
  if (ids !== 'premier2020,laliga2020,seriea2020,bundesliga2020,ligue12020') fail(`era2020 leagues read ${ids}`);
  const sizes = leagues.map(l => l.clubs.length).join(',');
  if (sizes !== '20,20,20,18,20') fail(`era2020 league sizes read ${sizes}`);
  let labels = 0;
  for (const lg of leagues) {
    const targets = [];
    for (const c of eraPlayableClubs('era2020', lg.id)) {
      if (!ERA2020_ROSTERS[c.name]) fail(`${lg.name} club ${c.name} has no 2020 squad in the bake`);
      const league = buildBoardObjectives(c.name, false, lg.clubs.length, 'era2020').find(o => o.id === 'league');
      if (!league) { fail(`${c.name} got no league demand`); continue; }
      labels += 1;
      if (/Conference League/i.test(league.label)) fail(`${c.name} promised the Conference League in 2020-21`);
      targets.push({ rank: c.expectation, target: league.target, name: c.name });
    }
    targets.sort((a, b) => a.rank - b.rank);
    for (let i = 1; i < targets.length; i++) {
      if (targets[i].target < targets[i - 1].target) fail(`${lg.name} 2020: ${targets[i].name} asked for more than stronger ${targets[i - 1].name}`);
    }
  }
  console.log(`   ${labels} club demands checked across the five 2020-21 leagues`);
  if (labels !== 98) fail(`${labels} board demands, the era holds 98 clubs`);
  const targetOf = name => {
    const lg = leagues.find(l => l.clubs.includes(name));
    if (!lg) return 99;
    return buildBoardObjectives(name, false, lg.clubs.length, 'era2020').find(o => o.id === 'league')?.target ?? 99;
  };
  for (const giant of ['Manchester City', 'Barcelona', 'Real Madrid', 'Juventus', 'Bayern Munich', 'PSG']) {
    if (targetOf(giant) !== 1) fail(`2020 ${giant} is not told to win the league`);
  }
  for (const modest of ['Crotone', 'Elche', 'Arminia Bielefeld', 'Benevento', 'Cádiz', 'Spezia', 'Huesca', 'Lens', 'Lorient']) {
    if (targetOf(modest) <= 8) fail(`2020 ${modest} is asked for a top-${targetOf(modest)} finish`);
  }
  for (const [club, n, cup] of [['Liverpool', 20, /FA Cup/], ['Sevilla', 20, /Copa del Rey/], ['Napoli', 20, /Coppa Italia/], ['Borussia Dortmund', 18, /DFB-Pokal/], ['Lyon', 20, /Coupe de France/]]) {
    const o = buildBoardObjectives(club, false, n, 'era2020').find(x => x.id === 'cup');
    if (!o) fail(`2020 ${club} has no cup objective at all`);
    else if (!cup.test(o.label)) fail(`2020 ${club}'s cup objective says "${o.label}"`);
  }
}

/* ---------- 4. Seasons complete and land plausibly ---------- */
console.log('4) Full seasons play out plausibly in all five leagues');
if (CONTROL) console.log('   skipped: a control run plays no seasons');
else {
  const posOf = (club, seed) => {
    Math.random = seeded(seed);
    const s = playSeason(startCareer(club, 'era2020'));
    const table = sortedTable(s.table);
    const want = (ERA_LEAGUES.era2020 ?? []).find(l => l.clubs.includes(club))?.clubs.length;
    if (table.length !== want) fail(`${club}: a 2020 table with ${table.length} rows, the league has ${want} clubs`);
    return table.findIndex(r => r.club === club) + 1;
  };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const SEEDS = [1, 2, 3, 4, 5, 6];
  const bayern = SEEDS.map(i => posOf('Bayern Munich', i * 7919));
  const psg = SEEDS.map(i => posOf('PSG', i * 7919));
  const city = SEEDS.map(i => posOf('Manchester City', i * 7919));
  const crotone = SEEDS.map(i => posOf('Crotone', i * 104729));
  console.log(`   Bayern ${bayern.join(',')} (mean ${mean(bayern).toFixed(2)}) · PSG ${psg.join(',')} (mean ${mean(psg).toFixed(2)})`);
  console.log(`   Manchester City ${city.join(',')} (mean ${mean(city).toFixed(2)}) · Crotone ${crotone.join(',')} (mean ${mean(crotone).toFixed(2)})`);
  /* Bands on the MEANS from the measured headroom in the header, never a
     single worst seed. */
  if (mean(bayern) > BAND_GIANT) fail(`2020 Bayern averaged position ${mean(bayern).toFixed(2)} over six seeds (band ${BAND_GIANT})`);
  if (mean(psg) > BAND_GIANT) fail(`2020 PSG averaged position ${mean(psg).toFixed(2)} over six seeds (band ${BAND_GIANT})`);
  if (mean(city) > BAND_CITY) fail(`2020 Manchester City averaged position ${mean(city).toFixed(2)} over six seeds (band ${BAND_CITY})`);
  if (mean(crotone) < BAND_THIN) fail(`Crotone, three real players and youth padding, averaged position ${mean(crotone).toFixed(2)} (band ${BAND_THIN} or worse)`);

  // Season two exists, is 2021-22, and the world aged with it.
  Math.random = seeded(4242);
  const s2 = startNextSeason(playSeason(startCareer('Barcelona', 'era2020')));
  if (!/2021-22/.test(worldSeasonLabel(s2))) fail(`season two reads ${worldSeasonLabel(s2)}`);
  if (s2.squad.length < 16) fail(`season two came out of the summer with ${s2.squad.length} players`);
  const messi1 = cm.projectedRoster('Barcelona', 1, 'era2020').find(p => p.n === 'Lionel Messi');
  if (messi1 && messi1.a !== 33) fail(`year-one world Messi is ${messi1.a}, expected 33`);
  if (cm.projectedRoster('Barcelona', 0, 'era2020').some(p => p.g)) fail('the year-zero 2020 world holds generated players at Barcelona');
}

/* ---------- 5. The bake's own accounting ---------- */
console.log('5) The bake file tells the truth about itself');
{
  const W = CONTROL === 'dupe' ? controlHavertz(ERA2020_ROSTERS, true) : CONTROL === 'stale' ? controlHavertz(ERA2020_ROSTERS, false) : ERA2020_ROSTERS;
  const clubs = Object.keys(W);
  const players = Object.values(W).reduce((s, r) => s + r.length, 0);
  console.log(`   ${clubs.length} clubs, ${players} players (META says ${ERA2020_META.players} in ${ERA2020_META.clubs}), ${ERA2020_META.moves} window corrections`);
  if (clubs.length !== 98 || ERA2020_META.clubs !== 98) fail(`the bake holds ${clubs.length} clubs, META ${ERA2020_META.clubs}; the 2020-21 big five is 98`);
  if (players !== ERA2020_META.players) fail(`the bake holds ${players} players, META says ${ERA2020_META.players}`);
  if (ERA2020_META.year !== 2020) fail(`META year ${ERA2020_META.year}`);
  // Every club of the five leagues has its squad, and nothing else does.
  const leagueClubs = new Set((ERA_LEAGUES.era2020 ?? []).flatMap(l => l.clubs));
  for (const c of clubs) if (!leagueClubs.has(c)) fail(`the bake holds ${c}, which no 2020-21 league lists`);
  for (const c of leagueClubs) if (!W[c]) fail(`${c} is in a 2020-21 league with no squad in the bake`);
  const thin = ['Arminia Bielefeld', 'Benevento', 'Crotone', 'Cádiz', 'Elche'];
  if (JSON.stringify([...ERA2020_PARTIAL].sort()) !== JSON.stringify([...thin].sort())) fail(`the thin list reads ${ERA2020_PARTIAL.join(', ')}`);
  for (const c of clubs) {
    const n = W[c].length;
    if (thin.includes(c) ? n >= 8 : n < 8) fail(`${c} holds ${n} real players against the thin list`);
  }
  // One man, one club, in the whole world.
  const seen = new Map();
  let dupes = 0;
  for (const [c, roster] of Object.entries(W)) for (const p of roster) {
    if (seen.has(p.n)) { dupes += 1; fail(`${p.n} is at ${seen.get(p.n)} and at ${c}`); }
    seen.set(p.n, c);
  }
  // The window, both ways: movers where the dated records put them...
  const at = (club, name) => (W[club] ?? []).some(p => p.n === name);
  const MOVED = [['Chelsea', 'Kai Havertz'], ['Chelsea', 'Timo Werner'], ['Chelsea', 'Ben Chilwell'], ['Chelsea', 'Thiago Silva'],
    ['Liverpool', 'Thiago Alcántara'], ['Liverpool', 'Diogo Jota'], ['Manchester United', 'Bruno Fernandes'], ['Manchester United', 'Edinson Cavani'],
    ['Tottenham', 'Gareth Bale'], ['Tottenham', 'Pierre-Emile Højbjerg'], ['Arsenal', 'Thomas Partey'], ['Everton', 'James Rodríguez'],
    ['Atlético Madrid', 'Luis Suárez'], ['Barcelona', 'Miralem Pjanić'], ['Juventus', 'Arthur Melo'], ['Juventus', 'Federico Chiesa'],
    ['Juventus', 'Dejan Kulusevski'], ['Inter Milan', 'Achraf Hakimi'], ['Inter Milan', 'Arturo Vidal'], ['Inter Milan', 'Christian Eriksen'],
    ['Napoli', 'Victor Osimhen'], ['Bayern Munich', 'Leroy Sané'], ['Borussia Dortmund', 'Jude Bellingham'], ['Lille', 'Jonathan David'],
    ['Real Sociedad', 'David Silva'], ['Sevilla', 'Ivan Rakitic'], ['PSG', 'Danilo Pereira'],
    // Round 971 review fix: movers the first bake missed.
    ['Juventus', 'Álvaro Morata'], ['Real Betis', 'Juan Miranda'], ['Fiorentina', 'Antonio Barreca'], ['Brest', 'Ronaël Pierre-Gabriel']];
  let landed = 0;
  for (const [club, name] of MOVED) { if (at(club, name)) landed += 1; else fail(`${name} is not at ${club}, where the summer 2020 records put him`); }
  // ...and the leavers gone from the world (left it, or reached their next
  // club of the world only in a later window).
  const GONE = ['Gonzalo Higuaín', 'Blaise Matuidi', 'Dejan Lovren', 'Martin Ødegaard', 'William Saliba', 'Mario Götze', 'Santiago Arias',
    // Round 971 review fix: leavers with no year-2021 row, which the first bake never looked at.
    'Santi Cazorla', 'Kamil Glik', 'Ciprian Tătărușanu', 'Stephy Mavididi', 'Riza Durmisi'];
  let gone = 0;
  for (const name of GONE) { if (!seen.has(name)) gone += 1; else fail(`${name} is at ${seen.get(name)}, but left the world that summer`); }
  console.log(`   one man one club: ${dupes} duplicates; window sample: ${landed} of ${MOVED.length} movers landed, ${gone} of ${GONE.length} leavers gone`);
  /* THE GAP, measured every run: the biggest year-2020 men whose year-2021
     row names another club of this world and whom no dated record placed,
     so they sit at their 2019-20 club. Printed, never asserted away. */
  const STALE = [['Newcastle', 'Valentino Lazaro', 'Gladbach'], ['Inter Milan', 'Cristiano Biraghi', 'Fiorentina'], ['Eintracht Frankfurt', 'Bas Dost', 'Club Brugge']];
  const still = STALE.filter(([club, name]) => at(club, name)).map(([club, name, to]) => `${name} at ${club} (${to} by 2021)`);
  console.log(`   no record placed, so left where the year-2020 row has them: ${still.join(', ') || 'none of the named'}`);
}

/* ---------- 6. The uplift: 2020 money is close to 2026 money ---------- */
console.log('6) The uplift is small, keeps the order, and leaves the rank and file alone');
{
  const all = Object.values(ERA2020_ROSTERS).flat();
  let up = r => eraUpliftRating('era2020', r);
  if (CONTROL === 'nolift') {
    if (up(93) === 93) controlRefuse('the 2020 uplift moves nothing at 93, so there is nothing to remove');
    up = r => r;
    console.log('   CONTROL nolift applied: section 6 reads the raw bake');
  }
  /* The calibration's promise is about the top END, not one man: the k-th
     best uplifted 2020 rating against the k-th best modern rating, k = 1 to
     50, averaged. Fifty gaps, so no single player (and never the maximum)
     decides it. MEASURED 2026-10-05 on the 1,774 player bake: no uplift
     reads -0.68, the shipped gain 0.06 reads +0.12, a gain of 0.10 +0.32,
     0.15 +0.72 and 2015's 0.6 +4.90. The band, within half a point either
     side, passes the shipped gain with 0.38 to spare and fails both no
     uplift and an uplift over twice the size. */
  const TOP_K = 50, TOP_BAND = 0.5;
  const lifted = all.map(p => up(p.r)).sort((a, b) => b - a);
  const modernTop = Object.values(CM_ROSTERS).flat().map(p => p.r).sort((a, b) => b - a);
  if (lifted.length < TOP_K || modernTop.length < TOP_K) fail(`fewer than ${TOP_K} players to compare (2020 ${lifted.length}, modern ${modernTop.length})`);
  let gapSum = 0;
  for (let k = 0; k < TOP_K; k++) gapSum += lifted[k] - modernTop[k];
  const topGap = gapSum / TOP_K;
  console.log(`   top ${TOP_K}, uplifted 2020 against modern, mean gap ${topGap.toFixed(2)} (band +-${TOP_BAND})`);
  if (Math.abs(topGap) > TOP_BAND) fail(`the uplifted 2020 top ${TOP_K} sits ${topGap.toFixed(2)} from the modern top ${TOP_K} on average, outside +-${TOP_BAND}: 2020 money is 2026 money give or take`);
  for (let r = 48; r <= 88; r++) if (up(r) !== r) fail(`the 2020 uplift moved a raw ${r} to ${up(r)}; 88 and below stay as baked`);
  for (let r = 48; r < 99; r++) if (up(r + 1) < up(r)) fail(`the 2020 uplift swaps ${r} and ${r + 1}`);
  const mbappe = all.find(p => p.n === 'Kylian Mbappé');
  const messi = all.find(p => p.n === 'Lionel Messi');
  if (!mbappe || up(mbappe.r) !== 94) fail(`2020 Mbappé rates ${mbappe && up(mbappe.r)}, the calibration says 94`);
  if (!messi || up(messi.r) !== 92) fail(`2020 Messi rates ${messi && up(messi.r)}, the calibration says 92`);
}

/* ---------- 7. The 2020-21 Champions League field ---------- */
console.log('7) The real 2020-21 Champions League field, eight groups into a round of 16');
{
  let field = CONTROL === 'nofield' ? [] : (ERA_UCL_FIELDS.era2020 ?? []);
  if (CONTROL === 'nofield') {
    if (!(ERA_UCL_FIELDS.era2020 ?? []).length) controlRefuse('there is no 2020 field to empty');
    console.log('   CONTROL nofield applied: section 7 sees an empty field');
  }
  if (CONTROL === 'swapfinish') {
    const a = field.find(e => e.name === 'Porto'), b = field.find(e => e.name === 'Ferencváros');
    if (!a || !b || a.finish === b.finish) controlRefuse('Porto and Ferencváros are not both in the field with different finishes');
    field = field.map(e => (e === a ? { ...e, finish: b.finish } : e === b ? { ...e, finish: a.finish } : e));
    console.log('   CONTROL swapfinish applied: Porto and Ferencváros trade finishes, the shape unchanged');
  }
  /* Round 971 review fix: each club's own finish, not just the shape, so two
     swapped finishes cannot pass. The knockout clubs as the sources in
     clubManager.ts give them (RSSSF ec202021 and uefa.com's results page);
     every other club of the 32 went out in the groups. */
  const KO = {
    Chelsea: 'winner', 'Manchester City': 'runner_up', 'Real Madrid': 'semi_final', PSG: 'semi_final',
    Liverpool: 'quarter_final', 'Bayern Munich': 'quarter_final', 'Borussia Dortmund': 'quarter_final', Porto: 'quarter_final',
    Barcelona: 'round_of_16', 'RB Leipzig': 'round_of_16', 'Atlético Madrid': 'round_of_16', Lazio: 'round_of_16',
    Atalanta: 'round_of_16', Gladbach: 'round_of_16', Juventus: 'round_of_16', Sevilla: 'round_of_16',
  };
  for (const [name, finish] of Object.entries(KO)) {
    const e = field.find(x => x.name === name);
    if (!e) fail(`${name} is not in the 2020-21 field, where it reached the ${finish}`);
    else if (e.finish !== finish) fail(`${name} reads ${e.finish} in the 2020-21 field, its real finish was ${finish}`);
  }
  for (const e of field) if (!KO[e.name] && e.finish !== 'group_stage') fail(`${e.name} reads ${e.finish}, but went out in the 2020-21 groups`);
  const baked = field.filter(e => ERA2020_ROSTERS[e.name]);
  const count = k => field.filter(e => e.finish === k).length;
  console.log(`   ${field.length} clubs, ${baked.length} with baked 2020-21 squads; winner ${field.find(e => e.finish === 'winner')?.name}`);
  if (field.length !== 32) fail(`the 2020-21 field holds ${field.length} clubs`);
  if (new Set(field.map(e => e.name)).size !== field.length) fail('a club is in the 2020-21 field twice');
  if (baked.length !== 19) fail(`${baked.length} field clubs have baked squads, the five leagues sent nineteen`);
  const shape = ['winner', 'runner_up', 'semi_final', 'quarter_final', 'round_of_16', 'group_stage'].map(count).join(',');
  if (shape !== '1,1,2,4,8,16') fail(`the field's finishes read ${shape}, a real season is 1,1,2,4,8,16`);
  if (field.find(e => e.finish === 'winner')?.name !== 'Chelsea') fail('the 2020-21 winner is not Chelsea');
  for (const e of baked) {
    const lg = (ERA_LEAGUES.era2020 ?? []).find(l => l.clubs.includes(e.name));
    const nation = { premier2020: 'England', laliga2020: 'Spain', seriea2020: 'Italy', bundesliga2020: 'Germany', ligue12020: 'France' }[lg?.id];
    if (nation !== e.country) fail(`${e.name} is listed for ${e.country} but plays in ${lg?.name}`);
  }
  if (!eraUclHasR16('era2020') || uclFirstKoRound({ eraId: 'era2020' }) !== 'R16') fail('a 2020 save does not play a round of 16');
  if (eraById('era2020').id !== 'era2020') fail('the era menu has no 2020-21 card');
  if (CM_ERAS[1]?.id !== 'era2020') fail(`the newest past era should sit first after today, the menu reads ${CM_ERAS.map(e => e.id).join(',')}`);
}

/* ---------- 8. The market and the card say what the save does ---------- */
console.log('8) Every past season\'s market files a man under the league his club plays in that season');
{
  /* The closing check's F4: the transfer screen's league filter used to ask
     leagueOf(club), today's league, so a 2020-21 market filed Declan Rice (West
     Ham) under the Championship and Guendouzi (Hertha) under the 2. Bundesliga. The
     screen now asks careerLeagueOf with the save's era, the lookup the
     engine's own suitors use. This reads the screen's code (comments
     stripped) for that call, then counts, era by era, the market players
     whose club is in an era league and whose label is not that league.
     MEASURED 2026-10-05 with the old lookup: 150 or 151 in 2020-21,
     205 in 2015-16, 210 in 2010-11 and 157 in 2005-06, and the new one
     must read 0 in every era. Control modernmarket labels with the old
     lookup and must fail. */
  const screen = fs.readFileSync(path.join(ROOT, 'src/components/club-manager/TransferScreen.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const CALL = 'careerLeagueOf({ clubName: m.club, eraId: career.eraId }).name';
  const calls = screen.split(CALL).length - 1;
  if (calls < 2) fail(`the transfer screen asks careerLeagueOf with the save's era ${calls} time(s); the league list and the filter both must`);
  if (/(^|[^A-Za-z])leagueOf\(/.test(screen)) fail('the transfer screen still calls the era blind leagueOf');
  let label = (club, eraId) => careerLeagueOf({ clubName: club, eraId }).name;
  if (CONTROL === 'modernmarket') {
    const differs = ERA_LEAGUES.era2020.flatMap(l => l.clubs).filter(c => label(c, 'era2020') !== leagueOf(c).name);
    if (!differs.length) controlRefuse('every 2020-21 club reads the same league either way, so the old lookup would change nothing');
    console.log(`   ${differs.length} 2020-21 clubs read another league through today's lookup, e.g. ${differs.slice(0, 4).map(c => `${c} (${leagueOf(c).name})`).join(', ')}`);
    label = club => leagueOf(club).name;
    console.log('   CONTROL modernmarket applied: the market is labelled with today\'s leagues');
  }
  for (const eraId of Object.keys(ERA_LEAGUES)) {
    const opener = ERA_LEAGUES[eraId][0].clubs[0];
    const market = buildMarket(startCareer(opener, eraId));
    let inEra = 0, wrong = 0, old = 0;
    const eg = [];
    for (const m of market) {
      const real = eraLeagueOf(m.club, eraId);
      if (!real) continue;
      inEra += 1;
      if (leagueOf(m.club).name !== real.name) old += 1;
      if (label(m.club, eraId) !== real.name) { wrong += 1; if (eg.length < 3) eg.push(`${m.name} (${m.club}) under ${label(m.club, eraId)}`); }
    }
    console.log(`   ${eraId}: ${inEra} market players at era league clubs, ${wrong} filed under the wrong league (today's lookup would file ${old})`);
    if (inEra < 100) fail(`${eraId}: only ${inEra} market players at era league clubs, the market did not build`);
    if (wrong) fail(`${eraId}: ${wrong} market players filed under the wrong league, e.g. ${eg.join('; ')}`);
  }
  /* The era card says every match here allows three changes (Spain, Italy,
     Germany and France allowed five that season, England three): the engine
     must still apply three, or the card must change with it. */
  if (/every match here allows three/.test(eraById('era2020').honesty) && cm.MAX_SUBS !== 3) fail(`the 2020-21 card says every match allows three changes, the engine allows ${cm.MAX_SUBS}`);
  if (!/every match here allows three/.test(eraById('era2020').honesty)) fail('the 2020-21 card no longer says how many changes a match here allows');

  /* The closing check's F16: leagueOf's fallback for a club only the past
     seasons know used to read ERA_LEAGUES in the order it was typed. Every
     era must sit in ERA_FALLBACK_ORDER, and reversing the object in memory
     must move no club. MEASURED 2026-10-05: 17 era-only clubs sit in two or
     three eras; with the old insertion order fallback (control eraorder)
     the reversal moves all 17, Cadiz from laliga2005 to laliga2020. */
  const order = cm.ERA_FALLBACK_ORDER ?? [];
  const keys = Object.keys(ERA_LEAGUES);
  const missing = keys.filter(k => !order.includes(k));
  if (missing.length) fail(`leagueOf's fixed era order leaves out ${missing.join(', ')}; a new era goes at the end of ERA_FALLBACK_ORDER`);
  const real = new Set(cm.REAL_LEAGUES.flatMap(l => l.clubs));
  const eraOnly = [...new Set(keys.flatMap(k => ERA_LEAGUES[k].flatMap(l => l.clubs)))].filter(c => !real.has(c));
  const multi = eraOnly.filter(c => keys.filter(k => ERA_LEAGUES[k].some(l => l.clubs.includes(c))).length > 1);
  const before = new Map(eraOnly.map(c => [c, leagueOf(c).id]));
  const saved = keys.map(k => [k, ERA_LEAGUES[k]]);
  for (const k of keys) delete ERA_LEAGUES[k];
  for (const [k, v] of [...saved].reverse()) ERA_LEAGUES[k] = v;
  const moved = eraOnly.filter(c => leagueOf(c).id !== before.get(c)).map(c => `${c} ${before.get(c)} -> ${leagueOf(c).id}`);
  for (const k of keys) delete ERA_LEAGUES[k];
  for (const [k, v] of saved) ERA_LEAGUES[k] = v;
  console.log(`   ${eraOnly.length} era-only clubs, ${multi.length} of them in more than one era; reversing ERA_LEAGUES moves ${moved.length}`);
  if (multi.length < 10) fail(`only ${multi.length} era-only clubs sit in two eras; the order check has nothing to bite on`);
  if (moved.length) fail(`leagueOf's era fallback hangs on the order of ERA_LEAGUES: ${moved.slice(0, 4).join('; ')}${moved.length > 4 ? ` and ${moved.length - 4} more` : ''}`);
  if (leagueOf('Cádiz').id !== 'laliga2005') fail(`an unscoped leagueOf('Cádiz') reads ${leagueOf('Cádiz').id}; it has always read laliga2005`);
}

console.log('');
if (failures) {
  console.error(`simEra2020: ${failures} failure(s).`);
  process.exit(1);
}
console.log('simEra2020: green. 2020-21 is real, sealed, and plays like 2020-21.');
