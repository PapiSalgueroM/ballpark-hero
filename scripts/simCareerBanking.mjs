/**
 * Round 422 harness: a career banks what it earns.
 *
 * THE BUG THIS EXISTS FOR, reported by the owner playing /nfl-my-career:
 * "none of my money is going into my account. It just keeps going into the
 * negatives even when I am making 30 million dollars a year." He was right, and
 * all four My Career games had it. The yearly line subtracted living costs and
 * added nothing, and its `?? earnings * 0.45` fallback only fires while netWorth
 * is undefined, so after one season the balance could only ever fall. An
 * `if (upkeep > 0)` gate hid the other half: buy nothing, and the balance never
 * moved off the signing bonus no matter what you earned.
 *
 * WHY NOTHING CAUGHT IT, which is the more useful lesson. The money harnesses
 * that already existed touch netWorth constantly, but they INJECT a starting
 * balance (simMoney uses 50, simNflCareer uses 300) so they never exercise
 * accumulation at all, and simMoney's only assertion on the number is that it
 * must not fall below MINUS 3 million, which tolerates the bug outright. A check
 * that hands the game its money and then allows a negative answer cannot find a
 * game that never pays anyone.
 *
 * So this one starts a real career from its real signing bonus, plays it, and
 * asserts the OUTCOME: money must arrive, it must scale with what you earn, and
 * a player who never spends must never go backwards.
 *
 * NEGATIVE CONTROL: BANKING_CONTROL=nobank puts the pre 422 line back, income
 * never banked, and every section that matters must go red. The patch asserts
 * the line it replaces is present first, because a control that rewrites a
 * string the file does not contain changes nothing and is green for the wrong
 * reason.
 *
 * Run: node scripts/simCareerBanking.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.BANKING_CONTROL || '';
if (CONTROL && CONTROL !== 'nobank') {
  console.error(`BANKING_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const BANK_LINE = 'c.netWorth = Math.round((priorNet + c.salary * TAKE_HOME - upkeep) * 10) / 10;';
const NO_BANK = 'c.netWorth = Math.round((priorNet - upkeep) * 10) / 10;';

/* Each sport names its own entry points; the four files are deliberate
   near-copies rather than one shared engine, so the harness adapts instead of
   pretending they are identical. */
const SPORTS = [
  { id: 'nfl', file: 'nflMyCareer', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress' },
  { id: 'nba', file: 'nbaMyCareer', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress' },
  { id: 'mlb', file: 'mlbMyCareer', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress' },
  { id: 'nhl', file: 'nhlMyCareer', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress' },
];

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'careerbank-'));
const controlFiles = [];
const cleanup = () => {
  for (const f of controlFiles) { try { fs.rmSync(f, { force: true }); } catch { /* best effort */ } }
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
};
process.on('exit', cleanup);
function loadLib(file) {
  const src = path.join(ROOT, 'src/lib', `${file}.ts`);
  let entry = src;
  if (CONTROL === 'nobank') {
    const raw = fs.readFileSync(src, 'utf8');
    const norm = raw.split('\r\n').join('\n');
    if (!norm.includes(BANK_LINE)) {
      console.error(`control nobank: ${file}.ts does not contain the banking line, so this control would prove nothing`);
      process.exit(1);
    }
    /* The patched copy has to live BESIDE the original, because these files
       import siblings by relative path and a copy in the OS temp directory
       cannot resolve them. It is removed again below whatever happens. */
    entry = path.join(ROOT, 'src/lib', `__control_${file}.ts`);
    fs.writeFileSync(entry, norm.replace(BANK_LINE, NO_BANK));
    controlFiles.push(entry);
  }
  const out = path.join(tmpDir, `${file}.bundle.mjs`);
  execSync(`npx --no-install esbuild "${entry}" --bundle --format=esm --platform=node --alias:@=${ROOT}/src --outfile="${out}" --log-level=error`,
    { cwd: ROOT, shell: true });
  return import('file:///' + out.replace(/\\/g, '/'));
}

function mulberry(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Play one career from its real starting state. No injected balance. */
function playCareer(lib, sport, seed, years, salaryOverride) {
  const rng = mulberry(seed);
  const arch = lib[sport.arch];
  const posKeys = Object.keys(arch);
  const pos = posKeys.includes('QB') ? 'QB' : posKeys[0];
  const c = lib[sport.start]('Ledger Man', pos, arch[pos][0], rng);
  const startNet = c.netWorth ?? 0;
  const trail = [];
  for (let y = 0; y < years; y += 1) {
    if (salaryOverride) c.salary = salaryOverride;
    lib[sport.season](c, 0.65, rng);
    if (salaryOverride) c.salary = salaryOverride;
    lib[sport.progress](c, rng);
    trail.push(c.netWorth ?? 0);
    if (c.retired) break;
  }
  return { c, startNet, trail };
}

if (CONTROL === 'nobank') {
  console.log('   NEGATIVE CONTROL ON: the pre 422 line is back, income is never banked');
}

console.log('1) money arrives: a played career ends richer than it started');
const played = {};
for (const s of SPORTS) {
  const lib = await loadLib(s.file);
  const r = playCareer(lib, s, 99, 12);
  played[s.id] = { lib, ...r };
  const end = r.c.netWorth ?? 0;
  if (!Number.isFinite(end)) { fail(`${s.id}: net worth is ${end}`); continue; }
  if (end <= r.startNet) {
    fail(`${s.id}: started on ${r.startNet}m and finished on ${end}m after earning ${Math.round(r.c.earnings)}m, so the pay never reached the bank`);
  }
  console.log(`   ${s.id}: earned ${String(Math.round(r.c.earnings)).padStart(4)}m, banked ${String(end).padStart(7)}m`);
}

console.log('2) a player who never spends never goes backwards');
for (const s of SPORTS) {
  const { trail, c } = played[s.id];
  if ((c.yearlyCosts ?? 0) > 0) continue; // bought nothing in this harness, but do not assume
  let drops = 0;
  for (let i = 1; i < trail.length; i += 1) if (trail[i] < trail[i - 1]) drops += 1;
  if (drops > 0) fail(`${s.id}: the balance fell in ${drops} of ${trail.length - 1} seasons despite no spending`);
  if (trail.some(v => v < 0)) fail(`${s.id}: the balance went negative while earning and never spending`);
}
console.log(`   ${SPORTS.length} careers walked season by season, no unexplained falls`);

console.log("3) the owner's case: 30m a year with upkeep running must build a fortune");
for (const s of SPORTS) {
  const lib = played[s.id].lib;
  const rng = mulberry(7);
  const arch = lib[s.arch];
  const posKeys = Object.keys(arch);
  const pos = posKeys.includes('QB') ? 'QB' : posKeys[0];
  const c = lib[s.start]('Rich Man', pos, arch[pos][0], rng);
  c.yearlyCosts = 2.5;
  for (let y = 0; y < 8; y += 1) { c.salary = 30; lib[s.season](c, 0.7, rng); c.salary = 30; lib[s.progress](c, rng); }
  const end = c.netWorth ?? 0;
  /* 30m at the file's own 0.45 take home is 13.5m a year, less 2.5m upkeep, so
     8 seasons cannot honestly land under 50m. The floor is deliberately well
     below the arithmetic rather than equal to it, because seasons can be cut
     short and the point of the check is the SIGN and the SCALE, not a decimal. */
  if (end < 50) fail(`${s.id}: 8 years at 30m with 2.5m upkeep ended on ${end}m, which is not banking the pay`);
  console.log(`   ${s.id}: 8 years at 30m -> ${end}m banked`);
}

console.log('4) what you bank scales with what you earn');
for (const s of SPORTS) {
  const lib = played[s.id].lib;
  const poor = playCareer(lib, s, 21, 8, 2).c.netWorth ?? 0;
  const rich = playCareer(lib, s, 21, 8, 25).c.netWorth ?? 0;
  if (!(rich > poor * 3)) {
    fail(`${s.id}: 25m a year banked ${rich}m against ${poor}m on 2m a year, so pay barely moves the balance`);
  }
  console.log(`   ${s.id}: 2m/yr -> ${poor}m, 25m/yr -> ${rich}m`);
}

console.log('5) the repair rebuilds a broken save and leaves a healthy one alone');
for (const s of SPORTS) {
  const lib = played[s.id].lib;
  const costOf = () => 0;
  const broken = lib.repairNetWorth({ netWorth: -40, earnings: 200, purchased: [] }, costOf);
  if ((broken.netWorth ?? 0) <= 0) fail(`${s.id}: a save stuck at -40m with 200m earned was not repaired`);
  const healthy = lib.repairNetWorth({ netWorth: 12.5, earnings: 200, purchased: [] }, costOf);
  if (healthy.netWorth !== 12.5) fail(`${s.id}: a healthy save was rewritten from 12.5m to ${healthy.netWorth}m`);
  const spent = lib.repairNetWorth({ netWorth: -1, earnings: 100, purchased: ['a', 'b'] }, () => 5);
  if ((spent.netWorth ?? 0) !== Math.round((100 * 0.45 - 10) * 10) / 10) {
    fail(`${s.id}: the repair did not subtract what the player actually bought, got ${spent.netWorth}m`);
  }
}
console.log(`   ${SPORTS.length} repairs checked: broken rebuilt, healthy untouched, purchases deducted`);

cleanup();
console.log('');

if (CONTROL === 'nobank') {
  if (failures > 0) {
    console.log(`simCareerBanking control: green. The unbanked pay was reported (${failures} finding${failures === 1 ? '' : 's'}), so this harness works.`);
    process.exit(0);
  }
  console.error('simCareerBanking control: RED. Income never reached the bank and nothing failed, so this harness proves nothing.');
  process.exit(1);
}
if (failures > 0) {
  console.error(`simCareerBanking: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simCareerBanking: green. Every career banks its pay, scales with it, and a broken save is repaired.');
