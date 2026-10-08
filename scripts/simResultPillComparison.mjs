/**
 * simResultPillComparison: Round 986's browser pass. The comparison and streak
 * games (the ten Higher or Lower pages, Face Off, Champ or Not, Who'd They
 * Beat, Silverware Sort, Rank 'Em, Hall of Fame or Bust) now hand their score
 * to the shared result moment, and this draws each REAL page, finished, on a
 * 390 by 844 phone in Chromium and measures the pill.
 *
 * Each page is bundled whole (its chrome, its guide, the shared ResultScreen
 * and ResultMoment); only its game hook is swapped for a finished fixture from
 * scripts/lib/resultPillFixtures.ts, built from the game's own scoring code,
 * and the Supabase client for an inert stub. Every request the page makes is
 * answered inside the browser, so nothing reaches the network. Each game is
 * drawn at its WIDEST reachable score and its narrowest (34 cases).
 *
 * WHAT IT CHECKS, each a named check a control proves can fail:
 *   text   the pill reads exactly the score the hook reports (since Round 1085
 *          with thousands grouped: 1000 points read "1,000")
 *   fit    the score sits on ONE line inside the pill, the pill keeps its fixed
 *          80px height and stays inside the moment, and the page never scrolls
 *          sideways
 *   shift  nothing moves while the reveal plays: the card's height and the top
 *          of the stat line and the emoji block are the same with every
 *          animation held at its first frame and at its last (layout offsets,
 *          not boxes, so a transform that never moves layout is not a shift)
 *
 * Measured headroom (2026-10-03, 34 cases, 390 by 844): the widest pill is
 * Face Off's "2600 to 2600" (a two player duel tied to the last extra round),
 * 174px wide with 71.0px spare on each side; every other game's widest pill is
 * 125px or less with 95px or more spare. Measured again 2026-10-08 (Release
 * AN, the runner's Chromium), after Face Off's two totals were grouped like
 * every other score: that pill reads "2,600 to 2,600" and is 210px wide with
 * 53.1px spare on each side (so is "2,000 to 1,800"); the next widest is a
 * grouped "1,000" at 141px with 87.5px spare. The checks themselves are geometric
 * (one line, inside the box, equal layout offsets within half a pixel), so
 * they carry no tuned band. Measured controls: noscore turns all 34 cases red;
 * cramp leaves 17.0px spare and wraps all three Face Off scorelines onto two
 * lines (6 findings), which is why the widest Face Off case is in the list;
 * shift moves the card, the moment, the stat line and the emoji block by 32px
 * at the first frame in all 34 cases (136 findings).
 *
 * NEGATIVE CONTROLS (RESULT_PILL_CONTROL=<name>), each mutates one anchor in
 * memory, refuses to run if the anchor is missing, and must turn its check red:
 *   noscore   ResultScreen stops forwarding the score (text)
 *   cramp     ResultMoment draws every score at a display size, too big for a long one (fit)
 *   shift     the headline's rise animates margin instead of transform (shift)
 *
 * RESULT_PILL_SHOTS=<dir> saves one 390 wide screenshot of each case's card.
 *
 * Run: node scripts/simResultPillComparison.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const CONTROLS = { noscore: 'text', cramp: 'fit', shift: 'shift' };
const control = process.env.RESULT_PILL_CONTROL || '';
if (control && !CONTROLS[control]) {
  console.error(`RESULT_PILL_CONTROL=${control} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}
const checks = { text: [], fit: [], shift: [] };
const fail = (check, msg) => { checks[check].push(msg); console.error(`  FAIL [${check}] ${msg}`); };

/** Replace exactly one occurrence (LF normalised), refusing a missing or repeated anchor. */
function mutateOnce(rawText, before, after, what) {
  const text = rawText.replace(/\r\n/g, '\n');
  const n = text.split(before).length - 1;
  if (n !== 1) { console.error(`control ${control}: anchor found ${n} times in ${what}, so the control would prove nothing`); process.exit(1); }
  return text.replace(before, after);
}

const screenFile = path.join(root, 'src/components/game/ResultScreen.tsx');
const momentFile = path.join(root, 'src/components/game/ResultMoment.tsx');
let screenSrc = fs.readFileSync(screenFile, 'utf8');
let momentSrc = fs.readFileSync(momentFile, 'utf8');
if (control === 'noscore') screenSrc = mutateOnce(screenSrc, 'score={score}', 'score={undefined}', 'ResultScreen.tsx');
if (control === 'cramp') momentSrc = mutateOnce(momentSrc, "if (len <= 3) return 'text-4xl';", "if (len <= 99) return 'text-6xl';", 'ResultMoment.tsx');
if (control === 'shift') momentSrc = mutateOnce(momentSrc, '@keyframes rmRise { 0% { opacity: 0; transform: translateY(6px); }', '@keyframes rmRise { 0% { opacity: 0; margin-top: 40px; }', 'ResultMoment.tsx');

/* The game hooks, each answering with the fixture the case dealt; the recorder does nothing. */
const HOOK_FIX = {
  useNbaHL: 'hl', useNflHL: 'hl', useMlbHL: 'hl', useHockeyHL: 'hl', useCfbHL: 'hl', useF1HL: 'hl',
  useTennisHL: 'hl', useGolfHL: 'hl', useAflHL: 'hl', useHigherLower: 'soccerHl', useFaceOff: 'faceOff',
  useChampOrNot: 'champ', useWhodTheyBeat: 'whod', useSilverwareSort: 'silver', useHofOrBust: 'hof',
  useDailyPuzzle: 'rankDaily',
};
const PAGES = {
  '/nba-higher-lower': 'NbaHigherLower', '/nfl-higher-lower': 'NflHigherLower', '/mlb-higher-lower': 'MlbHigherLower',
  '/hockey-higher-lower': 'HockeyHigherLower', '/cfb-higher-lower': 'CfbHigherLower', '/f1-higher-lower': 'F1HigherLower',
  '/tennis-higher-lower': 'TennisHigherLower', '/golf-higher-lower': 'GolfHigherLower', '/afl-higher-lower': 'AflHigherLower',
  '/higher-lower': 'HigherLower', '/face-off': 'FaceOff', '/champ-or-not': 'ChampOrNot', '/whod-they-beat': 'WhodTheyBeat',
  '/silverware-sort': 'SilverwareSort', '/rank-em': 'RankEm', '/hof-or-bust': 'HofOrBust',
};
const SUPABASE_STUB = `
  const chain = () => new Proxy(() => undefined, {
    get(_t, prop) {
      if (prop === 'then') return ok => Promise.resolve({ data: [], error: null, count: 0 }).then(ok);
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    },
    apply() { return chain(); },
  });
  export const supabase = {
    from: () => chain(), rpc: () => chain(),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => undefined,
  };
  export const SUPABASE_URL = 'http://stub';
  export const SUPABASE_PUBLISHABLE_KEY = 'stub';`;

const entry = [
  `import React from 'react'; import { createRoot } from 'react-dom/client';`,
  `import { MemoryRouter } from 'react-router-dom'; import { HelmetProvider } from 'react-helmet-async';`,
  `import { pillCases } from './scripts/lib/resultPillFixtures';`,
  ...Object.values(PAGES).map(p => `import ${p} from './src/pages/${p}';`),
  `const PAGES = { ${Object.entries(PAGES).map(([r, p]) => `'${r}': ${p}`).join(', ')} };`,
  `window.cases = pillCases();`,
  `let root = null;`,
  `window.show = i => { const c = window.cases[i]; if (root) root.unmount(); window.__fix = c.fix;`,
  `  root = createRoot(document.getElementById('root'));`,
  `  root.render(React.createElement(HelmetProvider, null, React.createElement(MemoryRouter, { initialEntries: [c.route] }, React.createElement(PAGES[c.route])))); };`,
].join('\n');

const bundle = await build({
  stdin: { contents: entry, resolveDir: root, loader: 'tsx' },
  bundle: true, write: false, outdir: path.join(root, '.tmp-fx', 'pill-bundle'), /* never written: write is false; CSS modules need an output path */ format: 'iife', platform: 'browser', jsx: 'automatic', logLevel: 'silent',
  alias: { '@': path.join(root, 'src') },
  define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.MODE': '"production"' },
  plugins: [{ name: 'pill-under-test', setup(b) {
    b.onResolve({ filter: /^@\/hooks\/(use[A-Za-z0-9]+)$/ }, a => {
      const name = a.path.slice('@/hooks/'.length);
      if (name === 'useGameCompletion' || HOOK_FIX[name]) return { path: name, namespace: 'fixture-hook' };
      return undefined;
    });
    b.onLoad({ filter: /.*/, namespace: 'fixture-hook' }, a => ({
      contents: a.path === 'useGameCompletion'
        ? 'export function useGameCompletion() {}'
        : `export function ${a.path}() { return window.__fix.${HOOK_FIX[a.path]}; }`,
      loader: 'js',
    }));
    b.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'supabase', namespace: 'stub' }));
    /* A signed out guest, the way every one of these games is first played. */
    b.onResolve({ filter: /contexts\/AuthContext$/ }, () => ({ path: 'auth', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, a => ({
      contents: a.path === 'auth'
        ? 'export function useAuth() { return { user: null, profile: null, session: null, loading: false, refreshProfile: () => undefined, signOut: () => Promise.resolve() }; }\nexport function AuthProvider({ children }) { return children; }'
        : SUPABASE_STUB,
      loader: 'js',
    }));
    b.onLoad({ filter: /ResultMoment\.tsx$/ }, () => ({ contents: momentSrc, loader: 'tsx', resolveDir: path.dirname(momentFile) }));
    b.onLoad({ filter: /ResultScreen\.tsx$/ }, () => ({ contents: screenSrc, loader: 'tsx', resolveDir: path.dirname(screenFile) }));
  } }],
});
const jsOut = bundle.outputFiles.find(o => o.path.endsWith('.js')).text;
const moduleCss = bundle.outputFiles.filter(o => o.path.endsWith('.css')).map(o => o.text).join('\n');
console.log(`bundled the sixteen pages (${(jsOut.length / 1e6).toFixed(1)} MB of script, ${moduleCss.length} bytes of module CSS)`);

/* The site's own stylesheet, compiled by the site's own tailwind config over src. */
const configOutput = await build({ entryPoints: [path.join(root, 'tailwind.config.ts')], write: false, format: 'cjs', platform: 'node', logLevel: 'silent' });
const configModule = { exports: {} };
new Function('module', 'exports', 'require', configOutput.outputFiles[0].text)(configModule, configModule.exports, createRequire(import.meta.url));
const css = await postcss([tailwind({ ...configModule.exports.default, content: [...configModule.exports.default.content, { raw: momentSrc + screenSrc, extension: 'tsx' }] })]).process(read('src/index.css'), { from: path.join(root, 'src/index.css') });

const shots = process.env.RESULT_PILL_SHOTS || '';
if (shots) fs.mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const VIEW = { width: 390, height: 844 };

/* Layout offsets (offsetTop up the chain), which a transform never changes. */
const measure = () => {
  const absTop = el => { let t = 0; for (let e = el; e; e = e.offsetParent) t += e.offsetTop; return t; };
  const card = document.querySelector('[role="status"]');
  if (!card) return { missing: 'no result card' };
  const moment = card.querySelector('[data-result-moment]');
  const pill = card.querySelector('.rm-score');
  const score = card.querySelector('[data-result-score]');
  const grid = card.querySelector('.font-mono[aria-hidden="true"]');
  const after = moment ? moment.nextElementSibling : null;
  const out = {
    state: moment ? moment.getAttribute('data-result-moment') : null,
    text: score ? score.textContent : null,
    cardH: card.offsetHeight, momentH: moment ? moment.offsetHeight : 0,
    afterTop: after ? absTop(after) : null, gridTop: grid ? absTop(grid) : null,
    sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
  if (pill && moment) {
    const p = pill.getBoundingClientRect(), m = moment.getBoundingClientRect();
    out.pillH = p.height; out.pillW = p.width;
    out.pillInside = p.left >= m.left - 0.5 && p.right <= m.right + 0.5;
    out.slack = Math.min(p.left - m.left, m.right - p.right);
  }
  if (score && pill) {
    const p = pill.getBoundingClientRect(), s = score.getBoundingClientRect();
    const r = document.createRange(); r.selectNodeContents(score);
    out.lines = new Set(Array.from(r.getClientRects()).map(x => Math.round(x.top))).size;
    out.scoreInside = s.left >= p.left - 0.5 && s.right <= p.right + 0.5 && s.top >= p.top - 0.5 && s.bottom <= p.bottom + 0.5;
  }
  return out;
};
const holdAll = (page, where) => page.evaluate(where => {
  for (const a of document.getAnimations()) {
    a.pause();
    const t = a.effect.getComputedTiming();
    a.currentTime = where === 'start' ? 0 : (Number.isFinite(t.endTime) ? t.endTime : 0);
  }
}, where);
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

let narrowest = { slack: Infinity, at: '' };
let count = 0;
try {
  const page = await browser.newPage({ viewport: VIEW, reducedMotion: 'no-preference' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css.css}\n${moduleCss}</style></head><body class="bg-background text-foreground"><div id="root"></div></body></html>`;
  /* Every request is answered here, so nothing leaves the page. */
  await page.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('http://127.0.0.1:4173/result-pill-fixture');
  await page.addScriptTag({ content: jsOut });
  const cases = await page.evaluate(() => window.cases.map(c => ({ route: c.route, what: c.what, expect: c.expect })));
  console.log(`1) ${cases.length} finished states on a ${VIEW.width} by ${VIEW.height} phone, each game at its widest score and its narrowest`);
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const tag = `${c.route} ${c.what}`;
    errors.length = 0;
    await page.evaluate(i => window.show(i), i);
    await page.waitForSelector('[role="status"] [data-result-moment]', { timeout: 5000 }).catch(() => undefined);
    await settle(page);
    await holdAll(page, 'start');
    const first = await page.evaluate(measure);
    await holdAll(page, 'end');
    const last = await page.evaluate(measure);
    count += 1;
    if (last.missing) { fail('text', `${tag}: ${last.missing}${errors.length ? ` (page error: ${errors[0]})` : ''}`); continue; }
    if (last.text !== c.expect) fail('text', `${tag}: the pill reads ${JSON.stringify(last.text)}, the hook reports ${JSON.stringify(c.expect)}`);
    if (last.lines !== 1) fail('fit', `${tag}: the score runs to ${last.lines} lines`);
    if (!last.scoreInside) fail('fit', `${tag}: the score spills out of its pill`);
    if (Math.abs((last.pillH ?? 0) - 80) > 0.5) fail('fit', `${tag}: the pill is ${last.pillH}px tall, not its fixed 80`);
    if (!last.pillInside) fail('fit', `${tag}: the pill spills out of the moment`);
    if (last.sideways > 1) fail('fit', `${tag}: the page scrolls ${last.sideways}px sideways`);
    for (const k of ['cardH', 'momentH', 'afterTop', 'gridTop']) {
      if (first[k] !== null && last[k] !== null && Math.abs(first[k] - last[k]) > 0.5) fail('shift', `${tag}: ${k} moves ${(last[k] - first[k]).toFixed(1)}px while the reveal plays`);
    }
    if (last.slack < narrowest.slack) narrowest = { slack: last.slack, at: `${tag} (${c.expect})` };
    console.log(`   ${tag.padEnd(52)} pill ${String(last.text).padEnd(13)} ${last.pillW?.toFixed(0)}px wide, slack ${last.slack?.toFixed(1)}px, ${last.state}`);
    if (shots) {
      await page.keyboard.press('Escape').catch(() => undefined);
      const card = await page.$('[role="status"]');
      if (card) await card.screenshot({ path: path.join(shots, `${String(i).padStart(2, '0')}${c.route.replace(/\//g, '_')}.png`) });
    }
  }
  console.log(`   narrowest slack beside a pill: ${narrowest.slack.toFixed(1)}px, at ${narrowest.at}`);
  if (count < 34) fail('text', `only ${count} cases ran, so the fixture list did not really load`);
} finally {
  await browser.close();
}

const red = Object.entries(checks).filter(([, v]) => v.length);
if (control) {
  const want = CONTROLS[control];
  if (checks[want].length) { console.log(`\nsimResultPillComparison: control ${control} turned [${want}] red, as it must (${checks[want].length} findings).`); process.exit(0); }
  console.error(`\nsimResultPillComparison: control ${control} did NOT turn [${want}] red, so that check proves nothing.`);
  process.exit(1);
}
if (red.length) {
  console.error(`\nsimResultPillComparison: red. ${red.map(([k, v]) => `${k} ${v.length}`).join(', ')}`);
  process.exit(1);
}
console.log(`\nsimResultPillComparison: green. ${count} finished states on a 390 wide phone: every pill reads the hook's score, on one line inside its fixed pill, nothing scrolls sideways, and nothing moves while the reveal plays.`);
