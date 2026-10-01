/* Round 750: mount the actual Boards, never a hand-built grid approximation.
   GRID_GEOMETRY_DIST selects a finished build for its Tailwind stylesheet.
   GRID_GEOMETRY_CONTROL=unbound removes scoped layout classes in asserted
   copies. Six 320px probes must reproduce the old answer-cell expansion.
   GRID_GEOMETRY_ARTIFACTS optionally saves local screenshots and measurements. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, copyFile, readdir, rm, rmdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as compile } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.GRID_GEOMETRY_DIST || path.join(root, 'dist'));
const control = process.env.GRID_GEOMETRY_CONTROL || '';
assert.ok(['', 'unbound'].includes(control), 'Unknown grid geometry control');
const artifacts = process.env.GRID_GEOMETRY_ARTIFACTS ? path.resolve(process.env.GRID_GEOMETRY_ARTIFACTS) : null;
const base = path.join(root, '.sim-control');
await mkdir(base, { recursive: true });
const folder = await mkdtemp(path.join(base, 'grid-geometry-'));
const owned = [];
const production = [];
let server;
let browser;
async function write(name, content) {
  const file = path.join(folder, name);
  owned.push(file);
  await writeFile(file, content);
  return file;
}

function measure() {
  const buttons = [...document.querySelectorAll('[data-grid-cell-status]')];
  return {
    rects: buttons.map(button => {
      const rect = button.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
    content: buttons.map(button => ({
      name: button.querySelector('[title]')?.textContent ?? '',
      title: button.querySelector('[title]')?.title ?? '',
      accessibleText: button.textContent,
      disabled: button.disabled,
      info: [...button.querySelectorAll('div > span:not(:first-child)')].map(span => {
        const rect = span.getBoundingClientRect();
        const cell = button.getBoundingClientRect();
        return { text: span.textContent, fits: rect.left >= cell.left + 1 && rect.right <= cell.right - 1 && rect.top >= cell.top + 1 && rect.bottom <= cell.bottom - 1 && span.scrollWidth <= span.clientWidth + 1 };
      }),
    })),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    focus: buttons.indexOf(document.activeElement),
    identity: buttons.every((button, index) => button === window.__originalButtons[index]),
    calls: [...window.__calls],
  };
}

function differences(before, after) {
  return after.rects.flatMap((rect, index) => ['x', 'y', 'width', 'height'].filter(key => Math.abs(rect[key] - before.rects[index][key]) > 0.5).map(key => ({ index, key, before: before.rects[index][key], after: rect[key] })));
}

const results = [];
const geometryFailures = [];
try {
  const alias = { '@': path.join(root, 'src') };
  if (control) {
    for (const [importName, relative] of [
      ['@/components/football-grid/GridBoard', 'src/components/football-grid/GridBoard.tsx'],
      ['@/components/soccer-grid/SoccerGridBoard', 'src/components/soccer-grid/SoccerGridBoard.tsx'],
    ]) {
      const sourcePath = path.join(root, relative);
      const source = await readFile(sourcePath, 'utf8');
      for (const name of ['board', 'cell', 'content', 'name']) assert.equal(source.split(`layout.${name}`).length - 1, 1, `Control anchor layout.${name} must occur once in ${relative}`);
      const changed = source.replace(/layout\.(board|cell|content|name)\b/g, 'undefined');
      assert.notEqual(changed, source, 'Control must change Board layout applications');
      production.push({ sourcePath, source });
      alias[importName] = await write(path.basename(relative), changed);
    }
  }
  const fixture = await write('fixture.tsx', `import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GridBoard } from '@/components/football-grid/GridBoard';
import { SoccerGridBoard } from '@/components/soccer-grid/SoccerGridBoard';
const puzzle={id:'geometry-only',rows:['First row','Second row','Third row'].map(label=>({label,type:'misc'})),cols:['First column','Second column','Third column'].map(label=>({label,type:'misc'}))};
const empty=()=>Array.from({length:9},(_,index)=>({index,status:'empty',playerName:null,rarity:null}));
function App(){const [cells,setCells]=useState(empty),[active,setActive]=useState(null);const kind=new URLSearchParams(location.search).get('kind');
useEffect(()=>{window.__calls=[];window.__qa={setCell:(status,name=null,rarity=null)=>setCells(old=>old.map((cell,index)=>index===4?{...cell,status,playerName:name,rarity}:cell)),retry:()=>setCells(old=>old.map(cell=>({...cell}))),fill:(names,rarities)=>setCells(old=>old.map((cell,index)=>({...cell,status:'correct',playerName:names[index],rarity:rarities[index]})))};},[]);
const choose=index=>{window.__calls.push(index);setActive(index);};return <main style={{padding:'24px 16px',maxWidth:672,margin:'auto'}}><h1 style={{fontSize:18,marginBottom:20}}>Grid geometry fixture: {kind}</h1>{kind==='soccer'?<SoccerGridBoard puzzle={puzzle} cells={cells} activeCell={active} onCellClick={choose}/>:<GridBoard puzzle={puzzle} cells={cells} activeCell={active} onCellClick={choose} {...(kind==='college'?{accentVar:'--cg-green',headerBgVar:'--cg-navy'}:{})}/>}</main>;}
createRoot(document.getElementById('root')).render(<App/>);`);
  const js = path.join(folder, 'fixture.js');
  const css = path.join(folder, 'fixture.css');
  owned.push(js, css);
  await compile({ entryPoints: [fixture], outfile: js, bundle: true, format: 'esm', jsx: 'automatic', nodePaths: [path.join(root, 'node_modules')], alias, loader: { '.module.css': 'local-css' }, define: { 'process.env.NODE_ENV': '"production"' } });
  const cssNames = (await readdir(path.join(dist, 'assets'))).filter(name => /^index-.*\.css$/.test(name));
  assert.equal(cssNames.length, 1, 'A finished build must have one main Tailwind stylesheet');
  const tailwind = path.join(folder, 'tailwind.css');
  owned.push(tailwind);
  await copyFile(path.join(dist, 'assets', cssNames[0]), tailwind);
  await write('index.html', '<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/tailwind.css"><link rel="stylesheet" href="/fixture.css"></head><body style="margin:0;background:hsl(var(--background));color:hsl(var(--foreground))"><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>');
  server = createServer(async (request, response) => {
    const file = path.basename(new URL(request.url, 'http://local').pathname) || 'index.html';
    try {
      const content = await readFile(path.join(folder, file));
      response.setHeader('content-type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      response.end(content);
    } catch { response.statusCode = 404; response.end('missing'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  if (artifacts) await mkdir(artifacts, { recursive: true });
  const fullName = 'LongFirstname AnotherMiddleName LongFamilyName';
  const unbroken = 'VeryLongUnbrokenAnswerPlayerName';
  const rarities = [0.8, 3, 7, 12, 25, 40, 60, 101, 80];
  const names = rarities.map((_, index) => index === 8 ? unbroken : `${fullName} ${index}`);
  for (const kind of ['football', 'college', 'soccer']) for (const width of [320, 390, 430, 1440]) for (const reduced of [false, true]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    try {
      await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${url}/?kind=${kind}`);
      await page.waitForFunction(() => !!window.__qa);
      await page.evaluate(() => {
        window.__originalButtons = [...document.querySelectorAll('[data-grid-cell-status]')];
        window.__originalButtons.forEach(button => button.click());
        window.__originalButtons[4].focus();
      });
      const empty = await page.evaluate(measure);
      assert.equal(empty.rects.length, 9);
      for (const rect of empty.rects) assert.ok(Math.abs(rect.width - rect.height) <= 0.5, 'Empty cells must start square');
      assert.deepEqual(empty.calls, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
      await page.evaluate(() => window.__qa.retry());
      await page.waitForTimeout(30);
      const retry = await page.evaluate(measure);
      assert.equal(retry.focus, 4, 'Retry must preserve focused button');
      assert.equal(retry.identity, true);
      assert.deepEqual(differences(empty, retry), []);
      await page.evaluate(() => window.__qa.setCell('wrong'));
      await page.waitForTimeout(30);
      const wrong = await page.evaluate(measure);
      assert.equal(wrong.focus, 4);
      assert.equal(wrong.identity, true);
      assert.deepEqual(differences(empty, wrong), []);
      await page.evaluate(() => window.__qa.setCell('correct', 'Long Answer Name', 3));
      await page.waitForTimeout(30);
      const probe = await page.evaluate(measure);
      const probeChanges = differences(empty, probe);
      if (probeChanges.length || probe.overflow > 1) geometryFailures.push({ kind, width, reduced, phase: 'reproducer', changes: probeChanges, overflow: probe.overflow });
      assert.equal(probe.identity, true);
      assert.equal(probe.content[4].disabled, true);
      assert.equal(probe.content[4].name, 'Long Answer Name');
      await page.evaluate(() => window.__originalButtons[4].click());
      assert.deepEqual((await page.evaluate(measure)).calls, empty.calls, 'Locked cell must reject selection');
      for (const [phase, values] of [['all-tiers', rarities], ['null-rarity', Array(9).fill(null)]]) {
        await page.evaluate(({ names, values }) => window.__qa.fill(names, values), { names, values });
        await page.waitForTimeout(phase === 'all-tiers' ? 500 : 30);
        const filled = await page.evaluate(measure);
        const changes = differences(empty, filled);
        if (changes.length || filled.overflow > 1) geometryFailures.push({ kind, width, reduced, phase, changes, overflow: filled.overflow });
        assert.equal(filled.identity, true);
        filled.content.forEach((cell, index) => {
          assert.equal(cell.name, names[index], 'Full player name must remain in DOM');
          assert.equal(cell.title, names[index], 'Full player name must remain available on title');
          assert.equal(cell.disabled, true);
          if (!control) assert.ok(cell.info.every(info => info.fits), `${kind}/${width}/${phase}: rarity or badge clipped`);
          if (values[index] !== null) assert.ok(cell.accessibleText.includes(values[index] > 100 ? 'Only you!' : `${values[index]}% picked this`));
        });
        if (phase === 'all-tiers') for (const badge of ['Phoenix', 'Diamond', 'Emerald', 'Ruby', 'Gold', 'Silver', 'Bronze', 'Unicorn']) assert.ok(filled.content.some(cell => cell.accessibleText.includes(badge)), `Missing ${badge} tier`);
        if (artifacts && phase === 'all-tiers' && (width === 320 || kind === 'soccer' && width === 390 && !reduced)) await page.screenshot({ path: path.join(artifacts, `${control || 'healthy'}-${kind}-${width}-${reduced ? 'reduced' : 'normal'}.png`) });
      }
      assert.deepEqual(errors, [], 'Fixture must mount without runtime errors');
      results.push({ kind, width, reduced, cell: empty.rects[4], reproducerGrowth: probe.rects[4].height - empty.rects[4].height });
    } finally { await context.close(); }
  }
  for (const { sourcePath, source } of production) assert.equal(await readFile(sourcePath, 'utf8'), source, 'Control must not edit production source');
  if (artifacts) await writeFile(path.join(artifacts, `${control || 'healthy'}-report.json`), JSON.stringify({ limit: 'Actual production Board components compiled into an isolated fixture with finished-build Tailwind CSS. Route shells and validator requests are outside this geometry gate.', results, geometryFailures }, null, 2));
  if (control) {
    const reproduced = results.filter(result => result.width === 320 && result.reproducerGrowth >= 20);
    assert.equal(reproduced.length, 6, 'The control must reproduce cell expansion on all three accents in both motion modes');
    assert.ok(geometryFailures.length >= 6, 'Geometry gate must detect the planted expansion');
    console.log('playGridCellGeometry control: scoped layout classes removed from two asserted Board copies.');
    console.log(`Six 320px cells expanded by ${reproduced[0].reproducerGrowth.toFixed(2)}px and shifted following rows.`);
    console.log(`${geometryFailures.length} rendered geometry probes rejected the unbounded content.`);
    console.log('Production source remained unchanged; all owned temporary fixture files were cleaned.');
  } else {
    assert.deepEqual(geometryFailures, [], `Grid geometry changed: ${JSON.stringify(geometryFailures.slice(0, 3))}`);
    console.log('playGridCellGeometry: 24 production Board viewport/motion combinations passed.');
    console.log('Empty, wrong, correct, every rarity tier and missing rarity kept all nine square cell rectangles fixed.');
    console.log('Long names stayed complete in DOM/title; rarity text and every badge remained fully visible.');
    console.log('Stable button identity, retry/wrong focus and selection indices preserved; locked cells rejected clicks.');
  }
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  for (const file of owned) await rm(file, { force: true });
  await rmdir(folder);
}
