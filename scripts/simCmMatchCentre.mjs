/* Club Manager: the match centre's numbers and the event timeline.

   Round 714, master spec sections 43 (match center) and 45 (event timeline).

   The round added keeper saves to the stats block (both keepers), both
   dugouts' yellow cards, red cards and substitutions, and a timeline on the
   report that the report card finally draws, with rows for the chances
   (shots off target, saves, penalties given) and the corners the engine had
   been committing since Round 504 without ever listing them. The rule all of
   it sits under is the viewer's oldest one: the screen never lies about the
   sim. So every number here is COUNTED off events the engine committed, and
   this harness counts them again by hand and holds the engine and both
   screens to that count.

   What is deliberately not here, because the sim does not produce it:
   offsides, passes, tackles, interceptions, and "big chances" beyond the
   penalty. src/lib/clubManagerMatchCentre.ts says why. Section 5 fences it:
   no stat label on either screen names one of them, so a later round cannot
   print a number the engine never drew without this going red first.

   Sections, on the real engine and the real components (react-dom/server):
     1) Stats equal the committed play. Keeper saves counted by hand off the
        play list at the whistle, and saves plus goals conceded equals the
        other side's shots on target. Bookings and changes counted by hand
        off the report's own card and sub lines. Live matches too, at the
        20th and the 70th minute: liveStatsAt and cardsAndSubsAt against the
        hand count at that minute.
     2) The timeline equals the committed play. Every shot off target, save,
        corner and penalty in the play list has exactly one row of its kind,
        side, minute and man, and no such row exists without one. A penalty
        row comes before the goal or save it led to. Goals, cards and subs
        rows are the scorer, card and sub lines one for one.
     3) The report screen equals the engine. (a) Every stat bar on the card
        prints the report's own number, both sides. (b) The timeline on the
        card is timelineRows(detail, 'key') row for row (kind, side, clock),
        the key view is the full timeline minus shots off target and corners
        exactly, the toggle says how many more, and the clock rows read
        45+n' and 90+m' off the report's own board.
     4) The live screen equals the engine. The live strip's saves, yellows,
        reds and subs at the 20th and the 70th minute are liveStatsAt and
        cardsAndSubsAt at that minute (section 1 holds those to the hand
        count), and at the whistle they are the report's own.
     5) Nothing the sim does not model is shown: no offsides, passes,
        tackles, interceptions or big chances label on either screen.

   Negative controls (house rule: prove each check can fail, and fail on its
   own check only). Each refuses to run if its rewrite found nothing.
     CM_CENTRE_CONTROL=savesgoals   the engine counts goals as saves.
                                    Section 1 must go red, and only 1.
     CM_CENTRE_CONTROL=phantomrow   the engine writes every shot off target
                                    as a save row. Section 2, only.
     CM_CENTRE_CONTROL=screenlies   the report card prints the two keepers'
                                    saves the wrong way round. Section 3a, only.
     CM_CENTRE_CONTROL=screendrop   the card's timeline drops the save rows.
                                    Section 3b, only.
     CM_CENTRE_CONTROL=livestale    the live strip counts the whole match's
                                    cards and subs, not the ones so far.
                                    Section 4, only.
     CM_CENTRE_CONTROL=offsides     the report card grows an Offsides bar
                                    out of thin air. Section 5, only.

   Measured with every control, 2026-09-30: each went red on its own check
   and left every other check green.

   Floors, measured on this harness's own seed and on SIM_SEED=1, 2, 3
   (2026-09-30): see the THRESHOLDS block below.

   Run: node scripts/simCmMatchCentre.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.CM_CENTRE_CONTROL || '';
const CONTROLS = { savesgoals: '1', phantomrow: '2', screenlies: '3a', screendrop: '3b', livestale: '4', offsides: '5' };
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`CM_CENTRE_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
const lf = s => s.replaceAll('\r\n', '\n');

/* ---- THRESHOLDS, each from measured headroom ----
   Measured 2026-09-30 on this harness's own seed and SIM_SEED 1, 2 and 3
   (four different walks); each floor is at or under half the lowest seen.
     reports checked (1, 2, 3)            144 on all four                 floor 70
     live matches checked (1, 4)          20 on all four                  floor 10
     saves a match, both keepers (1)      7.47 to 7.67                    floor 3.5
     save rows on the timelines (2)       1075 to 1105                    floor 500
     corner rows (2)                      1819 to 1886                    floor 900
     penalty rows (2)                     51 to 59                        floor 20
     live strips with a booking or
       change still to come (4)           23 to 30                        floor 10
   The floors are there so a walk that quietly shrinks, or a timeline that
   stops carrying a kind, cannot pass for want of material. */
const T = { minReports: 70, minLive: 10, minSavesPerMatch: 3.5, minSaveRows: 500, minPenaltyRows: 20, minCornerRows: 900, minMovedLater: 10 };

/* The node_modules that holds react and esbuild, found by walking up, so a
   worktree inside the repo resolves the main one the way node itself does. */
function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'react', 'package.json')) && fs.existsSync(path.join(nm, 'esbuild', 'package.json'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) { console.error(`no node_modules with react and esbuild above ${ROOT}`); process.exit(2); }
    d = up;
  }
}
const NM = modulesDir();

/* ---- failures, attributed to the check they fell in ---- */
let check = '';
const failedIn = new Map();
const fail = m => {
  const n = (failedIn.get(check) ?? 0) + 1;
  failedIn.set(check, n);
  if (n <= 8) console.error(`  FAIL [${check}]: ${m}`);
  else if (n === 9) console.error(`  FAIL [${check}]: (further failures in this check not printed)`);
};
const begin = (id, title) => { check = id; console.log(`${id}) ${title}`); };
const J = v => JSON.stringify(v);

/* ---- the controls: source rewrites applied at bundle time, never on disk ---- */
const FILES = {
  engine: path.join(ROOT, 'src', 'lib', 'clubManager.ts'),
  card: path.join(ROOT, 'src', 'components', 'club-manager', 'MatchReportCard.tsx'),
  timeline: path.join(ROOT, 'src', 'components', 'club-manager', 'MatchTimeline.tsx'),
  live: path.join(ROOT, 'src', 'components', 'club-manager', 'LiveSimScreen.tsx'),
};
const EDITS = {
  savesgoals: ['engine', "  const savedOf = (e: PlayEvent): boolean => e.kind === 'shot' && !!e.on && !e.goal;\n",
    "  const savedOf = (e: PlayEvent): boolean => e.kind === 'shot' && (!!e.on || !!e.goal);\n"],
  phantomrow: ['engine', "kind: e.on ? 'save' : 'shot', text: e.who,", "kind: 'save', text: e.who,"],
  screenlies: ['card', '<StatBar label="Keeper saves" mine={stats.saves} theirs={stats.oppSaves} />',
    '<StatBar label="Keeper saves" mine={stats.oppSaves} theirs={stats.saves} />'],
  screendrop: ['timeline', "const rows = timelineRows(detail, all ? 'all' : 'key');",
    "const rows = timelineRows(detail, all ? 'all' : 'key').filter(r => r.kind !== 'save');"],
  livestale: ['live', 'if (liveNow) return cardsAndSubsAt(liveLines(liveNow), minute);',
    'if (liveNow) return cardsAndSubsAt(liveLines(liveNow), 999);'],
  offsides: ['card', '      <StatBar label="Fouls" mine={stats.fouls} theirs={stats.oppFouls} />\n',
    '      <StatBar label="Fouls" mine={stats.fouls} theirs={stats.oppFouls} />\n      <StatBar label="Offsides" mine={2} theirs={1} />\n'],
};
const overrides = new Map();
if (CONTROL) {
  const [which, from, to] = EDITS[CONTROL];
  const src = lf(fs.readFileSync(FILES[which], 'utf8'));
  if (!src.includes(from)) {
    console.error(`control cannot run: ${path.basename(FILES[which])} is not in the shape CM_CENTRE_CONTROL=${CONTROL} rewrites (${from.slice(0, 70)}...)`);
    process.exit(2);
  }
  const out = src.replace(from, to);
  if (out === src) { console.error(`control ${CONTROL} changed nothing`); process.exit(2); }
  overrides.set(path.resolve(FILES[which]).toLowerCase(), out);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}; check ${CONTROLS[CONTROL]} must go red, and no other check`);
}

/* ---- one bundle: the engine, the helpers and the two match screens ---- */
const ENTRY = `${TMP}/cmMatchCentre.${process.pid}.entry.mjs`;
const BUNDLE = `${TMP}/cmMatchCentre.${process.pid}.bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as cm from '${ROOT_URL}/src/lib/clubManager.ts';
export * as mc from '${ROOT_URL}/src/lib/clubManagerMatchCentre.ts';
export { MatchReportCard } from '${ROOT_URL}/src/components/club-manager/MatchReportCard.tsx';
export { LiveSimScreen } from '${ROOT_URL}/src/components/club-manager/LiveSimScreen.tsx';
import React from '${NM}/react/index.js';
import { renderToStaticMarkup } from '${NM}/react-dom/server.node.js';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
const esbuild = createRequire(`${NM}/`)('esbuild');
await esbuild.build({
  entryPoints: [ENTRY],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  alias: { '@': `${ROOT_URL}/src` },
  outfile: BUNDLE,
  logLevel: 'error',
  plugins: [{
    name: 'control',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        const hit = overrides.get(path.resolve(args.path).toLowerCase());
        if (hit === undefined) return undefined;
        return { contents: hit, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
      });
    },
  }],
});
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { cm, mc, MatchReportCard, LiveSimScreen, render } = createRequire(import.meta.url)(BUNDLE);
for (const f of [ENTRY, BUNDLE]) fs.rmSync(f, { force: true });
for (const name of ['startCareer', 'playNextEntry', 'resumeMatch', 'startSecondHalf', 'changeLive', 'markLiveMinute', 'benchForHalftime', 'liveStatsAt']) {
  if (cm[name] === undefined) { console.error(`the engine does not export ${name}`); process.exit(2); }
}
for (const name of ['cardsAndSubsAt', 'liveLines', 'reportLines', 'timelineRows', 'ALL_VIEW_ONLY']) {
  if (mc[name] === undefined) { console.error(`clubManagerMatchCentre does not export ${name}`); process.exit(2); }
}
const { startCareer, playNextEntry, resumeMatch, startSecondHalf, changeLive, markLiveMinute, benchForHalftime, liveStatsAt } = cm;

/* ---- reading a rendered screen ---- */
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&#x2F;': '/' };
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/&[a-zA-Z#0-9x]+;/g, m => ENTITIES[m] ?? ' ').replace(/\s+/g, ' ').trim();
const unescape = s => s.replace(/&[a-zA-Z#0-9x]+;/g, m => ENTITIES[m] ?? m);
/** Every stat bar on the report card: label to the two numbers it prints. */
function statBars(html) {
  const out = new Map();
  const rx = /data-cm-stat="([^"]*)"[\s\S]*?data-cm-stat-n="mine"[^>]*>([^<]*)<[\s\S]*?data-cm-stat-n="theirs"[^>]*>([^<]*)</g;
  let m;
  while ((m = rx.exec(html))) out.set(unescape(m[1]), { mine: m[2].trim(), theirs: m[3].trim() });
  return out;
}
/** Every cell of the live strip: label to the two values it prints. */
function liveCells(html) {
  const out = new Map();
  const rx = /data-cm-live-stat="([^"]*)"[^>]*><span[^>]*>([^<]*)<\/span><span[^>]*>[^<]*<\/span><span[^>]*>([^<]*)<\/span>/g;
  let m;
  while ((m = rx.exec(html))) out.set(unescape(m[1]), { mine: m[2].trim(), theirs: m[3].trim() });
  return out;
}
/** The timeline rows on the card, in order. */
function timelineShown(html) {
  const out = [];
  const rx = /<li[^>]*data-cm-tl="([^"]*)"([^>]*)>/g;
  let m;
  while ((m = rx.exec(html))) {
    const side = (m[2].match(/data-cm-tl-side="([^"]*)"/) ?? [])[1] ?? 'none';
    const clock = unescape((m[2].match(/data-cm-tl-clock="([^"]*)"/) ?? [])[1] ?? '');
    out.push({ kind: m[1], side, clock });
  }
  return out;
}

/* ---- counting by hand ---- */
function handStats(play, upTo) {
  const at = play.filter(e => e.minute <= upTo);
  const saved = side => at.filter(e => e.side === side && e.kind === 'shot' && e.on && !e.goal).length;
  const onT = side => at.filter(e => e.side === side && e.kind === 'shot' && (e.on || e.goal)).length;
  const goals = side => at.filter(e => e.side === side && e.kind === 'shot' && e.goal).length;
  return { saves: saved('opp'), oppSaves: saved('me'), onTarget: onT('me'), oppOnTarget: onT('opp'), goals: goals('me'), oppGoals: goals('opp') };
}
function handCounts(lines, upTo) {
  const n = (xs, f = () => true) => xs.filter(x => x.minute <= upTo && f(x)).length;
  return {
    yellows: n(lines.cards, c => c.kind === 'yellow'), oppYellows: n(lines.oppCards, c => c.kind === 'yellow'),
    reds: n(lines.cards, c => c.kind === 'red'), oppReds: n(lines.oppCards, c => c.kind === 'red'),
    subs: n(lines.subs), oppSubs: n(lines.oppSubs),
  };
}
const endOf = d => (d.et ? d.et.to : 90);

/* ---- the material: a walk of quick sims, and live matches paused and resumed ---- */
const CLUBS = ['Arsenal', 'Barcelona', 'Brentford', 'Bayern Munich'];
const reports = [];   // { report, club, state }
const lives = [];     // { club, at20, at70, report, final }
for (const club of CLUBS) {
  let state = startCareer(club);
  let guard = 0;
  let liveTaken = 0;
  while (state.week < state.calendar.length && guard < 60 && reports.filter(r => r.club === club).length < 36) {
    guard += 1;
    /* Every seventh match day is played live, the rest quick simmed. */
    const goLive = liveTaken < 5 && guard % 7 === 3;
    const res = playNextEntry(state, goLive ? undefined : { skipHalftime: true });
    if (res.kind === 'seasonOver') break;
    if (res.kind === 'halftime' && res.state.live) {
      const ht = res.state;
      const at20 = markLiveMinute(ht, 20);
      let s2 = startSecondHalf(ht);
      if (!s2) { fail(`${club}: startSecondHalf returned null`); state = resumeMatch(ht).state; continue; }
      /* A change at the hour, so the live match carries a sub of mine on the clock. */
      const out = s2.live.onPitch[s2.live.onPitch.length - 1];
      const bench = benchForHalftime(s2);
      if (out && bench.length) s2 = changeLive(s2, 60, { kind: 'sub', outId: out, inId: bench[0].id }) ?? s2;
      const at70 = markLiveMinute(s2, 70);
      const fin = resumeMatch(s2);
      state = fin.state;
      if (fin.report?.detail) {
        lives.push({ club, at20, at70, report: fin.report });
        reports.push({ report: fin.report, club, state });
        liveTaken += 1;
      }
      continue;
    }
    state = res.state;
    if (res.kind === 'match' && res.report?.detail) reports.push({ report: res.report, club, state });
  }
}
console.log(`material: ${reports.length} reports (${lives.length} of them played live) at ${CLUBS.join(', ')}`);

/* ---------- 1. stats equal the committed play ---------- */
begin('1', 'Stats equal the committed play: keeper saves off the play list, bookings and changes off their lines');
let savesSeen = 0;
{
  for (const { report: r, club } of reports) {
    const d = r.detail;
    const ctx = `${club}: ${r.home} ${r.homeGoals}-${r.awayGoals} ${r.away}`;
    const h = handStats(d.play ?? [], endOf(d));
    if (d.stats.saves !== h.saves) fail(`${ctx}: my keeper made ${h.saves} saves by the play list, the stats say ${d.stats.saves}`);
    if (d.stats.oppSaves !== h.oppSaves) fail(`${ctx}: their keeper made ${h.oppSaves} saves by the play list, the stats say ${d.stats.oppSaves}`);
    if (h.saves + h.oppGoals !== d.stats.oppOnTarget) fail(`${ctx}: my saves ${h.saves} plus goals conceded ${h.oppGoals} is not their ${d.stats.oppOnTarget} on target`);
    if (h.oppSaves + h.goals !== d.stats.onTarget) fail(`${ctx}: their saves ${h.oppSaves} plus my goals ${h.goals} is not my ${d.stats.onTarget} on target`);
    savesSeen += h.saves + h.oppSaves;
    const lines = mc.reportLines(d);
    if (!lines) { fail(`${ctx}: a report from this build did not record the other dugout`); continue; }
    const got = mc.cardsAndSubsAt(lines, endOf(d));
    const want = handCounts(lines, endOf(d));
    if (J(got) !== J(want)) fail(`${ctx}: bookings and changes ${J(got)}, counted by hand ${J(want)}`);
    /* And every line is inside the match, so the whole-match count is every line there is. */
    const all = { cards: d.cards.length, oppCards: d.oppCards.length, subs: d.subs.length, oppSubs: d.oppSubs.length };
    if (got.yellows + got.reds !== all.cards || got.oppYellows + got.oppReds !== all.oppCards || got.subs !== all.subs || got.oppSubs !== all.oppSubs) {
      fail(`${ctx}: the counts ${J(got)} leave out lines the report carries ${J(all)}`);
    }
  }
  for (const L of lives) {
    for (const [minute, s] of [[20, L.at20], [70, L.at70]]) {
      const live = s.live;
      const ctx = `${L.club} live v ${live.opponent} at ${minute}`;
      const play = [...(live.h1Play ?? []), ...(live.h2Play ?? [])];
      const h = handStats(play, minute);
      const st = liveStatsAt(live, minute);
      if (st.saves !== h.saves || st.oppSaves !== h.oppSaves) fail(`${ctx}: liveStatsAt saves ${st.saves}/${st.oppSaves}, by hand ${h.saves}/${h.oppSaves}`);
      const lines = mc.liveLines(live);
      const got = mc.cardsAndSubsAt(lines, minute);
      const want = handCounts(lines, minute);
      if (J(got) !== J(want)) fail(`${ctx}: bookings and changes ${J(got)}, by hand ${J(want)}`);
    }
  }
  if (reports.length < T.minReports) fail(`only ${reports.length} reports, floor ${T.minReports}`);
  if (lives.length < T.minLive) fail(`only ${lives.length} live matches, floor ${T.minLive}`);
  const perMatch = savesSeen / Math.max(1, reports.length);
  if (!(perMatch >= T.minSavesPerMatch)) fail(`${perMatch.toFixed(2)} saves a match, floor ${T.minSavesPerMatch}: the count is not reaching the play`);
  console.log(`   ${reports.length} reports and ${lives.length} live matches at 20 and 70: ${savesSeen} saves (${perMatch.toFixed(2)} a match), every one a shot on target that was not a goal, and every booking and change counted off its line`);
}

/* ---------- 2. the timeline equals the committed play ---------- */
begin('2', 'The timeline equals the committed play: every chance, save, corner and penalty once, and nothing else');
const kindTotals = { save: 0, shot: 0, corner: 0, penalty: 0 };
{
  const keyOf = (kind, e) => `${kind}|${e.side}|${e.minute}|${e.who ?? e.text}${kind === 'save' && e.penalty ? '|pen' : ''}`;
  const tally = keys => keys.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map());
  const sameTally = (a, b) => a.size === b.size && [...a].every(([k, n]) => b.get(k) === n);
  for (const { report: r, club } of reports) {
    const d = r.detail;
    const ctx = `${club}: ${r.home} ${r.homeGoals}-${r.awayGoals} ${r.away}`;
    const play = d.play ?? [];
    const want = [];
    for (const e of play) {
      if (e.kind === 'shot') {
        if (e.penalty) want.push(keyOf('penalty', e));
        if (!e.goal) want.push(keyOf(e.on ? 'save' : 'shot', e));
      } else if (e.kind === 'corner') want.push(keyOf('corner', e));
    }
    const rows = d.timeline.filter(e => e.kind === 'save' || e.kind === 'shot' || e.kind === 'corner' || e.kind === 'penalty');
    for (const e of rows) kindTotals[e.kind] += 1;
    const got = rows.map(e => keyOf(e.kind, { side: e.side, minute: e.minute, text: e.text, penalty: e.penalty }));
    if (!sameTally(tally(want), tally(got))) {
      const w = tally(want);
      const g = tally(got);
      const extra = [...g].filter(([k, n]) => (w.get(k) ?? 0) < n).map(([k]) => k);
      const missing = [...w].filter(([k, n]) => (g.get(k) ?? 0) < n).map(([k]) => k);
      fail(`${ctx}: timeline rows with no committed event ${J(extra.slice(0, 3))}, committed events with no row ${J(missing.slice(0, 3))}`);
    }
    /* A penalty comes before what it led to. */
    d.timeline.forEach((e, i) => {
      if (e.kind !== 'penalty') return;
      const next = d.timeline.slice(i + 1).find(x => x.minute === e.minute && x.side === e.side && (x.kind === 'goal' || (x.kind === 'save' && x.penalty)));
      if (!next) fail(`${ctx}: a penalty at ${e.minute} with no goal or save after it at that minute`);
    });
    /* The rows that were there before this round, one for one with their lines. */
    const count = k => d.timeline.filter(e => e.kind === k).length;
    if (count('goal') !== r.myScorers.length + r.oppScorers.length) fail(`${ctx}: ${count('goal')} goal rows for ${r.myScorers.length + r.oppScorers.length} goals`);
    if (count('yellow') + count('red') !== d.cards.length + (d.oppCards ?? []).length) fail(`${ctx}: card rows do not match the card lines`);
    if (count('sub') !== d.subs.length + (d.oppSubs ?? []).length) fail(`${ctx}: sub rows do not match the sub lines`);
    for (let i = 1; i < d.timeline.length; i++) if (d.timeline[i].minute < d.timeline[i - 1].minute) { fail(`${ctx}: timeline out of order at ${i}`); break; }
  }
  if (kindTotals.save < T.minSaveRows) fail(`only ${kindTotals.save} save rows, floor ${T.minSaveRows}`);
  if (kindTotals.corner < T.minCornerRows) fail(`only ${kindTotals.corner} corner rows, floor ${T.minCornerRows}`);
  if (kindTotals.penalty < T.minPenaltyRows) fail(`only ${kindTotals.penalty} penalty rows, floor ${T.minPenaltyRows}`);
  console.log(`   ${reports.length} timelines: ${kindTotals.save} saves, ${kindTotals.shot} shots off target, ${kindTotals.corner} corners and ${kindTotals.penalty} penalties, each one a committed event and none missing`);
}

/* ---------- 3. the report screen equals the engine ---------- */
const htmlOf = new Map();
for (const { report: r, club } of reports) htmlOf.set(r, render(MatchReportCard, { report: r, clubName: club, onContinue: () => {} }));
begin('3a', 'The report card prints the report\'s own numbers on every stat bar');
{
  let bars = 0;
  for (const { report: r, club } of reports) {
    const d = r.detail;
    const ctx = `${club}: ${r.home} ${r.homeGoals}-${r.awayGoals} ${r.away}`;
    const shown = statBars(htmlOf.get(r));
    const c = mc.cardsAndSubsAt(mc.reportLines(d), endOf(d));
    const want = {
      Possession: [`${d.stats.possession}%`, `${100 - d.stats.possession}%`],
      Shots: [d.stats.shots, d.stats.oppShots],
      'On target': [d.stats.onTarget, d.stats.oppOnTarget],
      'Expected goals': [d.stats.xg.toFixed(2), d.stats.oppXg.toFixed(2)],
      Corners: [d.stats.corners, d.stats.oppCorners],
      Fouls: [d.stats.fouls, d.stats.oppFouls],
      'Keeper saves': [d.stats.saves, d.stats.oppSaves],
      'Yellow cards': [c.yellows, c.oppYellows],
      'Red cards': [c.reds, c.oppReds],
      Substitutions: [c.subs, c.oppSubs],
    };
    for (const [label, [mine, theirs]] of Object.entries(want)) {
      const s = shown.get(label);
      if (!s) { fail(`${ctx}: the card has no ${label} bar`); continue; }
      bars += 1;
      if (s.mine !== String(mine) || s.theirs !== String(theirs)) fail(`${ctx}: ${label} reads ${s.mine} v ${s.theirs}, the report says ${mine} v ${theirs}`);
    }
  }
  console.log(`   ${bars} stat bars on ${reports.length} cards, every one the report's own number both sides`);
}
begin('3b', 'The timeline on the card is the report\'s own timeline, row for row');
{
  let rowsShown = 0;
  const allOnly = new Set(mc.ALL_VIEW_ONLY);
  for (const { report: r, club } of reports) {
    const d = r.detail;
    const ctx = `${club}: ${r.home} ${r.homeGoals}-${r.awayGoals} ${r.away}`;
    const html = htmlOf.get(r);
    const shown = timelineShown(html);
    const key = mc.timelineRows(d, 'key');
    const full = mc.timelineRows(d, 'all');
    rowsShown += shown.length;
    /* The screen is the key view, row for row. */
    if (shown.length !== key.length) fail(`${ctx}: ${shown.length} timeline rows on the card, the key view has ${key.length}`);
    else shown.forEach((s, i) => {
      const k = key[i];
      if (s.kind !== k.kind || s.side !== k.side || s.clock !== k.clock) fail(`${ctx}: row ${i} shows ${J(s)}, the report's row is ${J({ kind: k.kind, side: k.side, clock: k.clock })}`);
    });
    /* The key view is the timeline minus shots off target and corners, and nothing else. */
    const wantKey = d.timeline.filter(e => !allOnly.has(e.kind));
    if (wantKey.length !== shown.length) fail(`${ctx}: the card shows ${shown.length} rows, the timeline has ${wantKey.length} outside the full view`);
    if (full.length !== d.timeline.length) fail(`${ctx}: the full view has ${full.length} rows for ${d.timeline.length} timeline events`);
    full.forEach((row, i) => {
      const e = d.timeline[i];
      if (!e || row.kind !== e.kind || row.side !== e.side) fail(`${ctx}: full view row ${i} is ${row.kind}/${row.side}, the timeline's is ${e?.kind}/${e?.side}`);
      else if (e.minute >= 1 && e.kind !== 'halftime' && e.kind !== 'fulltime' && e.kind !== 'extratime' && e.kind !== 'pens' && row.clock !== `${e.minute}'`) fail(`${ctx}: full view row ${i} reads ${row.clock} for minute ${e.minute}`);
    });
    const more = d.timeline.filter(e => allOnly.has(e.kind)).length;
    const toggle = html.match(/data-cm-tl-toggle="1"[^>]*>([\s\S]*?)<\/button>/);
    if (more > 0 && (!toggle || !text(toggle[1]).includes(`(${more} more)`))) fail(`${ctx}: the toggle does not say ${more} more`);
    /* The clock rows, off the report's own board. */
    const ht = shown.find(s => s.kind === 'halftime');
    const ft = shown.find(s => s.kind === 'fulltime');
    if (!ht || ht.clock !== `45+${d.added.h1}'`) fail(`${ctx}: the half time row reads ${ht?.clock}, the board says 45+${d.added.h1}'`);
    const wantFt = d.et ? `${d.et.to}'` : `90+${d.added.h2}'`;
    if (!ft || ft.clock !== wantFt) fail(`${ctx}: the full time row reads ${ft?.clock}, want ${wantFt}`);
  }
  console.log(`   ${rowsShown} rows on ${reports.length} cards, every one the report's own row, the clock rows off the report's own board`);
}

/* ---------- 4. the live screen equals the engine ---------- */
begin('4', 'The live strip prints the saves, bookings and changes so far, never the whole match');
{
  const noop = () => {};
  const props = { clubColor: '#ffffff', onSub: noop, onShape: noop, onTalk: noop, onSecondHalf: noop, onExit: noop, onStartSecondHalf: noop, onStartExtraTime: noop, onChange: noop, onMark: noop };
  let screens = 0;
  let movedLater = 0;
  const read = (html, ctx, want) => {
    const cells = liveCells(html);
    const pairs = { Saves: [want.saves, want.oppSaves], Yellow: [want.yellows, want.oppYellows], Red: [want.reds, want.oppReds], Subs: [want.subs, want.oppSubs] };
    for (const [label, [mine, theirs]] of Object.entries(pairs)) {
      const c = cells.get(label);
      if (!c) { fail(`${ctx}: the live strip has no ${label} cell`); continue; }
      if (c.mine !== String(mine) || c.theirs !== String(theirs)) fail(`${ctx}: ${label} reads ${c.mine} v ${c.theirs}, the engine at this minute says ${mine} v ${theirs}`);
    }
    screens += 1;
  };
  for (const L of lives) {
    for (const [minute, s] of [[20, L.at20], [70, L.at70]]) {
      const live = s.live;
      const ctx = `${L.club} live v ${live.opponent} at ${minute}`;
      const html = render(LiveSimScreen, { ...props, career: s, live, report: null });
      if (!html.includes(`data-cm-live-minute="${minute}"`)) { fail(`${ctx}: the viewer is not at minute ${minute}`); continue; }
      /* Against the engine's own functions at this minute: section 1 holds
         those to the hand count, this one holds the screen to them, so a
         wrong count and a wrong screen each fail in their own place. */
      const st = liveStatsAt(live, minute);
      const lines = mc.liveLines(live);
      read(html, ctx, { saves: st.saves, oppSaves: st.oppSaves, ...mc.cardsAndSubsAt(lines, minute) });
      if (J(handCounts(lines, 999)) !== J(handCounts(lines, minute))) movedLater += 1;
    }
    const d = L.report.detail;
    const html = render(LiveSimScreen, { ...props, career: L.at70, live: null, report: L.report });
    read(html, `${L.club} live at the whistle`, { saves: d.stats.saves, oppSaves: d.stats.oppSaves, ...mc.cardsAndSubsAt(mc.reportLines(d), endOf(d)) });
  }
  /* The minute has to matter somewhere in the sample, or this proves nothing. */
  if (movedLater < T.minMovedLater) fail(`only ${movedLater} live screens had a booking or change still to come (floor ${T.minMovedLater}), too few to tell the minute from the whole match`);
  console.log(`   ${screens} live strips (at 20, at 70, at the whistle), ${movedLater} of them with bookings or changes still to come, every one the engine's count at its minute`);
}

/* ---------- 5. nothing the sim does not model ---------- */
begin('5', 'Nothing the sim does not model is on either screen');
{
  const NOT_MODELLED = /^(offsides?|passes|passing|pass accuracy|tackles?|interceptions?|big chances?|clearances|dribbles|crosses)$/i;
  const labels = new Set();
  for (const { report: r } of reports) for (const l of statBars(htmlOf.get(r)).keys()) labels.add(l);
  const noop = () => {};
  for (const L of lives.slice(0, 3)) {
    const html = render(LiveSimScreen, { career: L.at70, live: L.at70.live, report: null, clubColor: '#fff', onSub: noop, onShape: noop, onTalk: noop, onSecondHalf: noop, onExit: noop, onStartSecondHalf: noop, onStartExtraTime: noop, onChange: noop, onMark: noop });
    for (const l of liveCells(html).keys()) labels.add(l);
  }
  const bad = [...labels].filter(l => NOT_MODELLED.test(l.trim()));
  if (bad.length) fail(`the screens show ${J(bad)}, which the sim does not produce`);
  if (labels.size < 10) fail(`only ${labels.size} stat labels read, the reader is not finding the screens`);
  console.log(`   ${labels.size} stat labels on the two screens (${[...labels].join(', ')}), none of them a number the sim does not draw`);
}

/* ---------- verdict ---------- */
const red = [...failedIn.keys()];
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const own = red.includes(want);
  const others = red.filter(c => c !== want);
  console.log(`control ${CONTROL}: check ${want} ${own ? 'went red' : 'STAYED GREEN'}; other checks red: ${others.length ? others.join(', ') : 'none'}`);
}
if (red.length) {
  console.error(`simCmMatchCentre: FAIL in ${red.map(c => `${c} (${failedIn.get(c)})`).join(', ')}`);
  process.exit(1);
}
console.log('simCmMatchCentre: PASS. Every stat on the report and the live strip is counted off the committed play and lines, and every timeline row is an event the engine drew.');
