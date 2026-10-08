/* Release AO review (runner lens), node only. Base = origin/release-an2-int, branch = the head under review.
   A. the dailies' deal (club, league, seed) day by day, base against branch
   B. what a player is handed on those days: the opening Hot Seat run and Deadline Day run, base against branch
   C. Club Manager old saves across two season ends on the branch, and a fresh season in the new league */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rv-out');
fs.mkdirSync(OUT, { recursive: true });
const BASEROOT = path.join(ROOT, '.rc', 'base');
let checks = 0, failed = 0;
const check = (ok, label) => { checks += 1; if (!ok) failed += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); return ok; };
const info = label => console.log(`info ${label}`);

fs.mkdirSync(BASEROOT, { recursive: true });
let baseRef = 'origin/release-an2-int';
try { execSync(`git rev-parse --verify ${baseRef}`, { stdio: 'pipe' }); }
catch { execSync('git fetch -q origin release-an2-int', { stdio: 'inherit' }); baseRef = 'FETCH_HEAD'; }
execSync(`git archive ${baseRef} src | tar -x -C "${BASEROOT}"`, { stdio: 'inherit', shell: '/bin/bash' });
info(`base ${execSync(`git rev-parse ${baseRef}`).toString().trim()}`);

const mem = new Map();
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
async function bundle(root, tag) {
  const outfile = path.join(process.env.TMPDIR || '/tmp', `rv-daily-${tag}-${process.pid}.mjs`);
  await build({
    stdin: { contents: [
      "export * as cm from './src/lib/clubManager.ts';",
      "export * as hs from './src/lib/managerHotSeat.ts';",
      "export * as dd from './src/lib/deadlineDay.ts';",
    ].join('\n'), resolveDir: root, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile, absWorkingDir: root, logLevel: 'error', jsx: 'automatic',
    alias: { '@': path.join(root, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty' },
    banner: { js: "import { createRequire as __rvRequire } from 'node:module'; const require = __rvRequire(import.meta.url);" },
  });
  return import(pathToFileURL(outfile).href);
}
const OLD = await bundle(BASEROOT, 'base');
const NEW = await bundle(ROOT, 'branch');

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const FIXED_NOW = Date.UTC(2026, 9, 8, 16);
function withSeed(seed, fn) {
  const r = Math.random, n = Date.now;
  Math.random = mulberry32(seed >>> 0); Date.now = () => FIXED_NOW;
  try { return fn(); } finally { Math.random = r; Date.now = n; }
}
const day = (start, i) => new Date(Date.parse(`${start}T12:00:00Z`) + i * 86400000).toISOString().slice(0, 10);
const firstDiff = (a, b) => { let d = 0; while (d < a.length && d < b.length && a[d] === b[d]) d += 1; return d; };
const around = (s, d) => s.slice(Math.max(0, d - 70), d + 90).replace(/\s+/g, ' ');

/* ─── A. the deal ─── */
const TODAY = process.env.RV_TODAY || '2026-10-08';
let dealSame = 0, dealFirstMove = null;
for (let i = 0; i < 40; i += 1) {
  const D = day(TODAY, i);
  const a = JSON.stringify([OLD.hs.dailyHotSeat(D), OLD.dd.dailyDeadlineDay(D)]);
  const b = JSON.stringify([NEW.hs.dailyHotSeat(D), NEW.dd.dailyDeadlineDay(D)]);
  if (a === b) dealSame += 1; else if (!dealFirstMove) dealFirstMove = `${D}: base ${a.slice(0, 200)} branch ${b.slice(0, 200)}`;
  if (i < 14) check(a === b, `A. ${D}: both dailies deal the club, league and seed the base deals (${JSON.parse(b)[0].club} / ${JSON.parse(b)[1].club ?? '?'})`);
}
info(`A. ${dealSame} of 40 days from ${TODAY} deal the same; first day a deal moves: ${dealFirstMove ?? 'none in 40 days'}`);

/* ─── B. what he is handed ─── */
const strip = run => JSON.stringify(run, (k, v) => (typeof v === 'function' ? undefined : v));
let hsSame = 0, ddSame = 0;
const moved = [];
for (let i = 0; i < 14; i += 1) {
  const D = day(TODAY, i);
  let a, b, e = null;
  try {
    mem.clear(); a = strip(withSeed(1, () => OLD.hs.startHotSeat(OLD.hs.dailyHotSeat(D))));
    mem.clear(); b = strip(withSeed(1, () => NEW.hs.startHotSeat(NEW.hs.dailyHotSeat(D))));
  } catch (x) { e = `${x && x.message}`.slice(0, 160); }
  if (e) { check(false, `B. ${D}: the Hot Seat run opens on both trees ERROR ${e}`); continue; }
  const A = JSON.parse(a), B = JSON.parse(b);
  const brief = r => JSON.stringify({ takeover: r.takeover, target: r.target, leash: r.leash, points: r.points, leaguePlayed: r.leaguePlayed });
  const sameBrief = brief(A) === brief(B);
  if (a === b) hsSame += 1;
  else {
    const d = firstDiff(a, b);
    moved.push({ day: D, club: B.setup.club, sameBrief, at: d, base: around(a, d), branch: around(b, d) });
  }
  /* play it out the same way on both: balanced, no talk, first press answer */
  const finish = (E, run0) => withSeed(2, () => {
    let run = run0, n = 0;
    for (; n < 60; n += 1) {
      const q = E.pendingPress(run);
      if (q) { run = E.answerHotSeatPress(run, 0); continue; }
      const before = run.log.length;
      run = E.playHotSeatMatch(run, 'balanced', null);
      if (run.log.length === before) break;
    }
    return { text: E.shareText(run), games: run.log.length, points: run.points };
  });
  let fa = null, fb = null;
  try { mem.clear(); fa = finish(OLD.hs, withSeed(1, () => OLD.hs.startHotSeat(OLD.hs.dailyHotSeat(D)))); mem.clear(); fb = finish(NEW.hs, withSeed(1, () => NEW.hs.startHotSeat(NEW.hs.dailyHotSeat(D)))); }
  catch (x) { info(`B. ${D}: playing the Hot Seat out threw: ${`${x && x.message}`.slice(0, 160)}`); }
  const sameEnd = fa && fb && JSON.stringify(fa) === JSON.stringify(fb);
  info(`B. ${D} Hot Seat ${B.setup.club}: opening run ${a === b ? 'identical' : `DIFFERS (brief ${sameBrief ? 'same' : 'DIFFERS'})`}; same choices to the end: ${sameEnd ? 'same result' : `DIFFERENT result: base ${fa ? `${fa.games} games ${fa.points} pts` : '?'} branch ${fb ? `${fb.games} games ${fb.points} pts` : '?'}`}`);
  if (!sameEnd && fa && fb && i < 3) info(`B. ${D} share text base: ${fa.text.replace(/\n/g, ' / ').slice(0, 300)} || branch: ${fb.text.replace(/\n/g, ' / ').slice(0, 300)}`);
  let da, db;
  try { mem.clear(); da = strip(withSeed(1, () => OLD.dd.startDeadlineDay(OLD.dd.dailyDeadlineDay(D)))); mem.clear(); db = strip(withSeed(1, () => NEW.dd.startDeadlineDay(NEW.dd.dailyDeadlineDay(D)))); }
  catch (x) { check(false, `B. ${D}: Deadline Day opens on both trees ERROR ${`${x && x.message}`.slice(0, 160)}`); continue; }
  if (da === db) ddSame += 1;
  else { const d = firstDiff(da, db); info(`B. ${D} Deadline Day opening run DIFFERS at char ${d}: base "${around(da, d)}" branch "${around(db, d)}"`); }
}
info(`B. opening Hot Seat run identical on ${hsSame} of 14 days; opening Deadline Day run identical on ${ddSame} of 14 days`);
for (const m of moved.slice(0, 4)) info(`B. ${m.day} ${m.club}: first difference at char ${m.at}: base "${m.base}" branch "${m.branch}"`);
fs.writeFileSync(path.join(OUT, 'daily-moved.json'), JSON.stringify({ TODAY, dealSame, dealFirstMove, hsSame, ddSame, moved }, null, 1));
/* ─── C. Club Manager: base saves across two season ends on the branch, then a fresh Russian season ─── */
const known = new Set(NEW.cm.CLUBS.map(c => c.name));
function season(E, s0, label) {
  let s = s0, guard = 0, matches = 0, unknown = 0, nan = 0;
  for (; guard < 130; guard += 1) {
    const r = E.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked) break;
    if (r.kind === 'match') {
      matches += 1;
      const rep = r.report;
      const opp = rep.home === s.clubName ? rep.away : rep.home;
      if (!known.has(opp)) unknown += 1;
      if (!Number.isFinite(rep.homeGoals) || !Number.isFinite(rep.awayGoals)) nan += 1;
    }
  }
  return { s, guard, matches, unknown, nan };
}
const russian = NEW.cm.CLUBS.filter(c => { try { return NEW.cm.leagueOf(c.name).id === 'russia'; } catch { return false; } }).map(c => c.name);
info(`C. the branch's Russian Premier League: ${russian.length} clubs (${russian.slice(0, 4).join(', ')} ...)`);
check(russian.length === 16, `C. sixteen Russian clubs in the engine (${russian.length})`);
for (const [i, club] of ['Real Madrid', 'Arsenal', 'Celtic', 'Shakhtar Donetsk'].entries()) {
  let err = null, line = '';
  try {
    let raw = null;
    withSeed(6100 + i, () => {
      let s = OLD.cm.startCareer(club);
      for (let g = 0; g < 14; g += 1) { const r = OLD.cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; }
      mem.clear(); OLD.cm.saveCareer(s); raw = mem.get(OLD.cm.SAVE_KEY);
    });
    mem.clear(); mem.set(NEW.cm.SAVE_KEY, raw);
    withSeed(7100 + i, () => {
      let s = NEW.cm.loadCareer();
      if (!s) throw new Error('the branch did not load the base save');
      const one = season(NEW.cm, s, club);
      if (one.s.sacked) { line = `sacked in season one after ${one.matches} matches`; return; }
      const fin1 = NEW.cm.finishSeason(one.s);
      const rows1 = NEW.cm.sortedTable(fin1.state.table);
      const rounds1 = 2 * (fin1.state.leagueClubs.length - 1);
      const short1 = rows1.filter(r => r.w + r.d + r.l !== rounds1).length;
      /* take the job in Russia if one is offered, else stay */
      const offer = (fin1.summary.offers || []).find(o => russian.includes(o.club));
      let s2 = NEW.cm.startNextSeason(fin1.state, offer ? offer.club : undefined);
      NEW.cm.saveCareer(s2); s2 = NEW.cm.loadCareer();
      const two = season(NEW.cm, s2, club);
      const fin2 = two.s.sacked ? null : NEW.cm.finishSeason(two.s);
      const rows2 = fin2 ? NEW.cm.sortedTable(fin2.state.table) : [];
      const rounds2 = fin2 ? 2 * (fin2.state.leagueClubs.length - 1) : 0;
      const short2 = rows2.filter(r => r.w + r.d + r.l !== rounds2).length;
      line = `season one ${one.matches} matches (${one.unknown} unknown opponents, ${one.nan} NaN scores, ${short1} of ${rows1.length} rows short of ${rounds1} games), offers ${(fin1.summary.offers || []).map(o => o.club).join(', ') || 'none'}${offer ? `, took ${offer.club}` : ''}; season two at ${two.s.clubName}: ${two.matches} matches (${two.unknown} unknown, ${two.nan} NaN, ${short2} of ${rows2.length} rows short of ${rounds2})${two.s.sacked ? ', sacked' : ''}`;
      if (one.unknown || one.nan || short1 || two.unknown || two.nan || short2) err = 'a broken season';
    });
  } catch (e) { err = `${e && e.message}`.slice(0, 220); }
  check(!err, `C. base save of ${club} on the branch: ${line}${err ? ` ERROR ${err}` : ''}`);
}
for (const [i, club] of russian.slice(0, 3).entries()) {
  let err = null, line = '';
  try {
    withSeed(9100 + i, () => {
      mem.clear();
      const one = season(NEW.cm, NEW.cm.startCareer(club), club);
      const lg = NEW.cm.leagueOf(club);
      if (one.s.sacked) { line = `sacked after ${one.matches} matches`; return; }
      const fin = NEW.cm.finishSeason(one.s);
      const rows = NEW.cm.sortedTable(fin.state.table);
      const short = rows.filter(r => r.w + r.d + r.l !== 30).length;
      const outside = rows.filter(r => !russian.includes(r.club)).length;
      line = `${lg.name}, cup ${lg.cupName}: ${one.matches} matches, table of ${rows.length} (${short} rows not on 30 games, ${outside} clubs from outside the league), ${one.unknown} unknown opponents, season score ${fin.summary.seasonScore}`;
      if (rows.length !== 16 || short || outside || one.unknown || !Number.isFinite(fin.summary.seasonScore)) err = 'a broken season';
      const next = NEW.cm.startNextSeason(fin.state);
      const rel = rows.slice(-2).map(r => r.club);
      const still = rel.filter(c => next.leagueClubs.includes(c));
      line += `; bottom two ${rel.join(' and ')}, still in next season's league: ${still.length}; next season ${next.leagueClubs.length} clubs`;
    });
  } catch (e) { err = `${e && e.message}`.slice(0, 220); }
  check(!err, `C. a fresh career at ${club}: ${line}${err ? ` ERROR ${err}` : ''}`);
}
console.log(`rvDaily: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
