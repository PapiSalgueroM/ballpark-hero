/**
 * Round 1532 harness: Stadium Tycoon plays football scores, and a title race you
 * can lose (brief-1532 design 3.7.2, section 0 R7, critic items 1, 2, 14, 15, 21).
 *
 * The engine now scores with the shared law Club Manager scores with
 * (src/lib/season/law.ts, imported, never restated): your side is the Squad
 * (SQUAD_POINTS law points a level), a rival is its division's rivalStrength plus
 * its own stored offset, and both sides' expected goals come from the gap,
 * spread over ninety one roll minutes. Goal, win and promotion bonuses pay
 * seconds of the club's own unboosted income. Everything here plays the real lib
 * (bundled) at the hook's cadence with the bots of scripts/lib/tycoonBots.mjs, on
 * calibration seeds 1 to 20 and holdout seeds 21 to 40, means over seeds, never a
 * single seed, never a max.
 *
 *  S1 the law, read not restated: the three chance functions equal the law's
 *     expected goals over 90 at the engine's own gap (Object.is), over Squad 0 to
 *     200, every division, every drawn rival, the first team edge 0 to 0.40 and
 *     NaN, -1, 1; the opponent's chance strictly falls with the edge; the lib
 *     imports goalLambda from the law and types neither 0.055 nor 4.2.
 *  S2 the shape: the bodies brief 1.2 and critic item 14 freeze hash to the base
 *     record (scripts/data/tycoonScorelineBaseline.json); a match draws exactly 180
 *     rolls, a perfect set piece none, and each matchday's own stream exactly 180
 *     per other fixture.
 *  S3 goals: pace 2.5 to 3.0 a watched league match over minutes 15 to 120.
 *  S4 results: the gap reads the Squad and the division exactly; pace wins 55 to
 *     75 (each window 15 to 30, 30 to 60, 60 to 120 inside 50 to 80); overinvest
 *     (the over4 bot, the lead's ruling S1) 76 to 86, at least 4 above pace, under
 *     90 in every window; pace at least NOSQUAD_FENCE above nosquad; draws 15 to 27.
 *  S5 titles: pace 0.40 to 0.90 a season over minutes 15 to 240; season one won at
 *     a share of at least 0.75 over the 40 seeds (critic item 8). Printed beside it:
 *     the title share at fixed gaps recomputed through the engine's own playMinute
 *     and playMatchday.
 *  S6 never 99: our chance never passes LAW.max / 90 in any reachable state, the
 *     exact ceiling (LAW.max against nothing) is under 99 percent, and so is the
 *     engine's own Squad 200 club with the largest first team edge.
 *  S7 bonuses: goal and win pay round(seconds x unboosted income) whatever Hype and
 *     the whistles do; a final matchday pays the promotion and the Summit title
 *     exactly; offlineEarnings is Object.is the base record on its 52 inputs; at two
 *     hours every seed's last watched win paid 19.5 to 20.5 seconds of income.
 *  S8 the economy beside the base record: printed, no fence.
 *
 * Controls, each a patched copy of the lib in the OS temp folder, calibration seeds:
 *   copy      a private goalLambda with perPoint 0.056          red S1 (run against S1 S2 S6 S7)
 *   noscale   the first team edge stops scaling the rival       red S1 (run against S1 S2 S6 S7)
 *   tworolls  playMinute draws a third roll                     red S2 (run against S1 S2 S6 S7)
 *   linear    the three chance bodies of the base engine        red S1 S3 S4 S5 S6
 *   flat      squadStrength returns 0                           red S4 S5
 *   matchno   rivals gain 1.8 law points a career match         red S3 S4 S5
 *   noclamp   our chance from the raw law, no clamp             red S1 S6 (run against S1 S2 S6 S7)
 *   crowd     the base engine's crowd scaled bonuses            red S7 (run against S1 S2 S6 S7)
 * R7's sets name S3 S4 S5 for linear; S1 and S6 go red too by construction (S1
 * asserts the law's formula and S6 the law's ceiling, both of which the base lines
 * break), and noclamp breaks S1's clamp for the same reason.
 *
 * MEASURED 2026-10-21 on a GitHub runner (remote check r1532-b4, head 6daaa8d3, 290 s),
 * calibration / holdout seed means over minutes 15 to 120 unless named:
 *   goals a match 2.569 / 2.600; pace wins 64.6 (se 1.38) / 66.6 (se 1.45), windows
 *   15 to 30, 30 to 60, 60 to 120: 72.1, 67.9, 61.2 / 75.0, 67.9, 64.0; draws 20.9 /
 *   20.5; overinvest (over4) 76.4 / 78.7 (0.4 over its floor on calibration: the
 *   seeds are fixed, so it is stable run to run, but any table change must remeasure
 *   it); nosquad 18.0 / 17.2; mean matchGap pace 8.7, over4 13.6, nosquad -14.5;
 *   titles a season over 15 to 240 0.733 / 0.727; season one won in 36 of 40.
 *   S5's table at gaps 0 / 4 / 8 / 12 / 14 (500 seasons a cell): 6 clubs one leg
 *   0.232 / 0.466 / 0.654 / 0.824 / 0.908; 8 clubs two legs 0.184 / 0.562 / 0.836 /
 *   0.946 / 0.982; 10 clubs two legs 0.222 / 0.500 / 0.850 / 0.960 / 0.990, so the
 *   0.40 floor (a club at the win band's floor, gap +4) is re-derived from the code.
 *   S6: the exact ceiling 98.19 (98.65 against a rival who never scores). S7: every
 *   seed's last win before two hours paid 20 seconds of income (base 0.13).
 *   S8: first Sell up 12.77 minutes (base 13.37); income at 30 / 60 / 120 minutes
 *   17.9K / 25.6K / 41.7K a second (base 21.2K / 34.4K / 81.0K).
 *
 * Exit 0 green; 1 a check failed or a control turned the wrong sections; 2 could
 * not run; 3 a control did not fire. Green is the closing summary line AND exit 0.
 *   node scripts/simTycoonScorelines.mjs                     the run and every control
 *   SCORELINES_CONTROL=<name> node scripts/simTycoonScorelines.mjs   one control alone
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDt, bundleTs, freshTmp, runBot, mulberry, MILESTONE_IDS, BADGE_IDS } from './lib/tycoonBots.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'src/lib/stadiumTycoon.ts');
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const abort = m => { console.error(m); process.exit(2); };
const BASE = JSON.parse(read(path.join(ROOT, 'scripts/data/tycoonScorelineBaseline.json')));
const DT = readDt(ROOT);
const ONLY = process.env.SCORELINES_CONTROL || '';
/* Half the calibration gap between pace and nosquad (64.6 against 18.0 percent
   wins over minutes 15 to 120, measured 2026-10-21 by the step 2a tuning run on a
   runner, remote check r1532-s2a), the simTycoonAwayMatchdays 69 to 72 rule. */
const NOSQUAD_FENCE = 23;
const CAL = Array.from({ length: 20 }, (_, i) => i + 1);
const HOLD = Array.from({ length: 20 }, (_, i) => i + 21);
/* The controls play the calibration seeds: on seeds 1 to 10 alone a control that changes
   nothing the bots read put overinvest at 75.4, under its band, a coin toss. */
const CONTROL_SEEDS = CAL;
/* S5 prints the title share at fixed gaps; 500 seasons a cell keeps the run inside a few minutes. */
const TABLE_SEASONS = 500;

const OLD_BOOST = '[0, 0.006, 0.012, 0.019, 0.027, 0.036, 0.046, 0.057, 0.069, 0.082][divisionIndex(s)]';
const OLD_MATCH_NO = '(Number.isFinite(s.league?.baseMatchNo) ? Math.min(s.matchNo, s.league.baseMatchNo) : s.matchNo)';
/* The exact sections. A control aimed at one of them is run against these alone, as
   critic item 2 has crowd run: S3 to S5 are means over seeds, and a mutation that
   only reshuffles the rolls (tworolls) or nudges a constant (copy) moves them by
   noise, which would make the control map a coin toss. */
const EXACT = ['S1', 'S2', 'S6', 'S7'];
const CONTROLS = {
  copy: { red: ['S1'], only: EXACT, rewrites: [["import { goalLambda, LAW } from '@/lib/season/law';",
    "import { LAW } from '@/lib/season/law';\nconst goalLambda = (edge: number, venue: number): number => { const raw = LAW.base + edge * 0.056 + venue; return raw < LAW.min ? LAW.min : raw > LAW.max ? LAW.max : raw; };"]] },
  noscale: { red: ['S1'], only: EXACT, rewrites: [['  return goalLambda(-matchGap(s), LAW.away) * (1 - defence) / 90;', '  return goalLambda(-matchGap(s), LAW.away) / 90;']] },
  tworolls: { red: ['S2'], only: EXACT, rewrites: [['    if (roll() < oppChancePerMin(st, edge)) {', '    roll();\n    if (roll() < oppChancePerMin(st, edge)) {']] },
  linear: { red: ['S1', 'S3', 'S4', 'S5', 'S6'], rewrites: [
    ['  return goalLambda(matchGap(s), LAW.home) / 90;', "  return Math.min(0.16, 0.028 + levelOf(s, 'squad') * 0.0016);"],
    ['  return goalLambda(-matchGap(s), LAW.away) * (1 - defence) / 90;',
      `  const base = Math.max(0.008, Math.min(0.14, 0.024 + ${OLD_MATCH_NO} * 0.0011 + ${OLD_BOOST} + currentOpponentOffset(s) - levelOf(s, 'squad') * 0.0008));\n  return Math.max(0.008, base * (1 - defence));`],
    ['  return goalLambda(clubStrength(st, c) - clubStrength(st, other), venue) / 90;',
      `  const s = st;\n  return Math.max(0.008, Math.min(0.14, 0.024 + ${OLD_MATCH_NO} * 0.0011 + ${OLD_BOOST} + c.offset));`],
  ] },
  flat: { red: ['S4', 'S5'], rewrites: [["  return levelOf(s, 'squad') * SQUAD_POINTS;", '  return 0;']] },
  matchno: { red: ['S3', 'S4', 'S5'], rewrites: [['  return divisionOf(s).rivalStrength;', '  return divisionOf(s).rivalStrength + s.matchNo * 1.8;']] },
  noclamp: { red: ['S1', 'S6'], only: EXACT, rewrites: [['  return goalLambda(matchGap(s), LAW.home) / 90;', '  return (LAW.base + matchGap(s) * LAW.perPoint + LAW.home) / 90;']] },
  crowd: { red: ['S7'], only: EXACT, rewrites: [
    ['  return Math.round(unboostedIncomePerSec(s) * GOAL_BONUS_SEC);', '  return Math.round(attendance(s) * 0.6 * repMult(s) * streakMult(s));'],
    ['  return Math.round(unboostedIncomePerSec(s) * WIN_BONUS_SEC);', '  return Math.round(attendance(s) * 2.2 * repMult(s));'],
    ['    const pay = Math.round(unboostedIncomePerSec(st) * PROMOTION_BONUS_SEC);', '    const pay = Math.round(attendance(st) * 8 * d.incomeMult * repMult(st));'],
    ['  const pay = Math.round(unboostedIncomePerSec({ ...st, league: next }) * PROMOTION_BONUS_SEC);', '  const pay = Math.round(attendance(st) * 8 * nd.incomeMult * repMult(st));'],
  ] },
};
if (ONLY && !CONTROLS[ONLY]) abort(`unknown SCORELINES_CONTROL ${ONLY}`);

const tmp = freshTmp('tycoon-scorelines');
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } });
const unix = p => p.split(path.sep).join('/');
async function engines(name, libFile) {
  const entry = path.join(tmp, `${name}-entry.ts`);
  fs.writeFileSync(entry, `export * as T from '${unix(libFile)}';\nexport * as LW from '${unix(path.join(ROOT, 'src/lib/season/law.ts'))}';\nexport * as LC from '${unix(path.join(ROOT, 'src/lib/leagueCore.ts'))}';\n`);
  return bundleTs(ROOT, entry, tmp, name);
}
async function patched(name) {
  let text = read(LIB); let places = 0;
  for (const [from, to] of CONTROLS[name].rewrites) {
    const n = text.split(from).length - 1;
    if (n !== 1) abort(`control ${name}: the lib carries ${n} of ${JSON.stringify(from.slice(0, 80))}, not exactly one, so this control would prove nothing`);
    text = text.replace(from, () => to); places += 1;
  }
  const file = path.join(tmp, `${name}.ts`);
  fs.writeFileSync(file, text);
  console.log(`control ${name}: ${places} place${places === 1 ? '' : 's'} rewritten in a copy of the lib`);
  return engines(name, file);
}

/* ---------- helpers ---------- */
const sha = text => createHash('sha256').update(text).digest('hex');
const r3 = x => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : x);
/** simSeasonLaw's stripCode: comments and string contents removed, line breaks kept. */
function stripCode(src) {
  let out = '';
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i += 1; out += '\n'; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') out += '\n'; i += 1; } i += 1; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out += q; i += 1;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i += 1; i += 1; }
      out += q; continue;
    }
    out += c;
  }
  return out;
}
/** The generator's bodyOf: from the `function NAME(` line to the first line that is exactly `}`. */
function bodyOf(text, name) {
  const lines = text.split('\n');
  const start = lines.findIndex(l => l.startsWith(`function ${name}(`) || l.startsWith(`export function ${name}(`));
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && l === '}');
  return end < 0 ? null : lines.slice(start, end + 1).join('\n');
}
/** Exact binomial over 90 one roll minutes. */
function pmf(p) {
  const a = new Array(91).fill(0);
  if (p <= 0) a[0] = 1; else if (p >= 1) a[90] = 1;
  else { a[0] = Math.pow(1 - p, 90); for (let k = 1; k <= 90; k += 1) a[k] = a[k - 1] * ((91 - k) / k) * (p / (1 - p)); }
  return a;
}
/** P(ours beats theirs) and P(level) when each side scores at its own minute chance. */
function matchOdds(p, q) {
  const a = pmf(p); const b = pmf(q); let w = 0; let d = 0; let cb = 0;
  for (let k = 0; k <= 90; k += 1) { w += a[k] * cb; d += a[k] * b[k]; cb += b[k]; }
  return { w, d };
}
/** Every drawn league of every division, at every matchday, so every rival is met. */
function leaguesEverywhere(T) {
  const out = [];
  for (let d = 0; d < T.DIVISIONS.length; d += 1) {
    const lg = T.newLeague(0, d, 0);
    for (let md = 0; md < T.leagueShape(d).matchdays; md += 1) out.push({ d, league: { ...lg, matchday: md } });
  }
  return out;
}
const at = (T, squad, league) => { const f = T.newTycoon(0); return { ...f, levels: { ...f.levels, squad }, league }; };

/* ---------- S1 the law, read not restated ---------- */
function S1(E, libText) {
  const { T, LW } = E; const { LAW, goalLambda } = LW;
  const out = []; let checked = 0;
  const edges = [];
  for (let i = 0; i <= 200; i += 1) edges.push(i * 0.002);
  edges.push(NaN, -1, 1);
  for (const { d, league } of leaguesEverywhere(T)) {
    for (let squad = 0; squad <= 200; squad += 5) {
      const s = at(T, squad, league);
      const gap = T.matchGap(s);
      checked += 1;
      if (!Object.is(T.goalChancePerMin(s), goalLambda(gap, LAW.home) / 90)) out.push(`division ${d} Squad ${squad}: our chance ${T.goalChancePerMin(s)} is not the law's ${goalLambda(gap, LAW.home) / 90}`);
      let prev = Infinity;
      for (const f of edges) {
        const fc = Number.isFinite(f) ? Math.max(0, Math.min(0.4, f)) : 0;
        const got = T.oppChancePerMin(s, f);
        checked += 1;
        if (!Object.is(got, goalLambda(-gap, LAW.away) * (1 - fc) / 90)) { out.push(`division ${d} Squad ${squad} edge ${f}: the rival's chance ${got} is not the law's ${goalLambda(-gap, LAW.away) * (1 - fc) / 90}`); break; }
        if (Number.isFinite(f) && f >= 0 && f <= 0.4) { if (!(got < prev)) { out.push(`division ${d} Squad ${squad}: the rival's chance does not fall at edge ${f}`); break; } prev = got; }
      }
      if (out.length > 4) return { out, note: '' };
    }
    const strength = c => T.DIVISIONS[d].rivalStrength + c.offset * T.RIVAL_OFFSET_POINTS;
    const st = at(T, 0, league);
    for (const [h, a] of T.matchdayFixtures(league)) {
      if (h === 0 || a === 0) continue;
      const ch = league.clubs[h]; const ca = league.clubs[a];
      for (const [x, y, venue] of [[ch, ca, LAW.home], [ca, ch, LAW.away]]) {
        checked += 1;
        const want = goalLambda(strength(x) - strength(y), venue) / 90;
        if (!Object.is(T.rivalChancePerMin(st, x, y, venue), want)) { out.push(`division ${d}: ${x.name} against ${y.name} scores at ${T.rivalChancePerMin(st, x, y, venue)}, the law says ${want}`); break; }
      }
    }
  }
  const imports = libText.split("import { goalLambda, LAW } from '@/lib/season/law';").length - 1;
  if (imports !== 1) out.push(`the lib carries ${imports} imports of goalLambda and LAW from the law, not one`);
  const code = stripCode(libText);
  if (/(^|[^\w.])0\.055(?!\d)/m.test(code)) out.push('the lib types 0.055 as a number: the law is restated, not read');
  if (/(^|[^\w.])4\.2(?!\d)/m.test(code)) out.push('the lib types 4.2 as a number: the law is restated, not read');
  return { out, note: `${checked} chances equal the law at the engine's own gap (Squad 0 to 200, ten divisions, every rival, the edge 0 to 0.40 and NaN, -1, 1, every rival fixture both ways); the rival's chance falls at every step of the edge; the lib imports goalLambda and types neither 0.055 nor 4.2` };
}

/* ---------- S2 the shape ---------- */
function S2(E, libText) {
  const { T, LW, LC } = E;
  const out = [];
  for (const [name, rec] of Object.entries(BASE.bodies)) {
    const body = bodyOf(libText, name);
    if (!body) out.push(`the body of ${name} is gone`);
    else if (sha(body) !== rec.sha256) out.push(`the body of ${name} moved (${body.split('\n').length} lines, ${rec.lines} on the base)`);
  }
  const counted = seed => { const r = mulberry(seed); const c = { n: 0, next: () => { c.n += 1; return r(); } }; return c; };
  let matches = 0; let matchdays = 0; let replayed = 0;
  for (let k = 0; k < 200 && out.length < 5; k += 1) {
    const d = k % T.DIVISIONS.length;
    const lg = { ...T.newLeague(k % 3, d, k % 4), matchday: k % T.leagueShape(d).matchdays };
    const st = at(T, 20 + (k % 60), lg);
    const replay = {};
    const rnd = LC.mulberry32(LC.hash32(lg.seed, lg.season, lg.matchday, 7));
    for (const [h, a] of T.matchdayFixtures(lg)) {
      if (h === 0 || a === 0) continue;
      const ph = T.rivalChancePerMin(st, lg.clubs[h], lg.clubs[a], LW.LAW.home);
      const pa = T.rivalChancePerMin(st, lg.clubs[a], lg.clubs[h], LW.LAW.away);
      let hg = 0; let ag = 0;
      for (let m = 0; m < 90; m += 1) { if (rnd() < ph) hg += 1; if (rnd() < pa) ag += 1; }
      replay[h] = [hg, ag]; replay[a] = [ag, hg]; replayed += 1;
    }
    const c = counted(7000 + k);
    const s = structuredClone(st);
    for (let m = 0; m < 90; m += 1) T.playMinute(s, c.next, [], { pay: true });
    matches += 1;
    if (c.n !== 180) out.push(`a watched match drew ${c.n} rolls, not 180`);
    if (s.totalMatches !== (st.totalMatches ?? 0) + 1) out.push('ninety minutes did not finish exactly one match');
    if (s.league.season !== lg.season || s.league.division !== lg.division) continue;
    matchdays += 1;
    for (const [i, [gf, ga]] of Object.entries(replay)) {
      const row = s.league.clubs[i];
      if (row.gf - lg.clubs[i].gf !== gf || row.ga - lg.clubs[i].ga !== ga) { out.push(`division ${d}: ${row.name}'s matchday does not replay on its own stream at 180 rolls a fixture`); break; }
    }
  }
  let setPieces = 0;
  for (let match = 1; match <= 40; match += 1) {
    const init = { ...at(T, 62, T.newLeague(0, 3, 0)), totalMatches: match };
    const arms = [structuredClone(init), structuredClone(init)];
    const rolls = [counted(match * 101), counted(match * 101)];
    for (let side = 0; side < 2; side += 1) {
      let s = arms[side];
      for (let minute = 0; minute < 90; minute += 1) {
        const offer = T.setPieceOffer(s, true);
        if (offer && side === 1) { s = T.beginSetPiece(s, offer); const won = T.awardSetPieceGoal(s, offer); if (won) { s = won.state; setPieces += 1; } }
        T.playMinute(s, rolls[side].next, [], { pay: true });
      }
    }
    if (rolls[0].n !== rolls[1].n) { out.push(`a perfect set piece changed the rolls of a match (${rolls[0].n} against ${rolls[1].n})`); break; }
  }
  if (!setPieces) out.push('no set piece was taken, so "a perfect set piece adds no roll" was never tested');
  return { out, note: `${Object.keys(BASE.bodies).length} frozen bodies hash to the base record; ${matches} matches drew 180 rolls each; ${replayed} other fixtures over ${matchdays} matchdays replay on their own stream at 180 rolls; ${setPieces} perfect set pieces added no roll` };
}

/* ---------- the bots ---------- */
const WINDOWS = [[15, 30], [30, 60], [60, 120], [120, 240]];
function playRuns(T, seeds, econ) {
  const runs = {
    pace: seeds.map(seed => runBot(T, { policy: 'pace', seed, minutes: 240, dt: DT, keepStates: true })),
    over4: seeds.map(seed => runBot(T, { policy: 'over4', seed, minutes: 120, dt: DT })),
    nosquad: seeds.map(seed => runBot(T, { policy: 'nosquad', seed, minutes: 120, dt: DT })),
  };
  if (econ) runs.paceSell = seeds.map(seed => runBot(T, { policy: 'paceSell', seed, minutes: 240, dt: DT }));
  return runs;
}
const meanSE = xs => { const v = xs.filter(Number.isFinite); const n = v.length; if (!n) return { mean: NaN, se: NaN }; const m = v.reduce((a, b) => a + b, 0) / n; const sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) : 0; return { mean: m, se: sd / Math.sqrt(n) }; };
/** Means over seeds of each seed's share in the window, never a pooled count. */
function results(runs, a, b) {
  const per = runs.map(run => { const ms = run.matches.filter(m => m.t >= a && m.t < b); const n = ms.length || NaN; return {
    w: (100 * ms.filter(m => m.res === 'w').length) / n, d: (100 * ms.filter(m => m.res === 'd').length) / n,
    goals: ms.reduce((x, m) => x + m.gf + m.ga, 0) / n, gap: ms.reduce((x, m) => x + (m.gap ?? NaN), 0) / n,
    streak: ms.reduce((x, m) => x + Math.min(m.streak, 10), 0) / n, gemsHour: (ms.reduce((x, m) => x + m.gems, 0) * 60) / (b - a) }; });
  return Object.fromEntries(['w', 'd', 'goals', 'gap', 'streak', 'gemsHour'].map(k => { const x = meanSE(per.map(p => p[k])); return [k, { mean: r3(x.mean), se: r3(x.se) }]; }));
}
function titleShare(runs, a, b) {
  const per = runs.map(run => { const ss = run.seasons.filter(x => x.t >= a && x.t < b); return ss.length ? ss.filter(x => x.title).length / ss.length : NaN; });
  return r3(meanSE(per).mean);
}

/* ---------- S3 goals ---------- */
function S3(E, sets) {
  const out = []; const notes = [];
  for (const [name, R] of Object.entries(sets)) {
    const all = results(R.pace, 15, 120);
    if (!(all.goals.mean >= 2.5 && all.goals.mean <= 3.0)) out.push(`${name}: pace's watched league matches over minutes 15 to 120 held ${all.goals.mean} goals, outside 2.5 to 3.0`);
    const away = [30, 60, 120].map(c => {
      let g = 0; let n = 0;
      for (const run of R.pace) {
        const st = run.states?.[c];
        if (!st) continue;
        const r = E.T.playAwayMatchdays(st, 16, mulberry(run.seed * 7 + c));
        g += r.events.filter(e => e.kind === 'goal' || e.kind === 'conceded').length; n += r.results.length;
      }
      return n ? r3(g / n) : 'none';
    });
    notes.push(`${name} ${all.goals.mean} goals a match (windows ${WINDOWS.map(([a, b]) => `${a} to ${b} ${results(R.pace, a, b).goals.mean}`).join(', ')}); away matchdays from pace at 30 / 60 / 120 minutes ${away.join(' / ')}`);
  }
  return { out, note: notes.join('; ') };
}

/* ---------- S4 results ---------- */
function S4(E, sets) {
  const { T } = E; const out = []; const notes = [];
  let composed = 0;
  for (const { d, league } of leaguesEverywhere(T)) {
    for (let squad = 0; squad <= 200; squad += 7) {
      const s = at(T, squad, league);
      const want = squad * T.SQUAD_POINTS - T.DIVISIONS[d].rivalStrength - T.currentOpponentOffset(s) * T.RIVAL_OFFSET_POINTS;
      composed += 1;
      if (!Object.is(T.matchGap(s), want)) { out.push(`division ${d} Squad ${squad}: the gap reads ${T.matchGap(s)}, the Squad, the division and the rival make ${want}`); break; }
    }
    if (out.length) break;
  }
  for (const [name, R] of Object.entries(sets)) {
    const pace = results(R.pace, 15, 120); const over = results(R.over4, 15, 120); const none = results(R.nosquad, 15, 120);
    const p = pace.w.mean; const o = over.w.mean;
    if (!(p >= 55 && p <= 75)) out.push(`${name}: pace won ${p}% over minutes 15 to 120, outside 55 to 75`);
    for (const [a, b] of WINDOWS.slice(0, 3)) { const w = results(R.pace, a, b).w.mean; if (!(w >= 50 && w <= 80)) out.push(`${name}: pace won ${w}% in minutes ${a} to ${b}, outside 50 to 80 (a drift into a timer or a wall)`); }
    if (!(o >= 76 && o <= 86)) out.push(`${name}: overinvest won ${o}%, outside 76 to 86`);
    if (!(o - p >= 4)) out.push(`${name}: overinvest won only ${r3(o - p)} points more than pace, under 4`);
    for (const [a, b] of WINDOWS.slice(0, 3)) { const w = results(R.over4, a, b).w.mean; if (!(w < 90)) out.push(`${name}: overinvest won ${w}% in minutes ${a} to ${b}, at 90 or more`); }
    if (!(p - none.w.mean >= NOSQUAD_FENCE)) out.push(`${name}: pace won ${r3(p - none.w.mean)} points more than a club that never buys Squad, under ${NOSQUAD_FENCE}`);
    if (!(pace.d.mean >= 15 && pace.d.mean <= 27)) out.push(`${name}: pace drew ${pace.d.mean}% of its matches, outside 15 to 27`);
    notes.push(`${name}: pace ${p}% (se ${pace.w.se}; ${WINDOWS.slice(0, 3).map(([a, b]) => results(R.pace, a, b).w.mean).join(' / ')}), draws ${pace.d.mean}%, gap ${pace.gap.mean}; overinvest ${o}% (gap ${over.gap.mean}); nosquad ${none.w.mean}% (gap ${none.gap.mean})`);
  }
  return { out, note: `${composed} gaps read the Squad, the division and the rival exactly; ${notes.join('; ')}` };
}

/* ---------- S5 titles ---------- */
function S5(E, sets, main) {
  const { T } = E; const out = []; const notes = [];
  let won = 0; let firsts = 0;
  for (const [name, R] of Object.entries(sets)) {
    const share = titleShare(R.pace, 15, 240);
    if (!(share >= 0.4 && share <= 0.9)) out.push(`${name}: pace took ${share} titles a season over minutes 15 to 240, outside 0.40 to 0.90`);
    for (const run of R.pace) { if (run.seasons.length) { firsts += 1; if (run.seasons[0].title) won += 1; } }
    notes.push(`${name} ${share} titles a season`);
  }
  const first = firsts ? won / firsts : NaN;
  if (!(first >= 0.75)) out.push(`pace won its first season in ${won} of ${firsts} seeds, a share of ${r3(first)}, under 0.75`);
  notes.push(`season one won in ${won} of ${firsts}`);
  if (main) {
    const table = [];
    for (const d of [0, 3, 6]) {
      const row = [];
      for (const gap of [0, 4, 8, 12, 14]) {
        const squad = Math.max(0, Math.round((T.DIVISIONS[d].rivalStrength + gap) / T.SQUAD_POINTS));
        let titles = 0;
        for (let k = 0; k < TABLE_SEASONS; k += 1) {
          const s = at(T, squad, T.newLeague(k, d, k % 7));
          const roll = mulberry(910000 + k);
          for (let guard = 0; guard < 40; guard += 1) {
            const events = [];
            for (let m = 0; m < 90; m += 1) T.playMinute(s, roll, events, { pay: false });
            if (events.some(e => e.kind === 'title')) { titles += 1; break; }
            if (events.some(e => e.kind === 'seasonEnd')) break;
          }
        }
        row.push(r3(titles / TABLE_SEASONS));
      }
      table.push(`${T.leagueShape(d).clubs} clubs ${d < 3 ? 'one leg' : 'two legs'}: ${row.join(' / ')}`);
    }
    notes.push(`title share at gaps 0 / 4 / 8 / 12 / 14 through the engine's own playMinute and playMatchday, ${TABLE_SEASONS} seasons a cell: ${table.join('; ')}`);
  }
  return { out, note: notes.join('; ') };
}

/* ---------- S6 never 99 ---------- */
function S6(E) {
  const { T, LW } = E; const { LAW } = LW; const out = [];
  let worst = 0; let states = 0;
  for (const { league } of leaguesEverywhere(T)) {
    for (let squad = 0; squad <= 200; squad += 5) {
      const s = at(T, squad, league); states += 1;
      const p = T.goalChancePerMin(s);
      worst = Math.max(worst, p);
      if (!(p <= LAW.max / 90)) { out.push(`Squad ${squad} in division ${league.division} scores at ${p} a minute, past the law's ceiling ${LAW.max / 90}`); break; }
    }
    if (out.length) break;
  }
  const ceilingEdge = matchOdds(LAW.max / 90, (LAW.min * (1 - 0.39)) / 90).w; const ceilingZero = matchOdds(LAW.max / 90, 0).w;
  if (!(ceilingEdge < 0.99 && ceilingZero < 0.99)) out.push(`the law's own ceiling wins ${r3(100 * ceilingEdge)}% (rival at its floor with the largest first team edge) and ${r3(100 * ceilingZero)}% (rival never scores)`);
  let engineWorst = 0;
  const lg = T.newLeague(0, 0, 0);
  for (let md = 0; md < T.leagueShape(0).matchdays; md += 1) {
    const s = at(T, 200, { ...lg, matchday: md });
    engineWorst = Math.max(engineWorst, matchOdds(T.goalChancePerMin(s), T.oppChancePerMin(s, 0.39)).w);
  }
  if (!(engineWorst < 0.99)) out.push(`a Squad 200 club in division 0 with the largest first team edge wins ${r3(100 * engineWorst)}% of its matches`);
  return { out, note: `our chance never passed ${r3(LAW.max / 90 * 1000) / 1000} a minute over ${states} states (highest ${r3(worst * 1000) / 1000}); the exact ceiling wins ${r3(100 * ceilingEdge)}% and ${r3(100 * ceilingZero)}% with a rival who never scores; the engine's Squad 200 club with a 0.39 edge wins ${r3(100 * engineWorst)}%` };
}

/* ---------- S7 bonuses ---------- */
const OFFLINE_STATE = (T, x) => {
  const fresh = T.newTycoon(0);
  return {
    ...fresh, levels: { ...fresh.levels, ...x.levels }, fanbase: x.fanbase, rep: x.rep, streak: x.streak, staffLevels: x.staffLevels, legacyPerks: x.legacyPerks,
    ach: T.ACHIEVEMENTS.slice(0, x.achCount).map(a => a.id), boostLeftSec: x.boostLeftSec, goldenKind: x.goldenKind, goldenLeftSec: x.goldenLeftSec, savedAt: 0,
    league: T.newLeague(x.rep, x.division, 0), ...(x.ticketPolicy !== 'standard' ? { ticketPolicy: x.ticketPolicy } : {}),
  };
};
function S7(E, sets) {
  const { T } = E; const out = [];
  const rnd = mulberry(1532);
  const pick = xs => xs[Math.floor(rnd() * xs.length)];
  const swayMax = T.LEGACY_PERKS.find(p => p.id === 'sway').costs.length;
  for (let i = 0; i < 2000 && out.length < 5; i += 1) {
    const f = T.newTycoon(0);
    const goldenKind = pick([null, 'frenzy', 'tapRush', 'windfall', 'fanWave', 'freeLevel']);
    const s = {
      ...f, levels: Object.fromEntries(T.TRACKS.map(tr => [tr.id, Math.floor(rnd() * Math.min(tr.maxLevel, 120))])),
      fanbase: Math.round(90 + rnd() * 50000), rep: Math.floor(rnd() * 7), streak: Math.floor(rnd() * 13), league: T.newLeague(0, i % 10, 0),
      legacyPerks: { sway: Math.floor(rnd() * (swayMax + 1)) }, boostLeftSec: pick([0, 30]), goldenKind, goldenLeftSec: goldenKind ? 20 : 0,
      ach: T.ACHIEVEMENTS.slice(0, Math.floor(rnd() * T.ACHIEVEMENTS.length)).map(a => a.id),
      ...(pick([0, 1, 2]) === 0 ? {} : { ticketPolicy: pick(['community', 'premium']) }),
    };
    const plain = { ...s, boostLeftSec: 0, goldenLeftSec: 0, goldenKind: null };
    const inc = T.incomePerSec(plain);
    if (!Object.is(T.unboostedIncomePerSec(s), inc)) out.push(`state ${i}: unboosted income ${T.unboostedIncomePerSec(s)} is not the income with no Hype and no whistle, ${inc}`);
    if (T.goalBonus(s) !== Math.round(inc * T.GOAL_BONUS_SEC)) out.push(`state ${i}: a goal paid ${T.goalBonus(s)}, ${T.GOAL_BONUS_SEC} seconds of income is ${Math.round(inc * T.GOAL_BONUS_SEC)}`);
    if (T.winBonus(s) !== Math.round(inc * T.WIN_BONUS_SEC)) out.push(`state ${i}: a win paid ${T.winBonus(s)}, ${T.WIN_BONUS_SEC} seconds of income is ${Math.round(inc * T.WIN_BONUS_SEC)}`);
    if (T.goalBonus(s) !== T.goalBonus(plain) || T.winBonus(s) !== T.winBonus(plain)) out.push(`state ${i}: Hype or a whistle moved a match bonus`);
  }
  const noGoals = () => 0.999;
  const finalDay = d => {
    const lg = T.newLeague(0, d, 0);
    const last = T.leagueShape(d).matchdays - 1;
    const clubs = lg.clubs.map((c, i) => { const w = i === 0 ? last : 0; return { ...c, w, d: 0, l: last - w, gf: w, ga: last - w, pts: w * 3 }; });
    return { ...T.newTycoon(0), fanbase: 2000, minute: 89, goalsFor: 1, goalsAgainst: 0, bestDivision: d, ach: T.ACHIEVEMENTS.map(a => a.id), claimed: T.MILESTONES.map(m => m.id), league: { ...lg, matchday: last, clubs } };
  };
  const promoted = T.tick(finalDay(8), 1.4, noGoals);
  const promo = promoted.events.find(e => e.kind === 'promoted');
  const promoWant = Math.round(T.unboostedIncomePerSec(promoted.state) * T.PROMOTION_BONUS_SEC);
  if (!promo || T.divisionIndex(promoted.state) !== 9 || promo.amount !== promoWant) out.push(`a title in division 8 paid a promotion of ${promo?.amount}, ${T.PROMOTION_BONUS_SEC} seconds of The Summit's income is ${promoWant}`);
  const summit = T.tick(finalDay(9), 1.4, noGoals);
  const title = summit.events.find(e => e.kind === 'title');
  const summitWant = Math.round(T.unboostedIncomePerSec(summit.state) * T.PROMOTION_BONUS_SEC);
  if (!title || title.amount !== summitWant) out.push(`a Summit title paid ${title?.amount}, ${T.PROMOTION_BONUS_SEC} seconds of income is ${summitWant}`);
  let offline = 0;
  for (const row of BASE.offline) { if (!Object.is(T.offlineEarnings(OFFLINE_STATE(T, row.input), row.input.now), row.output)) offline += 1; }
  if (offline) out.push(`${offline} of ${BASE.offline.length} away pay inputs no longer give the base record's amount`);
  const notes = [];
  for (const [name, R] of Object.entries(sets)) {
    const secs = R.pace.map(run => { const w = run.winBonusSec.filter(([t]) => t <= 120); return w.length ? w[w.length - 1][1] : NaN; }).filter(Number.isFinite);
    const bad = secs.filter(x => !(x >= 19.5 && x <= 20.5));
    if (!secs.length || bad.length) out.push(`${name}: at two hours ${bad.length} of ${secs.length} seeds' last watched win paid ${bad.map(r3).join(', ')} seconds of income, outside 19.5 to 20.5`);
    notes.push(`${name} ${secs.length} seeds' last win before two hours paid ${r3(Math.min(...secs))} to ${r3(Math.max(...secs))} seconds of income (base ${BASE.knobs.cal.winBonusSecAt120})`);
  }
  return { out, note: `2,000 states: a goal ${T.GOAL_BONUS_SEC} and a win ${T.WIN_BONUS_SEC} seconds of unboosted income, untouched by Hype and the whistles; a promotion paid ${promo?.amount} and a Summit title ${title?.amount}, ${T.PROMOTION_BONUS_SEC} seconds each; away pay Object.is the base on ${BASE.offline.length} inputs; ${notes.join('; ')}` };
}

/* ---------- S8 the economy, printed beside the base record ---------- */
function S8(sets) {
  const med = xs => { const v = xs.map(x => (x === null || x === undefined ? Infinity : x)).sort((a, b) => a - b); const m = v[Math.floor(v.length / 2)]; return Number.isFinite(m) ? r3(m) : 'later'; };
  const baseCal = p => BASE.policies[p].filter(r => r.seed <= 20);
  const R = sets.cal;
  const lines = [];
  lines.push(`pace first Sell up ${med(R.pace.map(r => r.sellUp))} min (base ${med(baseCal('pace').map(r => r.sellUp))}); over4 ${med(R.over4.map(r => r.sellUp))} (base ${med(baseCal('over4').map(r => r.sellUp))})`);
  lines.push(`pace income a second at 30 / 60 / 120 min: ${[30, 60, 120].map(c => `${med(R.pace.map(r => r.checkpoints[c]?.income))} (base ${med(baseCal('pace').map(r => r.checkpoints[c]?.income))})`).join(' / ')}`);
  lines.push(`pace division at 30 / 60 / 120 / 240: ${[30, 60, 120, 240].map(c => `${med(R.pace.map(r => r.checkpoints[c]?.div))} (base ${med(baseCal('pace').map(r => r.checkpoints[c]?.div))})`).join(' / ')}`);
  lines.push(`pace minutes to reach divisions 1 to 9: ${Array.from({ length: 9 }, (_, i) => med(R.pace.map(r => r.promotions.find(p => p.div === i + 1)?.t))).join(', ')}`);
  lines.push(`mean capped streak 15 to 120: pace ${results(R.pace, 15, 120).streak.mean}, over4 ${results(R.over4, 15, 120).streak.mean}, nosquad ${results(R.nosquad, 15, 120).streak.mean}; watched gems an hour: pace ${results(R.pace, 15, 120).gemsHour.mean}`);
  lines.push(`paceSell stars 1 / 2 / 3 at ${[0, 1, 2].map(k => `${med(R.paceSell.map(r => r.stars[k]?.t))} (base ${med(baseCal('paceSell').map(r => r.stars[k]?.[0]))})`).join(' / ')} min`);
  lines.push(`milestones and badges, pace: ${[...MILESTONE_IDS, ...BADGE_IDS].map(id => `${id} ${med(R.pace.map(r => r.firsts[id]))} (${med(baseCal('pace').map(r => r.firsts[id]))})`).join(', ')}`);
  lines.push(`mean matchGap per window, pace: ${WINDOWS.map(([a, b]) => `${a} to ${b} ${results(R.pace, a, b).gap.mean}`).join(', ')}`);
  return lines;
}

/* ---------- run ---------- */
const NAMES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
const TITLES = { S1: 'the law, read not restated', S2: 'the shape', S3: 'goals', S4: 'results', S5: 'titles', S6: 'never 99', S7: 'bonuses' };
async function evaluate(E, libText, seedSets, names, main) {
  const sets = Object.fromEntries(Object.entries(seedSets).map(([k, seeds]) => [k, playRuns(E.T, seeds, main)]));
  const run = { S1: () => S1(E, libText), S2: () => S2(E, libText), S3: () => S3(E, sets), S4: () => S4(E, sets), S5: () => S5(E, sets, main), S6: () => S6(E), S7: () => S7(E, sets) };
  return { res: Object.fromEntries(names.map(n => [n, run[n]()])), sets };
}
let checks = 0; let failed = 0; let dead = 0;
const started = Date.now();
const secs = () => `${((Date.now() - started) / 1000).toFixed(0)} s`;
console.log(`Round 1532: Stadium Tycoon scorelines at the hook's cadence (dt ${DT}s)${ONLY ? `, control ${ONLY} alone` : ''}`);
if (!ONLY) {
  const live = await engines('live', LIB);
  const { res, sets } = await evaluate(live, read(LIB), { cal: CAL, hold: HOLD }, NAMES, true);
  for (const n of NAMES) {
    checks += 1;
    console.log(`${n}) ${TITLES[n]}`);
    if (res[n].out.length) { failed += 1; for (const m of res[n].out.slice(0, 5)) console.error(`  FAIL: ${n}: ${m}`); } else console.log(`   ${res[n].note}`);
  }
  console.log(`S8) the economy beside the base record (printed, no fence) [${secs()}]`);
  for (const line of S8(sets)) console.log(`   ${line}`);
}
for (const name of ONLY ? [ONLY] : Object.keys(CONTROLS)) {
  const control = CONTROLS[name];
  console.log('');
  const E = await patched(name);
  const names = control.only ?? NAMES;
  const { res } = await evaluate(E, read(path.join(tmp, `${name}.ts`)), { ctl: CONTROL_SEEDS }, names, false);
  checks += 1;
  const red = names.filter(n => res[n].out.length);
  console.log(`   sections red: ${red.join(' ') || 'none'} (expected ${control.red.join(' ')}) [${secs()}]`);
  for (const n of red) console.log(`     ${n}: ${res[n].out[0].slice(0, 220)}`);
  if (!control.red.some(n => red.includes(n))) { dead += 1; console.error(`  FAIL: control ${name} did not fire: none of ${control.red.join(' ')} went red`); continue; }
  const wrong = [...control.red.filter(n => !red.includes(n)).map(n => `${n} stayed green`), ...red.filter(n => !control.red.includes(n)).map(n => `${n} went red too`)];
  if (wrong.length) { failed += 1; console.error(`  FAIL: control ${name}: ${wrong.join(', ')}`); }
}
console.log('');
console.log(`simTycoonScorelines: ${checks} checks, ${failed + dead} failed [${secs()}]`);
process.exit(dead ? 3 : failed ? 1 : 0);
