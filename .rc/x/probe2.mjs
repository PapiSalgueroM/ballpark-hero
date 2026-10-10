/* Reviewer's probe for Round 1226 (independent of the builder's).
   usage: node probe2.mjs <base checkout> <head checkout> <careers a cell> <out dir>
   PART 1  old saves: a career played wholly on the BASE engine is a base made
           save. Every reader the board calls must say the same thing about it
           on the head as on the base.
   PART 2  the same saves played on by the HEAD: the old lines stay byte for
           byte, the new lines carry the length they were played on.
   PART 3  season by season from one copy on both engines: which FIELDS of
           the line differ, by class of season (my own typed table of lengths).
   PART 4  writes two base made saves in the board's shape for a browser walk. */
import path from 'node:path';
import os from 'node:os';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const [BASE, HEAD] = [path.resolve(process.argv[2]), path.resolve(process.argv[3])];
const PER = Number(process.argv[4] || 6);
const OUTDIR = path.resolve(process.argv[5] || os.tmpdir());
mkdirSync(OUTDIR, { recursive: true });

async function load(dir, tag) {
  const out = path.join(os.tmpdir(), `probe2-1226-${tag}-${process.pid}.mjs`);
  await build({
    stdin: { contents: [
      "export { NHL_CAREER_SPORT } from './src/lib/nhlCareerSport.ts';",
      "export { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport.ts';",
      "export { NBA_CAREER_SPORT } from './src/lib/nbaCareerSport.ts';",
      "export { NFL_CAREER_SPORT } from './src/lib/nflCareerSport.ts';",
      "export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';",
      "export { answerSummerCard, startSummer } from './src/lib/usCareerSummer.ts';",
    ].join('\n'), resolveDir: dir, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(dir, 'src') }, nodePaths: [path.join(HEAD, 'node_modules')],
  });
  return import(pathToFileURL(out).href);
}
const B = await load(BASE, 'base'); const H = await load(HEAD, 'head');
const SPORTS = { nhl: 'NHL_CAREER_SPORT', mlb: 'MLB_CAREER_SPORT', nba: 'NBA_CAREER_SPORT', nfl: 'NFL_CAREER_SPORT' };

const hashStr = s => { let h = 0x811c9dc5 >>> 0; for (let k = 0; k < s.length; k += 1) { h ^= s.charCodeAt(k); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
function stream(seed) {
  const r = () => { r.s = (r.s + 0x6D2B79F5) | 0; let t = Math.imul(r.s ^ (r.s >>> 15), 1 | r.s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.s = seed | 0; return r;
}
const KEEP = Math.random;

/* One season of the board's loop, on bundle G. `st` holds c, tq; rnd and pick are streams. */
function playSeason(G, sportKey, st, rnd, pick) {
  const sport = G[SPORTS[sportKey]];
  let c = st.c; let tq = st.tq;
  Math.random = rnd;
  try {
    if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push(sport.suspendedLine(c)); sport.progress(c, rnd); st.c = c; return; }
    if (c.contractYears <= 0) {
      const fa = sport.buildFaWindow(c, tq, rnd); const open = fa.offers.filter(x => !x.gone);
      if (open.length) { const offer = open[Math.floor(pick() * open.length)]; G.applyFaSigning(c, offer); sport.campBattle(c, offer.quality, rnd); tq = offer.quality; }
    }
    sport.campBattle(c, tq, rnd);
    sport.simSeason(c, tq, rnd);
    sport.progress(c, rnd);
    if (sport.shouldRetire(c)) { c.retired = true; st.c = c; st.tq = tq; return; }
    let ev = G.startSummer(c, sport, rnd, null);
    while (ev) { const k = Math.floor(pick() * ev.options.length); ev = G.answerSummerCard(c, sport, ev, k, rnd, null).next; }
    tq = sport.rollTeamQuality(tq, rnd);
    const unread = (c.phoneInbox ?? []).find(m => m.answered === undefined);
    if (unread) sport.answerInbox(c, unread.id, Math.floor(pick() * unread.choices.length));
    if (c.pendingRivalryEvent) c = sport.dismissRivalryEvent(c).state;
    if (c.pendingRivalryChoice) { const res = sport.resolveRivalryChoice(c, Math.floor(pick() * c.pendingRivalryChoice.choices.length), rnd); if (res) c = res.state; }
    st.c = c; st.tq = tq;
  } finally { Math.random = KEEP; }
}
function startCareer(G, sportKey, key, pos, archIdx, era, rnd) {
  const sport = G[SPORTS[sportKey]];
  Math.random = rnd;
  try {
    const archs = sport.create.archetypes[pos];
    const c = sport.startCareer(`Old Save ${key}`, pos, archs[archIdx % archs.length], rnd, null, era);
    const tq = sport.rollTeamQuality(null, rnd);
    sport.assignRole(c, tq, rnd);
    return { c, tq };
  } finally { Math.random = KEEP; }
}
/* Everything the board reads off a save, as one JSON string. */
function readAll(G, sportKey, json) {
  const sport = G[SPORTS[sportKey]]; const out = {};
  const call = (name, f) => { const c = JSON.parse(json); Math.random = stream(77); try { out[name] = JSON.stringify(f(c)); } catch (e) { out[name] = `THREW ${String(e).slice(0, 80)}`; } finally { Math.random = KEEP; } };
  call('legacyOf', c => sport.legacyOf(c));
  call('statLine', c => c.seasons.map(s => sport.statLine(s, c.pos)));
  call('reviewStats', c => c.seasons.map(s => sport.reviewStats(s, c.pos)));
  call('headlinesFor', c => c.seasons.map(s => sport.headlinesFor(c, s)));
  call('followers', c => sport.followers(c));
  call('fanComments', c => sport.fanComments(c));
  call('earnedBadges', c => sport.earnedBadges(c).map(b => b.id));
  call('honours', c => sport.honours(c));
  call('careerSoFar', c => sport.careerSoFar(c));
  call('ringsOf', c => sport.ringsOf(c));
  call('roleBadge', c => sport.roleBadge(c));
  call('shareText', c => sport.shareText(c, sport.legacyOf(c)));
  call('repairNetWorth', c => sport.repairNetWorth(c));
  call('moneyWealth', c => sport.moneyWealth(c));
  return out;
}
let red = 0;
const fail = msg => { red += 1; if (red <= 40) console.log(`RED ${msg}`); };

const nhlLenOk = (y, slate) => (y >= 2026 ? slate === 84 : y === 2012 ? slate === 48 : y === 2020 ? slate === 56 : y === 2019 ? (slate === undefined || (slate >= 68 && slate <= 71)) : slate === undefined);
const mlbLenOk = (y, slate) => (y === 2020 ? slate === 60 || slate === 58 : slate === undefined || slate === 161 || slate === 163);
const OWN = { nhl: 82, mlb: 162 };
const PITCH = ['SP', 'RP'];
const cells = [];
for (const sportKey of Object.keys(SPORTS)) {
  const sport = H[SPORTS[sportKey]];
  for (const era of sport.create.eras.map(e => e.id)) for (const pos of sport.create.positions) cells.push({ sportKey, era, pos });
}
console.log(`cells: ${cells.length}, careers a cell: ${PER}`);

/* PARTS 1 and 2. */
const t1 = new Map(); const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
let saves = 0; let oldLines = 0; let newLines = 0; let wholeSame = 0; let wholeN = 0;
const walkSaves = {};
for (const { sportKey, era, pos } of cells) for (let i = 0; i < PER; i += 1) {
  const key = `${sportKey}|${era}|${pos}|${i}`; const seed = hashStr(key);
  const rnd = stream(seed); const pick = stream(seed ^ 0x5bd1e995);
  const st = startCareer(B, sportKey, key, pos, i, era, rnd);
  const S = 2 + (i % 9) + (era !== 'now' && i % 2 ? 6 : 0);
  for (let n = 0; n < S && !st.c.retired; n += 1) playSeason(B, sportKey, st, rnd, pick);
  const json = JSON.stringify(st.c); saves += 1;
  const rb = readAll(B, sportKey, json); const rh = readAll(H, sportKey, json);
  for (const name of Object.keys(rb)) {
    if (rb[name].startsWith('THREW') || rh[name].startsWith('THREW')) bump(t1, `${sportKey} ${name} THREW (${rb[name].slice(0, 60)} / ${rh[name].slice(0, 60)})`);
    else if (rb[name] !== rh[name]) { bump(t1, `${sportKey} ${name} DIFFERS`); fail(`old save ${key}: ${name} reads differently on the head. base: ${rb[name].slice(0, 160)} | head: ${rh[name].slice(0, 160)}`); }
  }
  if (st.c.retired) continue;
  if ((sportKey === 'nhl' || sportKey === 'mlb') && era === 'now' && pos === (sportKey === 'nhl' ? 'C' : 'CF') && st.c.seasons.length >= 3 && !walkSaves[sportKey]) walkSaves[sportKey] = { c: JSON.parse(json), phase: 'season', teamQuality: st.tq, coach: null };
  const old = st.c.seasons.map(s => JSON.stringify(s)); oldLines += old.length;
  const stH = { c: JSON.parse(json), tq: st.tq }; const r2 = stream(seed + 1); const p2 = stream(seed + 2);
  for (let n = 0; n < 3 && !stH.c.retired; n += 1) playSeason(H, sportKey, stH, r2, p2);
  old.forEach((s, k) => { if (JSON.stringify(stH.c.seasons[k]) !== s) fail(`old save ${key}: saved line ${k} was rewritten by playing on. was ${s.slice(0, 140)} | is ${JSON.stringify(stH.c.seasons[k]).slice(0, 140)}`); });
  for (const s of stH.c.seasons.slice(old.length)) {
    newLines += 1;
    if (sportKey === 'nba' || sportKey === 'nfl') { if ('slate' in s) fail(`${key}: an ${sportKey} line carries a slate`); continue; }
    const ok = sportKey === 'nhl' ? nhlLenOk(s.year, s.slate) : mlbLenOk(s.year, s.slate);
    if (!ok) fail(`${key}: new line of ${s.year} (${s.team}) carries slate ${s.slate}`);
    if (s.games > (s.slate ?? OWN[sportKey])) fail(`${key}: new line of ${s.year} holds ${s.games} games in a season of ${s.slate ?? OWN[sportKey]}`);
  }
  if (sportKey === 'nba' || sportKey === 'nfl') {
    const stB = { c: JSON.parse(json), tq: st.tq }; const r3 = stream(seed + 1); const p3 = stream(seed + 2);
    for (let n = 0; n < 3 && !stB.c.retired; n += 1) playSeason(B, sportKey, stB, r3, p3);
    wholeN += 1; if (JSON.stringify(stB.c) === JSON.stringify(stH.c) && r3.s === r2.s) wholeSame += 1; else fail(`${key}: an ${sportKey} career played on differs between base and head`);
  }
}
console.log(`PART 1: ${saves} base made saves read by ${14} readers on both trees. Differences by sport and reader: ${t1.size ? [...t1.entries()].map(([k, n]) => `${k}: ${n}`).join(' ; ') : 'none'}`);
console.log(`PART 2: ${oldLines} saved lines stayed byte for byte through three more seasons on the head (reds above if not); ${newLines} new lines checked for their slate; NBA and NFL careers played on, same on both trees: ${wholeSame} of ${wholeN}`);

/* PART 3: one season from one copy on both engines; which fields moved, by class of season. */
const t3 = new Map(); const ex = new Map(); let seasons3 = 0;
const diffKeys = (a, b) => [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].filter(k => JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])).sort();
for (const { sportKey, era, pos } of cells) for (let i = 0; i < PER; i += 1) {
  const key = `p3|${sportKey}|${era}|${pos}|${i}`; const seed = hashStr(key);
  let rnd = stream(seed); let pick = stream(seed ^ 0x2545f491);
  let st = startCareer(H, sportKey, key, pos, i, era, rnd);
  for (let n = 0; n < 24 && !st.c.retired; n += 1) {
    const snap = JSON.stringify(st.c); const pre = JSON.parse(snap);
    const run = G => { const s = { c: JSON.parse(snap), tq: st.tq }; const r = stream(rnd.s); const p = stream(pick.s); playSeason(G, sportKey, s, r, p); return { s, r, p }; };
    const b = run(B); const h = run(H); seasons3 += 1;
    const lb = b.s.c.seasons.length > pre.seasons.length ? b.s.c.seasons[b.s.c.seasons.length - 1] : null;
    const lh = h.s.c.seasons.length > pre.seasons.length ? h.s.c.seasons[h.s.c.seasons.length - 1] : null;
    const lineKeys = diffKeys(lb, lh);
    const stateKeys = diffKeys({ ...b.s.c, seasons: null }, { ...h.s.c, seasons: null });
    const rngSame = b.r.s === h.r.s && b.p.s === h.p.s && b.s.tq === h.s.tq;
    let cls = sportKey;
    if (sportKey === 'nhl' || sportKey === 'mlb') {
      const prev = pre.seasons[pre.seasons.length - 1];
      cls += lh && lh.slate !== undefined ? ' | length changed' : ' | length the engine own';
      if (prev && prev.slate !== undefined) cls += ' | after a changed season';
      if (sportKey === 'mlb' && lb && lb.poGames !== undefined) cls += ` | October ${PITCH.includes(pos) ? 'pitcher' : 'hitter'} ${pre.year >= 2022 ? '2022 on' : pre.year === 2020 ? '2020' : pre.year >= 2012 ? '2012 to 2021' : '2004 to 2011'}`;
    }
    const sig = `line[${lineKeys.join(',')}] state[${stateKeys.join(',')}]${rngSame ? '' : ' STREAM MOVED'}`;
    const k = `${cls} => ${sig}`; bump(t3, k);
    if (!ex.has(k)) ex.set(k, `${key} ${pre.year} ${pre.team}: base ${JSON.stringify(lb).slice(0, 230)} | head ${JSON.stringify(lh).slice(0, 230)}`);
    if ((sportKey === 'nba' || sportKey === 'nfl') && (lineKeys.length || stateKeys.length || !rngSame)) fail(`${key} ${pre.year}: an ${sportKey} season differs between base and head`);
    st = h.s; rnd = h.r; pick = h.p;
  }
}
console.log(`PART 3: ${seasons3} seasons, each played from one copy on both engines. Class of season => fields that differ: count`);
for (const [k, n] of [...t3.entries()].sort()) console.log(`  ${String(n).padStart(6)}  ${k}`);
console.log('PART 3 examples (the first of each class that moved):');
for (const [k, v] of [...ex.entries()].sort()) if (!k.includes('line[] state[]') || k.includes('STREAM')) console.log(`  ${k}\n      ${v}`);

/* PART 4: base made saves in the board's shape, for the browser walk. */
for (const [sportKey, pos, era, upTo] of [['nhl', 'C', 'y2006', 2012], ['mlb', 'CF', 'y2004', 2020], ['mlb', 'CF', 'y2004', 2008], ['mlb', 'CF', 'y2004', 2015]]) {
  for (let i = 0; i < 40; i += 1) {
    const key = `walk|${sportKey}|${upTo}|${i}`; const seed = hashStr(key); const rnd = stream(seed); const pick = stream(seed ^ 0x5bd1e995);
    const st = startCareer(B, sportKey, key, pos, i, era, rnd);
    for (let n = 0; n < 30 && !st.c.retired && st.c.year < upTo; n += 1) playSeason(B, sportKey, st, rnd, pick);
    if (!st.c.retired && st.c.year === upTo && !st.c.suspendedSeasons && st.c.contractYears > 0 && !st.c.pendingRivalryEvent && !st.c.pendingRivalryChoice) { walkSaves[`${sportKey}-${upTo}`] = { c: st.c, phase: 'season', teamQuality: st.tq, coach: null }; break; }
  }
}
for (const [name, save] of Object.entries(walkSaves)) {
  writeFileSync(path.join(OUTDIR, `base-save-${name}.json`), JSON.stringify(save));
  console.log(`PART 4: wrote base-save-${name}.json (${save.c.name}, ${save.c.pos}, ${save.c.team}, next season ${save.c.year}, ${save.c.seasons.length} seasons saved, last line ${JSON.stringify(save.c.seasons[save.c.seasons.length - 1]).slice(0, 200)})`);
}
console.log(red ? `probe2: RED, ${red} failures` : 'probe2: green. Old saves read the same, saved lines stay, the NBA and the NFL did not move.');
process.exit(red ? 1 : 0);
