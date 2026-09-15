/**
 * Round 586 browser QA for the actual FirstTeamPanel and real academy actions.
 * FIRST_TEAM_CSS may point to generated preview CSS before a full build. Without
 * it, this reads dist/assets. Preview CSS is labelled and is not release proof.
 * FIRST_TEAM_CONTROL=nowrap mutates exactly one tile-name class in a temporary
 * component copy. The live component must fit; the control must expose clipping.
 * All browser requests are blocked. No server, account, save or real game is used.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PANEL = path.join(ROOT, 'src/components/tycoon/FirstTeamPanel.tsx');
const CONTROL = process.env.FIRST_TEAM_CONTROL || '';
assert(['', 'nowrap'].includes(CONTROL), 'unknown FIRST_TEAM_CONTROL');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-first-team-fit-'));
let source = fs.readFileSync(PANEL, 'utf8');
if (CONTROL) {
  const before = 'block break-words text-xs font-bold leading-tight';
  assert.equal(source.split(before).length - 1, 1, 'control must target one actual tile-name class');
  const changed = source.replace(before, 'block truncate text-xs font-bold leading-tight');
  assert.notEqual(changed, source, 'control must change executable component code');
  source = changed;
  console.log('CONTROL nowrap: actual tile-name wrapping replaced by truncation in the temporary bundle');
}

const cssFiles = process.env.FIRST_TEAM_CSS ? [path.resolve(process.env.FIRST_TEAM_CSS)]
  : fs.readdirSync(path.join(ROOT, 'dist/assets')).filter(name => name.endsWith('.css')).sort().map(name => path.join(ROOT, 'dist/assets', name));
assert(cssFiles.length > 0, 'No generated stylesheet. Nothing was checked.');
const css = cssFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
console.log(`CSS: ${process.env.FIRST_TEAM_CSS ? 'PRE-BUILD PREVIEW' : 'built dist/assets'} (${cssFiles.length} file(s))`);
const outfile = path.join(TEMP, 'fixture.js');
await build({
  stdin: { resolveDir: ROOT, loader: 'tsx', contents: `
    import React, { useRef, useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter } from 'react-router-dom';
    import FirstTeamPanel from './src/components/tycoon/FirstTeamPanel';
    import * as W from './src/lib/wonderkidFactory';
    import { intlName, NATION_FAMILY } from './src/lib/intlNames';
    let seed = 586;
    const roll = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), seed | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const names = new Map();
    for (const nation of Object.keys(NATION_FAMILY)) for (let i = 0; i < 300; i++) {
      const name = intlName(nation, i);
      if (!names.has(name)) names.set(name, nation);
    }
    const longest = [...names.entries()].sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0])).slice(0, W.FIRST_TEAM_SLOTS);
    const initial = W.newFactory(1767225600000, 586);
    initial.levels.scouting = 6;
    for (let i = 0; i < longest.length; i++) {
      const kid = W.makeProspectInBand(initial, 85, 99, roll);
      Object.assign(kid, { name: longest[i][0], nation: longest[i][1], age: 18, rating: 65 + i * 5, ageClock: 0 });
      initial.prospects.push(kid);
      if (!W.promote(initial, kid.id)) throw new Error('fixture could not promote a real generated prospect');
      Object.assign(initial.firstTeam[i], { age: 27 + i, ageClock: 300 + i * 90 });
    }
    function Fixture() {
      const [state, setState] = useState(initial);
      const [back, setBack] = useState(false);
      const current = useRef(state); current.current = state;
      const calls = useRef([]);
      window.__FIRST_TEAM_QA__ = {
        snapshot: () => JSON.parse(W.serialize(current.current)),
        calls: () => [...calls.current],
        quote: id => W.salePrice(current.current, current.current.firstTeam.find(p => p.id === id)),
        initialNames: longest.map(pair => pair[0]),
      };
      return back ? <p data-back="true">Back at the academy</p> : <FirstTeamPanel state={state} onBack={() => { calls.current.push('back'); setBack(true); }} onSell={id => {
        const next = { ...current.current, firstTeam: current.current.firstTeam.map(p => ({ ...p })) };
        const fee = W.sellSenior(next, id);
        if (fee === null) throw new Error('selected senior did not sell');
        calls.current.push({ id, fee });
        current.current = next; setState(next);
      }} />;
    }
    createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/stadium-tycoon']}><Fixture /></MemoryRouter>);
  ` },
  bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic', outfile,
  define: { 'process.env.NODE_ENV': '"production"' }, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
  plugins: [{ name: 'actual-first-team-panel', setup(b) {
    b.onLoad({ filter: /FirstTeamPanel\.tsx$/ }, () => ({ contents: source, loader: 'tsx', resolveDir: path.dirname(PANEL) }));
  } }],
});

const browser = await chromium.launch();
const cases = [];
try {
  for (const width of [320, 390, 1440]) for (const motion of ['no-preference', 'reduce']) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: motion });
    const errors = [];
    const blocked = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => { blocked.push(route.request().url()); return route.abort(); });
    await page.setContent(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><style>${css}</style></head><body class="dark"><main id="root" class="max-w-2xl mx-auto px-4 py-4"></main></body></html>`);
    await page.addScriptTag({ path: outfile });
    await page.locator('[data-first-team-panel]').waitFor();
    const names = await page.evaluate(() => window.__FIRST_TEAM_QA__.initialNames);
    assert.equal(names.length, 5, 'all five first team places must be tested');
    assert(names.every(name => name.length >= 24), 'generated long-name fixture was not long enough to stress wrapping');
    const findings = [];
    const inspect = async stage => {
      const result = await page.evaluate(() => {
        const bad = [];
        const root = document.documentElement;
        if (root.scrollWidth > root.clientWidth + 1) bad.push({ kind: 'overflow', detail: `page exceeds viewport by ${root.scrollWidth - root.clientWidth}px` });
        const checkText = (element, name) => {
          const box = element.getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(element);
          if (element.textContent !== name) bad.push({ kind: 'name', detail: `name changed: ${name}` });
          if (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1
            || [...range.getClientRects()].some(rect => rect.left < box.left - 1 || rect.right > box.right + 1)) bad.push({ kind: 'name', detail: `clipped name: ${name}` });
        };
        for (const button of document.querySelectorAll('[aria-label="First team players"] button')) {
          const name = button.querySelector('span:last-child');
          checkText(name, name.textContent);
          const box = button.getBoundingClientRect();
          if (box.height < 44 || box.width < 44) bad.push({ kind: 'target', detail: 'a player selector is smaller than44px' });
        }
        const selected = document.querySelector('[data-senior-card] h3');
        if (selected) checkText(selected, selected.textContent);
        const sell = document.querySelector('[data-senior-card] button');
        if (sell) {
          const box = sell.getBoundingClientRect();
          if (box.height < 44 || box.width < 44) bad.push({ kind: 'target', detail: 'sell control is smaller than44px' });
          if (sell.scrollWidth > sell.clientWidth + 1) bad.push({ kind: 'overflow', detail: 'sell text overflows its control' });
        }
        const running = document.getAnimations().filter(animation => animation.playState === 'running' && animation.effect?.getTiming().duration !== 0);
        if (matchMedia('(prefers-reduced-motion: reduce)').matches && running.length) bad.push({ kind: 'motion', detail: `${running.length} animations are running under reduced motion` });
        return bad;
      });
      findings.push(...result.map(finding => ({ ...finding, stage })));
    };
    await inspect('initial');
    await page.screenshot({ path: path.join(TEMP, `first-team-${width}-${motion}.png`), fullPage: true });
    for (const name of [...names].reverse()) {
      const select = page.locator('[aria-label="First team players"] button').filter({ hasText: name });
      await select.focus();
      await select.press('Enter');
      assert.equal(await page.locator('[data-senior-card] h3').textContent(), name, 'keyboard selection must show the chosen full name');
      assert.equal(await select.getAttribute('aria-pressed'), 'true');
      await inspect(`selected ${name}`);
    }
    const before = await page.evaluate(() => window.__FIRST_TEAM_QA__.snapshot());
    const quote = await page.evaluate(() => window.__FIRST_TEAM_QA__.quote(window.__FIRST_TEAM_QA__.snapshot().firstTeam[0].id));
    await page.locator('[data-senior-card] button').click();
    await page.waitForFunction(() => window.__FIRST_TEAM_QA__.snapshot().firstTeam.length === 4);
    const after = await page.evaluate(() => window.__FIRST_TEAM_QA__.snapshot());
    assert.equal(after.cash, before.cash + quote, 'actual senior sale must pay the quote');
    assert.equal(after.careerEarned, before.careerEarned + quote, 'sale updates career earnings');
    assert(!after.firstTeam.some(p => p.id === before.firstTeam[0].id), 'the selected player must leave, not a different one');
    await inspect('after sale');
    for (let left = 4; left > 0; left -= 1) {
      await page.locator('[data-senior-card] button').click();
      await page.waitForFunction(n => window.__FIRST_TEAM_QA__.snapshot().firstTeam.length === n, left - 1);
    }
    assert.equal(await page.locator('[aria-label="First team players"] button').count(), 0);
    assert.equal(await page.locator('[data-senior-card]').count(), 0);
    await inspect('empty');
    await page.getByRole('button', { name: 'Hub', exact: true }).click();
    await page.locator('[data-back="true"]').waitFor();
    const calls = await page.evaluate(() => window.__FIRST_TEAM_QA__.calls());
    assert.equal(calls.filter(call => typeof call === 'object').length, 5, 'every sold player calls the real sale action once');
    assert.equal(calls.at(-1), 'back', 'Hub returns through the actual callback');
    assert.deepEqual(errors, [], 'browser must have no runtime errors');
    cases.push({ width, motion, names, findings, blockedRequests: blocked.length, sales: 5, selections: 5 });
    console.log(`${width}px ${motion}: five full names selected, five actual sales, Hub works, ${findings.length} layout/motion findings, ${blocked.length} network requests blocked`);
    findings.slice(0, 5).forEach(finding => console.error(`  FAIL ${finding.kind}: ${finding.detail}`));
    await page.close();
  }
} finally {
  await browser.close();
}

assert.equal(cases.length, 6, 'all three widths and both motion preferences must run');
fs.writeFileSync(path.join(TEMP, 'report.json'), JSON.stringify({ control: CONTROL || null, css: cssFiles, prebuild: Boolean(process.env.FIRST_TEAM_CSS), cases }, null, 2));
const findings = cases.flatMap(item => item.findings);
console.log(`Evidence: ${TEMP}`);
if (CONTROL) {
  assert(cases.some(item => item.width === 320 && item.findings.some(finding => finding.kind === 'name')), 'nowrap control must cause measured name clipping at320px');
  assert(findings.every(finding => finding.kind === 'name'), 'nowrap must not conceal an unrelated layout or motion failure');
}
if (findings.length) {
  console.error(`playFirstTeamFit: ${findings.length} findings${CONTROL ? ' from intentional nowrap control' : ''}`);
  process.exitCode = 1;
} else console.log('playFirstTeamFit: green, six actual-component cases, thirty selections and thirty sales.');
