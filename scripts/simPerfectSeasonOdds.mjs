/* Round 784: the Perfect Season odds are measured, printed on the page, and honest.

   A player reported on 2026-09-22: "I never get 82-0 and I have played 1312".
   He was never going to. The NBA page's hero copy said "chase the perfect
   season" and the title is 82-0, and the page kept no record of a player's
   best run, so 1,312 seasons left nothing behind but the taunt.

   MEASURED 2026-10-01, 200,000 seasons per overall through the real
   simulateSeasonFair('nba', overall, 82, seed):
     overall  mean wins  sd    82-0
       80       48.5     4.5   0 of 200,000
       85       58.6     4.1   0 of 200,000
       88       65.2     3.7   0 of 200,000
       90       69.7     3.3   0 of 200,000  (closed form: one in about 530,000)
       92       72.1     3.0   1             (closed form: one in about 33,000)
       93       73.3     2.8   14            (closed form: one in about 8,600; the sample ran low)
       94       74.5     2.6   86, one in 2,326
       95       75.8     2.4   323, one in 619 (closed form: one in 615)
       96       76.9     2.2   1,104, one in 181
       97       78.0     2.0   3,571, one in 56
       98       79.2     1.7   11,533, one in 17
       99       80.3     1.3   37,093, one in 5
   And what the wheel actually deals, read from bref_nba_player_seasons with
   the adapter's own rating formula the same day: 18,150 rated player seasons
   (500+ minutes), 3 of them a 99, 70 at 97 or better, 238 at 95 or better,
   1,098 at 90 or better. Of the 1,616 wheel stops, 223 hold a 95 or better and
   the median stop's best player is a 90. A six pick draft therefore lands
   around 88 to 90 on an ordinary day, where an unbeaten season is rarer than
   one run in 500,000, and the one in 10,000 line the task set for "effectively
   zero" is crossed between 92 and 93 overall (closed form: 33,000 and 8,600).

   THE BEST TEAM THE GAME OFFERS, measured 2026-10-01 through the page's own
   adapter (fetchTeamSeasonIndex and fetchSquad over all 1,615 squads the live
   table gives): the strongest six the whole wheel can build with distinct
   names is Westbrook 99, Harden 98, Baylor 98, Antetokounmpo 99, Chamberlain
   99 and LeBron 98 at sixth man, a 98.52 overall (CEILING below). Through the
   real sim 21,352 of 200,000 seasons went 82-0 there, one in 9.4. Nobody gets
   that team: it needs six specific stops out of 1,615. Well played runs
   (200,000 drafts, six picks and two rerolls, the best eligible player at
   every stop, reroll a stop whose best is under 88) average 87.8 overall, nine
   in ten finish under 91.2, and 0.027 percent reach 95. Averaged over that
   spread one run in about 110,000 goes 82-0, so 1,312 runs come up empty
   98.8 percent of the time. At the well played median (87.55) the real sim
   went unbeaten 0 times in 200,000 (closed form one in 383 million). The
   reporter's 1,312 runs without one are the expected result, not bad luck.

   The fix is not a softer curve (the guide already states the 95 and 99 odds
   correctly) but honesty in the page itself: perfectSeasonOdds computes the
   exact chance from the same per game probability the sim uses, the result
   card prints it for the overall just played, the hero copy says what the real
   chase is, and the player's best record is kept per sport and shown on the
   result card and the mode screen.

   Sections:
     1. THE CLOSED FORM IS THE ENGINE. 200,000 seasons at 90, 95, 99 and the
        CEILING through the real sim; the unbeaten count must sit within five
        binomial standard deviations of perfectSeasonOdds times N (at 90 the
        expectation is 0.4, so the band tops out at 3.4). An unbeaten season is every game won, and the
        momentum term after a win is a constant, so the form is exact, not a
        fit; a sim change that the form does not follow goes red here.
     2. THE NUMBERS THE COPY PRINTS. At 95 the odds sit between one in 750 and
        one in 500 (measured one in 619), at 99 between one in 6 and one in 4,
        at the CEILING between one in 11 and one in 8 (measured one in 9.4,
        closed form 9.5), at 90 under one in 100,000. The guide in src/data/gameContent still
        carries "one run in 600" and "one in five", so the words and the maths
        agree, and perfectOddsLine and formatOneIn render the shapes the page
        shows. A curve change that moves the odds without moving the copy goes
        red here.
     3. THE BEST RECORD STORE. Round trip, garbage fails closed, a worse run
        never overwrites, an equal run keeps the first, the improved flag is
        right.

   Negative controls (SIM_PS_ODDS_CONTROL=...), each a one line rewrite in a
   copy of the module that refuses to run if the line is not found exactly once:
     steep        the 95 anchor becomes 79 expected wins, so a 95 goes unbeaten
                  about one run in 15. Section 2 goes red; section 1 stays green
                  because the closed form follows the curve. This is the defect
                  class: odds that drift away from what the copy promises.
     nomomentum   the sim loses its streak term while the closed form keeps it.
                  Section 1 goes red at 99 (about 18 percent against about 13).
   Exit 0 when a named control turned its sections red and nothing else, 1 when
   it did not (a dead control), 2 for a control name this harness does not know.

   Run: node scripts/simPerfectSeasonOdds.mjs [seasonsPerOverall] */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_PS_ODDS_CONTROL || '';
const CONTROLS = {
  steep: {
    from: '[90, 69.5], [95, 75.5], [99, 80],',
    to: '[90, 69.5], [95, 79], [99, 80],',
    note: 'the 95 anchor pays 79 expected wins, so a 95 goes unbeaten about one run in 15 while the copy still says one in 600',
    sections: [2],
  },
  nomomentum: {
    from: 'const momentum = i > 0 ? (results[i - 1] ? WIN_MOMENTUM : LOSS_MOMENTUM) : 0;',
    to: 'const momentum = 0;',
    note: 'the sim drops its streak term while the closed form keeps it',
    sections: [1],
  },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`SIM_PS_ODDS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`); process.exit(2); }

const TMP = (process.env.TEMP || process.env.TMP || os.tmpdir()).replaceAll('\\', '/');
let EXPANSION = `${ROOT_URL}/src/lib/perfectSeasonExpansion.ts`;
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/perfectSeasonExpansion.ts'), 'utf8').replace(/\r\n/g, '\n');
  const n = src.split(c.from).length - 1;
  if (n !== 1) { console.error(`control ${CONTROL}: the anchor line appears ${n} times, refusing to run a dead control`); process.exit(1); }
  EXPANSION = `${TMP}/perfectSeasonExpansion.odds-${CONTROL}-${process.pid}.ts`;
  fs.writeFileSync(EXPANSION, src.replace(c.from, c.to));
  console.log(`NEGATIVE CONTROL ON: ${c.note}`);
}

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
export const core = await import('${ROOT_URL}/src/lib/perfectSeason.ts');
export const exp = await import('${EXPANSION}');
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const { core, exp } = await import(pathToFileURL(OUT).href);
try { fs.rmSync(ENTRY); fs.rmSync(OUT); if (CONTROL) fs.rmSync(EXPANSION); } catch { /* temp only */ }

for (const [k, v] of Object.entries({ simulateSeasonFair: exp.simulateSeasonFair, perfectSeasonOdds: exp.perfectSeasonOdds, perfectOddsLine: exp.perfectOddsLine, formatOneIn: exp.formatOneIn, loadBestRecord: core.loadBestRecord, saveBestRecord: core.saveBestRecord })) {
  if (typeof v !== 'function') { console.error(`export missing: ${k}, so nothing below measures anything`); process.exit(1); }
}

let failures = 0;
let section = 0;
const red = new Set();
const fail = m => { failures += 1; red.add(section); console.error('  FAIL: ' + m); };
const N = Number(process.argv[2] || 200000);
/* The best six the whole wheel can build, measured 2026-10-01 (see the header). */
const CEILING = 98.52;

section = 1;
console.log(`1) the closed form is the engine: ${N.toLocaleString('en-US')} seasons at 90, 95, 99 and the ${CEILING} ceiling`);
for (const ovr of [90, 95, 99, CEILING]) {
  let perfect = 0;
  let wins = 0;
  for (let i = 0; i < N; i++) {
    const seed = (Math.imul(i + 1, 2654435761) ^ (ovr * 0x9e3779b9)) >>> 0;
    const r = exp.simulateSeasonFair('nba', ovr, 82, seed);
    if (r.perfect) perfect += 1;
    wins += r.wins;
  }
  const p = exp.perfectSeasonOdds('nba', ovr);
  const expected = p * N;
  const sd = Math.sqrt(N * p * (1 - p));
  const lo = Math.max(0, expected - 5 * sd);
  const hi = expected + 5 * sd;
  const oneIn = p > 0 ? Math.round(1 / p) : Infinity;
  console.log(`   ${ovr}: ${perfect} unbeaten of ${N} (mean ${(wins / N).toFixed(2)} wins); closed form one in ${oneIn.toLocaleString('en-US')} expects ${expected.toFixed(1)}, band ${lo.toFixed(1)} to ${hi.toFixed(1)}`);
  if (perfect < lo || perfect > hi) fail(`${ovr}: ${perfect} unbeaten seasons against a closed form expectation of ${expected.toFixed(1)} (five sd band ${lo.toFixed(1)} to ${hi.toFixed(1)}); the sim and perfectSeasonOdds have come apart`);
}

section = 2;
console.log('2) the numbers the copy prints');
{
  const at = o => exp.perfectSeasonOdds('nba', o);
  const oneIn = o => 1 / at(o);
  console.log(`   odds: 90 one in ${Math.round(oneIn(90)).toLocaleString('en-US')}, 93 one in ${Math.round(oneIn(93)).toLocaleString('en-US')}, 95 one in ${Math.round(oneIn(95))}, ceiling ${CEILING} one in ${oneIn(CEILING).toFixed(2)}, 99 one in ${oneIn(99).toFixed(2)}`);
  if (!(oneIn(95) >= 500 && oneIn(95) <= 750)) fail(`a 95 goes unbeaten one run in ${Math.round(oneIn(95))}; the copy says about one in 600 (band 500 to 750)`);
  if (!(oneIn(99) >= 4 && oneIn(99) <= 6)) fail(`a 99 goes unbeaten one run in ${oneIn(99).toFixed(2)}; the copy says about one in five (band 4 to 6)`);
  if (!(oneIn(CEILING) >= 8 && oneIn(CEILING) <= 11)) fail(`the best team the wheel can build (${CEILING}) goes unbeaten one run in ${oneIn(CEILING).toFixed(2)}; measured one in 9.4 (band 8 to 11)`);
  if (!(oneIn(90) > 100000)) fail(`a 90 goes unbeaten one run in ${Math.round(oneIn(90))}; the honest line depends on that being over 100,000`);
  if (!(at(92) < 1 / 10000 && at(93) > 1 / 10000)) fail(`the one in 10,000 line should fall between 92 and 93 overall (92: one in ${Math.round(oneIn(92))}, 93: one in ${Math.round(oneIn(93))})`);
  let prev = 0;
  for (let o = 60; o <= 99; o += 1) { const v = at(o); if (v < prev) fail(`perfectSeasonOdds is not monotone at ${o}`); prev = v; }
  const guide = fs.readFileSync(path.join(ROOT, 'src/data/gameContent/basketball.ts'), 'utf8');
  if (!guide.includes('A 95 goes 82-0 about one run in 600')) fail('the NBA guide no longer says a 95 goes 82-0 about one run in 600; the words and the maths must move together');
  if (!guide.includes('a 99 about one in five')) fail('the NBA guide no longer says a 99 goes 82-0 about one in five');
  const f = exp.formatOneIn;
  const shapes = [[1 / 5.4, 'one run in 5'], [1 / 619, 'one run in 620'], [1 / 33190, 'one run in 33,000'], [1 / 525000, 'one run in 530,000'], [1 / 12e6, 'one run in 12 million'], [0, 'never']];
  for (const [odds, want] of shapes) { const got = f(odds); if (got !== want) fail(`formatOneIn(${odds}) = "${got}", wanted "${want}"`); }
  const low = exp.perfectOddsLine('nba', 88);
  const high = exp.perfectOddsLine('nba', 99);
  const mid = exp.perfectOddsLine('nba', 95);
  console.log(`   88: ${low}`);
  console.log(`   95: ${mid}`);
  console.log(`   99: ${high}`);
  if (!/At 88 overall an 82-0 season comes about one run in [\d,]+( million)?\./.test(low) || !low.includes('95 plus')) fail(`the low line does not print the odds and the 95 plus target: "${low}"`);
  if (!high.startsWith('At 99 overall an 82-0 season comes about one run in 5.') || !high.includes('in the conversation')) fail(`the high line is wrong: "${high}"`);
  const nfl = exp.perfectOddsLine('nfl', 90);
  if (!nfl.startsWith('At 90 overall a 17-0 season')) fail(`the article in front of 17-0 is wrong: "${nfl}"`);
  /* 615 exact, printed to two figures; the band is the copy's "about one in 600". */
  if (!/one run in 6\d0\./.test(mid) || !mid.includes('Rare, not impossible')) fail(`the mid line is wrong: "${mid}"`);
}

section = 3;
console.log('3) the best record store');
{
  const key = 'perfect-season-nba-best';
  localStorage.clear();
  if (core.loadBestRecord('nba') !== null) fail('an empty store loaded a record');
  const first = core.saveBestRecord('nba', { wins: 60, losses: 22, overall: 86, date: '2026-10-01', mode: 'classic' });
  if (!first.improved || first.best.wins !== 60) fail('the first run did not become the best');
  const back = core.loadBestRecord('nba');
  if (!back || back.wins !== 60 || back.losses !== 22 || back.overall !== 86 || back.date !== '2026-10-01' || back.mode !== 'classic') fail(`the round trip lost something: ${JSON.stringify(back)}`);
  const worse = core.saveBestRecord('nba', { wins: 55, losses: 27, overall: 90, date: '2026-10-02', mode: 'hard' });
  if (worse.improved || worse.best.wins !== 60 || core.loadBestRecord('nba').wins !== 60) fail('a worse run overwrote the best');
  const equal = core.saveBestRecord('nba', { wins: 60, losses: 22, overall: 95, date: '2026-10-03', mode: 'daily' });
  if (equal.improved || core.loadBestRecord('nba').date !== '2026-10-01') fail('an equal run moved the best sideways');
  const better = core.saveBestRecord('nba', { wins: 77, losses: 5, overall: 92, date: '2026-10-04', mode: 'classic' });
  if (!better.improved || core.loadBestRecord('nba').wins !== 77) fail('a better run did not replace the best');
  if (core.loadBestRecord('nhl') !== null) fail('the NBA best leaked into another sport');
  for (const garbage of ['not json {', JSON.stringify({ v: 999, wins: 82, losses: 0, overall: 99, date: 'x', mode: 'classic' }), JSON.stringify({ v: 1, wins: 'eighty', losses: 0, overall: 99, date: 'x', mode: 'classic' }), JSON.stringify({ v: 1, wins: -3, losses: 0, overall: 99, date: 'x', mode: 'classic' }), JSON.stringify({ v: 1, wins: 80, losses: 2, overall: 99 })]) {
    localStorage.setItem(key, garbage);
    if (core.loadBestRecord('nba') !== null) fail(`hostile stored value loaded as a record: ${garbage}`);
  }
  localStorage.setItem(key, 'not json {');
  const over = core.saveBestRecord('nba', { wins: 40, losses: 42, overall: 80, date: '2026-10-05', mode: 'classic' });
  if (!over.improved || core.loadBestRecord('nba').wins !== 40) fail('a run after a corrupt store did not become the best');
  console.log('   round trip, worse never overwrites, equal keeps the first, five hostile values fail closed');
}

console.log('');
if (CONTROL) {
  const want = CONTROLS[CONTROL].sections;
  const got = [...red].sort();
  const same = got.length === want.length && want.every(w => red.has(w));
  if (same) { console.log(`simPerfectSeasonOdds: control ${CONTROL} turned section(s) ${want.join(', ')} red and nothing else. The check works.`); process.exit(0); }
  console.error(`simPerfectSeasonOdds: control ${CONTROL} should have reddened exactly section(s) ${want.join(', ')}, got [${got.join(', ') || 'none'}]. The control proves nothing.`);
  process.exit(1);
}
if (failures) { console.error(`simPerfectSeasonOdds: ${failures} failure(s) in section(s) ${[...red].sort().join(', ')}`); process.exit(1); }
console.log('simPerfectSeasonOdds: green. The odds on the card are the odds in the sim, the copy agrees with both, and the best record keeps.');
