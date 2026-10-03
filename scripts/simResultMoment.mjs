/**
 * Round 710 harness: one result moment for every game.
 *
 * WHY. Every game drew its own end screen, so finishing a grid, a quiz and a
 * fight looked like three different sites. src/components/game/ResultMoment.tsx
 * is the one piece they share now: the sport's ink and drawn glyph, the score
 * the game passes, and three honest states. ResultScreen mounts it, so every
 * game that ends on ResultScreen gets it at once.
 *
 * WHAT ROUND 710 SHIPS, plainly: the shared piece and ResultScreen mounting it.
 * That reaches the 65 games that end on ResultScreen. The 36 games that end a
 * run on a surface of their own (an inline panel, a banner over the board, a
 * grade card) are listed under OWN_SURFACE below with what each one draws
 * instead, and wiring them to the moment is a follow up round, not this one.
 * The same goes for the score pill: ResultScreen takes a score prop now, and
 * no caller passes one yet, so section 2 prints how many do and how many do
 * not as a measurement. Both lists are ratchets: a game that gets wired must
 * leave OWN_SURFACE or the fence fails, and the measured count is printed on
 * every run so a follow up can be checked against it.
 *
 * WHAT IT CHECKS, each as its own named check so a control can prove it turns
 * exactly its own check red:
 *   wiring   every live game in the registry reaches <ResultScreen> or
 *            <ResultMoment> in its import tree, read from the TypeScript AST
 *            (JSX elements, never comments), unless it is on LEFT with the
 *            reason its end is not a single result, or on OWN_SURFACE with
 *            what it draws instead. A listed game that is wired, or a listed
 *            entry that is not a live game, is also a fail, so neither list
 *            can rot. ResultScreen itself must render the moment.
 *   score    section 2 counts the <ResultScreen> calls in src and prints how
 *            many pass a score and how many do not (a measurement, not a
 *            failure, until a follow up round adds them; it fails only if the
 *            scan finds too few calls to have read src). The rendered checks
 *            then require that the pill shows exactly the score it was given,
 *            for strings and numbers, both mounted directly and through
 *            ResultScreen.
 *   copy     the three states say their three different lines, ResultScreen's
 *            won maps true to win, false to loss and a neutral run to good try,
 *            an explicit outcome overrides it, and the game's headline is still
 *            the card's first h2 (src/test/scoreShown.test.tsx reads it there).
 *   sport    the moment wears the ink and the drawn glyph of the game's sport,
 *            by the registry's category, for one game in several sports.
 *   layout   nothing moves while it plays: with every animation held at its
 *            first frame and then at its last, the moment's box and the line
 *            under it sit in the same place. At 390 by 844 the card has no
 *            sideways scroll and every button is at least 32px tall.
 *   reduced  under prefers-reduced-motion every piece of the moment has no
 *            animation and is fully visible on the first frame, the win burst
 *            is gone, and with no preference set the reveal still plays.
 *
 * CONTROLS, RESULT_MOMENT_CONTROL=<name>. Each asserts its mutation changed the
 * source it targets, and the run is green only if its own check went red and
 * every other check stayed green:
 *   unwired   ResultScreen stops rendering the moment (wiring)
 *   unlisted  one LEFT entry is dropped (wiring)
 *   noscore   ResultScreen stops passing its score to the moment (score)
 *   clipped   the pill drops the last character of its score (score)
 *   copy      good try says the loss line (copy)
 *   ink       the moment stops setting its sport ink (sport)
 *   shift     the headline's rise animates margin instead of transform (layout)
 *   motion    the reduced motion rule stops matching (reduced)
 *
 * Every source a control mutates is read with its line endings normalised to
 * LF first, so an anchor that spans a line break matches on a CRLF checkout
 * (the gate clone is one) exactly as it does on an LF one.
 *
 * Bundles stay in memory; nothing is written outside the scratch folder a
 * screenshot run names. RESULT_MOMENT_SHOTS=<dir> saves the fixture's three
 * states at 1440 by 900 and 390 by 844 for a visual pass.
 *
 * Run: node scripts/simResultMoment.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import ts from 'typescript';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = f => path.relative(root, f).replace(/\\/g, '/');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const CONTROLS = { unwired: 'wiring', unlisted: 'wiring', noscore: 'score', clipped: 'score', copy: 'copy', ink: 'sport', shift: 'layout', motion: 'reduced' };
const control = process.env.RESULT_MOMENT_CONTROL || '';
if (control && !CONTROLS[control]) {
  console.error(`RESULT_MOMENT_CONTROL=${control} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}
const checks = { wiring: [], score: [], copy: [], sport: [], layout: [], reduced: [] };
const fail = (check, msg) => { checks[check].push(msg); console.error(`  FAIL [${check}] ${msg}`); };

/** Replace exactly one occurrence, and refuse if the anchor is missing or repeated.
 *  The text is normalised to LF first, so an anchor with a newline in it
 *  matches on a CRLF checkout too. */
function mutateOnce(rawText, before, after, what) {
  const text = rawText.replace(/\r\n/g, '\n');
  const n = text.split(before).length - 1;
  if (n !== 1) {
    console.error(`control ${control}: expected exactly one "${before}" in ${what}, found ${n}, so this control would prove nothing`);
    process.exit(1);
  }
  const out = text.replace(before, after);
  if (out === text) { console.error(`control ${control}: the mutation changed nothing in ${what}`); process.exit(1); }
  console.log(`   CONTROL ${control}: mutated ${what}`);
  return out;
}

/* ---------- Games whose end is not a single result ----------
   Each is a run that does not end in one score: an idle game that never ends,
   a career or a dynasty that runs season after season, a front office, a
   tycoon. They keep their own season screens, and this list says why. */
const LEFT = {
  '/budget-builder': 'a squad builder with no end state, the squad just saves',
  '/rebuild': 'a multi season club rebuild, it has season reviews, not one result',
  '/club-manager': 'a manager career; its season review mounts ResultScreen, but a sacking or a new season is not a run ending',
  '/soccer-conquest': 'a campaign map played over many turns, it has no single final score',
  '/stadium-tycoon': 'an idle game, it never ends',
  '/wonderkid-factory': 'an idle game, it never ends',
  '/soccer-career': 'a career, season after season; its season end keeps its trophy moment',
  '/front-office': 'a multi season front office sim',
  '/nfl-my-career': 'a career, season after season',
  '/conquest': 'a campaign map played over many turns, it has no single final score',
  '/cfb-dynasty': 'a dynasty, season after season',
  '/cbb-dynasty': 'a dynasty, season after season',
  '/conquest-nba': 'a campaign map played over many turns, it has no single final score',
  '/nba-front-office': 'a multi season front office sim',
  '/nba-my-career': 'a career, season after season',
  '/conquest-mlb': 'a campaign map played over many turns, it has no single final score',
  '/mlb-my-career': 'a career, season after season',
  '/mlb-front-office': 'a multi season front office sim',
  '/conquest-nhl': 'a campaign map played over many turns, it has no single final score',
  '/nhl-my-career': 'a career, season after season',
  '/nhl-front-office': 'a multi season front office sim',
  '/fight-career': 'a career, fight after fight; each fight keeps its round by round card',
  '/fight-promoter': 'a promotion run over many cards, it has no single final score',
  '/fight-gym': 'a gym run over many fighters and cards, it has no single final score',
  '/hall-of-champions': 'a browse page of past winners, not a game with an end',
  '/idle-arena': 'an idle game, it never ends',
};

/* ---------- Games that end a run on a surface of their own ----------
   Round 710 ships the shared piece and ResultScreen mounting it. Each game
   here ends a single run, but draws that end itself rather than through
   ResultScreen, so the moment has not reached it yet. Wiring these is a
   follow up round. Each line says what the game draws today, read from its
   page or board; when one is wired it must leave this list or the fence fails. */
const OWN_SURFACE = {
  '/dart-draft': 'its own done panel in the page, the squad grade, the series score and the XI',
  '/who-am-i': 'its own won or lost panel in the page, the secret player and the guess rows',
  '/world-xi': 'its own won or lost panel in the page, with a season sim report on a win',
  '/alphabet-sprint': 'its own done panel in the page, the sprint points and the letters',
  '/clue-auction': 'its own won or lost panel in the page, the bank and the clues bought',
  '/sign-the-player': 'its own showdown table in the page, a league table with a champion, not one score',
  '/free-kick': 'its own done card in FreeKickBoard, goals out of ten and points',
  '/world-cup-bracket': 'a bracket scored against the real results at the foot of the page, no run end',
  '/fantasy-draft': 'its own draft complete panel in the page, a verdict, a season sim and a vote',
  '/perfect-season-nfl': 'its own final record panel in the page, revealed game by game',
  '/perfect-season-nba': 'its own final record panel in the page, revealed game by game',
  '/perfect-season-mlb': 'its own final record panel in the page, revealed game by game',
  '/perfect-season-nhl': 'its own final record panel in the page, revealed game by game',
  '/guess-cbb-team': 'its own game over panel in CbbProgramBoard, under the revealed clues',
  '/f1-driver': 'its own game over panel in F1DriverBoard, under the revealed clues',
  '/f1-constructor': 'its own game over panel in F1ConstructorBoard, under the revealed clues',
  '/guess-tennis-player': 'its own game over panel in TennisPlayerBoard, under the revealed clues',
  '/guess-nascar-driver': 'its own game over panel in NascarDriverBoard, under the revealed clues',
  '/buzzer-beater': 'its own done card in BuzzerBeaterBoard, makes out of ten and points',
  '/stat-detective': 'its own done panel in the page, the guess count out of eight',
  '/nba-starting-5': 'its own result panel in the page, the verdict on the five',
  '/perfect-lineup-nba': 'its own grade card in GenericLineupBoard, grade, rating and chemistry',
  '/perfect-lineup-nhl': 'its own grade card in GenericLineupBoard, grade, rating and chemistry',
  '/perfect-lineup-f1': 'its own grade card in GenericLineupBoard, grade, rating and chemistry',
  '/tennis-chain': 'its own game over block in TennisChainBoard, the chain and the reason it ended',
  '/nascar-chain': 'its own game over block in NascarChainBoard, the chain and the reason it ended',
  '/ufc-chain': 'its own game over block in CombatChainBoard, the chain and the reason it ended',
  '/minefield': 'its own done panel in the page, the banked score and rounds won',
  '/quiz-board': 'its own finished panel in QuizBoard, the bank after the last tile',
  '/ball-iq': 'its own finished screen in BallIqBoard, an IQ number, a rank and correct out of the questions',
  '/emoji-guess': "its own Today's result screen in EmojiGuessBoard, solved out of the rounds",
  '/mystery-box': 'its own finished panel in MysteryBoxBoard, the squad rating and best pull',
  '/aussie-rules-manager': 'its own season complete panel in AussieRulesManagerBoard, the league winner and the final ladder',
};

/* ---------- 1. wiring, from the AST ---------- */
function astOf(file, text) {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
function jsxTags(tree) {
  const out = [];
  const visit = node => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) out.push({ tag: node.tagName.getText(tree), node });
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return out;
}
function importsOf(tree) {
  const out = [];
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) out.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) out.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return out;
}
function resolveSpec(spec, from) {
  let base;
  if (spec.startsWith('@/')) base = path.join(root, 'src', spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const ext of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) {
    const f = base + ext;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}
/* A game's own tree: its page, its components and hooks. The shared pieces are
   not followed, or every page importing GameNav would count as wired through
   ResultScreen's own file. */
const SHARED_DIRS = ['components/game/', 'components/ui/', 'components/layout/', 'components/home/', 'data/', 'lib/', 'integrations/', 'contexts/', 'types/'];
const isShared = f => { const r = rel(f).replace(/^src\//, ''); return SHARED_DIRS.some(d => r.startsWith(d)); };

const resultScreenFile = path.join(root, 'src/components/game/ResultScreen.tsx');
const overrides = new Map();
if (control === 'unwired') overrides.set(resultScreenFile, mutateOnce(fs.readFileSync(resultScreenFile, 'utf8'), '<ResultMoment\n', '<ResultMomentGone\n', 'ResultScreen.tsx'));
const sourceOf = f => overrides.get(f) ?? fs.readFileSync(f, 'utf8');

const treeCache = new Map();
function parsed(f) {
  if (!treeCache.has(f)) treeCache.set(f, astOf(f, sourceOf(f)));
  return treeCache.get(f);
}
const rendersMoment = f => jsxTags(parsed(f)).some(t => t.tag === 'ResultScreen' || t.tag === 'ResultMoment');
function wired(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    if (/\.tsx$/.test(f) && rendersMoment(f)) return rel(f);
    for (const spec of importsOf(parsed(f))) {
      const r = resolveSpec(spec, f);
      if (r && !isShared(r) && !/\.test\.tsx?$/.test(r)) stack.push(r);
    }
  }
  return null;
}
{
  console.log('1) wiring: every live game reaches the shared moment, or is on LEFT with a reason');
  const screenTags = jsxTags(parsed(resultScreenFile)).map(t => t.tag);
  if (!screenTags.includes('ResultMoment')) fail('wiring', 'ResultScreen no longer renders <ResultMoment>, so ~70 games lost the moment');

  const app = read('src/App.tsx');
  const appTree = astOf('App.tsx', app);
  const lazy = new Map();
  const visitLazy = node => {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(appTree) === 'lazy') {
      const spec = importsOf(node.initializer)[0] ?? (node.initializer.getText(appTree).match(/import\("([^"]+)"\)/) || [])[1];
      if (spec) lazy.set(node.name.getText(appTree), spec);
    }
    ts.forEachChild(node, visitLazy);
  };
  visitLazy(appTree);
  const routeEl = new Map();
  for (const { tag, node } of jsxTags(appTree)) {
    if (tag !== 'Route') continue;
    const attrs = node.attributes.properties;
    const p = attrs.find(a => a.name?.getText(appTree) === 'path');
    const el = attrs.find(a => a.name?.getText(appTree) === 'element');
    if (!p || !el || !p.initializer || !ts.isStringLiteral(p.initializer)) continue;
    const m = el.initializer.getText(appTree).match(/<(\w+)/);
    if (m) routeEl.set(p.initializer.text, m[1]);
  }
  const regTree = astOf('gameRegistry.ts', read('src/data/gameRegistry.ts'));
  const gamePaths = [];
  const visitReg = node => {
    if (ts.isPropertyAssignment(node) && node.name.getText(regTree) === 'path' && ts.isStringLiteral(node.initializer)) gamePaths.push(node.initializer.text);
    ts.forEachChild(node, visitReg);
  };
  visitReg(regTree);

  const left = { ...LEFT };
  if (control === 'unlisted') {
    if (!left['/idle-arena']) { console.error('control unlisted: /idle-arena is not on LEFT, so this control would prove nothing'); process.exit(1); }
    delete left['/idle-arena'];
    console.log('   CONTROL unlisted: dropped /idle-arena from LEFT');
  }
  for (const gp of Object.keys(OWN_SURFACE)) if (left[gp]) fail('wiring', `${gp} is on both LEFT and OWN_SURFACE; it can only have one reason`);
  let live = 0, wiredCount = 0, leftCount = 0, ownCount = 0;
  for (const gp of gamePaths) {
    const comp = routeEl.get(gp);
    if (!comp) { fail('wiring', `${gp} is in the registry with no route in App.tsx`); continue; }
    if (comp === 'Navigate') continue; // retired, redirects elsewhere
    const spec = lazy.get(comp);
    if (!spec) { fail('wiring', `${gp} routes to ${comp}, which is not a lazy page this scan can follow`); continue; }
    const entry = resolveSpec(spec, path.join(root, 'src/App.tsx'));
    if (!entry) { fail('wiring', `${gp}: cannot resolve ${spec}`); continue; }
    live += 1;
    const via = wired(entry);
    if (left[gp]) {
      leftCount += 1;
      if (via && gp !== '/club-manager') fail('wiring', `${gp} is on LEFT but renders the moment through ${via}; take it off the list`);
    } else if (OWN_SURFACE[gp]) {
      ownCount += 1;
      if (via) fail('wiring', `${gp} is on OWN_SURFACE but renders the moment through ${via}; it is wired now, take it off the list`);
    } else if (via) {
      wiredCount += 1;
    } else {
      fail('wiring', `${gp} (${rel(entry)}) ends a run without the shared result moment and is on neither LEFT nor OWN_SURFACE`);
    }
  }
  for (const gp of Object.keys(left)) if (!gamePaths.includes(gp) || routeEl.get(gp) === 'Navigate') fail('wiring', `LEFT lists ${gp}, which is not a live game`);
  for (const gp of Object.keys(OWN_SURFACE)) if (!gamePaths.includes(gp) || routeEl.get(gp) === 'Navigate') fail('wiring', `OWN_SURFACE lists ${gp}, which is not a live game`);
  console.log(`   ${live} live games: ${wiredCount} wired to the moment, ${leftCount} left with a reason (no single result), ${ownCount} still ending on a surface of their own (follow up round)`);
  for (const [gp, why] of Object.entries(OWN_SURFACE)) console.log(`     own surface ${gp.padEnd(22)} ${why}`);
  if (live < 100) fail('wiring', `only ${live} live games found, so the scan did not really read the registry`);
}

/* ---------- 2. how many ResultScreen calls pass a score, measured ----------
   Round 710 gives ResultScreen the prop; no caller passes it yet, so a caller
   without one reveals the game's emoji in the pill, which is the documented
   fallback, not a fault. The count is printed so the follow up round that
   adds scores can be checked against it. It fails only if the scan finds too
   few calls to have read src. */
{
  console.log('2) score: how many <ResultScreen> calls pass the score their moment reveals');
  const files = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (/\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name) && !f.includes(`${path.sep}test${path.sep}`)) files.push(f); } };
  walk(path.join(root, 'src'));
  let calls = 0;
  const withScore = [], noScore = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    if (!text.includes('<ResultScreen')) continue;
    const tree = astOf(f, text);
    for (const { tag, node } of jsxTags(tree)) {
      if (tag !== 'ResultScreen') continue;
      calls += 1;
      const has = node.attributes.properties.some(a => ts.isJsxAttribute(a) && a.name.getText() === 'score') || node.attributes.properties.some(a => ts.isJsxSpreadAttribute(a));
      (has ? withScore : noScore).push(`${rel(f)}:${tree.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
    }
  }
  console.log(`   ${calls} ResultScreen calls: ${withScore.length} pass a score, ${noScore.length} do not yet (their pill shows the game's emoji until a follow up round adds one)`);
  for (const s of withScore) console.log(`     passes a score ${s}`);
  if (calls < 60) fail('score', `only ${calls} ResultScreen calls found, so the scan did not really read src`);
}

/* ---------- 3 to 6. the rendered piece, in Chromium ---------- */
const momentFile = path.join(root, 'src/components/game/ResultMoment.tsx');
let momentSrc = fs.readFileSync(momentFile, 'utf8');
let screenSrc = fs.readFileSync(resultScreenFile, 'utf8');
if (control === 'noscore') screenSrc = mutateOnce(screenSrc, 'score={score}', 'score={undefined}', 'ResultScreen.tsx');
if (control === 'clipped') momentSrc = mutateOnce(momentSrc, '{score}\n', "{typeof score === 'string' ? score.slice(0, -1) : score}\n", 'ResultMoment.tsx');
if (control === 'copy') momentSrc = mutateOnce(momentSrc, "close: 'Good try',", "close: 'Not this time',", 'ResultMoment.tsx');
if (control === 'ink') momentSrc = mutateOnce(momentSrc, 'style={sportStyle(sport)}', '', 'ResultMoment.tsx');
if (control === 'shift') momentSrc = mutateOnce(momentSrc, '@keyframes rmRise { 0% { opacity: 0; transform: translateY(6px); }', '@keyframes rmRise { 0% { opacity: 0; margin-top: 40px; }', 'ResultMoment.tsx');
if (control === 'motion') momentSrc = mutateOnce(momentSrc, 'prefers-reduced-motion: reduce', 'prefers-reduced-motion: no-such-preference', 'ResultMoment.tsx');

const bundle = await build({
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {MemoryRouter} from 'react-router-dom';
      import {ResultMoment} from './src/components/game/ResultMoment';
      import {ResultScreen} from './src/components/game/ResultScreen';
      const root = createRoot(document.getElementById('root'));
      const wrap = el => React.createElement(MemoryRouter, null, React.createElement('main', {style: {padding: '16px'}}, el));
      window.moment = props => root.render(wrap(React.createElement(ResultMoment, props)));
      window.moments = list => root.render(wrap(React.createElement('div', null, ...list.map((p, i) => React.createElement(ResultMoment, {key: i, ...p})))));
      window.screen_ = props => root.render(wrap(React.createElement(ResultScreen, {
        outcomeEmoji: '\u{1F3C6}', emojiGrid: '\u{1F7E9}\u{1F7E9}\u{1F7E5}',
        statLine: 'You filled 7 of 9 cells.', statRow: [{label: 'Streak', value: 3}],
        share: {score: '7/9 cells', gameName: 'NBA Grid', gamePath: '/nba-grid'},
        onPlayAgain: () => {}, ...props })));
      window.clear = () => root.render(null);`,
    resolveDir: root, loader: 'jsx',
  },
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', logLevel: 'silent',
  alias: { '@': path.join(root, 'src') },
  define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.MODE': '"production"' },
  plugins: [{ name: 'moment-under-test', setup(b) {
    b.onLoad({ filter: /ResultMoment\.tsx$/ }, () => ({ contents: momentSrc, loader: 'tsx', resolveDir: path.dirname(momentFile) }));
    b.onLoad({ filter: /ResultScreen\.tsx$/ }, () => ({ contents: screenSrc, loader: 'tsx', resolveDir: path.dirname(resultScreenFile) }));
  } }],
});
const configOutput = await build({ entryPoints: [path.join(root, 'tailwind.config.ts')], write: false, format: 'cjs', platform: 'node', logLevel: 'silent' });
const configModule = { exports: {} };
new Function('module', 'exports', 'require', configOutput.outputFiles[0].text)(configModule, configModule.exports, createRequire(import.meta.url));
const content = [momentSrc, read('src/components/game/ResultScreen.tsx'), read('src/components/game/ShareButtons.tsx'), read('src/components/home/SportGlyph.tsx')].join('\n');
const css = await postcss([tailwind({ ...configModule.exports.default, content: [{ raw: content, extension: 'tsx' }] })])
  .process(read('src/index.css'), { from: path.join(root, 'src/index.css') });

const COPY = { win: 'Nailed it', close: 'Good try', loss: 'Not this time' };
const browser = await chromium.launch({ args: ['--no-sandbox'] });
async function open(viewport, reducedMotion = 'no-preference') {
  const page = await browser.newPage({ viewport, reducedMotion });
  page.on('pageerror', e => console.error(`   page error: ${e.message}`));
  /* A real origin rather than about:blank, because the supabase client reads
     localStorage on import and about:blank refuses it. Nothing leaves the
     page: every request is answered here. */
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css.css}</style></head><body class="bg-background text-foreground"><div id="root"></div></body></html>`;
  await page.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('http://127.0.0.1:4173/result-moment-fixture');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  return page;
}
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const holdAt = (page, t) => page.evaluate(t => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; } }, t);

try {
  const page = await open({ width: 1440, height: 900 });

  /* ---- 3. copy and score ---- */
  console.log('3) copy and score: three states, three lines, the score as given');
  const seen = {};
  for (const [outcome, score] of [['win', '9/9'], ['close', '7/9'], ['loss', 0], ['win', '$1.25M']]) {
    await page.evaluate(p => window.moment(p), { outcome, gamePath: '/nba-grid', score, headline: `Head ${outcome}` });
    await settle(page);
    const got = await page.evaluate(() => {
      const m = document.querySelector('[data-result-moment]');
      return { state: m?.getAttribute('data-result-moment'), copy: m?.querySelector('[data-result-state]')?.textContent, score: m?.querySelector('[data-result-score]')?.textContent, head: m?.querySelector('h2')?.textContent };
    });
    seen[outcome] = got.copy;
    console.log(`   ${outcome.padEnd(5)} copy="${got.copy}" score="${got.score}" headline="${got.head}"`);
    if (got.state !== outcome) fail('copy', `outcome ${outcome} rendered as ${got.state}`);
    if (got.copy !== COPY[outcome]) fail('copy', `${outcome} says "${got.copy}", expected "${COPY[outcome]}"`);
    if (got.score !== String(score)) fail('score', `passed ${JSON.stringify(score)}, the pill shows "${got.score}"`);
    if (got.head !== `Head ${outcome}`) fail('copy', `the game's headline came out as "${got.head}"`);
  }
  if (new Set(Object.values(seen)).size !== 3) fail('copy', `the three states do not say three different things: ${JSON.stringify(seen)}`);

  for (const [props, want] of [[{ won: true }, 'win'], [{ won: false }, 'loss'], [{}, 'close'], [{ won: false, outcome: 'close' }, 'close']]) {
    await page.evaluate(p => window.screen_({ headline: 'Grid over', score: '7/9', ...p }), props);
    await settle(page);
    const got = await page.evaluate(() => ({
      state: document.querySelector('[role="status"] [data-result-moment]')?.getAttribute('data-result-moment'),
      firstH2: document.querySelector('[role="status"] h2')?.textContent,
      score: document.querySelector('[role="status"] [data-result-score]')?.textContent,
      confetti: document.querySelectorAll('[role="status"] .cm-confetti').length,
    }));
    console.log(`   ResultScreen ${JSON.stringify(props).padEnd(32)} -> ${got.state}, first h2 "${got.firstH2}", score "${got.score}", confetti ${got.confetti}`);
    if (got.state !== want) fail('copy', `ResultScreen ${JSON.stringify(props)} showed ${got.state}, expected ${want}`);
    if (got.firstH2 !== 'Grid over') fail('copy', `ResultScreen's first h2 is "${got.firstH2}", not the game's headline`);
    if (got.score !== '7/9') fail('score', `ResultScreen passed 7/9 and its moment shows "${got.score}"`);
    if ((want === 'win') !== (got.confetti > 0)) fail('copy', `confetti ${got.confetti} on a ${want}; only a win rains`);
  }

  /* ---- 4. sport ---- */
  console.log('4) sport: the ink and the glyph follow the registry category');
  const SPORTS = { '/soccer-grid': 'soccer', '/nba-grid': 'basketball', '/mlb-grid': 'baseball', '/hockey-grid': 'hockey', '/nfl-connections': 'football', '/ufc': 'combat', '/f1-higher-lower': 'f1', '/rank-em': 'world' };
  for (const [gamePath, sport] of Object.entries(SPORTS)) {
    await page.evaluate(p => window.moment(p), { outcome: 'win', gamePath, score: '1' });
    await settle(page);
    const got = await page.evaluate(() => {
      const m = document.querySelector('[data-result-moment]');
      const s = getComputedStyle(m);
      return { sport: m.getAttribute('data-sport'), glyphs: [...m.querySelectorAll('[data-sport-glyph]')].map(g => g.getAttribute('data-sport-glyph')), tile: s.getPropertyValue('--tile').trim(), border: s.borderTopColor, kicker: getComputedStyle(m.querySelector('[data-result-state]')).color };
    });
    const ink = await page.evaluate(sport => getComputedStyle(document.documentElement).getPropertyValue(`--sport-${sport}`).trim(), sport);
    console.log(`   ${gamePath.padEnd(17)} sport=${got.sport} glyphs=${got.glyphs.join(',')} --tile=${got.tile} kicker=${got.kicker}`);
    if (got.sport !== sport) fail('sport', `${gamePath} wears ${got.sport}, its registry category is ${sport}`);
    if (got.glyphs.length < 2 || got.glyphs.some(g => g !== sport)) fail('sport', `${gamePath} draws glyphs ${got.glyphs.join(',')}, expected two ${sport}`);
    /* Chromium hands back a custom property with its var() already
       substituted, so the ink is compared as the value it resolves to. */
    if (!ink) fail('sport', `--sport-${sport} is not defined in index.css`);
    else if (got.tile !== ink) fail('sport', `${gamePath} does not set its ink: --tile is "${got.tile}", the ${sport} ink is "${ink}"`);
    else {
      const [h, sPct, lPct] = ink.split(/\s+/).map(parseFloat);
      const want = await page.evaluate(([h, s, l]) => { const d = document.createElement('i'); d.style.color = `hsl(${h} ${s}% ${l}%)`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, [h, sPct, lPct]);
      if (got.kicker !== want) fail('sport', `${gamePath}: the state line is ${got.kicker}, not the ${sport} ink ${want}`);
    }
  }

  /* ---- 5. layout ---- */
  console.log('5) layout: nothing moves while it plays; the phone card fits');
  for (const won of [true, false, undefined]) {
    await page.evaluate(won => window.screen_({ headline: 'Grid over', score: '7/9', won }), won);
    await settle(page);
    /* Layout boxes, not painted ones: offsetTop and offsetHeight ignore
       transforms, which is exactly the line between motion that plays on top
       of the page (scale, translate, opacity) and motion that pushes it
       (margin, height). The card's own zoom in is a transform too, so it does
       not count against the moment. */
    const box = () => page.evaluate(() => {
      const card = document.querySelector('[role="status"]');
      const m = card.querySelector('[data-result-moment]');
      const next = m.nextElementSibling;
      const r = el => { let top = 0; for (let n = el; n && n !== document.body; n = n.offsetParent) top += n.offsetTop; return [top, el.offsetHeight]; };
      return { moment: r(m), next: r(next), pill: r(m.querySelector('.rm-score')), card: r(card) };
    });
    await holdAt(page, 0);
    const first = await box();
    await holdAt(page, 5000);
    const last = await box();
    console.log(`   won=${String(won).padEnd(9)} first ${JSON.stringify(first)} last ${JSON.stringify(last)}`);
    for (const k of ['moment', 'next', 'card']) {
      if (JSON.stringify(first[k]) !== JSON.stringify(last[k])) fail('layout', `won=${won}: ${k} moved while the moment played, ${JSON.stringify(first[k])} to ${JSON.stringify(last[k])}`);
    }
    if (last.pill[1] !== 80) fail('layout', `won=${won}: the score pill is ${last.pill[1]}px tall, not the reserved 80`);
  }
  await page.close();

  const phone = await open({ width: 390, height: 844 });
  for (const props of [{ won: true, score: '$1,234,567', headline: 'You banked a fortune on the last box' }, { won: false, score: 0, headline: 'Out of guesses' }, { score: 'Grade A+', headline: 'The market loved you' }]) {
    await phone.evaluate(p => window.screen_(p), props);
    await settle(phone);
    await holdAt(phone, 5000);
    const got = await phone.evaluate(() => {
      const card = document.querySelector('[role="status"]');
      const m = card.querySelector('[data-result-moment]');
      const cb = card.getBoundingClientRect();
      const pill = m.querySelector('.rm-score').getBoundingClientRect();
      const small = [...card.querySelectorAll('button, a')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height < 32; }).map(b => `${b.textContent.trim().slice(0, 20)} ${Math.round(b.getBoundingClientRect().height)}px`);
      return { scrollW: document.documentElement.scrollWidth, cardL: cb.left, cardR: cb.right, pillL: pill.left, pillR: pill.right, small };
    });
    console.log(`   390px ${JSON.stringify(props.score).padEnd(13)} scrollWidth=${got.scrollW} card ${Math.round(got.cardL)}..${Math.round(got.cardR)} pill ${Math.round(got.pillL)}..${Math.round(got.pillR)} small targets ${got.small.length}`);
    if (got.scrollW > 390) fail('layout', `at 390px the page scrolls sideways (${got.scrollW}px) with score ${JSON.stringify(props.score)}`);
    if (got.pillL < got.cardL || got.pillR > got.cardR) fail('layout', `at 390px the score pill spills out of the card with score ${JSON.stringify(props.score)}`);
    for (const s of got.small) fail('layout', `at 390px a tap target is under 32px: ${s}`);
  }

  /* ---- 6. reduced motion ---- */
  console.log('6) reduced: under reduce the settled frame shows at once; otherwise it plays');
  for (const pref of ['reduce', 'no-preference']) {
    const p = pref === 'reduce' ? phone : await open({ width: 390, height: 844 }, pref);
    if (pref === 'reduce') await p.emulateMedia({ reducedMotion: 'reduce' });
    for (const outcome of ['win', 'close', 'loss']) {
      await p.evaluate(o => window.moment({ outcome: o, gamePath: '/ufc', score: '3', headline: 'Fight over', badge: '\u{1F94A}' }), outcome);
      await settle(p);
      await holdAt(p, 0);
      const got = await p.evaluate(() => [...document.querySelectorAll('[data-result-moment] [class*="rm-"]')].map(el => {
        const s = getComputedStyle(el);
        const cls = [...el.classList].find(c => c.startsWith('rm-'));
        return { cls, anim: s.animationName, opacity: Number(s.opacity), display: s.display };
      }));
      const line = got.map(g => `${g.cls}:${g.anim}/${g.opacity}${g.display === 'none' ? '/hidden' : ''}`).join(' ');
      console.log(`   ${pref.padEnd(13)} ${outcome.padEnd(5)} ${line}`);
      const pieces = got.filter(g => g.cls !== 'rm-burst');
      if (pieces.length < 3) fail('reduced', `${pref}/${outcome}: only ${pieces.length} animated pieces found, so this measured nothing`);
      if (pref === 'reduce') {
        for (const g of pieces) {
          if (g.anim !== 'none') fail('reduced', `${outcome}: ${g.cls} still animates (${g.anim}) under reduce`);
          if (g.cls !== 'rm-mark' && g.opacity !== 1) fail('reduced', `${outcome}: ${g.cls} starts at opacity ${g.opacity} under reduce, the final frame must show at once`);
        }
        const burst = got.find(g => g.cls === 'rm-burst');
        if (burst && burst.display !== 'none') fail('reduced', `${outcome}: the win burst still shows under reduce`);
      } else {
        const score = got.find(g => g.cls === 'rm-score');
        if (!score || score.anim === 'none') fail('reduced', `${outcome}: with no preference the score reveal no longer plays`);
      }
    }
    if (pref !== 'reduce') await p.close();
  }
  await phone.close();

  /* ---- screenshots for a visual pass ---- */
  const shots = process.env.RESULT_MOMENT_SHOTS;
  if (shots && !control) {
    fs.mkdirSync(shots, { recursive: true });
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const p = await open({ width: w, height: h });
      await p.evaluate(() => window.moments([
        { outcome: 'win', gamePath: '/soccer-grid', score: '9/9', headline: 'Grid Complete!', badge: '\u{1F3C6}', scoreLabel: 'cells' },
        { outcome: 'close', gamePath: '/nba-connections', score: '2/4', headline: 'Out of Lives!', badge: '\u{1F605}', scoreLabel: 'groups found' },
        { outcome: 'loss', gamePath: '/ufc', score: 0, headline: 'Game Over', badge: '\u{1F494}' },
      ]));
      await settle(p);
      await holdAt(p, 5000);
      await p.screenshot({ path: path.join(shots, `fixture-${w}x${h}.png`), fullPage: true });
      await p.close();
    }
    console.log(`   screenshots written to ${shots}`);
  }
} finally {
  await browser.close();
}

console.log('');
const red = Object.entries(checks).filter(([, v]) => v.length).map(([k]) => k);
if (control) {
  const want = CONTROLS[control];
  if (red.length === 1 && red[0] === want) {
    console.log(`simResultMoment control ${control}: green. It turned ${want} red (${checks[want].length} finding${checks[want].length === 1 ? '' : 's'}) and nothing else.`);
    process.exit(0);
  }
  console.error(`simResultMoment control ${control}: RED. Expected only ${want} to go red, got ${red.length ? red.join(', ') : 'nothing'}.`);
  process.exit(1);
}
if (red.length) {
  console.error(`simResultMoment: ${red.map(k => `${k} ${checks[k].length}`).join(', ')} problem(s)`);
  process.exit(1);
}
console.log('simResultMoment: green. Every live game reaches the shared result moment or is listed with what it draws instead, the pill shows exactly the score it is given, the three states say their own lines in the sport\'s ink, nothing moves while it plays, and reduced motion shows the final frame at once.');
