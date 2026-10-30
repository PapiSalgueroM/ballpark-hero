/* Review probe (never committed, runner only, run from the repo root): simCmDailyView holds the setup, the opening
   run and the FIRST action of each daily to the base. This plays each early date to its end:
   Deadline Day talks, a bid at the ask, terms at what he wants and the end of the day for up to three targets, and
   its grade; Hot Seat every press answer and every match to the verdict, and the carry on summary.
   Arms (all on this tree's code): A the curve 1 world rebuilt (no stamp, the view's ages), F the files as shipped
   with the view, M F with every Deadline Day and Hot Seat stretch after the start losing its date (the mutation
   "a later action forgets the day"). Prints how many early dates differ A vs F (the view is complete) and F vs M
   (whether the later stretches' dates matter at all). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const { unflippedSquads, unstampedLeague, unstampedFreeAgents, isStamped } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/cmSquadAges.mjs')).href);
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n');
const HOT = 'src/lib/managerHotSeat.ts', DD = 'src/lib/deadlineDay.ts';
const SRC = { [HOT]: read(HOT), [DD]: read(DD) };
const M = { ...SRC };
let n = 0;
M[DD] = M[DD].replace(/onStaticWorldOn\((prev|run)\.setup\.daily, /g, () => { n += 1; return 'onStaticWorldOn(undefined, '; });
M[HOT] = M[HOT].replace(/, (prev|run)\.setup\.daily\)/g, () => { n += 1; return ', undefined)'; });
console.log(`arm M: ${n} later stretches lose their date`);
if (n < 8) { console.log('deepDaily: ABORTED, the mutation found too few stretches'); process.exit(2); }
const CUTOVER = /export const CM_DAILY_NEW_NUMBERS_FROM = '(\d{4}-\d{2}-\d{2})';/.exec(SRC[HOT])[1];
const SHIPPED = read('src/data/clubManagerRosters.ts');
if (!isStamped(SHIPPED)) { console.log('deepDaily: ABORTED, the file is not flipped'); process.exit(2); }
const LEAGUES = { aleague: read('src/data/clubManagerALeague2026.ts'), russia: read('src/data/clubManagerRussia2026.ts'), fa: read('src/data/clubManagerFreeAgents2026.ts') };
const CURVE1_LEAGUES = { aleague: unstampedLeague(LEAGUES.aleague), russia: unstampedLeague(LEAGUES.russia), fa: unstampedFreeAgents(LEAGUES.fa) };
const SQUADS1 = unflippedSquads(SHIPPED, read('src/data/clubManagerCurve1View.ts')).text;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'deepdaily-'));
async function bundle(name, src, squads, leagues) {
  const outfile = path.join(TMP, `${name}.cjs`);
  await build({
    stdin: { contents: "export * as cm from '@/lib/clubManager'; export * as hs from '@/lib/managerHotSeat'; export * as dd from '@/lib/deadlineDay';", resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'cjs', platform: 'node', outfile, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'arm', setup(b) {
      b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]managerHotSeat\.ts$/ }, () => ({ contents: src[HOT], loader: 'ts' }));
      b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]deadlineDay\.ts$/ }, () => ({ contents: src[DD], loader: 'ts' }));
      b.onLoad({ filter: /[\\/]src[\\/]data[\\/]clubManagerRosters\.ts$/ }, () => ({ contents: squads, loader: 'ts' }));
      b.onLoad({ filter: /[\\/]src[\\/]data[\\/]clubManagerALeague2026\.ts$/ }, () => ({ contents: leagues.aleague, loader: 'ts' }));
      b.onLoad({ filter: /[\\/]src[\\/]data[\\/]clubManagerRussia2026\.ts$/ }, () => ({ contents: leagues.russia, loader: 'ts' }));
      b.onLoad({ filter: /[\\/]src[\\/]data[\\/]clubManagerFreeAgents2026\.ts$/ }, () => ({ contents: leagues.fa, loader: 'ts' }));
    } }],
  });
  return createRequire(import.meta.url)(outfile);
}
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } };
const A = await bundle('A', SRC, SQUADS1, CURVE1_LEAGUES);
const F = await bundle('F', SRC, SHIPPED, LEAGUES);
const MM = await bundle('M', M, SHIPPED, LEAGUES);
for (const arm of [A, F, MM]) await arm.cm.ensureAllEraRosters();
Date.now = () => Date.UTC(2026, 9, 30, 12, 0, 0);
const sha = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
const hash = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seeded(key, fn) { const outer = Math.random; Math.random = mulberry(hash(key)); try { return fn(); } finally { Math.random = outer; } }

function deadline(arm, date) {
  return seeded(`dd|${date}`, () => {
    const ds = arm.dd.dailyDeadlineDay(date);
    let run = arm.dd.startDeadlineDay(ds);
    const steps = [];
    for (let i = 0; i < Math.min(3, run.targets.length); i++) {
      run = arm.dd.openTalks(run, i);
      const t = run.targets[i];
      if (t.status === 'talks' && t.neg) run = arm.dd.placeBid(run, i, t.neg.theirAsk);
      if (run.targets[i].status === 'terms') {
        const want = arm.dd.termsWanted(run, i);
        if (want) run = arm.dd.offerPersonalTerms(run, i, { wage: want.wage, years: want.years, bonus: want.bonus ?? 0 });
      }
      steps.push(run.targets[i].status);
    }
    run = arm.dd.endDay(run);
    const grade = run.grade ?? arm.dd.gradeWindow(run);
    return { d: sha([run, grade]), steps: steps.join(','), score: grade?.score };
  });
}
function hotSeat(arm, date) {
  return seeded(`hs|${date}`, () => {
    let run = arm.hs.startHotSeat(arm.hs.dailyHotSeat(date));
    for (let k = 0; k < 20 && !run.verdict; k++) {
      run = arm.hs.pendingPress(run) ? arm.hs.answerHotSeatPress(run, 0) : arm.hs.playHotSeatMatch(run, 'balanced', null);
    }
    const sum = arm.hs.carryOnSummary(run);
    return { d: sha([run, sum]), pts: run.points, verdict: run.verdict?.kind ?? run.verdict };
  });
}
const day = (iso, k) => new Date(Date.parse(`${iso}T12:00:00Z`) + k * 86400000).toISOString().slice(0, 10);
const EARLY = ['2023-02-21']; for (let d = '2026-09-01'; d < CUTOVER; d = day(d, 1)) EARLY.push(d);
let ddAF = 0, ddFM = 0, hsAF = 0, hsFM = 0;
const shown = [];
for (const date of EARLY) {
  const [da, df, dm] = [A, F, MM].map(arm => deadline(arm, date));
  const [ha, hf, hm] = [A, F, MM].map(arm => hotSeat(arm, date));
  if (da.d !== df.d) { ddAF += 1; if (shown.length < 8) shown.push(`${date} Deadline Day A ${da.steps} ${da.score} | F ${df.steps} ${df.score}`); }
  if (df.d !== dm.d) { ddFM += 1; if (shown.length < 8) shown.push(`${date} Deadline Day F ${df.steps} ${df.score} | M ${dm.steps} ${dm.score}`); }
  if (ha.d !== hf.d) { hsAF += 1; if (shown.length < 8) shown.push(`${date} Hot Seat A ${ha.pts} ${ha.verdict} | F ${hf.pts} ${hf.verdict}`); }
  if (hf.d !== hm.d) { hsFM += 1; if (shown.length < 8) shown.push(`${date} Hot Seat F ${hf.pts} ${hf.verdict} | M ${hm.pts} ${hm.verdict}`); }
}
for (const s of shown) console.log(`  ${s}`);
console.log(`deepDaily: ${EARLY.length} early dates played to the end; A vs F differ: Deadline Day ${ddAF}, Hot Seat ${hsAF}; F vs M differ: Deadline Day ${ddFM}, Hot Seat ${hsFM}`);
process.exit(ddAF + hsAF ? 1 : 0);
