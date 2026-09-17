/**
 * Round 621: the four my career games adopt careerEngine.ts, and nothing about
 * any of them changes.
 *
 * Round 620 deferred this on the grounds that "the gates cannot tell a silent
 * behaviour change from a correct one". This harness is that gate. It does not
 * compare against a recorded number, which would only prove the number was
 * copied down correctly; it bundles the PRE MIGRATION source straight out of
 * git beside the migrated source and runs both through the identical seeded
 * career, then diffs the whole state. If one draw of the rng moved, this goes
 * red.
 *
 * WHAT THE MIGRATION ACTUALLY WAS, because the scope changed once it was
 * measured. Round 620 recorded that the four games are "about two thirds of
 * 3,900 lines being one idea written four times". The 25 shared symbol NAMES
 * are real; the shared code is not. Measured over the eleven common functions
 * whose bodies can be compared: two identical in all four (repairNetWorth,
 * eraById), one identical in three (rollTeamQuality, where the NFL differs by
 * five numbers), and eight genuinely different per sport. The heavy machinery
 * was already shared, through careerVariance, careerAwards, careerRival,
 * usCareerFreeAgency, usCareerExtension, usCareerPress, careerMoney,
 * careerInbox and careerRivalryEvents. So this is one small round rather than
 * the four large ones 621 to 624 were scoped as.
 *
 * SECTIONS
 *   1. The three lifted functions, driven directly, old against new.
 *   2. Whole careers to retirement, old against new, every field.
 *   3. The duplication really is gone from the four files.
 *
 * CONTROL
 *   ENGINE_PARITY_CONTROL=drift   moves one number in the migrated NFL band,
 *                                 which must make sections 1 and 2 diverge.
 *                                 Without a control this harness could pass by
 *                                 comparing a file with itself.
 *
 * Run: node scripts/simCareerEngineParity.mjs
 */
import './lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.ENGINE_PARITY_CONTROL || '';
let failures = 0;
const fail = (m) => { failures += 1; console.log(`   FAIL ${m}`); };
const ok = (m) => console.log(`   ok   ${m}`);

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'engineparity-'));

/* The pre migration file has to come from git rather than from a copy kept
   beside it, or the baseline drifts the first time somebody edits the copy. */
const BASE = process.env.PARITY_BASE || 'HEAD';
const SPORTS = [
  { k: 'nfl', file: 'nflMyCareer', arch: 'ARCHETYPES', start: 'startCareer', sim: 'simSeason', prog: 'progress', retire: 'shouldRetire', roll: 'rollTeamQuality', market: 'marketSalary', era: 'nflEraById', eras: 'NFL_ERAS' },
  { k: 'nba', file: 'nbaMyCareer', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', sim: 'simNbaSeason', prog: 'nbaProgress', retire: 'nbaShouldRetire', roll: 'nbaRollTeamQuality', market: 'nbaMarketSalary', era: 'nbaEraById', eras: 'NBA_ERAS' },
  { k: 'mlb', file: 'mlbMyCareer', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', sim: 'simMlbSeason', prog: 'mlbProgress', retire: 'mlbShouldRetire', roll: 'mlbRollTeamQuality', market: 'mlbMarketSalary', era: 'mlbEraById', eras: 'MLB_ERAS' },
  { k: 'nhl', file: 'nhlMyCareer', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', sim: 'simNhlSeason', prog: 'nhlProgress', retire: 'nhlShouldRetire', roll: 'nhlRollTeamQuality', market: 'nhlMarketSalary', era: 'nhlEraById', eras: 'NHL_ERAS' },
];

/* A sibling import written './x' cannot resolve from a temp folder, so it is
   rewritten to the alias the bundler already understands and every dependency
   keeps coming from the real src. */
const reAlias = (s) => s.replace(/from '\.\/([A-Za-z0-9_]+)'/g, "from '@/lib/$1'");

const entryLines = [];
for (const sp of SPORTS) {
  let oldSrc;
  try {
    oldSrc = execSync(`git show ${BASE}:src/lib/${sp.file}.ts`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch {
    console.log(`   FAIL could not read src/lib/${sp.file}.ts out of ${BASE}, so there is no baseline to compare against`);
    process.exit(1);
  }
  if (oldSrc.includes("from './careerEngine'")) {
    console.log(`   FAIL the ${BASE} copy of ${sp.file}.ts already imports careerEngine, so it is not a pre migration baseline`);
    process.exit(1);
  }
  let newSrc = fs.readFileSync(path.join(ROOT, 'src/lib', `${sp.file}.ts`), 'utf8');
  if (!newSrc.includes("from './careerEngine'")) {
    console.log(`   FAIL src/lib/${sp.file}.ts does not import careerEngine, so nothing was migrated`);
    process.exit(1);
  }
  if (CONTROL === 'drift' && sp.k === 'nfl') {
    const anchor = 'const NFL_TEAM_QUALITY: TeamQualityBand = { base: 68, span: 22, drift: 7, min: 62, max: 94 };';
    if (!newSrc.includes(anchor)) {
      console.log('   FAIL control drift anchor is not in the source, so it would change nothing');
      process.exit(1);
    }
    newSrc = newSrc.replace(anchor, 'const NFL_TEAM_QUALITY: TeamQualityBand = { base: 68, span: 22, drift: 8, min: 62, max: 94 };');
    console.log('   [control drift applied to the migrated NFL band]');
  }
  fs.writeFileSync(path.join(TMP, `old_${sp.k}.ts`), reAlias(oldSrc));
  fs.writeFileSync(path.join(TMP, `new_${sp.k}.ts`), reAlias(newSrc));
  entryLines.push(`export * as ${sp.k}Old from './old_${sp.k}';`);
  entryLines.push(`export * as ${sp.k}New from './new_${sp.k}';`);
}
const ENTRY = path.join(TMP, 'entry.ts');
fs.writeFileSync(ENTRY, entryLines.join('\n') + '\n');
const BUNDLE = path.join(TMP, 'bundle.mjs');
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const B = await import(pathToFileURL(BUNDLE).href);

/* The harness's own generator, so both sides are driven by the identical
   stream and neither can touch Math.random. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- 1. The three lifted functions, driven directly ---------- */
console.log('1) the lifted functions answer exactly as they did');
{
  let checks = 0;
  for (const sp of SPORTS) {
    const O = B[`${sp.k}Old`];
    const N = B[`${sp.k}New`];

    /* rollTeamQuality: the opening draw and a long chain of drifts, on one
       seed each so the two sides consume the stream identically. */
    for (let seed = 1; seed <= 40; seed += 1) {
      const ro = mulberry32(seed);
      const rn = mulberry32(seed);
      let qo = null;
      let qn = null;
      for (let i = 0; i < 25; i += 1) {
        qo = O[sp.roll](qo, ro);
        qn = N[sp.roll](qn, rn);
        checks += 1;
        if (qo !== qn) { fail(`${sp.k}: team quality diverged at seed ${seed} step ${i}: ${qo} against ${qn}`); i = 99; seed = 999; }
      }
    }

    /* eraById: every real id, plus the two a damaged save produces. */
    for (const e of [...O[sp.eras].map(x => x.id), undefined, 'no-such-era']) {
      checks += 1;
      if (JSON.stringify(O[sp.era](e)) !== JSON.stringify(N[sp.era](e))) fail(`${sp.k}: eraById disagreed on ${String(e)}`);
    }

    /* repairNetWorth: the untouched case, the missing case and the negative
       case, which is the only one that rebuilds. */
    const costOf = (id) => ({ a: 1.5, b: 10, c: 0.25 })[id] ?? 0;
    for (const c of [
      { earnings: 100, netWorth: 12, purchased: ['a'] },
      { earnings: 100, purchased: ['a', 'b'] },
      { earnings: 100, netWorth: -4, purchased: ['a', 'b', 'c'] },
      { earnings: 0, netWorth: -1, purchased: [] },
      { earnings: 3.7, netWorth: -0.01 },
    ]) {
      checks += 1;
      const a = JSON.stringify(O.repairNetWorth(c, costOf));
      const b2 = JSON.stringify(N.repairNetWorth(c, costOf));
      if (a !== b2) fail(`${sp.k}: repairNetWorth disagreed on ${JSON.stringify(c)}: ${a} against ${b2}`);
    }
  }
  if (checks < 4000) fail(`only ${checks} direct comparisons ran, so this section barely tested anything`);
  else ok(`${checks} direct comparisons across four sports, all identical`);
}

/* ---------- 2. Whole careers, old against new ---------- */
console.log('2) whole careers to retirement are identical, field by field');
{
  const runCareer = (M, sp, seed) => {
    const rng = mulberry32(seed);
    const positions = Object.keys(M[sp.arch]);
    const pos = positions[seed % positions.length];
    const list = M[sp.arch][pos];
    const arch = list[seed % list.length];
    const c = sp.k === 'nfl'
      ? M[sp.start](`Parity ${seed}`, pos, arch, rng, null)
      : M[sp.start](`Parity ${seed}`, pos, arch, rng, null, 'now');
    let tq = null;
    for (let yr = 0; yr < 25 && !c.retired; yr += 1) {
      if (c.contractYears <= 0) { c.salary = M[sp.market](c); c.contractYears = 3; }
      tq = M[sp.roll](tq, rng);
      M[sp.sim](c, tq, rng);
      M[sp.prog](c, rng);
      if (M[sp.retire](c)) c.retired = true;
    }
    return c;
  };
  let careers = 0;
  let seasons = 0;
  let divergedTotal = 0;
  for (const sp of SPORTS) {
    let diverged = 0;
    for (let seed = 1; seed <= 30; seed += 1) {
      const a = runCareer(B[`${sp.k}Old`], sp, seed);
      const b2 = runCareer(B[`${sp.k}New`], sp, seed);
      careers += 1;
      seasons += (a.seasons ?? []).length;
      if (JSON.stringify(a) !== JSON.stringify(b2)) {
        diverged += 1;
        if (diverged === 1) {
          /* Name the first field that moved rather than printing two career
             objects at each other. */
          const ka = Object.keys(a);
          const moved = ka.filter(k2 => JSON.stringify(a[k2]) !== JSON.stringify(b2[k2]));
          fail(`${sp.k}: seed ${seed} diverged on ${moved.slice(0, 6).join(', ')}${moved.length > 6 ? ` and ${moved.length - 6} more` : ''}`);
        }
      }
    }
    divergedTotal += diverged;
    if (diverged > 1) fail(`${sp.k}: ${diverged} of 30 careers diverged`);
  }
  /* A career that retires on season one would make this vacuous. */
  if (seasons < 400) {
    fail(`only ${seasons} seasons were simulated across ${careers} careers, so the comparison is too thin to mean much`);
  } else if (!divergedTotal) {
    /* Only when nothing moved. An earlier version printed this line
       unconditionally, so a control run reported the careers as byte identical
       on the same screen as the failures saying they were not. */
    ok(`${careers} careers and ${seasons} seasons, byte identical between the old and migrated engines`);
  }
}

/* ---------- 3. The duplication is actually gone ---------- */
console.log('3) the four files no longer carry their own copies');
{
  /* Its own counter, not the global one: reading `failures` here meant this
     section stayed silent whenever an EARLIER section had failed, which is
     exactly when somebody needs to know whether the files are in order. */
  const before = failures;
  for (const sp of SPORTS) {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib', `${sp.file}.ts`), 'utf8');
    if (/const TAKE_HOME = 0\.45;/.test(src)) fail(`${sp.file}.ts still declares its own TAKE_HOME`);
    if (/export function repairNetWorth</.test(src)) fail(`${sp.file}.ts still declares its own repairNetWorth`);
    if (!src.includes("from './careerEngine'")) fail(`${sp.file}.ts does not import careerEngine`);
    /* The roll must be a call into the shared one, not a reimplementation that
       happens to sit next to the import. */
    if (!/rollTeamQualityShared\(prev, rng,/.test(src)) fail(`${sp.file}.ts does not call the shared team quality roll`);
    if (!/eraByIdShared\(/.test(src)) fail(`${sp.file}.ts does not call the shared era lookup`);
  }
  const engine = fs.readFileSync(path.join(ROOT, 'src/lib/careerEngine.ts'), 'utf8');
  for (const name of ['TAKE_HOME', 'repairNetWorth', 'rollTeamQuality', 'eraById']) {
    if (!new RegExp(`export (?:function|const) ${name}\\b`).test(engine)) fail(`careerEngine.ts does not export ${name}`);
  }
  if (failures === before) ok('all four sports read the shared engine and none keeps a copy');
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(failures ? `\n${failures} failure(s)` : '\nall sections green');
process.exit(failures ? 1 : 0);
