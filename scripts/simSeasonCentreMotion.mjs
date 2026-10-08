/**
 * Round 1046: the Season Centre moves, and what moves is true (the pure half;
 * scripts/playSeasonCentreMotion.mjs is the browser half).
 *
 * It bundles the real src/lib/motion/rankShift.ts, src/lib/season/* and the
 * career engine the way simSeasonCentreTable.mjs does, and reads every table
 * season the awards probe's 48 seeded careers play.
 *
 *  1. EVERY STEP, NOT JUST THE ENDS. For every table season, every matchday k
 *     from 1 and every step from 1 to M - k: rankShift(order(k), order(k +
 *     step)) gives each club the `from` it has in table k and the `to` it has
 *     in table k + step. Both are checked against index maps this harness
 *     builds for itself with plain loops (never the module's own output, never
 *     indexOf on it), and the `to` values are every place exactly once. The
 *     keys are the ones the viewer puts in `data-club`, and a season with two
 *     rows sharing a key fails. Printed: seasons, pairs checked, and how many
 *     one matchday steps moved at least one club (a floor, so a probe whose
 *     tables never change cannot pass).
 *  3. SOURCE FENCES, comments and strings stripped (a guard reads code, never
 *     prose): src/lib/motion/* imports nothing; src/components/motion/*
 *     imports only react and src/lib/motion; neither folder has "season" or
 *     "soccer" in an import path; and none of the fenced files draws a random
 *     number (`Math.random`, `new Rng(`). The clean run also proves the
 *     stripper: the same call written in a comment and in a string is NOT a
 *     finding.
 *
 * Controls (SEASON_MOTION_SIM_CONTROL=), each a rewrite of the BUNDLED copy or
 * of the text the fence reads, never a file on disk, each refusing to run
 * unless its single line needle is there exactly once (CRLF normalised):
 *   shift   rankShift hands back from and to swapped          -> 1 red
 *   fence   a Math.random() call added in RankShiftTable's code -> 3 red
 *
 * Green is the closing "simSeasonCentreMotion: N checks, 0 failed" line and
 * exit 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { probeAwardsNight } from './lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const CONTROL = process.env.SEASON_MOTION_SIM_CONTROL ?? '';
const SHIFT_NEEDLE = '  return after.map((club, to) => ({ club, from: was.get(club) ?? -1, to }));';
const FENCE_NEEDLE = "const EASE = 'cubic-bezier(.2,.8,.2,1)';";
const BUNDLE_CONTROLS = {
  shift: [{ file: 'src/lib/motion/rankShift.ts', from: SHIFT_NEEDLE, to: '  return after.map((club, to) => ({ club, from: to, to: was.get(club) ?? -1 }));' }],
};
if (CONTROL && !['shift', 'fence'].includes(CONTROL)) throw new Error(`unknown SEASON_MOTION_SIM_CONTROL ${CONTROL}`);
if (CONTROL) console.log(`CONTROL ${CONTROL}: applied to the bundled copy or the text the fence reads, never a file on disk`);

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const once = (text, needle, what) => { const n = text.split(needle).length - 1; if (n !== 1) throw new Error(`control refused: ${what} holds its needle ${n} times, not once`); };
if (CONTROL === 'shift') once(read('src/lib/motion/rankShift.ts'), SHIFT_NEEDLE, 'src/lib/motion/rankShift.ts');

const B = await bundleAwardsNight(ROOT, {
  patches: BUNDLE_CONTROLS[CONTROL] ?? [],
  extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts', motion: 'src/lib/motion/rankShift.ts' },
});
const { soccer, season: S, core: C, motion: MO } = B;
const CLUBS = soccer.FALLBACK_CLUBS;

let checks = 0, failed = 0;
const fails = new Map();
const fail = (item, msg) => { if (!fails.has(item)) fails.set(item, { n: 0, first: [] }); const f = fails.get(item); f.n += 1; if (f.first.length < 3) f.first.push(msg); };
const check = (ok, label) => { checks += 1; if (ok) console.log(`ok   ${label}`); else { failed += 1; console.log(`FAIL ${label}`); } };

/* ---- 1. every step ---- */
const stats = { tables: 0, pairs: 0, steps1: 0, steps1Moved: 0, clubsMoved: 0 };
function checkSeason(s, tag) {
  const M = s.rounds.length;
  const keyOf = slot => s.labels[slot]?.key ?? `u${slot}`;
  const orders = [];
  for (let k = 0; k <= M; k += 1) orders.push(C.tableAt(s, k).map(r => keyOf(r.slot)));
  const n = orders[0].length;
  if (new Set(orders[0]).size !== n) { fail('1 keys', `${tag}: two rows share a key`); return; }
  stats.tables += 1;
  for (let k = 1; k < M; k += 1) {
    const was = {};
    for (let i = 0; i < n; i += 1) was[orders[k][i]] = i;
    for (let step = 1; k + step <= M; step += 1) {
      const after = orders[k + step];
      const now = {};
      for (let i = 0; i < n; i += 1) now[after[i]] = i;
      const moves = MO.rankShift(orders[k], after);
      stats.pairs += 1;
      if (moves.length !== n) { fail('1 shift', `${tag}: ${moves.length} moves for ${n} clubs, matchday ${k} plus ${step}`); continue; }
      const places = new Array(n).fill(0);
      let moved = 0, bad = false;
      for (let i = 0; i < n && !bad; i += 1) {
        const m = moves[i];
        if (m.club !== after[i] || m.from !== was[m.club] || m.to !== now[m.club] || m.to !== i) bad = true;
        else { places[m.to] += 1; if (m.from !== m.to) moved += 1; }
      }
      if (bad || places.some(c => c !== 1)) { fail('1 shift', `${tag}: matchday ${k} plus ${step}, a club's from or to is not its place in the two tables`); continue; }
      if (step === 1) { stats.steps1 += 1; if (moved > 0) { stats.steps1Moved += 1; stats.clubsMoved += moved; } }
    }
  }
}

const seen = new Set();
probeAwardsNight(B, {
  onStep: s => {
    if (!['newspaper', 'season_summary', 'rehab_choice'].includes(s.phase)) return;
    const row = s.seasons[s.seasons.length - 1];
    if (!row || row.type !== 'playing' || !(row.apps > 0)) return;
    const k = `${s.playerName}|${row.year}`;
    if (seen.has(k)) return;
    seen.add(k);
    const ctx = S.buildSoccerSeasonCtx(s, CLUBS, row);
    const d = C.deriveSeason(S.SOCCER, row, ctx);
    if (d && d.mode === 'table') checkSeason(d, `${s.playerName} ${row.year} ${row.club}`);
  },
});
console.log(`1) every step: ${stats.tables} table seasons, ${stats.pairs} pairs of tables, ${stats.steps1Moved} of ${stats.steps1} one matchday steps moved a club (${stats.clubsMoved} club moves)`);
check(stats.tables >= 300, `1. the probe reached enough table seasons (${stats.tables}, floor 300)`);
check(stats.pairs >= 150000, `1. every step of every season was compared (${stats.pairs} pairs, floor 150000)`);
check(stats.steps1 > 0 && stats.steps1Moved / stats.steps1 >= 0.8, `1. one matchday steps that moved at least one club: ${(100 * stats.steps1Moved / Math.max(1, stats.steps1)).toFixed(1)}% (floor 80%)`);
for (const [item, f] of fails) console.log(`FAIL item ${item}: ${f.n} times, first: ${f.first.join(' | ')}`);
check(!fails.has('1 keys') && !fails.has('1 shift'), `1. every club's from and to are its places in the two tables${fails.size ? ` (${[...fails.entries()].map(([k, f]) => `${k}: ${f.n}`).join(', ')})` : ''}`);

/* ---- 3. source fences ---- */
/** The text with comments gone (`code`) and with string contents blanked too (`bare`). */
function strip(text) {
  let code = '', bare = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i], d = text[i + 1];
    if (c === '/' && d === '/') { while (i < n && text[i] !== '\n') i += 1; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i += 1; i += 2; code += ' '; bare += ' '; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < n && text[j] !== c) { if (text[j] === '\\') j += 1; j += 1; }
      code += text.slice(i, j + 1);
      bare += c + c;
      i = j + 1;
      continue;
    }
    code += c; bare += c; i += 1;
  }
  return { code, bare };
}
function importsOf(code) {
  const out = [];
  for (const m of code.matchAll(/\bimport\s+(type\s+)?[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g)) out.push({ spec: m[2], typeOnly: !!m[1] });
  for (const m of code.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) out.push({ spec: m[1], typeOnly: false });
  for (const m of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)) out.push({ spec: m[1], typeOnly: false });
  for (const m of code.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]/g)) out.push({ spec: m[1], typeOnly: false });
  return out;
}
const listDir = rel => fs.readdirSync(path.join(ROOT, rel)).filter(f => /\.(ts|tsx)$/.test(f)).map(f => `${rel}/${f}`);
const LIB_MOTION = listDir('src/lib/motion');
const UI_MOTION = listDir('src/components/motion');
/* files that may draw nothing at random (the list grows as the round's parts land) */
const NO_DRAW = [...LIB_MOTION, ...UI_MOTION];
const IMPORTS_NOTHING = [...LIB_MOTION];

function fenceFindings(textOf) {
  const out = [];
  for (const f of IMPORTS_NOTHING) for (const im of importsOf(strip(textOf(f)).code)) out.push(`${f} imports ${im.spec}: it must import nothing`);
  for (const f of UI_MOTION) for (const im of importsOf(strip(textOf(f)).code)) {
    if (im.spec !== 'react' && !im.spec.startsWith('@/lib/motion/')) out.push(`${f} imports ${im.spec}: only react and src/lib/motion`);
  }
  for (const f of [...LIB_MOTION, ...UI_MOTION]) for (const im of importsOf(strip(textOf(f)).code)) {
    if (/season|soccer/i.test(im.spec)) out.push(`${f} names a sport or the Season Centre in an import path (${im.spec})`);
  }
  for (const f of NO_DRAW) {
    const { bare } = strip(textOf(f));
    if (/Math\s*\.\s*random/.test(bare)) out.push(`${f} calls Math.random`);
    if (/new\s+Rng\s*\(/.test(bare)) out.push(`${f} makes an Rng`);
  }
  return out;
}

const SHIFT_UI = 'src/components/motion/RankShiftTable.tsx';
const DRAW_LINE = 'const fenceControl = Math.random();';
let textOf = read;
if (CONTROL === 'fence') {
  once(read(SHIFT_UI), FENCE_NEEDLE, SHIFT_UI);
  textOf = f => (f === SHIFT_UI ? read(f).replace(FENCE_NEEDLE, `${FENCE_NEEDLE}\n${DRAW_LINE}`) : read(f));
}
const found = fenceFindings(textOf);
console.log(`3) source fences: ${LIB_MOTION.length} files in src/lib/motion, ${UI_MOTION.length} in src/components/motion, ${NO_DRAW.length} that may draw nothing`);
for (const f of found.slice(0, 6)) console.log(`   finding: ${f}`);
check(LIB_MOTION.length >= 1 && UI_MOTION.length >= 1, '3. the fenced folders are not empty');
check(found.length === 0, `3. imports and random draws (${found.length} findings)`);
/* the stripper reads code: the same call in a comment and in a string is not a finding, and in code it is */
const asComment = f => (f === SHIFT_UI ? `${read(f)}\n// ${DRAW_LINE}\n/* ${DRAW_LINE} */\nconst words = '${DRAW_LINE}';\n` : read(f));
const asCode = f => (f === SHIFT_UI ? `${read(f)}\n${DRAW_LINE}\n` : read(f));
check(fenceFindings(asComment).length === 0, '3. the call written in a comment and in a string is not a finding');
check(fenceFindings(asCode).length === 1, '3. the same call in code is exactly one finding');

console.log(`simSeasonCentreMotion: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failed ? 1 : 0);
