// Round 1302 scratch (never committed): which review screen cases does the engine hold on the shipped rates?
// Sent to a runner as an extra file: node .rc/x/scan3.mjs [seeds]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), 'r1302-scan-'));
const bundle = path.join(work, 'engine.mjs');
await build({ entryPoints: [path.join(ROOT, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
const cm = await import(pathToFileURL(bundle).href);
function seeded(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Date.now = () => 1791547200000;
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}
const SEEDS = Number(process.argv[2] || 2500);
const place = e => e.minute + (e.plus ?? 0);
const chance = e => e.kind === 'goal' || e.kind === 'shot' || e.kind === 'save';
const at = e => `${e.minute}${e.plus ? '+' + e.plus : ''}'`;
const first = {}, count = {};
const note = (kind, where, text) => { count[kind] = (count[kind] ?? 0) + 1; if (!(kind in first)) first[kind] = []; if (first[kind].length < 3) first[kind].push(`${where} (${text})`); };

/** One stretch of a match: its feed lines between lo and hi, and the whistle's place. */
function look(tag, where, feed, lo, hi, whistle) {
  const lines = feed.filter(e => e.minute >= lo && e.minute <= hi);
  const vars = lines.filter(e => e.kind === 'var' && e.review).sort((a, b) => place(a) - place(b));
  for (const v of vars) {
    const what = `${v.review.decision} ${v.side} ${at(v)} ${v.text}, whistle ${whistle}`;
    note(`${tag}.review`, where, what);
    for (const kind of ['sub', 'red', 'injury', 'yellow']) {
      const other = lines.find(e => e.kind === kind && e.side !== v.side && place(e) === place(v));
      if (other) note(`${tag}.sameMinute.${kind}`, where, `${what} + ${kind} ${other.side} ${other.text}`);
    }
    const og = lines.find(e => e.kind === 'goal' && e.og && Math.abs(place(e) - place(v)) <= 2);
    if (og) note(`${tag}.ownGoalBeside`, where, `${what} + own goal ${og.side} ${at(og)} ${og.text}`);
    if (v.review.decision === 'disallowed' && place(v) >= whistle - 1) {
      const realLast = lines.some(e => chance(e) && place(e) === whistle);
      const realNear = lines.some(e => chance(e) && place(e) >= whistle - 2 && place(e) < whistle);
      note(`${tag}.ruledOutLate.${place(v) === whistle ? 'atWhistle' : 'oneBefore'}.${realLast ? 'withLastKick' : 'noLastKick'}.${realNear ? 'chanceNear' : 'quiet'}`, where, what);
    }
    if (v.review.decision === 'disallowed' && v.side === 'opp' && v.minute === 45 && !v.plus && lines.some(e => e.kind === 'goal' && e.side === 'me' && place(e) === 44)) note(`${tag}.shape2042`, where, what);
  }
  for (let i = 1; i < vars.length; i++) {
    if (place(vars[i]) === place(vars[i - 1])) note(`${tag}.twoInOneMinute`, where, vars.slice(i - 1, i + 1).map(v => `${v.review.decision} ${v.side} ${at(v)}`).join(' + ') + `, whistle ${whistle}`);
    else if (place(vars[i]) - place(vars[i - 1]) === 1) note(`${tag}.backToBack`, where, vars.slice(i - 1, i + 1).map(v => `${v.review.decision} ${v.side} ${at(v)}`).join(' + ') + `, whistle ${whistle}`);
  }
}

/* League matches 1 to 3 of the fresh Everton career of the screen test: first and second halves. */
let state = seeded(4107, () => cm.startCareer('Everton'));
delete state.realLeagueFixtures;
state.squad = state.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
for (let k = 0; k < 3; k++) {
  for (let seed = 1700; seed < 1700 + SEEDS; seed++) {
    const stop = seeded(seed, () => cm.playNextEntry(state, { varReviews: true }));
    if (stop.kind !== 'halftime' || stop.state.live.varReviews !== true) continue;
    const live = stop.state.live;
    look('h1', `m${k + 1} seed ${seed}`, cm.liveFeed(live), 0, 45, 45 + (live.added?.h1 ?? 0));
    const second = seeded(seed + 500000, () => cm.startSecondHalf(stop.state));
    if (second?.live) look('h2', `m${k + 1} seed ${seed}`, cm.liveFeed(second.live), 46, 90, 90 + (second.live.added?.h2 ?? 0));
  }
  state = seeded(5000 + k, () => cm.playNextEntry(state, { skipHalftime: true, noCoach: true })).state;
}

/* Extra time: the first cup tie of a fresh Ajax career (the KNVB Cup says yes from the round of 16). */
let ajax = seeded(4201, () => cm.startCareer('Ajax'));
let guard = 0;
while (ajax.calendar[ajax.week] && ajax.calendar[ajax.week].type !== 'cup' && guard++ < 80) {
  const r = seeded(6000 + guard, () => cm.playNextEntry(ajax, { skipHalftime: true, noCoach: true }));
  if (r.kind === 'seasonOver' || !r.state) break;
  ajax = r.state;
}
const cupEntry = ajax.calendar[ajax.week];
console.log(`AJAX reached week ${ajax.week}: ${cupEntry ? `${cupEntry.type} ${cupEntry.cupRound ?? ''}` : 'no entry'} after ${guard} entries`);
if (cupEntry?.type === 'cup') {
  let lit = 0, level = 0;
  for (let seed = 1700; seed < 1700 + SEEDS; seed++) {
    const stop = seeded(seed, () => cm.playNextEntry(ajax, { varReviews: true }));
    if (stop.kind !== 'halftime') continue;
    if (stop.state.live.varReviews === true) lit += 1; else continue;
    const second = seeded(seed + 500000, () => cm.startSecondHalf(stop.state));
    if (!second?.live) continue;
    const extra = seeded(seed + 900000, () => cm.startExtraTime(second));
    if (!extra?.live) continue;
    level += 1;
    look('et', `ajax cup seed ${seed}`, cm.liveFeed(extra.live), 91, 120, (extra.live.et?.to ?? 120));
  }
  console.log(`AJAX cup tie: ${lit} of ${SEEDS} kickoffs carried the opt in, ${level} went to extra time`);
}
for (const kind of Object.keys(count).sort()) console.log(`${kind}: ${count[kind]} in all; first: ${first[kind].join(' | ')}`);
console.log(`scan3: done, ${SEEDS} seeds a match.`);
