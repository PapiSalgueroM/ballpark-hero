/**
 * Round 978 harness: Club Manager's international duty
 * (src/lib/clubManagerInternationals.ts and its hooks in clubManager.ts).
 *
 * What it holds, all through the real engine bundled with esbuild, on a
 * seeded Math.random and a frozen clock:
 *
 *  1. THE DATES. The window rule gives exactly the two source verified dates
 *     (VERIFIED_WINDOWS, the 2026-27 autumn and November windows), every
 *     other window and every era season reads as approximate, and a season
 *     played on the LIVE path (every match stopped at the interval and
 *     finished by resumeMatch, as the screen plays it) fires each window its
 *     matches reach once, in date order, between the last match of mine
 *     before its first day and the first one on or after it, with the
 *     assistant's note naming every man who went and waiting in the inbox
 *     before the match they come back for. Arsenal plus six MLS clubs,
 *     whose 15 club conferences give someone a bye every round.
 *  2. HARDER. Over seeded seasons of six squads heavy in internationals, the
 *     match each break hands back is weaker than the SAME save with call ups
 *     switched off: the save forks at the break (the engine draws nothing for
 *     a break, so both arms are identical up to it) and the engine's own
 *     match strength (matchStrengthNow) is read at the kick off of the match
 *     they come back for. Held as a mean over every break, and for each of
 *     the three window kinds on its own, so a window that stopped costing
 *     anything cannot hide behind the others.
 *  3. RESTING GETS IT BACK. The same forks with the assistant's rest,
 *     answered through the inbox note the way a player answers it
 *     (answerMessage, answerBreak, restPlan): the cost of the break over the two matches it
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
 *  6. A REST IS WHAT PLAYS. In every rest arm of check 3, at the kick off of
 *     the match they come back for: no rested man is in the eleven the
 *     engine fields while fitter cover sits on the bench, none is still in
 *     the picked eleven the tactics screen draws, a rested man put back in
 *     his slot by hand does play, and after the match every rested man is
 *     back in the slot he handed over and the rest is gone. These are rules,
 *     so they are held exactly (zero breaks), over at least 20 rested men.
 *  7. THE LONG TRIPS COST MORE. Among men who started for their country,
 *     those whose country plays on another continent from the club (worked
 *     out here from the two confederations) come back with more fitness gone
 *     than those who stayed on their own, compared inside each window kind.
 *
 * MEASURED HEADROOM, 2026-10-03, three batches of 6 squads x 3 seeds
 * (SEED_BASE 0, 10, 20), 49 to 54 breaks a batch:
 *   match after a break, pooled gap      2.21  2.09  2.10   floor 1.5
 *   the September and October window     2.97  2.95  2.97   floor 2.0
 *   the November window                  2.27  2.18  2.27   floor 1.4
 *   the March window                     1.24  1.09  1.07   floor 0.6
 *   share of the two match cost the
 *   assistant's rest wins back           0.51  0.55  0.54   floor 0.40
 * Per squad the rest wins back most of it where the cover stayed home
 * (Arsenal and Real Madrid about all of it) and little where the cover went
 * away too (Chelsea and Liverpool 0.15 to 0.3, City about a third): resting
 * a tired man for a man who is just as tired buys nothing, which is real.
 * The pooled share is the claim, and it is a little over half.
 *
 * NEGATIVE CONTROLS, SIM_CMINTL_CONTROL=<name>, each rewrites one line of
 * the module or the engine as the bundler loads it (it refuses to run unless
 * the file holds exactly one copy of the line) and must turn its check red.
 * A control that turns nothing red exits 3, never 0:
 *   dates    the September window ends a day early          -> check 1
 *   livehook resumeMatch loses its break hook               -> check 1
 *   nextentry a break fires off the next entry's date, not my next match's
 *            (a bye before a window then carries it into the match) -> check 1
 *   nocost   a break takes no fitness                       -> check 2
 *   norest   the assistant never rests anybody              -> check 3
 *   anyone   a man with no known country is called as well   -> check 4
 *   oldsave  a save with no block is given one on the spot   -> check 5
 *   writexi  the rest is not written into the picked eleven  -> check 6
 *   restfill a gap in the eleven may be filled by a rested man -> check 6
 *   repick   a rested man picked back by hand is still benched -> check 6
 *   endrest  the rested men are not put back after the match  -> check 6
 *   near     the long trip cost goes to the short trips       -> check 7
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
const SEED_BASE = Math.max(0, Number(process.env.SEED_BASE ?? 0));
/* Bands, set from the measured headroom written in the header. */
const GAP_FLOOR = 1.5;
const KIND_FLOOR = { sepoct: 2.0, nov: 1.4, mar: 0.6 };
const REC_FLOOR = 0.40;
const FAR_FLOOR = 5;

/* Each control rewrites one line of the module, or of the engine where the
   hook it guards lives (file: 'engine'). */
const CONTROLS = {
  livehook: {
    file: 'engine',
    fixed: "  /* Round 978: same hook as the quick sim's, see playNextEntry. */\n  runIntlBreaks(state);\n",
    broken: "  /* Round 978: same hook as the quick sim's, see playNextEntry. */\n",
  },
  nextentry: {
    fixed: 'const nextKey = dateKey(dates[backWeek]);',
    broken: 'const nextKey = dateKey(dates[state.week]);',
  },
  restfill: {
    file: 'engine',
    fixed: 'p = best(open.filter(x => !resting.has(x.id))) ?? best(open);',
    broken: 'p = best(open);',
  },
  repick: {
    file: 'engine',
    fixed: 'if (!p || !isAvailable(p) || used.has(p.id)) {',
    broken: 'if (!p || !isAvailable(p) || used.has(p.id) || resting.has(p.id)) {',
  },
  writexi: {
    fixed: '    xiIds: applied.xiIds,\n',
    broken: '    xiIds: state.xiIds,\n',
  },
  endrest: {
    fixed: '    state.xiIds = state.xiIds.map((id, i) => (i === s.slot ? s.out : id));\n',
    broken: '',
  },
  near: {
    fixed: 'const far = !!home && !!theirs && theirs !== home;',
    broken: 'const far = !!home && !!theirs && theirs === home;',
  },
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

/* ---- a control rewrites its file as the bundler loads it, never on disk ---- */
const ENGINE = `${ROOT}/src/lib/clubManager.ts`;
const norm = p => p.replaceAll('\\', '/').toLowerCase();
let patched = null;
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  if (!c) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
  const file = c.file === 'engine' ? ENGINE : MODULE;
  const src = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  if (src.split(c.fixed).length !== 2) {
    console.error(`control cannot run: ${path.basename(file)} does not hold exactly one copy of the line SIM_CMINTL_CONTROL=${CONTROL} rewrites`);
    process.exit(2);
  }
  patched = { path: norm(file), contents: src.replace(c.fixed, c.broken) };
  console.log(`CONTROL ${CONTROL}: one line of ${path.basename(file)} rewritten, its check must go red`);
}

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
    b.onLoad({ filter: /clubManager(Internationals)?\.ts$/ }, args => {
      if (!patched || norm(args.path) !== patched.path) return undefined;
      patched.loaded = true;
      return { contents: patched.contents, loader: 'ts' };
    });
  },
};
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE,
  logLevel: 'error', jsx: 'automatic', alias: { '@': `${ROOT}/src` }, plugins: [swap],
});
if (patched && !patched.loaded) { console.error(`control ${CONTROL}: the rewritten file never reached the bundle`); process.exit(2); }
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
    /* Whether his country plays on another continent from the club, worked
       out here from the two confederations rather than read off the call up. */
    const home = intl.clubConfed(st);
    const theirs = intl.confedOfNation(c.nation);
    everyCall.push({
      name: c.name, nation: c.nation, eraId: st.eraId, made: !p || !!p.generated || (p.isYouth && /\(Youth\)/.test(p.name)),
      cost: c.cost, starts: c.starts, four: last.windowId.endsWith('sepoct'), far: home && theirs ? theirs !== home : null,
    });
  }
};

/* ---------- 1. The dates ---------- */
console.log('1) The window rule against the verified dates, and a played season firing each window once, in order');
{
  let pinned = 0;
  const seasonWindows = y => [...intl.intlWindowsFor(y), ...intl.intlWindowsFor(y - 1)];
  for (const [id, v] of Object.entries(intl.VERIFIED_WINDOWS)) {
    const w = seasonWindows(Number(id.slice(0, 4))).find(x => x.id === id);
    if (!w) { fail(`${id} is verified but the rule has no such window`); continue; }
    if (key(w.start) !== key(v.start) || key(w.end) !== key(v.end)) {
      fail(`${id}: the rule says ${key(w.start)} to ${key(w.end)}, the sources say ${key(v.start)} to ${key(v.end)}`);
    } else pinned += 1;
    if (!w.verified) fail(`${id} is verified but reads as approximate`);
  }
  for (const y of [2005, 2010, 2015, 2020, 2027, 2028]) if (intl.intlWindowsFor(y).some(w => w.verified)) fail(`${y} reads as confirmed dates`);
  console.log(`   ${pinned} verified windows held to the rule`);
  if (pinned < 2) fail(`only ${pinned} verified windows were checked`);

  /* Played on the LIVE path, the one the screen uses: every match stops at
     the interval and is finished by resumeMatch, whose hook is the one a
     player normally hits. The MLS clubs play 15 club conferences with a bye
     every round, so the last entry before a window is sometimes not theirs. */
  const playLive = st => {
    const res = cm.playNextEntry(st);
    return res.kind === 'halftime' ? cm.resumeMatch(res.state) : res;
  };
  let missed = 0, ordered = 0, notes = 0, seasons = 0;
  for (const club of ['Arsenal', 'Inter Miami', 'LA Galaxy', 'Toronto FC', 'Seattle Sounders', 'Atlanta United', 'Columbus Crew']) {
    a = 4242;
    let s = cm.startCareer(club);
    const year = cal.worldYearOf(s);
    const dates = cal.dateOfEntries(year, s.calendar);
    const mine = w => { const e = s.calendar[w]; return e.type !== 'window' && cm.entryInvolvesMe(s, e) && !!cm.fixtureFor(s, e); };
    let fired = [], lastMatch = 0, guard = 0;
    while (s.week < s.calendar.length && guard++ < 200) {
      const before = (s.intl?.fired ?? []).length;
      const res = playLive(s);
      s = res.state;
      if (res.kind === 'match') lastMatch = key(dates[s.week - 1]);
      if (res.kind === 'seasonOver') break;
      const now = s.intl?.fired ?? [];
      if (now.length === before) continue;
      noteCalls(s);
      const last = s.intl.last;
      for (const id of now.slice(before)) {
        const w = intl.intlWindowsFor(year).find(x => x.id === id);
        if (!w) { fail(`${club}: fired an unknown window ${id}`); continue; }
        fired.push(id);
        let prevMine = -1;
        for (let i = last.atWeek - 1; i >= 0; i--) if (mine(i)) { prevMine = i; break; }
        const prev = prevMine >= 0 ? key(dates[prevMine]) : 0;
        const back = last.backWeek >= 0 ? key(dates[last.backWeek]) : Infinity;
        if (prev < key(w.start) && key(w.start) <= back) ordered += 1;
        else fail(`${club} ${id} fired between my matches of ${prev} and ${back}, its first day is ${key(w.start)}`);
      }
      if (last.backWeek >= 0 && (s.week > last.backWeek || s.live?.week === last.backWeek)) missed += 1;
      const note = (s.inbox ?? []).find(m => m.kind === 'intlDuty' && m.text.includes(`International break: the window runs ${last.label},`));
      if (last.called.length) {
        if (!note) fail(`${club} ${last.windowId}: ${last.called.length} went and the inbox says nothing`);
        else if (last.called.every(c => note.text.includes(c.name))) notes += 1;
        else fail(`${club} ${last.windowId}: the note leaves somebody out`);
      }
    }
    const want = intl.intlWindowsFor(year).filter(w => key(w.start) <= lastMatch).map(w => w.id);
    if (club === 'Arsenal' && want.length !== 3) fail(`Arsenal's season reached ${want.length} windows, the season holds 3`);
    if (JSON.stringify(fired) !== JSON.stringify(want)) fail(`${club} fired ${fired.join(', ') || 'nothing'}, its matches reach ${want.join(', ')}`);
    console.log(`   ${club} ${year}: fired ${fired.join(', ') || 'nothing'}`);
    seasons += 1;
  }
  console.log(`   ${seasons} seasons on the live path: ${ordered} breaks between the right two matches of mine, ${notes} notes naming everyone, ${missed} where the match they come back for kicked off in the same play as the note`);
  if (missed > 0) fail(`${missed} breaks reached the match they come back for in the same play, so the manager never got to answer`);
}

/* ---------- 2 and 3. The forks ---------- */
const HEAVY = ['Arsenal', 'Manchester City', 'Real Madrid', 'Liverpool', 'Chelsea', 'Bayern Munich'];
const rows = [];
let missedAll = 0;
const restCheck = { rested: 0, playing: 0, picked: 0, repicks: 0, repickPlays: 0, swaps: 0, returned: 0, lingering: 0 };
/** My first match after week w, or -1. */
const myNextAfter = (st, w) => {
  for (let i = w + 1; i < st.calendar.length; i++) {
    const e = st.calendar[i];
    if (e.type !== 'window' && cm.entryInvolvesMe(st, e) && cm.fixtureFor(st, e)) return i;
  }
  return -1;
};
for (const club of HEAVY) {
  for (let seed = SEED_BASE + 1; seed <= SEED_BASE + SEEDS; seed++) {
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
      /* REST: answered the way a player answers, through the inbox note. */
      let restIn = clone(s);
      const note = (restIn.inbox ?? []).find(m => m.kind === 'intlDuty' && !m.resolved);
      const restIdx = note ? note.options.findIndex(o => o.effect === 'restIntl') : -1;
      if (restIdx >= 0) restIn = cm.answerMessage(restIn, note.id, restIdx);
      const rest = toBack(restIn);
      /* 6. The rest is what plays, on every screen, and it ends. */
      const r = rest.intl?.rest;
      if (r && r.week === back) {
        const xi = new Set(cm.effectiveXIWithSlots(rest).map(x => x.p.id));
        const cover = rest.squad.some(p => cm.isAvailable(p) && !xi.has(p.id) && !r.ids.includes(p.id));
        for (const id of r.ids) {
          restCheck.rested += 1;
          if (xi.has(id) && cover) restCheck.playing += 1;
          if (rest.xiIds.includes(id)) restCheck.picked += 1;
        }
        for (const sw of r.swaps ?? []) {
          const out = rest.squad.find(p => p.id === sw.out);
          if (!out || !cm.isAvailable(out)) continue;
          restCheck.repicks += 1;
          const again = clone(rest);
          again.xiIds[sw.slot] = sw.out;
          if (cm.effectiveXIWithSlots(again).some(x => x.p.id === sw.out)) restCheck.repickPlays += 1;
        }
      }
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
      const rest2 = toNext(rest);
      /* After the match they came back for, the rested men are back in their slots. */
      if (r && r.week === back) {
        for (const sw of r.swaps ?? []) {
          restCheck.swaps += 1;
          if (rest2.xiIds.includes(sw.out)) restCheck.returned += 1;
        }
        if (rest2.intl?.rest) restCheck.lingering += 1;
      }
      rows.push({
        club, seed, kind: s.intl.last.windowId.split('-')[1], called: s.intl.last.called.length,
        off: cm.matchStrengthNow(off), start: cm.matchStrengthNow(start), rest: cm.matchStrengthNow(rest),
        off2: held(off2), start2: held(toNext(start)), rest2: held(rest2),
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
    console.log(`   ${kind.padEnd(7)} ${String(list.length).padStart(2)} breaks, gap ${f2(g)} (floor ${KIND_FLOOR[kind]})`);
    if (!list.length) fail(`no ${kind} break was measured`);
    else if (g < KIND_FLOOR[kind]) fail(`the ${kind} break costs only ${f2(g)}, floor ${KIND_FLOOR[kind]}`);
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

console.log('6) A rest is what plays: the rested men are out of your picked eleven, nobody fills a gap with them, picking one back plays him, and they return after the match');
{
  const c = restCheck;
  console.log(`   ${c.rested} men rested: ${c.playing} still played with cover on the bench, ${c.picked} still in the picked eleven; ${c.repickPlays} of ${c.repicks} picked back by hand played; ${c.returned} of ${c.swaps} back in their slot after the match, ${c.lingering} rests still standing after it`);
  if (c.rested < 20) fail(`only ${c.rested} rested men were checked`);
  if (c.playing > 0) fail(`${c.playing} rested men played the match they were told they sit out, with fitter cover on the bench`);
  if (c.picked > 0) fail(`${c.picked} rested men were still in the picked eleven the tactics screen shows`);
  if (c.repicks < 10) fail(`only ${c.repicks} hand picks were tried`);
  else if (c.repickPlays < c.repicks) fail(`${c.repicks - c.repickPlays} rested men picked back into the eleven by hand still did not play`);
  if (c.swaps < 10) fail(`only ${c.swaps} handed over slots were checked`);
  else if (c.returned < c.swaps) fail(`${c.swaps - c.returned} rested men were not back in the eleven after the match`);
  if (c.lingering > 0) fail(`${c.lingering} rests outlived their match`);
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


/* ---------- 7. The long trips cost more ---------- */
console.log('7) A man who started for a country on another continent from his club comes back more tired than one who stayed on his own');
{
  const starters = everyCall.filter(c => c.starts && c.far !== null);
  let gaps = 0, sum = 0;
  for (const four of [true, false]) {
    const far = starters.filter(c => c.four === four && c.far);
    const near = starters.filter(c => c.four === four && !c.far);
    const m = l => l.reduce((x, c) => x + c.cost, 0) / l.length;
    if (far.length < 5 || near.length < 5) continue;
    console.log(`   ${four ? 'four game window' : 'two game windows'}: far starters ${far.length} cost ${f2(m(far))}, near starters ${near.length} cost ${f2(m(near))}`);
    gaps += 1;
    sum += m(far) - m(near);
  }
  const gap = gaps ? sum / gaps : 0;
  console.log(`   the long trip costs ${f2(gap)} more fitness on average (floor ${FAR_FLOOR})`);
  if (gaps < 2) fail(`only ${gaps} window kinds had enough far and near starters to compare`);
  else if (gap < FAR_FLOOR) fail(`a long trip costs only ${f2(gap)} more than a short one, floor ${FAR_FLOOR}`);
}

if (failures > 0) {
  console.error(`simCmInternationals: ${failures} FAILURES${CONTROL ? ` (control ${CONTROL})` : ''}`);
  process.exit(1);
}
/* A control that changed nothing is a broken guard, never a pass. */
if (CONTROL) {
  console.error(`simCmInternationals: control ${CONTROL} did NOT fire, so its check guards nothing`);
  process.exit(3);
}
console.log('simCmInternationals: all green');
