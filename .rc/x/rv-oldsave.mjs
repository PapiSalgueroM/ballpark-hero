// Reviewer (runner lens), Round 1104: saves written by the BASE's code (origin/release-al-int), loaded and
// played on by the BRANCH. Runs on the GitHub runner from the repo root: node .rc/x/rv-oldsave.mjs
// It asserts nothing: it prints counts and writes rv-oldsave.json into RC_OUT for the reviewer to read.
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT ?? ROOT;
const BASE_DIR = path.join(ROOT, '.rc', 'base');
const N = Number(process.env.RV_N || 96);
fs.mkdirSync(BASE_DIR, { recursive: true });
execSync('git fetch --depth 1 origin release-al-int', { stdio: 'inherit' });
const baseSha = execSync('git rev-parse FETCH_HEAD', { encoding: 'utf8' }).trim();
execSync(`git archive FETCH_HEAD src | tar -x -C "${BASE_DIR}"`, { stdio: 'inherit', shell: '/bin/bash' });

const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };

async function bundle(dir, name, extra) {
  const entry = [
    `export { NFL_CAREER_SPORT as nfl } from './src/lib/nflCareerSport.ts';`,
    `export { NBA_CAREER_SPORT as nba } from './src/lib/nbaCareerSport.ts';`,
    `export { MLB_CAREER_SPORT as mlb } from './src/lib/mlbCareerSport.ts';`,
    `export { NHL_CAREER_SPORT as nhl } from './src/lib/nhlCareerSport.ts';`,
    `export { startSummer, answerSummerCard, newSummerSalt, repairSummerOnLoad } from './src/lib/usCareerSummer.ts';`,
    `export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';`,
    ...extra,
  ].join('\n');
  const outfile = path.join(ROOT, '.rc', `${name}-${process.pid}.mjs`);
  await build({ stdin: { contents: entry, resolveDir: dir, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile, absWorkingDir: dir, logLevel: 'error', alias: { '@': path.join(dir, 'src') } });
  return import(pathToFileURL(outfile).href);
}
const OLD = await bundle(BASE_DIR, 'old', []);
const NEW = await bundle(ROOT, 'new', [`export { repairHallOnLoad } from './src/lib/usCareerRetirementFlow.ts';`]);

function mulberry(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const r2 = v => Math.round(v * 100) / 100;
const ACTS = ['deposit', 'withdraw', 'buy', 'sell', 'cards'];
const ASSETS = ['ladder', 'bricks', 'cleats', 'screens', 'spark'];

/** The board's loop on one arm, from `c` (or a new career) for `stopAt` more seasons. see(c, where) after every call. */
function drive(arm, id, key, stopAt, see, start) {
  const sport = arm[id];
  const keep = Math.random;
  Math.random = mulberry(1000003 + key * 7919 + id.charCodeAt(1) + (start ? 17 : 0));
  const pick = mulberry(50021 + key * 104729 + id.charCodeAt(2) + (start ? 5 : 0));
  try {
    let c = start;
    let tq;
    if (!c) {
      const pos = sport.create.positions[key % sport.create.positions.length];
      const archs = sport.create.archetypes[pos];
      const era = sport.create.eras[key % sport.create.eras.length].id;
      c = sport.startCareer(`Old ${key}`, pos, archs[key % archs.length], Math.random, null, era);
      c.summerSalt = arm.newSummerSalt(Math.random);
      tq = sport.rollTeamQuality(null, Math.random);
      sport.assignRole(c, tq, Math.random);
    } else tq = sport.rollTeamQuality(null, Math.random);
    for (let n = 0; n < stopAt && !c.retired; n += 1) {
      if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push(sport.suspendedLine(c)); sport.progress(c, Math.random); see(c, 'progress'); continue; }
      if (c.contractYears <= 0) {
        const open = sport.buildFaWindow(c, tq, Math.random).offers.filter(x => !x.gone);
        if (open.length) { const offer = open[Math.floor(pick() * open.length)]; arm.applyFaSigning(c, offer); sport.campBattle(c, offer.quality, Math.random); tq = offer.quality; see(c, 'signing'); }
      }
      sport.campBattle(c, tq, Math.random);
      sport.simSeason(c, tq, Math.random); see(c, 'season');
      sport.progress(c, Math.random); see(c, 'progress');
      if (sport.shouldRetire(c)) { c.retired = true; break; }
      let ev = arm.startSummer(c, sport, Math.random, null);
      while (ev) { ev = arm.answerSummerCard(c, sport, ev, Math.floor(pick() * ev.options.length), Math.random, null).next; see(c, 'card'); }
      tq = sport.rollTeamQuality(tq, Math.random);
      const unread = (c.phoneInbox ?? []).find(m => m.answered === undefined);
      if (unread) { sport.answerInbox(c, unread.id, Math.floor(pick() * unread.choices.length)); see(c, 'inbox'); }
      if (c.pendingRivalryEvent) { c = sport.dismissRivalryEvent(c).state; see(c, 'rival beat'); }
      if (c.pendingRivalryChoice) { const res = sport.resolveRivalryChoice(c, Math.floor(pick() * c.pendingRivalryChoice.choices.length), Math.random); if (res) { c = res.state; see(c, 'rival choice'); } }
      const item = sport.shopItems[Math.floor(pick() * sport.shopItems.length)];
      const bought = sport.buyItem(c, item.id);
      if (bought) { c = bought.state; see(c, 'shop'); }
      for (let k = 0; k < 2; k += 1) {
        const t = ACTS[Math.floor(pick() * ACTS.length)];
        const amount = r2(Math.max(0.05, (c.netWorth ?? 0) * (0.2 + pick() * 1.1)));
        const a = ASSETS[Math.floor(pick() * ASSETS.length)];
        const action = t === 'deposit' ? { t, amount } : t === 'withdraw' ? { t, amount: r2(pick() * 5) } : t === 'buy' ? { t, id: a, amount } : t === 'sell' ? { t, id: a, frac: 0.5 } : { t, stake: 0.05 };
        sport.moneyAct(c, action); see(c, `money ${t}`);
      }
    }
    return c;
  } finally { Math.random = keep; }
}

const rep = { baseSha, n: N, sports: {} };
for (const id of ['nfl', 'nba', 'mlb', 'nhl']) {
  const S = { saves: 0, negSaves: 0, negNoMarker: 0, healthySameObject: 0, healthyChanged: 0, seasonsRewrittenOnLoad: 0, fieldsChangedOnLoad: {}, negLoadedTo: [], totalsOff: 0, loadThrows: [], playThrows: [], belowZeroAfterLoad: 0, firstBelow: null, oldLinesRewrittenByPlay: 0, longThrowback: 0, mixedSeasons: 0, legacyThrows: [], baseThrows: [], savedGames17in2005: 0, tenthSacksKept: 0 };
  rep.sports[id] = S;
  for (let key = 0; key < N; key += 1) {
    let low = 0; let lowSnap = null; let made;
    try { made = drive(OLD, id, key, 2 + (key % 9), c => { if ((c.netWorth ?? 0) < low) { low = c.netWorth; lowSnap = JSON.stringify(c); } }, null); } catch (e) { S.baseThrows.push(`${key}: ${String(e).slice(0, 160)}`); continue; }
    /* The save as the career ended, and the save as it stood at its worst moment (a tab closed there). */
    for (const saved of [JSON.stringify(made), lowSnap].filter(Boolean)) {
    S.saves += 1;
    const raw = JSON.parse(saved);
    const neg = (raw.netWorth ?? 0) < 0;
    if (neg) S.negSaves += 1;
    let loaded;
    try {
      const before = JSON.parse(saved);
      loaded = NEW[id].repairNetWorth(before);
      if (!neg) { if (loaded === before && JSON.stringify(loaded) === saved) S.healthySameObject += 1; else S.healthyChanged += 1; }
      const wealthBefore = (raw.netWorth ?? 0) + NEW[id].moneyWealth(JSON.parse(saved));
      if (neg) { const wealthAfter = (loaded.netWorth ?? 0) + NEW[id].moneyWealth(loaded); S.negLoadedTo.push([raw.netWorth, loaded.netWorth, r2(wealthBefore), r2(wealthAfter)]); if (Math.abs(wealthAfter - Math.max(0, wealthBefore)) > 0.011) S.totalsOff += 1; }
      NEW.repairSummerOnLoad(loaded); NEW.repairHallOnLoad(loaded);
      if (JSON.stringify(loaded.seasons) !== JSON.stringify(raw.seasons)) S.seasonsRewrittenOnLoad += 1;
      for (const k of new Set([...Object.keys(raw), ...Object.keys(loaded)])) if (k !== 'netWorth' && k !== 'money' && JSON.stringify(raw[k]) !== JSON.stringify(loaded[k])) S.fieldsChangedOnLoad[k] = (S.fieldsChangedOnLoad[k] || 0) + 1;
    } catch (e) { S.loadThrows.push(`${key}: ${String(e).slice(0, 160)}`); continue; }
    if (id === 'nfl') { for (const s of raw.seasons) { if (s.year <= 2020 && s.games === 17) S.savedGames17in2005 += 1; if (typeof s.sacks === 'number' && !Number.isInteger(s.sacks * 2)) S.tenthSacksKept += 1; } }
    const kept = JSON.stringify(raw.seasons); const had = raw.seasons.length;
    try {
      const end = drive(NEW, id, key, 30, (c, where) => { if ((c.netWorth ?? 0) < 0) { S.belowZeroAfterLoad += 1; S.firstBelow ??= `${key} after ${where}: ${c.netWorth}`; } }, loaded);
      if (JSON.stringify(end.seasons.slice(0, had)) !== kept) S.oldLinesRewrittenByPlay += 1;
      if (id === 'nfl') { const fresh = end.seasons.slice(had); if (fresh.some(s => s.year <= 2020 && s.games > 16)) S.longThrowback += 1; if (fresh.length && had) S.mixedSeasons += 1; }
      try { NEW[id].legacyOf(end); NEW[id].careerSoFar?.(end); NEW[id].earnedBadges(end); } catch (e) { S.legacyThrows.push(`${key}: ${String(e).slice(0, 160)}`); }
    } catch (e) { S.playThrows.push(`${key}: ${String(e).slice(0, 200)}`); }
    }
  }
  const negs = S.negLoadedTo; S.negLoadedSample = negs.slice(0, 6); delete S.negLoadedTo;
  S.negLoadedNonZero = negs.filter(x => x[1] !== 0).length;
  console.log(`${id}: ${JSON.stringify({ ...S, negLoadedSample: undefined })}`);
}
fs.writeFileSync(path.join(OUT, 'rv-oldsave.json'), JSON.stringify(rep, null, 1));
console.log(`rv-oldsave: done on base ${baseSha}`);
