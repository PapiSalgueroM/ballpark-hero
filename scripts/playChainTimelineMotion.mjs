/* Round 753: actual chain timelines keep committed content and animate once.
   CHAIN_TIMELINE_DIST selects a finished build for its Tailwind stylesheet.
   CHAIN_TIMELINE_CONTROL=nowrap restores asserted pre-wrap component copies.
   CHAIN_TIMELINE_ARTIFACTS optionally saves local screenshots and measurements. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, copyFile, readdir, rm, rmdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as compile } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.CHAIN_TIMELINE_DIST || path.join(root, 'dist'));
const control = process.env.CHAIN_TIMELINE_CONTROL || '';
assert.ok(['', 'nowrap'].includes(control), 'Unknown chain timeline browser control');
const artifacts = process.env.CHAIN_TIMELINE_ARTIFACTS ? path.resolve(process.env.CHAIN_TIMELINE_ARTIFACTS) : null;
const base = path.join(root, '.sim-control');
await mkdir(base, { recursive: true });
const folder = await mkdtemp(path.join(base, 'chain-timeline-'));
const owned = [];
const originals = [];
const reports = [];
let server;
let browser;
async function write(name, content) {
  const file = path.join(folder, name);
  owned.push(file);
  await writeFile(file, content);
  return file;
}

function measure() {
  const timeline = document.querySelector('[data-chain-timeline]');
  const box = timeline?.getBoundingClientRect();
  return {
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    links: [...document.querySelectorAll('[data-chain-link]')].map(link => ({ text: link.textContent, status: link.dataset.chainLink, background: getComputedStyle(link).backgroundColor })),
    connections: [...document.querySelectorAll('[data-chain-connection]')].map(link => ({ text: link.textContent, status: link.dataset.chainConnection })),
    animations: document.getAnimations().filter(animation => animation instanceof CSSAnimation).map(animation => ({ name: animation.animationName, status: animation.effect.target.dataset.chainLink || animation.effect.target.dataset.chainConnection, duration: animation.effect.getTiming().duration })),
    text: timeline?.textContent ?? '',
    escaped: timeline ? [...timeline.querySelectorAll('div')].filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.left < box.left - 1 || rect.right > box.right + 1;
    }).map(element => element.textContent) : [],
    clipped: timeline ? [...timeline.querySelectorAll('div')].filter(element => element.children.length === 0 && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)).map(element => element.textContent) : [],
  };
}

async function draw(page, count, type = 'short') {
  await page.evaluate(({ count, type }) => window.__qa.draw(count, type), { count, type });
  await page.waitForTimeout(40);
  return page.evaluate(measure);
}

function expectMotion(state, reduced) {
  assert.equal(state.animations.length, reduced ? 0 : 2, 'Only the new card and committed connection animate');
  if (!reduced) {
    assert.ok(state.animations.every(animation => animation.status === 'latest'));
    assert.ok(state.animations.some(animation => /linkReveal/.test(animation.name) && animation.duration === 420));
    assert.ok(state.animations.some(animation => /connectionCue/.test(animation.name) && animation.duration === 360));
  }
}

function expectFit(state, label) {
  assert.ok(state.overflow <= 1, `${label}: page overflow ${state.overflow}px`);
  assert.deepEqual(state.escaped, [], `${label}: timeline content escaped its wrapper`);
  assert.deepEqual(state.clipped, [], `${label}: timeline text clipped`);
}

try {
  const alias = { '@': path.join(root, 'src') };
  if (control) for (const module of ['@/components/ufc-chain/ChainTimeline', '@/components/tennis-chain/TennisChainTimeline', '@/components/nascar-chain/NascarChainTimeline']) {
    const sourcePath = path.join(root, 'src', module.slice(2) + '.tsx');
    const source = await readFile(sourcePath, 'utf8');
    let changed = source;
    for (const [anchor, replacement] of [
      ['className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-y-1"', 'className="flex items-center"'],
      ['className={`min-w-0 max-w-full text-center ${motion.wrap}`}', 'className="text-center"'],
      ['${motion.wrap} ', ''],
      ['className={`min-w-0 ', 'className={`'],
    ]) {
      assert.equal(changed.split(anchor).length - 1, 1, `${module}: pre-wrap anchor must occur once`);
      changed = changed.replace(anchor, replacement);
    }
    assert.notEqual(changed, source, 'Control must change actual wrapper code');
    alias[module] = await write(path.basename(sourcePath), changed);
    originals.push({ sourcePath, source });
  }
  const fixture = await write('fixture.tsx', `import {useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';
import {ChainTimeline} from '@/components/ufc-chain/ChainTimeline';
import {TennisChainTimeline} from '@/components/tennis-chain/TennisChainTimeline';
import {NascarChainTimeline} from '@/components/nascar-chain/NascarChainTimeline';
const kind=new URLSearchParams(location.search).get('kind');
const spaced='Generated Firstname Another Middlename Long Familyname';
const unbroken='GeneratedFirstnameAnotherMiddlenameLongFamilyname';
const connection=(index,type)=>type==='unbroken'?'FixtureUnbrokenTournamentConnectionFromAnEarlierGeneratedMatch'+index:'Fixture tournament final connection from an earlier generated match '+index;
const fighter=(index,type)=>({name:type==='short'?'Fixture Player '+index:(type==='spaced'?spaced:unbroken)+' '+index,weightClass:'Light Heavyweight',record:'17-3-1',wins:17,losses:3,draws:1,isHallOfFamer:index===0});
const make=(count,type)=>Array.from({length:count},(_,index)=>kind==='combat'?{fighter:fighter(index,type),defeatedBy:index<count-1?fighter(index+1,type):undefined,bonusPoints:index===1?25:undefined}:kind==='tennis'?{playerName:fighter(index,type).name,slamConnection:index<count-1?connection(index,type):undefined}:{driverName:fighter(index,type).name,connection:index<count-1?connection(index,type):undefined});
function App(){const[state,setState]=useState({chain:[],status:'playing'});useEffect(()=>{window.__qa={draw:(count,type='short')=>setState({chain:make(count,type),status:'playing'}),clone:()=>setState(old=>({...old,chain:old.chain.map(link=>({...link}))})),end:()=>setState(old=>({...old,status:'ended'}))};},[]);return <main style={{padding:'24px 16px',maxWidth:896,margin:'auto'}}><h1 style={{fontSize:18,marginBottom:16}}>{kind} actual chain timeline fixture</h1>{kind==='combat'?<ChainTimeline chain={state.chain} gameStatus={state.status}/>:kind==='tennis'?<TennisChainTimeline chain={state.chain} gameStatus={state.status}/>:<NascarChainTimeline chain={state.chain} gameStatus={state.status}/>}</main>;}createRoot(document.getElementById('root')).render(<App/>);`);
  const js = path.join(folder, 'fixture.js');
  const css = path.join(folder, 'fixture.css');
  owned.push(js, css);
  await compile({ entryPoints: [fixture], outfile: js, bundle: true, format: 'esm', jsx: 'automatic', nodePaths: [path.join(root, 'node_modules')], alias, loader: { '.module.css': 'local-css' }, define: { 'process.env.NODE_ENV': '"production"' } });
  const mainCss = (await readdir(path.join(dist, 'assets'))).filter(name => /^index-.*\.css$/.test(name));
  assert.equal(mainCss.length, 1, 'A finished build must have one main Tailwind stylesheet');
  const tailwind = path.join(folder, 'tailwind.css');
  owned.push(tailwind);
  await copyFile(path.join(dist, 'assets', mainCss[0]), tailwind);
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
  for (const kind of ['combat', 'tennis', 'nascar']) for (const width of control ? [320] : [320, 390, 430, 1440]) for (const reduced of [false, true]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    try {
      await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${url}/?kind=${kind}`);
      await page.waitForFunction(() => !!window.__qa);
      if (control) {
        const spaced = await draw(page, 2, 'spaced');
        expectFit(spaced, `${kind}: pre-wrap spaced text`);
        const unbroken = await draw(page, 2, 'unbroken');
        assert.ok(unbroken.overflow >= 50, `${kind}: control must reproduce measured no-space overflow`);
        reports.push({ kind, width, reduced, spacedOverflow: spaced.overflow, unbrokenOverflow: unbroken.overflow });
      } else {
        let maxOverflow = 0;
        const empty = await page.evaluate(measure);
        assert.equal(empty.links.length, 0);
        assert.equal(empty.animations.length, 0);
        const seed = await draw(page, 1);
        assert.equal(seed.links[0].status, 'seed');
        assert.equal(seed.animations.length, 0);
        assert.ok(seed.text.includes('Chain Length: 0') && !seed.text.includes('Multiplier Active'));
        await page.evaluate(() => { window.__seed = document.querySelector('[data-chain-link]'); });
        const appended = await draw(page, 2);
        expectMotion(appended, reduced);
        assert.equal(appended.connections.length, 1);
        assert.equal(await page.evaluate(() => document.querySelector('[data-chain-link]') === window.__seed), true);
        await page.evaluate(() => {
          window.__links = [...document.querySelectorAll('[data-chain-link]')];
          window.__connection = document.querySelector('[data-chain-connection]');
          window.__animations = document.getAnimations().filter(animation => animation instanceof CSSAnimation);
          window.__qa.clone();
        });
        await page.waitForTimeout(40);
        assert.equal(await page.evaluate(() => {
          const current = document.getAnimations().filter(animation => animation instanceof CSSAnimation);
          return current.length === window.__animations.length && current.every(animation => window.__animations.includes(animation)) && window.__animations.every(animation => current.includes(animation));
        }), true, 'Cloning a running chain must retain the same effects without restarting or cancelling them');
        await page.waitForTimeout(500);
        assert.equal((await page.evaluate(measure)).animations.length, 0, 'Effects must finish');
        await page.evaluate(() => window.__qa.clone());
        await page.waitForTimeout(40);
        assert.equal((await page.evaluate(measure)).animations.length, 0, 'Cloning a settled chain must stay quiet');
        await page.evaluate(() => window.__qa.end());
        await page.waitForTimeout(40);
        const ended = await page.evaluate(measure);
        assert.equal(ended.links.at(-1).background, kind === 'combat' ? 'rgb(220, 38, 38)' : kind === 'tennis' ? 'rgb(126, 34, 206)' : 'rgb(185, 28, 28)');
        assert.equal(ended.animations.length, 0, 'Ending must not replay a committed link');
        const next = await draw(page, 3);
        expectMotion(next, reduced);
        assert.equal(await page.evaluate(() => [...document.querySelectorAll('[data-chain-link]')].slice(0, 2).every((link, index) => link === window.__links[index]) && document.querySelector('[data-chain-connection]') === window.__connection), true, 'Earlier links and connections must retain DOM identity');
        await page.waitForTimeout(500);
        assert.equal((await page.evaluate(measure)).animations.length, 0);
        for (const type of ['spaced', 'unbroken']) {
          const long = await draw(page, 3, type);
          assert.equal(long.animations.length, 0, 'Text updates must not replay effects');
          expectFit(long, `${kind}/${width}/${type}`);
          maxOverflow = Math.max(maxOverflow, long.overflow);
          const name = type === 'spaced' ? 'Generated Firstname Another Middlename Long Familyname' : 'GeneratedFirstnameAnotherMiddlenameLongFamilyname';
          long.links.forEach((link, index) => assert.ok(link.text.includes(`${name} ${index}`), 'Full original name must remain visible'));
          long.connections.forEach((link, index) => assert.equal(link.text, kind === 'combat' ? 'defeated by' : type === 'unbroken' ? `FixtureUnbrokenTournamentConnectionFromAnEarlierGeneratedMatch${index}` : `Fixture tournament final connection from an earlier generated match ${index}`));
          if (kind === 'combat') {
            assert.ok(long.text.includes('⭐') && long.text.includes('+25 bonus'));
            assert.equal(long.links.filter(link => link.text.includes('Light Heavyweight · 17-3-1')).length, 3);
          }
          if (artifacts && (width === 320 && reduced || kind === 'tennis' && width === 390 && !reduced)) await page.screenshot({ path: path.join(artifacts, `${kind}-${width}-${reduced ? 'reduced' : 'normal'}-${type}.png`) });
        }
        for (const [count, multiplier] of [[6, 1.5], [10, 1.5], [11, 2]]) {
          const length = await draw(page, count, 'unbroken');
          assert.equal(length.links.length, count);
          assert.equal(length.connections.length, count - 1);
          assert.ok(length.text.includes(`Chain Length: ${count - 1}`));
          assert.ok(length.text.includes(`x${multiplier} Multiplier Active!`));
          expectFit(length, `${kind}/${width}/length${count - 1}`);
          maxOverflow = Math.max(maxOverflow, length.overflow);
        }
        reports.push({ kind, width, reduced, newestLinkDuration: reduced ? 0 : 420, connectionDuration: reduced ? 0 : 360, noReplay: true, overflow: maxOverflow });
      }
      assert.deepEqual(errors, [], 'The actual fixture must mount without runtime errors');
    } finally { await context.close(); }
  }
  for (const { sourcePath, source } of originals) assert.equal(await readFile(sourcePath, 'utf8'), source, 'Control must leave production source unchanged');
  if (artifacts) await writeFile(path.join(artifacts, `${control || 'healthy'}-report.json`), JSON.stringify({ limit: 'Actual production Timelines in a compiled fixture with finished-build Tailwind CSS. Parent boards, validators and earned badges outside these timelines are not exercised.', reports }, null, 2));
  if (control) {
    assert.equal(reports.length, 6);
    console.log('playChainTimelineMotion control: three asserted pre-wrap copies mounted in normal and reduced motion.');
    console.log('Spaced fixture names and connections still fit, matching the original baseline.');
    console.log(`Unbroken cases reproduced page overflow: ${reports.filter(report => !report.reduced).map(report => `${report.kind} ${report.unbrokenOverflow}px`).join(', ')}.`);
    console.log('All six planted overflow cases were detected; production source stayed unchanged.');
  } else {
    console.log('playChainTimelineMotion: 24 actual timeline viewport/motion combinations passed.');
    console.log('Empty/seed states stayed quiet; newest link and committed connection effects finished without replay.');
    console.log('Earlier nodes, names, records, star, bonuses, ended colors, lengths and multiplier thresholds were preserved.');
    console.log('Spaced and unbroken names/connections fit at 320, 390, 430 and 1440px without clipping or overflow.');
  }
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  for (const file of owned) await rm(file, { force: true });
  await rmdir(folder);
}
