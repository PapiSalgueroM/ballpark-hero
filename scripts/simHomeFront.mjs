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
 *   7 continue  Round 717's Continue playing row. Every save key on its list
 *               (src/data/continueSaves.ts) equals the SAVE_KEY the game's own
 *               file declares; every *SAVE_KEY constant anywhere in src is on
 *               the list or excused here by name, so the next long form game
 *               cannot ship without a card; every field a card reads is a
 *               property the game's own code declares; saves built by ten of
 *               the engines themselves read back as the line the engine's own
 *               values say; a hostile save never throws and never prints more
 *               than a short name; and the rendered row is empty with no save
 *               and shows exactly one card per planted save, in list order.
 *   8 favsport  The favourite sport moves exactly its own section to the
 *               front and leaves the rest in registry order, no pick is
 *               registry order, a stored value that is not a sport reads as no
 *               pick, and the chips render one pressed button for the pick.
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
 *   continuekey    the Fight Gym card looks for a key the game never writes
 *   continuefield  the Stadium Tycoon card reads a field the save does not have
 *   continueguard  a card prints a save's name at any length
 *   continuecold   the row renders its heading with no save in the browser
 *   aussiemissing  the new manager's real save has no registered card
 *   aussiekey      the manager card reads a key its hook never writes
 *   aussiefield    the action log's club ID is mistaken for a display name
 *   aussieround    the action count is falsely displayed as a round
 *   favfirst       the favourite sport is ignored
 *   favtrust       any stored string is taken as a sport
 *
 * Run: node scripts/simHomeFront.mjs
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { US_CAREER_BOARD, US_CAREER_SPORTS, allWrapperProblems } from './lib/usCareerFiles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLS = {
  stage: 1, savekey: 2, nocolour: 3, noglyph: 3, rail: 4, shipped: 5, progress: 6,
  continuekey: 7, continuefield: 7, continueguard: 7, continuecold: 7, favfirst: 8, favtrust: 8,
  aussiemissing: 7, aussiekey: 7, aussiefield: 7, aussieround: 7,
};
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
let continueSrc = read('src/data/continueSaves.ts');
const aussieRow = "{ path: '/aussie-rules-manager', saveKey: 'aussie-rules-manager-save-v1' }";
if (CONTROL.startsWith('aussie') && continueSrc.split(aussieRow).length !== 2) {
  console.error('Aussie control needs one unique real Continue row'); process.exit(1);
}
continueSrc = controlled('aussiemissing', continueSrc, `  ${aussieRow},\n`, '');
continueSrc = controlled('aussiekey', continueSrc, aussieRow, aussieRow.replace('save-v1', 'save-v2'));
continueSrc = controlled('aussiefield', continueSrc, aussieRow, aussieRow.replace(' }', ", name: ['clubId'] }"));
continueSrc = controlled('aussieround', continueSrc, aussieRow, aussieRow.replace(' }', ", count: { at: ['actions'], say: 'round {n}' } }"));
continueSrc = controlled('continuekey', continueSrc, "saveKey: 'fight-gym-save-v1'", "saveKey: 'fight-gym-save-v2'");
continueSrc = controlled('continuefield', continueSrc, "at: ['matchNo']", "at: ['matchNum']");
continueSrc = controlled('continueguard', continueSrc,
  'return t.length > SAVE_NAME_MAX ? `${t.slice(0, SAVE_NAME_MAX - 3).trimEnd()}...` : t;', 'return t;');
let rowSrc = read('src/components/home/ContinueRow.tsx');
rowSrc = controlled('continuecold', rowSrc, 'if (saved.length === 0) return null;', 'if (saved.length < 0) return null;');
homeFrontSrc = controlled('favfirst', homeFrontSrc, 'if (!fav) return all;', 'return all;');
homeFrontSrc = controlled('favtrust', homeFrontSrc, '.includes(raw) ? (raw as SportKey) : null', '.includes(raw) ? (raw as SportKey) : (raw as SportKey)');

/* ── one bundle: the registry, the front data, and renders of the pieces ─ */
const temp = fs.mkdtempSync(path.join(os.tmpdir(), `dukb-home-front-${process.pid}-`));
const bundle = path.join(temp, 'front.cjs');
const SWAPS = [
  [/[\\/]src[\\/]data[\\/]homeFront\.ts$/, () => homeFrontSrc, 'ts'],
  [/[\\/]src[\\/]components[\\/]home[\\/]SportGlyph\.tsx$/, () => glyphSrc, 'tsx'],
  [/[\\/]src[\\/]components[\\/]home[\\/]DailyRail\.tsx$/, () => railSrc, 'tsx'],
  [/[\\/]src[\\/]components[\\/]home[\\/]JustShipped\.tsx$/, () => shippedSrc, 'tsx'],
  [/[\\/]src[\\/]data[\\/]continueSaves\.ts$/, () => continueSrc, 'ts'],
  [/[\\/]src[\\/]components[\\/]home[\\/]ContinueRow\.tsx$/, () => rowSrc, 'tsx'],
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
      /* Round 717 */
      import { ContinueRow } from './src/components/home/ContinueRow';
      import { FavouriteSport } from './src/components/home/FavouriteSport';
      export { CONTINUE_SAVES, describeSave, savedGames, SAVE_NAME_MAX } from './src/data/continueSaves';
      export { SAVED_FALLBACK } from './src/components/home/ContinueRow';
      export { VISIBLE_CATEGORIES } from './src/data/gameRegistry';
      export { favouriteFirst, readFavouriteSport, FAVOURITE_SPORT_KEY } from './src/data/homeFront';
      export const renderContinue = () => wrap(React.createElement(ContinueRow));
      export const renderFav = (sports, value) => renderToStaticMarkup(React.createElement(FavouriteSport, { sports, value, onPick: () => {} }));
      /* saves built by the engines themselves, each wrapped the way its board writes it */
      import * as FC from './src/lib/fightCareer';
      import * as FG from './src/lib/fightGym';
      import * as FP from './src/lib/fightPromoter';
      import * as HC from './src/lib/hallOfChampions';
      import * as IA from './src/lib/idleArena';
      import * as WF from './src/lib/wonderkidFactory';
      import * as ST from './src/lib/stadiumTycoon';
      import * as FO from './src/lib/frontOffice';
      import * as CFB from './src/lib/cfbDynasty';
      import * as CBB from './src/lib/cbbDynasty';
      import * as AR from './src/lib/aussieRulesManager';
      export { SAVE_KEY as AUSSIE_SAVE_KEY } from './src/lib/aussieRulesManager';
      export const restoreAussie = AR.readManagerSave;
      export const aussieResumeSaves = () => {
        const save = { version: 1, seed: 792, clubId: 'club-2', actions: [] };
        let state = AR.createManager(save.seed, save.clubId);
        const snapshots = [];
        const capture = () => snapshots.push({ raw: JSON.stringify(save), state });
        const commit = action => {
          const next = AR.reduceManager(state, action);
          if (next === state) throw new Error('The actual Aussie resume fixture rejected a legal action');
          save.actions.push(action); state = next;
        };
        capture();
        for (let round = 0; round < 10; round += 1) {
          commit({ type: 'prepare', choice: 'rest' });
          for (let quarter = 0; quarter < 4; quarter += 1) {
            commit({ type: 'play', tactic: 'control' });
            if (round === 0 && quarter === 0) capture();
            if (quarter < 3) commit({ type: 'next' });
          }
          commit({ type: 'next' });
        }
        capture();
        return snapshots;
      };
      export const engineSaves = () => {
        let seed = 717;
        const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
        const league = FO.initLeague(rng);
        const foTeam = Object.keys(league.teams)[0];
        const cfbTeam = CFB.CFB_SCHOOLS[0].id;
        const cbbTeam = CBB.CBB_SCHOOLS[0].id;
        return {
          '/fight-career': { raw: JSON.stringify({ st: FC.newFightCareer('Sim Tester', 'welter', 'slugger', 'sim'), phase: 'hub' }), want: /^Sim Tester, 0 fights$/ },
          '/fight-gym': { raw: JSON.stringify({ g: FG.newGym('Sim Gym', 'sim') }), want: /^Sim Gym, week 1$/ },
          '/fight-promoter': { raw: JSON.stringify({ st: FP.newPromoter('Sim Promotions', 'sim') }), want: /^Sim Promotions, show 1$/ },
          '/hall-of-champions': { raw: HC.serialize(HC.freshState(7), 0), want: /^1 wing open$/ },
          '/idle-arena': { raw: IA.serialize(IA.newState(0)), want: /^0 trophies$/ },
          '/wonderkid-factory': { raw: WF.serialize(WF.newFactory(0, 7)), want: /^\\d+ kids? in the academy$/ },
          '/stadium-tycoon': { raw: ST.serializeTycoon(ST.newTycoon(0), 0), want: /^0 matches played$/ },
          '/front-office': { raw: JSON.stringify({ league, myTeam: foTeam, phase: 'hub', titles: 0, seasonsPlayed: 0 }), want: new RegExp('^' + foTeam + ', 20\\\\d\\\\d season$') },
          '/cfb-dynasty': { raw: JSON.stringify({ st: CFB.initCfb(cfbTeam, rng), phase: 'hub', recruits: null, portal: null }), want: new RegExp('^' + cfbTeam + ', 20\\\\d\\\\d season$') },
          '/cbb-dynasty': { raw: JSON.stringify({ st: CBB.initCbb(cbbTeam, rng), phase: 'hub', recruits: null, portal: null }), want: new RegExp('^' + cbbTeam + ', 20\\\\d\\\\d season$') },
        };
      };
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

/* ── 7: Continue playing ──────────────────────────────────────────────── */
console.log('7) Continue playing: the right keys, real fields, hostile saves, one card per save');
{
  const { CONTINUE_SAVES, describeSave, savedGames, SAVE_NAME_MAX, SAVED_FALLBACK } = front;
  /* The file that declares each game's SAVE_KEY, then the files that declare
     the shape of what it saves. Typed here, apart from the list it checks. */
  const WHERE = {
    '/soccer-career': ['src/pages/SoccerCareer.tsx', 'src/lib/soccerCareerEngine.ts'],
    '/club-manager': ['src/lib/clubManager.ts'],
    '/stadium-tycoon': ['src/lib/stadiumTycoon.ts'],
    '/wonderkid-factory': ['src/lib/wonderkidFactory.ts'],
    '/rebuild': ['src/lib/rebuildSave.ts'],
    '/front-office': ['src/components/front-office/FrontOfficeBoard.tsx', 'src/lib/frontOffice.ts'],
    '/nfl-my-career': ['src/lib/nflCareerSport.ts', 'src/lib/nflMyCareer.ts'],
    '/cfb-dynasty': ['src/components/cfb-dynasty/CfbDynastyBoard.tsx', 'src/lib/cfbDynasty.ts'],
    '/cbb-dynasty': ['src/components/cbb-dynasty/CbbDynastyBoard.tsx', 'src/lib/cbbDynasty.ts'],
    '/nba-front-office': ['src/components/nba-front-office/NbaFrontOfficeBoard.tsx', 'src/lib/nbaFrontOffice.ts'],
    '/nba-my-career': ['src/lib/nbaCareerSport.ts', 'src/lib/nbaMyCareer.ts'],
    '/mlb-my-career': ['src/lib/mlbCareerSport.ts', 'src/lib/mlbMyCareer.ts'],
    '/mlb-front-office': ['src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', 'src/lib/mlbFrontOffice.ts'],
    '/nhl-my-career': ['src/lib/nhlCareerSport.ts', 'src/lib/nhlMyCareer.ts'],
    '/nhl-front-office': ['src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', 'src/lib/nhlFrontOffice.ts'],
    '/aussie-rules-manager': ['src/lib/aussieRulesManager.ts'],
    '/fight-career': ['src/components/fight-career/FightCareerBoard.tsx', 'src/lib/fightCareer.ts'],
    '/fight-promoter': ['src/components/fight-promoter/FightPromoterBoard.tsx', 'src/lib/fightPromoter.ts'],
    '/fight-gym': ['src/components/fight-gym/FightGymBoard.tsx', 'src/lib/fightGym.ts'],
    '/hall-of-champions': ['src/lib/hallOfChampions.ts'],
    '/idle-arena': ['src/lib/idleArena.ts'],
  };
  /* A save key in src that is deliberately NOT a card, and why. */
  const EXCUSED = {
    'rank-em-legends-circuit-v1': 'Rank Em opens on Daily; its saved three-puzzle side mode is reopened with Legends circuit, not the long-form Continue row',
    'dukb-face-off-v1': 'Face Off is a daily quiz; its save is a match record, not a run to go back to',
    'dukb-contract-chaos-v1': 'Contract Chaos plays its five seasons in one sitting; its save is a play record (played, best, total, the daily), not a run to go back to',
  };
  const SAVE_CONST = /\bconst\s+[A-Z_]*SAVE_KEY\s*=\s*(['"])([^'"]+)\1/g;
  const code = rel => stripComments(read(rel));

  /* Round 900: the four US careers are one board. Each sport's binding
     declares its key (the first file listed for it above), and the shared
     board is the file that writes the save, so the wrapper check in d reads
     it there. Every other game writes its save from its first file. */
  const WRITER = Object.fromEntries(US_CAREER_SPORTS.map(s => [s.route, US_CAREER_BOARD]));
  for (const why of allWrapperProblems(ROOT)) fail(7, why);
  for (const s of US_CAREER_SPORTS) {
    if (!code(s.binding).includes('saveKey: SAVE_KEY,')) fail(7, `${s.binding} does not hand the board the key it declares`);
  }
  if (!code(US_CAREER_BOARD).includes('localStorage.setItem(sport.saveKey, JSON.stringify({ c,')) fail(7, `${US_CAREER_BOARD} no longer writes the save under the binding's key`);

  /* a: live games, one card each */
  const paths = CONTINUE_SAVES.map(e => e.path);
  const keys = CONTINUE_SAVES.map(e => e.saveKey);
  if (CONTINUE_SAVES.length < 15) fail(7, `the list holds only ${CONTINUE_SAVES.length} games, so this measured almost nothing`);
  for (const p of paths) if (!gameByPath.has(p)) fail(7, `${p} is on the Continue list and is not a live registry game`);
  if (new Set(paths).size !== paths.length) fail(7, 'a game is on the Continue list twice');
  if (new Set(keys).size !== keys.length) fail(7, 'two Continue entries share a save key');

  /* b: each key is the one its game declares */
  for (const e of CONTINUE_SAVES) {
    const files = WHERE[e.path];
    if (!files) { fail(7, `${e.path} is on the list and this harness does not know where its save is declared`); continue; }
    const declared = [...code(files[0]).matchAll(SAVE_CONST)].map(m => m[2]);
    if (declared.length === 0) fail(7, `${files[0]} declares no SAVE_KEY, so ${e.path} was not compared`);
    else if (!declared.includes(e.saveKey)) fail(7, `${e.path} looks for ${JSON.stringify(e.saveKey)} and ${files[0]} saves under ${JSON.stringify(declared)}`);
  }

  /* c: every save key in src is a card or excused by name */
  const srcFiles = [];
  const walkDir = dir => {
    for (const d of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${d.name}`;
      if (d.isDirectory()) { if (d.name !== 'test' && d.name !== '__tests__') walkDir(rel); }
      else if (/\.(ts|tsx)$/.test(d.name) && !/\.test\.tsx?$/.test(d.name)) srcFiles.push(rel);
    }
  };
  walkDir('src');
  const found = new Map();
  for (const rel of srcFiles) {
    const txt = read(rel);
    if (!txt.includes('SAVE_KEY')) continue;
    for (const m of stripComments(txt).matchAll(SAVE_CONST)) found.set(m[2], rel);
  }
  if (found.size < 15) fail(7, `only ${found.size} save keys found in src, so the sweep read almost nothing`);
  for (const [key, rel] of found) {
    if (!keys.includes(key) && !(key in EXCUSED)) fail(7, `${rel} saves under ${JSON.stringify(key)} and that game has no Continue card and no excuse here`);
  }
  for (const key of keys) if (!found.has(key)) fail(7, `the Continue list looks for ${JSON.stringify(key)} and no file in src declares it`);

  /* d: every field a card reads is one the game's own code declares */
  let fieldsChecked = 0;
  for (const e of CONTINUE_SAVES) {
    const files = WHERE[e.path];
    if (!files) continue;
    const src = files.map(code).join('\n');
    const at = [e.name, e.count && e.count.at, e.ended && e.ended.at].filter(Boolean);
    for (const fieldPath of at) {
      fieldPath.forEach((seg, i) => {
        if (/^\d+$/.test(seg)) return;
        fieldsChecked += 1;
        /* a one or two letter wrapper is what the board hands JSON.stringify */
        if (i === 0 && seg.length <= 2) {
          const writer = WRITER[e.path] ?? files[0];
          if (!new RegExp(`JSON\\.stringify\\(\\{\\s*${seg}\\b`).test(code(writer))) fail(7, `${e.path} reads the save through ${JSON.stringify(seg)}, and ${writer} does not write a save wrapped in it`);
          return;
        }
        if (!new RegExp(`\\b${seg}\\??\\s*:`).test(src)) fail(7, `${e.path} reads ${JSON.stringify(fieldPath.join('.'))} and ${JSON.stringify(seg)} is not a property ${files.join(' or ')} declares`);
      });
    }
  }

  /* e: saves the engines built themselves read back as their own values */
  const engine = front.engineSaves();
  for (const [p, { raw, want }] of Object.entries(engine)) {
    const e = CONTINUE_SAVES.find(x => x.path === p);
    if (!e) { fail(7, `${p} has an engine save here and no Continue entry`); continue; }
    const line = describeSave(e, raw);
    if (!line || !want.test(line)) fail(7, `a save ${p}'s own engine built reads ${JSON.stringify(line)}, and its values say ${want}`);
  }

  /* and hand built saves in each game's shape, for the ones with no cheap engine start */
  const SAMPLES = {
    '/soccer-career': [[{ currentClub: 'Sample Town', age: 23, retired: false }, 'Sample Town, age 23'], [{ currentClub: 'Sample Town', age: 36, retired: true }, 'Sample Town, retired']],
    '/club-manager': [[{ clubName: 'Sample FC', season: 3, sacked: false }, 'Sample FC, season 3'], [{ clubName: 'Sample FC', season: 3, sacked: true }, 'Sample FC, sacked']],
    '/rebuild': [[{ v: 1, seats: [{ kind: 'human', club: 'Sample United' }] }, 'Sample United']],
    '/nfl-my-career': [[{ c: { team: 'ABC', year: 2029, retired: false }, phase: 'hub' }, 'ABC, 2029 season']],
    '/nba-my-career': [[{ c: { team: 'ABC', year: 2030, retired: true }, phase: 'retired' }, 'ABC, retired']],
    '/mlb-my-career': [[{ c: { team: 'ABC', year: 2031 }, phase: 'hub' }, 'ABC, 2031 season']],
    '/nhl-my-career': [[{ c: { team: 'ABC', year: 2032 }, phase: 'hub' }, 'ABC, 2032 season']],
    '/nba-front-office': [[{ league: { season: 2027 }, myTeam: 'ABC', fired: false }, 'ABC, 2027 season']],
    '/mlb-front-office': [[{ league: { season: 2028 }, myTeam: 'ABC', fired: true }, 'ABC, fired']],
    '/nhl-front-office': [[{ league: { season: 2029 }, myTeam: 'ABC' }, 'ABC, 2029 season']],
    '/stadium-tycoon': [[{ clubName: 'Sample Rovers', matchNo: 1 }, 'Sample Rovers, 1 match played']],
  };
  for (const [p, cases] of Object.entries(SAMPLES)) {
    const e = CONTINUE_SAVES.find(x => x.path === p);
    for (const [obj, want] of cases) {
      const line = e ? describeSave(e, JSON.stringify(obj)) : null;
      if (line !== want) fail(7, `${p} reads ${JSON.stringify(obj)} as ${JSON.stringify(line)}, expected ${JSON.stringify(want)}`);
    }
  }

  /* f: a hostile save never throws and never prints much */
  const plant = (fieldPath, value) => {
    const root = /^\d+$/.test(fieldPath[0]) ? [] : {};
    let cur = root;
    fieldPath.forEach((seg, i) => {
      if (i === fieldPath.length - 1) { cur[seg] = value; return; }
      const next = /^\d+$/.test(fieldPath[i + 1]) ? [] : {};
      cur[seg] = next; cur = next;
    });
    return root;
  };
  let hostileRuns = 0;
  for (const e of CONTINUE_SAVES) {
    const raws = ['not json{', '[]', 'null', '42', '"text"', '{}', '{"__proto__":{"clubName":"Evil","season":3}}'];
    if (e.name) {
      raws.push(JSON.stringify(plant(e.name, 'x'.repeat(5000))));
      raws.push(JSON.stringify(plant(e.name, 12345)));
      raws.push(JSON.stringify(plant(e.name, 'A\u0000B\n\tC')));
    }
    if (e.count) for (const bad of [-1, 1.5, 1e9, '12', null, { n: 3 }]) raws.push(JSON.stringify(plant(e.count.at, bad)));
    if (e.ended) raws.push(JSON.stringify(plant(e.ended.at, 'true')));
    for (const raw of raws) {
      hostileRuns += 1;
      let line;
      try { line = describeSave(e, raw); } catch (err) { fail(7, `${e.path} throws on ${raw.slice(0, 40)}: ${err.message}`); continue; }
      if (line === null) continue;
      if (typeof line !== 'string') { fail(7, `${e.path} returned ${typeof line} for ${raw.slice(0, 40)}`); continue; }
      if (line.length > SAVE_NAME_MAX + 30) fail(7, `${e.path} prints ${line.length} characters for ${raw.slice(0, 40)}...`);
      if (/[\u0000-\u001f]/.test(line)) fail(7, `${e.path} prints a control character`);
      if (/Evil|NaN|undefined|null|-1|1\.5|1000000000|\[object/.test(line)) fail(7, `${e.path} prints ${JSON.stringify(line)} for ${raw.slice(0, 40)}`);
      if (e.ended && raw.includes('"true"') && line.includes(e.ended.say)) fail(7, `${e.path} calls a save ${e.ended.say} on the string "true"`);
    }
  }

  /* g: the rendered row */
  const withWindow = fn => {
    const had = 'window' in globalThis;
    const old = globalThis.window;
    globalThis.window = { localStorage: globalThis.localStorage };
    try { return fn(); } finally { if (had) globalThis.window = old; else delete globalThis.window; }
  };
  const cards = html => [...html.matchAll(/<a ([^>]*)>([\s\S]*?)<\/a>/g)]
    .filter(m => /\bdata-continue-card="/.test(m[1]))
    .map(m => ({ href: (/\bhref="([^"]+)"/.exec(m[1]) || [])[1] || '', inner: decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() }));
  store.clear();
  reads.length = 0;
  const cold = withWindow(() => front.renderContinue());
  if (cold !== '') fail(7, `with no save in the browser the row renders ${cold.length} characters instead of nothing`);
  if (savedGames(globalThis.localStorage).length !== 0) fail(7, 'savedGames finds a save in an empty browser');
  if (reads.some(k => !keys.includes(k))) fail(7, `the row asks storage for ${reads.filter(k => !keys.includes(k)).join(', ')}, which is not a save key`);
  for (const e of CONTINUE_SAVES) {
    store.clear();
    store.set(e.saveKey, '{}');
    const got = cards(withWindow(() => front.renderContinue()));
    const g = gameByPath.get(e.path);
    if (got.length !== 1 || got[0].href !== e.path) fail(7, `a save under ${JSON.stringify(e.saveKey)} renders ${JSON.stringify(got.map(c => c.href))}, not one card for ${e.path}`);
    else if (g && !(got[0].inner.includes(g.label) && got[0].inner.includes(SAVED_FALLBACK))) fail(7, `the ${e.path} card reads ${JSON.stringify(got[0].inner)}`);
  }
  /* Action logs contain no saved club name or round; replay belongs to the game. */
  const aussie = CONTINUE_SAVES.find(entry => entry.path === '/aussie-rules-manager');
  const aussieSaves = front.aussieResumeSaves();
  if (JSON.stringify(aussieSaves.map(value => value.state.phase)) !== JSON.stringify(['prepare', 'break', 'complete'])) fail(7, 'the actual Aussie fixtures did not reach initial, quarter break and completed states');
  for (const { raw, state } of aussieSaves) {
    const restored = front.restoreAussie(raw);
    if (!restored || JSON.stringify(restored.state) !== JSON.stringify(state)) fail(7, 'the serialized Aussie action log does not resume its actual engine state');
    const shape = JSON.parse(raw);
    if (JSON.stringify(Object.keys(shape).sort()) !== JSON.stringify(['actions', 'clubId', 'seed', 'version'])) fail(7, 'the Aussie fixture is not the strict saved action-log shape');
    if (!aussie || describeSave(aussie, raw) !== null) fail(7, 'Aussie Continue must not invent a display name or round from the action log');
    store.clear(); store.set(front.AUSSIE_SAVE_KEY, raw);
    const got = cards(withWindow(() => front.renderContinue()));
    const game = gameByPath.get('/aussie-rules-manager');
    const expected = `${game.emoji} ${game.label} ${SAVED_FALLBACK}`;
    if (got.length !== 1 || got[0].href !== '/aussie-rules-manager' || got[0].inner !== expected) fail(7, `a real ${state.phase} Aussie save must render exactly its generic saved card, got ${JSON.stringify(got)}`);
    if (store.get(front.AUSSIE_SAVE_KEY) !== raw) fail(7, 'Continue changed the serialized Aussie save bytes');
  }
  for (const unrelated of [null, 'aussie-rules-manager-save-v2']) {
    store.clear(); if (unrelated) store.set(unrelated, aussieSaves[1].raw);
    if (savedGames(globalThis.localStorage).length !== 0 || cards(withWindow(() => front.renderContinue())).length !== 0) fail(7, 'an absent Aussie key or another save version must not create a Continue card');
  }
  store.clear();
  for (const e of CONTINUE_SAVES) store.set(e.saveKey, '{}');
  const all = cards(withWindow(() => front.renderContinue())).map(c => c.href);
  store.clear();
  if (JSON.stringify(all) !== JSON.stringify(paths)) fail(7, `with every save planted the row shows ${all.length} cards, not the ${paths.length} on the list in order`);
  if (!failedSections.has(7)) {
    console.log(`   ${CONTINUE_SAVES.length} games, every key the game's own, ${found.size} save keys in src all accounted for (${Object.keys(EXCUSED).length} excused), ${fieldsChecked} fields declared by the games`);
    console.log(`   ${Object.keys(engine).length} engine built saves and ${Object.values(SAMPLES).flat().length} shaped saves read right, ${hostileRuns} hostile saves survived, empty with none, one card per save`);
    console.log('   three real Aussie action logs resume exact initial/break/completed states, generic card only, bytes held and no absent/wrong-key card');
  }
}

/* ── 8: the favourite sport ───────────────────────────────────────────── */
console.log('8) the favourite sport moves its own section first and nothing else');
{
  const { VISIBLE_CATEGORIES, favouriteFirst, readFavouriteSport, FAVOURITE_SPORT_KEY } = front;
  const titles = VISIBLE_CATEGORIES.map(c => c.title);
  const sports = VISIBLE_CATEGORIES.map(c => CATEGORY_SPORT[c.title]);
  if (JSON.stringify(favouriteFirst(VISIBLE_CATEGORIES, null).map(c => c.title)) !== JSON.stringify(titles)) fail(8, 'with no pick the sections are not in registry order');
  for (const [i, s] of sports.entries()) {
    const got = favouriteFirst(VISIBLE_CATEGORIES, s).map(c => c.title);
    const want = [titles[i], ...titles.filter((_, j) => j !== i)];
    if (JSON.stringify(got) !== JSON.stringify(want)) fail(8, `picking ${s} orders the sections ${JSON.stringify(got.slice(0, 3))}..., expected ${JSON.stringify(want.slice(0, 3))}...`);
  }
  const reader = v => ({ getItem: k => (k === FAVOURITE_SPORT_KEY ? v : null) });
  if (readFavouriteSport(reader(sports[3])) !== sports[3]) fail(8, `a stored ${JSON.stringify(sports[3])} does not read back`);
  for (const bad of ['banana', '', ' soccer', 'Soccer', '__proto__', 'toString', 'constructor', '{"s":1}']) {
    if (readFavouriteSport(reader(bad)) !== null) fail(8, `a stored ${JSON.stringify(bad)} reads as a sport`);
  }
  if (readFavouriteSport({ getItem: () => { throw new Error('blocked'); } }) !== null) fail(8, 'blocked storage does not read as no pick');
  if (readFavouriteSport(null) !== null) fail(8, 'no storage does not read as no pick');
  const html = front.renderFav(sports, 'hockey');
  const buttons = [...html.matchAll(/<button ([^>]*)>/g)].map(m => m[1]);
  const pressed = buttons.filter(a => /aria-pressed="true"/.test(a));
  if (buttons.length !== sports.length) fail(8, `${buttons.length} chips for ${sports.length} sports`);
  if (buttons.some(a => !/type="button"/.test(a))) fail(8, 'a chip is not a plain button');
  if (pressed.length !== 1 || !/data-fav-sport="hockey"/.test(pressed[0])) fail(8, `with hockey picked ${pressed.length} chip(s) read pressed`);
  if (/aria-pressed="true"/.test(front.renderFav(sports, null))) fail(8, 'a chip reads pressed with no pick');
  if (!failedSections.has(8)) console.log(`   ${sports.length} sports, each moves only its own section first, 8 bad stored values read as no pick, one pressed chip`);
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
