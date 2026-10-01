/**
 * Round 260 harness (number 111): the home page's static claims are true.
 *
 * WHY THIS EXISTS, and it is not a hypothetical. Round 257 gave the home page
 * a block of static content in index.html so a crawler could read it without
 * running JavaScript, which is the whole reason the site was turned down for
 * AdSense. Two of the numbers in that block were wrong the day it shipped: it
 * said more than 120 games and nearly forty soccer games, and the registry the
 * site actually renders from holds 113 and 30. Both were read off a grep of
 * the registry FILE rather than off the registry itself, which counted paths
 * that are defined but not in any visible category.
 *
 * That is the single worst kind of mistake this project can make, because the
 * site's whole promise is that the numbers on it are real, and because a claim
 * baked into a template is invisible to every other check: it is not React, it
 * is not in src/data, and nothing renders it in a test. So it gets its own
 * checker.
 *
 *   1. EVERY NUMBER IN THE BLOCK IS TRUE. The counts are read out of the
 *      prose and compared against the registry the site renders from, not
 *      against a grep of a file.
 *   2. A FLOOR IS A FLOOR, AND A FLOOR STAYS USEFUL. "120+" must be under
 *      the real count, and it must be within a sane distance of it,
 *      because a floor forty games behind reality is not much better than one
 *      ahead of it. Both directions fail.
 *   3. EVERY LINK GOES SOMEWHERE. Each href in the block must be a real route
 *      in App.tsx. A crawler following a dead link on the home page is worse
 *      than no link.
 *   4. THE BLOCK IS STILL THERE AND STILL SUBSTANTIAL. The measured "before"
 *      was 43 characters of readable text, which is what made the most
 *      important page on the site the emptiest. If someone empties it again
 *      this fails rather than silently regressing the thing that fixed the
 *      AdSense case.
 *   5. IT NAMES NOTHING IT SHOULD NOT. No dates, no results, no figure that
 *      belongs to one day.
 *
 * Since Round 651 the head's meta description is held equal to the one the
 * app renders (part 4b), read with comments stripped from both files, with
 * the controls HOME_COPY_CONTROL=descdrift, commentapp and commenttpl.
 *
 * Round 840 added two parts, because the block above was only ever half the
 * story: Google indexes the page AFTER it renders, React threw the whole block
 * away on mount, and measured on the live site on 2026-10-01 the rendered home
 * kept 0 of its 5,592 characters and had 6 blocks of 120 characters or more,
 * every one a tile blurb. The words now live in src/data/homeCopy.ts.
 *   6. THE TEMPLATE BLOCK IS THE MODULE'S. The block between the home-copy
 *      markers in index.html must be exactly what scripts/genHomeCopy.mjs
 *      writes from the module (scripts/lib/homeCopyHtml.mjs, the same function
 *      the generator calls), line endings aside.
 *   7. THE RENDERED HOME CARRIES IT. Index renders through react-dom/server
 *      inside a MemoryRouter (supabase stubbed, effects do not run on the
 *      server, which is also true of the first paint): exactly one h1, reading
 *      the module's h1; every heading, paragraph and list item of the module in
 *      the About section in order, with every link; every paragraph of 120
 *      characters or more in the page's text; the section after the last game
 *      tile, and not hidden.
 * Controls, each must turn ONLY its own part red:
 *   moduledrift    one sentence of the module changes (part 6)
 *   templatedrift  the same sentence changes in the template only (part 6)
 *   nosection      the About section is taken out of Index.tsx (part 7)
 *   h1brand        the h1 says only the brand again (part 7)
 *
 * Run: node scripts/simHomeCopy.mjs
 */
import { build } from 'esbuild';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { HOME_COPY_START, HOME_COPY_END, homeCopyLines, splitAtMarkers } from './lib/homeCopyHtml.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* The controls, parsed up front because several edit a source in memory
   before anything reads it. The value is the part that must go red. */
const CONTROL = process.env.HOME_COPY_CONTROL || '';
const HOME_CONTROLS = {
  descdrift: '4b', commentapp: '4b', commenttpl: '4b',
  moduledrift: '6', templatedrift: '6', nosection: '7', h1brand: '7',
};
if (CONTROL && !(CONTROL in HOME_CONTROLS)) {
  console.error(`HOME_COPY_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(HOME_CONTROLS).join(', ')})`);
  process.exit(1);
}
/** Rewrites a source in memory for a control, refusing if nothing changed. */
function controlled(name, src, from, to) {
  if (CONTROL !== name) return src;
  if (!src.includes(from)) {
    console.error(`control ${name}: ${JSON.stringify(from)} is not in the source, so it would prove nothing`);
    process.exit(1);
  }
  const out = src.split(from).join(to);
  if (out === src) { console.error(`control ${name}: the source did not change`); process.exit(1); }
  console.log(`   control ${name}: ${JSON.stringify(from)} becomes ${JSON.stringify(to)}`);
  return out;
}

const DRIFT_FROM = 'international call-ups, the lot.';
const DRIFT_TO = 'international call-ups, the works.';
const homeCopySrc = controlled('moduledrift', readFileSync(path.join(ROOT, 'src/data/homeCopy.ts'), 'utf8'), DRIFT_FROM, DRIFT_TO);
let indexBundled = readFileSync(path.join(ROOT, 'src/pages/Index.tsx'), 'utf8');
indexBundled = controlled('nosection', indexBundled, '<HomeAbout />', '');
indexBundled = controlled('h1brand', indexBundled, '<span className="sr-only">{HOME_COPY.h1.slice(HOME_COPY.brand.length)}</span>', '');

/* One bundle: the registry, the copy module, and a server render of the home
   page. The supabase client is a stub that answers every call with itself:
   nothing reaches the network, and nothing that runs on the server calls it. */
const temp = mkdtempSync(path.join(os.tmpdir(), `dukb-home-copy-${process.pid}-`));
const bundleFile = path.join(temp, 'home.cjs');
const SUPABASE_STUB = `
  const handler = { get: (t, k) => (k === 'then' ? undefined : chain), apply: () => chain };
  const chain = new Proxy(function () {}, handler);
  export const supabase = chain;
  export const SUPABASE_URL = 'https://stub.invalid';
  export const SUPABASE_PUBLISHABLE_KEY = 'stub';
`;
const SWAPS = [
  [/[\\/]src[\\/]data[\\/]homeCopy\.ts$/, () => homeCopySrc, 'ts'],
  [/[\\/]src[\\/]pages[\\/]Index\.tsx$/, () => indexBundled, 'tsx'],
  [/[\\/]src[\\/]integrations[\\/]supabase[\\/]client\.ts$/, () => SUPABASE_STUB, 'ts'],
];
try {
  await build({
    stdin: {
      contents: `
        import React from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { MemoryRouter } from 'react-router-dom';
        import { HelmetProvider } from 'react-helmet-async';
        import { AuthProvider } from './src/contexts/AuthContext';
        import Index from './src/pages/Index';
        export { CATEGORIES, ALL_GAMES } from './src/data/gameRegistry';
        export { HOME_COPY } from './src/data/homeCopy';
        export const renderHome = () => renderToStaticMarkup(
          React.createElement(HelmetProvider, { context: {} },
            React.createElement(MemoryRouter, { initialEntries: ['/'] },
              React.createElement(AuthProvider, null, React.createElement(Index)))));
      `,
      resolveDir: ROOT,
      loader: 'tsx',
    },
    bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', outfile: bundleFile,
    alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
    /* the production React build: the development one warns about
       useLayoutEffect for every Link rendered on the server */
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{
      name: 'home-copy-swaps',
      setup(b) {
        for (const [filter, contents, loader] of SWAPS) {
          b.onLoad({ filter }, args => ({ contents: contents(), loader, resolveDir: path.dirname(args.path) }));
        }
      },
    }],
  });
} catch (e) {
  rmSync(temp, { recursive: true, force: true });
  throw e;
}
/* A browser's storage, empty, for anything that reads it while rendering. */
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
const bundled = createRequire(import.meta.url)(bundleFile);
const { CATEGORIES, ALL_GAMES, HOME_COPY } = bundled;

let failures = 0;
let part = '1';
const failedParts = new Set();
const fail = m => { failures += 1; failedParts.add(part); console.error('  FAIL: ' + m); };

let html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = controlled('templatedrift', html, DRIFT_FROM, DRIFT_TO);
let indexPage = readFileSync(path.join(ROOT, 'src/pages/Index.tsx'), 'utf8');
/* commenttpl: the template's real description says something else, and the
   right one survives only inside an HTML comment placed first. A reader that
   does not strip comments takes the comment's copy and stays green. */
if (CONTROL === 'commenttpl') {
  const m = html.match(/<meta name="description" content="([^"]+)">/);
  if (!m) { console.error('control commenttpl: no template meta description to move into a comment'); process.exit(1); }
  const decoy = 'A different home description the app never renders, long enough to pass every length check on its own.';
  const edited = html.replace(m[0], `<!-- ${m[0]} --><meta name="description" content="${decoy}">`);
  if (edited === html) { console.error('control commenttpl: the template did not change'); process.exit(1); }
  html = edited;
  console.log('   control commenttpl: the template description survives only in a comment; part 4b must report the pair apart');
}
/* commentapp: the app's description becomes an expression, and the literal
   survives only in a comment inside the PageSeo tag. */
if (CONTROL === 'commentapp') {
  const m = indexPage.match(/(<PageSeo\b)([\s\S]*?)\bdescription="([^"]*)"/);
  if (!m) { console.error('control commentapp: no plain PageSeo description in Index.tsx to move into a comment'); process.exit(1); }
  const edited = indexPage.replace(m[0], `${m[1]} /* description="${m[3]}" */${m[2]}description={HOME_DESCRIPTION}`);
  if (edited === indexPage) { console.error('control commentapp: Index.tsx did not change'); process.exit(1); }
  indexPage = edited;
  console.log('   control commentapp: the app description survives only in a comment; part 4b must report it is not a plain string');
}
/* A guard that reads source must read the code, not the comments: the head
   loses its HTML comments and Index.tsx its block and line comments before
   any title or description is matched. */
const indexCode = indexPage.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const rootStart = html.indexOf('<div id="root">');
const rootEnd = html.lastIndexOf('</div>');
if (rootStart < 0 || rootEnd < rootStart) {
  console.error('could not find the static block in index.html');
  process.exit(1);
}
const block = html.slice(rootStart, rootEnd);
const text = block.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/* ── 4: it is still there and still worth reading ─────────────────────── */
part = '1';
console.log('1) the static block');
console.log(`   ${text.length} characters of readable text, ${(block.match(/<h[12]>/g) ?? []).length} headings`);
/* measured at 1,750 characters when it was written, and the un-blocked page
   measured 43. The floor is set at half of what was written, which is still
   twenty times the empty page. */
if (text.length < 875) fail(`only ${text.length} characters of static text, which is on its way back to an empty page`);
if (!/<h1>/.test(block)) fail('the block has no h1');
if ((block.match(/<h2>/g) ?? []).length < 3) fail('the block has fewer than three sections');

/* ── 1 and 2: the numbers ─────────────────────────────────────────────── */
part = '2';
console.log('2) every count in the prose, against the registry the site renders');
const totalGames = ALL_GAMES.length;
const soccer = CATEGORIES.find(c => /soccer/i.test(c.title));
const soccerGames = soccer ? soccer.games.length : 0;
console.log(`   registry says ${totalGames} games, ${soccerGames} of them soccer, across ${CATEGORIES.length} categories`);

const WORDS = {
  ten: 10, fifteen: 15, twenty: 20, 'twenty five': 25, thirty: 30, forty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};
/** Read "120+", "more than 110" or "more than twenty five" into a number. */
function floorsIn(s) {
  const out = [];
  /* case insensitive on purpose: the sentence that opens the block starts
     with a capital M, and the first draft of this check silently found only
     the soccer claim because of it. */
  for (const m of s.matchAll(/more than ([a-z ]+?|\d+)(?= )/gi)) {
    const raw = m[1].trim().toLowerCase();
    const n = /^\d+$/.test(raw) ? Number(raw) : WORDS[raw] ?? null;
    if (n !== null) out.push({ n, phrase: m[0], inclusive: false });
  }
  for (const m of s.matchAll(/\b(\d+)\+(?= )/g)) {
    out.push({ n: Number(m[1]), phrase: m[0], inclusive: true });
  }
  return out;
}
/* the total games claim and the soccer claim, found by the sentence they
   live in rather than by position, so reordering the block cannot break it */
const sentences = text.split(/(?<=\.)\s+/);
let checkedTotal = false, checkedSoccer = false;
for (const sentence of sentences) {
  const floors = floorsIn(sentence);
  if (!floors.length) continue;
  const isSoccer = /soccer/i.test(sentence);
  const actual = isSoccer ? soccerGames : totalGames;
  const label = isSoccer ? 'soccer games' : 'games in total';
  for (const f of floors) {
    if (f.inclusive ? f.n > actual : f.n >= actual) {
      fail(`the page claims "${f.phrase}" ${label} and there are ${actual}`);
    } else if (actual - f.n > Math.max(15, actual * 0.2)) {
      fail(`"${f.phrase}" ${label} is ${actual - f.n} behind the real ${actual}, so the floor has stopped being useful`);
    }
    if (isSoccer) checkedSoccer = true; else checkedTotal = true;
  }
}
if (!checkedTotal) fail('no rounded floor claim about the total game count was found to check');
if (!checkedSoccer) fail('no "more than N" claim about soccer was found to check');
if (!/\b\d+\+ free sports games\b/i.test(text)) {
  fail('the total game count is not written as a rounded N+ claim');
}

/* every bare number in the block gets eyeballed too, so a future edit cannot
   sneak an exact count past the floor rule */
const bare = [...text.matchAll(/\b(\d{2,4})\b/g)].map(m => Number(m[1]));
for (const n of bare) {
  if (n === totalGames || n === soccerGames) {
    fail(`the block states an exact count (${n}), which goes stale the next time a game ships`);
  }
}
console.log(`   ${bare.length} numbers in the prose, all of them floors and all of them under the real figure`);

/* ── 3: every link is real ────────────────────────────────────────────── */
part = '3';
console.log('3) every link in the block');
const routes = new Set(
  [...readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8').matchAll(/path="([^"]+)"/g)].map(m => m[1]),
);
const hrefs = [...block.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
if (hrefs.length < 8) fail(`only ${hrefs.length} links in the block, which is thin for a home page a crawler reads`);
const gamePaths = new Set(ALL_GAMES.map(g => g.path));
let gameLinks = 0;
for (const h of hrefs) {
  if (!h.startsWith('/')) { fail(`${h} is not an internal link`); continue; }
  if (!routes.has(h)) fail(`${h} is not a route in App.tsx`);
  if (gamePaths.has(h)) gameLinks += 1;
}
console.log(`   ${hrefs.length} links, ${gameLinks} of them games, every one a real route`);
if (gameLinks < 6) fail(`only ${gameLinks} of the links go to a game, which is the point of the block`);

/* ── 5: nothing dated ─────────────────────────────────────────────────── */
/* ── the head a JavaScript-off crawler reads ──────────────────────────── */
part = '4';
console.log('4) the head the crawler actually gets');
/* Round 265. Every other page's canonical and title reach a crawler because
   the prerenderer captures the head AFTER React has drawn it. The home page is
   deliberately not prerendered, so whatever is in this template is the whole
   of what a crawler with JavaScript off sees. Measured live on 2026-08-22 with
   a Googlebot user agent: ten pages, ten canonicals, and the one missing was
   the home page. */
const head = html.slice(0, rootStart).replace(/<!--[\s\S]*?-->/g, ' ');
const canon = head.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);
if (!canon) fail('the template has no canonical, so a crawler with JavaScript off sees none on the home page');
else if (canon[1] !== 'https://douknowball.com/') fail(`the home canonical points at ${canon[1]}`);
const staticTitle = (head.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '';
if (!staticTitle.trim()) fail('the template has no title');
/* and the app must not rename the page the moment it boots: a crawler that
   renders would then read a different title from one that does not */
const appTitle = (indexCode.match(/title="([^"]*)"/) ?? [])[1] ?? '';
if (appTitle !== staticTitle) {
  fail(`the template says ${JSON.stringify(staticTitle)} and the app sets ${JSON.stringify(appTitle)}, so the two disagree`);
}
const staticDesc = head.match(/<meta name="description" content="([^"]+)"/);
if (!staticDesc || staticDesc[1].length < 60) fail('the template has no usable meta description');
console.log(`   canonical ${canon ? canon[1] : 'MISSING'}, title matches the app, description ${staticDesc ? staticDesc[1].length : 0} chars`);

/* ── Round 651: the description is one string in both places ──────────── */
/* The title was fenced in Round 265 and the description never was, so the
   template said "Free sports trivia games and daily sports quizzes: NFL, NBA,
   ..." while the app said "120+ free sports trivia games, daily sports quizzes
   and career sims ...", and a crawler got one or the other depending on
   whether it ran JavaScript. Neither named the Soccer Career sim or Club
   Manager, the two games that carry most of the traffic. Now the app passes a
   plain string (not a count computed at runtime, which would drift from the
   template the day the 130th game ships), and this holds the pair together:
   equal to each other, the template's social tags equal too, the count a
   floor that is true and still close, both games named by their registry
   labels, and a length a result does not cut.
   HOME_COPY_CONTROL=descdrift changes one word of the app's description in
   memory; this part must then report the pair apart, and nothing else may
   fail. Both sides are read with their comments stripped (see indexCode and
   head above), because a copy of the string in a comment is exactly what a
   fence like this one finds by accident: HOME_COPY_CONTROL=commentapp leaves
   the app's string only in a comment, commenttpl does the same to the
   template's, and each must turn this part red. */
part = '4b';
console.log('4b) the home description is one string in the template and the app');
let descDriftCaught = false;
{
  const decodeAttr = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const tpl = staticDesc ? decodeAttr(staticDesc[1]) : '';
  const seoBlock = (indexCode.match(/<PageSeo\b([\s\S]*?)\/>/) ?? [])[1] ?? '';
  let app = (seoBlock.match(/\bdescription="([^"]*)"/) ?? [])[1] ?? null;
  if (app === null) {
    fail('the home PageSeo description in src/pages/Index.tsx is not a plain string, so it cannot be held equal to the template');
    if (CONTROL === 'commentapp') descDriftCaught = true;
  } else {
    if (CONTROL === 'descdrift') {
      const drifted = app.replace('No login needed.', 'No login required.');
      if (drifted === app) {
        console.error('control descdrift: the app description has no "No login needed." to change, so this control would prove nothing');
        process.exit(1);
      }
      app = drifted;
      console.log('   control descdrift: one word of the app description changed in memory; the pair must be reported apart');
    }
    if (app !== tpl) {
      fail(`the template's description ${JSON.stringify(tpl)} and the app's ${JSON.stringify(app)} differ, so a crawler reads one or the other depending on JavaScript`);
      if (CONTROL === 'descdrift' || CONTROL === 'commenttpl') descDriftCaught = true;
    }
  }
  for (const key of ['og:description', 'twitter:description']) {
    const m = head.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]+)"`));
    if (!m) fail(`the template has no ${key}`);
    else if (decodeAttr(m[1]) !== tpl) fail(`the template's ${key} is not its meta description, so a share card before JavaScript says something else`);
  }
  const floor = tpl.match(/^(\d+)\+ free sports games\b/);
  if (!floor) {
    fail('the home description does not open with an "N+ free sports games" floor');
  } else {
    const n = Number(floor[1]);
    if (n > totalGames) fail(`the home description claims ${n}+ games and there are ${totalGames}`);
    else if (totalGames - n > Math.max(15, totalGames * 0.2)) fail(`"${n}+" in the home description is ${totalGames - n} behind the real ${totalGames}, so the floor has stopped being useful`);
  }
  const labels = new Set(ALL_GAMES.map(g => g.label));
  for (const name of ['Soccer Career', 'Club Manager']) {
    if (!labels.has(name)) fail(`"${name}" is no longer a registry label, so the home description names a game the site does not list`);
    if (!tpl.includes(name)) fail(`the home description does not name ${name}`);
  }
  if (tpl.length < 120 || tpl.length > 158) fail(`the home description is ${tpl.length} characters, outside 120 to 158`);
  console.log(`   template and app ${app === tpl ? 'match' : 'DIFFER'}, ${tpl.length} characters, social tags match, floor ${floor ? floor[1] + '+' : 'missing'} against ${totalGames} games`);
}

part = '5';
console.log('5) nothing in it belongs to one day');
const DATED = [
  [/\b(19|20)\d\d\b/, 'a year'],
  [/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/, 'a month'],
  [/\b(today|tonight|tomorrow|this week|yesterday)\b/i, 'a relative date'],
  [/\b\d+\s*[-x]\s*\d+\b/, 'a scoreline'],
];
for (const [re, what] of DATED) {
  const m = text.match(re);
  if (m) fail(`the block contains ${what}: ${JSON.stringify(m[0])}`);
}
console.log('   no years, months, relative dates or results');

/* What the module says, block by block, in reading order, as the app draws
   it: the About heading, the intro, then each section's heading (h3) and its
   paragraphs, list items and questions (h4), then the closing line. */
const words = line => line.map(p => (typeof p === 'string' ? p : p.text)).join('');
const linksOf = line => line.filter(p => typeof p !== 'string').map(p => `${p.to}|${p.text}`);
const moduleBlocks = [{ tag: 'h2', text: HOME_COPY.aboutHeading }, { tag: 'p', text: words(HOME_COPY.intro) }];
const moduleLinks = [...linksOf(HOME_COPY.intro)];
for (const s of HOME_COPY.sections) {
  moduleBlocks.push({ tag: 'h3', text: s.heading });
  for (const b of s.blocks) {
    if (b.kind === 'p') { moduleBlocks.push({ tag: 'p', text: words(b.parts) }); moduleLinks.push(...linksOf(b.parts)); }
    else if (b.kind === 'question') moduleBlocks.push({ tag: 'h4', text: b.text });
    else if (b.kind === 'list') for (const it of b.items) { moduleBlocks.push({ tag: 'li', text: words(it) }); moduleLinks.push(...linksOf(it)); }
  }
}
moduleBlocks.push({ tag: 'p', text: words(HOME_COPY.closing) });
moduleLinks.push(...linksOf(HOME_COPY.closing));
/* the outcome the audit measured: paragraphs of 120 characters or more */
const longBlocks = moduleBlocks.filter(b => b.text.length >= 120);

/* ── 6: the template block is the module's ────────────────────────────── */
part = '6';
console.log('6) the template block is exactly what scripts/genHomeCopy.mjs writes from src/data/homeCopy.ts');
{
  const lf = html.replace(/\r\n/g, '\n');
  const halves = splitAtMarkers(lf);
  if (!halves) {
    fail(`index.html does not carry exactly one home-copy start marker and one ${HOME_COPY_END} after it, so nothing ties the template to the module`);
  } else {
    const expected = '\n' + homeCopyLines(HOME_COPY).join('\n') + '\n      ';
    if (halves.inner !== expected) {
      const got = halves.inner.split('\n');
      const want = expected.split('\n');
      let i = 0;
      while (i < Math.max(got.length, want.length) && got[i] === want[i]) i += 1;
      const g = got[i] ?? '(nothing)';
      const w = want[i] ?? '(nothing)';
      let j = 0;
      while (j < Math.min(g.length, w.length) && g[j] === w[j]) j += 1;
      const near = s => JSON.stringify(s.slice(Math.max(0, j - 40), j + 40));
      fail(`the template block is not what the generator writes from the module (line ${i} of the block, from character ${j}): template ${near(g)}, module ${near(w)}. Edit src/data/homeCopy.ts and run node scripts/genHomeCopy.mjs`);
    }
    const copyAt = lf.indexOf('<div id="dukb-home-copy">');
    if (copyAt < 0 || lf.indexOf(HOME_COPY_START) < copyAt) fail('the home-copy markers are not inside #dukb-home-copy');
  }
  if (!HOME_COPY.h1.startsWith(HOME_COPY.brand)) {
    fail(`the module's h1 ${JSON.stringify(HOME_COPY.h1)} does not start with its brand ${JSON.stringify(HOME_COPY.brand)}, and the app shows the brand and gives readers the rest`);
  }
  if (!failedParts.has('6')) {
    /* the template has the h1 where the app has its About heading */
    console.log(`   the block between the markers is the module's: ${moduleBlocks.length} blocks with the h1, ${moduleLinks.length} links, ${longBlocks.length} paragraphs of 120+ characters`);
  }
}

/* ── 7: the rendered home page carries the copy ───────────────────────── */
part = '7';
console.log('7) the home page as React renders it: one h1 that says what the site is, and every word of the copy below the tiles');
{
  const decode = s => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const plain = s => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  let markup = '';
  try { markup = bundled.renderHome(); } catch (e) { fail(`the home page did not render on the server: ${e && e.message}`); }
  if (markup) {
    /* exactly one h1, and it reads the module's h1 */
    const h1s = [...markup.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(m => plain(m[1]));
    if (h1s.length !== 1) fail(`the rendered home page has ${h1s.length} h1 elements, not one: ${JSON.stringify(h1s)}`);
    else if (h1s[0] !== HOME_COPY.h1) fail(`the rendered h1 reads ${JSON.stringify(h1s[0])}, not ${JSON.stringify(HOME_COPY.h1)}, so a renderer reads a name and no description`);

    /* the outcome: every paragraph of 120 characters or more is in the page */
    const pageText = plain(markup);
    const missingLong = longBlocks.filter(b => !pageText.includes(b.text));
    if (missingLong.length) fail(`${missingLong.length} of the ${longBlocks.length} paragraphs of 120+ characters are not in the rendered page, first ${JSON.stringify(missingLong[0].text.slice(0, 60))}`);

    /* the section itself: every block in order, every link, after the last
       tile, and visible */
    const at = markup.indexOf('<section data-home-about');
    if (at < 0) {
      fail('the rendered home page has no About section (section[data-home-about])');
    } else {
      const end = markup.indexOf('</section>', at);
      const sec = markup.slice(at, end < 0 ? markup.length : end + '</section>'.length);
      const got = [...sec.matchAll(/<(h2|h3|h4|p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(m => ({ tag: m[1], text: plain(m[2]) }));
      const key = b => `${b.tag}: ${b.text}`;
      if (JSON.stringify(got.map(key)) !== JSON.stringify(moduleBlocks.map(key))) {
        let i = 0;
        while (i < Math.max(got.length, moduleBlocks.length) && got[i] && moduleBlocks[i] && key(got[i]) === key(moduleBlocks[i])) i += 1;
        fail(`the About section renders ${got.length} blocks and the module has ${moduleBlocks.length}; first difference at block ${i}: rendered ${JSON.stringify(got[i] ? key(got[i]).slice(0, 80) : '(nothing)')}, module ${JSON.stringify(moduleBlocks[i] ? key(moduleBlocks[i]).slice(0, 80) : '(nothing)')}`);
      }
      const links = [...sec.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(m => `${decode(m[1])}|${plain(m[2])}`);
      if (JSON.stringify(links) !== JSON.stringify(moduleLinks)) fail(`the About section renders ${links.length} links and the module has ${moduleLinks.length}, or they differ in order or text`);
      /* a game card's class list starts with home-tile; the tile styles in
         the page's own style element say .home-tile too and are not tiles */
      const tiles = (markup.slice(0, at).match(/class="home-tile\b/g) ?? []).length;
      const tilesAfter = (markup.slice(at).match(/class="home-tile\b/g) ?? []).length;
      if (tiles < 50) fail(`only ${tiles} game tiles render above the About section, so it is not below the games`);
      if (tilesAfter > 0) fail(`${tilesAfter} game tiles render after the About section, which belongs below every tile`);
      /* hidden in any of the ways a class or attribute can hide it */
      const HIDES = /^(?:[a-z0-9-]+:)*(hidden|sr-only|invisible|collapse)$/;
      const hiders = [...sec.matchAll(/\bclass="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/)).filter(t => HIDES.test(t));
      if (hiders.length) fail(`the About section carries ${JSON.stringify(hiders)}, which hides copy that is meant to be read`);
      if (/\shidden(=|\s|>)|aria-hidden="true"|display:\s*none|<details\b/.test(sec)) fail('the About section is hidden or collapsed by an attribute, a style or a details element');
      if (!failedParts.has('7')) {
        console.log(`   one h1, ${JSON.stringify(h1s[0])}; the About section renders all ${got.length} blocks and ${links.length} links in order, after ${tiles} game tiles, nothing hiding it`);
        console.log(`   all ${longBlocks.length} paragraphs of 120+ characters are in the rendered text (${pageText.length} characters rendered on the server)`);
      }
    }
  }
}
rmSync(temp, { recursive: true, force: true });

console.log('');
if (CONTROL) {
  /* inverted: the break must be reported by its own part, and nothing else
     may fail, or the red could have come from anywhere. Part 4b's controls
     must be reported as the pair being apart specifically. */
  const want = HOME_CONTROLS[CONTROL];
  const caught = want === '4b' ? descDriftCaught : failedParts.has(want);
  const elsewhere = [...failedParts].filter(p => p !== want);
  if (caught && elsewhere.length === 0) {
    console.log(`simHomeCopy control ${CONTROL}: green. The planted break was reported by part ${want} and nothing else failed.`);
    process.exit(0);
  }
  if (!caught) console.error(`simHomeCopy control ${CONTROL}: RED. The planted break went unreported, so part ${want} proves nothing.`);
  if (elsewhere.length) console.error(`simHomeCopy control ${CONTROL}: RED. Part(s) ${elsewhere.join(', ')} failed too, which the control run must not hide.`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simHomeCopy: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simHomeCopy: green. The one page a crawler reads first says only true things.');
