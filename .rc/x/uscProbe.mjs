// Reviewer probe (us-careers lens, Release AV). Never committed; sent to a runner as .rc/x/uscProbe.mjs.
// One fleet of the four US My Careers, played by whichever tree is the cwd, dumped season by season.
//   node uscProbe.mjs dump <out.json>                 (cwd = the tree that plays)
//   node uscProbe.mjs resume <dump.json> <out.json>   (cwd = the tree that LOADS the saves of dump.json and plays on)
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [mode, a1, a2] = process.argv.slice(2);
const root = process.cwd();
const N = Number(process.env.USC_N || 240);
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'usc-probe-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const require = createRequire(import.meta.url);
const P = rel => path.join(root, rel).split(path.sep).join('/');
const entry = path.join(work, 'entry.ts'), outfile = path.join(work, 'bundle.cjs');
const WANT = [
  ['nfl', 'src/lib/nflCareerSport.ts'], ['nba', 'src/lib/nbaCareerSport.ts'], ['mlb', 'src/lib/mlbCareerSport.ts'], ['nhl', 'src/lib/nhlCareerSport.ts'],
  ['fa', 'src/lib/usCareerFreeAgency.ts'], ['hall', 'src/lib/careerHallOfFame.ts'], ['flow', 'src/lib/usCareerRetirementFlow.ts'], ['summer', 'src/lib/usCareerSummer.ts'],
  ['shape', 'src/lib/usSeasonShape.ts'],
];
fs.writeFileSync(entry, WANT.filter(([, rel]) => fs.existsSync(path.join(root, rel))).map(([as, rel]) => `export * as ${as} from '${P(rel)}';`).join('\n'));
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', jsx: 'automatic', alias: { '@': path.join(root, 'src') },
  define: { 'import.meta.env': '{"PROD":true,"DEV":false}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const B = require(outfile);
const SPORTS = { nfl: B.nfl.NFL_CAREER_SPORT, nba: B.nba.NBA_CAREER_SPORT, mlb: B.mlb.MLB_CAREER_SPORT, nhl: B.nhl.NHL_CAREER_SPORT };
const h = v => createHash('sha1').update(v === undefined ? 'undefined' : JSON.stringify(v)).digest('hex').slice(0, 10);
const copy = v => JSON.parse(JSON.stringify(v));
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const TARGET_YEARS = [2010, 2015, 2017, 2019];
const realRandom = Math.random;

// One season the way the board plays it (UsCareerBoard.playSeason), with the usual routine. `st` holds c, tq and the counter.
function seasonStep(S, st, rng, cards, idx) {
  let c = st.c;
  if ((c.suspendedSeasons ?? 0) > 0) {
    c.suspendedSeasons -= 1;
    const line = S.suspendedLine(c);
    c.seasons.push(line);
    S.progress(c, rng);
    return line;
  }
  if (c.contractYears <= 0) {
    const fa = S.buildFaWindow(c, st.tq, rng);
    const offer = fa.offers.find(o => !o.gone) ?? fa.offers[0];
    if (offer) { B.fa.applyFaSigning(c, offer); S.campBattle(c, offer.quality, rng); st.tq = offer.quality; }
  }
  S.campBattle(c, st.tq, rng);
  const { line } = S.simSeason(c, st.tq, rng);
  S.progress(c, rng);
  if (cards) {
    if (c.pendingRivalryEvent) { const r = S.dismissRivalryEvent(c); c = r.state; st.cardsSeen += 1; }
    if (c.pendingRivalryChoice) {
      let done = null;
      for (let k = 0; k < 4 && !done; k += 1) done = S.resolveRivalryChoice(c, (idx + k) % 4, rng);
      if (done) { c = done.state; st.cardsSeen += 1; } else c.pendingRivalryChoice = null;
    }
  }
  st.c = c;
  return line;
}
function record(S, st, line, draws) {
  const c = st.c, keys = {};
  for (const k of Object.keys(c).sort()) keys[k] = h(c[k]);
  return { y: line.year, line: JSON.stringify(line), stat: (() => { try { return S.statLine(line, c.pos); } catch { return 'THREW'; } })(), keys, draws,
    rl: c.rival ? [c.rival.lastLine, c.rival.myYears, c.rival.hisYears, c.rival.retired ? 1 : 0, c.rival.lastYear ?? null] : null };
}
function finish(S, c) {
  const out = { retired: !!c.retired, calBefore: B.hall.hallCalibrationOf ? B.hall.hallCalibrationOf(c) : null, legacyLive: S.legacyOf(c) };
  const r = copy(c); r.retired = true;
  if (B.hall.stampHallCalibration) B.hall.stampHallCalibration(r);
  out.stamp = r.hallCal ?? null;
  out.legacyRetired = S.legacyOf(r);
  try { out.weighs = S.hall?.weighs ? S.hall.weighs(r) : null; } catch (e) { out.weighs = 'THREW ' + String(e).slice(0, 80); }
  out.state = r;
  return out;
}
function play(slug, i, cards, from) {
  const S = SPORTS[slug];
  const base = mulberry32(i * 7919 + 13 + (cards ? 900001 : 0) + slug.charCodeAt(1) * 131 + (from ? 55001 + from.k * 17 : 0));
  let draws = 0;
  const rng = () => { draws += 1; return base(); };
  Math.random = rng;
  try {
    const positions = Object.keys(S.create.archetypes), eras = S.create.eras.map(e => e.id);
    let st;
    const meta = {};
    if (from) {
      let c = S.repairNetWorth(copy(from.state));
      if (B.summer?.repairSummerOnLoad) B.summer.repairSummerOnLoad(c);
      if (B.flow?.repairHallOnLoad) B.flow.repairHallOnLoad(c);
      meta.loadSame = JSON.stringify(c) === JSON.stringify(from.state);
      meta.loadDiffKeys = Object.keys({ ...c, ...from.state }).filter(k => JSON.stringify(c[k]) !== JSON.stringify(from.state[k]));
      meta.oldRows = JSON.stringify(c.seasons);
      meta.before = c.seasons.length;
      st = { c, tq: from.tq, cardsSeen: 0 };
    } else {
      const pos = positions[i % positions.length], era = eras[Math.floor(i / positions.length) % eras.length];
      const archs = S.create.archetypes[pos];
      const c = S.startCareer(`Probe ${slug} ${i}`, pos, archs[i % archs.length], rng, null, era);
      meta.pos = pos; meta.era = era;
      if (era !== 'now' && i % 3 === 2) { c.year = TARGET_YEARS[i % TARGET_YEARS.length]; meta.targeted = c.year; }
      const tq = S.rollTeamQuality(null, rng);
      S.assignRole(c, tq, rng);
      st = { c, tq, cardsSeen: 0 };
    }
    const seasons = [], snaps = [];
    const snapAt = from ? -1 : (i * 3) % 9;
    for (let guard = 0; guard < 36 && !st.c.retired; guard += 1) {
      if (!from && i < 96 && st.c.seasons.length === snapAt) snaps.push({ k: snapAt, tq: st.tq, state: copy(st.c) });
      const d0 = draws;
      const line = seasonStep(S, st, rng, cards, i + guard);
      seasons.push(record(S, st, line, draws - d0));
      if (S.shouldRetire(st.c)) { st.c.retired = true; break; }
      const ev = S.drawEvent(st.c, rng);
      if (ev && ev.options.length) ev.options[0].apply(st.c, rng);
      st.tq = S.rollTeamQuality(st.tq, rng);
      if (from && seasons.length >= 6) break;
    }
    if (from) {
      meta.oldRowsKept = JSON.stringify(st.c.seasons.slice(0, meta.before)) === meta.oldRows;
      delete meta.oldRows;
    }
    const fin = finish(S, st.c);
    if (!from && i < 96 && i % 2 === 0) snaps.push({ k: 99, tq: st.tq, state: fin.state });
    if (!from && i < 96 && i % 4 === 1) { const bare = copy(fin.state); delete bare.hallCal; snaps.push({ k: 98, tq: st.tq, state: bare }); }
    delete fin.state;
    return { id: `${slug}/${cards ? 'cards' : 'plain'}/${i}${from ? `@${from.k}` : ''}`, meta, cards: st.cardsSeen, seasons, fin, snaps };
  } finally { Math.random = realRandom; }
}

if (mode === 'dump') {
  const out = { madeBy: root, hallCalibration: B.hall.HALL_CALIBRATION ?? null, sports: {} };
  for (const slug of Object.keys(SPORTS)) {
    const rows = [];
    for (const cards of [false, true]) for (let i = 0; i < N; i += 1) {
      try { rows.push(play(slug, i, cards, null)); } catch (e) { rows.push({ id: `${slug}/${cards ? 'cards' : 'plain'}/${i}`, threw: String(e?.stack || e).split(String.fromCharCode(10)).slice(0, 3).join(' | ') }); }
    }
    out.sports[slug] = rows;
    const ok = rows.filter(r => !r.threw);
    console.log(`dump ${slug}: ${rows.length} careers (${rows.length - ok.length} threw), ${ok.reduce((t, r) => t + r.seasons.length, 0)} seasons, ${ok.reduce((t, r) => t + r.cards, 0)} rivalry cards answered, ${ok.reduce((t, r) => t + r.snaps.length, 0)} saves kept; positions ${Object.keys(SPORTS[slug].create.archetypes).join(',')}; eras ${SPORTS[slug].create.eras.map(e => e.id).join(',')}`);
    for (const r of rows.filter(r => r.threw).slice(0, 3)) console.log(`  THREW ${r.id}: ${r.threw}`);
  }
  fs.writeFileSync(a1, JSON.stringify(out));
  console.log(`uscProbe dump: written ${a1} by ${root} (Hall calibration ${out.hallCalibration})`);
  process.exit(0);
}
if (mode === 'resume') {
  const made = JSON.parse(fs.readFileSync(a1, 'utf8'));
  const out = { madeBy: made.madeBy, playedBy: root, hallCalibration: B.hall.HALL_CALIBRATION ?? null, sports: {} };
  for (const slug of Object.keys(SPORTS)) {
    const S = SPORTS[slug], rows = [];
    for (const r of made.sports[slug]) {
      if (r.threw) continue;
      const i = Number(r.id.split('/')[2]), cards = r.id.includes('/cards/');
      for (const snap of r.snaps) {
        const id = `${r.id}@${snap.k}`;
        try {
          if (snap.k >= 98) {
            let c = S.repairNetWorth(copy(snap.state));
            if (B.summer?.repairSummerOnLoad) B.summer.repairSummerOnLoad(c);
            if (B.flow?.repairHallOnLoad) B.flow.repairHallOnLoad(c);
            rows.push({ id, retired: true, stampOnDisk: snap.state.hallCal ?? null, stampAfterLoad: c.hallCal ?? null, cal: B.hall.hallCalibrationOf(c), legacy: S.legacyOf(c),
              weighs: (() => { try { return S.hall?.weighs ? S.hall.weighs(c) : null; } catch (e) { return 'THREW ' + String(e).slice(0, 80); } })(),
              loadSame: JSON.stringify(c) === JSON.stringify(snap.state), stats: c.seasons.map(s => { try { return S.statLine(s, c.pos); } catch { return 'THREW'; } }) });
          } else rows.push(play(slug, i, cards, snap));
        } catch (e) { rows.push({ id, threw: String(e?.stack || e).split(String.fromCharCode(10)).slice(0, 3).join(' | ') }); }
      }
    }
    out.sports[slug] = rows;
    console.log(`resume ${slug}: ${rows.length} saves made by ${made.madeBy} loaded by ${root}; ${rows.filter(r => r.threw).length} threw; ${rows.filter(r => r.retired).length} retired saves read; ${rows.filter(r => r.seasons).reduce((t, r) => t + r.seasons.length, 0)} seasons played on`);
    for (const r of rows.filter(r => r.threw).slice(0, 3)) console.log(`  THREW ${r.id}: ${r.threw}`);
  }
  fs.writeFileSync(a2, JSON.stringify(out));
  console.log(`uscProbe resume: written ${a2}`);
  process.exit(0);
}
console.error('usage: uscProbe.mjs dump <out.json> | resume <dump.json> <out.json>');
process.exit(2);
