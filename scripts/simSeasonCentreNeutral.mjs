/**
 * Round 1045: the default path does not move (DESIGN 1045 section 9.1).
 *
 * The Season Centre derives a season from the saved row after the fact. A
 * reader that drew from Math.random, or wrote one field into the save, would
 * shift every later draw of the career and every byte for byte fixture on the
 * site. This harness proves it does neither, on the awards probe's 48 seeded
 * careers (scripts/lib/careerAwardsNightProbe.mjs, unchanged):
 *
 *   Run A: probeAwardsNight as is.
 *   Run B: the same, with its onStep hook doing everything the viewer can do
 *     on every playing row and on the pending summary: build the context,
 *     derive the season, and read tableAt and soFar at every matchday. While
 *     it reads, Math.random is a counting trap that forwards to the career's
 *     own generator, so a stray call both counts and shifts the stream.
 *
 * Outcome: B's whole output equals A's (every step hash of every career, every
 * night, every speech), the trap count is 0, and the phone's seed is the same
 * before and after every read. Coverage is a FAIL when short, never a skip
 * (floors are what the probe reaches; a loan, a severe injury and the targeted
 * rows are scripts/simSeasonCentreAgreement.mjs's, critic C9).
 *
 * Source fence: with comments and strings stripped, no Math.random, no
 * `new Rng(` and no runtime import of clubManager.ts or soccerPhone.ts in
 * src/lib/season, src/components/season-centre or SoccerSeasonCentre.tsx;
 * law.ts and src/data/leagueFormat.ts import nothing.
 *
 * Controls (SEASON_CENTRE_CONTROL=), each refusing to run if its needle is
 * missing:
 *   stream  one Math.random inside deriveSeason, bundle only: trap and hashes red
 *   write   the context builder writes a field on career.lastUCLResult: hashes red
 *   fence   Math.random added to core.ts's code in memory goes red; the same
 *           text inside a comment stays green
 *
 * Measured 2026-10-07: 20 checks, 0 failed, 2596 reads, 0 refused, 0 trap
 * calls. Controls, each exit 1: stream fails 3 (every career's hashes, the
 * whole output, 2601 trap calls); write fails 2 (hashes, whole output); fence
 * fails 1 (Math.random in code) while the same text in a comment stays green.
 *
 * Green is the closing "simSeasonCentreNeutral: N checks, 0 failed" line and
 * exit 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { probeAwardsNight } from './lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const CONTROL = process.env.SEASON_CENTRE_CONTROL ?? '';
if (CONTROL && !['stream', 'write', 'fence'].includes(CONTROL)) throw new Error(`unknown SEASON_CENTRE_CONTROL ${CONTROL}`);

let checks = 0, failed = 0;
const check = (ok, label) => { checks += 1; if (ok) console.log(`ok   ${label}`); else { failed += 1; console.log(`FAIL ${label}`); } };

/* ─── The source fence (reads code, never prose) ─── */
function stripCode(src) {
  let out = '';
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i += 1; out += '\n'; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1; i += 1; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out += q; i += 1;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i += 1; i += 1; }
      out += q; continue;
    }
    out += c;
  }
  return out;
}
/** Import specifiers survive the strip only as quotes, so they are read from the raw lines. */
function runtimeImports(src) {
  return src.split('\n').filter(l => /^\s*import\s/.test(l) && !/^\s*import\s+type\s/.test(l)).map(l => (l.match(/from\s+['"]([^'"]+)['"]/) ?? [])[1]).filter(Boolean);
}
function fenceFile(rel, src) {
  const code = stripCode(src);
  const bad = [];
  if (/\bMath\.random\b/.test(code)) bad.push('Math.random');
  if (/\bnew\s+Rng\s*\(/.test(code)) bad.push('new Rng(');
  for (const m of runtimeImports(src)) if (/clubManager(\.ts)?$|soccerPhone(\.ts)?$/.test(m)) bad.push(`imports ${m}`);
  if ((rel.endsWith('season/law.ts') || rel.endsWith('data/leagueFormat.ts')) && /^\s*import\s/m.test(code)) bad.push('imports something');
  return bad;
}
const FENCED = [
  ...fs.readdirSync(path.join(ROOT, 'src/lib/season')).map(f => `src/lib/season/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'src/components/season-centre')).map(f => `src/components/season-centre/${f}`),
  'src/components/soccer-career/SoccerSeasonCentre.tsx',
  'src/data/leagueFormat.ts',
];
if (CONTROL === 'fence') {
  const rel = 'src/lib/season/core.ts';
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const needle = 'export function deriveSeason<R, C>(';
  if (!src.includes(needle)) throw new Error('control refused: core.ts has no deriveSeason');
  const inCode = src.replace(needle, `const leak = () => Math.random();\n${needle}`);
  const inComment = src.replace(needle, `/* Math.random() is never called here */\n${needle}`);
  console.log('CONTROL fence: core.ts with Math.random in code, and in a comment, fenced in memory');
  check(fenceFile(rel, inComment).length === 0, 'fence: the same text inside a comment stays green');
  check(fenceFile(rel, inCode).length === 0, `fence: Math.random in core.ts's code (${fenceFile(rel, inCode).join(', ')})`);
} else {
  for (const rel of FENCED) {
    const bad = fenceFile(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    check(bad.length === 0, `fence ${rel}${bad.length ? `: ${bad.join(', ')}` : ''}`);
  }
}

/* ─── Runs A and B ─── */
const STREAM = { file: 'src/lib/season/core.ts', from: '  const key = sport.seasonKey(row, ctx);\n  if (key === null) return \'nokey\';', to: '  const key = sport.seasonKey(row, ctx);\n  Math.random();\n  if (key === null) return \'nokey\';' };
const WRITE = { file: 'src/lib/season/soccer.ts', from: '  const finish = readLeagueFinish(row);\n  const today =', to: '  const finish = readLeagueFinish(row);\n  if (career.lastUCLResult) (career.lastUCLResult as unknown as Record<string, unknown>).seen = 1;\n  const today =' };
const patches = CONTROL === 'stream' ? [STREAM] : CONTROL === 'write' ? [WRITE] : [];
if (patches.length) console.log(`CONTROL ${CONTROL}: ${patches[0].file} patched in the bundle only`);
const t0 = Date.now();
const B = await bundleAwardsNight(ROOT, { patches, extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts' } });
console.log(`bundled in ${Date.now() - t0} ms`);
const { soccer, season: S, core: C } = B;
const CLUBS = soccer.FALLBACK_CLUBS;

const A = probeAwardsNight(B);
console.log(`run A: ${A.careers.length} careers`);

let trap = 0, seedMoved = 0, reads = 0;
const cover = { table: 0, results: 0, keeper: 0, defenderSheets: 0, derby: 0, red: 0, clinch: 0, namedChampion: 0, nullSeasons: 0 };
const seen = new Set();
function readAll(s, row, tag) {
  if (!row || row.type !== 'playing' || !(row.apps > 0)) return;
  const k = `${tag}|${s.playerName}|${row.year}|${s.phase}`;
  if (seen.has(k)) return;
  seen.add(k);
  const real = Math.random;
  Math.random = () => { trap += 1; return real(); };
  const seedBefore = s.phone?.seed;
  try {
    reads += 1;
    const ctx = S.buildSoccerSeasonCtx(s, CLUBS, row);
    const d = C.deriveSeason(S.SOCCER, row, ctx);
    if (!d) { cover.nullSeasons += 1; return; }
    for (let md = 0; md <= d.games.length; md += 1) { C.tableAt(d, md); C.soFar(d, md); }
    cover[d.mode === 'table' ? 'table' : 'results'] += 1;
    if (s.position === 'GK') cover.keeper += 1;
    if (['CB', 'LB', 'RB'].includes(s.position) && row.cleanSheets > 0) cover.defenderSheets += 1;
    if (d.games.some(g => g.fixedKey)) cover.derby += 1;
    if (row.redCards > 0) cover.red += 1;
    if (d.clinch) cover.clinch += 1;
    if (ctx.champion && d.mode === 'table') cover.namedChampion += 1;
  } finally {
    Math.random = real;
    if (s.phone?.seed !== seedBefore) seedMoved += 1;
  }
}
const Bout = probeAwardsNight(B, {
  onStep: s => {
    if (['newspaper', 'season_summary', 'rehab_choice'].includes(s.phase)) readAll(s, s.seasons[s.seasons.length - 1], 'row');
    if (s.phase === 'season_summary') readAll(s, s.pendingSummary, 'summary');
  },
});
console.log(`run B: ${Bout.careers.length} careers, ${reads} seasons read`);

const aSteps = A.careers.map(c => c.steps);
const bSteps = Bout.careers.map(c => c.steps);
let sameCareers = 0;
for (let i = 0; i < aSteps.length; i += 1) if (aSteps[i] === bSteps[i]) sameCareers += 1;
check(sameCareers === aSteps.length, `every step hash of every career equal: ${sameCareers} of ${aSteps.length}`);
check(JSON.stringify(A) === JSON.stringify(Bout), 'run B\'s whole output equals run A\'s (nights, speeches, markup)');
check(trap === 0, `Math.random calls while reading: ${trap}`);
check(seedMoved === 0, `the phone's seed moved on ${seedMoved} reads`);
/* Measured 2026-10-07 (the probe is seeded, so these repeat exactly): table 1068,
   results 1528, keeper 327, defender with clean sheets 314, derby 1063, red 153,
   clinch 381, named champion 684, out of 2596 reads. Floors at about half, so an
   engine round that reshapes careers does not trip them and a reader that stops
   reaching a kind of season does. */
const FLOORS = { table: 500, results: 700, keeper: 150, defenderSheets: 150, derby: 500, red: 70, clinch: 180, namedChampion: 300 };
for (const [k, floor] of Object.entries(FLOORS)) check(cover[k] >= floor, `coverage ${k}: ${cover[k]} (floor ${floor})`);
console.log(`refused seasons (no Centre offered): ${cover.nullSeasons} of ${reads}`);
console.log(`simSeasonCentreNeutral: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failed ? 1 : 0);
