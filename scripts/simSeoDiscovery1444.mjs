/* Search discovery1444, remote runtime only. Actual guide exports and parsed
   comment-free hero JSX, with five foundations before three outcomes.
   SEO_DISCOVERY_CONTROL=home-generic|summary-unlinked|guide-promised-rarity
   Controls change only private checked copies. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';
import { readRoutes } from './lib/retiredRoutes.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.SEO_DISCOVERY_ARTIFACTS || path.join(os.tmpdir(), 'seo1444-' + process.pid));
const CONTROL = process.env.SEO_DISCOVERY_CONTROL || '';
const MARKERS = { home: 'SEO_HOME_DESCRIPTION_MISSING', summary: 'SEO_SUMMARY_CAREERS_MISSING', guide: 'SEO_GRID_RARITY_PROMISE' };
const CONTROLS = { 'home-generic': MARKERS.home, 'summary-unlinked': MARKERS.summary, 'guide-promised-rarity': MARKERS.guide };
const INPUTS = ['src/pages/Index.tsx', 'src/data/homeCopy.ts', 'src/data/gameRegistry.ts',
  'src/data/gameContent/football.ts', 'src/data/gameContent/guideShape.ts', 'src/App.tsx',
  'src/hooks/useFootballGrid.ts', 'src/lib/gridRarity.ts', 'public/llms.txt', 'index.html',
  'package.json', 'package-lock.json', 'scripts/simSeoDiscovery1444.mjs', '.github/workflows/seo-discovery-1444.yml'];
const sha = x => createHash('sha256').update(x).digest('hex');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const snapshot = () => INPUTS.map(rel => { const data = fs.readFileSync(path.join(ROOT, rel));
  return { path: rel, bytes: data.length, sha256: sha(data) }; });
const report = { v: 1, control: null, foundations: [], outcomes: [], errors: [],
  transport: { attempts: 0 }, source: { before: [], after: [], unchanged: false } };
let temp, exitCode = 1;
function foundation(id, fn) {
  try { const details = fn(); report.foundations.push({ id, status: 'passed', details }); console.log('SEO_FOUNDATION_PASS ' + id); }
  catch (error) { report.foundations.push({ id, status: 'failed', error: error.stack }); throw error; }
}
function outcome(id, marker, details) {
  const missing = Object.entries(details.checks).filter(([, ok]) => !ok).map(([key]) => key);
  try { assert.deepEqual(missing, [], marker + ': ' + missing.join('; ')); report.outcomes.push({ id, marker, status: 'passed', details }); }
  catch (error) { if (!(error instanceof assert.AssertionError)) throw error;
    report.outcomes.push({ id, marker, status: 'failed', errorType: error.name, error: error.message, stack: error.stack, details });
    console.error('SEO_OUTCOME_FAIL ' + id + ': ' + error.message); }
}
const strings = x => typeof x === 'string' ? [x] : Array.isArray(x) ? x.flatMap(strings)
  : x && typeof x === 'object' ? Object.values(x).flatMap(strings) : [];
function canonicalLinks(text) {
  return [...text.matchAll(/\[[^\]\n]+\]\(([^)\s]+)\)/g)].map(hit => {
    const url = new URL(hit[1]);
    assert.equal(url.origin, 'https://douknowball.com', 'summary canonical origin');
    assert.equal(url.username + url.password + url.search + url.hash, '', 'summary credentials/query/fragment');
    assert.equal(hit[1], url.origin + (url.pathname === '/' && hit[1] === url.origin ? '' : url.pathname), 'literal canonical URL');
    return { raw: hit[1], pathname: url.pathname };
  });
}
try {
  assert(!CONTROL || Object.hasOwn(CONTROLS, CONTROL), 'unknown control');
  fs.mkdirSync(OUT, { recursive: true });
  report.source.before = snapshot();
  temp = fs.mkdtempSync(path.join(os.tmpdir(), 'seo1444-exports-'));
  const bundle = path.join(temp, 'actual.cjs');
  await build({ stdin: { contents: [
    "export { FOOTBALL_CONTENT } from './src/data/gameContent/football';",
    "export { flatGuide } from './src/data/gameContent/guideShape';",
    "export { HOME_COPY } from './src/data/homeCopy';",
    "export { ALL_GAMES, GAME_COUNT_LABEL } from './src/data/gameRegistry';",
    "export { rarityPercent } from './src/lib/gridRarity';",
  ].join('\n'), resolveDir: ROOT, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs',
    outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
  const actual = createRequire(import.meta.url)(bundle);
  const clean = async (rel, loader) => (await transform(read(rel), { loader, jsx: 'preserve', legalComments: 'none' })).code;
  const code = await clean('src/pages/Index.tsx', 'tsx');
  const routes = readRoutes(await clean('src/App.tsx', 'tsx'));
  const hook = await clean('src/hooks/useFootballGrid.ts', 'ts');
  const required = ['/soccer-career', '/club-manager', '/nba-my-career', '/nfl-my-career', '/football-grid'];
  const h1s = [...code.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
  let hero, summary = read('public/llms.txt'), guide = structuredClone(actual.FOOTBALL_CONTENT['/football-grid']);
  foundation('registry-routes-and-brand-h1', () => {
    assert(actual.ALL_GAMES.length > 100 && /^\d+0\+$/.test(actual.GAME_COUNT_LABEL), 'real registry/count');
    for (const target of required) { assert(actual.ALL_GAMES.some(row => row.path === target), 'registry ' + target); assert(routes.live.has(target), 'route ' + target); }
    assert.equal(h1s.length, 1); assert.equal(h1s[0][1].trim(), 'DoUKnowBall'); assert.equal(actual.HOME_COPY.h1, 'DoUKnowBall');
    assert.match(read('index.html'), /<h1>DoUKnowBall<\/h1>/);
    return { registryGames: actual.ALL_GAMES.length, countLabel: actual.GAME_COUNT_LABEL, required, liveRoutes: routes.live.size };
  });
  foundation('real-visible-hero-template', () => {
    const paragraph = /<p\b([^>]*)>([\s\S]*?)<\/p>/.exec(code.slice(h1s[0].index + h1s[0][0].length));
    assert(paragraph, 'actual hero paragraph');
    assert.doesNotMatch(paragraph[1], /sr-only|invisible|opacity-0|hidden|clip-path|text-\[0/i);
    const body = /^\s*\{\s*\x60([^\x60]+)\x60\s*\}\s*$/.exec(paragraph[2]); assert(body, 'one plain hero template');
    assert.deepEqual([...body[1].matchAll(/\$\{([^}]+)\}/g)].map(row => row[1].trim()), ['GAME_COUNT_LABEL']);
    hero = body[1]; assert.doesNotMatch(hero, /<[^>]+>/); return { template: hero, parsedComments: true };
  });
  foundation('existing-summary-canonical-foundation', () => {
    assert(summary.startsWith('# DoUKnowBall') && summary.length > 700, 'existing summary identity/content');
    const links = canonicalLinks(summary); assert(links.length >= 8);
    for (const row of links) if (row.pathname !== '/sitemap.xml') assert(routes.live.has(row.pathname), 'unknown summary route ' + row.pathname);
    for (const target of ['/soccer-career', '/about', '/contact']) assert(links.some(row => row.pathname === target), target);
    return { links, bytes: Buffer.byteLength(summary) };
  });
  foundation('actual-exported-guide-and-game-rules', () => {
    assert(guide && typeof guide === 'object');
    const flat = actual.flatGuide(guide);
    for (const part of ['howToPlay', 'rules', 'example', 'tips']) assert(Array.isArray(flat[part]) && flat[part].length >= 3 && flat[part].every(x => typeof x === 'string' && x.length > 10), part);
    assert(guide.faqs.length >= 4); assert.match(hook, /const GUESS_LIMIT = 15;/);
    const at = hook.indexOf('cells.some('), end = hook.indexOf('setValidating(true)', at); assert(at >= 0 && end > at);
    assert.match(hook.slice(at, end), /c\.playerName === player\.name/); assert.match(hook.slice(at, end), /return;/);
    assert.doesNotMatch(hook, /functions\.invoke\(/);
    assert.equal(actual.rarityPercent(0, 0), 101); assert.equal(actual.rarityPercent(9, 0), 10); assert.equal(actual.rarityPercent(99, 0), 1);
    return { parts: Object.fromEntries(Object.entries(flat).map(([k, rows]) => [k, rows.length])), faq: guide.faqs.length,
      guessLimit: 15, cells: 9, misses: 6, crowdExamples: [101, 10, 1] };
  });
  foundation('unrelated-football-guides-held', () => {
    const text = read('src/data/gameContent/football.ts'), start = text.indexOf("  '/football-grid': {"), end = text.indexOf("\n  '/nfl-career': {", start);
    assert(start >= 0 && end > start, 'owned guide boundaries');
    const heldHash = sha(text.slice(0, start) + text.slice(end));
    assert.equal(heldHash, '074cb5990d9ae7c0f259775280a1d1863f12af7b0fbbbbd5d92e04300fbf5e50', 'unrelated football guide changed');
    report.source.otherFootballSha256 = heldHash; return { heldSha256: heldHash };
  });
  if (CONTROL) {
    const before = JSON.stringify({ hero, summary, guide });
    if (CONTROL === 'home-generic') hero = '${GAME_COUNT_LABEL} free games across every sport. All playable without an account.';
    if (CONTROL === 'summary-unlinked') {
      const links = [...summary.matchAll(/\[[^\]\n]+\]\(https:\/\/douknowball\.com\/club-manager\)/g)];
      assert.equal(links.length, 1, 'control needs one actual Club Manager link'); summary = summary.replace(links[0][0], 'Club Manager');
    }
    if (CONTROL === 'guide-promised-rarity') {
      assert(guide.exampleSections?.[0]?.paragraphs?.length, 'control needs actual first example');
      guide.exampleSections[0].paragraphs.push('This pick will score single digits.');
    }
    const after = JSON.stringify({ hero, summary, guide }); assert.notEqual(before, after, 'control changed nothing');
    report.control = { name: CONTROL, expectedMarker: CONTROLS[CONTROL], changed: true, beforeSha256: sha(before), afterSha256: sha(after), detected: false };
  }
  const heroText = hero.replace('${GAME_COUNT_LABEL}', actual.GAME_COUNT_LABEL);
  outcome('home-description', MARKERS.home, { heroText, checks: {
    trivia: /\btrivia\b/i.test(heroText), puzzles: /\bpuzzles?\b/i.test(heroText), careers: /\bcareer\s+(?:sims?|simulators?|simulations?)\b/i.test(heroText),
    derivedCount: (hero.match(/\$\{GAME_COUNT_LABEL\}/g) || []).length === 1, free: /\bfree\b/i.test(heroText),
    noAccount: /\b(?:without an account|no account(?: needed|required)?|no login(?: needed|required)?)\b/i.test(heroText) } });
  const links = canonicalLinks(summary);
  outcome('summary-career-discovery', MARKERS.summary, { missingGameLinks: required.filter(target => !links.some(row => row.pathname === target)), checks: {
    requiredGameLinks: required.every(target => links.some(row => row.pathname === target)),
    fictionalOutcomes: /\bfictional\b[^.!?\n]{0,100}\b(?:outcomes?|seasons?|careers?|simulations?)\b/i.test(summary) || /\b(?:outcomes?|seasons?|careers?|simulations?)\b[^.!?\n]{0,100}\bfictional\b/i.test(summary),
    noBlanketVerifiedClaim: !/\breal rosters,\s*real stats,\s*verified lineups\b/i.test(summary),
    freeBrowser: /\bfree\b/i.test(summary) && /\bbrowser\b/i.test(summary), noAccount: /\b(?:no login|no account|without an account)\b/i.test(summary),
    currentCount: [' games', ' free games', ' sports games', ' free sports games', ' free browser games'].some(tail => summary.includes(actual.GAME_COUNT_LABEL + tail)) } });
  const flat = actual.flatGuide(guide), all = strings(guide).join(' ');
  const promises = flat.example.filter(line => /\b(?:score|scores|scoring|collect)\b[^.!?]{0,45}\b(?:single digits|common percentage|\d+\s*(?:%|percent))\b|\b(?:percentages?|rarity score)\b[^.!?]{0,45}\b\d+(?:\.\d+)?\b/i.test(line)
    && !/\b(?:hypothetical|imagined numbers|example numbers|for the arithmetic)\b/i.test(line));
  outcome('nfl-guide-honest-strategy', MARKERS.guide, { unqualifiedPromises: promises, checks: {
    noUnqualifiedRarityPromise: promises.length === 0,
    variableCrowd: /\b(?:rarity|percentages?|crowd)\b[^.!?]{0,100}\b(?:change|changes|vary|varies|depends|not guaranteed|not fixed)\b/i.test(all) || /\b(?:change|changes|vary|varies|depends)\b[^.!?]{0,100}\b(?:rarity|percentages?|crowd)\b/i.test(all),
    fifteenGuesses: /\b15\b[^.!?]{0,45}\bguesses\b/i.test(all), nineCells: /\b9\b[^.!?]{0,30}\bcells\b/i.test(all), sixMisses: /\b6\b[^.!?]{0,20}\b(?:misses|mistakes)\b/i.test(all),
    noReuse: /\busing (?:him|a player|the same name) twice is not allowed\b/i.test(all) || /\b(?:cannot|can't|do not|don't|never)\b[^.!?]{0,60}\b(?:reuse|re-use|use)\b[^.!?]{0,45}\b(?:again|same|filled|used)\b/i.test(all),
    flexibleAnswers: /\b(?:flexible|multi[- ]criterion|fits (?:several|multiple) cells)\b[^.!?]{0,90}\b(?:hardest|crossing)\b/i.test(all) || /\b(?:hardest|crossing)\b[^.!?]{0,90}\bflexible\b/i.test(all),
    offeredNames: /\b(?:suggestions|offered player list|answer key)\b/i.test(all) } });
  assert.equal(report.outcomes.length, 3);
  const failed = report.outcomes.filter(row => row.status === 'failed');
  if (report.control) report.control.detected = failed.length === 1 && failed[0].marker === report.control.expectedMarker && failed[0].errorType === 'AssertionError' && failed[0].error.includes(report.control.expectedMarker);
  exitCode = failed.length ? 1 : 0;
} catch (error) { report.errors.push(error.stack || String(error)); console.error('SEO_SETUP_ERROR ' + (error.stack || String(error))); }
finally {
  if (temp) fs.rmSync(temp, { recursive: true, force: true });
  try {
    report.source.after = snapshot(); report.source.unchanged = JSON.stringify(report.source.before) === JSON.stringify(report.source.after); assert(report.source.unchanged, 'source changed');
    const receipt = process.env.SIM_OFFLINE_RECEIPT; report.transport.attempts = receipt && fs.existsSync(receipt) ? fs.readFileSync(receipt, 'utf8').split(/\r?\n/).filter(Boolean).length : 0;
    assert.equal(report.transport.attempts, 0, 'offline transport attempted');
  } catch (error) { report.errors.push(error.stack || String(error)); }
  if (report.errors.length || report.foundations.length !== 5 || report.foundations.some(x => x.status !== 'passed') || report.outcomes.length !== 3) exitCode = 1;
  report.status = exitCode === 0 ? 'passed' : 'failed';
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'checked-inputs.sha256'), report.source.before.map(x => x.sha256 + '  ' + x.path).join('\n') + '\n');
  const files = fs.readdirSync(OUT).filter(x => x !== 'evidence.sha256').sort();
  assert(files.every(x => fs.statSync(path.join(OUT, x)).isFile()), 'unexpected artifact directory');
  fs.writeFileSync(path.join(OUT, 'evidence.sha256'), files.map(x => sha(fs.readFileSync(path.join(OUT, x))) + '  ' + x).join('\n') + '\n');
}
console.log('SEO_DISCOVERY_RESULT ' + JSON.stringify({ status: report.status, foundations: report.foundations.length, outcomes: report.outcomes.length,
  failed: report.outcomes.filter(x => x.status === 'failed').length, errors: report.errors.length, sourceUnchanged: report.source.unchanged,
  networkAttempts: report.transport.attempts, control: report.control?.name || null, detected: report.control?.detected || false }));
process.exitCode = exitCode;
