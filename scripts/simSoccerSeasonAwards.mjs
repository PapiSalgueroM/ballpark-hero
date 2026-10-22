/* Round 1525: Soccer Career's season awards, won against a field, only in the seasons they were given for.
 *
 * src/lib/soccerSeasonAwards.ts decides the eight season awards (Player of the Year, Puskas, Golden Boot, Golden
 * Glove, Young Player, UEFA Player, Comeback, Fair Play) on careerAwards.ts's field draw, each on a stream keyed to
 * the career, the season and the award. The engine still draws every old coin and throws it away.
 *
 * 1) THE FIELD is fresh. The house fleet (scripts/lib/careerStep.mjs) is played at every position and the season
 *    at the awards block is read the way the table was measured (20 or more games; strikers' goals at a top two
 *    tier club; keepers' clean sheets; the level per position). Every mean and sd of the
 *    table must sit within BOUNDS of what this run measures. Fails when the engine moves under the table. Control
 *    stale (the striker level mean moved by 0.2 in the table) must fail on the strikers.
 * 2) THE RATES. A natural fleet (every position, eras 1990 to 2020): for every decision the engine made, the
 *    model's own chance of it (from the season's score, the table and the config); the wins the engine handed out
 *    must match the chances summed (binomial bound), the top of each award (its designed share of eligible
 *    seasons, by score) must win more often than not, and the rate per 100 eligible seasons on the population a
 *    field was measured on must sit near the designed one winner a league a season (100 / (rivals + 1)). Prints
 *    rates per position and tier band and per career against the old bars and coins on the same seasons.
 * 3) THE YEARS. An era fleet (starts 1990 to 2015, strong starts, keepers in it) holds no Golden Glove before
 *    2004-05, no UEFA Player of the Year outside 2010-11 to 2022-23 and no Puskas before 2008-09, and some inside
 *    each window. Control nogate (the three year gates gone from the eligibility) must find early ones.
 * 4) THE MAIN STREAM. Every season of a fleet is played twice from the same state and the same seed: by this tree
 *    and by this tree with Round 1525 taken out (scripts/lib/careerSoccerAwards1525.mjs, the base's engine byte for
 *    byte). At the end of the awards block both have made the same number of Math.random draws and hold the same
 *    season row. Control dropcoins (the eight old coins no longer drawn) must part.
 * 5) THE US CAREERS. The round lifts the field draw out of careerAwards.ts into awardDraw.ts (so this page never
 *    loads the four US tables) and careerAwards.ts re-exports it. Each US engine is bundled with this round's
 *    careerAwards.ts and with the base's, and seeded careers at every position and archetype (6 each, 18 seasons,
 *    morale and team quality from a stream of their own, simCareerForm section 1's replay) must be the same string
 *    after every season and every progress step. Control usdrift (the MLB All-Star grade moved) must part.
 * 6) LEGACY. calculateLegacy's code (comments stripped) reads no awards and no popularity, so no award this round
 *    moves can reach it directly. A doctored copy that reads state.awards must be caught (built in control).
 *
 * Environment: SIM_SEASON_AWARDS_SECTIONS (comma separated, default all), SIM_SEASON_AWARDS_SEED,
 * SIM_SEASON_AWARDS_POS (section 1: one position), SIM_SEASON_AWARDS_FIELD_N (section 1 careers a position),
 * SIM_SEASON_AWARDS_N (section 2 careers), SIM_SEASON_AWARDS_ERA (section 3 careers), SIM_SEASON_AWARDS_LOCK
 * (section 4 careers), SIM_SEASON_AWARDS_CONTROL (stale, nogate, dropcoins, usdrift), SIM_SEASON_AWARDS_MEASURE=1
 * (section 1 prints and judges nothing). Never reads the network.
 * Exit 1 on any failure; the last line says green or red.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { inverseSoccerAwards, soccerAwardsReceiptProblem, SOCCER_AWARDS_BASE } from './lib/careerSoccerAwards1525.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_SEASON_AWARDS_CONTROL || '';
const CONTROLS = { stale: '1', nogate: '3', dropcoins: '4', usdrift: '5' };
if (CONTROL && !CONTROLS[CONTROL]) { console.log(`ABORT: unknown SIM_SEASON_AWARDS_CONTROL ${CONTROL}`); process.exit(1); }
const SECTIONS = (process.env.SIM_SEASON_AWARDS_SECTIONS || (CONTROL ? CONTROLS[CONTROL] : '1,2,3,4,5,6')).split(',').map(s => s.trim());
const runs = n => SECTIONS.includes(n);
const SEED = Number(process.env.SIM_SEASON_AWARDS_SEED || 1525);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'season-awards-'));
const failures = [];
const fail = msg => { failures.push(msg); console.log(`   FAIL ${msg}`); };
const norm = p => path.resolve(p).split(path.sep).join('/').toLowerCase();
const lf = s => s.split('\r\n').join('\n');
const read = rel => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const AWARDS = 'src/lib/soccerSeasonAwards.ts';
const CAREER_AWARDS = 'src/lib/careerAwards.ts';
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const once = (text, needle, what) => {
  if (text.split(needle).length !== 2) { console.log(`ABORT: ${what} does not hold ${JSON.stringify(needle.slice(0, 90))} once`); process.exit(1); }
};

/* One bundle of the engine, the attributes and the awards module, some files served from given text, then the
   bundle text patched: soccerAwardWon wrapped so every decision is seen, and a hook at the end of the awards block. */
async function soccer(name, serve = {}) {
  const entry = path.join(TMP, `${name}-entry.ts`);
  fs.writeFileSync(entry, [['E', 'soccerCareerEngine'], ['A', 'soccerCareerAttributes'], ['W', 'soccerSeasonAwards'], ['T', 'soccerWorldTruth']]
    .map(([k, m]) => `export * as ${k} from '${path.join(ROOT, 'src/lib', m).split(path.sep).join('/')}';`).join('\n'));
  const out = path.join(TMP, `${name}.mjs`);
  const map = new Map(Object.entries(serve).map(([rel, text]) => [norm(path.join(ROOT, rel)), text]));
  const served = new Set();
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT,
    plugins: [{ name: 'serve', setup(b) { b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const text = map.get(norm(args.path));
      if (text === undefined) return undefined;
      served.add(norm(args.path));
      return { contents: text, loader: 'ts' };
    }); } }] });
  for (const key of map.keys()) if (!served.has(key)) { console.log(`ABORT: ${name}: the bundle never loaded ${key}`); process.exit(1); }
  let text = fs.readFileSync(out, 'utf8');
  const WON = 'function soccerAwardWon(';
  if (text.includes(WON)) {
    once(text, WON, `${name}'s bundle`);
    text = text.replace(WON, 'function soccerAwardWon__decide(');
    text += '\nfunction soccerAwardWon(a, s, r) { const w = soccerAwardWon__decide(a, s, r); if (globalThis.__awardCall) globalThis.__awardCall(a, s, w); return w; }\n';
  }
  const END = 'const totalGoals = ';
  once(text, END, `${name}'s bundle`);
  const at = text.indexOf(END);
  const seasonVar = /^const totalGoals = (\w+)\.seasons\.reduce\(\(sum, ss\) => sum \+ ss\.goals, 0\) \+ (\w+)\.goals;/.exec(text.slice(at, at + 200));
  if (!seasonVar) { console.log(`ABORT: ${name}: the line after the awards block is not where it was`); process.exit(1); }
  text = `${text.slice(0, at)}if (globalThis.__awardsEnd) globalThis.__awardsEnd(${seasonVar[2]});\n  ${text.slice(at)}`;
  fs.writeFileSync(out, text);
  return import(pathToFileURL(out).href);
}
const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
let draws = 0;
const seedRandom = seed => { const r = mulberry(seed); draws = 0; Math.random = () => { draws += 1; return r(); }; };
const POS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'CDM', 'RB', 'RW', 'LB'];
const STAT_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const ERAS = [['2020-24', 2020], ['2010-14', 2010], ['2000-04', 2000], ['1990-94', 1990]];
function newCareer(S, i, { era = '2020-24', start = 2020, ovr = 56 + (i % 5) * 3, pos = POS[i % POS.length], name = `Award Sim ${i}` } = {}) {
  const off = S.A.POSITION_OFFSETS[pos];
  const stats = Object.fromEntries(STAT_KEYS.map((k, j) => [k, Math.max(25, Math.min(99, ovr + off[j]))]));
  return S.E.initCareer(name, i % 2 ? 'England' : 'Spain', pos, era, stats, ovr, start, S.E.FALLBACK_CLUBS, null, Math.min(94, ovr + 20));
}
const { careerStep } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerStep.mjs')).href);
function step(S, c) {
  if (c.phase === 'retirement_suggestion') return S.E.declineRetirementSuggestion(c, S.E.FALLBACK_CLUBS);
  if (c.phase === 'retirement_ceremony' || c.phase === 'post_retirement' || c.phase === 'retired') return { ...c, retired: true };
  return careerStep(S.E, c, S.E.FALLBACK_CLUBS);
}
/* A whole house career from its own seed. */
function wholeCareer(S, i, seed, opts) {
  seedRandom(seed * 7919 + i * 131);
  let c = newCareer(S, i, opts);
  for (let k = 0; k < 1500 && !c.retired; k += 1) c = step(S, c);
  return c;
}
/* A copy of a career for two trees to play from: plain objects and arrays copied, an event's apply function kept. */
const deepCopy = v => (Array.isArray(v) ? v.map(deepCopy) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepCopy(x)])) : v);
const meanSd = a => { const n = a.length; const m = a.reduce((x, y) => x + y, 0) / n; return { n, mean: m, sd: Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, n - 1)) }; };
const f2 = n => (Number.isFinite(n) ? n.toFixed(2) : String(n));

/* The model's own chance that a season wins, from the table and the config (the draw is careerAwards.ts's best of
   n Gumbel bar, so the chance is exact): P = exp(-exp(-(z - grade - loc) * root)). Puskas: goals / (goals + field). */
function barOf(n) { const nn = Math.max(2, n); const L = Math.log(nn); const root = Math.sqrt(2 * L); return { loc: root - (Math.log(L) + Math.log(4 * Math.PI)) / (2 * root), root }; }
function chanceOf(W, award, s) {
  if (!W.soccerAwardEligible(award, s)) return 0;
  if (award === 'Puskás Award') return s.goals / (s.goals + W.PUSKAS_FIELD_GOALS);
  const { score, field } = W.soccerAwardScore(award, s);
  const cfg = W.soccerAwardConfig(award, s.position);
  const z = field.sd > 0 ? (score - field.mean) / field.sd : 0;
  const { loc, root } = barOf(Math.max(1.2, cfg.pool / Math.max(1, cfg.slots)));
  return Math.exp(-Math.exp(-(z - (cfg.grade ?? 0) - loc) * root));
}
const AWARD_NAMES = ['Player of the Year', 'Puskás Award', 'Golden Boot', 'Golden Glove', 'Young Player of the Year', 'UEFA Player of the Year', 'Comeback Player of the Year', 'Fair Play Award'];

if (runs('1')) {
  console.log('1) the field table against the engine it was measured on');
  const STALE = '[6.53, 0.95]';
  let awardsText = read(AWARDS);
  once(awardsText, STALE, AWARDS);
  if (CONTROL === 'stale') { console.log('   CONTROL stale: the striker level mean moved from 6.53 to 6.73 in this bundle\'s table'); awardsText = awardsText.replace(STALE, STALE.replace('6.53', '6.73')); }
  const S = await soccer(CONTROL === 'stale' ? 'field-stale' : 'field', CONTROL === 'stale' ? { [AWARDS]: awardsText } : {});
  const W = S.W;
  const only = process.env.SIM_SEASON_AWARDS_POS ? [process.env.SIM_SEASON_AWARDS_POS] : CONTROL === 'stale' ? ['ST'] : POS;
  const N = Number(process.env.SIM_SEASON_AWARDS_FIELD_N || 600);
  /* Measured headroom, remote check r1525-f1 (2026-10-22, seeds 1525, 2024 and 77, 600 careers a position, all ten
     positions): the largest gap between the table and a run was 0.03 on a level mean and
     0.02 on its sd, 0.11 and 0.05 on the strikers' goals, 0.10 and 0.05 on the keepers' clean sheets. Each bound is
     twice that, so a run never sits near it, and an engine change that moves a field by a tenth of its sd fails. */
  const BOUNDS = { level: [0.06, 0.04], goals: [0.25, 0.15], sheets: [0.2, 0.12] };
  const MEASURE = process.env.SIM_SEASON_AWARDS_MEASURE === '1';
  const check = (what, got, want, [dm, ds]) => {
    const line = `${what}: mean ${f2(got.mean)} (table ${f2(want.mean)}), sd ${f2(got.sd)} (table ${f2(want.sd)}), n ${got.n}`;
    console.log(`   ${line}`);
    if (MEASURE) return;
    if (got.n < 1000) fail(`${what}: only ${got.n} seasons, too thin to judge the table`);
    if (Math.abs(got.mean - want.mean) > dm) fail(`${what}: the mean moved ${f2(got.mean - want.mean)}, past ${dm}`);
    if (Math.abs(got.sd - want.sd) > ds) fail(`${what}: the sd moved ${f2(got.sd - want.sd)}, past ${ds}`);
  };
  for (const pos of only) {
    const rows = [];
    globalThis.__awardCall = (award, s) => { if (award === 'Player of the Year') rows.push({ ...s }); };
    for (let i = 0; i < N; i += 1) {
      const [era, start] = ERAS[Math.floor(i / 5) % ERAS.length];
      wholeCareer(S, i, SEED + 1 + pos.charCodeAt(0) * 3 + pos.charCodeAt(1), { era, start, pos, name: `Field ${pos} ${i}` });
    }
    globalThis.__awardCall = null;
    const w = rows.filter(r => r.apps >= 20);
    check(`${pos} level`, meanSd(w.map(r => r.level)), W.soccerField(pos), BOUNDS.level);
    if (pos === 'ST') check('ST goals at a top two tier club', meanSd(w.filter(r => r.clubTier <= 2).map(r => r.goals)), W.SOCCER_GOALS_FIELD, BOUNDS.goals);
    if (pos === 'GK') check('GK clean sheets', meanSd(w.map(r => r.cleanSheets)), W.SOCCER_SHEETS_FIELD, BOUNDS.sheets);
  }
}

if (runs('2')) {
  console.log('2) the rates: the engine hands out the model\'s awards, the best seasons win, one winner a league a season');
  const S = await soccer('rates');
  const W = S.W;
  const N = Number(process.env.SIM_SEASON_AWARDS_N || 2000);
  const calls = [];
  const careers = new Map();
  let career = 0;
  globalThis.__awardCall = (award, s, won) => { calls.push({ award, s, won, career }); };
  for (let i = 0; i < N; i += 1) {
    /* position, start overall and era each on their own digit of i, so no position is always the weakest start */
    const [era, start] = ERAS[Math.floor(i / 50) % ERAS.length];
    career = i;
    const c = wholeCareer(S, i, SEED + 2, { era, start, ovr: 56 + (Math.floor(i / POS.length) % 5) * 3 });
    careers.set(i, c.position);
  }
  globalThis.__awardCall = null;
  const band = t => (t >= 3 ? '3+' : String(t));
  console.log(`   ${N} house careers (seed ${SEED + 2}), ${calls.length / AWARD_NAMES.length} seasons decided`);
  if (calls.length < N * AWARD_NAMES.length * 8) fail(`only ${calls.length} decisions, too thin to mean anything`);
  for (const award of AWARD_NAMES) {
    const mine = calls.filter(c => c.award === award);
    const elig = mine.filter(c => W.soccerAwardEligible(award, c.s));
    let expected = 0, wins = 0;
    const by = new Map();
    for (const c of elig) {
      const p = chanceOf(W, award, c.s);
      c.p = p; expected += p; if (c.won) wins += 1;
      const key = `${c.s.position} ${band(c.s.clubTier)}`;
      const b = by.get(key) || { n: 0, w: 0 }; b.n += 1; if (c.won) b.w += 1; by.set(key, b);
    }
    const strays = mine.filter(c => c.won && !W.soccerAwardEligible(award, c.s)).length;
    const perCareer = wins / N;
    console.log(`   ${award}: ${elig.length} eligible seasons, ${wins} won (model ${f2(expected)}), ${f2(100 * wins / Math.max(1, elig.length))} per 100 eligible, ${perCareer.toFixed(3)} a career`);
    const rowsOut = POS.map(p => `${p} ${['1', '2', '3+'].map(t => { const b = by.get(`${p} ${t}`); return b ? `${t}:${f2(100 * b.w / b.n)}(${b.n})` : `${t}:-`; }).join(' ')}`);
    console.log(`     per 100 eligible by position and tier band: ${rowsOut.join(' | ')}`);
    if (strays > 0) fail(`${award}: ${strays} wins on seasons the award may not go to`);
    if (Math.abs(wins - expected) > 4 * Math.sqrt(expected) + 3) fail(`${award}: the engine handed out ${wins}, the model says ${f2(expected)}`);
    if (award === 'Puskás Award') continue;
    /* the best season: one that beats the field's typical best rival (the bar's median) */
    const cfgOf = c => W.soccerAwardConfig(award, c.s.position);
    const best = elig.filter(c => {
      const { score, field } = W.soccerAwardScore(award, c.s);
      const cfg = cfgOf(c); const { loc, root } = barOf(Math.max(1.2, cfg.pool / Math.max(1, cfg.slots)));
      return (score - field.mean) / field.sd - (cfg.grade ?? 0) >= loc + 0.3665 / root;
    });
    const bestWins = best.filter(c => c.won).length;
    const bestModel = best.reduce((sum, c) => sum + c.p, 0);
    const bestVar = best.reduce((sum, c) => sum + c.p * (1 - c.p), 0);
    console.log(`     the best seasons (past the typical best rival): ${best.length}, won ${bestWins} (${f2(100 * bestWins / Math.max(1, best.length))} percent; the model ${f2(100 * bestModel / Math.max(1, best.length))})`);
    if (best.length > 0 && bestModel * 2 <= best.length) fail(`${award}: the model gives the best seasons ${f2(bestModel)} of ${best.length}, not more often than not`);
    if (bestWins < bestModel - 3 * Math.sqrt(bestVar) - 1) fail(`${award}: the best seasons won ${bestWins}, well under the model's ${f2(bestModel)}`);
    if (best.length >= 100 && bestWins * 2 <= best.length) fail(`${award}: the best seasons won ${bestWins} of ${best.length}, not more often than not`);
    if (best.length < 100) console.log('     (under 100 such seasons: the share is judged on the model and the wins against it)');
  }
  /* one winner a league a season, on the populations the two counting awards' fields were measured on */
  for (const [award, pos, pop] of [['Golden Boot', 'ST', c => c.s.position === 'ST'], ['Golden Glove', 'GK', c => c.s.position === 'GK']]) {
    const e = calls.filter(c => c.award === award && W.soccerAwardEligible(award, c.s) && pop(c));
    const rate = 100 * e.filter(c => c.won).length / Math.max(1, e.length);
    const cfg = W.soccerAwardConfig(award, pos);
    const designed = 100 / (cfg.pool / cfg.slots + 1);
    console.log(`   ${award} (${pos}): ${f2(rate)} per 100 eligible seasons, designed ${f2(designed)}, ratio ${f2(rate / designed)}`);
    if (e.length < 1000) fail(`${award}: only ${e.length} ${pos} seasons, too thin`);
    else if (rate / designed < 0.6 || rate / designed > 1.6) fail(`${award}: ${f2(rate)} per 100 is not one winner in ${cfg.pool / cfg.slots} (${f2(designed)})`);
  }
}

if (runs('3')) {
  console.log('3) the years: no award in a season it was not given for');
  const GATES = [
    ["'Golden Glove': [20, 'sheets', s => s.position === 'GK' && s.apps >= 20 && goldenGloveAwardExists(s.year)]", "'Golden Glove': [20, 'sheets', s => s.position === 'GK' && s.apps >= 20]"],
    ["'UEFA Player of the Year': [10, 'vote', s => s.championsLeague && s.apps >= 20 && uefaPlayerAwardExists(s.year)]", "'UEFA Player of the Year': [10, 'vote', s => s.championsLeague && s.apps >= 20]"],
    ["const puskasEligible = (s: SoccerAwardSeason) => s.goals > 0 && puskasAwardExists(s.year);", "const puskasEligible = (s: SoccerAwardSeason) => s.goals > 0;"],
  ];
  let awardsText = read(AWARDS);
  for (const [was] of GATES) once(awardsText, was, AWARDS);
  if (CONTROL === 'nogate') {
    console.log('   CONTROL nogate: the three year gates are gone from this bundle');
    for (const [was, now] of GATES) awardsText = awardsText.replace(was, now);
  }
  const S = await soccer(CONTROL === 'nogate' ? 'era-nogate' : 'era', CONTROL === 'nogate' ? { [AWARDS]: awardsText } : {});
  const N = Number(process.env.SIM_SEASON_AWARDS_ERA || 360);
  const STARTS = [['1990-94', 1990], ['1995-99', 1995], ['2000-04', 2000], ['2005-09', 2005], ['2010-14', 2010], ['2015-19', 2015]];
  const ERA_POS = ['GK', 'ST', 'LW', 'CAM', 'GK', 'RW', 'CM', 'CB'];
  const WINDOWS = { 'Golden Glove': [2004, 9999], 'UEFA Player of the Year': [2010, 2022], 'Puskás Award': [2008, 9999] };
  const count = Object.fromEntries(Object.keys(WINDOWS).map(k => [k, { out: 0, in: 0 }]));
  for (let i = 0; i < N; i += 1) {
    const [era, start] = STARTS[Math.floor(i / 32) % STARTS.length];
    const c = wholeCareer(S, i, SEED + 3, { era, start, ovr: 70 + (Math.floor(i / ERA_POS.length) % 4) * 3, pos: ERA_POS[i % ERA_POS.length], name: `Era Sim ${i}` });
    for (const a of c.awards ?? []) {
      const w = WINDOWS[a.name];
      if (!w) continue;
      if (a.year < w[0] || a.year > w[1]) count[a.name].out += 1; else count[a.name].in += 1;
    }
  }
  for (const [name, [lo, hi]] of Object.entries(WINDOWS)) {
    console.log(`   ${name}: ${count[name].out} outside ${lo}${hi < 9999 ? ` to ${hi}` : ' on'}, ${count[name].in} inside (${N} careers from 1990 to 2015, seed ${SEED + 3})`);
    if (count[name].out > 0) fail(`${count[name].out} ${name} awards in seasons it was not given for`);
    if (count[name].in === 0) fail(`no ${name} inside its years either, so the fleet proves nothing`);
  }
}

if (runs('4')) {
  console.log('4) the main stream: every season draws as the base did, to the end of the awards block');
  const COINS = ['poyCoin', 'puskasCoin', 'bootCoin', 'gloveCoin', 'youngCoin', 'uefaCoin', 'comebackCoin', 'fairCoin'];
  let headText = read(ENGINE);
  for (const coin of COINS) {
    const at = headText.indexOf(`const ${coin} = `);
    const end = at < 0 ? -1 : headText.indexOf(';', at);
    const line = at < 0 ? '' : headText.slice(at, end + 1);
    if (at < 0 || headText.indexOf(`const ${coin} = `, at + 1) >= 0 || !line.endsWith(' ? Math.random() : 0;')) { console.log(`ABORT: the ${coin} line is not in ${ENGINE} once as a kept coin`); process.exit(1); }
    if (CONTROL === 'dropcoins') headText = headText.replace(line, line.replace(' ? Math.random() : 0;', ' ? 0 : 0;'));
  }
  if (CONTROL === 'dropcoins') console.log('   CONTROL dropcoins: the eight old coins are no longer drawn in this tree\'s bundle');
  const H = await soccer(CONTROL === 'dropcoins' ? 'lock-head-dropped' : 'lock-head', CONTROL === 'dropcoins' ? { [ENGINE]: headText } : {});
  const receipt = [];
  const B = await soccer('lock-base', { [ENGINE]: inverseSoccerAwards(ENGINE, read(ENGINE), receipt) });
  const problem = soccerAwardsReceiptProblem(receipt);
  if (problem) { console.log(`ABORT: ${problem}`); process.exit(1); }
  const N = Number(process.env.SIM_SEASON_AWARDS_LOCK || 160);
  let seasons = 0, drawParts = 0, rowParts = 0, hookParts = 0, outcomeDiffers = 0;
  for (let i = 0; i < N; i += 1) {
    const [era, start] = ERAS[Math.floor(i / 40) % ERAS.length];
    seedRandom((SEED + 4) * 1000 + i);
    let c = newCareer(H, i, { era, start, ovr: 62 + (Math.floor(i / POS.length) % 4) * 4 });
    for (let k = 0; k < 1500 && !c.retired; k += 1) {
      const seed = (SEED + 4) * 100000 + i * 1000 + k;
      const both = [H, B].map(S => {
        seedRandom(seed);
        let at = null;
        globalThis.__awardsEnd = season => { at = { d: draws, row: JSON.stringify(season) }; };
        const out = step(S, deepCopy(c));
        globalThis.__awardsEnd = null;
        return { at, out };
      });
      if ((both[0].at === null) !== (both[1].at === null)) hookParts += 1;
      else if (both[0].at) {
        seasons += 1;
        if (both[0].at.d !== both[1].at.d) drawParts += 1;
        if (both[0].at.row !== both[1].at.row) rowParts += 1;
        const yearOf = JSON.parse(both[0].at.row).year;
        const named = o => JSON.stringify((o.out.awards ?? []).filter(a => a.year === yearOf && AWARD_NAMES.includes(a.name)).map(a => a.name).sort());
        if (named(both[0]) !== named(both[1])) outcomeDiffers += 1;
      }
      c = both[0].out;
    }
  }
  console.log(`   ${N} careers, ${seasons} seasons played by both trees from one state and one seed: draws parted at ${drawParts}, the season row at ${rowParts}, the awards block ran in one tree only ${hookParts} times; the season's awards differ in ${outcomeDiffers} (the round's own change)`);
  if (seasons < N * 10) fail(`only ${seasons} seasons were compared`);
  if (drawParts + rowParts + hookParts > 0) fail(`the main stream moved: ${drawParts} draw counts, ${rowParts} season rows, ${hookParts} blocks part from the base`);
  if (outcomeDiffers === 0) fail('no season\'s awards differ from the base, so the comparison never met the round\'s change');
}

/* One bundle's text, some files served from given text. */
async function bundleText(entry, serve = {}) {
  const map = new Map(Object.entries(serve).map(([rel, text]) => [norm(path.join(ROOT, rel)), text]));
  const served = new Set();
  const r = await build({ entryPoints: [path.join(ROOT, entry)], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT,
    plugins: [{ name: 'serve', setup(b) { b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const text = map.get(norm(args.path));
      if (text === undefined) return undefined;
      served.add(norm(args.path));
      return { contents: text, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
    }); } }] });
  return { text: r.outputFiles[0].text, served: [...served] };
}

if (runs('5')) {
  console.log('5) the US careers replay byte identical with the base\'s careerAwards.ts (the draw moved to awardDraw.ts)');
  let base;
  try { base = lf(execFileSync('git', ['show', `${SOCCER_AWARDS_BASE}:${CAREER_AWARDS}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 })); }
  catch { console.log(`ABORT: git cannot show ${CAREER_AWARDS} at ${SOCCER_AWARDS_BASE.slice(0, 8)} (a shallow clone?)`); process.exit(1); }
  let head = read(CAREER_AWARDS);
  if (head === base) fail(`${CAREER_AWARDS} is the base's own file, so there is nothing to prove`);
  if (base.includes("from './awardDraw'")) fail(`at ${SOCCER_AWARDS_BASE.slice(0, 8)} ${CAREER_AWARDS} already read awardDraw.ts, so the base arm is not the tree before the lift`);
  const DRIFT = 'const MLB_ALL_STAR: FieldConfig = { pool: 780, slots: 64, grade: 0.15 };';
  once(head, DRIFT, CAREER_AWARDS);
  if (CONTROL === 'usdrift') { console.log('   CONTROL usdrift: the MLB All-Star grade moved from 0.15 to 0.65 in this round\'s file'); head = head.replace(DRIFT, DRIFT.replace('0.15', '0.65')); }
  /* The four engines and their entry points, as simCareerForm section 1 drives them. nbaCareerAwards.ts, the other
     importer, is played inside the NBA career; usCareerStatLine.ts imports a type only. */
  const US = [
    { id: 'nba', file: 'src/lib/nbaMyCareer.ts', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress' },
    { id: 'nfl', file: 'src/lib/nflMyCareer.ts', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress' },
    { id: 'mlb', file: 'src/lib/mlbMyCareer.ts', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress' },
    { id: 'nhl', file: 'src/lib/nhlMyCareer.ts', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress' },
  ];
  const load = async (name, entry, text) => {
    const b = await bundleText(entry, { [CAREER_AWARDS]: text });
    if (b.served.length === 0) fail(`${entry} never loaded ${CAREER_AWARDS}, so it proves nothing`);
    const out = path.join(TMP, `${name}.mjs`);
    fs.writeFileSync(out, b.text);
    return import(pathToFileURL(out).href);
  };
  /* Every position and archetype, 6 seeded careers each, 18 seasons; morale and team quality from a stream of their own. */
  const replay = (lib, sport) => {
    const trail = [];
    const real = Math.random;
    for (const pos of Object.keys(lib[sport.arch])) for (const archetype of lib[sport.arch][pos]) for (let k = 0; k < 6; k += 1) {
      const seed = 1000 + k * 7919, rng = mulberry(seed), dial = mulberry(seed ^ 0x5bd1e995);
      Math.random = mulberry(seed + 17);
      try {
        const c = lib[sport.start]('Replay Man', pos, archetype, rng);
        for (let y = 0; y < 18 && !c.retired; y += 1) {
          c.morale = Math.round(dial() * 100);
          trail.push(JSON.stringify(lib[sport.season](c, 70 + Math.floor(dial() * 20), rng)), JSON.stringify(c));
          trail.push(JSON.stringify(lib[sport.progress](c, rng)), JSON.stringify(c));
        }
      } finally { Math.random = real; }
    }
    return trail;
  };
  for (const sport of US) {
    const a = replay(await load(`${sport.id}-head`, sport.file, head), sport);
    const b = replay(await load(`${sport.id}-base`, sport.file, base), sport);
    let first = -1;
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) if (a[i] !== b[i]) { first = i; break; }
    console.log(`   ${sport.id}: ${a.length / 4} seasons replayed, ${first < 0 ? 'byte identical' : `parts at record ${first}`}`);
    if (a.length < 400) fail(`${sport.id}: only ${a.length / 4} seasons were played, too thin to mean anything`);
    if (first >= 0) fail(`${sport.id}: this round's ${CAREER_AWARDS} parts from the base's at record ${first}`);
  }
}

if (runs('6')) {
  console.log('6) legacy: calculateLegacy reads no awards and no popularity');
  const engine = read(ENGINE);
  const START = 'export function calculateLegacy(state: CareerState): LegacyResult {';
  once(engine, START, ENGINE);
  const from = engine.indexOf(START);
  const body = engine.slice(from, engine.indexOf('\n}\n', from) + 2);
  const code = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const reads = text => ['awards', 'popularity'].filter(word => new RegExp(`\\b${word}\\b`).test(code(text)));
  const doctored = body.replace(START, `${START}\n  const readsAwards = state.awards.length;`);
  const found = reads(body), caught = reads(doctored);
  console.log(`   calculateLegacy: ${body.split('\n').length} lines, reads ${found.length ? found.join(' and ') : 'neither'}; a copy that reads state.awards is ${caught.includes('awards') ? 'caught' : 'NOT caught'}`);
  if (body.split('\n').length < 40) fail('calculateLegacy came out too short, so the body was not found whole');
  if (found.length > 0) fail(`calculateLegacy reads ${found.join(' and ')}, so the round's awards can reach the legacy score`);
  if (!caught.includes('awards')) fail('the check did not catch a copy that reads state.awards');
}

console.log(failures.length ? `simSoccerSeasonAwards: RED, ${failures.length} failure(s)` : 'simSoccerSeasonAwards: green');
process.exit(failures.length ? 1 : 0);
