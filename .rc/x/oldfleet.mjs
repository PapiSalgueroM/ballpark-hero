// oldfleet.mjs: run lens reviewer. Saves made by the BASE code (48cb9d4b), continued three seasons by the head and by
// the base from the same save, on the same stream, with no card answered (the season loop: role, season, progress,
// the retirement test). Judged: no throw on the head; the NFL and the NBA continue byte equal (whole saves); MLB and
// the NHL continue with every season line byte equal and every other top level field that differs being the rival or
// a pending rivalry card; in MLB and the NHL the rival's line after a judged season is in the new shape and the tally
// grows by one per judged season. Ends "oldfleet: N checks, F failed" and exits by F. Never reads the network.
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd(); const BEFORE = process.env.OLD_BEFORE || '48cb9d4b'; const N = Number(process.env.OLD_N || 400);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const norm = s => s.replace(/\r\n/g, '\n');
const STDIN = ['nfl', 'mlb', 'nhl', 'nba'].map(s => `export { ${s.toUpperCase()}_CAREER_SPORT } from './src/lib/${s}CareerSport.ts';`).join('\n') + "\nexport * as drive from './src/test/helpers/usCareerDrive.ts';";
async function bundle(commit) {
  const changed = commit ? execSync(`git diff --name-only ${commit} -- src`, { cwd: ROOT }).toString().split('\n').map(x => x.trim()).filter(Boolean) : [];
  const plugin = { name: 'at', setup(b) { b.onLoad({ filter: /[.]tsx?$/ }, args => {
    const rel = path.relative(ROOT, args.path).replace(/\\/g, '/');
    if (!changed.includes(rel)) return undefined;
    let contents; try { contents = execSync(`git show ${commit}:${rel}`, { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { return undefined; }
    return { contents: norm(contents), loader: rel.endsWith('x') ? 'tsx' : 'ts' };
  }); } };
  const out = path.join(os.tmpdir(), `oldfleet-${process.pid}-${commit || 'head'}.mjs`);
  await build({ stdin: { contents: STDIN, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, outfile: out, plugins: [plugin] });
  const m = await import(pathToFileURL(out).href); try { unlinkSync(out); } catch { /* ok */ }
  console.log(`bundle ${commit || 'HEAD'}: ${changed.length} src files read at that commit`);
  return m;
}
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const FLEET = { nfl: { pos: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], eras: ['now', 'y2005'] }, mlb: { pos: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], eras: ['now', 'y2004'] }, nhl: { pos: ['C', 'LW', 'RW', 'D', 'G'], eras: ['now', 'y2006'] }, nba: { pos: ['PG', 'SG', 'SF', 'PF', 'C'], eras: ['now'] } };
const SHAPE = { mlb: pos => (pos === 'SP' ? /^\d+-\d+, \d+\.\d\d ERA, \d+ K$/ : pos === 'RP' ? /^\d+ saves?, \d+ holds?, \d+\.\d\d ERA, \d+ K$/ : /^\.\d{3}, \d+ HR, \d+ RBI$/), nhl: pos => (pos === 'G' ? /^\d+ W, \.\d{3} SV%$/ : /^\d+ G, \d+ A, \d+ P$/) };
const A = await bundle(''); const B = await bundle(BEFORE);
let checks = 0; let failed = 0; const say = (ok, m) => { checks += 1; if (!ok) failed += 1; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${m}`); };
function cont(M, sport, save, seed) {
  const S = M[`${sport.toUpperCase()}_CAREER_SPORT`]; const c = JSON.parse(save); const rnd = mulberry32(seed); const keep = Math.random; Math.random = rnd;
  try {
    let tq = S.rollTeamQuality(null, rnd); S.assignRole(c, tq, rnd); const judged = [];
    for (let n = 0; n < 3 && !c.retired; n += 1) {
      if ((c.suspendedSeasons ?? 0) > 0 || c.contractYears <= 0) break;
      const live = c.rival && !c.rival.retired; const before = c.rival ? c.rival.myYears + c.rival.hisYears : 0;
      S.campBattle(c, tq, rnd); S.simSeason(c, tq, rnd); S.progress(c, rnd);
      judged.push({ live, before, after: c.rival ? c.rival.myYears + c.rival.hisYears : 0, line: c.rival?.lastLine, pos: c.pos });
      if (S.shouldRetire(c)) { c.retired = true; break; }
      tq = S.rollTeamQuality(tq, rnd);
    }
    return { c, judged };
  } finally { Math.random = keep; }
}
for (const sport of ['nfl', 'nba', 'mlb', 'nhl']) {
  const F = FLEET[sport]; const SB = B[`${sport.toUpperCase()}_CAREER_SPORT`];
  let equal = 0; let linesEqual = 0; let threw = 0; const otherKeys = {}; let shapeBad = 0; let tallyBad = 0; let judgedLive = 0; let n = 0; let first = '';
  for (let i = 0; i < N; i += 1) {
    const pos = F.pos[i % F.pos.length]; const era = F.eras[Math.floor(i / F.pos.length) % F.eras.length];
    const save = B.drive.driveCareer(SB, { key: `old-${sport}-${i}`, pos, arch: i, eraId: era === 'now' ? undefined : era, seasons: 2 + (i % 6) }).json;
    let a; let b;
    try { a = cont(A, sport, save, 9000 + i); } catch (e) { threw += 1; if (!first) first = `${pos} ${i}: ${String(e).slice(0, 160)}`; continue; }
    b = cont(B, sport, save, 9000 + i); n += 1;
    if (JSON.stringify(a.c) === JSON.stringify(b.c)) equal += 1;
    if (JSON.stringify(a.c.seasons) === JSON.stringify(b.c.seasons)) linesEqual += 1;
    for (const k of new Set([...Object.keys(a.c), ...Object.keys(b.c)])) if (JSON.stringify(a.c[k]) !== JSON.stringify(b.c[k])) otherKeys[k] = (otherKeys[k] ?? 0) + 1;
    if (sport === 'mlb' || sport === 'nhl') for (const j of a.judged) if (j.live) { judgedLive += 1; if (j.after !== j.before + 1) tallyBad += 1; if (!SHAPE[sport](j.pos).test(j.line ?? '')) { shapeBad += 1; if (!first) first = `${sport} ${j.pos}: "${j.line}"`; } }
  }
  const keys = Object.entries(otherKeys).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';
  console.log(`${sport}: ${n} base saves continued; whole saves equal ${equal}; season lines equal ${linesEqual}; top level keys that differ: ${keys}`);
  say(threw === 0, `${sport}: no base save throws when the head plays it on (${threw}${first ? `; ${first}` : ''})`);
  if (sport === 'nfl' || sport === 'nba') say(equal === n && n > 0, `${sport}: ${equal} of ${n} base saves continue byte equal on the head`);
  else {
    say(linesEqual === n && n > 0, `${sport}: ${linesEqual} of ${n} base saves continue with every season line byte equal`);
    say(Object.keys(otherKeys).every(k => /^(rival|pendingRivalryEvent|pendingRivalryChoice|lastRivalryEventId)$/.test(k)), `${sport}: only the rival or a pending rivalry card differs (${keys})`);
    say(judgedLive > 0 && shapeBad === 0, `${sport}: the rival's line after each of ${judgedLive} judged seasons is his position's new shape (${shapeBad} not)`);
    say(tallyBad === 0, `${sport}: the tally grew by exactly one in each judged season (${tallyBad} not)`);
  }
}
console.log(`oldfleet: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
