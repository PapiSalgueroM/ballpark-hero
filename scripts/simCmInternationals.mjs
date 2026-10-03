/**
 * Round 978 harness: Club Manager's international duty
 * (src/lib/clubManagerInternationals.ts and its hooks in clubManager.ts).
 *
 * What it holds, all through the real engine bundled with esbuild, on a
 * seeded Math.random and a frozen clock:
 *
 *  1. THE DATES. The window rule gives exactly the two source verified dates
 *     (VERIFIED_WINDOWS, 2026-27 and 2027-28), every other season and every
 *     era season reads as approximate, and a played season fires each window
 *     once, in date order, on the first of its entries dated on or after the
 *     window's first day, with the assistant's note naming every man who went.
 *  2. HARDER. Over seeded seasons of six squads heavy in internationals, the
 *     match each break hands back is weaker than the SAME save with call ups
 *     switched off: the save forks at the break (the engine draws nothing for
 *     a break, so both arms are identical up to it) and the engine's own
 *     match strength (matchStrengthNow) is read at the kick off of the match
 *     they come back for. Held as a mean over every break, and for each of
 *     the three window kinds on its own, so a window that stopped costing
 *     anything cannot hide behind the others.
 *  3. RESTING GETS IT BACK. The same forks with the assistant's rest
 *     (answerBreak, restPlan): the cost of the break over the two matches it
 *     touches (the one they come back for and the one after it, read at each
 *     kick off with form and morale held to the switched off arm, so only
 *     legs and selection differ) is pooled over every break, and the rest
 *     must win back at least REC_FLOOR of it.
 *  4. NOBODY UNKNOWN GOES. Every man called up in any season of any check, in
 *     the current world and two past ones, is a man the nationality map knows
 *     with that very country, and no made up player is ever called.
 *  5. OLD SAVES WAIT A SEASON. A save with no block (every save from before
 *     this round) plays its whole season with no break, no note and no block,
 *     then gets one from startNextSeason and its first break fires. A damaged
 *     block is dropped on the next play and the season goes on without it.
 *
 * MEASURED HEADROOM (filled in below the run that set the bands).
 *
 * NEGATIVE CONTROLS, SIM_CMINTL_CONTROL=<name>, each rewrites one line of
 * the module into a temp copy (it refuses to run if the line is not there)
 * and must turn its check red:
 *   dates    the September window ends a day early          -> check 1
 *   nocost   a break takes no fitness                       -> check 2
 *   norest   the assistant never rests anybody              -> check 3
 *   anyone   a man with no known country is called as well   -> check 4
 *   oldsave  a save with no block is given one on the spot   -> check 5
 *
 * Run: node scripts/simCmInternationals.mjs   (SEEDS=<n> to widen the sample)
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replaceAll('\\', '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cmintl-')).replaceAll('\\', '/');
const MODULE = `${ROOT}/src/lib/clubManagerInternationals.ts`;
const CONTROL = process.env.SIM_CMINTL_CONTROL ?? '';
const SEEDS = Math.max(1, Number(process.env.SEEDS ?? 3));
/* Bands, set from the measured headroom written in the header. */
const GAP_FLOOR = 1.0;
const KIND_FLOOR = 0.5;
const REC_FLOOR = 0.3;

const CONTROLS = {
  dates: {
    fixed: '{ id: `${y}-sepoct`, start: sep, end: addDays(sep, 15), matches: 4 },',
    broken: '{ id: `${y}-sepoct`, start: sep, end: addDays(sep, 14), matches: 4 },',
  },
  nocost: {
    fixed: 'const fitness = Math.max(20, Math.min(100, p.fitness - c.cost));',
    broken: 'const fitness = p.fitness;',
  },
  norest: {
    fixed: '    if (!moved) break;\n  }\n  return chosen;',
    broken: '    if (!moved) break;\n  }\n  return [];',
  },
  anyone: {
    fixed: '    if (!nation) continue;',
    broken: "    if (!nation) { out.push({ id: p.id, name: p.name, nation: 'Nowhere', cost: 9, injuredWeeks: 0, far: false, starts: false }); continue; }",
  },
  oldsave: {
    fixed: '  const b = state.intl;\n  return b && validIntl(b)',
    broken: '  const b = state.intl ?? (state.intl = freshIntl(state));\n  return b && validIntl(b)',
  },
};

/* ---- the module, or a control's copy of it ---- */
let modulePath = MODULE;
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  if (!c) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
  const src = fs.readFileSync(MODULE, 'utf8').replaceAll('\r\n', '\n');
  if (!src.includes(c.fixed)) {
    console.error(`control cannot run: clubManagerInternationals.ts is not in the shape SIM_CMINTL_CONTROL=${CONTROL} rewrites`);
    process.exit(2);
  }
  modulePath = `${path.dirname(MODULE)}/clubManagerInternationals.control-${CONTROL}-${process.pid}.ts`;
  fs.writeFileSync(modulePath, src.replace(c.fixed, c.broken));
  console.log(`CONTROL ${CONTROL}: one line of the module rewritten, its check must go red`);
}
const cleanup = () => { if (modulePath !== MODULE) { try { fs.unlinkSync(modulePath); } catch { /* gone */ } } };

const ENTRY = `${TMP}/entry.mjs`;
const BUNDLE = `${TMP}/bundle.mjs`;
fs.writeFileSync(ENTRY, `
export * as cm from '${ROOT}/src/lib/clubManager.ts';
export * as intl from '@/lib/clubManagerInternationals';
export { nationalityOf } from '${ROOT}/src/data/playerNationalities.ts';
export * as cal from '${ROOT}/src/lib/clubManagerCalendar.ts';
`);
const swap = {
  name: 'control-swap',
  setup(b) {
    b.onResolve({ filter: /[\\/]lib[\\/]clubManagerInternationals$/ }, () => ({ path: modulePath }));
  },
};
try {
  await build({
    entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE,
    logLevel: 'error', jsx: 'automatic', alias: { '@': `${ROOT}/src` }, plugins: [swap],
  });
} finally {
  cleanup();
}
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { cm, intl, cal, nationalityOf } = await import(pathToFileURL(BUNDLE).href);
await cm.ensureAllEraRosters();

/* ---- a stream whose position can be saved and restored, and a frozen clock ---- */
let a = 1;
Math.random = () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
Date.now = () => 1757000000000;
const clone = s => JSON.parse(JSON.stringify(s));
const key = d => d.y * 10000 + d.m * 100 + d.d;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const f2 = x => x.toFixed(2);

/* Every man called in any season of any check, for check 4. */
const everyCall = [];
const noteCalls = st => {
  const last = st.intl?.last;
  if (!last) return;
  for (const c of last.called) {
    const p = st.squad.find(x => x.id === c.id);
    everyCall.push({ name: c.name, nation: c.nation, eraId: st.eraId, made: !p || !!p.generated || (p.isYouth && /\(Youth\)/.test(p.name)) });
  }
};

/* ---------- 1. The dates ---------- */
console.log('1) The window rule against the verified dates, and a played season firing each window once, in order');
{
  let pinned = 0;
  for (const [year, verified] of Object.entries(intl.VERIFIED_WINDOWS)) {
    const rule = intl.ruleWindows(Number(year));
    if (rule.length !== verified.length) { fail(`${year}: the rule gives ${rule.length} windows, ${verified.length} are verified`); continue; }
    rule.forEach((w, i) => {
      if (key(w.start) !== key(verified[i].start) || key(w.end) !== key(verified[i].end)) {
        fail(`${year} window ${i + 1}: the rule says ${key(w.start)} to ${key(w.end)}, the sources say ${key(verified[i].start)} to ${key(verified[i].end)}`);
      } else pinned += 1;
    });
    if (intl.intlDatesPartial(Number(year))) fail(`${year} is verified but reads as approximate`);
  }
  for (const y of [2005, 2010, 2015, 2020, 2028]) if (!intl.intlDatesPartial(y)) fail(`${y} reads as confirmed dates`);
  console.log(`   ${pinned} verified windows held to the rule`);
  if (pinned < 6) fail(`only ${pinned} verified windows were checked`);

  a = 4242;
  let s = cm.startCareer('Arsenal');
  let fired = [], ordered = 0, notes = 0, missed = 0, guard = 0;
  while (s.week < s.calendar.length && guard++ < 200) {
    const before = (s.intl?.fired ?? []).length;
    const res = cm.playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (res.kind === 'seasonOver') break;
    const now = s.intl?.fired ?? [];
    if (now.length === before) continue;
    noteCalls(s);
    for (const id of now.slice(before)) {
      const w = intl.intlWindowsFor(2026).find(x => x.id === id);
      if (!w) { fail(`fired an unknown window ${id}`); continue; }
      fired.push(id);
      const entryDates = cal.dateOfEntries(cal.worldYearOf(s), s.calendar);
      const at = s.intl.last.atWeek;
      const prev = at > 0 ? key(entryDates[at - 1]) : 0;
      const next = at < entryDates.length ? key(entryDates[at]) : Infinity;
      if (s.intl.last.backWeek >= 0 && s.week > s.intl.last.backWeek) missed += 1;
      if (prev < key(w.start) && key(w.start) <= next) ordered += 1;
      else fail(`${id} fired between entries dated ${prev} and ${next}, its first day is ${key(w.start)}`);
    }
    const last = s.intl.last;
    const note = (s.inbox ?? []).find(m => m.kind === 'intlDuty' && last.called.length && m.playerId === last.called[0].id);
    if (last.called.length) {
      if (!note) fail(`${last.windowId}: ${last.called.length} went and the inbox says nothing`);
      else if (last.called.every(c => note.text.includes(c.name))) notes += 1;
      else fail(`${last.windowId}: the note leaves somebody out`);
    }
  }
  const want = intl.intlWindowsFor(2026).map(w => w.id);
  if (JSON.stringify(fired) !== JSON.stringify(want)) fail(`fired ${fired.join(', ')}, the season holds ${want.join(', ')}`);
  console.log(`   Arsenal 2026-27 fired ${fired.join(", ")}; ${ordered} on the right entry, ${notes} notes naming everyone, ${missed} played before the note could be read`);
  if (missed > 0) fail(`${missed} breaks reached the match they come back for in the same play, so the manager never got to answer`);
}

/* ---------- 2 and 3. The forks ---------- */
const HEAVY = ['Arsenal', 'Manchester City', 'Real Madrid', 'Liverpool', 'Chelsea', 'Bayern Munich'];
const rows = [];
let missedAll = 0;
/** My first match after week w, or -1. */
const myNextAfter = (st, w) => {
  for (let i = w + 1; i < st.calendar.length; i++) {
    const e = st.calendar[i];
    if (e.type !== 'window' && cm.entryInvolvesMe(st, e) && cm.fixtureFor(st, e)) return i;
  }
  return -1;
};
for (const club of HEAVY) {
  for (let seed = 1; seed <= SEEDS; seed++) {
    a = seed * 7919;
    let s = cm.startCareer(club);
    let guard = 0;
    while (s.week < s.calendar.length && guard++ < 200 && !s.sacked) {
      const before = clone(s);
      const firedBefore = (s.intl?.fired ?? []).length;
      const snap = a;
      const res = cm.playNextEntry(s, { skipHalftime: true });
      s = res.state;
      if (res.kind === 'seasonOver') break;
      if ((s.intl?.fired ?? []).length === firedBefore || !s.intl.last) continue;
      noteCalls(s);
      const back = s.intl.last.backWeek;
      if (back < 0) continue;
      if (s.week > back) { missedAll += 1; continue; }
      const after = a;
      /* OFF: the same play from the same stream with no block. */
      a = snap;
      const offIn = clone(before); delete offIn.intl;
      const toBack = st => { a = after; return cm.playNextEntry(st, { skipHalftime: true, untilWeek: back }).state; };
      const off = toBack(cm.playNextEntry(offIn, { skipHalftime: true }).state);
      const start = toBack(clone(s));
      const restIn = clone(s);
      const ans = intl.answerBreak(restIn, true);
      if (ans) restIn.intl = ans.intl;
      const rest = toBack(restIn);
      /* The match after: play the one they come back for from one stream, then on to my next. */
      const next = myNextAfter(off, back);
      const m1seed = (after ^ 0x5bd1e995) | 0;
      const toNext = st => {
        a = m1seed;
        let x = cm.playNextEntry(clone(st), { skipHalftime: true }).state;
        if (next > 0) x = cm.playNextEntry(x, { skipHalftime: true, untilWeek: next }).state;
        return x;
      };
      const off2 = toNext(off);
      const mor = new Map(off2.squad.map(p => [p.id, p.morale]));
      const held = st => cm.matchStrengthNow({ ...st, form: off2.form, squad: st.squad.map(p => ({ ...p, morale: mor.get(p.id) ?? p.morale })) });
      rows.push({
        club, seed, kind: s.intl.last.windowId.split('-')[1], called: s.intl.last.called.length,
        off: cm.matchStrengthNow(off), start: cm.matchStrengthNow(start), rest: cm.matchStrengthNow(rest),
        off2: held(off2), start2: held(toNext(start)), rest2: held(toNext(rest)),
      });
      a = after;
    }
  }
}

const mean = (list, k) => (list.length ? list.reduce((x, r) => x + k(r), 0) / list.length : 0);
console.log(`2) Harder: the match they come back for, against the same save with call ups off (${HEAVY.length} squads x ${SEEDS} seeds)`);
{
  for (const club of HEAVY) {
    const list = rows.filter(r => r.club === club);
    console.log(`   ${club.padEnd(16)} ${String(list.length).padStart(2)} breaks, ${f2(mean(list, r => r.called))} called a break, gap ${f2(mean(list, r => r.off - r.start))}`);
  }
  const gap = mean(rows, r => r.off - r.start);
  console.log(`   ${rows.length} breaks: the match after is ${f2(gap)} strength weaker on average (floor ${GAP_FLOOR})`);
  if (rows.length < HEAVY.length * SEEDS * 2) fail(`only ${rows.length} breaks measured, the sample is too thin to say anything`);
  if (gap < GAP_FLOOR) fail(`the match after a break is only ${f2(gap)} weaker than with call ups off, floor ${GAP_FLOOR}`);
  for (const kind of ['sepoct', 'nov', 'mar']) {
    const list = rows.filter(r => r.kind === kind);
    const g = mean(list, r => r.off - r.start);
    console.log(`   ${kind.padEnd(7)} ${String(list.length).padStart(2)} breaks, gap ${f2(g)} (floor ${KIND_FLOOR})`);
    if (!list.length) fail(`no ${kind} break was measured`);
    else if (g < KIND_FLOOR) fail(`the ${kind} break costs only ${f2(g)}, floor ${KIND_FLOOR}`);
  }
  console.log(`   ${missedAll} breaks reached the match after in the same play as the note`);
  if (missedAll > 0) fail(`${missedAll} breaks gave the manager no chance to answer before the match`);
}

console.log('3) Resting the spent ones wins back the cost over the two matches the trip touches');
{
  const cost = mean(rows, r => (r.off - r.start) + (r.off2 - r.start2));
  const won = mean(rows, r => (r.rest - r.start) + (r.rest2 - r.start2));
  const share = cost > 0 ? won / cost : 0;
  for (const club of HEAVY) {
    const list = rows.filter(r => r.club === club);
    const c = mean(list, r => (r.off - r.start) + (r.off2 - r.start2));
    const w = mean(list, r => (r.rest - r.start) + (r.rest2 - r.start2));
    console.log(`   ${club.padEnd(16)} cost ${f2(c)}, rest wins back ${f2(w)} (${f2(c > 0 ? w / c : 0)}); now ${f2(mean(list, r => r.rest - r.start))}, next ${f2(mean(list, r => r.rest2 - r.start2))}`);
  }
  console.log(`   pooled: the break costs ${f2(cost)} over two matches and the rest wins back ${f2(won)}, a share of ${f2(share)} (floor ${REC_FLOOR})`);
  if (share < REC_FLOOR) fail(`resting wins back only ${f2(share)} of the break's cost, floor ${REC_FLOOR}`);
}

/* ---------- 4. Nobody unknown goes ---------- */
console.log('4) Every man called up is known to the nationality map with that country, and no made up player goes');
{
  for (const [club, era] of [['Barcelona', 'era2015'], ['Chelsea', 'era2005']]) {
    a = 777;
    let s = cm.startCareer(club, era);
    let guard = 0, seen = 0;
    while (s.week < s.calendar.length && guard++ < 200) {
      const before = (s.intl?.fired ?? []).length;
      const res = cm.playNextEntry(s, { skipHalftime: true });
      s = res.state;
      if (res.kind === 'seasonOver') break;
      if ((s.intl?.fired ?? []).length > before) { noteCalls(s); seen += 1; }
    }
    console.log(`   ${club} ${era}: ${seen} breaks (${intl.intlWindowsFor(cal.worldYearOf(s)).length} in the season's structure)`);
    if (seen < 3) fail(`${club} ${era} played only ${seen} breaks`);
  }
  let bad = 0, made = 0;
  for (const c of everyCall) {
    if (nationalityOf(c.eraId, c.name) !== c.nation) bad += 1;
    if (c.made) made += 1;
  }
  console.log(`   ${everyCall.length} call ups checked: ${bad} with a country the map does not give him, ${made} made up men`);
  if (everyCall.length < 200) fail(`only ${everyCall.length} call ups were checked`);
  if (bad > 0) fail(`${bad} call ups went to men the nationality map does not put in that country`);
  if (made > 0) fail(`${made} made up men were called up`);
}

/* ---------- 5. Old saves wait a season ---------- */
console.log('5) A save from before this round plays its season with no break, then gets windows from the next one');
{
  a = 31337;
  let s = cm.startCareer('Arsenal');
  delete s.intl;
  let guard = 0, blocks = 0, notes = 0;
  while (s.week < s.calendar.length && guard++ < 200) {
    const res = cm.playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (s.intl) blocks += 1;
    notes = (s.inbox ?? []).filter(m => m.kind === 'intlDuty').length;
    if (res.kind === 'seasonOver') break;
  }
  console.log(`   old save, season one: ${blocks} plays carried a block, ${notes} notes, week ${s.week} of ${s.calendar.length}`);
  if (blocks > 0 || notes > 0) fail(`an old save got international duty in its current season (${blocks} plays with a block, ${notes} notes)`);
  if (s.week < s.calendar.length) fail('the old save did not finish its season');
  let n = cm.startNextSeason(s);
  if (!n.intl || n.intl.season !== n.season) fail('the next season did not get a block');
  let firedNext = 0;
  guard = 0;
  while (n.week < n.calendar.length && guard++ < 200 && !firedNext) {
    const res = cm.playNextEntry(n, { skipHalftime: true });
    n = res.state;
    firedNext = (n.intl?.fired ?? []).length;
    if (res.kind === 'seasonOver') break;
  }
  console.log(`   season two: ${firedNext ? `first break ${n.intl.fired[0]} fired` : 'no break fired'}`);
  if (!firedNext) fail('the old save never got a break in its next season');

  a = 4040;
  let d = cm.startCareer('Arsenal');
  d.intl = { season: 1, fired: 'broken' };
  d = cm.playNextEntry(d, { skipHalftime: true }).state;
  console.log(`   damaged block: ${d.intl === undefined ? "dropped" : "kept"}, the save played on to week ${d.week}`);
  if (d.intl !== undefined) fail('a damaged block survived a play');
  if (d.week < 1) fail('a save with a damaged block did not play');
}

if (failures > 0) {
  console.error(`simCmInternationals: ${failures} FAILURES${CONTROL ? ` (control ${CONTROL})` : ''}`);
  process.exit(1);
}
console.log(`simCmInternationals: all green${CONTROL ? ` (control ${CONTROL} did NOT fire)` : ''}`);
