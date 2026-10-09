/**
 * Round 1146 harness: the quick sim's coach uses his bench after the break.
 *
 * A player's report, 2026-10-08: "if i quick sim a game then it should
 * automatically make subs". Round 1072's coach replaced injured men and took
 * off men who were already spent at the break, so a fit eleven played ninety
 * minutes unchanged. This round he looks at his bench twice after the break
 * (QUICK_LEGS_WINDOWS in src/lib/clubManager.ts says how). The failure modes:
 * he still changes nothing; he weakens the side in a match that is still
 * alive; he spends the change he keeps for an injury; he stops being "a
 * manager making the same changes by hand" (he draws from the seeded stream);
 * the report does not show what he did.
 *
 * What it plays. FLEET: careers (clubs x seeds x SEASONS whole seasons), every
 * match a quick sim, once by the engine as committed (the candidate) and once
 * by the same engine with the one restLegs call taken out (the baseline, which
 * is the coach before the round). The two fleets part at the first change, so
 * they are two samples and are only ever compared as shares and means. REPLAY:
 * every match of the first REPLAY careers is then played again by hand off the
 * same point of the seeded stream: the coach's own list of changes, made one
 * at a time through changeLive, with his rule read off the save just before
 * each change. Sections:
 *
 *   1 gap      with the round, the bench is used in far more matches than
 *              without it (the share of matches with at least one change)
 *   2 rule     every change of his after the break that is not for an injury
 *              falls on one of the match's two keyed minutes, never takes the
 *              keeper or a man who came on off, and either leaves the eleven
 *              no weaker by the engine's own strength or comes two goals clear
 *   3 reserve  when he makes one, at most one change had been made before it
 *              and two fit men were on the bench
 *   4 manual   a manager making the same changes by hand at the same minutes
 *              gets the same match, report and save, byte for byte
 *   5 report   the full time report lists every change he made, and its
 *              timeline has a row for each
 *
 * MEASURED: see the block at the foot of this header.
 *
 * NEGATIVE CONTROLS. CM_QUICK_LEGS_CONTROL=<name> patches the bundled copy of
 * the source (the anchor must occur exactly once or the run refuses) and the
 * run exits 0 only if the NAMED section went red:
 *   off      the restLegs call removed                          -> gap
 *   anyone   the "no weaker, or settled" test removed           -> rule
 *   nokeep   he may spend his last change on legs               -> reserve
 *   ambient  his two minutes are drawn from Math.random         -> manual
 *
 * Run: node scripts/simCmQuickLegs.mjs        (SEEDSET=n for another set of seeds)
 * Offline: bundles the engine from src, reads no network and no database.
 */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/clubManager.ts';
const CONTROL = process.env.CM_QUICK_LEGS_CONTROL || '';
const SEEDSET = Number(process.env.SEEDSET ?? 0);
const SEEDS = Number(process.env.SEEDS ?? 3);
const SEASONS = Number(process.env.SEASONS ?? 2);
const REPLAY = Number(process.env.REPLAY ?? 3);
const CLUBS = (process.env.CLUBS ?? 'Everton,Real Madrid,Ajax,Aston Villa,Barcelona,Manchester City').split(',');
/** Section 1: how much more often the bench must be used with the round than without it, in share of matches. */
const GAP = Number(process.env.GAP ?? 0.15);

const OFF = [{ file: ENGINE, from: '    restLegs(at);', to: '    void restLegs;' }];
const CONTROLS = {
  off: { patch: OFF, red: 'gap' },
  anyone: { patch: [{ file: ENGINE, from: '      if (then < now && !settled) continue;', to: '      void settled;' }], red: 'rule' },
  nokeep: { patch: [{ file: ENGINE, from: 'if (live.subsUsed >= MAX_SUBS - 1 || (live.minute ?? 0) > at || benchFor(state).length < 2) return;', to: 'if (live.subsUsed >= MAX_SUBS || (live.minute ?? 0) > at || benchFor(state).length < 2) return;' }], red: 'reserve' },
  ambient: { patch: [{ file: ENGINE, from: 'lo + Math.floor(keyedRng(`${key}|${i}`)() * (hi - lo + 1))', to: 'lo + Math.floor(Math.random() * (hi - lo + 1))' }], red: 'manual' },
};
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) { console.error(`simCmQuickLegs: unknown control "${CONTROL}"`); process.exit(2); }

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-legs-'));
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** The engine, bundled from src with a list of exact text patches applied to the bundle's copy of the source. */
async function engine(label, patches) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.bundle.mjs`);
  fs.writeFileSync(entry, `export * from ${JSON.stringify(path.join(ROOT, ENGINE).replaceAll('\\', '/'))};\n`);
  const applied = new Set();
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [{ name: 'cm-quick-legs-control', setup(b) {
      b.onLoad({ filter: /\.ts$/ }, args => {
        const mine = patches.filter(p => path.resolve(ROOT, p.file) === path.resolve(args.path));
        if (!mine.length) return undefined;
        let text = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
        for (const p of mine) {
          const n = text.split(p.from).length - 1;
          if (n !== 1) throw new Error(`control anchor occurs ${n} times, not once, in ${p.file}: ${p.from}`);
          text = text.replace(p.from, p.to);
          applied.add(p);
        }
        return { contents: text, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  if (applied.size !== patches.length) throw new Error(`${label}: ${patches.length - applied.size} patch(es) never met their file`);
  return import(pathToFileURL(out).href);
}

/* ---------- the seeded stream, with its place readable so a match can be played again from it ---------- */
function seeded(seed) {
  let a = seed >>> 0;
  const draw = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  draw.place = () => a;
  return draw;
}
function under(stream, fn) {
  const realRandom = Math.random;
  const realNow = Date.now;
  Math.random = stream;
  Date.now = () => 1791302400000;
  try { return fn(); } finally { Math.random = realRandom; Date.now = realNow; }
}

/* ---------- the sections ---------- */
const SECTIONS = ['gap', 'rule', 'reserve', 'manual', 'report'];
const red = new Map(SECTIONS.map(s => [s, []]));
const checked = new Map(SECTIONS.map(s => [s, 0]));
const fail = (section, message) => red.get(section).push(message);
const tick = section => checked.set(section, checked.get(section) + 1);
const place = e => e.minute + (e.plus ?? 0) / 100;

/** What one fleet measured. */
const arm = () => ({ matches: 0, changes: 0, used: 0, none: 0, injury: 0, atBreak: 0, legs: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, seasons: 0, points: 0, appearances: 0, men: 0 });

/** One finished quick sim, counted. A change is "for an injury" when the man going off is on the report's injury list by then. */
function count(a, report, section5) {
  const d = report.detail;
  a.matches += 1;
  a.changes += d.subs.length;
  if (d.subs.length) a.used += 1; else a.none += 1;
  for (const s of d.subs) {
    const hurt = d.injuries.some(x => x.name === s.off && place(x) <= place(s));
    if (hurt) a.injury += 1;
    else if (s.minute === 46) a.atBreak += 1;
    else a.legs += 1;
  }
  const mine = report.myScorers.length;
  const theirs = report.oppScorers.length;
  a.gf += mine;
  a.ga += theirs;
  if (report.won) a.w += 1; else if (report.drawn) a.d += 1; else a.l += 1;
  if (!section5) return;
  /* Section 5: the report shows every change, in its list and on its timeline. */
  tick('report');
  const rows = d.timeline.filter(e => e.kind === 'sub' && e.side === 'me');
  if (rows.length !== d.subs.length) fail('report', `a report lists ${d.subs.length} changes and its timeline has ${rows.length} rows for them`);
  for (const s of d.subs) {
    if (!s.on || !s.off || !(s.minute >= 1)) fail('report', `a change on the report has no man or no minute: ${JSON.stringify(s)}`);
    else if (!rows.some(e => e.minute === s.minute && (e.plus ?? 0) === (s.plus ?? 0) && e.text === `${s.on} on for ${s.off}`)) fail('report', `the change ${s.on} for ${s.off} at ${s.minute}' has no timeline row`);
  }
}

/** A whole career by quick sim. With `keep`, every match's starting point (save and place in the stream) is kept for the replay. */
function playCareer(cm, club, seed, a, keep, section5) {
  const stream = seeded(seed);
  const kept = [];
  under(stream, () => {
    let s = cm.startCareer(club);
    for (let season = 0; season < SEASONS; season++) {
      let guard = 0;
      while (s.week < s.calendar.length && guard++ < 200) {
        const from = keep ? { state: s, place: stream.place() } : null;
        const r = cm.playNextEntry(s, { skipHalftime: true });
        s = r.state;
        if (r.kind === 'match') {
          count(a, r.report, section5);
          if (from) kept.push({ ...from, result: r });
        }
        if (r.kind === 'seasonOver') break;
      }
      const row = s.table.find(t => t.club === s.clubName);
      a.seasons += 1;
      a.points += row ? row.pts : 0;
      a.appearances += s.squad.reduce((n, p) => n + (p.apps ?? 0), 0);
      a.men += s.squad.filter(p => (p.apps ?? 0) > 0).length;
      s = cm.startNextSeason(cm.finishSeason(s).state);
    }
  });
  return kept;
}

/* ---------- the replay: his changes made by hand, his rule read before each one ---------- */
const legsTally = { changes: 0, live: 0, liveGain: 0, settled: 0, settledGain: 0, replayed: 0, withLegs: 0 };
/** Ids the engine numbers from module counters (inbox, press room, academy), which a second play of the same match numbers afresh. */
const NUMBERED = ['inbox', 'press', 'academy', 'decisions'];

/** Sections 2 and 3 on one change of his that is not for an injury, read off the save just before it. */
function judge(cm, st, line) {
  const live = st.live;
  const out = st.squad.find(p => p.id === line.offId);
  tick('rule');
  const minutes = cm.quickLegsMinutes(st, live);
  if (!minutes.includes(line.minute) || line.plus) fail('rule', `a change at ${line.minute}' is on neither of the match's two minutes (${minutes.join(' and ')})`);
  if (!out || !live.onPitch.includes(line.offId)) { fail('rule', `the man going off at ${line.minute}' is not on the pitch`); return; }
  if (out.position === 'GK') fail('rule', `${out.name}, the keeper, was taken off for legs`);
  if ((live.subs ?? []).some(s => s.onId === line.offId)) fail('rule', `${out.name} came on and was taken off again at ${line.minute}'`);
  const now = cm.liveElevenStrength(st, line.minute);
  const then = cm.liveElevenStrength(st, line.minute, { outId: line.offId, inId: line.onId });
  const goals = xs => (xs ?? []).filter(g => g.minute <= line.minute).length;
  const apart = Math.abs(goals(live.h1My) + goals(live.h2My) - goals(live.h1Opp) - goals(live.h2Opp));
  const settled = apart >= cm.QUICK_LEGS_SETTLED;
  if (then < now && !settled) fail('rule', `${out.name} off at ${line.minute}' left the eleven weaker (${then.toFixed(2)} from ${now.toFixed(2)}) with the match ${apart} apart`);
  legsTally.changes += 1;
  if (settled) { legsTally.settled += 1; legsTally.settledGain += then - now; } else { legsTally.live += 1; legsTally.liveGain += then - now; }
  tick('reserve');
  if (live.subsUsed > 1) fail('reserve', `a change for legs at ${line.minute}' was his change number ${live.subsUsed + 1} of the match`);
  if (cm.benchFor(st).length < 2) fail('reserve', `a change for legs at ${line.minute}' took the last fit man off his bench`);
}

function replay(cm, k) {
  const first = seeded(k.place);
  const stop = under(first, () => cm.playNextEntry(k.state));
  if (stop.kind !== 'halftime') return;
  const at = first.place();
  /* his own list, off a copy of the stream, so the hand made match below starts where his did */
  const plan = under(seeded(at), () => cm.coachQuickMatch(stop.state)).live.subs ?? [];
  const hurtAtRestart = line => line.minute === 46 && k.result.report.detail.injuries.some(x => x.name === line.off && x.minute === 46);
  let legs = 0;
  const manual = under(seeded(at), () => {
    let st = stop.state;
    const make = line => {
      const next = cm.changeLive(st, line.minute, { kind: 'sub', outId: line.offId, inId: line.onId }, line.plus);
      if (!next) throw new Error(`the engine refused a change of his made by hand at ${line.minute}'`);
      st = next;
    };
    for (const line of plan.filter(s => s.minute <= 45)) make(line);
    for (const line of plan.filter(s => s.minute === 46 && !hurtAtRestart(s))) make(line);
    st = cm.startSecondHalf(st);
    for (const line of plan.filter(s => (s.minute > 46 && s.minute <= 90) || hurtAtRestart(s))) {
      const hurt = [...(st.live.h1Injuries ?? []), ...(st.live.h2Injuries ?? [])].some(x => x.id === line.offId && place(x) <= place(line));
      if (!hurt) { legs += 1; judge(cm, st, line); }
      make(line);
    }
    if (cm.isExtraTimeDue(st)) st = cm.startExtraTime(st);
    for (const line of plan.filter(s => s.minute > 90)) make(line);
    return cm.resumeMatch(st);
  });
  legsTally.replayed += 1;
  if (legs) legsTally.withLegs += 1;
  /* Section 4: the same match, report and save. */
  tick('manual');
  const face = r => { const s = { ...r.state }; for (const key of NUMBERED) delete s[key]; return s; };
  const a = face(k.result);
  const b = face(manual);
  if (JSON.stringify(k.result.report) !== JSON.stringify(manual.report)) fail('manual', `the report of a quick sim (${k.result.report.home} v ${k.result.report.away}, ${plan.length} changes) is not the report of the same changes made by hand`);
  else {
    const parted = Object.keys({ ...a, ...b }).filter(key => JSON.stringify(a[key]) !== JSON.stringify(b[key]));
    if (parted.length) fail('manual', `the save after a quick sim differs from the same changes made by hand in: ${parted.slice(0, 6).join(', ')}`);
  }
}

/* ---------- the run ---------- */
async function main() {
  const candidate = await engine('candidate', CONTROL ? CONTROLS[CONTROL].patch : []);
  const baseline = await engine('baseline', OFF);
  const pairs = [];
  for (let c = 0; c < CLUBS.length; c++) for (let k = 0; k < SEEDS; k++) pairs.push({ club: CLUBS[c], seed: 11461000 + SEEDSET * 100003 + c * 7919 + k * 104729 });
  const on = arm();
  const off = arm();
  for (const [n, pair] of pairs.entries()) {
    const kept = playCareer(candidate, pair.club, pair.seed, on, n < REPLAY, true);
    for (const k of kept) replay(candidate, k);
    playCareer(baseline, pair.club, pair.seed, off, false, false);
  }

  /* Section 1: the bench is used in far more matches with the round than without. */
  const share = a => (a.matches ? a.used / a.matches : 0);
  tick('gap');
  if (share(on) - share(off) < GAP) fail('gap', `the bench is used in ${(100 * share(on)).toFixed(1)}% of quick sims with the round and ${(100 * share(off)).toFixed(1)}% without it, under the ${(100 * GAP).toFixed(0)} points the round must add`);
  if (!legsTally.changes && !CONTROL) fail('rule', `none of the ${legsTally.replayed} replayed matches had a change for legs to judge`);

  const per = (n, d) => (d ? (n / d).toFixed(2) : '0.00');
  const pc = (n, d) => (d ? (100 * n / d).toFixed(1) : '0.0');
  const line = (name, a) => `  MEASURED ${name}: ${a.matches} matches, ${per(a.changes, a.matches)} changes a match (${per(a.injury, a.matches)} for an injury, ${per(a.atBreak, a.matches)} at the break, ${per(a.legs, a.matches)} for legs after it), bench used in ${pc(a.used, a.matches)}% of matches; `
    + `W ${pc(a.w, a.matches)}% D ${pc(a.d, a.matches)}% L ${pc(a.l, a.matches)}%, ${per(a.gf, a.matches)} for and ${per(a.ga, a.matches)} against a match, ${per(a.points, a.seasons)} league points a season; ${per(a.appearances, a.seasons)} appearances a season shared by ${per(a.men, a.seasons)} men`;
  console.log(`simCmQuickLegs${CONTROL ? ` (control ${CONTROL})` : ''}: ${pairs.length} careers (${CLUBS.length} clubs x ${SEEDS} seeds, seedset ${SEEDSET}) x ${SEASONS} seasons, each by quick sim, with and without the round`);
  console.log(line('with the round', on));
  console.log(line('without it', off));
  console.log(`  MEASURED his rule, on ${legsTally.replayed} matches played again by hand (${legsTally.withLegs} with a change for legs): ${legsTally.changes} changes for legs, ${legsTally.live} with the match within a goal (mean strength ${legsTally.live ? (legsTally.liveGain / legsTally.live >= 0 ? '+' : '') + (legsTally.liveGain / legsTally.live).toFixed(3) : 'n/a'}) and ${legsTally.settled} two or more apart (mean ${legsTally.settled ? (legsTally.settledGain / legsTally.settled >= 0 ? '+' : '') + (legsTally.settledGain / legsTally.settled).toFixed(3) : 'n/a'})`);
  let failed = 0;
  for (const s of SECTIONS) {
    const xs = red.get(s);
    if (xs.length) { failed += 1; console.log(`  FAIL ${s}: ${xs.length} finding(s) on ${checked.get(s)} checks. ${xs.slice(0, 3).join(' | ')}`); }
    else console.log(`  ok ${s} (${checked.get(s)} checks)`);
  }
  if (CONTROL) {
    const target = CONTROLS[CONTROL].red;
    const fired = red.get(target).length > 0;
    console.log(fired
      ? `simCmQuickLegs: CONTROL ${CONTROL} FIRED, section ${target} went red as it must (red in all: ${SECTIONS.filter(s => red.get(s).length).join(', ')})`
      : `simCmQuickLegs: CONTROL ${CONTROL} did NOT fire, section ${target} stayed green`);
    return fired ? 0 : 1;
  }
  console.log(failed ? `simCmQuickLegs: FAILED, ${failed} of ${SECTIONS.length} sections red` : `simCmQuickLegs: PASS, ${SECTIONS.length} sections green`);
  return failed ? 1 : 0;
}

let code = 1;
try { code = await main(); } catch (error) { console.error(error.stack ?? String(error)); console.log('simCmQuickLegs: FAILED, the harness threw'); } finally { fs.rmSync(TMP, { recursive: true, force: true }); }
process.exit(code);
