/* Remote-only real GameSeoContent render outcomes. No product file is rewritten. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
import '../lib/offlineTransport.cjs';

assert(process.env.CI, 'Remote CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(process.env.SEO_INTRO_ARTIFACTS || path.join(ROOT, 'soccer-intro-artifacts'));
const mode = process.env.SEO_INTRO_RENDER_MODE || 'fixed';
assert(['baseline', 'fixed', 'href-control'].includes(mode));
const folder = path.join(OUT, 'render-' + mode); fs.mkdirSync(folder, { recursive: true });
const original = path.resolve(process.env.SEO_INTRO_ORIGINAL_COMPONENT || '');
const renderer = path.join(ROOT, 'src/components/seo/GameSeoContent.tsx');
const soccer = path.join(ROOT, 'src/data/gameContent/soccer2.ts');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [renderer, soccer, path.join(ROOT, 'src/data/gameContent/types.ts'), original];
const held = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(file))]));
const report = { mode, cases: [], sourceBefore: held() };
assert.equal(hash(fs.readFileSync(original)), '7a6939881bd1918d444ec1b2b72ed996bb596c598b313414add7bd2212a2c148');
assert.equal(hash(fs.readFileSync(renderer)), '23230e28533360d9b0661a6e47c88e63639fed624727ad87e3d5f34210d84212');
let soccerSource = fs.readFileSync(soccer, 'utf8');
assert.equal(hash(Buffer.from(soccerSource)), '3d3d29e8fdc7f4d445dbe8b5ea6a6ff2e3e384c53ed2b636b95dd67c0ad8bb59');
if (mode === 'href-control') {
  const before = "{ paragraph: 0, text: 'Wonderkid Factory', to: '/wonderkid-factory' }";
  const after = "{ paragraph: 0, text: 'Wonderkid Factory', to: '/contract-chaos' }";
  assert.equal(soccerSource.split(before).length - 1, 1, 'Physical href fault has one real anchor');
  const changed = soccerSource.replace(before, after); assert.notEqual(changed, soccerSource);
  report.mutation = { before: hash(Buffer.from(soccerSource)), changed: hash(Buffer.from(changed)), anchor: before, replacement: after };
  soccerSource = changed;
  fs.writeFileSync(path.join(folder, 'soccer2-executed-copy.ts.txt'), soccerSource);
}
const loader = path.join(ROOT, 'src/data/gameContent/loader.ts');
const shim = [
  'import * as actual from ' + JSON.stringify(loader) + ';',
  'const overrides = new Map();',
  'export const loadGameContent = actual.loadGameContent;',
  'export const peekGameContent = route => overrides.has(route) ? overrides.get(route) : actual.peekGameContent(route);',
  'export const setOverride = (route, content) => content === undefined ? overrides.delete(route) : overrides.set(route, content);',
].join('\n');
const entry = [
  "import React from 'react';", "import { renderToStaticMarkup } from 'react-dom/server';",
  "import { MemoryRouter } from 'react-router-dom';", "import { HelmetProvider } from 'react-helmet-async';",
  "import { ALL_GAMES } from '@/data/gameRegistry';",
  "import { loadGameContent, peekGameContent, setOverride } from '@/data/gameContent/loader';",
  'import Original from ' + JSON.stringify(original) + ';',
  'import Current from ' + JSON.stringify(renderer) + ';',
  'export const routes = [...new Set(ALL_GAMES.map(game => game.path))];',
  'export { loadGameContent, peekGameContent };',
  'export function render(which, route, content) {',
  '  setOverride(route, content);',
  '  try { return renderToStaticMarkup(React.createElement(HelmetProvider, {}, React.createElement(MemoryRouter, { initialEntries: [route] },',
  "    React.createElement(which === 'original' ? Original : Current, { title: 'Soccer Career', description: 'Existing game guide', pageHasOwnH1: true, reportControl: false }))));",
  '  } finally { setOverride(route, undefined); }',
  '}',
].join('\n');
const bundle = path.join(folder, 'actual-render.cjs');
await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'seo-intro-render.mjs' }, bundle: true, platform: 'node', format: 'cjs',
  outfile: bundle, nodePaths: [path.join(ROOT, 'node_modules')], alias: { '@': path.join(ROOT, 'src') }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'error', plugins: [{ name: 'fixture-data-only',
    setup(builder) {
      builder.onResolve({ filter: /^@\/data\/gameContent\/loader$/ }, () => ({ path: 'loader-shim', namespace: 'seo-proof' }));
      builder.onLoad({ filter: /.*/, namespace: 'seo-proof' }, () => ({ contents: shim, resolveDir: ROOT, loader: 'js' }));
      if (mode === 'href-control') builder.onLoad({ filter: /[\\/]src[\\/]data[\\/]gameContent[\\/]soccer2\.ts$/ },
        () => ({ contents: soccerSource, resolveDir: path.dirname(soccer), loader: 'ts' }));
    } }] });
report.executedBundleSha256 = hash(fs.readFileSync(bundle));
const actual = createRequire(import.meta.url)(bundle);
for (const route of actual.routes) await actual.loadGameContent(route);
const loaded = actual.routes.filter(route => actual.peekGameContent(route));
report.guideCensus = { registeredRoutes: actual.routes, loadedGuideRoutes: loaded,
  missingGuides: actual.routes.filter(route => !actual.peekGameContent(route)).map(route => ({ route, state: actual.peekGameContent(route) === null ? 'no-guide-entry' : 'unmapped-or-unloaded' })),
  unannotatedGuideRoutes: loaded.filter(route => !actual.peekGameContent(route).introLinks?.length) };
fs.writeFileSync(path.join(folder, 'guide-census.json'), JSON.stringify(report.guideCensus, null, 2));
const guide = actual.peekGameContent('/soccer-career'); assert(guide);
assert.deepEqual(actual.routes.filter(route => actual.peekGameContent(route)?.introLinks?.length), ['/soccer-career']);
const which = mode === 'baseline' ? 'original' : 'current';
let browser;
async function test(name, body) {
  try { await body(); report.cases.push({ name, status: 'passed' }); }
  catch (error) { report.cases.push({ name, status: 'failed', errorName: error.name, message: error.message }); }
}
const targets = [{ paragraph: 0, text: 'Wonderkid Factory', href: '/wonderkid-factory' }, { paragraph: 1, text: 'Contract Chaos', href: '/contract-chaos' }];
try {
  browser = await pw.chromium.launch({ headless: true });
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.route('**/*', route => route.abort());
  const html = actual.render(which, '/soccer-career');
  fs.writeFileSync(path.join(folder, 'soccer-career.html'), html);
  for (const target of targets) await test('real-anchor-' + target.href.slice(1), async () => {
    await page.setContent(html);
    const value = await page.locator('article > div').first().evaluate((el, target) => {
      const paragraph = el.children[target.paragraph], links = [...paragraph.querySelectorAll('a')].filter(a => a.textContent === target.text);
      return { count: links.length, href: links[0]?.getAttribute('href'), text: paragraph.textContent };
    }, target);
    assert.equal(value.count, 1, 'One actual inline anchor for ' + target.text);
    assert.equal(value.href, target.href, 'Exact internal href for ' + target.text);
    assert.equal(value.text, guide.intro[target.paragraph], 'Complete paragraph is preserved');
  });
  const phrase = '<strong>safe & plain</strong>', literal = 'Before <em>literal</em> & ' + phrase + ' > after';
  const escapedGuide = { ...guide, intro: [literal], introLinks: [{ paragraph: 0, text: phrase, to: '/wonderkid-factory' }] };
  const escapedHtml = actual.render(which, '/soccer-career', escapedGuide);
  fs.writeFileSync(path.join(folder, 'escaped.html'), escapedHtml);
  const observe = () => page.locator('article > div > p').first().evaluate(p => ({ text: p.textContent, childTags: [...p.children].map(el => el.tagName),
    anchor: p.querySelector('a')?.textContent, href: p.querySelector('a')?.getAttribute('href'), injected: p.querySelectorAll('em,strong,script').length }));
  function escaped(value) {
    assert.equal(value.text, literal, 'Literal text remains escaped');
    assert.deepEqual(value.childTags, ['A'], 'Only a declared anchor is introduced');
    assert.equal(value.injected, 0, 'Literal tags never become elements');
    assert.equal(value.anchor, phrase, 'Linked text remains escaped'); assert.equal(value.href, '/wonderkid-factory');
  }
  await test('escaped-annotated-text', async () => { await page.setContent(escapedHtml); escaped(await observe()); });
  await test('all-unannotated-guides-identity', () => {
    const routes = report.guideCensus.unannotatedGuideRoutes;
    assert(routes.length); report.unannotatedRoutes = routes;
    for (const route of routes) assert.equal(actual.render('current', route), actual.render('original', route), 'Whole unannotated render: ' + route);
  });
  await test('unannotated-soccer-career-identity', () => {
    const content = { ...guide }; delete content.introLinks;
    assert.equal(actual.render('current', '/soccer-career', content), actual.render('original', '/soccer-career', content));
  });
  await test('missing-exact-text-falls-back', () => {
    const content = { ...guide, intro: ['Plain & <em>literal</em>'], introLinks: [{ paragraph: 0, text: 'not present', to: '/wonderkid-factory' }] };
    assert.equal(actual.render('current', '/soccer-career', content), actual.render('original', '/soccer-career', content));
  });
  await test('escaping-observer-effective-control-and-restore', async () => {
    const healthy = actual.render('current', '/soccer-career', escapedGuide);
    await page.setContent(healthy); escaped(await observe());
    await page.locator('article > div > p').first().evaluate(p => {
      const node = [...p.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.includes('<em>literal</em>'));
      if (!node) throw new Error('Escaping control anchor absent');
      const [before, after] = node.textContent.split('<em>literal</em>'), fragment = document.createDocumentFragment(), em = document.createElement('em');
      em.textContent = 'literal'; fragment.append(before, em, after); node.replaceWith(fragment);
    });
    const changed = await observe(); assert(changed.injected > 0); assert.throws(() => escaped(changed), /Literal text/);
    fs.writeFileSync(path.join(folder, 'escaping-control.json'), JSON.stringify(changed, null, 2));
    await page.setContent(healthy); escaped(await observe());
  });
  if (mode === 'fixed') fs.writeFileSync(path.join(OUT, 'render-contract.json'), JSON.stringify({ route: '/soccer-career', intro: guide.intro, targets }, null, 2));
} finally {
  await browser?.close(); report.sourceAfter = held(); report.sourceHeld = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.passed = report.cases.filter(row => row.status === 'passed').length; report.failed = report.cases.filter(row => row.status === 'failed').length;
  fs.writeFileSync(path.join(folder, 'report.json'), JSON.stringify(report, null, 2));
}
assert(report.sourceHeld, 'Every original/candidate source byte remains held');
console.log('Soccer Career intro render ' + mode + ': ' + report.passed + ' passed, ' + report.failed + ' failed, actual unannotated guides ' + (report.unannotatedRoutes?.length || 0));
process.exitCode = report.failed ? 1 : 0;
