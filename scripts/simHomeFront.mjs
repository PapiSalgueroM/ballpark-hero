/**
 * Rounds 658 and 659: the home front says only true things, from source and
 * from a render.
 *
 * WHY. The owner, 2026-09-19: "in the last month I see like no difference on
 * the site from the beginning to now." The redesign that answers him puts
 * new things on the most important page on the site, and every one of them
 * is a claim that can quietly go false: a stage card for a game that was
 * renamed or retired, a Continue button reading a save key the game stopped
 * writing, a sport with no ink in one theme, a dailies rail that drifts from
 * the registry's daily flag, a Just shipped box with a date somebody typed.
 * None of those is a type error and none of them crashes, so this checks them.
 *
 * SECTIONS
 *   1 stage     The Main Event band lists exactly the four flagship paths,
 *               each a live registry game, and the rendered band shows those
 *               four links in that order with the registry's own labels.
 *   2 savekey   Each Continue key in src/data/homeFront.ts equals the SAVE_KEY
 *               the game really writes (src/pages/SoccerCareer.tsx and
 *               src/lib/clubManager.ts, read from code with comments
 *               stripped), and a render with that exact key planted shows the
 *               Continue words while a render without it does not. The stage
 *               never parses a save.
 *   3 colour    Every registry category maps to a sport, every sport has an
 *               ink in BOTH themes in src/index.css that clears 3 to 1 on
 *               --surface-1 (inks draw glyphs and rules, never body text),
 *               and every sport has a drawn glyph that renders.
 *   4 rail      The dailies rail renders exactly the registry's daily games,
 *               each once (compared with the daily flag read here, not with
 *               the page's own helper), led by Today's puzzle, which is the
 *               date's pick through dailyIndex; over three pool lengths of
 *               days every daily leads at least once and none leads two days
 *               running.
 *   5 shipped   Just shipped renders the newest games by the registry's
 *               addedOn, newest first, links to /whats-new, and no date is
 *               typed into its code or the front data.
 *   6 progress  The rail carries no personal progress: rendering it reads no
 *               browser storage at all, renders byte identical with a streak
 *               record planted, and prints no done, streak or day count words.
 *               Round 297 removed a personal dailies checklist from this page
 *               on the owner's word; this is the fence that keeps it gone.
 *
 * NEGATIVE CONTROLS, HOME_FRONT_CONTROL=<name>. Each rewrites one input in
 * memory, refuses to run if the rewrite changed nothing, and must turn ONLY
 * its own section red:
 *   stage     /nba-my-career on the stage becomes a path the registry lacks
 *   savekey   the Soccer Career Continue key loses a letter
 *   nocolour  the light theme's tennis ink is deleted
 *   noglyph   the golf glyph is deleted
 *   rail      the rail drops the last daily game
 *   shipped   Just shipped shows its games oldest first
 *   progress  every chip appends " Done" when a streak record exists
 *
 * Run: node scripts/simHomeFront.mjs
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLS = { stage: 1, savekey: 2, nocolour: 3, noglyph: 3, rail: 4, shipped: 5, progress: 6 };
const CONTROL = process.env.HOME_FRONT_CONTROL || '';
if (CONTROL && !(CONTROL in CONTROLS)) {
  console.error(`HOME_FRONT_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
/** Code only: block comments, JSX comments and line comments go, so a check
    can never be satisfied by the prose explaining why it exists. */
const stripComments = s => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

const failedSections = new Set();
let failures = 0;
const fail = (section, m) => { failures += 1; failedSections.add(section); console.error(`  FAIL [${section}]: ${m}`); };

/** Rewrites a source in memory for a control, refusing if nothing changed. */
function controlled(name, src, from, to) {
  if (CONTROL !== name) return src;
  if (!src.includes(from)) {
    console.error(`control ${name}: the text it rewrites is not in the source, so it would prove nothing`);
    process.exit(1);
  }
  const out = src.split(from).join(to);
  console.log(`NEGATIVE CONTROL ${name} ON: ${JSON.stringify(from)} becomes ${JSON.stringify(to)}`);
  return out;
}

/* ── the inputs, with any control applied ─────────────────────────────── */
let homeFrontSrc = read('src/data/homeFront.ts');
homeFrontSrc = controlled('stage', homeFrontSrc, "path: '/nba-my-career'", "path: '/nba-my-careers'");
homeFrontSrc = controlled('savekey', homeFrontSrc, "saveKey: 'soccerCareerSave'", "saveKey: 'soccerCareerSav'");
let css = read('src/index.css');
let glyphSrc = read('src/components/home/SportGlyph.tsx');
if (CONTROL === 'nocolour') {
  const light = css.indexOf(':root.light');
  const at = css.indexOf('--sport-tennis:', light);
  if (light < 0 || at < 0) { console.error('control nocolour: no light theme tennis ink to delete'); process.exit(1); }
  const end = css.indexOf('\n', at);
  css = css.slice(0, at) + css.slice(end + 1);
  console.log('NEGATIVE CONTROL nocolour ON: the light theme tennis ink is deleted');
}
glyphSrc = controlled('noglyph', glyphSrc, "case 'golf':", "case 'golf-removed':");
let railSrc = read('src/components/home/DailyRail.tsx');
railSrc = controlled('rail', railSrc, 'const all = dailyGames();', 'const all = dailyGames().slice(0, -1);');
railSrc = controlled('progress', railSrc, '{game.label}',
  "{game.label}{(() => { try { return localStorage.getItem('dukb-streaks-v1') ? ' Done' : ''; } catch { return ''; } })()}");
let shippedSrc = read('src/components/home/JustShipped.tsx');
shippedSrc = controlled('shipped', shippedSrc, 'justShipped(JUST_SHIPPED_COUNT)', 'justShipped(JUST_SHIPPED_COUNT).reverse()');

/* ── one bundle: the registry, the front data, and renders of the pieces ─ */
const temp = fs.mkdtempSync(path.join(os.tmpdir(), `dukb-home-front-${process.pid}-`));
const bundle = path.join(temp, 'front.cjs');
const SWAPS = [
  [/[\\/]src[\\/]data[\\/]homeFront\.ts$/, () => homeFrontSrc, 'ts'],
  [/[\\/]src[\\/]components[\\/]home[\\/]SportGlyph\.tsx$/, () => glyphSrc, 'tsx'],
  [/[\\/]src[\\/]components[\\/]home[\\/]DailyRail\.tsx$/, () => railSrc, 'tsx'],
  [/[\\/]src[\\/]components[\\/]home[\\/]JustShipped\.tsx$/, () => shippedSrc, 'tsx'],
];
await build({
  stdin: {
    contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { MemoryRouter } from 'react-router-dom';
      import { FeaturedStage } from './src/components/home/FeaturedStage';
      import { SportGlyph } from './src/components/home/SportGlyph';
      export { CATEGORIES, ALL_GAMES } from './src/data/gameRegistry';
      export { HOME_STAGE, CATEGORY_SPORT } from './src/data/homeFront';
      const wrap = el => renderToStaticMarkup(React.createElement(MemoryRouter, null, el));
      export const renderStage = () => wrap(React.createElement(FeaturedStage));
      export const renderGlyph = sport => renderToStaticMarkup(React.createElement(SportGlyph, { sport }));
      import { DailyRail } from './src/components/home/DailyRail';
      import { JustShipped } from './src/components/home/JustShipped';
      export { dailyIndex } from './src/lib/dateUtils';
      export { todaysPuzzle } from './src/data/homeFront';
      export const renderRail = today => wrap(React.createElement(DailyRail, { today }));
      export const renderShipped = () => wrap(React.createElement(JustShipped, null,
        games => games.map(g => React.createElement('a', { key: g.path, href: g.path, 'data-shipped-card': '' }, g.label))));
    `,
    resolveDir: ROOT,
    loader: 'tsx',
  },
  bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', outfile: bundle,
  alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
  /* the production React build: the development one prints a useLayoutEffect
     warning for every Link rendered on the server, which buries the output */
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{
    name: 'home-front-controls',
    setup(b) {
      for (const [filter, contents, loader] of SWAPS) {
        b.onLoad({ filter }, args => ({ contents: contents(), loader, resolveDir: path.dirname(args.path) }));
      }
    },
  }],
});

/* A browser's storage, stubbed so a render can plant a save. */
const store = new Map();
/** every key a render asks storage for, so section 6 can prove the rail asks for none */
const reads = [];
globalThis.localStorage = {
  getItem: k => { reads.push(k); return store.has(k) ? store.get(k) : null; },
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
const front = createRequire(import.meta.url)(bundle);
const { CATEGORIES, ALL_GAMES, HOME_STAGE, CATEGORY_SPORT } = front;
const gameByPath = new Map(ALL_GAMES.map(g => [g.path, g]));
const decode = s => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/* ── 1: the stage ─────────────────────────────────────────────────────── */
console.log('1) the Main Event band lists exactly the four flagships');
const FLAGSHIPS = ['/soccer-career', '/club-manager', '/stadium-tycoon', '/nba-my-career'];
{
  const paths = HOME_STAGE.map(e => e.path);
  if (JSON.stringify(paths) !== JSON.stringify(FLAGSHIPS)) fail(1, `the stage lists ${JSON.stringify(paths)}, not the four flagships in order`);
  for (const p of paths) if (!gameByPath.has(p)) fail(1, `${p} is on the stage and is not a live registry game`);
  store.clear();
  const html = front.renderStage();
  const cards = [...html.matchAll(/<a ([^>]*)>([\s\S]*?)<\/a>/g)]
    .filter(m => /\bdata-stage-card="/.test(m[1]))
    .map(m => ({ href: (/\bhref="([^"]+)"/.exec(m[1]) || [])[1] || '', h3: decode((/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(m[2]) || [])[1] || '').trim() }));
  if (JSON.stringify(cards.map(c => c.href)) !== JSON.stringify(FLAGSHIPS)) {
    fail(1, `the rendered band links ${JSON.stringify(cards.map(c => c.href))}`);
  }
  for (const c of cards) {
    const g = gameByPath.get(c.href);
    if (g && c.h3 !== g.label) fail(1, `the ${c.href} card reads ${JSON.stringify(c.h3)} and the registry says ${JSON.stringify(g.label)}`);
  }
  /* the words come from the registry, not a second copy typed into the card */
  const stageCode = stripComments(read('src/components/home/FeaturedStage.tsx'));
  for (const p of FLAGSHIPS) {
    const g = gameByPath.get(p);
    if (g && stageCode.includes(`'${g.label}'`)) fail(1, `FeaturedStage.tsx types the label ${JSON.stringify(g.label)} instead of reading the registry`);
  }
  if (!failedSections.has(1)) console.log(`   ${cards.length} cards rendered, ${cards.map(c => c.h3).join(', ')}, every one a live game`);
}

/* ── 2: the Continue keys ─────────────────────────────────────────────── */
console.log('2) the Continue buttons look for the keys the games really save under');
{
  const saveKeyIn = rel => {
    const m = /const SAVE_KEY\s*=\s*(['"])([^'"]+)\1/.exec(stripComments(read(rel)));
    return m ? m[2] : null;
  };
  const REAL = { '/soccer-career': saveKeyIn('src/pages/SoccerCareer.tsx'), '/club-manager': saveKeyIn('src/lib/clubManager.ts') };
  for (const [p, key] of Object.entries(REAL)) {
    if (!key) { fail(2, `could not read SAVE_KEY for ${p} from its source, so nothing was compared`); continue; }
    const entry = HOME_STAGE.find(e => e.path === p);
    if (!entry || !entry.saveKey || !entry.continueCta) { fail(2, `${p} has no Continue key on the stage`); continue; }
    if (entry.saveKey !== key) fail(2, `${p} looks for ${JSON.stringify(entry.saveKey)} and the game saves under ${JSON.stringify(key)}`);
    /* and the render agrees: planted under the REAL key, Continue shows */
    store.clear();
    const cold = decode(front.renderStage());
    store.set(key, '{}');
    const warm = decode(front.renderStage());
    store.clear();
    if (cold.includes(entry.continueCta)) fail(2, `${p} says ${JSON.stringify(entry.continueCta)} with no save in the browser`);
    if (!warm.includes(entry.continueCta)) fail(2, `${p} does not say ${JSON.stringify(entry.continueCta)} with a save under its real key ${JSON.stringify(key)}`);
  }
  const stageCode = stripComments(read('src/components/home/FeaturedStage.tsx'));
  if (/JSON\.parse/.test(stageCode)) fail(2, 'FeaturedStage.tsx parses something; the stage must only ask whether a save exists');
  if (!failedSections.has(2)) console.log(`   ${Object.entries(REAL).map(([p, k]) => `${p} -> ${k}`).join(', ')}, Continue shows only with that key planted`);
}

/* ── 3: a colour and a glyph for every sport ──────────────────────────── */
console.log('3) every category has an ink in both themes and a drawn glyph');
{
  const block = (sel) => {
    const at = css.indexOf(sel);
    if (at < 0) return '';
    return css.slice(at, css.indexOf('\n  }', at));
  };
  const dark = block(':root {');
  const light = block(':root.light {');
  const token = (src, name) => {
    const m = new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`).exec(src);
    return m ? m.slice(1).map(Number) : null;
  };
  const lum = ([h, s, l]) => {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const lin = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4));
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const surface = { dark: token(dark, 'surface-1'), light: token(light, 'surface-1') };
  if (!surface.dark || !surface.light) fail(3, 'could not read --surface-1 in both themes, so no ink was measured');
  const sports = new Set();
  for (const cat of CATEGORIES) {
    const sport = CATEGORY_SPORT[cat.title];
    if (!sport) { fail(3, `the category ${JSON.stringify(cat.title)} maps to no sport`); continue; }
    sports.add(sport);
  }
  const worst = [];
  for (const sport of sports) {
    for (const [theme, src] of [['dark', dark], ['light', light]]) {
      const ink = token(src, `sport-${sport}`);
      if (!ink) { fail(3, `--sport-${sport} is missing from the ${theme} theme`); continue; }
      if (surface[theme]) {
        const r = ratio(ink, surface[theme]);
        worst.push(r);
        if (r < 3) fail(3, `--sport-${sport} measures ${r.toFixed(2)} to 1 on the ${theme} surface, under 3`);
      }
    }
    const svg = front.renderGlyph(sport);
    if (!/<(path|circle|ellipse|rect)\b/.test(svg)) fail(3, `the ${sport} glyph draws nothing`);
  }
  if (!failedSections.has(3)) console.log(`   ${CATEGORIES.length} categories, ${sports.size} sports, every ink in both themes (lowest ${Math.min(...worst).toFixed(2)} to 1), every glyph drawn`);
}

/* ── 4: the dailies rail ──────────────────────────────────────────────── */
console.log('4) the dailies rail is exactly the registry\'s daily games, led by the date\'s pick');
const DAY = '2026-09-19';
const hrefsWith = (html, attr) => [...html.matchAll(/<a ([^>]*)>/g)]
  .map(m => m[1]).filter(a => new RegExp(`\\b${attr}="`).test(a))
  .map(a => (/\bhref="([^"]+)"/.exec(a) || [])[1] || '');
{
  const dailies = ALL_GAMES.filter(g => g.daily).map(g => g.path);
  store.clear();
  const html = front.renderRail(DAY);
  const spot = hrefsWith(html, 'data-daily-spotlight');
  const chips = hrefsWith(html, 'data-daily-chip');
  const shown = [...spot, ...chips];
  const missing = dailies.filter(p => !shown.includes(p));
  const extra = shown.filter(p => !dailies.includes(p));
  const twice = shown.filter((p, i) => shown.indexOf(p) !== i);
  if (dailies.length < 10) fail(4, `the registry reads only ${dailies.length} daily games, so this measured almost nothing`);
  if (missing.length) fail(4, `${missing.length} daily game(s) missing from the rail: ${missing.slice(0, 4).join(', ')}`);
  if (extra.length) fail(4, `the rail shows ${extra.length} game(s) the registry does not flag daily: ${extra.slice(0, 4).join(', ')}`);
  if (twice.length) fail(4, `the rail shows ${twice.join(', ')} more than once`);
  const expected = dailies[front.dailyIndex(DAY, dailies.length)];
  if (spot.length !== 1) fail(4, `the rail has ${spot.length} Today's puzzle cards, not one`);
  else if (spot[0] !== expected) fail(4, `Today's puzzle for ${DAY} is ${spot[0]}, and the date picks ${expected}`);
  if (!/Today(&#x27;|&#39;|')s puzzle/.test(html)) fail(4, 'the spotlight does not say Today\'s puzzle');
  /* the front changes every day, and every daily gets its day */
  const n = dailies.length;
  const start = Date.UTC(2026, 8, 19);
  const picks = Array.from({ length: 3 * n }, (_, d) => front.todaysPuzzle(new Date(start + d * 86400000).toISOString().slice(0, 10))?.path);
  const repeats = picks.filter((p, i) => i > 0 && p === picks[i - 1]).length;
  const neverLed = dailies.filter(p => !picks.includes(p));
  if (repeats) fail(4, `the same puzzle leads two days running ${repeats} time(s) in ${3 * n} days`);
  if (neverLed.length) fail(4, `${neverLed.length} daily game(s) never lead in ${3 * n} days: ${neverLed.slice(0, 3).join(', ')}`);
  if (!failedSections.has(4)) console.log(`   ${shown.length} of ${n} dailies on the rail, ${spot[0]} leads on ${DAY}; over ${3 * n} days every daily leads, never twice running`);
}

/* ── 5: Just shipped ──────────────────────────────────────────────────── */
console.log('5) Just shipped reads the ship dates from the registry');
{
  const byDate = ALL_GAMES.map((g, i) => ({ g, i })).filter(x => x.g.addedOn)
    .sort((a, b) => b.g.addedOn.localeCompare(a.g.addedOn) || a.i - b.i).map(x => x.g.path);
  store.clear();
  const html = front.renderShipped();
  const shown = hrefsWith(html, 'data-shipped-card');
  const want = byDate.slice(0, shown.length);
  if (shown.length < 3) fail(5, `Just shipped rendered ${shown.length} game(s)`);
  if (JSON.stringify(shown) !== JSON.stringify(want)) fail(5, `Just shipped shows ${JSON.stringify(shown)}, and the newest by addedOn are ${JSON.stringify(want)}`);
  if (!/href="\/whats-new"/.test(html)) fail(5, 'Just shipped does not link to /whats-new');
  for (const rel of ['src/components/home/JustShipped.tsx', 'src/data/homeFront.ts']) {
    const typed = stripComments(read(rel)).match(/\b20\d\d-\d\d-\d\d\b/);
    if (typed) fail(5, `${rel} types a date (${typed[0]}); the box must read addedOn`);
  }
  if (!failedSections.has(5)) console.log(`   ${shown.join(', ')}, newest first by addedOn, with the way into /whats-new`);
}

/* ── 6: no personal progress on the rail ──────────────────────────────── */
console.log('6) the rail is the same for everybody: no ticks, no counts, no reading your record');
{
  store.clear();
  reads.length = 0;
  const cold = front.renderRail(DAY);
  const readCold = reads.length;
  const et = DAY;
  const perGame = Object.fromEntries(ALL_GAMES.filter(g => g.daily).map(g => [g.path.slice(1), { current: 4, longest: 9, lastDate: et }]));
  store.set('dukb-streaks-v1', JSON.stringify({ version: 1, global: { current: 4, longest: 9, lastDate: et }, perGame, loginDates: [], totalPlays: 40, totalPoints: 900 }));
  reads.length = 0;
  const warm = front.renderRail(DAY);
  const readWarm = reads.length;
  store.clear();
  if (readCold + readWarm > 0) fail(6, `rendering the rail asked browser storage for ${readCold + readWarm} key(s); a plain rail has no reason to`);
  if (cold !== warm) fail(6, 'the rail renders differently once a streak record exists, which is a personal checklist again');
  const text = decode(warm.replace(/<[^>]+>/g, ' '));
  const words = text.match(/\b(done|completed|played|streak|day \d+|\d+ of \d+|\d+\/\d+)\b|✓|✔/i);
  if (words) fail(6, `the rail prints ${JSON.stringify(words[0])}, which is progress talk`);
  if (!failedSections.has(6)) console.log('   no storage read, identical with a planted record, no progress words');
}

/* ── the verdict ──────────────────────────────────────────────────────── */
fs.rmSync(temp, { recursive: true, force: true });
console.log('');
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const others = [...failedSections].filter(s => s !== want);
  if (failedSections.has(want) && others.length === 0) {
    console.log(`simHomeFront control ${CONTROL}: green. Section ${want} went red and nothing else did.`);
    process.exit(0);
  }
  console.error(`simHomeFront control ${CONTROL}: RED. Expected only section ${want} to fail, got ${JSON.stringify([...failedSections])}.`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simHomeFront: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simHomeFront: green. The home front shows real games, real saves and a sport you can tell apart without colour.');
