/* Club Manager team instructions (Round 1522): pressing, tempo, width and the defensive line, the other dugout's
   style, and changes during a match.

   A player's report on /club-manager, forwarded 2026-10-21, asked for the game to be much more tactical. The
   instructions live in src/lib/clubManagerTactics.ts (TACTIC_TABLE, tacticBoost, AI_STYLES) and the engine reads
   them in src/lib/clubManager.ts with an early return on balanced, so a career that never sets one plays as it
   always did (that claim is held against the base by simCmDifficulty section 2 and simDailyDeals, and here by
   section `balanced`).

   THE TABLE (lambda boosts in MENT_MOD's convention: atk on my goal rate, def on theirs; attacking mentality is
   atk 0.42, def 0.34). See TACTIC_TABLE for the exact numbers; in words:
     High press    first half atk +0.08 times the legs (none at 60 fitness, all at 90), def -0.03; second half
                   atk +0.02, def +0.09 (tired legs); against a patient side atk +0.05, against a direct side def
                   +0.06. Possession +4, knocks x1.3, each man who played pays 5 more fitness.
     Stand off     atk -0.06, def -0.05; against a patient side atk -0.03, against a direct one def -0.03.
                   Possession -4, knocks x0.85, 2 fitness given back.
     Direct        atk +0.02 (+0.015 a target man or poacher, two at most), def +0.03; against a high line atk
                   +0.07, against a deep one -0.05. Possession -6, shots x0.8 for the same expected goals.
     Patient       atk -0.04 (+0.015 a playmaker, deep playmaker or false nine, two at most), def -0.04; against a
                   side that stands off atk +0.03, against a press def +0.07. Possession +6, shots x1.2.
     Wide          atk -0.01 (+0.02 a winger or attacking full back, three at most), def +0.03; against a narrow
                   side atk +0.04. Crosses x1.7, wide goals share +0.17.
     Narrow        atk -0.03 (+0.015 an inside forward, playmaker, creator or shadow striker, three at most), def
                   -0.04; against a wide side def +0.05. Crosses x0.5.
     High line     atk +0.05, def +0.05; against a direct side def +0.07, against a patient one atk +0.02; with
                   nobody pressing (stand off) def +0.05. Offsides x2.3, break goals share +0.14.
     Deep line     atk -0.05, def -0.06; against a patient side def +0.03, against a direct one def -0.03; behind a
                   high press (a gap) def +0.05. Offsides x0.4, break goals share -0.14.
   The other dugout plays one of eight styles (AI_STYLES), drawn off a stream keyed to the club's name and read
   against its strength (a weak side presses less and sits deeper), never the game's stream.

   Sections (SECTION=<name>[,<name>], default all but measure):
     table      the module on its own: balanced is zero against every style, every setting has words that say what
                it does and what it costs (no dash, no rival name), every non balanced setting concedes or scores
                less against at least one style (no free win), and the best answer to every style beats balanced
     styles     AI styles: keyed (no Math.random draw), stable, every style dealt somewhere, strong sides press and
                hold a high line more than weak ones, the match facts carry the style the engine reads
     balanced   a career with all four set to balanced by setInstructions is the untouched career, to the byte
     fleet      careers at nine clubs (three leagues, first, middle and last by expectation), every arm the same
                seeds, quick sim with the coach; arms: balanced, the eight single settings and (ARMS=all) every
                combination, plus `adapt` (the best answer to each opponent's style, set before each match) and
                `misread` (the same answers handed to the wrong opponents: the next style's answer).
                Checks: effects (each setting moves its own stat its way, see EFFECT_BANDS), dominance (no fixed
                set raises a mid table club's expected points a league game by more than DOMINANCE against
                balanced, each seed block), adapt (reading the opponent gains at least ADAPT_GAIN over balanced),
                read (adapt beats misread by at least READ_GAIN: the reading itself, since both play the same
                mix of settings and a setting's fitness and knock effects alone already pay a little)
   Expected points: each league match's own goal rates, read off the engine by an observer patched into the
   BUNDLE (never src), turned into 3 P(win) + P(draw) by Poisson. Arms are paired by club, seed and season, so
   the difference is the instructions and not the luck of the draw. Actual points are printed beside it.

   MEASURED (GitHub runners, 2026-10-21; the table above is the starting table, untuned: it met every band on
   its first measurement once the arms were paired). Common random numbers (SEGMENT_STREAM) were added after the
   first fleet, r1522-m1 on d26046dd, whose unpaired blocks of four seeds swung by up to 7 points (press+ -2.45 |
   -10.04): the arms are now paired stretch by stretch, and the same seeds replay byte for byte (the singles of
   every fleet below agree to the hundredth).
   Effects, singles fleet, nine clubs (Arsenal, Brentford, Hull City; Real Madrid, Espanyol, Malaga; Inter Milan,
   Torino, Frosinone), seeds 0 to 15, one season (r1522-f0 and f1 on 260c04ca, folded), per match
   over every competition, the setting against balanced:
     press+  won high 10.97 against 6.12 (x1.79), fitness at kick off 76.2 against 80.8 (-4.6), knocks 0.320
             against 0.247, goals conceded after the break 0.750 against 0.667
     press-  won high x0.54, fitness +1.9, knocks 0.208
     tempo+  possession 43.9 against 49.6 (-5.7), shots x0.88      tempo-  possession 55.1 (+5.5), shots x1.11
     width+  crosses 18.2 against 10.8 (x1.68), share of my goals from wide 0.475 against 0.298 (+0.18)
     width-  crosses x0.51, wide share 0.136 (-0.16)
     line+   their offsides 4.65 against 2.01 (x2.31), goals conceded on the break 0.469 against 0.255 (x1.84)
     line-   offsides x0.40, break goals x0.22
   Every band in EFFECT_BANDS holds with room; the closest is tempo+ shots, 0.882 against a ceiling of 0.93.
   Dominance, every fixed set, mid table clubs only (Brentford, Espanyol and Torino, the middle of their leagues'
   playableClubs by expectation), seeds 0 to 15, 48 mid seasons an arm (r1522-d0 to d3 on
   ebabc291, 16 shards, folded): expected points a league game against balanced, paired. Top pooled press- line-
   +0.74% (blocks -0.76 | +2.24); the largest single block press- width- line- +2.30%; no set over +3% in either
   block, against the lead's band of 6. The worst: press+ tempo- width+ line- -11.95% (a press with a deep line
   behind it and the middle given away). Balanced's actual points a game 1.172.
   Reading the opponent, the same fleet as the effects: adapt (the table's best answer to each style, less
   PRESS_LEGS_NET for a press) +4.42% against balanced (+3.30 | +5.53; big clubs +2.37, small +5.38); misread
   -0.35% (-2.18 | +1.48); adapt over misread +4.77% (+5.48 | +4.06; big +1.79, small +6.33). The bands:
   ADAPT_GAIN 2 and READ_GAIN 2, under the lowest block of each. The flat control shows why read is the check
   that matters: with tacticBoost zero, adapt still gains +2.17% (stand off's legs and knocks alone pay), and
   read falls to exactly 0.00 (adapt and misread then set the same instructions and play the same careers).

   Negative controls (CM_TACTICS_CONTROL), each patched into the bundle, never into src; each must turn red:
     flat       tacticBoost returns zero                                  read (adapt and misread then play alike)
     dominant   a high line concedes less (def -0.15)                     dominance
     nolegs     a high press costs no legs                                effects (press fitness)
     notempo    tempo moves no possession                                 effects (tempo possession)
     nowidth    width moves no crosses                                    effects (width crosses)
     noline     the line moves no offsides                                effects (line offsides)
     keyless    a style is drawn off Math.random                          styles
     weakpress  strong sides press less than weak ones                    styles
     leak       setInstructions keeps an all balanced set on the save     balanced
     helpwords  a deep line concedes more against a direct side          table (the help's worked example)
     mirror     a high line pays for MY direct tempo, not theirs          table (the example through tacticBoost)
   The controls above edit the table's constants or patch the module; every row of the table is also pinned through
   tacticBoost by src/lib/clubManagerTactics.test.ts (each interaction against the sum the table says it is, and the
   trigger put on my own side, which must add nothing), and each style's read is held to the table there too.

   READ THESE BANDS FOR WHAT THEY ARE (Round 1522 review). Five of the eight effects stats (won high, crosses,
   offsides, goals conceded on the break, share of my goals from wide) are the report's own numbers, made by
   tacticStatsOf off TACTIC_TABLE's multipliers on a keyed stream, not counted off the football the engine played;
   their bands prove the table reaches the report and can only go red when a constant changes (which is all nowidth
   and noline do). Possession, shots, fitness at kick off, knocks, late goals and expected points are the engine's
   own outputs. Goals from the spot, direct free kicks and own goals are never credited to the break or the wing
   (tacticStatsOf skips them, for the report and for the balanced arms here alike).
   The default run checks dominance over the eight single settings only; the 80 fixed sets run with ARMS=all in
   shards (SHARD=k/16, TIERS=mid, folded with FOLD), and a table edit wants that run too before it ships.
   The adapt band is a sanity line, not the check: with tacticBoost zero (the flat control) adapt still measured
   +2.17% and +1.82% on two runs, on either side of ADAPT_GAIN, because stand off's legs and knocks alone pay. The
   read band is the check that turns a flat table red, every time (read falls to exactly 0.00).
   Run: node scripts/simCmTactics.mjs (the default fleet: singles, adapt and misread, seeds 0 to 15, in PARTS=4
   children PAR=2 at a time, about 15 minutes on a runner). SECTION=fleet SEEDS=16 SEED_OFFSET=0 SEASONS=1 ARMS=all SHARD=k/n
   OUT_JSON=<file>; FOLD=<dir> folds shards). Offline: bundles the engine from src, reads no network.
   Exit 0 green, 1 red (or a control fired), 2 could not run, 3 a control that did not fire.
*/
import './lib/offlineTransport.cjs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CM_TACTICS_CONTROL || '';
const cannot = why => { console.log(`simCmTactics: CANNOT RUN: ${why}`); process.exit(2); };
const num = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? Number(process.env[k]) : d);
const ALL_SECTIONS = ['table', 'styles', 'balanced', 'fleet'];
const CONTROL_SECTIONS = {
  flat: ['fleet'], dominant: ['fleet'], nolegs: ['fleet'], notempo: ['fleet'], nowidth: ['fleet'], noline: ['fleet'],
  keyless: ['styles'], weakpress: ['styles'], leak: ['balanced'], helpwords: ['table'], mirror: ['table'],
};
if (CONTROL && !CONTROL_SECTIONS[CONTROL]) cannot(`CM_TACTICS_CONTROL=${CONTROL} is not a control this harness knows`);
const FOLD = process.env.FOLD || '';
const SECTIONS = FOLD ? ['fleet'] : CONTROL ? CONTROL_SECTIONS[CONTROL]
  : (process.env.SECTION || 'all') === 'all' ? ALL_SECTIONS : String(process.env.SECTION).split(',');
const SEEDS = num('SEEDS', 16);
const SEED_OFFSET = num('SEED_OFFSET', 0);
const SEASONS = num('SEASONS', 1);
const ARMS_KIND = process.env.ARMS || 'singles';
const SHARD = (process.env.SHARD || '0/1').split('/').map(Number);
const OUT_JSON = process.env.OUT_JSON || '';
/** The lead's band: no fixed set may raise a mid table club's expected points a league game by more than this. */
const DOMINANCE = num('DOMINANCE', 0.06);
/** Reading the opponent (adapt) must gain at least this over balanced, mid table, pooled. Set from measurement. */
const ADAPT_GAIN = num('ADAPT_GAIN', 0.02);
/** Reading the opponent (adapt) must beat the same answers handed to the wrong opponents (misread) by this, mid table,
    pooled. Set from measurement. */
const READ_GAIN = num('READ_GAIN', 0.02);

let failures = 0;
const red = new Map();
const fail = (section, m) => { failures += 1; red.set(section, (red.get(section) ?? 0) + 1); console.log(`  FAIL [${section}]: ${m}`); };
const ok = (section, m) => console.log(`  ok [${section}]: ${m}`);

/* ---- the bundle: the engine and the tactics module, with the observer and any control's patch ---- */
const OBSERVER = {
  file: 'clubManager.ts',
  from: '  const detail = buildMatchDetail({\n    myGoals, oppGoals, lamMine, lamOpp,',
  to: '  globalThis.__cmTacObs?.({ lamMine, lamOpp, comp: fx.competition, opp: fx.opponent, week: live.week, fit: started.reduce((a, x) => a + x.p.fitness, 0) / Math.max(1, started.length) });\n  const detail = buildMatchDetail({\n    myGoals, oppGoals, lamMine, lamOpp,',
};
/* Common random numbers for the fleet: each stretch of my match starts its own stream, keyed to the career, the
   week and the stretch, so two arms draw their goal counts off the same numbers and part only where the
   instructions part them. The draws are still uniform and independent, so each arm is the game as played; only
   the pairing between arms is tighter. Inert unless the fleet sets the hook (CRN=0 turns it off). */
const SEGMENT_STREAM = {
  file: 'clubManager.ts',
  from: '  if (from >= to) return;\n  const off = offPitchIds(live);',
  to: '  if (from >= to) return;\n  globalThis.__cmTacSeg?.(live.week, half, from);\n  const off = offPitchIds(live);',
};
const CRN = process.env.CRN !== '0';
const PATCHES = {
  flat: { file: 'clubManagerTactics.ts', from: 'export function tacticBoost(r: TacticRead): { atk: number; def: number } {\n', to: 'export function tacticBoost(r: TacticRead): { atk: number; def: number } {\n  if (r) return { atk: 0, def: 0 };\n' },
  keyless: { file: 'clubManagerTactics.ts', from: '  let u = keyedRng(`cm-style|${club}`)() * total;', to: '  let u = Math.random() * total;' },
  leak: { file: 'clubManager.ts', from: '  if (isBalanced(next)) delete out.instructions;\n  else out.instructions = next;', to: '  out.instructions = next;' },
  /* The review's mutation D: a high line punished for my own direct tempo instead of theirs. */
  mirror: { file: 'clubManagerTactics.ts', from: '    if (t.tempo === 1) def += T.line.high.vsDirectDef;', to: '    if (m.tempo === 1) def += T.line.high.vsDirectDef;' },
};
/** Controls made in memory on the loaded table, after every load. */
const MEM = {
  dominant: t => { t.TACTIC_TABLE.line.high.def = -0.15; },
  nolegs: t => { t.TACTIC_TABLE.legs.high = 0; t.TACTIC_TABLE.injury.high = 1; },
  notempo: t => { t.TACTIC_TABLE.poss.tempo = 0; },
  nowidth: t => { t.TACTIC_TABLE.crosses.wide = 1; t.TACTIC_TABLE.crosses.narrow = 1; },
  noline: t => { t.TACTIC_TABLE.offsides.high = 1; t.TACTIC_TABLE.offsides.deep = 1; },
  weakpress: t => { t.AI_STYLES.gegenpress.slope = -0.1; t.AI_STYLES.possession.slope = -0.1; t.AI_STYLES.lowblock.slope = 0.1; t.AI_STYLES.counter.slope = 0.1; },
  helpwords: t => { t.TACTIC_TABLE.line.deep.vsDirectDef = 0.2; },
};
/* TABLE_JSON (tuning on a runner without a commit): merged over TACTIC_TABLE after every load. */
const TUNE = process.env.TABLE_JSON ? JSON.parse(process.env.TABLE_JSON) : null;
const mergeInto = (a, b) => { for (const k of Object.keys(b)) { if (b[k] && typeof b[k] === 'object') mergeInto(a[k], b[k]); else a[k] = b[k]; } };

async function bundle(edits) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-tactics-'));
  const entry = path.join(work, 'entry.ts');
  const at = f => JSON.stringify(path.join(ROOT, `src/lib/${f}.ts`).split(path.sep).join('/'));
  fs.writeFileSync(entry, `export * as cm from ${at('clubManager')};\nexport * as tac from ${at('clubManagerTactics')};\nexport * as core from ${at('clubManagerTacticsCore')};\n`);
  const out = path.join(work, 'bundle.cjs');
  let hits = 0;
  await build({
    entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')],
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [{ name: 'cm-tactics-edits', setup(b) {
      b.onLoad({ filter: /[.]ts$/ }, async args => {
        const mine = edits.filter(e => path.basename(args.path) === e.file);
        if (!mine.length) return undefined;
        let source = (await fs.promises.readFile(args.path, 'utf8')).replaceAll('\r\n', '\n');
        for (const e of mine) {
          const count = source.split(e.from).length - 1;
          if (count !== 1) cannot(`an edit's text is in ${e.file} ${count} times, it must be exactly once (${e.from.slice(0, 70)}...)`);
          source = source.replace(e.from, e.to);
          hits += 1;
        }
        return { contents: source, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  if (hits !== edits.length) cannot(`${hits} of ${edits.length} edits reached the bundle`);
  return out;
}

/* ---- the runtime: a fresh module per career, a fixed clock, a seeded stream per career ---- */
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
function fresh(b) {
  delete req.cache[req.resolve(b)];
  store.clear();
  const m = req(b);
  if (TUNE) mergeInto(m.tac.TACTIC_TABLE, TUNE);
  if (MEM[CONTROL]) MEM[CONTROL](m.tac);
  return m;
}
function seeded(seed) {
  let a = seed >>> 0;
  const f = () => {
    f.n += 1;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.n = 0;
  return f;
}
function hash32(s) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/** Runs fn on its own stream; the draws it took are on withStream.draws afterwards. */
function withStream(seed, fn) {
  const saved = Math.random;
  const r = seeded(seed);
  Math.random = r;
  try { return fn(); } finally { Math.random = saved; withStream.draws = r.n; }
}
/** Poisson pmf and the expected points of a match off its two goal rates. */
function pmf(l, k) { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; }
function xPts(lm, lo) {
  let w = 0, d = 0;
  for (let a = 0; a <= 10; a++) for (let b = 0; b <= 10; b++) {
    const p = pmf(lm, a) * pmf(lo, b);
    if (a > b) w += p; else if (a === b) d += p;
  }
  return 3 * w + d;
}
const S = [-1, 0, 1];
const KEYS = ['press', 'tempo', 'width', 'line'];
const nameOf = i => KEYS.every(k => i[k] === 0) ? 'balanced' : KEYS.filter(k => i[k] !== 0).map(k => `${k}${i[k] > 0 ? '+' : '-'}`).join(' ');

const HEAD = FOLD ? null : await bundle([OBSERVER, SEGMENT_STREAM, ...(PATCHES[CONTROL] ? [PATCHES[CONTROL]] : [])]);
if (CONTROL) console.log(`NEGATIVE CONTROL ON: ${CONTROL} (must turn ${CONTROL_SECTIONS[CONTROL].join(', ')} red)`);
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];

/* ---- table: the module on its own ---- */
function sectionTable() {
  console.log('\n[table] the instruction table on its own');
  const { tac } = fresh(HEAD);
  const styles = tac.AI_STYLE_IDS;
  let n = 0, bad = 0;
  for (const id of styles) for (const half of [1, 2]) for (const fit of [50, 75, 95]) {
    const r = tac.tacticBoost({ mine: tac.BALANCED, theirs: tac.AI_STYLES[id].instructions, half, fit, duties: ['winger', 'targetMan', 'playmaker'] });
    n += 1;
    if (r.atk !== 0 || r.def !== 0) bad += 1;
  }
  if (bad || !n) fail('table', `balanced moved the goal rates in ${bad} of ${n} reads`); else ok('table', `balanced is exactly zero in all ${n} reads (8 styles, both halves, three fitness levels)`);
  let words = 0;
  for (const k of tac.INSTRUCTION_KEYS) for (const v of ['-1', '0', '1']) {
    const o = tac.INSTRUCTION_INFO[k].options[v];
    words += 1;
    if (!o || !o.label || !o.does || !o.costs) fail('table', `${k} ${v} has no label, no line on what it does or none on what it costs`);
    else if (DASHES.some(d => `${o.label}${o.does}${o.costs}`.includes(d))) fail('table', `${k} ${v} has a dash in its words`);
  }
  for (const id of styles) {
    const s = tac.AI_STYLES[id];
    if (DASHES.some(d => `${s.label}${s.blurb}${s.read}`.includes(d))) fail('table', `the style ${id} has a dash in its words`);
  }
  ok('table', `${words} settings carry a label, a does line and a costs line`);
  /* No free win: every setting off balanced scores less or concedes more against at least one style, in a half. */
  const one = (k, v) => ({ ...tac.BALANCED, [k]: v });
  for (const k of KEYS) for (const v of [-1, 1]) {
    const costs = styles.some(id => [1, 2].some(half => {
      const r = tac.tacticBoost({ mine: one(k, v), theirs: tac.AI_STYLES[id].instructions, half, fit: 85, duties: [] });
      return r.atk < 0 || r.def > 0;
    }));
    if (!costs) fail('table', `${k} ${v > 0 ? '+' : '-'} costs nothing in goals against any style`);
  }
  ok('table', 'every setting off balanced scores less or concedes more somewhere');
  /* The answer to every style beats balanced: reading the opponent can pay. Net is (atk - def), both halves averaged. */
  const all = [];
  for (const press of S) for (const tempo of S) for (const width of S) for (const line of S) all.push({ press, tempo, width, line });
  const net = (c, id) => {
    const r1 = tac.tacticBoost({ mine: c, theirs: tac.AI_STYLES[id].instructions, half: 1, fit: 85, duties: [] });
    const r2 = tac.tacticBoost({ mine: c, theirs: tac.AI_STYLES[id].instructions, half: 2, fit: 85, duties: [] });
    return (r1.atk + r2.atk - r1.def - r2.def) / 2;
  };
  for (const id of styles) {
    const best = all.map(c => ({ c, v: net(c, id) })).sort((a, b) => b.v - a.v)[0];
    console.log(`    best answer to ${id}: ${nameOf(best.c)} (net ${best.v.toFixed(3)})`);
    if (!(best.v >= 0.01)) fail('table', `nothing answers ${id} better than balanced by 0.01 (best ${best.v.toFixed(3)})`);
  }
  /* The help's worked example (ClubManagerHelp.tsx) prints its numbers off the table, so they cannot drift; what
     can go wrong is its words. It says a high line against a direct side costs at the back and gives a little up
     front, and a deep one gives up a little up front and concedes fewer: hold those signs, and that the block
     still reads the table rather than typed numbers. */
  const L = tac.TACTIC_TABLE.line;
  /* Round 1522 review (run lens, mutation D): the example's numbers are also what the engine plays. tacticBoost
     against the Counter attack style, both halves, must come to exactly the sums the help prints off the table, so
     an interaction applied to the wrong side (my tempo for theirs) makes the example false and this red. */
  const counter = tac.AI_STYLES.counter.instructions;
  const vs = (line, half) => tac.tacticBoost({ mine: { ...tac.BALANCED, line }, theirs: counter, half, fit: 85, duties: [] });
  const same = (a, b) => Math.abs(a - b) < 1e-9;
  const engine = [1, 2].every(h => same(vs(1, h).def, L.high.def + L.high.vsDirectDef) && same(vs(1, h).atk, L.high.atk)
    && same(vs(-1, h).def, L.deep.def + L.deep.vsDirectDef) && same(vs(-1, h).atk, L.deep.atk));
  const claims = [
    ['a Counter attack side sits deep and goes direct', counter.tempo === 1 && counter.line === -1],
    ['a high line concedes more against a direct side', L.high.def + L.high.vsDirectDef > 0],
    ['a high line scores more', L.high.atk > 0],
    ['a deep line scores less', L.deep.atk < 0],
    ['a deep line concedes less against a direct side', L.deep.def + L.deep.vsDirectDef < 0],
    ['the engine plays the numbers it prints against a Counter attack side (tacticBoost)', engine],
  ];
  for (const [what, holds] of claims) if (!holds) fail('table', `the help's worked example says ${what}, and the table no longer does`);
  const help = fs.readFileSync(path.join(ROOT, 'src/components/club-manager/ClubManagerHelp.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const reads = ['data-cm-help="instructions"', 'TAC_EXAMPLE.highTotal', 'TAC_EXAMPLE.deepDef', 'TAC_EXAMPLE.legs', 'TACTIC_TABLE'].every(s => help.includes(s));
  if (!reads) fail('table', 'the help block no longer reads its worked example off TACTIC_TABLE');
  if (claims.every(w => w[1]) && reads) ok('table', "the help's worked example reads the table and its words still hold");
}

/* ---- styles: the other dugout ---- */
function sectionStyles() {
  console.log("\n[styles] the other dugout's style");
  const { cm, tac, core } = fresh(HEAD);
  const real = Math.random;
  let draws = 0;
  Math.random = () => { draws += 1; return real(); };
  const names = Array.from({ length: 800 }, (_, i) => `Club ${i + 1}`);
  const deal = st => names.map(n => tac.aiStyleFor(n, st));
  let strong, weak, mid, again;
  try { strong = deal(84); weak = deal(62); mid = deal(72); again = deal(84); } finally { Math.random = real; }
  if (draws) fail('styles', `dealing styles drew ${draws} times from Math.random`); else ok('styles', "dealing 3200 styles drew nothing from the game's stream");
  if (again.some((x, i) => x !== strong[i])) fail('styles', 'the same club at the same strength was dealt a different style');
  else ok('styles', 'the same club at the same strength is always dealt the same style');
  const missing = tac.AI_STYLE_IDS.filter(id => !mid.includes(id));
  if (missing.length) fail('styles', `never dealt at a middling strength: ${missing.join(', ')}`); else ok('styles', 'every style is dealt at a middling strength');
  const share = (xs, f) => xs.filter(id => f(tac.AI_STYLES[id].instructions)).length / xs.length;
  const pressS = share(strong, i => i.press === 1), pressW = share(weak, i => i.press === 1);
  const offS = share(strong, i => i.press === -1), offW = share(weak, i => i.press === -1);
  const highS = share(strong, i => i.line === 1), highW = share(weak, i => i.line === 1);
  console.log(`    press high: strong ${pressS.toFixed(3)} weak ${pressW.toFixed(3)}; stand off: strong ${offS.toFixed(3)} weak ${offW.toFixed(3)}; high line: strong ${highS.toFixed(3)} weak ${highW.toFixed(3)}`);
  if (!(pressS - pressW >= 0.15)) fail('styles', `strong sides press high only ${(pressS - pressW).toFixed(3)} more often than weak ones (band 0.15)`);
  else ok('styles', `strong sides press high ${(pressS - pressW).toFixed(3)} more often than weak ones`);
  if (!(offW - offS >= 0.1)) fail('styles', `weak sides stand off only ${(offW - offS).toFixed(3)} more often (band 0.1)`);
  else ok('styles', `weak sides stand off ${(offW - offS).toFixed(3)} more often`);
  /* The style the preview prints (opponentStyle) is the one the engine's goal rates read through the slot, at
     three clubs: the slot's edge for a high press equals the table's boost against that style's settings. */
  for (const club of ['Everton', 'Real Madrid', 'Napoli']) {
    const s = withStream(hash32(`styles|${club}`), () => cm.startCareer(club));
    const f = cm.matchFacts(s);
    if (!f) { fail('styles', `${club}: no match facts on day one`); continue; }
    const shown = tac.opponentStyle(s, f.opponent);
    const xi = cm.effectiveXIWithSlots(s);
    const mine = { press: 1, tempo: 0, width: 0, line: 0 };
    const viaEngine = core.tacticsImpl()?.edge(s, { opponent: f.opponent }, xi, mine, 1);
    const viaTable = tac.tacticBoost({ mine, theirs: tac.AI_STYLES[shown].instructions, half: 1, fit: xi.reduce((a, x) => a + x.p.fitness, 0) / xi.length, duties: xi.map(x => x.duty) });
    if (shown !== tac.aiStyleFor(f.opponent, cm.strengthOf(s, f.opponent)) || !viaEngine || viaEngine.atk !== viaTable.atk || viaEngine.def !== viaTable.def) fail('styles', `${club}: the preview shows ${shown} and the engine reads ${JSON.stringify(viaEngine)} against the table's ${JSON.stringify(viaTable)}`);
    else ok('styles', `${club}: the preview's ${f.opponent} plays ${shown}, the style the engine's goal rates read`);
    const dealt = {};
    for (const c of s.leagueClubs) if (c !== s.clubName) { const id = tac.opponentStyle(s, c); dealt[id] = (dealt[id] ?? 0) + 1; }
    console.log(`    ${club}'s league: ${Object.entries(dealt).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  }
}

/* ---- balanced: set to balanced is the untouched career ---- */
function sectionBalanced() {
  console.log('\n[balanced] all four on balanced is the untouched career, to the byte');
  for (const club of ['Everton', 'Barcelona', 'Brighton']) for (const seed of [1, 2]) {
    const play = setUp => {
      const m = fresh(HEAD);
      const out = withStream(hash32(`balanced|${club}|${seed}`), () => {
        let s = setUp(m.cm, m.cm.startCareer(club));
        for (let g = 0; g < 200 && s.week < s.calendar.length; g++) {
          const r = m.cm.playNextEntry(s, { skipHalftime: true });
          s = r.state;
          if (r.kind === 'seasonOver' || s.sacked) break;
        }
        return JSON.stringify(s);
      });
      return { json: out, draws: withStream.draws };
    };
    const a = play((cm, s) => s);
    const b = play((cm, s) => {
      const on = cm.setInstructions(s, { press: 1, tempo: -1, width: 1, line: -1 });
      if (!on || !on.instructions) fail('balanced', 'setInstructions did not set a high press');
      return cm.setInstructions(on ?? s, { press: 0, tempo: 0, width: 0, line: 0 }) ?? s;
    });
    if (a.json !== b.json || a.draws !== b.draws) fail('balanced', `${club} seed ${seed}: set back to balanced is not the untouched season (${a.json.length} and ${b.json.length} characters, ${a.draws} and ${b.draws} draws)`);
    else ok('balanced', `${club} seed ${seed}: the same season to the byte (${a.json.length} characters, ${a.draws} draws)`);
  }
  const { cm } = fresh(HEAD);
  const s = withStream(1, () => cm.startCareer('Everton'));
  if (cm.setInstructions(s, { press: 2, tempo: 0, width: 0, line: 0 }) !== null) fail('balanced', 'a junk setting was taken');
  if (cm.setInstructions({ ...s, live: { week: 0 } }, { press: 1, tempo: 0, width: 0, line: 0 }) !== null) fail('balanced', 'instructions were set with a match on');
}

/* ---- fleet: careers under each arm, paired by club, seed and season ---- */
/** Each setting's own stat and the move it must make against balanced, pooled over the fleet (per match).
    ratio: arm over balanced; diff: arm minus balanced. Set from measured headroom, see the header. */
const EFFECT_BANDS = [
  { arm: 'press+', stat: 'wonHigh', ratio: [1.4, Infinity] },
  { arm: 'press+', stat: 'fit', diff: [-Infinity, -1] },
  { arm: 'press-', stat: 'wonHigh', ratio: [0, 0.7] },
  { arm: 'press-', stat: 'fit', diff: [0.3, Infinity] },
  { arm: 'tempo+', stat: 'poss', diff: [-Infinity, -3] },
  { arm: 'tempo+', stat: 'shots', ratio: [0, 0.93] },
  { arm: 'tempo-', stat: 'poss', diff: [3, Infinity] },
  { arm: 'tempo-', stat: 'shots', ratio: [1.07, Infinity] },
  { arm: 'width+', stat: 'crosses', ratio: [1.35, Infinity] },
  { arm: 'width+', stat: 'wideShare', diff: [0.08, Infinity] },
  { arm: 'width-', stat: 'crosses', ratio: [0, 0.7] },
  { arm: 'width-', stat: 'wideShare', diff: [-Infinity, -0.08] },
  { arm: 'line+', stat: 'offsides', ratio: [1.7, Infinity] },
  { arm: 'line+', stat: 'breakC', ratio: [1.3, Infinity] },
  { arm: 'line-', stat: 'offsides', ratio: [0, 0.6] },
  { arm: 'line-', stat: 'breakC', ratio: [0, 0.75] },
];
const ARM_KEY = i => (KEYS.every(k => i[k] === 0) ? 'balanced' : KEYS.filter(k => i[k] !== 0).map(k => `${k}${i[k] > 0 ? '+' : '-'}`).join(' '));

function fleetArms() {
  const arms = [{ key: 'balanced', instr: { press: 0, tempo: 0, width: 0, line: 0 } }];
  for (const press of S) for (const tempo of S) for (const width of S) for (const line of S) {
    const instr = { press, tempo, width, line };
    const set = KEYS.filter(k => instr[k] !== 0).length;
    if (set === 0) continue;
    if (ARMS_KIND === 'all' || set === 1) arms.push({ key: ARM_KEY(instr), instr });
  }
  arms.push({ key: 'adapt', instr: null });
  /* The same answers handed to the wrong opponents (the answer to the next style in AI_STYLE_IDS): the same mix of
     settings, so what adapt gains over it is the reading itself. */
  arms.push({ key: 'misread', instr: null, misread: true });
  return arms;
}

/** The nine clubs: the first, the middle and the last of three leagues by expectation. */
function fleetClubs(cm) {
  const out = [];
  for (const id of ['premier', 'laliga', 'seriea']) {
    const clubs = cm.playableClubs(id);
    out.push({ name: clubs[0].name, tier: 'big' });
    out.push({ name: clubs[Math.floor(clubs.length / 2)].name, tier: 'mid' });
    out.push({ name: clubs[clubs.length - 1].name, tier: 'small' });
  }
  const tiers = (process.env.TIERS || "big,mid,small").split(",");
  return out.filter(c => tiers.includes(c.tier));
}

/** What a manager who reads the help would charge a high press for its legs, in net goals a match (the press's
    fitness cost is a strength cost in the matches after). The adapt arm's own judgement, not the engine's. */
const PRESS_LEGS_NET = num('PRESS_LEGS_NET', 0.04);

/** The best answer to each style by the table (fit 85, no duties) less the press's legs, which the adapt arm sets
    before each match. */
function bestAnswers(tac) {
  const all = [];
  for (const press of S) for (const tempo of S) for (const width of S) for (const line of S) all.push({ press, tempo, width, line });
  const out = {};
  for (const id of tac.AI_STYLE_IDS) {
    const net = c => {
      const r1 = tac.tacticBoost({ mine: c, theirs: tac.AI_STYLES[id].instructions, half: 1, fit: 85, duties: [] });
      const r2 = tac.tacticBoost({ mine: c, theirs: tac.AI_STYLES[id].instructions, half: 2, fit: 85, duties: [] });
      return (r1.atk + r2.atk - r1.def - r2.def) / 2 - (c.press === 1 ? PRESS_LEGS_NET : 0);
    };
    out[id] = all.map(c => ({ c, v: net(c) })).sort((a, b) => b.v - a.v)[0].c;
  }
  return out;
}

/** The style the misread arm answers instead of the real one: the next in AI_STYLE_IDS, round the end. */
const misreadOf = (tac, id) => tac.AI_STYLE_IDS[(tac.AI_STYLE_IDS.indexOf(id) + 1) % tac.AI_STYLE_IDS.length];

const blank = () => ({ n: 0, xpts: 0, pts: 0, all: 0, poss: 0, shots: 0, wonHigh: 0, crosses: 0, offsides: 0, breakC: 0, wideG: 0, myG: 0, oppG: 0, h2Opp: 0, inj: 0, fit: 0 });

/** One career of SEASONS seasons at a club under an arm: the steady keeper (renews every deal, signs nobody), no
    sacking, every match a quick sim with the coach. Returns one row per season. */
function runCareer(arm, club, seed) {
  const m = fresh(HEAD);
  const { cm, tac } = m;
  const answers = arm.instr ? null : bestAnswers(tac);
  let obs = null;
  globalThis.__cmTacObs = o => { obs = o; };
  const career = `tactics|${club.name}|${seed}`;
  let season = 1;
  /* Common random numbers: every entry of the calendar, and every stretch of my match, on its own keyed stream. */
  const restream = key => { if (CRN) Math.random = seeded(hash32(`${career}|${season}|${key}`)); };
  globalThis.__cmTacSeg = CRN ? ((week, half, from) => restream(`seg|${week}|${half}|${from}`)) : undefined;
  try { return withStream(hash32(career), () => {
    let s = cm.startCareer(club.name);
    s = { ...s, startOptions: { ...(s.startOptions ?? {}), noSack: 1 } };
    const rows = [];
    for (season = 1; season <= SEASONS; season++) {
      const rec = { arm: arm.key, club: club.name, tier: club.tier, seed, season, ...blank() };
      if (arm.instr) s = cm.setInstructions(s, arm.instr) ?? s;
      for (let guard = 0; guard < 160; guard++) {
        for (const p of cm.expiringPlayers(s)) { const nx = cm.renewContract(s, p.id); if (nx) s = nx; }
        if (answers) {
          const f = cm.matchFacts(s);
          if (f) { const id = tac.opponentStyle(s, f.opponent); s = cm.setInstructions(s, answers[arm.misread ? misreadOf(tac, id) : id]) ?? s; }
        }
        obs = null;
        restream(`week|${s.week}`);
        const r = cm.playNextEntry(s, { skipHalftime: true });
        s = r.state;
        if (r.kind === 'match' && r.report && obs) countMatch(cm, tac, s, r.report, obs, rec, `${club.name}|${seed}|${season}`);
        if (r.kind === 'seasonOver') break;
      }
      rows.push(rec);
      if (season < SEASONS) { restream('summer'); s = cm.startNextSeason(cm.finishSeason(s).state); }
    }
    return rows;
  }); } finally { globalThis.__cmTacSeg = undefined; }
}

/** One match into a season's record. The tactics numbers are the report's own, or for a match played on balanced
    the same function run on that match with a balanced log (the number its report would have printed). */
function countMatch(cm, tac, s, report, obs, rec, key) {
  const d = report.detail;
  if (!d) return;
  /* The timeline's goal rows carry the set piece and own goal marks the report's numbers skip, the same as the
     engine's own goal lines do. */
  const goalRows = side => d.timeline.filter(e => e.kind === 'goal' && e.side === side);
  const mine = goalRows('me').map(e => e.minute), theirs = goalRows('opp').map(e => e.minute);
  const t = d.tactics ? d.tactics.stats : tac.tacticStatsOf({
    key: `${key}|${obs.week}`, log: undefined,
    theirs: tac.AI_STYLES[tac.opponentStyle(s, obs.opp)].instructions,
    lastMinute: d.et ? d.et.to : 90, possHalves: d.possHalves ?? [d.stats.possession, d.stats.possession],
    myGoals: goalRows('me'), oppGoals: goalRows('opp'), wideDuties: 0,
  });
  rec.all += 1;
  rec.poss += d.stats.possession;
  rec.shots += d.stats.shots;
  rec.wonHigh += t.wonHigh;
  rec.crosses += t.crosses;
  rec.offsides += t.offsides;
  rec.breakC += t.breakConceded;
  rec.wideG += t.wideGoals;
  rec.myG += mine.length;
  rec.oppG += theirs.length;
  rec.h2Opp += theirs.filter(x => x > 45).length;
  rec.inj += (d.injuries ?? []).length;
  rec.fit += obs.fit;
  if (obs.comp === 'league') {
    rec.n += 1;
    rec.xpts += xPts(obs.lamMine, obs.lamOpp);
    rec.pts += report.won ? 3 : report.drawn ? 1 : 0;
  }
}

/** A whole fleet with no SHARD plays in PARTS child processes, PAR at a time (one process loading a fresh engine
    for hundreds of careers can run out of memory, as simCmDifficulty found), and folds them here. Each career has
    its own module and streams, so a shard plays it exactly as a whole run would. */
async function fleetInChildren() {
  const { spawn } = await import('node:child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-tactics-fleet-'));
  const parts = num('PARTS', 4), par = num('PAR', 2);
  const run = k => new Promise(resolve => {
    const env = { ...process.env, SECTION: 'fleet', SHARD: `${k}/${parts}`, OUT_JSON: path.join(dir, `s${k}.json`) };
    delete env.FOLD;
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    child.stdout.on('data', d => { tail = (tail + d).slice(-300); });
    child.stderr.on('data', d => { tail = (tail + d).slice(-300); });
    child.on('close', code => resolve({ k, code, tail }));
  });
  const ks = Array.from({ length: parts }, (_, k) => k);
  for (let i = 0; i < ks.length; i += par) {
    for (const r of await Promise.all(ks.slice(i, i + par).map(run))) {
      if (r.code !== 0) cannot(`fleet shard ${r.k} of ${parts} ended ${r.code}: ${r.tail.trim().split('\n').pop()}`);
    }
  }
  return dir;
}

async function sectionFleet() {
  let rows;
  const foldDir = FOLD || (process.env.SHARD ? '' : await fleetInChildren());
  if (foldDir) {
    const files = fs.readdirSync(foldDir).filter(f => f.endsWith('.json'));
    rows = files.flatMap(f => JSON.parse(fs.readFileSync(path.join(foldDir, f), 'utf8')).rows);
    console.log(`\n[fleet] folded ${rows.length} season rows from ${files.length} files in ${foldDir}`);
  } else {
    const { cm } = fresh(HEAD);
    const clubs = fleetClubs(cm);
    const arms = fleetArms();
    const seeds = Array.from({ length: SEEDS }, (_, i) => SEED_OFFSET + i);
    const jobs = [];
    for (const arm of arms) for (const club of clubs) for (const seed of seeds) jobs.push({ arm, club, seed });
    const mine = jobs.filter((_, i) => i % SHARD[1] === SHARD[0]);
    console.log(`\n[fleet] ${arms.length} arms x ${clubs.length} clubs x ${seeds.length} seeds (${seeds[0]} to ${seeds[seeds.length - 1]}) x ${SEASONS} seasons; shard ${SHARD[0]}/${SHARD[1]}: ${mine.length} careers`);
    console.log(`    clubs: ${clubs.map(c => `${c.name} (${c.tier})`).join(', ')}`);
    const t0 = performance.now();
    rows = [];
    for (const j of mine) rows.push(...runCareer(j.arm, j.club, j.seed));
    console.log(`    played in ${((performance.now() - t0) / 1000).toFixed(0)} s`);
    if (OUT_JSON) {
      fs.writeFileSync(OUT_JSON, JSON.stringify({ rows }));
      console.log(`    wrote ${rows.length} season rows to ${OUT_JSON}`);
      if (SHARD[1] > 1) { console.log('    a shard: fold the shards with FOLD=<dir> to judge them'); return; }
    }
  }
  analyze(rows);
}

function analyze(rows) {
  const seeds = [...new Set(rows.map(r => r.seed))].sort((a, b) => a - b);
  if (seeds.length < 2) cannot('the fleet needs at least two seeds to make two blocks');
  const cut = seeds[Math.floor(seeds.length / 2)];
  const blockOf = seed => (seed < cut ? 0 : 1);
  const key = r => `${r.club}|${r.seed}|${r.season}`;
  const base = new Map(rows.filter(r => r.arm === 'balanced').map(r => [key(r), r]));
  if (!base.size) cannot('no balanced arm in the rows');
  const arms = [...new Set(rows.map(r => r.arm))].filter(a => a !== 'balanced');
  /** Paired relative change in expected points a league game against balanced (same club, seed and season). */
  const gain = (arm, tier, block) => {
    let d = 0, b = 0, n = 0;
    for (const r of rows) {
      if (r.arm !== arm || (tier && r.tier !== tier) || (block !== undefined && blockOf(r.seed) !== block)) continue;
      const q = base.get(key(r));
      if (!q || !r.n || !q.n) continue;
      d += r.xpts / r.n - q.xpts / q.n;
      b += q.xpts / q.n;
      n += 1;
    }
    return n ? { rel: d / b, n } : { rel: NaN, n: 0 };
  };
  const ppg = (arm, tier) => {
    const xs = rows.filter(r => r.arm === arm && (!tier || r.tier === tier));
    const n = xs.reduce((a, r) => a + r.n, 0);
    return n ? xs.reduce((a, r) => a + r.pts, 0) / n : NaN;
  };
  const pct = x => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(2)}%`;
  console.log(`\n  expected points a league game against balanced, paired (mid: pooled | block ${seeds[0]} to ${cut - 1} | block ${cut} to ${seeds[seeds.length - 1]}; big; small) and actual points a game (mid, balanced ${ppg('balanced', 'mid').toFixed(3)})`);
  const table = arms.map(a => ({ a, mid: gain(a, 'mid'), b0: gain(a, 'mid', 0), b1: gain(a, 'mid', 1), big: gain(a, 'big'), small: gain(a, 'small'), ppg: ppg(a, 'mid') }))
    .sort((x, y) => y.mid.rel - x.mid.rel);
  const show = arms.length > 20 ? [...table.slice(0, 12), ...table.filter(t => !t.a.includes(' ') || t.a === 'adapt'), ...table.slice(-4)] : table;
  const seen = new Set();
  for (const t of show) {
    if (seen.has(t.a)) continue;
    seen.add(t.a);
    console.log(`    ${t.a.padEnd(28)} mid ${pct(t.mid.rel)} | ${pct(t.b0.rel)} | ${pct(t.b1.rel)}   big ${pct(t.big.rel)}   small ${pct(t.small.rel)}   ppg ${t.ppg.toFixed(3)}   (${t.mid.n} mid seasons)`);
  }
  /* dominance: no fixed set beats balanced by more than the band at a mid table club, in either block. */
  if (SECTIONS.includes('fleet')) {
    const fixed = table.filter(t => t.a !== 'adapt' && t.a !== 'misread');
    const over = fixed.filter(t => !(t.b0.rel <= DOMINANCE && t.b1.rel <= DOMINANCE));
    const thin = fixed.filter(t => t.b0.n < 2 || t.b1.n < 2);
    if (thin.length) fail('dominance', `${thin.length} arms have under two mid seasons in a block (${thin[0].a})`);
    for (const t of over) fail('dominance', `${t.a} raises a mid table club's expected points ${pct(t.b0.rel)} | ${pct(t.b1.rel)} by block (band ${pct(DOMINANCE)})`);
    if (!over.length && fixed.length) ok('dominance', `none of ${fixed.length} fixed sets beats balanced by over ${pct(DOMINANCE)} at a mid table club in either block (top ${fixed[0].a})`);
    const adapt = table.find(t => t.a === 'adapt');
    const misread = table.find(t => t.a === 'misread');
    /* read: the reading itself, adapt against the same answers handed to the wrong opponents, paired. */
    if (adapt && misread) {
      const d = adapt.mid.rel - misread.mid.rel;
      const d0 = adapt.b0.rel - misread.b0.rel, d1 = adapt.b1.rel - misread.b1.rel;
      if (!(d >= READ_GAIN)) fail('read', `reading the opponent beats misreading them by only ${pct(d)} at a mid table club (${pct(d0)} | ${pct(d1)}; band ${pct(READ_GAIN)})`);
      else ok('read', `reading the opponent beats misreading them by ${pct(d)} at a mid table club (${pct(d0)} | ${pct(d1)}; big ${pct(adapt.big.rel - misread.big.rel)}, small ${pct(adapt.small.rel - misread.small.rel)})`);
    } else if (adapt) console.log('    read: no misread arm in these rows (a dominance only fleet), not judged');
    if (adapt) {
      if (!(adapt.mid.rel >= ADAPT_GAIN)) fail('adapt', `reading the opponent gains only ${pct(adapt.mid.rel)} at a mid table club (band ${pct(ADAPT_GAIN)})`);
      else ok('adapt', `the best answer to each opponent's style gains ${pct(adapt.mid.rel)} at a mid table club (${pct(adapt.b0.rel)} | ${pct(adapt.b1.rel)}; big ${pct(adapt.big.rel)}, small ${pct(adapt.small.rel)})`);
    }
  }
  /* effects: each single setting moves its own stat its way. */
  const stat = (arm, name) => {
    const xs = rows.filter(r => r.arm === arm);
    const sum = f => xs.reduce((a, r) => a + f(r), 0);
    const all = sum(r => r.all);
    if (!all) return NaN;
    if (name === 'wideShare') return sum(r => r.wideG) / Math.max(1, sum(r => r.myG));
    return sum(r => r[name]) / all;
  };
  const names = ['poss', 'shots', 'wonHigh', 'crosses', 'offsides', 'breakC', 'wideShare', 'fit', 'inj', 'h2Opp', 'myG', 'oppG'];
  console.log('\n  per match, every competition (balanced first):');
  for (const a of ['balanced', ...arms.filter(x => !x.includes(' ')).sort()]) {
    if (!rows.some(r => r.arm === a)) continue;
    console.log(`    ${a.padEnd(9)} ${names.map(n => `${n} ${stat(a, n).toFixed(n === 'poss' || n === 'fit' ? 1 : 3)}`).join('  ')}`);
  }
  for (const b of EFFECT_BANDS) {
    if (!rows.some(r => r.arm === b.arm)) continue;
    const mine = stat(b.arm, b.stat), bal = stat('balanced', b.stat);
    const v = b.ratio ? mine / bal : mine - bal;
    const [lo, hi] = b.ratio ?? b.diff;
    const what = `${b.arm} ${b.stat}: ${b.ratio ? `ratio ${v.toFixed(3)}` : `diff ${v.toFixed(3)}`} (band ${lo} to ${hi})`;
    if (!(v >= lo && v <= hi)) fail('effects', what); else ok('effects', what);
  }
}

/* ---- run ---- */
for (const sec of SECTIONS) {
  if (sec === 'table') sectionTable();
  else if (sec === 'styles') sectionStyles();
  else if (sec === 'balanced') sectionBalanced();
  else if (sec === 'fleet') await sectionFleet();
  else cannot(`no section ${sec}`);
}
/* A fleet shard only plays and writes; the fold judges (a control's shard included). */
if (SHARD[1] > 1 && OUT_JSON && SECTIONS.length === 1 && SECTIONS[0] === 'fleet' && !failures) {
  console.log(`simCmTactics: shard ${SHARD[0]}/${SHARD[1]} written`);
  process.exit(0);
}
if (CONTROL) {
  const sections = CONTROL_SECTIONS[CONTROL];
  if (failures) { console.log(`simCmTactics: control ${CONTROL} FIRED (${failures} failures: ${[...red.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}; must turn ${sections.join(', ')} red)`); process.exit(1); }
  console.log(`simCmTactics: control ${CONTROL} DID NOT FIRE`);
  process.exit(3);
}
if (failures) { console.log(`simCmTactics: RED (${failures} failures: ${[...red.entries()].map(([k, v]) => `${k} ${v}`).join(', ')})`); process.exit(1); }
console.log(`simCmTactics: all green (sections ${SECTIONS.join(', ')})`);
