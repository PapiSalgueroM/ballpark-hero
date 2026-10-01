/* Rounds 784 and 820: the Perfect Season odds are measured, printed on every
   page, and honest, in all four sports.

   A player reported on 2026-09-22: "I never get 82-0 and I have played 1312".
   He was never going to. Round 784 made the NBA card print the real odds of
   an unbeaten season for the team you built and kept the best record. Its
   review noted that the NHL, MLB and NFL pages still sold the perfect season.
   Round 820 moved the odds, the best record and the hero line into one shared
   module (src/lib/perfectSeasonOdds.ts), hook (src/hooks/usePerfectSeasonBest.ts)
   and card (src/components/perfect-season/SeasonOdds.tsx) with a descriptor per
   sport, and put all four pages on it. src/test/perfectSeasonResult.test.tsx
   plays a whole run through each real page.

   MEASURED 2026-10-01 through each page's own adapter (fetchTeam...Index and
   fetchSquad over every wheel stop the live tables give: NBA 1,615 squads,
   NHL 194, MLB 1,000, NFL 828) and the real sims. "Best" is the strongest
   lineup the whole wheel can build with distinct names. "Well played" is
   200,000 drafts: every spin random over the wheel, the best draftable player
   at every stop into the first open slot he fits, a reroll (two per run) when
   that player is under the sport's reroll line (the median stop's best player
   minus 2: NBA 88, NHL 94, MLB 82, NFL 86). The NBA rerun reproduced Round
   784 to the decimal (best 98.52, drafts mean 87.80, one run in 112,033).
   Seasons are 200,000 per row through the sim the page calls.

     sport  best    unbeaten at best      drafts p10 / median / p90 / p99   unbeaten at the median    across all drafts
     NBA    98.52   21,111, one in 9.5    84.31 / 87.86 / 91.24 / 93.31     0 (closed one in 161M)   one in 112,033 (2 seen)
     NHL    98.27   74,256, one in 2.7    82.55 / 86.82 / 91.61 / 96.15     6, one in 33,333         2,256, one in 89
     MLB    98.04   28,256, one in 7.1    75.10 / 78.80 / 82.52 / 85.56     0 (closed 1 in 5.8e36)   0 (closed one in 256M)
     NFL    97.52   130,484, one in 1.5   77.60 / 81.89 / 86.20 / 89.45     184, one in 1,087        2,011, one in 99.5

   Wins (mean, sd, p10 to p90):
     NBA  best 79.8 sd 1.5 (78 to 82); median draft 64.9 sd 3.7 (60 to 70); all drafts 64.6 sd 6.5 (56 to 73)
     NHL  best 81.0 sd 1.0 (80 to 82); median draft 72.1 sd 3.0 (68 to 76); all drafts 70.8 sd 7.4 (61 to 79)
     MLB  best 160.0 sd 1.4 (158 to 162); median draft 95.4 sd 6.3 (87 to 103); all drafts 94.4 sd 22.3 (64 to 123),
          and 18.45 percent of those seasons reach 116 wins, the big league record (1906 Cubs, 2001 Mariners)
     NFL  best 16.6 sd 0.6 (16 to 17); median draft 11.1 sd 2.0 (9 to 14); all drafts 11.2 sd 2.7 (8 to 15)
   Closed form at whole overalls (one run in): NHL 88 3,857, 90 252, 92 38, 93 19, 95 7;
   MLB 88 12.1 million, 90 55,055, 92 1,335, 93 331, 95 41, 99 7; NFL 85 88, 88 14, 90 4.

   What that means, sport by sport. NBA: 82-0 takes a 95 the wheel almost
   never deals. NHL: a typical lineup is a long shot, but drafts vary so much
   that one well played run in about 90 goes 82-0, so 82-0 stays a real (rare)
   target and the page says it takes an 89 plus. MLB: a perfect 162 is not a
   real target for anything the wheel deals, so the page and the guide chase
   116 wins instead. NFL: 17-0 comes about one well played run in 100.

   Two things the round did not change and the lead should know. The NHL and
   MLB pages play the old core sigmoid (winProbability), where a typical NHL
   lineup averages 72 wins in 82 games against a real record of 65, and an
   MLB 82 averages 119 wins: plainly richer than either sport, but the brief
   was the copy, not the model. And the MLB wheel index query hits the 1,000
   row cap, so the wheel only ever lands on 1901 to 1962.

   Sections, each per sport (a failure names its sport):
     1. THE CLOSED FORM IS THE ENGINE. 200,000 seasons at four overalls per
        sport through the sim that sport's page calls (simulateSeason for NHL
        and MLB, simulateSeasonFair for NBA and NFL); the unbeaten count must
        sit within five binomial standard deviations of perfectSeasonOdds
        times N. An unbeaten season is every game won and the momentum after
        a win is a constant, so the form is exact, not a fit.
     2. THE NUMBERS THE COPY PRINTS. The descriptor's season lengths match the
        adapters; the odds climb with the overall; realShotFrom is the first
        overall at one run in 1,000 and is still the one the hero named when
        the table was measured (NBA 95, NHL 89, MLB 93, NFL 83); the odds at
        the measured best and median
        sit in bands around the table above; formatOneIn and perfectOddsLine
        render the shapes the card shows, with each sport's own article and
        long shot line, worked out on the raw overall (a half overall prints
        its own odds).
     3. THE BEST RECORD STORE. Per sport: round trip, garbage fails closed, a
        worse run never overwrites, an equal run keeps the first, a better one
        replaces it, and no sport leaks into another.
     4. THE COPY MAKES NO PROMISE THE NUMBERS CONTRADICT. Read from the page
        (comments stripped), its guide entry, its home tile and What's New:
          a. where well played runs go unbeaten less than one in 1,000 (NBA,
             MLB), nothing says chase the perfect season, chase perfection,
             chase N-0 or run the table;
          b. where the best team goes unbeaten more than one run in 100 (all
             four), nothing calls it nearly or almost impossible;
          c. every number the guide and What's New quote is the closed form at
             the overall they name, every example record sits inside the sim's
             5th to 95th percentile at its overall, and every "better than nine
             drafts in ten" or "the wheel almost never deals" is true of the
             measured spread;
          d. the page renders the shared tagline, card and best line, plays the
             sim section 1 measured, and keeps no copy of its own.

   Negative controls (SIM_PS_ODDS_CONTROL=...). Each edits one line of an in
   memory copy, refuses to run if that line is not found exactly once, and
   must redden exactly its own section:sport labels:
     steep           NBA curve: a 95 pays 79 expected wins            2:nba 4:nba
     steepnfl        NFL curve: an 85 pays 15 expected wins           2:nfl 4:nfl
     steepcore       core sigmoid centred at 74, not 77               2:nhl 4:nhl 2:mlb 4:mlb
     nomomentum      simulateSeasonFair loses its streak term         1:nba 1:nfl
     nomomentumcore  simulateSeason loses its streak term             1:nhl 1:mlb
     rounded         the card line works its odds on the rounded overall  2:all four
     bestdown        any run, worse or not, replaces the stored best  3:all four
     copynba         the NBA hero is typed out as "chase the perfect season"  4:nba
     copynhl         the NHL FAQ goes back to "Nearly impossible on purpose"  4:nhl
     copymlb         the MLB home tile goes back to "chase perfection"        4:mlb
     copynfl         the NFL tip goes back to "one time in ten"               4:nfl
   Exit 0 when a named control turned exactly its labels red, 1 when it did not
   (a dead control) or, with no control, on any failure, 2 for a control name
   this harness does not know.

   Run: node scripts/simPerfectSeasonOdds.mjs [seasonsPerOverall] */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPORTS = ['nba', 'nhl', 'mlb', 'nfl'];
const ALL = n => SPORTS.map(s => `${n}:${s}`);
const CONTROL = process.env.SIM_PS_ODDS_CONTROL || '';
/* file: the source the line lives in; module: true when it is bundled (the
   control copy replaces it for every importer), false when the harness reads
   it as text. */
const CONTROLS = {
  steep: { file: 'src/lib/perfectSeasonExpansion.ts', module: true, from: '[90, 69.5], [95, 75.5], [99, 80],', to: '[90, 69.5], [95, 79], [99, 80],', note: 'a 95 NBA roster pays 79 expected wins, so it goes unbeaten about one run in 15 while the guide still says one in 600', want: ['2:nba', '4:nba'] },
  steepnfl: { file: 'src/lib/perfectSeasonExpansion.ts', module: true, from: '[75, 7.5], [80, 10], [85, 13],', to: '[75, 7.5], [80, 10], [85, 15],', note: 'an 85 NFL roster pays 15 expected wins, so every NFL number the copy quotes is stale', want: ['2:nfl', '4:nfl'] },
  steepcore: { file: 'src/lib/perfectSeason.ts', module: true, from: 'const x = (overall - 77) / 5;', to: 'const x = (overall - 74) / 5;', note: 'the core sigmoid moves three points, so every NHL and MLB number the copy quotes is stale', want: ['2:nhl', '4:nhl', '2:mlb', '4:mlb'] },
  nomomentum: { file: 'src/lib/perfectSeasonExpansion.ts', module: true, from: 'const momentum = i > 0 ? (results[i - 1] ? WIN_MOMENTUM : LOSS_MOMENTUM) : 0;', to: 'const momentum = 0;', note: 'simulateSeasonFair drops its streak term while the closed form keeps it', want: ['1:nba', '1:nfl'] },
  nomomentumcore: { file: 'src/lib/perfectSeason.ts', module: true, from: 'const momentum = i > 0 ? (results[i - 1] ? WIN_MOMENTUM : LOSS_MOMENTUM) : 0;', to: 'const momentum = 0;', note: 'simulateSeason drops its streak term while the closed form keeps it', want: ['1:nhl', '1:mlb'] },
  rounded: { file: 'src/lib/perfectSeasonOdds.ts', module: true, from: 'const odds = perfectSeasonOdds(sport, overall);', to: 'const odds = perfectSeasonOdds(sport, Math.round(overall));', note: 'the card line works its odds out on the rounded overall, so a half overall prints the next one\'s odds', want: ALL(2) },
  bestdown: { file: 'src/lib/perfectSeason.ts', module: true, from: 'return best === null || run.wins > best.wins;', to: 'return true;', note: 'any finished run replaces the stored best, so a best can go down', want: ALL(3) },
  copynba: { file: 'src/pages/PerfectSeasonNba.tsx', module: false, from: '{perfectSeasonTagline(SPORT_KEY)}', to: 'Spin the wheel of NBA history, draft one player per stop, and chase the perfect season.', note: 'the NBA hero is typed out again and sells the perfect season', want: ['4:nba'] },
  copynhl: { file: 'src/data/gameContent/hockey.ts', module: false, from: 'a: "It depends on your overall, and the goalie counts most. An 88 lineup goes 82-0 about one run in 3,900, a 90 about one run in 250 and a 93 about one run in 19.', to: 'a: "Nearly impossible on purpose. Even a lineup full of 99s is capped below a 99 percent win chance per game, so most runs drop one somewhere.', note: 'the NHL FAQ calls 82-0 nearly impossible again', want: ['4:nhl'] },
  copymlb: { file: 'src/data/gameRegistry.ts', module: false, from: "description: 'Spin, draft across eras, chase 116 wins'", to: "description: 'Spin, draft across eras, chase perfection'", note: 'the MLB home tile sells perfection again', want: ['4:mlb'] },
  copynfl: { file: 'src/data/gameContent/football.ts', module: false, from: '"A typical well drafted roster, around 82, goes 17-0 about one run in 1,100, and even an 88 only about one run in 14, so treat 15 wins as a good day."', to: '"Even a stacked draft goes 17-0 only about one time in ten, so treat 15 wins as a good day."', note: 'the NFL tip goes back to a number nobody measured', want: ['4:nfl'] },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`SIM_PS_ODDS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`); process.exit(2); }

const lf = s => s.replace(/\r\n/g, '\n');
const control = CONTROL ? CONTROLS[CONTROL] : null;
if (control) {
  const src = lf(fs.readFileSync(path.join(ROOT, control.file), 'utf8'));
  const n = src.split(control.from).length - 1;
  if (n !== 1) { console.error(`control ${CONTROL}: the anchor line appears ${n} times in ${control.file}, refusing to run a dead control`); process.exit(1); }
  console.log(`NEGATIVE CONTROL ON: ${control.note}`);
}
/* Every source the harness reads as text goes through here, so a text control
   edits only the in memory copy. */
const readSrc = rel => {
  const src = lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  return control && !control.module && control.file === rel ? src.replace(control.from, control.to) : src;
};

/* Bundle the three modules. '@/...' is resolved here rather than by an esbuild
   alias so a module control's copy replaces the original for every importer. */
const TMP = (process.env.TEMP || process.env.TMP || os.tmpdir()).replaceAll('\\', '/');
const redirect = new Map();
if (control && control.module) {
  const copy = `${TMP}/ps-odds-control-${CONTROL}-${process.pid}${path.extname(control.file)}`;
  fs.writeFileSync(copy, lf(fs.readFileSync(path.join(ROOT, control.file), 'utf8')).replace(control.from, control.to));
  redirect.set(path.join(ROOT, control.file), copy);
}
const resolveAt = p => {
  const base = path.join(ROOT, 'src', p.slice(2));
  for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
    const full = base + ext;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return redirect.get(full) || full;
  }
  return null;
};
const ENTRY = `${TMP}/ps-odds-entry-${process.pid}.mjs`;
const OUT = `${TMP}/ps-odds-bundle-${process.pid}.mjs`;
fs.writeFileSync(ENTRY, `
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => store.clear(),
};
export const core = await import('@/lib/perfectSeason');
export const exp = await import('@/lib/perfectSeasonExpansion');
export const odds = await import('@/lib/perfectSeasonOdds');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error',
  plugins: [{ name: 'at-alias', setup(b) { b.onResolve({ filter: /^@\// }, args => { const r = resolveAt(args.path); return r ? { path: r } : undefined; }); } }],
});
const { core, exp, odds } = await import(pathToFileURL(OUT).href);
try { fs.rmSync(ENTRY); fs.rmSync(OUT); for (const c of redirect.values()) fs.rmSync(c); } catch { /* temp only */ }

for (const [k, v] of Object.entries({ simulateSeason: core.simulateSeason, simulateSeasonFair: exp.simulateSeasonFair, perfectSeasonOdds: odds.perfectSeasonOdds, perfectOddsLine: odds.perfectOddsLine, formatOneIn: odds.formatOneIn, realShotFrom: odds.realShotFrom, perfectSeasonTagline: odds.perfectSeasonTagline, loadBestRecord: core.loadBestRecord, saveBestRecord: core.saveBestRecord })) {
  if (typeof v !== 'function') { console.error(`export missing: ${k}, so nothing below measures anything`); process.exit(1); }
}

let failures = 0;
let section = 0;
let sport = '';
const red = new Set();
const fail = m => { failures += 1; red.add(`${section}:${sport}`); console.error(`  FAIL [${sport}]: ${m}`); };
const N = Number(process.argv[2] || 200000);

/* The measured table from the header. */
const MEASURED = {
  nba: { best: 98.52, median: 87.86, p10: 84.31, p90: 91.24, p99: 93.31, allDrafts: 1 / 112033 },
  nhl: { best: 98.27, median: 86.82, p10: 82.55, p90: 91.61, p99: 96.15, allDrafts: 2256 / 200000 },
  mlb: { best: 98.04, median: 78.80, p10: 75.10, p90: 82.52, p99: 85.56, allDrafts: 3.905e-9, recordShare: 0.1845 },
  nfl: { best: 97.52, median: 81.89, p10: 77.60, p90: 86.20, p99: 89.45, allDrafts: 2011 / 200000 },
};
const SIM = {
  nba: (o, seed) => exp.simulateSeasonFair('nba', o, 82, seed),
  nfl: (o, seed) => exp.simulateSeasonFair('nfl', o, 17, seed),
  nhl: (o, seed) => core.simulateSeason(o, 82, seed),
  mlb: (o, seed) => core.simulateSeason(o, 162, seed),
};
const at = (s, o) => odds.perfectSeasonOdds(s, o);
const f = (s, o) => odds.formatOneIn(at(s, o));
const seedOf = (i, o) => (Math.imul(i + 1, 2654435761) ^ Math.round(o * 100) * 0x9e3779b9) >>> 0;

section = 1;
console.log(`1) the closed form is the engine: ${N.toLocaleString('en-US')} seasons per overall through each page's own sim`);
const SECTION1 = { nba: [90, 95, 99, MEASURED.nba.best], nhl: [88, 90, 95, MEASURED.nhl.best], mlb: [92, 93, 95, MEASURED.mlb.best], nfl: [MEASURED.nfl.median, 85, 90, MEASURED.nfl.best] };
for (sport of SPORTS) {
  for (const ovr of SECTION1[sport]) {
    let perfect = 0;
    let wins = 0;
    for (let i = 0; i < N; i++) {
      const r = SIM[sport](ovr, seedOf(i, ovr));
      if (r.perfect) perfect += 1;
      wins += r.wins;
    }
    const p = at(sport, ovr);
    const expected = p * N;
    const sd = Math.sqrt(N * p * (1 - p));
    const lo = Math.max(0, expected - 5 * sd);
    const hi = expected + 5 * sd;
    console.log(`   ${sport} ${ovr}: ${perfect} unbeaten of ${N} (mean ${(wins / N).toFixed(2)} wins); closed form ${odds.formatOneIn(p)} expects ${expected.toFixed(1)}, band ${lo.toFixed(1)} to ${hi.toFixed(1)}`);
    if (perfect < lo || perfect > hi) fail(`${ovr}: ${perfect} unbeaten seasons against a closed form expectation of ${expected.toFixed(1)} (five sd band ${lo.toFixed(1)} to ${hi.toFixed(1)}); the sim and perfectSeasonOdds have come apart`);
  }
}

section = 2;
console.log('2) the numbers the copy prints');
const ADAPTER_GAMES = { nba: ['perfectSeasonNba', 'NBA_GAMES'], nhl: ['perfectSeasonNhl', 'NHL_GAMES'], mlb: ['perfectSeasonMlb', 'MLB_GAMES'], nfl: ['perfectSeasonNfl', 'NFL_GAMES'] };
/* Bands around the measured table: [lowest, highest] for one run in N. */
const BANDS = {
  nba: { best: [8, 11], median: [1e7, Infinity] },
  nhl: { best: [2, 4], median: [20000, 50000] },
  mlb: { best: [5, 10], median: [1e12, Infinity] },
  nfl: { best: [1.2, 2], median: [800, 1600] },
};
const ARTICLE = { nba: 'an 82-0', nhl: 'an 82-0', mlb: 'a 162-0', nfl: 'a 17-0' };
const REAL_SHOT = { nba: 95, nhl: 89, mlb: 93, nfl: 83 };
const HALF = { nba: 94.5, nhl: 88.5, mlb: 92.5, nfl: 82.5 };
for (sport of SPORTS) {
  const def = odds.PERFECT_SEASON_SPORTS[sport];
  const [file, name] = ADAPTER_GAMES[sport];
  const m = new RegExp(`export const ${name} = (\\d+);`).exec(readSrc(`src/lib/${file}.ts`));
  if (!m || Number(m[1]) !== def.games) fail(`the descriptor plays ${def.games} games but ${file}.ts says ${m ? m[1] : 'nothing'}`);
  let prev = 0;
  for (let o = 40; o <= 99; o += 1) { const v = at(sport, o); if (v < prev) fail(`perfectSeasonOdds is not monotone at ${o}`); prev = v; }
  const from = odds.realShotFrom(sport);
  if (from === null || !(at(sport, from) >= 1 / 1000) || !(at(sport, from - 1) < 1 / 1000)) fail(`realShotFrom says ${from}, which is not the first overall at one run in 1,000`);
  /* The overall the hero names, as measured with the header's table. */
  if (from !== REAL_SHOT[sport]) fail(`the hero now names ${from} as where unbeaten starts, the measurement was made at ${REAL_SHOT[sport]}; re-measure and update the header and the copy`);
  const oneIn = o => 1 / at(sport, o);
  const b = BANDS[sport];
  const M = MEASURED[sport];
  console.log(`   ${sport}: real shot from ${from}; best ${M.best} one in ${oneIn(M.best).toFixed(2)}, median draft ${M.median} one in ${Math.round(oneIn(M.median)).toLocaleString('en-US')}`);
  if (!(oneIn(M.best) >= b.best[0] && oneIn(M.best) <= b.best[1])) fail(`the best team the wheel can build (${M.best}) goes unbeaten one run in ${oneIn(M.best).toFixed(2)}; measured band ${b.best[0]} to ${b.best[1]}`);
  if (!(oneIn(M.median) >= b.median[0] && oneIn(M.median) <= b.median[1])) fail(`the median well played draft (${M.median}) goes unbeaten one run in ${Math.round(oneIn(M.median))}; measured band ${b.median[0]} to ${b.median[1]}`);
  /* The line: its article, its tiers, its long shot words, and the raw overall. */
  const longShot = def.greatSeason ? `${def.greatSeason.wins} wins` : `${odds.withArticle(String(from))} plus ${def.unit} is where unbeaten starts to be a real shot`;
  const lowO = [60, 70, 80, 88].find(o => at(sport, o) < 1 / 1000);
  const low = odds.perfectOddsLine(sport, lowO);
  if (!low.startsWith(`At ${lowO} overall ${ARTICLE[sport]} season comes about ${f(sport, lowO)}.`) || !low.includes(longShot)) fail(`the long shot line is wrong: "${low}" (wanted ${ARTICLE[sport]} and "${longShot}")`);
  const midO = [86, 88, 89, 90, 92, 93, 95].find(o => at(sport, o) >= 1 / 1000 && at(sport, o) < 1 / 20);
  const mid = odds.perfectOddsLine(sport, midO);
  if (!mid.endsWith('Rare, not impossible.') || !mid.includes(f(sport, midO))) fail(`the rare line is wrong at ${midO}: "${mid}"`);
  const top = odds.perfectOddsLine(sport, 99);
  if (!top.endsWith('You are in the conversation.')) fail(`the top line is wrong: "${top}"`);
  const half = odds.perfectOddsLine(sport, HALF[sport]);
  const halfOdds = f(sport, HALF[sport]);
  console.log(`   ${sport} ${HALF[sport]}: ${half}`);
  if (!half.startsWith(`At ${HALF[sport]} overall ${ARTICLE[sport]} season comes about ${halfOdds}.`) || halfOdds === f(sport, Math.round(HALF[sport]))) fail(`a ${HALF[sport]} does not print its own odds (${halfOdds}): "${half}"`);
  if (sport === 'mlb' && (odds.MLB_WINS_RECORD !== 116 || def.greatSeason?.wins !== odds.MLB_WINS_RECORD)) fail(`the MLB target is ${def.greatSeason?.wins}, not the record of 116 cited in perfectSeasonOdds.ts`);
  if (sport === 'nba') {
    /* Round 784's own checks on the NBA numbers its copy quotes. */
    if (!(oneIn(95) >= 500 && oneIn(95) <= 750)) fail(`a 95 goes unbeaten one run in ${Math.round(oneIn(95))}; the copy says about one in 600 (band 500 to 750)`);
    if (!(oneIn(99) >= 4 && oneIn(99) <= 6)) fail(`a 99 goes unbeaten one run in ${oneIn(99).toFixed(2)}; the copy says about one in five (band 4 to 6)`);
    if (!(oneIn(90) > 100000)) fail(`a 90 goes unbeaten one run in ${Math.round(oneIn(90))}; the honest line depends on that being over 100,000`);
    if (!(at(sport, 92) < 1 / 10000 && at(sport, 93) > 1 / 10000)) fail(`the one in 10,000 line should fall between 92 and 93 overall`);
    const ceil = odds.perfectOddsLine('nba', M.best);
    if (!ceil.startsWith('At 98.5 overall an 82-0 season comes about one run in 9.')) fail(`the ceiling line does not say one in nine, as What's New does: "${ceil}"`);
  }
}
sport = 'all';
{
  const shapes = [[0.7, '7 runs in 10'], [0.99, '9 runs in 10'], [1 / 5.4, 'one run in 5'], [1 / 619, 'one run in 620'], [1 / 33190, 'one run in 33,000'], [1 / 525000, 'one run in 530,000'], [1 / 12e6, 'one run in 12 million'], [1 / 2.7e10, 'one run in 27 billion'], [1e-13, 'one run in more than a trillion'], [0, 'never']];
  for (const [o, want] of shapes) { const got = odds.formatOneIn(o); if (got !== want) { sport = 'nba'; fail(`formatOneIn(${o}) = "${got}", wanted "${want}"`); sport = 'all'; } }
}

section = 3;
console.log('3) the best record store, per sport');
for (sport of SPORTS) {
  const key = `perfect-season-${sport}-best`;
  const G = odds.PERFECT_SEASON_SPORTS[sport].games;
  localStorage.clear();
  if (core.loadBestRecord(sport) !== null) fail('an empty store loaded a record');
  const w = x => Math.round(G * x);
  const first = core.saveBestRecord(sport, { wins: w(0.6), losses: G - w(0.6), overall: 86, date: '2026-10-01', mode: 'classic' });
  if (!first.improved || first.best.wins !== w(0.6)) fail('the first run did not become the best');
  const back = core.loadBestRecord(sport);
  if (!back || back.wins !== w(0.6) || back.losses !== G - w(0.6) || back.overall !== 86 || back.date !== '2026-10-01' || back.mode !== 'classic') fail(`the round trip lost something: ${JSON.stringify(back)}`);
  const worse = core.saveBestRecord(sport, { wins: w(0.5), losses: G - w(0.5), overall: 90, date: '2026-10-02', mode: 'hard' });
  if (worse.improved || worse.best.wins !== w(0.6) || core.loadBestRecord(sport).wins !== w(0.6)) fail('a worse run overwrote the best, so the best went down');
  const equal = core.saveBestRecord(sport, { wins: w(0.6), losses: G - w(0.6), overall: 95, date: '2026-10-03', mode: 'daily' });
  if (equal.improved || core.loadBestRecord(sport).date !== '2026-10-01') fail('an equal run moved the best sideways');
  const better = core.saveBestRecord(sport, { wins: G - 1, losses: 1, overall: 92, date: '2026-10-04', mode: 'classic' });
  if (!better.improved || core.loadBestRecord(sport).wins !== G - 1) fail('a better run did not replace the best');
  for (const other of SPORTS.filter(o => o !== sport)) if (core.loadBestRecord(other) !== null) fail(`the ${sport} best leaked into ${other}`);
  for (const garbage of ['not json {', JSON.stringify({ v: 999, wins: G, losses: 0, overall: 99, date: 'x', mode: 'classic' }), JSON.stringify({ v: 1, wins: 'eighty', losses: 0, overall: 99, date: 'x', mode: 'classic' }), JSON.stringify({ v: 1, wins: -3, losses: 0, overall: 99, date: 'x', mode: 'classic' }), JSON.stringify({ v: 1, wins: G - 2, losses: 2, overall: 99 })]) {
    localStorage.setItem(key, garbage);
    if (core.loadBestRecord(sport) !== null) fail(`hostile stored value loaded as a record: ${garbage}`);
  }
  localStorage.setItem(key, 'not json {');
  const over = core.saveBestRecord(sport, { wins: w(0.4), losses: G - w(0.4), overall: 80, date: '2026-10-05', mode: 'classic' });
  if (!over.improved || core.loadBestRecord(sport).wins !== w(0.4)) fail('a run after a corrupt store did not become the best');
}
console.log('   per sport: round trip, worse never overwrites, equal keeps the first, better replaces, no leak, five hostile values fail closed');

section = 4;
console.log('4) the copy makes no promise the numbers contradict');
/* Comments are prose about the code, the one place a banned phrase is sure to
   appear: strip them before matching. */
const stripComments = s => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/* One guide entry, from its key to its closing brace, skipping strings. */
function guideEntry(rel, route) {
  const src = readSrc(rel);
  const start = src.indexOf(`'${route}': {`);
  if (start < 0) return '';
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i += 1) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { const q = c; i += 1; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i += 1; i += 1; } continue; }
    if (c === '{') depth += 1;
    if (c === '}') { depth -= 1; if (depth === 0) return src.slice(start, i + 1); }
  }
  return '';
}
const PAGE = { nba: 'PerfectSeasonNba', nhl: 'PerfectSeasonNhl', mlb: 'PerfectSeasonMlb', nfl: 'PerfectSeasonNfl' };
const GUIDE = { nba: 'basketball', nhl: 'hockey', mlb: 'baseball', nfl: 'football' };
const PAGE_SIM = { nba: "simulateSeasonFair('nba', overall, NBA_GAMES, seed)", nfl: "simulateSeasonFair('nfl', overall, NFL_GAMES, seed)", nhl: 'simulateSeason(overall, NHL_GAMES, seed)', mlb: 'simulateSeason(overall, MLB_GAMES, seed)' };
const registry = readSrc('src/data/gameRegistry.ts');
const whatsNew = stripComments(readSrc('src/pages/WhatsNew.tsx'));
/* Wins at an overall through the real sim: [5th, 95th] percentile and mean. */
const winBand = (s, o) => {
  const w = [];
  for (let i = 0; i < 20000; i++) w.push(SIM[s](o, seedOf(i + 7, o + 0.37)).wins);
  w.sort((a, c) => a - c);
  return { p5: w[1000], p95: w[19000], mean: w.reduce((t, v) => t + v, 0) / w.length };
};
const PROMISE = /chase (the )?perfect(ion| season)|chase \d+-0|run the table/i;
const IMPOSSIBLE = /(nearly|almost|basically|virtually) impossible/i;
for (sport of SPORTS) {
  const route = `/perfect-season-${sport}`;
  const page = stripComments(readSrc(`src/pages/${PAGE[sport]}.tsx`));
  const guide = guideEntry(`src/data/gameContent/${GUIDE[sport]}.ts`, route);
  const tile = (registry.split('\n').find(l => l.includes(`path: '${route}'`)) || '');
  const tagline = odds.perfectSeasonTagline(sport);
  const M = MEASURED[sport];
  const def = odds.PERFECT_SEASON_SPORTS[sport];
  const from = odds.realShotFrom(sport);
  if (!guide) fail(`no guide entry for ${route}`);
  if (!tile) fail(`no home tile for ${route}`);
  const texts = { page, guide, tile, tagline };
  /* a. */
  if (M.allDrafts < 1 / 1000) {
    for (const [where, t] of Object.entries(texts)) { const hit = PROMISE.exec(t); if (hit) fail(`the ${where} says "${hit[0]}", but well played runs go unbeaten about ${odds.formatOneIn(M.allDrafts)}`); }
  }
  /* b. */
  if (at(sport, M.best) > 1 / 100) {
    for (const [where, t] of Object.entries(texts)) { const hit = IMPOSSIBLE.exec(t); if (hit) fail(`the ${where} says "${hit[0]}", but the best team the wheel deals goes unbeaten ${odds.formatOneIn(at(sport, M.best))}`); }
  }
  /* c. Every number quoted, against the closed form or the sim. */
  const need = (where, t, phrase) => { if (!t.includes(phrase)) fail(`the ${where} should say "${phrase}" (the numbers moved, or the words did)`); };
  const record = (where, t, phrase, o, w) => { need(where, t, phrase); const b = winBand(sport, o); if (w < b.p5 || w > b.p95) fail(`the ${where} has a ${o} overall winning ${w}, outside the sim's 5th to 95th percentile (${b.p5} to ${b.p95})`); };
  const topTenth = (where, o) => { if (!(o > M.p90)) fail(`the ${where} calls a ${o} better than nine drafts in ten, but the measured 90th percentile is ${M.p90}`); };
  const almostNever = (where, o) => { if (!(M.p99 < o)) fail(`the ${where} says the wheel almost never deals a ${o}, but one well played draft in a hundred reaches ${M.p99}`); };
  if (sport === 'nba') {
    need('guide', guide, 'A 95 goes 82-0 about one run in 600');
    need('guide', guide, 'a 99 about one in five');
    almostNever('guide', 95);
    if (from !== 95) fail(`the guide says a 95 is where 82-0 starts, the curve says ${from}`);
  }
  if (sport === 'nhl') {
    need('guide', guide, `An 88 lineup goes 82-0 about ${f('nhl', 88)}, a 90 about ${f('nhl', 90)} and a 93 about ${f('nhl', 93)}.`);
    need('guide', guide, `Most well drafted lineups land between ${Math.round(M.p10)} and ${Math.round(M.p90)}`);
    record('guide', guide, `at 93 an 82-0 comes about ${f('nhl', 93)}`, 93, 80);
    need('guide', guide, 'closes 80-2');
    need("What's New", whatsNew, `a typical lineup (${M.median.toFixed(1)} overall) goes 82-0 about ${f('nhl', M.median)}`);
    need("What's New", whatsNew, `across all of them about one run in ${Math.round(1 / M.allDrafts / 10) * 10} goes unbeaten`);
  }
  if (sport === 'mlb') {
    need('guide', guide, `A 95 lineup goes 162-0 about ${f('mlb', 95)}`);
    need('guide', guide, `rated about ${Math.round(M.p99)}, where 162-0 comes about ${f('mlb', Math.round(M.p99))}`);
    almostNever('tagline', from);
    need('tagline', tagline, 'almost never deals');
    need('guide', guide, 'the wheel almost never deals one');
    if (!(M.recordShare >= 0.15 && M.recordShare <= 0.25)) fail(`the guide says about one well drafted lineup in five reaches 116, measured ${M.recordShare}`);
    need('guide', guide, 'about one well drafted lineup in five gets there');
    need('guide', guide, `The number to chase is ${def.greatSeason.wins} wins`);
    topTenth('guide', 83);
    record('guide', guide, `A perfect 162-0 at 83 comes about ${f('mlb', 83)}`, 83, 126);
    need('guide', guide, 'the board reads 126-36');
    const typical = winBand('mlb', M.median);
    if (!(typical.mean >= 93 && typical.mean <= 97)) fail(`What's New says a typical lineup averages 95 wins; the sim at ${M.median} averages ${typical.mean.toFixed(1)}`);
    need("What's New", whatsNew, `a typical lineup rates about ${Math.round(M.median)}, averages 95 wins`);
    need("What's New", whatsNew, 'which about one draft in five reaches');
    need('tile', tile, `chase ${def.greatSeason.wins} wins`);
  }
  if (sport === 'nfl') {
    topTenth('guide', 87);
    record('guide', guide, `At 87 a 17-0 comes about ${f('nfl', 87)}`, 87, 15);
    need('guide', guide, 'lands at 15-2');
    need('guide', guide, `around ${Math.round(M.median)}, goes 17-0 about ${f('nfl', Math.round(M.median))}, and even an 88 only about ${f('nfl', 88)}`);
    need("What's New", whatsNew, `about ${f('nfl', M.median)} for a typical roster (${M.median.toFixed(1)}) and ${f('nfl', 88)} at 88`);
  }
  /* d. The page is wired to the shared pieces, and to the sim section 1 measured. */
  const wiring = [`const SPORT_KEY = '${sport}';`, '{perfectSeasonTagline(SPORT_KEY)}', 'usePerfectSeasonBest(SPORT_KEY)', 'recordBest({', '<BestSoFar best={best} />', '<SeasonOddsLines sport={SPORT_KEY} overall={overall} perfect={sim.perfect} best={best} newBest={newBest} />', PAGE_SIM[sport]];
  for (const w of wiring) if (!page.includes(w)) fail(`the page no longer has ${w}`);
  for (const own of ['perfectOddsLine(', 'saveBestRecord(', 'loadBestRecord(', 'data-perfect-odds', 'data-best-record']) if (page.includes(own)) fail(`the page keeps its own copy of the odds card (${own}); it belongs to the shared component`);
  console.log(`   ${sport}: ${tagline}`);
}

console.log('');
if (control) {
  const want = new Set(control.want);
  const got = [...red].sort();
  const same = got.length === want.size && got.every(g => want.has(g));
  if (same) { console.log(`simPerfectSeasonOdds: control ${CONTROL} turned ${control.want.join(', ')} red and nothing else. The check works.`); process.exit(0); }
  console.error(`simPerfectSeasonOdds: control ${CONTROL} should have reddened exactly ${control.want.join(', ')}, got [${got.join(', ') || 'none'}]. The control proves nothing.`);
  process.exit(1);
}
if (failures) { console.error(`simPerfectSeasonOdds: ${failures} failure(s) in ${[...red].sort().join(', ')}`); process.exit(1); }
console.log('simPerfectSeasonOdds: green. In all four sports the odds on the card are the odds in the sim, the copy agrees with both, and the best record keeps.');
