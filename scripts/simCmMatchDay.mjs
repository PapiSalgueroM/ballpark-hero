/* Round 1340: Club Manager match days read like a scoreboard.

   What was wrong (the QA hunt, hunt-cm.md cm m3 and cm m5): away at Newcastle the report printed "Newcastle 1 - 5
   Liverpool" with Liverpool's scorers in the left column under Newcastle's name, the stats, the "best" columns and
   the timeline all had my club on the left whatever the venue, and the timeline cut names to "Alexander...". The
   engine writes every report home side first (clubManager.ts playMyMatch, `const iAmHome = fx.home !== false`), so
   after this round every two sided block follows the scoreline, through one rule in src/lib/cmMatchDisplay.ts.

   The material: the REAL engine's matches and the REAL components through react-dom/server. A fleet of careers
   (Liverpool, Celta Vigo and OB in 2026-27, Everton in 2005-06, Barcelona in 2015-16, seeds 0 to 4, one season
   each by quick sim with the coach) plus strong clubs walked until enough finals on a neutral ground are played.
   The fixture is read before each match (nextFixture(state).home) and the report after it.

   Sections
     1) One rule: on every match myClubFirst(fixture.home) equals mineFirstOfReport(report, club), and the report's
        venue says neutral exactly when the fixture's home is null.
     2) The report card: the scoreline's names, the scorer columns, the stats header, the "best" columns, every stat
        bar's numbers, the possession pair, the momentum legend and the shots row are home side first; the first
        scorer column holds the home side's scorer lines; possession sums to 100 with a percent sign each and its
        first number is the home side's share. Every bar's two segments follow its numbers: my green one
        (bg-primary) first exactly when my number is first, and as wide as my share (the fix round after the
        review, whose mutation m2 moved the segments back with every harness green).
     3) The timeline: its header and every row's first cell are the home side's; no name span is cut (truncate);
        every (P) and (O.G) mark sits outside the name span and right after it (Round 1146's promise).
     4) Live and half time: every fifth league match of the fleet, and every match on a neutral ground, is also
        kicked off live and rendered in the first half, at the interval, in the second half and at the whistle;
        and every live frame is rendered again with the venue field taken off, as a save from before the field
        held it, where my club must come first (floors: 5 neutral live matches, 40 staged frames). The strip's names, the score's digits (by
        data-cm-score-of), the interval card, the stats (header, possession, every cell by data-cm-live-stat-n) and
        the line under the pitch are home side first, and HalftimeScreen rendered alone prints its names and score
        in the same order. The possession bar's green segment is mine, first exactly when my number is, as wide
        as my share (the review's mutation m6). On the strip, the interval card and the dressing room's card my
        club's name carries the green (text-primary) and the other club's does not, wherever the two sit (m4).
     5) The Match Centre: matchFacts read before every league match of seed 0's careers and before every neutral
        one, rendered. The tie's two name blocks, the two form rows and the two "Ones to watch" columns (each
        marked data-cm-mc-side) are home side first and each holds its own side's names and form; the odds still
        read Win, Draw, They win, in that order. Floors: 40 home, 40 away, 3 neutral, 40 with ones to watch.
     6) The pitch (Round 1340b): on every live render of section 4 no dot label is empty, begins with a digit or is
        a number; my named man's label is his pitchName or pitchInitials and his dot's label for a screen reader
        holds his whole name and no "number"; a named opponent's label is the pitch name or initials of a man in
        their eleven or on their bench; a nameless opponent's is a slot's role (CB, ST). The fleet's saves all
        carry an eleven, so a nameless side is staged on every live match by taking the eleven off its first
        frame. Floors: 40 pitches, 400 of my men, 200 named and 40 staged nameless opponents.
     7) A home match reads as before: on every home and neutral match the card's visible text, in document order,
        equals the card at MATCHDAY_BASE (the round's files as they were at the base, everything else this tree's),
        with only the board word masked (it now says what the header's meter says); every live frame of a home
        match, and the dressing room alone, reads exactly as at the base but for the pitch labels (masked: section
        6 reads them); and so does every home and neutral
        Match Centre.

   Negative controls (MATCHDAY_CONTROL=...), each asserting its anchor first, printing how often it fired:
     neutralaway  myClubFirst answers false for a neutral ground. Section 1 must go red on every neutral match.
     oldorder     myClubFirst and mineFirstOfReport answer true always, the screens before this round. Sections 2,
                  3, 4 and 5 must go red on away matches and stay green on home and neutral ones.
     truncate     the timeline's name span is cut again. Section 3 must go red.
     numbers      the pitch labels as before Round 1340b, the position number in front. Section 6 must go red.
     homeflip     my club is drawn second at home. Section 7 must go red.
     barorder     the report's stat bars and the live possession bar draw their segments mine first again while
                  their numbers follow the fixture (the review's m2 and m6). Sections 2 and 4 must go red on away
                  matches only, through the segment checks themselves (each must fire at least once).
     neutrallive  the live viewer takes "at home" off the field alone (the review's m3), so a neutral ground and a
                  save from before the field existed are drawn as away. Section 4 must go red on neutral matches
                  and on the staged frames with no venue field, and stay green at home and away.
     greenfirst   the dressing room's card and the strip leave the green on the first name whoever it is (the
                  review's m4). Section 4 must go red on away matches only, through the green checks of the
                  dressing room's card (in the interval stage and alone) and of the strip.

   Exit codes: 0 green, 1 red (or a control that fired), 2 could not run (a fleet under its floors: 100 away,
   100 home and 5 neutral matches, 40 live renders; widen the fleet, never lower a floor), 3 a control that did
   not fire.
   Green is the closing summary line and the real exit code.

   Run: node scripts/simCmMatchDay.mjs     (MATCHDAY_BASE=<commit> overrides the base, default cbc72c1d)
   The base is pinned on purpose: section 7 proves this round left a home match as it was. A later round that
   edits MatchReportCard, MatchTimeline, LiveSimScreen, HalftimeScreen or MatchCentre and changes what a home match
   prints turns section 7 red until MATCHDAY_BASE is moved to that round's own starting commit (say so in its
   gate); and if the base ever stops being reachable (a squash merge), the run exits 2 rather than judging.
   Round 1522 moved the base from d8aaa4cb to 1f2f9ddf, its own commit with its four screens final: it adds a
   Tactics tile to the dressing room and a line naming the other side's style to the Match Centre, so every home
   interval and Match Centre printed more than at d8aaa4cb (r1522-g2: 203 reds, all section 7). With those four
   screens put back to their bc79b526 text on the round's tree, every section is green against d8aaa4cb
   (r1522-md): the round's engine and hook print a home match as before.
   The round's review fixes then moved it from 1f2f9ddf to cbc72c1d, the fixed tree's commit with the five screens
   final (the Match Centre, the picker and the report mark the style as this sim's pick; the live sheet hands its
   tactics panel the clock). Section 7 was green against 1f2f9ddf on that tree as well (r1522-fx4 mdOld), and with
   the four screens back at bc79b526 it is green against d8aaa4cb again (r1522-fx5 mdBuilder).
*/
import './lib/seedRandom.mjs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.MATCHDAY_CONTROL || '';
const CONTROLS = { neutralaway: [1], oldorder: [2, 3, 4, 5], truncate: [3], numbers: [6], homeflip: [7], barorder: [2, 4], greenfirst: [4], neutrallive: [4] };
/* A control that must fire through one particular check names it here: every pattern must match at least one
   failure, so a red from some other check cannot pass for the control firing. */
const CONTROL_KINDS = {
  barorder: [/: the [A-Z][a-z ]* bar's segments/, /: at \w+ the possession bar's segments/],
  greenfirst: [/: the dressing room's card puts the green on/, /: the dressing room's card alone puts the green on/, /: at \w+ the strip puts the green on/],
};
const kindHits = (CONTROL_KINDS[CONTROL] ?? []).map(() => 0);
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`MATCHDAY_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(2); }
const BASE = process.env.MATCHDAY_BASE || 'cbc72c1d';
const lf = s => s.replaceAll('\r\n', '\n');
const cannotRun = m => { console.error(`simCmMatchDay could not run: ${m}`); process.exit(2); };

let section = 0;
const failures = new Map();
const fail = m => {
  (CONTROL_KINDS[CONTROL] ?? []).forEach((rx, k) => { if (rx.test(m)) kindHits[k] += 1; });
  failures.set(section, (failures.get(section) ?? 0) + 1);
  if ((failures.get(section) ?? 0) <= 6) console.error(`  FAIL [${section}]: ${m}`);
};

function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'react', 'package.json')) && fs.existsSync(path.join(nm, 'esbuild'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) cannotRun(`no node_modules with react and esbuild above ${ROOT}`);
    d = up;
  }
}
const NM = modulesDir();

/* ---- the files this round edits: the head's, a control's patched copy, and the base's ---- */
const WORK = `${TMP}/cmMatchDay.${process.pid}`;
fs.mkdirSync(`${WORK}/base`, { recursive: true });
fs.mkdirSync(`${WORK}/head`, { recursive: true });
process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* gone */ } });
const ROUND_FILES = {
  'components/club-manager/MatchReportCard': 'tsx',
  'components/club-manager/MatchTimeline': 'tsx',
  'components/club-manager/LiveSimScreen': 'tsx',
  'components/club-manager/HalftimeScreen': 'tsx',
  'components/club-manager/MatchCentre': 'tsx',
};
const baseCopies = {};
for (const [key, ext] of Object.entries(ROUND_FILES)) {
  let text;
  try {
    text = execFileSync('git', ['show', `${BASE}:src/${key}.${ext}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
  } catch (e) {
    cannotRun(`git show ${BASE}:src/${key}.${ext} failed (${String(e.message).split('\n')[0]})`);
  }
  const p = `${WORK}/base/${path.basename(key)}.${ext}`;
  fs.writeFileSync(p, lf(text));
  baseCopies[key] = p;
}

/* A control patches a copy of one of this round's files; every head import of it reads the copy. */
const PATCHES = {
  neutralaway: [['lib/cmMatchDisplay', 'ts', [['  return home !== false;\n', '  return home === true || home === undefined;\n']]]],
  oldorder: [['lib/cmMatchDisplay', 'ts', [['  return home !== false;\n', '  return true;\n'], ['  return report.home === clubName;\n', '  return true;\n']]]],
  homeflip: [['lib/cmMatchDisplay', 'ts', [['  return home !== false;\n', '  return home !== false && home !== true;\n'], ['  return report.home === clubName;\n', '  return report.home !== clubName;\n']]]],
  truncate: [['components/club-manager/MatchTimeline', 'tsx', [['<span data-cm-tl-name="1" title=', '<span className="truncate" data-cm-tl-name="1" title=']]]],
  /* The review's mutations m2 and m6: the report's stat bars and the live possession bar draw their two segments
     in the old order (mine first) while the numbers above them follow the fixture. */
  barorder: [
    ['components/club-manager/MatchReportCard', 'tsx', [['const [barFirst, barSecond] = inFixtureOrder(mineFirst,', 'const [barFirst, barSecond] = inFixtureOrder(true,']]],
    ['components/club-manager/LiveSimScreen', 'tsx', [['const [barFirst, barSecond] = inFixtureOrder(mineFirst,', 'const [barFirst, barSecond] = inFixtureOrder(true,']]],
  ],
  /* The review's mutation m3: the live viewer reads "at home" off the field and draws a neutral ground, and a
     save from before the field existed, as away. */
  neutrallive: [['components/club-manager/LiveSimScreen', 'tsx', [['const mineFirst = liveNow ? myClubFirst(liveNow.home) :', 'const mineFirst = liveNow ? liveNow.home === true :']]]],
  /* The review's mutation m4 and its twin on the strip: the green is left on the first name and the second name
     stays plain whoever they are, while the names themselves follow the fixture. */
  greenfirst: [
    ['components/club-manager/HalftimeScreen', 'tsx', [
      ["mineFirst ? 'text-primary' : 'text-muted-foreground')}>{nameFirst}", "'text-primary')}>{nameFirst}"],
      ["mineFirst ? 'text-muted-foreground' : 'text-primary')}>{nameSecond}", "'text-muted-foreground')}>{nameSecond}"],
    ]],
    ['components/club-manager/LiveSimScreen', 'tsx', [
      ["const toneFirst = mineFirst ? 'text-primary' : 'text-foreground';", "const toneFirst = 'text-primary';"],
      ["const toneSecond = mineFirst ? 'text-foreground' : 'text-primary';", "const toneSecond = 'text-foreground';"],
    ]],
  ],
  /* The labels before Round 1340b: the position number in front of every name, the number alone in a crowd. */
  numbers: [['components/club-manager/LiveSimScreen', 'tsx', [
    ["{short.has(d.key) && m.name ? pitchInitials(m.name) || m.label : m.label}{m.gen ? '*' : ''}", "{m.number}{m.label && !short.has(d.key) ? ` ${m.label}` : ''}{m.gen ? '*' : ''}"],
    ['{short.has(d.key) && m.name ? pitchInitials(m.name) || m.label : m.label}', "{m.number}{short.has(d.key) ? '' : ` ${m.label}`}"],
  ]]],
};
const headCopies = {};
for (const [key, ext, edits] of PATCHES[CONTROL] ?? []) {
  let text = lf(fs.readFileSync(path.join(ROOT, 'src', `${key}.${ext}`), 'utf8'));
  for (const [from, to] of edits) {
    const n = text.split(from).length - 1;
    if (n !== 1) cannotRun(`MATCHDAY_CONTROL=${CONTROL}: the anchor "${from.trim()}" is in src/${key}.${ext} ${n} times, not once`);
    text = text.replace(from, to);
  }
  const p = `${WORK}/head/${path.basename(key)}.${ext}`;
  fs.writeFileSync(p, text);
  headCopies[key] = p;
}
if (CONTROL) console.log(`NEGATIVE CONTROL ON: ${CONTROL}; section(s) ${CONTROLS[CONTROL].join(' and ')} must go red`);

/* Resolve the @ alias here rather than through esbuild's alias, so a base copy's import of another of this
   round's files reaches the base copy and every other import reaches this tree. */
function resolveSrc(rel) {
  const stem = `${ROOT_URL}/src/${rel}`;
  for (const c of [stem, `${stem}.ts`, `${stem}.tsx`, `${stem}/index.ts`, `${stem}/index.tsx`, `${stem}.js`]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}
const matchday = {
  name: 'matchday',
  setup(build) {
    build.onResolve({ filter: /^@\// }, args => {
      const key = args.path.slice(2);
      const fromBase = args.importer.replaceAll('\\', '/').startsWith(`${WORK}/base/`);
      if (fromBase && baseCopies[key]) return { path: baseCopies[key] };
      if (!fromBase && headCopies[key]) return { path: headCopies[key] };
      const hit = resolveSrc(key);
      return hit ? { path: hit } : { errors: [{ text: `cannot resolve ${args.path}` }] };
    });
  },
};
const ENTRY = `${WORK}/entry.mjs`;
const BUNDLE = `${WORK}/bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as cm from '@/lib/clubManager';
export * as order from '@/lib/cmMatchDisplay';
export { MatchReportCard as HeadCard } from '@/components/club-manager/MatchReportCard';
export { MatchReportCard as BaseCard } from '${baseCopies['components/club-manager/MatchReportCard']}';
export { LiveSimScreen as HeadLive } from '@/components/club-manager/LiveSimScreen';
export { LiveSimScreen as BaseLive } from '${baseCopies['components/club-manager/LiveSimScreen']}';
export { HalftimeScreen as HeadHalf } from '@/components/club-manager/HalftimeScreen';
export { HalftimeScreen as BaseHalf } from '${baseCopies['components/club-manager/HalftimeScreen']}';
export { MatchCentre as HeadCentre } from '@/components/club-manager/MatchCentre';
export { MatchCentre as BaseCentre } from '${baseCopies['components/club-manager/MatchCentre']}';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
const esbuild = createRequire(import.meta.url)(`${NM}/esbuild/lib/main.js`);
try {
  await esbuild.build({
    entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
    outfile: BUNDLE, logLevel: 'error', nodePaths: [NM], plugins: [matchday],
    loader: { '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.woff2': 'empty' },
  });
} catch (e) {
  cannotRun(`the bundle did not build (${String(e.message).split('\n')[0]})`);
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { cm, order, HeadCard, BaseCard, HeadLive, BaseLive, HeadHalf, BaseHalf, HeadCentre, BaseCentre, render } = createRequire(import.meta.url)(BUNDLE);
/* Round 832: a historic era's squads load with the era, so the fleet fetches them all first (simExtraTime does the
   same); without it Everton 2005-06 cannot start. */
await cm.ensureAllEraRosters();

/* ---- a seeded stream per career and per match ---- */
const HOUSE_RANDOM = Math.random;
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function withSeed(seed, fn) {
  Math.random = seeded(seed);
  try { return fn(); } finally { Math.random = HOUSE_RANDOM; }
}

/* ---- the fleet: one season a career, the fixture read before each match and the report after ---- */
const FLEET = [['Liverpool', undefined], ['Celta Vigo', undefined], ['OB', undefined], ['Everton', 'era2005'], ['Barcelona', 'era2015']];
const NEUTRAL_WALK = [['Real Madrid', undefined], ['Man City', undefined], ['Bayern Munich', undefined], ['Barcelona', 'era2015'],
  ['Barcelona', 'era2005'], ['PSG', undefined], ['Inter', undefined], ['Arsenal', undefined]];
const matches = [];
const lives = [];
const centres = [];
let unpaired = 0;
let careersStarted = 0;
/* Every fifth league match of the fleet, and every match on a neutral ground, is also kicked off live, from the same state on a seed of its own (the
   fleet's own walk goes on from its quick sim): a frame in the first half, the interval, the second half and the
   whistle, the way simCmMatchCentre builds its live screens. */
function liveFrames(pre, club, fxHome, seed) {
  return withSeed(seed, () => {
    const res = cm.playNextEntry(pre);
    if (res.kind !== 'halftime' || !res.state.live) return null;
    const ht = res.state;
    const atInterval = structuredClone(ht);
    atInterval.live.minute = 45;
    const s2 = cm.startSecondHalf(ht);
    if (!s2) return null;
    const fin = cm.resumeMatch(s2);
    if (!fin.report) return null;
    return {
      club, fxHome, report: fin.report,
      frames: [
        { stage: 'first', career: cm.markLiveMinute(ht, 20) },
        { stage: 'interval', career: atInterval },
        { stage: 'second', career: cm.markLiveMinute(s2, 70) },
        { stage: 'done', career: fin.state, report: fin.report },
      ],
    };
  });
}
function playSeason(club, era, seed, keep, live = false) {
  let leagueSeen = 0;
  const s0 = withSeed(seed * 7919 + 17, () => { try { return cm.startCareer(club, era); } catch { return null; } });
  if (!s0 || s0.clubName !== club) return false;
  careersStarted += 1;
  let s = s0;
  for (let guard = 1; guard < 200; guard++) {
    let fx = null;
    try { fx = cm.nextFixture(s); } catch { fx = null; }
    /* Section 5's Match Centre: the facts before every league match of seed 0's careers and before every neutral
       one, read off the same state the match is then played from. */
    const wantFacts = fx && fx.kind === 'match' && ((live && seed === 0 && fx.competition === 'league') || fx.home === null);
    const facts = wantFacts ? withSeed(seed * 6007 + guard, () => cm.matchFacts(s)) : null;
    const res = withSeed(seed * 104729 + guard * 31 + 5, () => cm.playNextEntry(s, { skipHalftime: true }));
    if (!res || !res.state) break;
    if (res.kind === 'match' && res.report) {
      const r = res.report;
      const opp = r.home === club ? r.away : r.home;
      if (!fx || fx.kind !== 'match' || fx.opponent !== opp) unpaired += 1;
      else if (keep(fx.home)) {
        matches.push({ club, era: era ?? 'now', seed, fxHome: fx.home, report: r });
        if (facts) centres.push({ club, era: era ?? 'now', seed, fxHome: fx.home, report: r, facts });
        if ((live && fx.competition === 'league' && leagueSeen++ % 5 === 0) || fx.home === null) {
          const L = liveFrames(s, club, fx.home, seed * 7121 + guard * 13 + 3);
          if (L) lives.push({ ...L, era: era ?? 'now', seed });
        }
      }
    }
    s = res.state;
    if (res.kind === 'seasonOver' || s.sacked) break;
  }
  return true;
}
const started = Date.now();
for (const [club, era] of FLEET) {
  for (let seed = 0; seed <= 4; seed++) {
    if (!playSeason(club, era, seed, () => true, true)) cannotRun(`${club} (${era ?? 'now'}) did not start a career`);
  }
}
const neutralCount = () => matches.filter(m => m.fxHome === null).length;
const neutralLiveCount = () => lives.filter(L => L.fxHome === null).length;
const neutralShort = () => neutralCount() < 8 || neutralLiveCount() < 5;
for (let pass = 0; pass < 5 && neutralShort(); pass++) {
  for (const [club, era] of NEUTRAL_WALK) {
    if (!neutralShort()) break;
    playSeason(club, era, 100 + pass, home => home === null);
  }
}
const homeIsMe = m => m.report.home === m.club;
const venueOf = m => (m.prefield ? 'prefield' : m.fxHome === null ? 'neutral' : m.fxHome === false ? 'away' : 'home');
const ctxOf = m => `${m.club} ${m.era} seed ${m.seed}: ${m.report.home} ${m.report.homeGoals}-${m.report.awayGoals} ${m.report.away} (${m.report.compLabel}, ${venueOf(m)})`;
const counts = { home: 0, away: 0, neutral: 0 };
for (const m of matches) counts[venueOf(m)] += 1;
console.log(`fleet: ${careersStarted} careers, ${matches.length} matches (${counts.home} home, ${counts.away} away, ${counts.neutral} neutral), ${unpaired} reports with no fixture read before them, ${((Date.now() - started) / 1000).toFixed(0)}s`);
const liveRenders = lives.length * 4;
console.log(`live: ${lives.length} matches kicked off live (${lives.filter(L => L.fxHome === false).length} away, ${neutralLiveCount()} on a neutral ground), ${liveRenders} live renders`);
if (counts.away < 100 || counts.home < 100 || counts.neutral < 5 || liveRenders < 40) cannotRun(`the fleet is under its floors (100 away, 100 home, 5 neutral, 40 live renders): widen it, never lower a floor`);
/* A report whose opponent is not the one nextFixture named before it (a draw made that same week) cannot be tied
   to a venue, so it is left out and counted; a fleet where that is common cannot judge section 1. */
if (unpaired > matches.length * 0.1) cannotRun(`${unpaired} reports could not be paired with the fixture read before them`);

/* ---- reading a rendered screen ---- */
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&#x2F;': '/' };
const unescape = s => s.replace(/&[a-zA-Z#0-9x]+;/g, m => ENTITIES[m] ?? m);
const visible = html => unescape(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const attrs = (html, name) => [...html.matchAll(new RegExp(`${name}="([^"]*)"`, 'g'))].map(m => m[1]);
/** The two names either side of a header's middle word ("Match stats", "Timeline"), in document order. */
function headerPair(html, middle) {
  const idx = html.indexOf(`>${middle}</span>`);
  if (idx < 0) return null;
  const start = html.lastIndexOf('<div class="flex items-center justify-between', idx);
  const end = html.indexOf('</div>', idx);
  const parts = visible(html.slice(start, end)).split(middle).map(t => t.trim());
  return parts.length === 2 ? parts : null;
}
/** The index just after the </span> that closes the <span> opening at openIdx. */
function spanClose(html, openIdx) {
  const rx = /<span\b[^>]*>|<\/span>/g;
  rx.lastIndex = openIdx;
  let depth = 0;
  let m;
  while ((m = rx.exec(html))) {
    if (m[0] === '</span>') { depth -= 1; if (depth === 0) return rx.lastIndex; } else depth += 1;
  }
  return -1;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cardProps = m => ({ report: m.report, clubName: m.club, onContinue: () => {} });
for (const m of matches) m.html = render(HeadCard, cardProps(m));

/* Each section reads every match and records which matches it found wrong, by venue, so a control can show it
   fired where it should and nowhere else. */
const redBy = {};
function judge(sec, m, problems) {
  section = sec;
  redBy[sec] ??= { home: 0, away: 0, neutral: 0, prefield: 0, checked: 0 };
  redBy[sec].checked += 1;
  if (!problems.length) return;
  redBy[sec][venueOf(m)] += 1;
  for (const p of problems) fail(`${ctxOf(m)}: ${p}`);
}
const sideWord = mine => (mine ? 'mine' : 'theirs');

/* ---------- 1. one rule ---------- */
console.log('1) One rule: the fixture\'s venue and the report\'s own order agree on every match');
let neutralVenues = 0;
for (const m of matches) {
  const p = [];
  const a = order.myClubFirst(m.fxHome);
  const b = order.mineFirstOfReport(m.report, m.club);
  if (a !== b) p.push(`myClubFirst(${m.fxHome}) is ${a} but the report's order says ${b}`);
  const venue = m.report.detail?.venue;
  if (venue !== undefined && (venue === 'neutral') !== (m.fxHome === null)) p.push(`the report's venue is ${venue} for a fixture whose home is ${m.fxHome}`);
  if (venue === 'neutral') neutralVenues += 1;
  judge(1, m, p);
}
console.log(`   ${redBy[1].checked} matches, ${neutralVenues} reports saying neutral; red: ${redBy[1].home} home, ${redBy[1].away} away, ${redBy[1].neutral} neutral`);

/* ---------- 2. the report card ---------- */
console.log('2) The report card: every two sided block in the scoreline\'s order');
let barsRead = 0;
let segsRead = 0;
for (const m of matches) {
  const r = m.report;
  const html = m.html;
  const me = homeIsMe(m);
  const want = [r.home, r.away];
  const first = sideWord(me);
  const p = [];
  const score = [...html.matchAll(/<div class="text-sm font-bold truncate[^"]*">([^<]*)<\/div>/g)].map(x => unescape(x[1]));
  if (!same(score.slice(0, 2), want)) p.push(`the scoreline reads ${score.slice(0, 2).join(' v ')}`);
  if (r.myScorers.length || r.oppScorers.length) {
    const cols = [...html.matchAll(/data-cm-scorer-col="(mine|theirs)"><div[^>]*>([^<]*)<\/div>/g)];
    if (!same(cols.map(c => unescape(c[2])), want)) p.push(`the scorer columns are headed ${cols.map(c => c[2]).join(' and ')}`);
    if (cols[0]?.[1] !== first) p.push(`the first scorer column is ${cols[0]?.[1]}`);
    const i0 = html.indexOf('data-cm-scorer-col="');
    const i1 = html.indexOf('data-cm-scorer-col="', i0 + 10);
    const homeScorers = me ? r.myScorers : r.oppScorers;
    const shown = (html.slice(i0, i1).match(/⚽/g) ?? []).length;
    if (shown !== homeScorers.length) p.push(`the first scorer column lists ${shown} goals, the home side scored ${homeScorers.length}`);
  }
  const d = r.detail;
  if (d) {
    const head = headerPair(html, 'Match stats');
    if (!same(head, want)) p.push(`the stats header reads ${head?.join(' v ')}`);
    for (const part of html.split(/(?=data-cm-stat=")/).slice(1)) {
      const label = /^data-cm-stat="([^"]*)"/.exec(part)?.[1];
      const ns = attrs(part, 'data-cm-stat-n').slice(0, 2);
      barsRead += 1;
      if (ns[0] !== first || ns[1] !== sideWord(!me)) p.push(`the ${label} bar draws ${ns.join(' then ')}`);
      /* The bar under the numbers: its two segments follow the numbers, my green one (bg-primary) first exactly
         when my number is first, and as wide as my share of the two (the StatBar's own sum). */
      const segs = [...part.matchAll(/<div class="([^"]*)" style="width:([^";]*)"><\/div>/g)].slice(0, 2);
      const greenAt = segs.findIndex(s => /(^| )bg-primary( |$)/.test(s[1]));
      segsRead += segs.length;
      if (segs.length !== 2 || greenAt !== (me ? 0 : 1)) p.push(`the ${label} bar's segments draw my green one ${greenAt === 0 ? 'first' : greenAt === 1 ? 'second' : 'nowhere'}`);
      else {
        const numBy = Object.fromEntries([...part.matchAll(/data-cm-stat-n="(mine|theirs)"[^>]*>([^<]*)</g)].slice(0, 2).map(x => [x[1], x[2].trim()]));
        const valueOf = side => (label === 'Expected goals' ? (side === 'mine' ? d.stats.xg : d.stats.oppXg) : Number(String(numBy[side]).replace('%', '')));
        const mine = valueOf('mine');
        const total = mine + valueOf('theirs');
        const share = total > 0 ? (mine / total) * 100 : 50;
        if (segs[greenAt][2] !== `${share}%` || segs[1 - greenAt][2] !== `${100 - share}%`) p.push(`the ${label} bar's segments are ${segs[greenAt][2]} green and ${segs[1 - greenAt][2]} grey where my share is ${share}%`);
      }
      if (label === 'Possession') {
        const nums = [...part.matchAll(/data-cm-stat-n="(?:mine|theirs)"[^>]*>([^<]*)</g)].map(x => x[1].trim());
        const homeShare = me ? d.stats.possession : 100 - d.stats.possession;
        if (!same(nums.slice(0, 2), [`${homeShare}%`, `${100 - homeShare}%`])) p.push(`the possession bar reads ${nums.join(' ')} where the home side had ${homeShare}%`);
      }
    }
    if (attrs(html, 'data-cm-poss')[0] !== first) p.push('the balance of play row is not home side first');
    const legend = attrs(html, 'data-cm-legend');
    if (legend[0] !== first) p.push('the momentum legend is not home side first');
    if (!/data-cm-legend="mine">▲ /.test(html) || !/data-cm-legend="theirs">▼ /.test(html)) p.push('the momentum legend lost its arrows');
    if (attrs(html, 'data-cm-shots')[0] !== first) p.push('the shots row is not home side first');
    if (d.oppRatings?.length && d.myRatings.some(x => x.motm)) {
      const best = [...html.matchAll(/data-cm-best="(mine|theirs)"><div[^>]*>([^<]*) best<\/div>/g)];
      if (!same(best.map(b => unescape(b[2])), want)) p.push(`the best columns are headed ${best.map(b => b[2]).join(' and ')}`);
    }
  }
  judge(2, m, p);
}
console.log(`   ${redBy[2].checked} reports, ${barsRead} stat bars read (${segsRead} bar segments); red: ${redBy[2].home} home, ${redBy[2].away} away, ${redBy[2].neutral} neutral`);

/* ---------- 3. the timeline ---------- */
console.log('3) The timeline: home side first, whole names, every mark right after its name');
let rowsRead = 0;
let marksRead = 0;
let namesRead = 0;
for (const m of matches) {
  const html = m.html;
  if (!html.includes('data-cm-timeline=')) continue;
  const me = homeIsMe(m);
  const p = [];
  const head = headerPair(html, 'Timeline');
  if (!same(head, [m.report.home, m.report.away])) p.push(`the timeline header reads ${head?.join(' v ')}`);
  for (const row of html.matchAll(/<li[^>]*data-cm-tl-side="(me|opp)"[^>]*>([\s\S]*?)<\/li>/g)) {
    rowsRead += 1;
    const firstCell = row[2].slice(0, row[2].indexOf('<span class="tabular-nums'));
    const inFirst = firstCell.includes('data-cm-tl-entry');
    if (inFirst !== ((row[1] === 'me') === me)) p.push(`a ${row[1]} row is drawn in the ${inFirst ? 'first' : 'second'} column`);
  }
  for (const tag of html.matchAll(/<span\b[^>]*data-cm-tl-name="1"[^>]*>/g)) {
    namesRead += 1;
    if (/class="[^"]*\btruncate\b/.test(tag[0])) p.push('a name on the timeline is cut (truncate)');
  }
  let at = html.indexOf('data-cm-tl-mark');
  while (at >= 0) {
    marksRead += 1;
    const markStart = html.lastIndexOf('<span', at);
    const nameStart = html.lastIndexOf('<span', html.lastIndexOf('data-cm-tl-name', at));
    const nameEnd = spanClose(html, nameStart);
    if (nameEnd !== markStart) p.push('a (P) or (O.G) mark is not right after its name');
    at = html.indexOf('data-cm-tl-mark', at + 15);
  }
  judge(3, m, p);
}
console.log(`   ${redBy[3]?.checked ?? 0} timelines, ${rowsRead} rows, ${namesRead} names, ${marksRead} marks; red: ${redBy[3]?.home ?? 0} home, ${redBy[3]?.away ?? 0} away, ${redBy[3]?.neutral ?? 0} neutral`);
if ((redBy[3]?.checked ?? 0) < 100 || marksRead < 1) cannotRun(`only ${redBy[3]?.checked ?? 0} timelines and ${marksRead} marks to read`);

/* ---------- 4. live and half time ---------- */
console.log('4) Live and half time: the strip, the score\'s digits, the interval card, the stats and the line under the pitch home side first');
const noop = () => {};
const liveProps = (L, f) => ({
  career: f.career, live: f.report ? null : f.career.live, report: f.report ?? null, clubColor: '#ffffff',
  onSub: noop, onShape: noop, onTalk: noop, onSecondHalf: noop, onExit: noop,
});
const halfProps = career => ({ career, onSub: noop, onShape: noop, onTalk: noop, onSecondHalf: noop });
const stagesSeen = { first: 0, interval: 0, second: 0, done: 0 };
let liveSegsRead = 0;
/* My club picked out in green (text-primary) on the strip, the interval card and the dressing room's card: the
   name that is mine carries it and the other does not, wherever the two sit (the review's mutation m4 left the
   dressing room's green on the first name with every harness green). */
const greenOn = cls => /(^| )text-primary( |$)/.test(cls ?? '');
let greensRead = 0;
function greenCheck(names, green, club, where, p) {
  greensRead += 1;
  if (!same(green, names.map(n => n === club))) p.push(`${where} puts the green on ${names.filter((n, i) => green[i]).join(' and ') || 'nobody'}`);
}
const HALF_CARD = /<span class="([^"]*)">([^<]*)<\/span><span class="[^"]*text-3xl[^"]*">(\d+)-(\d+)<\/span><span class="([^"]*)">([^<]*)<\/span>/;
function halfCard(html) {
  const x = HALF_CARD.exec(html);
  return x && { names: [unescape(x[2]), unescape(x[6])], goals: [Number(x[3]), Number(x[4])], green: [greenOn(x[1]), greenOn(x[5])] };
}
/** One live frame read the way this section reads it: the order, the green and the bars of all it draws. */
function readFrame(html, f, { me, want, firstSide, club }, p) {
    const stage = /data-cm-live-stage="([^"]*)"/.exec(html)?.[1];
    if (stage !== f.stage) { p.push(`the ${f.stage} frame rendered as ${stage}`); return null; }
    const digits = attrs(html.slice(html.indexOf('data-cm-live-score')), 'data-cm-score-of').slice(0, 2);
    if (!same(digits, [firstSide, me ? 'opp' : 'me'])) p.push(`at ${stage} the score's digits read ${digits.join(' then ')}`);
    if (stage === 'interval') {
      const names = /<span(?: class="([^"]*)")?>([^<>]*)<\/span> vs <span(?: class="([^"]*)")?>([^<]*)</.exec(html);
      if (!names || !same([unescape(names[2]), unescape(names[4])], want)) p.push(`the interval card's names read ${names ? `${names[2]} v ${names[4]}` : 'nothing'}`);
      else greenCheck(want, [greenOn(names[1]), greenOn(names[3])], club, 'the interval card', p);
      const half = halfCard(html);
      const live = f.career.live;
      const goals = me ? [live.myGoals, live.oppGoals] : [live.oppGoals, live.myGoals];
      if (!half || !same(half.names, want) || !same(half.goals, goals)) p.push(`the half time card reads ${half ? `${half.names[0]} ${half.goals.join('-')} ${half.names[1]}` : 'nothing'}`);
      else greenCheck(half.names, half.green, club, "the dressing room's card", p);
    } else {
      const strip = /<div class="cm-strip-score"><div class="([^"]*)">([^<]*)<\/div>[\s\S]*?<\/div><div class="([^"]*)">([^<]*)<\/div>/.exec(html);
      if (!strip || !same([unescape(strip[2]), unescape(strip[4])], want)) p.push(`at ${stage} the strip reads ${strip ? `${strip[2]} v ${strip[4]}` : 'nothing'}`);
      else greenCheck(want, [greenOn(strip[1]), greenOn(strip[3])], club, `at ${stage} the strip`, p);
      const line = html.slice(html.indexOf('data-cm-live-statline'));
      if (html.includes('data-cm-live-statline') && /<span>Poss <b/.test(line) !== me) p.push(`at ${stage} the line under the pitch is not home side first`);
    }
    if (html.includes('data-cm-live-stats')) {
      const head = headerPair(html, 'Balance of play');
      if (!same(head, want)) p.push(`at ${stage} the stats header reads ${head?.join(' v ')}`);
      const poss = attrs(html, 'data-cm-live-poss');
      if (poss[0] !== sideWord(me)) p.push(`at ${stage} the possession pair is not home side first`);
      /* The possession bar between the two numbers: my green segment first exactly when my number is, as wide
         as my share. */
      const statsAt = html.indexOf('data-cm-live-stats');
      const myPoss = /data-cm-live-poss="mine"[^>]*>([^<%]*)%/.exec(html.slice(statsAt))?.[1];
      const barAt = html.indexOf('overflow-hidden bg-secondary">', statsAt);
      const segs = barAt < 0 ? [] : [...html.slice(barAt).matchAll(/<div class="([^"]*)" style="width:([^";]*)"><\/div>/g)].slice(0, 2);
      const greenAt = segs.findIndex(s => /(^| )bg-primary( |$)/.test(s[1]));
      liveSegsRead += segs.length;
      if (segs.length !== 2 || greenAt !== (me ? 0 : 1)) p.push(`at ${stage} the possession bar's segments draw my green one ${greenAt === 0 ? 'first' : greenAt === 1 ? 'second' : 'nowhere'}`);
      else if (myPoss === undefined || segs[greenAt][2] !== `${myPoss}%` || segs[1 - greenAt][2] !== `${100 - Number(myPoss)}%`) p.push(`at ${stage} the possession bar's segments are ${segs[greenAt][2]} green and ${segs[1 - greenAt][2]} grey where my share is ${myPoss}%`);
      for (const cell of html.split(/(?=data-cm-live-stat=")/).slice(1)) {
        if (attrs(cell, 'data-cm-live-stat-n')[0] !== sideWord(me)) { p.push(`at ${stage} a stat cell is not home side first`); break; }
      }
    }
    return stage;
}
/** The dressing room rendered alone at the interval. */
function readAlone(career, { want, club }, p) {
  const half = halfCard(render(HeadHalf, halfProps(career)));
  if (!half || !same(half.names, want)) p.push(`the half time screen alone reads ${half ? `${half.names[0]} v ${half.names[1]}` : 'nothing'}`);
  else greenCheck(half.names, half.green, club, "the dressing room's card alone", p);
}
let prefieldFrames = 0;
for (const L of lives) {
  const me = L.fxHome !== false;
  const opp = L.report.home === L.club ? L.report.away : L.report.home;
  const ctx = { me, want: me ? [L.club, opp] : [opp, L.club], firstSide: me ? 'me' : 'opp', club: L.club };
  const m = { club: L.club, era: L.era, seed: L.seed, fxHome: L.fxHome, report: L.report };
  const p = [];
  if (L.frames[1].career.live.home !== L.fxHome) p.push(`the live match's home is ${L.frames[1].career.live.home}, the fixture said ${L.fxHome}`);
  for (const f of L.frames) {
    f.html = render(HeadLive, liveProps(L, f));
    const stage = readFrame(f.html, f, ctx, p);
    if (stage) stagesSeen[stage] += 1;
  }
  readAlone(L.frames[1].career, ctx, p);
  judge(4, m, p);
  /* The same live match as a save from before the live match knew its venue (no home field) would hold it: every
     screen draws my club first, as they all did then (myClubFirst(undefined)). Judged apart, as "prefield". */
  const old = { me: true, want: [L.club, opp], firstSide: 'me', club: L.club };
  const q = [];
  for (const f of L.frames) {
    if (!f.career.live || f.report) continue;
    const career = structuredClone(f.career);
    delete career.live.home;
    readFrame(render(HeadLive, liveProps(L, { ...f, career })), { ...f, career }, old, q);
    if (f.stage === 'interval') readAlone(career, old, q);
    prefieldFrames += 1;
  }
  judge(4, { ...m, prefield: true }, q);
}
const neutralLives = lives.filter(L => L.fxHome === null).length;
console.log(`   ${redBy[4]?.checked ?? 0} live matches judged, ${neutralLives} of them on a neutral ground (${Object.entries(stagesSeen).map(([k, v]) => `${v} ${k}`).join(', ')}; ${prefieldFrames} frames staged with no venue field; ${liveSegsRead} possession bar segments, ${greensRead} green names); red: ${redBy[4]?.home ?? 0} home, ${redBy[4]?.away ?? 0} away, ${redBy[4]?.neutral ?? 0} neutral, ${redBy[4]?.prefield ?? 0} staged with no venue field`);
if (neutralLives < 5 || prefieldFrames < 40) cannotRun(`section 4 met ${neutralLives} neutral live matches and staged ${prefieldFrames} frames with no venue field: under its floors (5, 40)`);

/* ---------- 5. the Match Centre ---------- */
console.log('5) The Match Centre: the tie, the form rows and the ones to watch home side first; the odds still Win, Draw, They win');
const centreProps = C => ({
  career: C.career ?? null, facts: C.facts, clubColor: '#ffffff', tone: null, onTone: noop, talkRead: null,
  talkStale: false, onQuickSim: noop, onLive: noop, onBack: noop,
});
/** The visible text of the element whose opening tag starts at idx (a div or a span), its own tags matched. */
function elementText(html, idx) {
  const tag = /^<(div|span)\b/.exec(html.slice(idx))?.[1];
  if (!tag) return null;
  const rx = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'g');
  rx.lastIndex = idx;
  let depth = 0;
  let m;
  while ((m = rx.exec(html))) {
    if (m[0] === `</${tag}>`) { depth -= 1; if (depth === 0) return visible(html.slice(idx, rx.lastIndex)); } else depth += 1;
  }
  return null;
}
const centreCounts = { home: 0, away: 0, neutral: 0, watch: 0 };
for (const C of centres) {
  const me = C.fxHome !== false;
  const f = C.facts;
  const p = [];
  if (!f) { p.push('matchFacts gave nothing before a match'); judge(5, C, p); continue; }
  if (f.home !== C.fxHome || f.opponent !== (C.report.home === C.club ? C.report.away : C.report.home)) p.push(`the facts name ${f.opponent} (${f.home}), the fixture said ${C.fxHome}`);
  C.career = { clubName: C.club };
  const html = render(HeadCentre, centreProps(C));
  C.html = html;
  centreCounts[venueOf(C)] += 1;
  const first = me ? 'me' : 'opp';
  const second = me ? 'opp' : 'me';
  const sides = [...html.matchAll(/<(div|span)\b[^>]*data-cm-mc-side="(me|opp)"/g)].map(x => ({ side: x[2], idx: x.index }));
  const watch = f.myDanger.length > 0 || f.oppDanger.length > 0;
  if (watch) centreCounts.watch += 1;
  const wantSides = watch ? [first, second, first, second, first, second] : [first, second, first, second];
  if (!same(sides.map(x => x.side), wantSides)) p.push(`the sides read ${sides.map(x => x.side).join(' ')}`);
  else {
    const textOf = side => ({ me: C.club, opp: f.opponent })[side];
    const tie = sides.slice(0, 2).map(x => /<div[^>]*>([^<]*)<\/div>/.exec(html.slice(x.idx + 1))?.[1]).map(t => t && unescape(t));
    if (!same(tie, [textOf(first), textOf(second)])) p.push(`the tie reads ${tie.join(' v ')}`);
    const formOf = side => (side === 'me' ? f.myForm : f.oppForm);
    for (const [i, x] of sides.slice(2, 4).entries()) {
      const shown = elementText(html, x.idx);
      const form = formOf(x.side);
      /* The second row is drawn reversed (flex-row-reverse), so its text is the form in order either way. */
      const want = form.length ? form.join(' ') : 'No matches yet';
      if (shown !== want) p.push(`form row ${i + 1} (${x.side}) reads "${shown}", not "${want}"`);
    }
    if (watch) {
      for (const x of sides.slice(4, 6)) {
        const shown = elementText(html, x.idx);
        const names = x.side === 'me' ? f.myDanger.map(n => `⚽ ${n}`) : f.oppDanger.map(n => `⚠️ ${n}`);
        const want = names.length ? names.join(' ') : '-';
        if (shown !== want) p.push(`the ${x.side} ones to watch read "${shown}", not "${want}"`);
      }
    }
  }
  if (!/Win \d+% Draw \d+% They win \d+%/.test(visible(html))) p.push('the odds no longer read Win, Draw, They win in that order');
  judge(5, C, p);
}
console.log(`   ${redBy[5]?.checked ?? 0} Match Centres (${centreCounts.home} home, ${centreCounts.away} away, ${centreCounts.neutral} neutral, ${centreCounts.watch} with ones to watch); red: ${redBy[5]?.home ?? 0} home, ${redBy[5]?.away ?? 0} away, ${redBy[5]?.neutral ?? 0} neutral`);
if (centreCounts.home < 40 || centreCounts.away < 40 || centreCounts.neutral < 3 || centreCounts.watch < 40) cannotRun('section 5 read under 40 home, 40 away, 3 neutral or 40 Match Centres with ones to watch: widen the sample, never lower a floor');

/* ---------- 6. the pitch wears names ---------- */
console.log('6) The pitch: every dot label is the man\'s pitch name, his initials or his slot\'s role, never a number');
const SLOT_LABELS = new Set(cm.FORMATIONS.flatMap(f => f.slots.map(s => s.label)));
/** Every dot on a rendered pitch: whose (me or opp), its id or number, its aria-label, and its label's text. */
function dotsOf(html) {
  const out = [];
  for (const d of html.matchAll(/<(?:button|div)\b[^>]*\bdata-cm-dot(-opp)?="([^"]*)"[^>]*>/g)) {
    const at = html.indexOf('<span class="cm-dot-label', d.index);
    const end = at < 0 ? -1 : spanClose(html, at);
    if (end < 0) { out.push({ side: d[1] ? 'opp' : 'me', key: d[2], text: null }); continue; }
    const inner = html.slice(html.indexOf('>', at) + 1, end - '</span>'.length);
    const text = unescape(inner.replace(/<span\b[^>]*>C<\/span>/g, '').replace(/<!--[^>]*-->/g, '').replace(/<[^>]*>/g, '')).trim();
    out.push({ side: d[1] ? 'opp' : 'me', key: d[2], aria: unescape(/aria-label="([^"]*)"/.exec(d[0])?.[1] ?? ''), text });
  }
  return out;
}
const asName = (t, name) => t === order.pitchName(name) || t === order.pitchInitials(name);
const dotCounts = { read: 0, mine: 0, theirsNamed: 0, theirsNameless: 0, staged: 0, initials: 0, frames: 0 };
function judgeDots(html, career, oppNames, p, where) {
  const dots = dotsOf(html);
  if (dots.length) dotCounts.frames += 1;
  for (const d of dots) {
    dotCounts.read += 1;
    if (d.text === null) { p.push(`${where}: a dot has no label`); continue; }
    const t = d.side === 'opp' ? d.text.replace(/\*$/, '') : d.text;
    /* Counted before it is judged, so a control that turns every label red still shows what it read. */
    const man = d.side === 'me' && d.key ? career.squad.find(q => q.id === d.key) : null;
    if (man) dotCounts.mine += 1;
    else if (d.side === 'opp') { if (oppNames.length) dotCounts.theirsNamed += 1; else dotCounts.theirsNameless += 1; }
    if (!t) { p.push(`${where}: a ${d.side} dot's label is empty`); continue; }
    if (/^\d/.test(t)) { p.push(`${where}: a ${d.side} dot's label "${d.text}" begins with a digit`); continue; }
    if (d.side === 'me') {
      if (!man) { if (!SLOT_LABELS.has(t)) p.push(`${where}: my nameless dot reads "${t}", not a slot's role`); continue; }
      if (t !== order.pitchName(man.name)) dotCounts.initials += 1;
      if (!asName(t, man.name)) p.push(`${where}: my ${man.name} reads "${t}", not his pitch name or initials`);
      if (!d.aria.includes(man.name) || /\bnumber\b/.test(d.aria)) p.push(`${where}: my ${man.name}'s label for a screen reader is "${d.aria}"`);
    } else if (!oppNames.length) {
      if (!SLOT_LABELS.has(t)) p.push(`${where}: a nameless opponent reads "${t}", not a slot's role`);
    } else if (!oppNames.some(n => asName(t, n))) {
      p.push(`${where}: an opponent reads "${t}", the pitch name or initials of nobody in their eleven or on their bench`);
    }
  }
  return dots.length;
}
for (const L of lives) {
  const m = { club: L.club, era: L.era, seed: L.seed, fxHome: L.fxHome, report: L.report };
  const p = [];
  for (const f of L.frames) {
    const oppNames = f.report
      ? (f.report.detail?.oppXi ?? []).map(x => x.n)
      : [...(f.career.live.oppXi ?? []), ...(f.career.live.oppBench ?? [])].map(x => x.n);
    judgeDots(f.html, f.career, oppNames, p, f.stage);
  }
  /* A side with no eleven (a save from before Round 504 has none): staged by taking the eleven off a live state. */
  const staged = structuredClone(L.frames[0].career);
  delete staged.live.oppXi;
  delete staged.live.oppBench;
  const before = dotCounts.theirsNameless;
  judgeDots(render(HeadLive, liveProps(L, { career: staged })), staged, [], p, 'a nameless side');
  dotCounts.staged += dotCounts.theirsNameless - before;
  judge(6, m, p);
}
console.log(`   ${dotCounts.read} dot labels over ${dotCounts.frames} pitches: ${dotCounts.mine} of mine named (${dotCounts.initials} in initials), ${dotCounts.theirsNamed} named opponents, ${dotCounts.theirsNameless} nameless opponents (${dotCounts.staged} of them staged); red: ${redBy[6]?.home ?? 0} home, ${redBy[6]?.away ?? 0} away, ${redBy[6]?.neutral ?? 0} neutral`);
if (dotCounts.frames < 40 || dotCounts.mine < 400 || dotCounts.theirsNamed < 200 || dotCounts.staged < 40) cannotRun(`section 6 read ${dotCounts.frames} pitches, ${dotCounts.mine} of mine, ${dotCounts.theirsNamed} named and ${dotCounts.staged} staged nameless opponents: under its floors (40, 400, 200, 40)`);

/* ---------- 7. a home match reads as before ---------- */
console.log('7) A home or neutral match: the card\'s visible text equals the base\'s, the board word and the pitch labels masked');
const maskBoard = html => html.replace(/(>Board<\/div><div[^>]*>[\s\S]*?<\/span><\/div><div[^>]*>)[^<]*(<\/div>)/, '$1#$2');
/* Round 1340b: the pitch labels changed on purpose (surnames, never numbers); section 6 reads them. */
const maskDots = html => html.replace(/<span class="cm-dot-label[^"]*">(?:[^<]|<!--[^>]*-->|<span\b[^>]*>[^<]*<\/span>)*<\/span>/g, '<span>#</span>');
for (const m of matches) {
  if (!homeIsMe(m)) continue;
  const head = visible(maskBoard(m.html));
  const base = visible(maskBoard(render(BaseCard, cardProps(m))));
  const p = [];
  if (head !== base) {
    let i = 0;
    while (i < head.length && head[i] === base[i]) i += 1;
    p.push(`the card's text differs from the base at "${head.slice(Math.max(0, i - 30), i + 40)}" against "${base.slice(Math.max(0, i - 30), i + 40)}"`);
  }
  judge(7, m, p);
}
/* And every frame of a home match kicked off live, the viewer and the dressing room alone. */
let liveCompared = 0;
for (const L of lives) {
  if (L.fxHome === false) continue;
  const m = { club: L.club, era: L.era, seed: L.seed, fxHome: L.fxHome, report: L.report };
  const p = [];
  const pairs = [...L.frames.map(f => [f.html, render(BaseLive, liveProps(L, f)), f.stage]),
    [render(HeadHalf, halfProps(L.frames[1].career)), render(BaseHalf, halfProps(L.frames[1].career)), 'half time alone']];
  for (const [headHtml, baseHtml, stage] of pairs) {
    liveCompared += 1;
    const head = visible(maskDots(headHtml));
    const base = visible(maskDots(baseHtml));
    if (head === base) continue;
    let i = 0;
    while (i < head.length && head[i] === base[i]) i += 1;
    p.push(`at ${stage} the text differs from the base at "${head.slice(Math.max(0, i - 30), i + 40)}" against "${base.slice(Math.max(0, i - 30), i + 40)}"`);
  }
  judge(7, m, p);
}
/* And every home and neutral Match Centre. */
let centresCompared = 0;
for (const C of centres) {
  if (C.fxHome === false || !C.html) continue;
  centresCompared += 1;
  const head = visible(C.html);
  const base = visible(render(BaseCentre, centreProps(C)));
  if (head === base) { judge(7, C, []); continue; }
  let i = 0;
  while (i < head.length && head[i] === base[i]) i += 1;
  judge(7, C, [`the Match Centre differs from the base at "${head.slice(Math.max(0, i - 30), i + 40)}" against "${base.slice(Math.max(0, i - 30), i + 40)}"`]);
}
console.log(`   ${redBy[7].checked} home and neutral screens compared with ${BASE} (${liveCompared} live screens and ${centresCompared} Match Centres among them); red: ${redBy[7].home} home, ${redBy[7].neutral} neutral`);

/* ---------- the verdict ---------- */
const redSections = [...failures.keys()].sort((a, b) => a - b);
const total = [...failures.values()].reduce((a, b) => a + b, 0);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const fired = want.filter(s => (failures.get(s) ?? 0) > 0);
  console.log(`control ${CONTROL}: ${want.map(s => `section ${s} ${failures.get(s) ?? 0} failures (${redBy[s]?.home ?? 0} home, ${redBy[s]?.away ?? 0} away, ${redBy[s]?.neutral ?? 0} neutral matches red${redBy[s]?.prefield ? `, ${redBy[s].prefield} staged with no venue field` : ''})`).join('; ')}`);
  let ok = fired.length === want.length;
  /* oldorder is the screens before this round: red away, and green at home and on a neutral ground. */
  if (CONTROL === 'oldorder') ok = ok && want.every(s => redBy[s].away > 0 && redBy[s].home === 0 && redBy[s].neutral === 0);
  if (CONTROL === 'neutralaway') ok = ok && redBy[1].neutral > 0 && redBy[1].home === 0 && redBy[1].away === 0;
  /* barorder only moves what an away match draws, like oldorder. */
  if (CONTROL === 'barorder' || CONTROL === 'greenfirst') ok = ok && want.every(s => redBy[s].away > 0 && redBy[s].home === 0 && redBy[s].neutral === 0);
  /* neutrallive moves only a neutral ground's live screens and the staged saves with no venue field. */
  if (CONTROL === 'neutrallive') ok = ok && redBy[4].neutral > 0 && redBy[4].prefield > 0 && redBy[4].home === 0 && redBy[4].away === 0;
  if (kindHits.length) {
    console.log(`control ${CONTROL}: the checks it must fire through fired ${kindHits.join(' and ')} times`);
    ok = ok && kindHits.every(n => n > 0);
  }
  if (ok) { console.log(`simCmMatchDay: CONTROL ${CONTROL} FIRED (${total} failures, section(s) ${redSections.join(', ')})`); process.exit(1); }
  console.log(`simCmMatchDay: CONTROL ${CONTROL} DID NOT FIRE as designed (red sections: ${redSections.join(', ') || 'none'})`);
  process.exit(3);
}
if (total) { console.log(`simCmMatchDay: RED, ${total} failures in section(s) ${redSections.join(', ')}`); process.exit(1); }
console.log(`simCmMatchDay: all sections green (${matches.length} matches: ${counts.home} home, ${counts.away} away, ${counts.neutral} neutral)`);
process.exit(0);
