/* Round 1347: record how the participant engine settles a knockout tie it is not in, as a GOLDEN table the
 * unit file src/lib/worldCompetition.test.ts holds settleTie to (the critic's correction 7: the oracle is the
 * base commit's advanceUclBracket, never the function under test).
 *
 *   node scripts/recordWorldTieGolden1347.mjs [--ref <commit>] [--out <file>]
 *   node scripts/recordWorldTieGolden1347.mjs --ref <commit> --check [--against <file>]
 *
 * --ref is the commit whose src/lib/clubManager.ts is read (default d4f2c6f6, the commit Round 1347 started
 * from), through git show, so the tree on disk does not matter. --out defaults to
 * scripts/data/worldTieGolden1347.json.
 *
 * THE PROOF FOR E2 (and for any commit before it merges) is --check: it records the engine of --ref and
 * compares its CASES with the committed golden's (--against, the same default file), every case's text in
 * order, and prints SAME (exit 0) or DIFFERENT with the first case that moved (exit 1). It writes nothing.
 * Never compare two whole files of different refs: the file's "ref" names the commit it was recorded from, so
 * they differ on that line alone (the run review's minor 3). And never re-record the golden from the function
 * under test to make a check pass: the golden stays the recording of d4f2c6f6.
 *
 * How it records. The engine is bundled with two edits made in memory, never on disk: advanceUclBracket is
 * exported, and simAiMatch reports every call it makes (the two clubs, the scale and the goals). Math.random is a
 * seeded stream; a draw made outside simAiMatch is a coin. For each era, round and pair of strengths, seeds
 * are tried in order until each kind of ending has been seen once: decided over two legs, on away goals,
 * after extra time, on away goals in extra time, and on penalties (one leg: decided, after extra time, on
 * penalties). Each case keeps the tie as it went in, the calls, the coins, the tie as it came out (its JSON
 * and its keys in order, so a field written in another order or an undefined key dropped shows) and the rules
 * the engine read (legs, away goals, ET_DEFLATOR, ET_MINUTES).
 *
 * It reads no network and no database. It bundles the whole engine, so run it on a runner, not the owner's PC.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const REF = arg('--ref', 'd4f2c6f6');
const OUT = path.resolve(ROOT, arg('--out', 'scripts/data/worldTieGolden1347.json'));
const ENGINE = 'src/lib/clubManager.ts';
const SIM_LINE = '  return simScore(strengthOf(state, home), strengthOf(state, away), 0.2, -0.08, scale);\n';
const SIM_LOGGED = '  globalThis.__tieSimIn(); const __r = simScore(strengthOf(state, home), strengthOf(state, away), 0.2, -0.08, scale); globalThis.__tieSimOut(home, away, scale, __r); return __r;\n';
const lf = s => s.split('\r\n').join('\n');
const cannot = why => { console.log(`recordWorldTieGolden1347: cannot run: ${why}`); process.exit(2); };

let edited = 0;
const plugin = {
  name: 'tie-golden-source',
  setup(b) {
    b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return null;
      let text;
      try { text = lf(execFileSync('git', ['show', `${REF}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 27 })); } catch { return null; }
      if (rel === ENGINE) {
        const n = text.split(SIM_LINE).length - 1;
        if (n !== 1) cannot(`simAiMatch's line is in ${ENGINE} at ${REF} ${n} times, it must be exactly once`);
        text = `${text.replace(SIM_LINE, SIM_LOGGED)}\nexport { advanceUclBracket as __advanceUclBracket };\n`;
        edited += 1;
      }
      return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
    });
  },
};
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'tie-golden-'));
const outfile = path.join(work, 'engine.mjs');
await build({ stdin: { contents: "export * from './src/lib/clubManager';\n", resolveDir: ROOT, sourcefile: 'tie-golden.ts', loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', target: 'node20', outfile, plugins: [plugin], logLevel: 'error' });
if (edited !== 1) cannot(`${ENGINE} was edited ${edited} times`);
const cm = await import(pathToFileURL(outfile).href);

const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
let inSim = 0;
let calls = [];
let coins = [];
let draws = 0;
globalThis.__tieSimIn = () => { inSim += 1; };
globalThis.__tieSimOut = (home, away, scale, r) => { inSim -= 1; calls.push([home, away, scale, r[0], r[1]]); };

function settle(eraId, round, strengths, seed) {
  const tie = { round, slot: 0, home: 'Alpha FC', away: 'Beta FC', homeGoals: null, awayGoals: null, winner: null, mine: false };
  const tieIn = JSON.stringify(tie);
  const state = { eraId, clubName: 'Mine FC', clubStrengths: { 'Alpha FC': strengths[0], 'Beta FC': strengths[1] }, uclBracket: [tie] };
  const rng = mulberry(seed);
  const original = Math.random;
  calls = []; coins = []; draws = 0;
  Math.random = () => { const v = rng(); draws += 1; if (inSim === 0) coins.push(v); return v; };
  try { cm.__advanceUclBracket(state, round); } finally { Math.random = original; }
  const kind = tie.pens ? 'pens' : tie.aet ? (tie.byAwayGoals ? 'etAway' : 'et') : tie.byAwayGoals ? 'away' : 'plain';
  return { tieIn, tie, kind, calls: [...calls], coins: [...coins], draws };
}

const cases = [];
for (const eraId of [null, 'era2005', 'era2020']) {
  for (const round of ['QF', 'F']) {
    for (const strengths of [[70, 70], [82, 64]]) {
      const legs = cm.uclLegsFor(eraId ?? undefined, round);
      const awayGoals = cm.uclAwayGoalsApply(eraId ?? undefined);
      const wanted = legs === 2 ? (awayGoals ? ['plain', 'away', 'et', 'etAway', 'pens'] : ['plain', 'et', 'pens']) : ['plain', 'et', 'pens'];
      const seen = new Set();
      for (let seed = 1; seed <= 4000 && seen.size < wanted.length; seed += 1) {
        const r = settle(eraId ?? undefined, round, strengths, seed);
        if (!wanted.includes(r.kind) || seen.has(r.kind)) continue;
        seen.add(r.kind);
        cases.push({
          name: `${eraId ?? 'modern'} ${round} ${strengths.join('-')} ${r.kind}`, eraId, round, strengths, seed, kind: r.kind,
          rules: { legs, awayGoals, deciderScale: cm.ET_DEFLATOR, etScale: cm.ET_DEFLATOR * cm.ET_MINUTES / 90 },
          tieIn: r.tieIn, calls: r.calls, coins: r.coins, draws: r.draws, tieOut: JSON.stringify(r.tie), keys: Object.keys(r.tie),
        });
      }
      const missing = wanted.filter(w => !seen.has(w));
      if (missing.length) console.log(`  ${eraId ?? 'modern'} ${round} ${strengths.join('-')}: no seed in 4000 ended ${missing.join(', ')}`);
    }
  }
}
if (process.argv.includes('--check')) {
  const against = path.resolve(ROOT, arg('--against', 'scripts/data/worldTieGolden1347.json'));
  const kept = JSON.parse(fs.readFileSync(against, 'utf8')).cases;
  if (!Array.isArray(kept) || kept.length === 0) cannot(`${against} holds no cases`);
  const moved = [];
  for (let i = 0; i < Math.max(kept.length, cases.length); i += 1) {
    if (JSON.stringify(kept[i]) !== JSON.stringify(cases[i])) moved.push(kept[i]?.name ?? cases[i]?.name ?? `case ${i}`);
  }
  if (moved.length === 0) {
    console.log(`recordWorldTieGolden1347: SAME: ${cases.length} cases recorded from ${REF} equal the ${kept.length} of ${path.relative(ROOT, against) || against}`);
    process.exit(0);
  }
  console.log(`recordWorldTieGolden1347: DIFFERENT: ${moved.length} of ${kept.length} cases moved at ${REF} (${cases.length} recorded), first ${moved.slice(0, 3).join(' / ')}`);
  process.exit(1);
}
const golden = { what: 'Round 1347: knockout ties as the participant engine settles them, recorded by scripts/recordWorldTieGolden1347.mjs', ref: REF, cases };
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(golden, null, 1)}\n`);
console.log(`recordWorldTieGolden1347: ${cases.length} cases from ${REF} written to ${path.relative(ROOT, OUT) || OUT}`);
