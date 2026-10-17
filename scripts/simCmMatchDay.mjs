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
        first number is the home side's share.
     3) The timeline: its header and every row's first cell are the home side's; no name span is cut (truncate);
        every (P) and (O.G) mark sits outside the name span and right after it (Round 1146's promise).
     7) A home match reads as before: on every home and neutral match the card's visible text, in document order,
        equals the card at MATCHDAY_BASE (the round's files as they were at the base, everything else this tree's),
        with only the board word masked (it now says what the header's meter says).

   Negative controls (MATCHDAY_CONTROL=...), each asserting its anchor first, printing how often it fired:
     neutralaway  myClubFirst answers false for a neutral ground. Section 1 must go red on every neutral match.
     oldorder     myClubFirst and mineFirstOfReport answer true always, the screens before this round. Sections 2
                  and 3 must go red on every away match and stay green on home and neutral ones.
     truncate     the timeline's name span is cut again. Section 3 must go red.
     homeflip     my club is drawn second at home. Section 7 must go red.

   Exit codes: 0 green, 1 red (or a control that fired), 2 could not run (a fleet under its floors: 100 away,
   100 home and 5 neutral matches; widen the fleet, never lower a floor), 3 a control that did not fire.
   Green is the closing summary line and the real exit code.

   Run: node scripts/simCmMatchDay.mjs     (MATCHDAY_BASE=<commit> overrides the base, default d8aaa4cb)
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
const CONTROLS = { neutralaway: [1], oldorder: [2, 3], truncate: [3], homeflip: [7] };
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`MATCHDAY_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(2); }
const BASE = process.env.MATCHDAY_BASE || 'd8aaa4cb';
const lf = s => s.replaceAll('\r\n', '\n');
const cannotRun = m => { console.error(`simCmMatchDay could not run: ${m}`); process.exit(2); };

let section = 0;
const failures = new Map();
const fail = m => {
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
const { cm, order, HeadCard, BaseCard, render } = createRequire(import.meta.url)(BUNDLE);

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
let unpaired = 0;
let careersStarted = 0;
function playSeason(club, era, seed, keep) {
  const s0 = withSeed(seed * 7919 + 17, () => { try { return cm.startCareer(club, era); } catch { return null; } });
  if (!s0 || s0.clubName !== club) return false;
  careersStarted += 1;
  let s = s0;
  for (let guard = 1; guard < 200; guard++) {
    let fx = null;
    try { fx = cm.nextFixture(s); } catch { fx = null; }
    const res = withSeed(seed * 104729 + guard * 31 + 5, () => cm.playNextEntry(s, { skipHalftime: true }));
    if (!res || !res.state) break;
    if (res.kind === 'match' && res.report) {
      const r = res.report;
      const opp = r.home === club ? r.away : r.home;
      if (!fx || fx.kind !== 'match' || fx.opponent !== opp) unpaired += 1;
      else if (keep(fx.home)) matches.push({ club, era: era ?? 'now', seed, fxHome: fx.home, report: r });
    }
    s = res.state;
    if (res.kind === 'seasonOver' || s.sacked) break;
  }
  return true;
}
const started = Date.now();
for (const [club, era] of FLEET) {
  for (let seed = 0; seed <= 4; seed++) {
    if (!playSeason(club, era, seed, () => true)) cannotRun(`${club} (${era ?? 'now'}) did not start a career`);
  }
}
const neutralCount = () => matches.filter(m => m.fxHome === null).length;
for (let pass = 0; pass < 5 && neutralCount() < 8; pass++) {
  for (const [club, era] of NEUTRAL_WALK) {
    if (neutralCount() >= 8) break;
    playSeason(club, era, 100 + pass, home => home === null);
  }
}
const homeIsMe = m => m.report.home === m.club;
const venueOf = m => (m.fxHome === null ? 'neutral' : m.fxHome === false ? 'away' : 'home');
const ctxOf = m => `${m.club} ${m.era} seed ${m.seed}: ${m.report.home} ${m.report.homeGoals}-${m.report.awayGoals} ${m.report.away} (${m.report.compLabel}, ${venueOf(m)})`;
const counts = { home: 0, away: 0, neutral: 0 };
for (const m of matches) counts[venueOf(m)] += 1;
console.log(`fleet: ${careersStarted} careers, ${matches.length} matches (${counts.home} home, ${counts.away} away, ${counts.neutral} neutral), ${unpaired} reports with no fixture read before them, ${((Date.now() - started) / 1000).toFixed(0)}s`);
if (counts.away < 100 || counts.home < 100 || counts.neutral < 5) cannotRun(`the fleet is under its floors (100 away, 100 home, 5 neutral): widen it, never lower a floor`);
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
  redBy[sec] ??= { home: 0, away: 0, neutral: 0, checked: 0 };
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
console.log(`   ${redBy[2].checked} reports, ${barsRead} stat bars read; red: ${redBy[2].home} home, ${redBy[2].away} away, ${redBy[2].neutral} neutral`);

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

/* ---------- 7. a home match reads as before ---------- */
console.log('7) A home or neutral match: the card\'s visible text equals the base\'s, the board word masked');
const maskBoard = html => html.replace(/(>Board<\/div><div[^>]*>[\s\S]*?<\/span><\/div><div[^>]*>)[^<]*(<\/div>)/, '$1#$2');
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
console.log(`   ${redBy[7].checked} home and neutral cards compared with ${BASE}; red: ${redBy[7].home} home, ${redBy[7].neutral} neutral`);

/* ---------- the verdict ---------- */
const redSections = [...failures.keys()].sort((a, b) => a - b);
const total = [...failures.values()].reduce((a, b) => a + b, 0);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const fired = want.filter(s => (failures.get(s) ?? 0) > 0);
  console.log(`control ${CONTROL}: ${want.map(s => `section ${s} ${failures.get(s) ?? 0} failures (${redBy[s]?.home ?? 0} home, ${redBy[s]?.away ?? 0} away, ${redBy[s]?.neutral ?? 0} neutral matches red)`).join('; ')}`);
  let ok = fired.length === want.length;
  /* oldorder is the screens before this round: red away, and green at home and on a neutral ground. */
  if (CONTROL === 'oldorder') ok = ok && want.every(s => redBy[s].away > 0 && redBy[s].home === 0 && redBy[s].neutral === 0);
  if (CONTROL === 'neutralaway') ok = ok && redBy[1].neutral > 0 && redBy[1].home === 0 && redBy[1].away === 0;
  if (ok) { console.log(`simCmMatchDay: CONTROL ${CONTROL} FIRED (${total} failures, section(s) ${redSections.join(', ')})`); process.exit(1); }
  console.log(`simCmMatchDay: CONTROL ${CONTROL} DID NOT FIRE as designed (red sections: ${redSections.join(', ') || 'none'})`);
  process.exit(3);
}
if (total) { console.log(`simCmMatchDay: RED, ${total} failures in section(s) ${redSections.join(', ')}`); process.exit(1); }
console.log(`simCmMatchDay: all sections green (${matches.length} matches: ${counts.home} home, ${counts.away} away, ${counts.neutral} neutral)`);
process.exit(0);
