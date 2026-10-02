/* Round 913: the shared training ground pays what it says, and never past
   potential.

   The four Soccer Career drills moved into src/components/career (one
   TrainingGround, four drills, a sport skin) and src/lib/careerTraining.ts
   holds the one rule: a session scores 0 to 100, 50 banks one, 80 banks two,
   one session a season. Soccer banks through its own engine; a single rating
   career (the four American careers, once a later round binds them) banks
   through bankTrainingRating, which goes through raiseWithinPotential.

   1. The rule is the engine's rule. For every score from -10 to 110 in
      quarter steps, for an outfielder and a keeper, for all four drills,
      trainingTier equals what Soccer Career's applyTrainingResult pays, the
      score it prints equals trainingScore, and the one session a season rule
      equals trainingAvailable before and after.
   2. The bank never passes potential. Every rating 40 to 99 against every
      potential 40 to 99 (old saves sit above potential too) against every
      score 0 to 100: the rating never drops, never ends past the higher of
      where it started and the ceiling, pays the whole tier when there is room
      and exactly the room when there is not, and never pays less for a
      better score. Walked cell by cell, not at the two ends.
   3. The words promise what the bank pays: the rule line and the three tier
      lines every single rating skin spreads, and the note a banked session
      ends on, which names the exact gain and owns up to the ceiling exactly
      when the ceiling cut it.
   4. Every skin, every position: at least two drills, no drill id twice,
      every word filled in, six different zone names, no dashes, every drill
      trains the Rating (the only thing the bank pays), the rule and tier lines
      are the shared ones, and the splits the brief names (windows only for the
      quarterback and the kicker, a goalie and a hitter save, a skater and a
      pitcher place, a DH takes no infield).
   5. Soccer still plays the way it did: src/test/careerTrainingGround.test.tsx
      replays the 41 runs recorded from origin/main a4433f41 before the drills
      moved, plus the American skins on the same ground.

   Sections 1 to 4 are exact (equalities over a full grid, no random draw), so
   they carry no bands. Measured on the shipped code: section 1 is 19,241
   checks and the engine first banks one at 50 and two at 80; section 2 walks
   363,600 cells, 180,000 of them under 50 (no gain), 89,031 paying the whole
   tier and 94,569 cut at the ceiling; section 3 is 43,211 checks; section 4
   is 29 positions and 97 drill tiles. Section 5 is a replay, also exact: 48
   tests, 43 of them the recording.

   Negative controls, CAREER_TRAINING_CONTROL=<name>. Each copies one file
   with one line changed (the line must be there exactly once, or it refuses
   to run and exits 2), swaps the copy in, and must turn its section red:
     tier      TRAINING_ELITE 80 to 85                 section 1
     overcap   the bank as Math.min(99, ovr + tier)    section 2
     promise   the +1 tier line says +2                section 3
     skinstat  the NFL 40 trains Speed                 section 4
     tell      the keeper's tell lasts 700ms not 650   section 5
     miss      the top row misses 20 percent not 12    section 5
     window    the first gate stays lit 1300ms         section 5
     slip      a cone slip costs 9 not 8               section 5
   A control run exits 0 only when its section went red and every other
   section it ran stayed green, 1 when it changed nothing, 2 when it could not
   run. Sections 1 to 4 run with no network: the bundle stubs the Supabase
   client, so nothing here can reach the live project.

   Run: node scripts/simCareerTraining.mjs */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const TMP = process.env.TEMP || process.env.TMP || os.tmpdir();
const RUN = `career-training-${process.pid}`;

const ZONE = 'src/components/career/drills/ZonePickDrill.tsx';
const CONTROLS = {
  tier: { section: 1, file: 'src/lib/careerTraining.ts', from: 'export const TRAINING_ELITE = 80;', to: 'export const TRAINING_ELITE = 85;' },
  overcap: { section: 2, file: 'src/lib/careerTraining.ts', from: 'const after = tier === 0 ? ovr : raiseWithinPotential(ovr, pot, tier);', to: 'const after = Math.min(99, ovr + tier);' },
  promise: { section: 3, file: 'src/lib/careerTraining.ts', from: 'tier === 1 ? `Solid work. +1 ${stat}, up to your ceiling` :', to: 'tier === 1 ? `Solid work. +2 ${stat}, up to your ceiling` :' },
  skinstat: { section: 4, file: 'src/lib/nflCareerTraining.ts', from: "name: 'The 40', stat: RATING_STAT,", to: "name: 'The 40', stat: 'Speed'," },
  tell: { section: 5, file: ZONE, from: '}, 650);', to: '}, 700);', breaks: 'keeper tell tell tell tell tell seed 31' },
  miss: { section: 5, file: ZONE, from: 'Math.random() < 0.12', to: 'Math.random() < 0.2', breaks: 'pens 01202 seed 3 ST' },
  window: { section: 5, file: 'src/components/career/drills/GateTapDrill.tsx', from: 'Math.max(650, 1400 - n * 100)', to: 'Math.max(650, 1300 - n * 100)', breaks: 'gates tttttttt seed 46 ST' },
  slip: { section: 5, file: 'src/components/career/drills/ConeRunDrill.tsx', from: 'mistakes * 8', to: 'mistakes * 9', breaks: 'cones five slips ST' },
};
const CONTROL = process.env.CAREER_TRAINING_CONTROL || '';
const control = CONTROLS[CONTROL];
if (CONTROL && !control) {
  console.error(`unknown control ${CONTROL} (known: ${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}

/* The control's copy: the file with its one line changed. Line endings are
   normalised first, so a CRLF checkout matches the same anchor an LF one does. */
let swap = null;
if (control) {
  const src = fs.readFileSync(path.join(ROOT, control.file), 'utf8').replace(/\r\n/g, '\n');
  const n = src.split(control.from).length - 1;
  if (n !== 1) {
    console.error(`control ${CONTROL}: its line is in ${control.file} ${n} times, not once, so it would prove nothing`);
    process.exit(2);
  }
  const changed = src.replace(control.from, control.to);
  /* section 5 runs under vitest, which serves files from inside the project */
  const dir = control.section === 5 ? path.join(ROOT, '.sim-control', RUN) : path.join(TMP, RUN);
  fs.mkdirSync(dir, { recursive: true });
  const copy = path.join(dir, path.basename(control.file));
  fs.writeFileSync(copy, changed);
  swap = { spec: '@/' + control.file.replace(/^src\//, '').replace(/\.tsx?$/, ''), copy, dir };
}
const cleanUp = () => { if (swap) fs.rmSync(swap.dir, { recursive: true, force: true }); };

/* Sections 1 to 4 bundle the real libraries. The Supabase client is replaced
   by a stub that throws if anything touches it, so this harness cannot reach
   the live project whatever the import chain does. */
const ENTRY = path.join(TMP, `${RUN}-entry.mjs`);
const OUT = path.join(TMP, `${RUN}-bundle.mjs`);
fs.writeFileSync(ENTRY, [
  "export * as rule from '@/lib/careerTraining';",
  "export * as soccer from '@/lib/soccerCareerEngine';",
  "export * as nfl from '@/lib/nflCareerTraining';",
  "export * as nba from '@/lib/nbaCareerTraining';",
  "export * as mlb from '@/lib/mlbCareerTraining';",
  "export * as nhl from '@/lib/nhlCareerTraining';",
].join('\n'));
const offlineAndSwap = {
  name: 'offline-and-swap',
  setup(b) {
    b.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'supabase-client', namespace: 'offline' }));
    b.onLoad({ filter: /.*/, namespace: 'offline' }, () => ({
      loader: 'js',
      contents: [
        "const offline = () => { throw new Error('simCareerTraining runs offline'); };",
        "export const SUPABASE_URL = 'http://offline.invalid';",
        "export const SUPABASE_PUBLISHABLE_KEY = 'offline';",
        'export const supabase = new Proxy({}, { get: offline });',
      ].join('\n'),
    }));
    b.onResolve({ filter: /^@\// }, async args => {
      if (swap && control.section < 5 && args.path === swap.spec) return { path: swap.copy };
      const r = await b.resolve('./' + args.path.slice(2), { resolveDir: path.join(ROOT, 'src'), kind: args.kind });
      return r.errors.length ? { errors: r.errors } : { path: r.path, external: r.external };
    });
  },
};
let lib;
try {
  await build({
    entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT,
    logLevel: 'error', absWorkingDir: ROOT, plugins: [offlineAndSwap],
    banner: { js: 'globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };' },
  });
  lib = await import(pathToFileURL(OUT).href);
} catch (e) {
  console.error('could not bundle the libraries: ' + (e?.message ?? e));
  cleanUp();
  process.exit(2);
} finally {
  fs.rmSync(OUT, { force: true });
  fs.rmSync(ENTRY, { force: true });
}
const { rule, soccer } = lib;
for (const [name, fn] of Object.entries({
  trainingTier: rule.trainingTier, trainingScore: rule.trainingScore, trainingSessionOpen: rule.trainingSessionOpen,
  bankTrainingRating: rule.bankTrainingRating, trainingBankNote: rule.trainingBankNote,
  applyTrainingResult: soccer.applyTrainingResult, trainingAvailable: soccer.trainingAvailable,
})) {
  if (typeof fn !== 'function') { console.error(`${name} is missing from the bundle, so nothing below would measure anything`); cleanUp(); process.exit(2); }
}

let section = 0;
const red = new Set();
const checks = [0, 0, 0, 0, 0, 0];
const shown = [0, 0, 0, 0, 0, 0];
const fail = msg => {
  red.add(section);
  if (shown[section]++ < 6) console.error(`  FAIL: ${msg}`);
};
/* msg may be a function, so the hot loops build no string unless one fails */
const check = (ok, msg) => { checks[section] += 1; if (!ok) fail(typeof msg === 'function' ? msg() : msg); };

/* ── 1. the rule is the engine's rule ── */
section = 1;
console.log('1) trainingTier equals what Soccer Career pays, every score from -10 to 110 in quarter steps');
{
  const DRILLS = ['dribbling', 'pace', 'shooting', 'passing'];
  const career = position => ({
    position, overall: 70, potential: 80, potentialEarned: 0, phase: 'season',
    seasons: [{ year: 2031 }], trainingSeasonYear: 2030,
    statBoostNextSeason: {}, morale: 50, events: [],
  });
  const firstPaid = { 1: Infinity, 2: Infinity };
  for (const position of ['ST', 'GK']) {
    for (const drill of DRILLS) {
      for (let q = -40; q <= 440; q++) {
        const score = q / 4;
        const before = career(position);
        const after = soccer.applyTrainingResult(before, drill, score);
        const paid = Object.values(after.statBoostNextSeason).reduce((a, b) => a + (b || 0), 0);
        const tier = rule.trainingTier(score);
        check(paid === tier, () => `${position} ${drill} at ${score}: the engine paid ${paid}, the rule says ${tier}`);
        const line = after.events[after.events.length - 1] || '';
        check(line.includes(`${rule.trainingScore(score)}/100`), () => `${position} ${drill} at ${score}: the engine wrote "${line}", the rule scores it ${rule.trainingScore(score)}`);
        check(rule.trainingSessionOpen(before.trainingSeasonYear, 2031) === soccer.trainingAvailable(before), () => `${position} ${drill}: the session was open to one rule and shut to the other before training`);
        check(rule.trainingSessionOpen(after.trainingSeasonYear, 2031) === soccer.trainingAvailable(after) && !soccer.trainingAvailable(after), () => `${position} ${drill}: the session was still open after training`);
        check(soccer.applyTrainingResult(after, drill, 100) === after, () => `${position} ${drill}: a second session in one season changed something`);
        if (Number.isInteger(score)) for (const t of [1, 2]) if (paid >= t) firstPaid[t] = Math.min(firstPaid[t], score);
      }
    }
  }
  /* where the engine itself starts paying, read off the engine, not the rule */
  const one = firstPaid[1];
  const two = firstPaid[2];
  check(one === rule.TRAINING_SOLID && two === rule.TRAINING_ELITE, `the engine first banks one at ${one} and two at ${two}, the rule says ${rule.TRAINING_SOLID} and ${rule.TRAINING_ELITE}`);
  console.log(`   ${checks[1]} checks, 2 positions x 4 drills x 481 scores; one banks from ${one}, two from ${two}`);
}

/* ── 2. the bank never passes potential ── */
section = 2;
console.log('2) bankTrainingRating, every rating 40 to 99 against every potential 40 to 99, every score 0 to 100');
let cells = 0;
let cut = 0;
let whole = 0;
{
  for (let ovr = 40; ovr <= 99; ovr++) {
    for (let pot = 40; pot <= 99; pot++) {
      const cap = Math.min(99, pot);
      let last = -1;
      for (let score = 0; score <= 100; score++) {
        cells += 1;
        const b = rule.bankTrainingRating(ovr, pot, score);
        const tier = rule.trainingTier(score);
        const want = ovr >= cap ? ovr : Math.min(cap, ovr + tier);
        check(b.tier === tier, () => `${ovr}/${pot} at ${score}: banked tier ${b.tier}, the rule says ${tier}`);
        check(b.ovr >= ovr, () => `${ovr}/${pot} at ${score}: the rating dropped to ${b.ovr}`);
        check(b.ovr <= Math.max(ovr, cap), () => `${ovr}/${pot} at ${score}: the rating went to ${b.ovr}, past the ceiling ${cap}`);
        check(b.ovr === want, () => `${ovr}/${pot} at ${score}: the rating went to ${b.ovr}, it should be ${want}`);
        check(b.gain === b.ovr - ovr && b.gain <= tier, () => `${ovr}/${pot} at ${score}: gain ${b.gain} for a move of ${b.ovr - ovr} on tier ${tier}`);
        check(b.ovr >= last, () => `${ovr}/${pot}: score ${score} paid less than score ${score - 1}`);
        last = b.ovr;
        if (tier > 0 && b.gain < tier) cut += 1;
        if (tier > 0 && b.gain === tier) whole += 1;
      }
    }
  }
  console.log(`   ${cells} cells: ${whole} paid the whole tier, ${cut} were cut at the ceiling`);
}

/* ── 3. the words promise what the bank pays ── */
section = 3;
console.log('3) the rule line, the tier lines and the banked note against the bank');
{
  const { RATING_TRAINING, RATING_STAT } = rule;
  const r = RATING_TRAINING.rule;
  for (const bit of ['One session a season', '50', '80', '+1', '+2', 'ceiling']) check(r.includes(bit), `the rule line lost "${bit}": ${r}`);
  for (const tier of [0, 1, 2]) {
    const line = RATING_TRAINING.tierLine(tier, RATING_STAT);
    const promised = (line.match(/\+(\d+)/g) || []).map(s => Number(s.slice(1)));
    check(tier === 0 ? promised.length === 0 : promised.length === 1 && promised[0] === tier, `tier ${tier} says "${line}"`);
    if (tier > 0) check(line.includes('ceiling'), `tier ${tier} hides the ceiling: "${line}"`);
  }
  for (let ovr = 40; ovr <= 99; ovr += 1) {
    for (let pot = 40; pot <= 99; pot += 1) {
      for (const score of [0, 49, 50, 79, 80, 100]) {
        const b = rule.bankTrainingRating(ovr, pot, score);
        const note = rule.trainingBankNote(b);
        const said = (note.match(/\+(\d+)/) || [])[1];
        check(b.gain > 0 ? Number(said) === b.gain : said === undefined, () => `${ovr}/${pot} at ${score}: gained ${b.gain}, the note says "${note}"`);
        check(note.includes('ceiling') === (b.tier > 0 && b.gain < b.tier), () => `${ovr}/${pot} at ${score}: tier ${b.tier} gain ${b.gain}, the note says "${note}"`);
      }
    }
  }
  console.log(`   ${checks[3]} checks`);
}

/* ── 4. every skin, every position ── */
section = 4;
console.log('4) the NFL, NBA, MLB and NHL skins, every position');
{
  const { RATING_TRAINING, RATING_STAT } = rule;
  const DASH = new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']'); /* the two dashes, written as char codes so this file holds none */
  const WORDS = {
    cones: ['unit', 'slips', 'how', 'surface'],
    burst: ['unit', 'startEmoji', 'startTitle', 'startHint', 'runEmoji', 'go', 'stop'],
    zones: ['unit', 'tally', 'how', 'verb', 'ball', 'glove', 'surface'],
    pick: ['made', 'stopped', 'over'],
    save: ['tell', 'shot', 'saved', 'beaten'],
    gates: ['unit', 'tally', 'how', 'startEmoji', 'startTitle', 'startHint', 'lit', 'surface'],
  };
  const SPORTS = [
    ['NFL', lib.nfl.NFL_TRAINING_POSITIONS, lib.nfl.nflTraining],
    ['NBA', lib.nba.NBA_TRAINING_POSITIONS, lib.nba.nbaTraining],
    ['MLB', lib.mlb.MLB_TRAINING_POSITIONS, lib.mlb.mlbTraining],
    ['NHL', lib.nhl.NHL_TRAINING_POSITIONS, lib.nhl.nhlTraining],
  ];
  const modes = {};
  let positions = 0;
  let drills = 0;
  for (const [sport, list, skinFor] of SPORTS) {
    check(Array.isArray(list) && list.length > 0, `${sport} lists no positions`);
    for (const pos of list || []) {
      positions += 1;
      const s = skinFor(pos);
      const at = `${sport} ${pos}`;
      check(s.rule === RATING_TRAINING.rule && s.tierLine === RATING_TRAINING.tierLine, `${at}: the rule or tier lines are not the shared ones the bank answers to`);
      for (const k of ['title', 'label', 'scoreLabel', 'bank', 'done']) check(typeof s[k] === 'string' && s[k].trim() !== '', `${at}: ${k} is empty`);
      for (const k of ['emoji', 'title', 'body']) check(typeof s.shut?.[k] === 'string' && s.shut[k].trim() !== '', `${at}: shut.${k} is empty`);
      check(s.drills.length >= 2, `${at}: ${s.drills.length} drills`);
      check(new Set(s.drills.map(d => d.id)).size === s.drills.length, `${at}: a drill id twice`);
      for (const d of s.drills) {
        drills += 1;
        check(d.stat === RATING_STAT, `${at} ${d.name}: trains "${d.stat}", the bank only pays the ${RATING_STAT}`);
        check(['cones', 'burst', 'zones', 'gates'].includes(d.kind), `${at} ${d.name}: unknown kind ${d.kind}`);
        const need = ['id', 'emoji', 'name', ...(WORDS[d.kind] || []), ...(d.kind === 'zones' ? WORDS[d.mode] || ['mode'] : [])];
        for (const k of need) check(typeof d[k] === 'string' && d[k].trim() !== '', `${at} ${d.name}: ${k} is empty`);
        if (d.kind === 'zones') {
          check(Array.isArray(d.zones) && d.zones.length === 6 && new Set(d.zones).size === 6, `${at} ${d.name}: the six zone names are not six different names`);
          check(d.frame === 'goal' || d.frame === 'box', `${at} ${d.name}: frame ${d.frame}`);
          modes[`${sport} ${pos}`] = d.mode;
        }
      }
      const text = JSON.stringify(s) + s.tierLine(2, RATING_STAT) + s.tierLine(1, RATING_STAT) + s.tierLine(0, RATING_STAT);
      check(!DASH.test(text), `${at}: a dash in the copy`);
      if (s.note) check(/^[a-z]+$/.test(s.note.marker) && s.note.text.trim() !== '', `${at}: the note is malformed`);
    }
  }
  /* the splits the brief names */
  const nflWindows = lib.nfl.NFL_TRAINING_POSITIONS.filter(p => lib.nfl.nflTraining(p).drills.some(d => d.kind === 'zones'));
  check(nflWindows.join() === 'QB,K', `NFL accuracy windows are for ${nflWindows.join()}, the brief says QB and K`);
  check(!lib.nfl.nflTraining('K').drills.some(d => d.id === 'blitz'), 'the NFL kicker reads the blitz');
  check(modes['NHL G'] === 'save' && ['C', 'LW', 'RW', 'D'].every(p => modes[`NHL ${p}`] === 'pick'), 'NHL: a goalie must save and a skater shoot');
  check(['SP', 'RP'].every(p => modes[`MLB ${p}`] === 'pick'), 'MLB: a pitcher must pitch');
  check(lib.mlb.MLB_TRAINING_POSITIONS.filter(p => p !== 'SP' && p !== 'RP').every(p => modes[`MLB ${p}`] === 'save'), 'MLB: a hitter must read the pitch');
  check(!lib.mlb.mlbTraining('DH').drills.some(d => d.id === 'infield'), 'MLB: the DH takes infield');
  check(lib.nba.NBA_TRAINING_POSITIONS.every(p => lib.nba.nbaTraining(p).drills.length === 4), 'NBA: every position runs all four');
  console.log(`   ${positions} positions, ${drills} drill tiles, ${checks[4]} checks`);
}

/* ── 5. soccer plays the way it was recorded ── */
section = 5;
let namedMiss = false;
const runVitest = !control || control.section === 5;
if (!runVitest) {
  console.log(`5) not run under the ${CONTROL} control, which only touches section ${control.section}`);
} else {
  console.log('5) the recorded training ground replays, and the American skins play, under vitest');
  const vitest = path.join(path.dirname(require.resolve('vitest/package.json')), 'vitest.mjs');
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  delete env.RECORD_TRAINING_FIXTURE;
  if (swap) env.NO_DOUBLE_SWAP = JSON.stringify({ [swap.spec]: swap.copy.replaceAll('\\', '/') });
  const run = spawnSync(process.execPath, [vitest, 'run', 'src/test/careerTrainingGround.test.tsx', '--reporter=verbose'], { cwd: ROOT, env, encoding: 'utf8', timeout: 600000 });
  const out = `${run.stdout || ''}\n${run.stderr || ''}`;
  const passed = (out.match(/^\s*✓ .*$/gm) || []);
  const failed = (out.match(/^\s*× .*$/gm) || []);
  const replays = passed.filter(l => l.includes('the training ground plays the way it was recorded')).length;
  check(!run.error, `vitest did not run: ${run.error}`);
  check(out.includes('careerTrainingGround.test.tsx'), 'vitest never reached careerTrainingGround.test.tsx');
  check(run.status === 0 && failed.length === 0, `vitest exit ${run.status}, ${failed.length} failed: ${failed.slice(0, 3).map(l => l.trim()).join(' | ')}`);
  check(replays >= 43, `only ${replays} replays passed, the fixture holds 43`);
  /* a control must break the run it was written for, not just anything */
  if (control && !failed.some(l => l.includes(control.breaks))) {
    namedMiss = true;
    console.error(`  the ${CONTROL} control never broke "${control.breaks}"`);
  }
  if (red.has(5) && !control) console.error(out.slice(-3000));
  console.log(`   vitest exit ${run.status}: ${passed.length} passed (${replays} replays), ${failed.length} failed`);
}
cleanUp();

/* ── the verdict ── */
const total = checks.reduce((a, b) => a + b, 0);
if (control) {
  const others = [...red].filter(s => s !== control.section);
  if (red.has(control.section) && others.length === 0 && !namedMiss) {
    console.log(`simCareerTraining control ${CONTROL}: section ${control.section} went red as it must, every other section it ran stayed green (${total} checks)`);
    process.exit(0);
  }
  const why = !red.has(control.section) ? `section ${control.section} stayed green, so this control proves nothing`
    : namedMiss ? `it never broke "${control.breaks}", the run it was written for`
    : `it also turned section ${others.join(', ')} red`;
  console.error(`simCareerTraining control ${CONTROL}: ${why}`);
  process.exit(1);
}
if (red.size) {
  console.error(`simCareerTraining: FAILED in section ${[...red].join(', ')} (${total} checks)`);
  process.exit(1);
}
console.log(`simCareerTraining: all five sections green (${total} checks)`);
