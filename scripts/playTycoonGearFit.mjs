/* Actual FirstTeamPanel and lazy BootRoom component fixture. This is a component
   preview, not an actual-page navigation test. TYCOON_GEAR_CSS names final built
   index CSS, or source-generated CSS with TYCOON_GEAR_CSS_KIND=preview explicitly.
   Controls: wide, move, upgrade, floor, cap, max.
   All generated bundles and mutations stay outside the source tree. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssPath = process.env.TYCOON_GEAR_CSS;
const cssKind = process.env.TYCOON_GEAR_CSS_KIND || 'built';
assert(['built', 'preview'].includes(cssKind), 'CSS kind must be built or preview');
assert(cssPath && fs.existsSync(cssPath), 'TYCOON_GEAR_CSS must name the production build CSS');
const css = fs.readFileSync(cssPath, 'utf8');
assert(css.includes('min-h-') && css.includes('bg-card'), 'production utility CSS is required');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-tycoon-gear-fit-'));
const roomPath = path.join(root, 'src/components/tycoon/BootRoom.tsx');
let room = fs.readFileSync(roomPath, 'utf8');
const control = process.env.TYCOON_GEAR_FIT_CONTROL || '';
const mutations = {
  wide: ['<section data-boot-room data-no-prerender', '<section style={{ width: 900 }} data-boot-room data-no-prerender'],
  move: ['onEquip(player.id, equipped ? null : selected.id)', 'onEquip(player.id, null)'],
  upgrade: ['onClick={() => onUpgrade(selected.id)}', 'onClick={() => { onUpgrade(selected.id); onUpgrade(selected.id); }}'],
  floor: ['player.rating + level <= 60 &&', 'player.rating + level < 60 &&'],
  cap: ['Math.min(99, player.rating + level)', 'Math.min(100, player.rating + level)'],
  max: ['disabled={level >= MAX_BOOT_LEVEL || upgrades < 1}', 'disabled={upgrades < 1}'],
};
assert(!control || mutations[control], 'Unknown gear fit control');
if (control) {
  const [before, after] = mutations[control];
  assert.equal(room.split(before).length - 1, 1, 'Unique executed control anchor');
  room = room.replace(before, after);
  assert.notEqual(room, fs.readFileSync(roomPath, 'utf8'));
  console.log('CONTROL MUTATION APPLIED: ' + control);
}
const entry = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import FirstTeamPanel from '@/components/tycoon/FirstTeamPanel';
import { newFactory, makeProspectInBand, promote, equipBoot, salePrice, squadEdge, serialize, SAVE_KEY } from '@/lib/wonderkidFactory';
import { newLedger, creditFullTimes, REWARDS_KEY, loadLedger, commitUpgradeBoot } from '@/lib/tycoonRewards';
import { BOOTS } from '@/lib/soccerCareerAppearance';
let seed = 588;
const rng = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
const initial = newFactory(1700000000000, 588);
initial.prospects = [];
const candidates = Array.from({ length: 1500 }, () => makeProspectInBand(initial, 85, 95, rng));
const names = new Set();
for (const kid of candidates.sort((a, b) => b.name.length - a.name.length)) {
  if (names.has(kid.name)) continue;
  names.add(kid.name); kid.age = 18; initial.prospects.push(kid);
  if (!promote(initial, kid.id)) throw new Error('Real promotion failed');
  if (initial.firstTeam.length === 5) break;
}
const ledger = creditFullTimes(newLedger(588), Array.from({ length: 26 }, (_, i) => ({ totalMatches: (i + 1) * 10, result: 'win', away: false, position: 1, division: Math.min(i, 9) })));
if (!equipBoot(initial, initial.firstTeam[0].id, BOOTS[0].id, ledger.gearLevel)) throw new Error('Real initial equipment failed');
localStorage.setItem(REWARDS_KEY, JSON.stringify(ledger));
localStorage.setItem(SAVE_KEY, serialize(initial));
let failWrites = false;
const originalSet = Storage.prototype.setItem;
Storage.prototype.setItem = function(key, value) {
  if (failWrites && (key === SAVE_KEY || key === REWARDS_KEY)) throw new DOMException('Fixture storage full', 'QuotaExceededError');
  return originalSet.call(this, key, value);
};
function Fixture() {
  const [state, setState] = useState(initial), [version, bump] = useState(0), [blocked, setBlocked] = useState(false), [back, setBack] = useState(false);
  const currentLedger = loadLedger();
  window.gearRig = {
    failWrites(value) { failWrites = value; },
    boundary(id, rating, level) {
      const next = structuredClone(state);
      for (const player of next.firstTeam) { player.rating = player.id === id ? rating : 40; player.potential = 99; delete player.bootId; }
      const nextLedger = { ...loadLedger(), gearLevel: { ...loadLedger().gearLevel, [BOOTS[0].id]: level }, kitUpgrades: 8 };
      if (!equipBoot(next, id, BOOTS[0].id, nextLedger.gearLevel)) throw new Error('Legal boundary equipment failed');
      localStorage.setItem(REWARDS_KEY, JSON.stringify(nextLedger));
      localStorage.setItem(SAVE_KEY, serialize(next));
      setState(next); setBlocked(false); bump(n => n + 1);
    },
    snapshot() { return { state, ledger: currentLedger, edge: squadEdge(state, currentLedger.gearLevel), fees: state.firstTeam.map(p => salePrice(state, p)), factorySave: localStorage.getItem(SAVE_KEY), ledgerSave: localStorage.getItem(REWARDS_KEY), back, version, boots: BOOTS }; }
  };
  function equip(id, bootId) {
    const next = structuredClone(state);
    if (!equipBoot(next, id, bootId, loadLedger().gearLevel)) return;
    try { localStorage.setItem(SAVE_KEY, serialize(next)); setState(next); setBlocked(false); } catch { setBlocked(true); }
  }
  function upgrade(id) {
    try { if (commitUpgradeBoot(id)) { setBlocked(false); bump(n => n + 1); } } catch { setBlocked(true); }
  }
  return <MemoryRouter initialEntries={['/stadium-tycoon']}><main className="mx-auto w-full max-w-2xl px-3 py-4">
    <p className="mb-3 text-xs text-muted-foreground">Component preview: production First Team, Boot room, engine actions and ${cssKind === 'built' ? 'production built' : 'source-generated preview'} CSS. Generated players.</p>
    {back ? <p data-fixture-back>Academy hub callback reached</p> : <FirstTeamPanel state={state} ledger={currentLedger} onSell={() => { throw new Error('Unexpected sale'); }} onEquip={equip} onUpgrade={upgrade} onBack={() => setBack(true)} gearSaveBlocked={blocked} />}
  </main></MemoryRouter>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
`;
const bundle = await build({ stdin: { contents: entry, loader: 'tsx', resolveDir: root }, bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent', plugins: [{ name: 'boot-room-control', setup(builder) { builder.onLoad({ filter: /BootRoom\.tsx$/ }, () => ({ contents: room, loader: 'tsx', resolveDir: path.dirname(roomPath) })); } }] });
const js = bundle.outputFiles[0].text;
const html = '<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/built.css"></head><body class="bg-background text-foreground"><div id="root"></div><script src="/fixture.js"></script></body></html>';
for (const [name, contents] of [['index.html', html], ['fixture.js', js], ['built.css', css]]) fs.writeFileSync(path.join(output, name), contents);
const report = { label: 'Actual component preview with ' + cssKind + ' CSS, not full page integration', cssPath: path.resolve(cssPath), cssSha256: createHash('sha256').update(css).digest('hex'), control, cases: [] };
const assets = new Map([['/', [html, 'text/html']], ['/fixture.js', [js, 'text/javascript']], ['/built.css', [css, 'text/css']]]);
const server = http.createServer((req, res) => { const asset = assets.get(new URL(req.url, 'http://localhost').pathname); res.writeHead(asset ? 200 : 404, { 'Content-Type': asset?.[1] || 'text/plain' }); res.end(asset?.[0] || 'Missing'); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ timeout: 15000 });
const deadline = setTimeout(() => { process.exitCode = 1; void browser.close(); server.close(); }, 120000);
async function geometry(page, label) {
  const result = await page.evaluate(() => {
    const scope = document.querySelector('[data-first-team-panel]');
    const buttons = [...scope.querySelectorAll('button, summary')].filter(n => !n.disabled && n.getBoundingClientRect().height > 0).map(n => { const r = n.getBoundingClientRect(); return { text: n.textContent, width: r.width, height: r.height }; });
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, panelHeight: scope.getBoundingClientRect().height, buttons };
  });
  assert(result.scrollWidth <= result.width, label + ': no horizontal overflow');
  for (const button of result.buttons) assert(button.height >= 43.5 && button.width >= 43.5, label + ': 44px reachable target: ' + JSON.stringify(button));
  return result;
}
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block', ...(width === 390 && !control ? { recordVideo: { dir: output, size: { width, height: 900 } } } : {}) });
    const base = 'http://127.0.0.1:' + server.address().port;
    await context.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) && new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(10000);
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base, { waitUntil: 'load', timeout: 15000 });
    await page.locator('[data-first-team-panel]').waitFor();
    const initial = await page.evaluate(() => window.gearRig.snapshot());
    assert.equal(initial.state.firstTeam.length, 5);
    assert.equal(initial.ledger.gearUnlocked.length, 18);
    assert(new Set(initial.state.firstTeam.map(p => p.name)).size === 5);
    const stages = [await geometry(page, 'First team')];
    await page.getByRole('button', { name: /Boot room/ }).click();
    await page.locator('[data-boot-room]').waitFor();
    stages.push(await geometry(page, 'Boot room'));
    await page.locator('summary').filter({ hasText: 'Boot rules' }).click();
    assert(await page.getByText(/A title in a new division earns the next pair/).isVisible(), 'Full title rules are reachable');
    stages.push(await geometry(page, 'Expanded rules'));
    await page.locator('summary').filter({ hasText: 'Boot rules' }).click();
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      const chosen = page.locator('[aria-label="Earned boot pairs"] button[aria-pressed="true"]');
      assert.equal(await chosen.count(), 1, 'Selected pair remains on current collection page');
      await chosen.scrollIntoViewIfNeeded();
      assert(await chosen.isVisible());
      assert((await page.locator('[data-boot-detail] h3').innerText()) === (await chosen.innerText()).split('\n')[0]);
      stages.push(await geometry(page, 'Collection page ' + (i + 2)));
    }
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    const second = initial.state.firstTeam[1];
    await page.getByRole('button', { name: 'Change player', exact: true }).click();
    await page.locator('[data-senior-card]').waitFor();
    await page.locator('[aria-label="First team players"] button').filter({ hasText: second.name }).click();
    await page.getByRole('button', { name: /Boot room/ }).click();
    await page.locator('[data-boot-room]').waitFor();
    await page.getByRole('button', { name: 'Move pair to ' + second.name, exact: true }).click();
    const moved = await page.evaluate(() => window.gearRig.snapshot());
    const bootId = initial.boots[0].id;
    assert.equal(moved.state.firstTeam.filter(p => p.bootId === bootId).length, 1, 'One pair has exactly one wearer');
    assert.equal(moved.state.firstTeam[1].bootId, bootId, 'UI moves the selected pair to selected wearer');
    assert(!moved.state.firstTeam[0].bootId, 'Previous wearer gives up pair');
    assert.deepEqual(moved.fees, initial.fees, 'Equip leaves fees unchanged');
    assert.notEqual(moved.factorySave, initial.factorySave, 'Equipment change persisted');
    await page.getByRole('button', { name: 'Use 1 kit upgrade: level 2', exact: true }).click();
    const upgraded = await page.evaluate(() => window.gearRig.snapshot());
    assert.equal(upgraded.ledger.gearLevel[bootId], 2, 'One click raises level exactly one');
    assert.equal(upgraded.ledger.kitUpgrades, initial.ledger.kitUpgrades - 1, 'One click uses exactly one kit');
    assert.deepEqual(upgraded.fees, initial.fees, 'Upgrade leaves all fees unchanged');
    assert.equal(upgraded.factorySave, moved.factorySave, 'Upgrade preserves wearer save');
    assert.notEqual(upgraded.ledgerSave, moved.ledgerSave, 'Upgrade persisted');
    const successGeometry = await geometry(page, 'Clean upgraded room');
    stages.push(successGeometry);
    await page.locator('[data-boot-room]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'boot-room-success-' + width + '.png'), fullPage: true });
    await page.evaluate(() => window.gearRig.failWrites(true));
    await page.getByRole('button', { name: 'Use 1 kit upgrade: level 3', exact: true }).click();
    await page.getByRole('alert').waitFor();
    const failed = await page.evaluate(() => window.gearRig.snapshot());
    assert.equal(failed.ledgerSave, upgraded.ledgerSave, 'Rejected ledger save stays unchanged');
    assert.deepEqual(failed.ledger, upgraded.ledger, 'Rejected upgrade never reaches presentation');
    stages.push(await geometry(page, 'Save failure'));
    await page.locator('[data-boot-detail]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'boot-room-' + width + '.png'), fullPage: true });
    await page.evaluate(id => { window.gearRig.failWrites(false); window.gearRig.boundary(id, 59, 1); }, second.id);
    const detail = page.locator('[data-boot-detail]');
    await detail.getByText(/59 rated, 60 with this pair/).waitFor();
    assert(await detail.getByText('His match rating needs to exceed 60 before it helps defend.', { exact: true }).isVisible(), 'Rating60 shows the no-defense threshold explanation');
    const floor = await page.evaluate(() => window.gearRig.snapshot());
    assert.equal(floor.edge, 0, 'Rating59 plus level1 produces no defensive edge');
    await page.getByRole('button', { name: 'Use 1 kit upgrade: level 2', exact: true }).click();
    await detail.getByText(/59 rated, 61 with this pair/).waitFor();
    assert.equal(await detail.getByText('His match rating needs to exceed 60 before it helps defend.', { exact: true }).count(), 0, 'Rating61 removes neutral explanation');
    const edge = await page.evaluate(() => window.gearRig.snapshot());
    assert.equal(edge.edge, .002, 'Rating59 plus level2 gives engine defensive edge .002');
    assert.equal(edge.ledger.kitUpgrades, floor.ledger.kitUpgrades - 1);
    await page.getByRole('button', { name: 'Use 1 kit upgrade: level 3', exact: true }).click();
    await detail.getByText(/Level 3 \/ 3/).waitFor();
    assert(await page.getByRole('button', { name: 'Fully upgraded', exact: true }).isDisabled(), 'Maximum level3 disables another upgrade');
    const max = await page.evaluate(() => window.gearRig.snapshot());
    assert.equal(max.ledger.gearLevel[bootId], 3, 'Successful final upgrade reaches level3');
    assert.equal(max.ledger.kitUpgrades, edge.ledger.kitUpgrades - 1, 'Final upgrade consumes exactly one kit');
    assert.deepEqual(max.fees, floor.fees, 'Both boundary upgrades leave fees unchanged');
    await page.evaluate(id => window.gearRig.boundary(id, 98, 3), second.id);
    await detail.getByText(/98 rated,/).waitFor();
    assert(await detail.getByText(/98 rated, 99 with this pair/).isVisible(), 'Displayed match rating is capped at99');
    const cap = await page.evaluate(() => window.gearRig.snapshot());
    assert.equal(cap.edge, .078, 'Capped rating99 has engine defensive edge .078');
    assert(await page.getByRole('button', { name: 'Fully upgraded', exact: true }).isDisabled());
    await page.getByRole('button', { name: 'Hub', exact: true }).click();
    await page.locator('[data-senior-card]').waitFor();
    await page.getByRole('button', { name: 'Hub', exact: true }).click();
    await page.locator('[data-fixture-back]').waitFor();
    assert.deepEqual(errors, []);
    report.cases.push({ width, names: initial.state.firstTeam.map(p => p.name), pair: bootId, stages, move: true, upgrade: true, feeUnchanged: true, saveFailure: true, back: true, boundaries: { floor: floor.edge, aboveFloor: edge.edge, capped: cap.edge, finalLevel: max.ledger.gearLevel[bootId], exactKitCost: true } });
    const video = page.video();
    await context.close();
    if (video) await video.saveAs(path.join(output, 'boot-room-390.webm'));
  }
  if (!control) {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block', recordVideo: { dir: output, size: { width: 390, height: 900 } } });
    const base = 'http://127.0.0.1:' + server.address().port;
    await context.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) && new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.goto(base, { waitUntil: 'load', timeout: 15000 });
    await page.getByRole('button', { name: /Boot room/ }).click();
    await page.locator('[data-boot-room]').waitFor();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Change player', exact: true }).click();
    await page.locator('[aria-label="First team players"] button').nth(1).click();
    await page.getByRole('button', { name: /Boot room/ }).click();
    await page.getByRole('button', { name: /^Move pair to/ }).click();
    await page.getByRole('button', { name: 'Use 1 kit upgrade: level 2', exact: true }).click();
    await page.waitForTimeout(1000);
    await page.locator('[data-boot-room]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const video = page.video();
    await context.close();
    await video.saveAs(path.join(output, 'boot-room-success-390.webm'));
  }
  fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(report, null, 2));
  console.log('PASS gear fit: 3 widths, full collection, real equipment and persisted upgrade, save failure and Back. ' + output);
} finally {
  clearTimeout(deadline);
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
