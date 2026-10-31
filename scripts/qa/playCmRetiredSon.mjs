import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
import { inventory, loadFonts, shellFixture, checkFonts } from './siteMenuNavigationSupport.mjs';

const ROOT = fs.realpathSync(process.cwd());
assert.equal(ROOT, fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')), 'CM_FAMILY_CANONICAL_EXECUTION');
assert.equal(process.env.CI, '1', 'CM_FAMILY_REMOTE_CI_ONLY');
assert.equal(process.env.SIM_OFFLINE, '1', 'CM_FAMILY_OFFLINE_REQUIRED');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'CM_FAMILY_NODE_TRANSPORT_REQUIRED');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex');
function outsideFresh(raw) {
  assert(raw && path.isAbsolute(raw), 'CM_FAMILY_OUT_ABSOLUTE_REQUIRED');
  const value = path.resolve(raw);
  let parent = path.dirname(value), missing = [];
  while (!fs.existsSync(parent)) { missing.unshift(path.basename(parent)); parent = path.dirname(parent); }
  const resolved = path.join(fs.realpathSync(parent), ...missing, path.basename(value));
  assert(resolved !== ROOT && !resolved.startsWith(ROOT + path.sep), 'CM_FAMILY_OUT_OUTSIDE_CHECKOUT');
  assert(!fs.existsSync(value), 'CM_FAMILY_OUT_MUST_BE_FRESH');
  fs.mkdirSync(value, { recursive: true });
  assert.equal(fs.realpathSync(value), resolved, 'CM_FAMILY_OUT_CANONICAL');
  return resolved;
}
const OUT = outsideFresh(process.env.CM_FAMILY_BROWSER_OUT);
const DIST = fs.realpathSync(path.resolve(process.env.CM_FAMILY_DIST || path.join(ROOT, 'dist')));
const FAULT = process.env.CM_FAMILY_BINDING_FAULT || '';
assert(['', '1'].includes(FAULT), 'CM_FAMILY_ONLY_OWNED_BINDING_FAULT');
const SMOKE = process.env.CM_FAMILY_RESTORED_BINDING_SMOKE || '';
assert(['', '1'].includes(SMOKE) && !(FAULT && SMOKE), 'CM_FAMILY_ONE_DECLARED_BINDING_MODE');
const SINGLE = !!(FAULT || SMOKE);
const PRODUCT = process.env.EXPECTED_FAMILY_PRODUCT_HEAD;
assert.match(PRODUCT || '', /^[a-f0-9]{40}$/, 'CM_FAMILY_PRODUCT_BINDING_REQUIRED');
assert.match(process.env.GITHUB_SHA || '', /^[a-f0-9]{40}$/, 'CM_FAMILY_PROOF_BINDING_REQUIRED');
const KEY = 'dukb-club-manager-save';
const PINS = {
  "src/hooks/useClubManager.ts": "7297073ea60b93501df48ea9b7dfc74edd2217de",
  "src/lib/clubManagerEras.ts": "fa604790c580845ed9b91aef407e205383b4012b",
  "src/lib/keyedRng.ts": "acfd3a0a410e03ac0950953aa05b82e4c46e004f",
  "src/lib/saveFence.ts": "1de45b573fd866433eb0982495af927a5427e8f4",
  "src/lib/clubManagerSlots.ts": "cd1a683637ce1fa0444b86b1cff46821aa75127d",
  "src/lib/clubManagerLanding.ts": "3815b9066c60d9440f02ad3094749694ef333323",
  "src/data/clubManagerRosters.ts": "01a6be13a8bc7f4594f8a5810a19a4c959001dbf",
  "src/data/clubManagerWorldRosters.ts": "dd40be6c6a2060eadc7b546a74b91b0d6f66f3ec",
  "src/data/players.ts": "e3435eaae958a2853ae24de9d7eca29f5cfcf0da",
  "src/components/game/HowToPlayPopover.tsx": "527f3c07171db29772d81c6887df5b238eb6e4c4",
  "src/components/FlagImg.tsx": "f415a12892f747ecf07414e61710584ca98be6a8",
  "src/App.tsx": "79da1b8cf2de7870ea216703d0a1a56fceb69673",
  "scripts/lib/hostLikeServer.mjs": "21059d5e8114669df61106c125d5272d357b6236",
  "scripts/lib/playwrightLoader.mjs": "4f7739e217e0a47ee82e6bfc8be1c04bed17454a",
  "scripts/lib/offlineTransport.cjs": "0fda542a2649fe5da937c6976fd0f5b6073e74b6",
  "scripts/qa/siteMenuNavigationSupport.mjs": "7909ce5805171367646e17a468fd919b88ad710e"
};
const FIXED = {
  'src/lib/clubManager.ts': 'b432f04512a3b8bc25d2342e62c7eb60946d429e6357a2c8b2fa7d602246ff8e',
  'src/lib/clubManagerRetiredSonActions.ts': 'a82d0ac40affedc8b009994d75d80e7a90687dab002efb3da89fe67512862485',
  'src/components/club-manager/AcademyScreen.tsx': '3f335efe59d2477aed11b07084e68b76b3c2286531245b70fdf02cf4ba158cab',
  'src/pages/ClubManager.tsx': FAULT ? '9abae3f67be8c502cee39bbde27a558a0a079bb734678fa803740e818c7c4a59' : '6db80040a4b04d2487c64dbadca5d295f9d7500e4060c5beba8371380d0f8950',
  'src/components/club-manager/ClubManagerHelp.tsx': '165dad4793972ff58fa95f7b7c14e556ed7b695997b2bdae5caf1672323b1c6c',
  'src/test/clubManagerRetiredSon.test.ts': '4c28f5e6eee81217be0fabafe42585222e499df1f7428057c9c395129d5c77fa',
};
const report = {
  status: 'STARTED', scope: FAULT ? 'One physical Page-binding fault context, no healthy browser credit' : SMOKE ? 'One restored Page-binding healthy smoke context, no full matrix credit' : 'Twelve real ClubManager route contexts on three Chromium viewports',
  product: PRODUCT, proof: process.env.GITHUB_SHA, bindingFault: !!FAULT, restoredBindingSmoke: !!SMOKE, cases: [], controls: [], screenshots: [],
  setupErrors: [], sourceBefore: null, sourceAfter: null, forwardedExternal: 0,
  limits: ['Prepared generated-retirement save, not a naturally played42-year-old career.',
    'Only existing budget is copied for funds and exact-cent boundary fixtures. No family block is fabricated.',
    'Known flag requests use explicitly inert cosmetic SVGs, with no flag artwork qualification.',
    'No browser clock/RNG, React, geometry, HTML or source aliases are replaced.',
    'No cross-browser, physical-device, full-default, all-CM, live-publishing or balance qualification.'],
};
const json = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n');
const flush = () => json('report.json', report);
const descriptor = file => { const bytes = fs.readFileSync(file); return { file: path.relative(OUT, file), bytes: bytes.length, sha256: sha(bytes) }; };
flush();
class DriverLimitation extends Error { constructor(message) { super(message); this.name = 'DriverLimitation'; } }
const need = (condition, message) => { if (!condition) throw new DriverLimitation(message); };
function sourceHolds() {
  const result = {};
  for (const [file, pin] of Object.entries(PINS)) {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    assert.equal(gitBlob(bytes), pin, 'CM_FAMILY_SOURCE_GIT:' + file);
    result[file] = sha(bytes);
  }
  for (const [file, pin] of Object.entries(FIXED)) {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    assert.equal(sha(bytes), pin, 'CM_FAMILY_FIXED_SOURCE:' + file);
    result[file] = pin;
  }
  result['scripts/qa/playCmRetiredSon.mjs'] = sha(fs.readFileSync(fileURLToPath(import.meta.url)));
  return result;
}
let gitIndex = 0;
function git(args) {
  const number = ++gitIndex, output = path.join(OUT, 'git-' + number + '.stdout'), error = path.join(OUT, 'git-' + number + '.stderr');
  const out = fs.openSync(output, 'wx'), err = fs.openSync(error, 'wx');
  let result;
  try { result = spawnSync('git', args, { cwd: ROOT, stdio: ['ignore', out, err], windowsHide: true }); }
  finally { fs.closeSync(out); fs.closeSync(err); }
  json('git-' + number + '.process.json', { args, status: result.status, signal: result.signal, error: result.error ? { name: result.error.name, code: result.error.code, message: result.error.message } : null });
  assert.equal(result.status, 0, 'CM_FAMILY_GIT_READ_STATUS');
  assert.equal(result.signal, null, 'CM_FAMILY_GIT_READ_SIGNAL');
  assert.equal(result.error, undefined, 'CM_FAMILY_GIT_READ_ERROR');
  assert.equal(fs.readFileSync(error, 'utf8'), '', 'CM_FAMILY_GIT_READ_STDERR');
  return fs.readFileSync(output, 'utf8').trim();
}
const copy = value => JSON.parse(JSON.stringify(value));
let browser, server, serverLog = '', serverError = '';
try {
  report.sourceBefore = sourceHolds();
  assert.equal(git(['rev-parse', 'HEAD']), process.env.GITHUB_SHA, 'CM_FAMILY_ACTUAL_HEAD');
  const parents = git(['rev-list', '--parents', '-n', '1', 'HEAD']).split(/\s+/);
  assert.equal(parents.length, 2, 'CM_FAMILY_SOLE_PRODUCT_PARENT');
  assert.equal(parents[1], PRODUCT, 'CM_FAMILY_ACTUAL_PRODUCT_PARENT');
  const refsBefore = git(['for-each-ref', '--format=%(refname) %(objectname)']);
  const statusBefore = git(['status', '--porcelain=v1', '--untracked-files=all']);
  assert.equal(statusBefore, FAULT ? 'M src/pages/ClubManager.tsx' : '', 'CM_FAMILY_DECLARED_WORKING_SOURCE');
  const distBefore = inventory(DIST);
  json('dist-before.json', distBefore);
  const distFiles = new Set(distBefore.map(row => '/' + row.file));
  const servedFile = path.join(DIST, 'club-manager/index.html');
  assert(fs.existsSync(servedFile), 'CM_FAMILY_REAL_SAVED_ROUTE_REQUIRED');
  const servedSha = sha(fs.readFileSync(servedFile));
  const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE || '', process.env.CM_FAMILY_FONT_MANIFEST_SHA);
  const work = path.join(OUT, 'fixture-build');
  fs.mkdirSync(work);
  const entry = path.join(work, 'entry.ts'), bundle = path.join(work, 'engine.cjs');
  fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\nexport * as familyActions from '@/lib/clubManagerRetiredSonActions';\nexport { keyedRng } from '@/lib/keyedRng';\nexport { FLAG_CODES } from '@/components/FlagImg';\n");
  const built = await build({ entryPoints: [entry], outfile: bundle, bundle: true, platform: 'node', format: 'cjs', metafile: true,
    alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
  json('fixture-build/metafile.json', built.metafile);
  assert.equal(Object.keys(built.metafile.inputs).filter(file => /(^|\/)src\/lib\/clubManager\.ts$/.test(file.replaceAll('\\', '/'))).length, 1, 'CM_FAMILY_ONE_CANONICAL_ENGINE');
  assert.equal(Object.keys(built.metafile.inputs).filter(file => /(^|\/)src\/lib\/clubManagerRetiredSonActions\.ts$/.test(file.replaceAll('\\', '/'))).length, 1, 'CM_FAMILY_ONE_CANONICAL_ACTIONS_MODULE');
  const memory = new Map();
  const oldStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key), clear: () => memory.clear() };
  let fixtures, allowedFlags;
  try {
    const { cm, familyActions, keyedRng, FLAG_CODES } = createRequire(import.meta.url)(bundle);
    assert.equal(cm.SAVE_KEY, KEY);
    await cm.ensureAllEraRosters();
    allowedFlags = new Set(Object.values(FLAG_CODES).flatMap(code => [20, 40, 80, 160, 320].map(width => 'https://flagcdn.com/w' + width + '/' + code + '.png')));
    const oldRandom = Math.random, oldNow = Date.now, FIXTURE_NOW = Date.UTC(2032, 7, 1);
    const preparation = { declaration: 'Actual source-generated Excelsior youth and real summer retirement. Ages are explicit saved-fixture inputs, no naturally played career claim.', fullIntakes: [], keyWitnesses: [] };
    const seeded = (seed, fn) => { const previous = Math.random; Math.random = keyedRng('cm-family-browser-global|' + seed); try { return fn(); } finally { Math.random = previous; } };
    Date.now = () => FIXTURE_NOW;
    function retirementInput(full) {
      let input = seeded(41031, () => cm.startCareer('Excelsior'));
      cm.ensureAcademy(input);
      if (full) {
        for (let i = 0; input.academy.prospects.length < cm.MAX_PROSPECTS && i < 16; i += 1) {
          input.squad = input.squad.map(p => ({ ...p, age: 25, contractYears: 4 }));
          input = seeded(520 + i, () => cm.startNextSeason(input));
          preparation.fullIntakes.push({ season: input.season, count: input.academy.prospects.length, ids: input.academy.prospects.map(p => p.id) });
        }
        assert.equal(input.academy.prospects.length, cm.MAX_PROSPECTS, 'CM_FAMILY_REAL_INTAKES_FILL_CAPACITY');
      }
      const parent = input.squad.find(p => p.isYouth === true && p.name.endsWith(' (Youth)') && !p.onLoan);
      assert(parent, 'CM_FAMILY_SOURCE_GENERATED_PARENT');
      input.squad = input.squad.map(p => ({ ...p, age: p.id === parent.id ? 41 : 25, contractYears: 4, potential: Math.max(p.rating, p.potential ?? p.rating) }));
      input.loanedOut = []; input.freeAgents = [];
      let seed;
      for (let i = 0; i < 4096; i += 1) {
        const key = JSON.stringify(['cm-retired-son-v1', i, input.clubName, cm.worldYear(input) + 1, parent.id]);
        if (keyedRng(key)() < 1 / 8) { seed = i; preparation.keyWitnesses.push({ full, key, seed, attempt: i + 1 }); break; }
      }
      assert.notEqual(seed, undefined, 'CM_FAMILY_KEY_WITNESS');
      input.worldSeed = seed;
      const before = copy(input), after = seeded(701, () => cm.startNextSeason(input)), offer = familyActions.retiredSonOffer(after);
      assert(after.retiredLastSummer.some(p => p.name === parent.name && p.age === 42), 'CM_FAMILY_ACTUAL_PARENT_RETIREMENT');
      assert(!after.squad.some(p => p.id === parent.id || p.name === parent.name), 'CM_FAMILY_RETIRED_PARENT_REMOVED');
      assert(offer && offer.status === 'pending' && offer.parentId === parent.id && offer.parentAge === 42 && offer.parentGenerated === true, 'CM_FAMILY_REAL_ROLLOVER_OFFER');
      if (full) assert.equal(after.academy.prospects.length, cm.MAX_PROSPECTS);
      return { before, after, offer: copy(offer), parent: copy(parent) };
    }
    try {
      const ordinary = retirementInput(false), full = retirementInput(true);
      const healthy = copy(ordinary.after);
      healthy.budget = Math.round((ordinary.offer.fee + 1.24) * 100) / 100;
      const poor = copy(healthy);
      poor.budget = Math.max(0, Math.round((ordinary.offer.fee - 0.1) * 100) / 100);
      const fullState = copy(full.after);
      fullState.budget = Math.round((full.offer.fee + 1.24) * 100) / 100;
      assert.deepEqual(healthy.retiredSonApplication, ordinary.after.retiredSonApplication, 'CM_FAMILY_NO_FABRICATED_BLOCK');
      assert.deepEqual(poor.retiredSonApplication, healthy.retiredSonApplication, 'CM_FAMILY_FUNDS_ONLY_BOUNDARY');
      assert(poor.budget < ordinary.offer.fee);
      const stored = (id, state, evidence) => {
        memory.clear();
        assert.equal(cm.saveCareer(state), true, 'CM_FAMILY_REAL_FIXTURE_SAVE');
        const loaded = cm.loadCareer();
        assert(loaded && familyActions.retiredSonOffer(loaded), 'CM_FAMILY_REAL_FIXTURE_LOAD');
        assert.equal(cm.saveCareer(loaded), true, 'CM_FAMILY_NORMALIZED_FIXTURE_SAVE');
        const raw = memory.get(KEY);
        assert.deepEqual(JSON.parse(raw).retiredSonApplication, state.retiredSonApplication);
        const current = familyActions.retiredSonOffer(loaded), fmt = cm.moneyIn(loaded), pendingBytes = JSON.stringify(loaded);
        const shadowInvite = familyActions.acceptRetiredSon(loaded, current.id);
        const shadowPass = familyActions.declineRetiredSon(loaded, current.id);
        if (id === 'full' || id === 'poor') assert.equal(shadowInvite, null, 'CM_FAMILY_ACTUAL_ACTION_BOUNDARY_REFUSAL');
        else {
          assert(shadowInvite, 'CM_FAMILY_ACTUAL_ACTION_NAMESPACE_INVITE');
          assert.equal(shadowInvite.budget, 1.24, 'CM_FAMILY_FIXTURE_ACTION_EXACT_CENTS');
          assert.deepEqual(shadowInvite.academy.prospects, [...loaded.academy.prospects, { ...current.prospect, fee: 0 }], 'CM_FAMILY_FIXTURE_ACTION_ONE_PROSPECT');
        }
        assert(shadowPass && familyActions.retiredSonOffer(shadowPass)?.status === 'declined', 'CM_FAMILY_ACTUAL_ACTION_NAMESPACE_PASS');
        assert.equal(JSON.stringify(loaded), pendingBytes, 'CM_FAMILY_SHADOW_ACTION_INPUT_HELD');
        assert.equal(memory.get(KEY), raw, 'CM_FAMILY_ONLY_PENDING_FIXTURE_PLANTED');
        const value = { id, raw, rawSha256: sha(raw), storage: Object.fromEntries(memory), offer: copy(current), evidence,
          display: { fee: fmt(current.fee), kitty: fmt(loaded.budget), acceptedKitty: fmt(1.24) },
          shadowActions: { scope: 'Actual namespace sanity only, not a browser observation; outputs never planted',
            invite: shadowInvite ? 'accepted' : 'refused', pass: 'declined', pendingInputAndStorageHeld: true } };
        json('fixture-' + id + '.json', value);
        return value;
      };
      fixtures = { invite: stored('invite', healthy, ordinary), pass: stored('pass', healthy, ordinary),
        full: stored('full', fullState, full), poor: stored('poor', poor, { ...ordinary, boundary: 'Only existing budget set below displayed fee' }) };
      json('fixture-preparation.json', preparation);
    } finally { Math.random = oldRandom; Date.now = oldNow; }
  } finally { if (oldStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = oldStorage; }
  const port = await new Promise((resolve, reject) => { const socket = createServer(); socket.once('error', reject); socket.listen(0, '127.0.0.1', () => {
    const value = socket.address().port; socket.close(error => error ? reject(error) : resolve(value)); }); });
  const BASE = 'http://127.0.0.1:' + port;
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', DIST, String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new DriverLimitation('Owned hostLikeServer startup timeout')), 15000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', (code, signal) => { clearTimeout(timer); reject(new DriverLimitation('Owned server exited during startup:' + code + ':' + signal)); });
    server.stdout.on('data', bytes => { serverLog += bytes; if (serverLog.includes('host-like server: ' + DIST + ' on ' + BASE)) { clearTimeout(timer); resolve(); } });
    server.stderr.on('data', bytes => { serverError += bytes; });
  });
  report.server = { pid: server.pid, base: BASE, dist: DIST, servedRoute: '/club-manager', servedSha256: servedSha };
  browser = await pw.chromium.launch({ headless: true });
  function instrument() {
    const documentId = performance.timeOrigin;
    window.__cmFamilyObserved = { documentId, inputs: [], publications: [], dropped: 0 };
    const record = value => { const log = window.__cmFamilyObserved; if (log.inputs.length < 1000) log.inputs.push(value); else log.dropped += 1; };
    for (const type of ['pointerdown', 'pointerup', 'click', 'keydown']) document.addEventListener(type, event => {
      const target = event.target instanceof Element ? event.target.closest('button,a') : null;
      record({ type, trusted: event.isTrusted, key: event.key ?? null, x: event.clientX ?? null, y: event.clientY ?? null,
        label: target?.textContent?.trim().replace(/\s+/g, ' ') ?? null, aria: target?.getAttribute('aria-label') ?? null,
        family: !!target?.closest('[data-testid="cm-retired-son-application"]'), at: performance.now() });
    }, true);
    let previous = '';
    new MutationObserver(() => {
      const card = document.querySelector('[data-testid="cm-retired-son-application"]');
      if (!card) return;
      let stored = null;
      try { stored = JSON.parse(localStorage.getItem('dukb-club-manager-save') || 'null'); } catch { /* literal unreadable storage retained */ }
      const value = { at: performance.now(), text: card.querySelector('[role="status"]')?.textContent?.trim() ?? null,
        diskStatus: stored?.retiredSonApplication?.offer?.status ?? null, budget: stored?.budget ?? null,
        candidateCount: stored?.academy?.prospects?.filter(p => p.id === stored?.retiredSonApplication?.offer?.prospect?.id).length ?? null };
      const signature = JSON.stringify({ ...value, at: 0 });
      if (signature !== previous) {
        previous = signature;
        if (window.__cmFamilyObserved.publications.length < 100) window.__cmFamilyObserved.publications.push(value);
        else window.__cmFamilyObserved.dropped += 1;
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  }
  async function probe(locator, example = false) {
    return locator.evaluate((element, example) => {
      const plain = rect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom });
      let rect = element.getBoundingClientRect(), rangeRect = null;
      if (example) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT), nodes = []; let node, text = '';
        while ((node = walker.nextNode())) { nodes.push({ node, start: text.length }); text += node.textContent; }
        const start = text.indexOf('Example:');
        if (start >= 0 && nodes.length) {
          const first = nodes.find((item, i) => item.start <= start && (!nodes[i + 1] || nodes[i + 1].start > start));
          const range = document.createRange(); range.setStart(first.node, start - first.start);
          const last = nodes[nodes.length - 1]; range.setEnd(last.node, last.node.textContent.length);
          rect = range.getBoundingClientRect(); rangeRect = plain(rect);
        }
      }
      let host = element.parentElement;
      while (host && !(host.scrollHeight > host.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(host).overflowY))) host = host.parentElement;
      const hostBox = host ? host.getBoundingClientRect() : { x: 0, y: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight };
      const top = Math.max(100, hostBox.y + 8), bottom = Math.min(innerHeight - 70, hostBox.bottom - 8);
      const x = Math.min(innerWidth - 16, Math.max(16, rect.x + rect.width / 2)), y = Math.min(innerHeight - 16, Math.max(16, rect.y + rect.height / 2));
      const hit = document.elementFromPoint(x, y), style = getComputedStyle(element);
      return { box: plain(rect), elementBox: plain(element.getBoundingClientRect()), rangeRect,
        label: element.textContent.trim().replace(/\s+/g, ' '), aria: element.getAttribute('aria-label'),
        visible: style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0,
        hitOwned: !!hit && (element === hit || element.contains(hit)), hit: hit ? { tag: hit.tagName, text: hit.textContent.trim().slice(0, 120) } : null,
        disabled: 'disabled' in element ? element.disabled : null, point: { x, y }, host: { box: plain(hostBox), scrollTop: host?.scrollTop ?? null },
        corridor: { top, bottom }, viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY },
        documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight, fontStatus: document.fonts.status };
    }, example);
  }
  async function stable(page, locator, example = false) {
    const started = Date.now(); let previous = '', since = Date.now(), last;
    do {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 35))));
      last = await probe(locator, example);
      const signature = JSON.stringify(last);
      if (signature !== previous) { previous = signature; since = Date.now(); }
      if (Date.now() - since >= 220 && last.fontStatus === 'loaded') return last;
    } while (Date.now() - started < 5000);
    throw new DriverLimitation('Actual geometry did not settle220ms:' + JSON.stringify(last));
  }
  async function align(page, locator, row, label, example = false) {
    need(await locator.count() === 1, 'One actual target required:' + label);
    row.alignment.push({ label, initial: await probe(locator, example) });
    for (let i = 0; i <= 80; i += 1) {
      const actual = await stable(page, locator, example);
      const { top, bottom } = actual.corridor, box = actual.box;
      need(actual.visible && bottom > top, 'Visible native scroll corridor:' + label);
      if (box.y >= top && box.bottom <= bottom && actual.hitOwned) return actual;
      need(i < 80 && box.height <= bottom - top, 'Target fits original viewport without capture resize:' + label);
      const delta = Math.max(-650, Math.min(650, (box.y + box.bottom) / 2 - (top + bottom) / 2));
      need(Math.abs(delta) >= 1, 'Covered target needs causal input, not repeated tap:' + label);
      const before = actual, point = { x: Math.max(20, Math.min(actual.viewport.width - 20, actual.host.box.x + actual.host.box.width / 2)),
        y: Math.max(top + 2, Math.min(bottom - 2, (top + bottom) / 2)) };
      await page.mouse.move(point.x, point.y);
      await page.mouse.wheel(0, delta);
      row.alignment.push({ label, gesture: 'native-wheel', point, delta, before, after: await stable(page, locator, example) });
    }
    throw new DriverLimitation('Native alignment exhausted:' + label);
  }
  function judgeInput(value) {
    assert(value.events.every(event => event.trusted), 'CM_FAMILY_TRUSTED_INPUT');
    const owned = value.events.filter(event => event.label === value.label || event.aria === value.aria && value.aria);
    if (value.mode === 'keyboard') {
      assert(owned.some(event => event.type === 'keydown' && event.key === (value.key === 'Space' ? ' ' : value.key)), 'CM_FAMILY_REAL_KEY');
      assert(owned.some(event => event.type === 'click'), 'CM_FAMILY_TRUSTED_CLICK');
    } else {
      for (const type of ['pointerdown', 'pointerup', 'click']) assert(owned.some(event => event.type === type), 'CM_FAMILY_TRUSTED_CLICK:' + type);
    }
  }
  async function press(page, locator, row, label, keyboard = null, disabled = false, beforeActivation = null) {
    const navigationBefore = await probe(locator);
    let settled = await align(page, locator, row, label), fresh = await probe(locator);
    need(JSON.stringify(settled) === JSON.stringify(fresh), 'Fresh actual hit/geometry changed before input:' + label);
    need(fresh.hitOwned, 'Fresh owner hit required:' + label);
    const index = await page.evaluate(() => window.__cmFamilyObserved.inputs.length);
    if (keyboard) {
      let focused = false;
      for (let i = 0; i < 96; i += 1) {
        if (await locator.evaluate(element => document.activeElement === element)) { focused = true; break; }
        await page.keyboard.press('Tab');
      }
      need(focused, 'Real Tab could not reach actual control:' + label);
      settled = await stable(page, locator);
      fresh = await probe(locator);
      need(JSON.stringify(settled) === JSON.stringify(fresh) && fresh.hitOwned
        && await locator.evaluate(element => document.activeElement === element), 'Fresh post-Tab owner/focus changed before activation:' + label);
    }
    const before = beforeActivation ? await beforeActivation() : null;
    if (keyboard) await page.keyboard.press(keyboard);
    else if (row.viewport.width < 600) await page.touchscreen.tap(fresh.point.x, fresh.point.y);
    else await page.mouse.click(fresh.point.x, fresh.point.y);
    const events = await page.evaluate(index => window.__cmFamilyObserved.inputs.slice(index), index);
    const value = { label: fresh.label, aria: fresh.aria, mode: keyboard ? 'keyboard' : 'pointer', key: keyboard, events, disabled, navigationBefore, before: fresh };
    row.inputs.push(value);
    if (!disabled) {
      try { judgeInput(value); } catch (error) { throw new DriverLimitation('Actual input ownership incomplete:' + label + ':' + error.message); }
    }
    return beforeActivation ? { input: value, before } : value;
  }
  async function snapshot(page, card) {
    const value = await page.evaluate(key => {
      const raw = localStorage.getItem(key);
      return { raw, state: raw ? JSON.parse(raw) : null, observed: copyObserved(), fonts: {
        status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'),
        faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
        documentId: performance.timeOrigin };
      function copyObserved() { return JSON.parse(JSON.stringify(window.__cmFamilyObserved)); }
    }, KEY);
    value.geometry = await probe(card);
    value.ui = await card.evaluate(element => {
      const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
      const range = document.createRange(); range.selectNodeContents(element);
      return { text: element.textContent.trim().replace(/\s+/g, ' '), status: element.querySelector('[role="status"]')?.textContent.trim(),
        buttons: [...element.querySelectorAll('button')].map(button => ({ label: button.textContent.trim(), disabled: button.disabled, box: rect(button) })),
        texts: [...element.querySelectorAll('h3,p,button,div.font-bold')].map(node => ({ text: node.textContent.trim(), font: parseFloat(getComputedStyle(node).fontSize), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth })) };
    });
    return value;
  }
  function judgeLayout(value) {
    checkFonts(value.fonts);
    assert.equal(value.observed.dropped, 0, 'CM_FAMILY_OBSERVATION_NOT_TRUNCATED');
    assert(value.geometry.documentWidth <= value.geometry.viewport.width + 0.75, 'CM_FAMILY_HORIZONTAL_FIT');
    assert(value.ui.buttons.length === 2 && value.ui.buttons.every(button => button.box.width >= 43.5 && button.box.height >= 43.5), 'CM_FAMILY_TOUCH44');
    assert(value.ui.texts.every(text => text.font >= 10.99 && text.scrollWidth <= text.clientWidth + 1), 'CM_FAMILY_LABEL_FIT');
  }
  function judgeStill(before, after) {
    assert.equal(after.geometry.viewport.scrollX, before.geometry.viewport.scrollX, 'CM_FAMILY_NO_ACTION_SCROLL');
    assert(Math.abs(after.geometry.viewport.scrollY - before.geometry.viewport.scrollY) <= 0.75, 'CM_FAMILY_NO_ACTION_SCROLL');
    for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(after.geometry.box[key] - before.geometry.box[key]) <= 0.75, 'CM_FAMILY_RESOLUTION_GEOMETRY:' + key);
  }
  function core(state) { const { budget, academy, retiredSonApplication, ...held } = state; return held; }
  function judgeLabels(snapshot, offer, display, kitty, count) {
    assert(snapshot.ui.text.includes(offer.parentName) && snapshot.ui.text.includes(offer.prospect.name)
      && snapshot.ui.text.includes('Both players are made up.') && snapshot.ui.text.includes('Fee ' + display.fee)
      && snapshot.ui.text.includes('Kitty ' + kitty) && snapshot.ui.text.includes('Academy ' + count + '/12')
      && snapshot.ui.text.includes('Scout ceiling ' + offer.prospect.lowGuess + ' to ' + offer.prospect.highGuess), 'CM_FAMILY_FIXED_UI_LABELS');
  }
  function judgeAction(value) {
    const { before, after, action, offer, display } = value;
    judgeLayout(before); judgeLayout(after); judgeStill(before, after); judgeInput(value.input);
    judgeLabels(before, offer, display, display.kitty, before.state.academy.prospects.length);
    judgeLabels(after, offer, display, action === 'invite' ? display.acceptedKitty : display.kitty, after.state.academy.prospects.length);
    assert.deepEqual(core(after.state), core(before.state), 'CM_FAMILY_UNRELATED_STATE_HELD');
    assert.deepEqual(after.state.retiredSonApplication, { ...before.state.retiredSonApplication,
      offer: { ...before.state.retiredSonApplication.offer, status: action === 'invite' ? 'accepted' : 'declined' } }, 'CM_FAMILY_FIXED_APPLICATION_SNAPSHOT');
    if (action === 'invite') {
      assert.equal(after.state.budget, Math.round((before.state.budget - offer.fee) * 100) / 100, 'CM_FAMILY_DEBIT');
      assert.equal(after.state.budget, 1.24, 'CM_FAMILY_CENT_BALANCE');
      assert.deepEqual(after.state.academy.prospects, [...before.state.academy.prospects, { ...offer.prospect, fee: 0 }], 'CM_FAMILY_APPEND_EXACT');
      assert.deepEqual({ ...after.state.academy, prospects: before.state.academy.prospects }, before.state.academy, 'CM_FAMILY_ACADEMY_SETTINGS_HELD');
      assert.equal(after.state.retiredSonApplication.offer.status, 'accepted', 'CM_FAMILY_ACCEPTED_SAVED');
      const first = after.observed.publications.find(item => item.text?.startsWith('Invited.'));
      assert(first && first.diskStatus === 'accepted' && first.budget === after.state.budget && first.candidateCount === 1, 'CM_FAMILY_PERSIST_BEFORE_PUBLICATION');
    } else {
      assert.equal(after.state.budget, before.state.budget, 'CM_FAMILY_PASS_FREE');
      assert.deepEqual(after.state.academy, before.state.academy, 'CM_FAMILY_PASS_BOOKS_HELD');
      assert.equal(after.state.retiredSonApplication.offer.status, 'declined', 'CM_FAMILY_DECLINED_SAVED');
      const first = after.observed.publications.find(item => item.text?.startsWith('Passed.'));
      assert(first && first.diskStatus === 'declined' && first.budget === after.state.budget, 'CM_FAMILY_PERSIST_BEFORE_PUBLICATION');
    }
  }
  function judgeRefusal(value) {
    judgeLayout(value.before); judgeLayout(value.after); judgeStill(value.before, value.after);
    assert.equal(value.before.ui.buttons[0].disabled, true, 'CM_FAMILY_REFUSAL_DISABLED');
    assert.equal(value.before.ui.buttons[1].disabled, false, 'CM_FAMILY_PASS_AVAILABLE');
    assert.equal(value.after.raw, value.before.raw, 'CM_FAMILY_DISABLED_REFUSAL_SAVE_HELD');
    assert(value.kind === 'full' ? /academy is full/i.test(value.before.ui.status) : /not enough funds/i.test(value.before.ui.status), 'CM_FAMILY_REFUSAL_REASON');
  }
  function judgeHelp(value) {
    assert(value.text.includes('Both players are made up.') && value.text.includes('11 of 12 places') && value.text.includes('0.8m') && value.text.includes('1.0m')
      && value.text.includes('without paying that recruitment fee again'), 'CM_FAMILY_HELP_EXAMPLE');
    assert(value.probe.rangeRect && value.probe.box.y >= value.probe.corridor.top && value.probe.box.bottom <= value.probe.corridor.bottom && value.probe.hitOwned, 'CM_FAMILY_HELP_EXAMPLE_VISIBLE');
    assert(value.font >= 11, 'CM_FAMILY_HELP_READABLE');
  }
  const profiles = SINGLE ? [{ width: 390, height: 844 }] : [{ width: 320, height: 844 }, { width: 390, height: 844 }, { width: 1440, height: 1000 }];
  const scenarios = SINGLE ? ['invite'] : ['invite', 'pass', 'full', 'poor'];
  for (const viewport of profiles) for (const scenario of scenarios) {
    const fixture = fixtures[scenario], id = viewport.width + '-' + scenario;
    const row = { id, viewport, scenario, status: 'STARTED', errors: [], consoleErrors: [], unknown: [], known: [], localFailures: [], alignment: [], inputs: [], screenshots: [], help: null, action: null, refusal: null };
    report.cases.push(row); flush();
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600,
      colorScheme: 'dark', reducedMotion: 'no-preference', serviceWorkers: 'block', storageState: { cookies: [], origins: [{
        origin: BASE, localStorage: [...Object.entries(fixture.storage).map(([name, value]) => ({ name, value })),
          { name: 'dukb-theme', value: 'dark' }, { name: 'cookie-consent-v2', value: JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }) }],
      }] } });
    let page;
    try {
      await context.addInitScript(instrument);
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        try {
          if (url.origin === BASE) {
            const fresh = url.pathname === '/' && [...url.searchParams.keys()].join('|') === 'fresh' && /^\d+$/.test(url.searchParams.get('fresh'));
            need(['GET', 'HEAD'].includes(request.method()) && !url.username && !url.password && !url.hash && (!url.search || fresh)
              && (['/', '/club-manager'].includes(url.pathname) || distFiles.has(url.pathname)), 'Unknown loopback request');
            return await route.continue();
          }
          if (fonts.has(url.href) && request.method() === 'GET' && request.postData() === null) {
            const value = fonts.get(url.href); row.known.push({ kind: 'actual-font', url: url.href, sha256: sha(value.body) });
            return await route.fulfill({ status: 200, contentType: value.contentType, body: value.body, headers: { 'access-control-allow-origin': '*' } });
          }
          const shell = shellFixture(request, url);
          if (shell) { row.known.push({ kind: shell.id, method: request.method(), path: url.pathname, bodySha256: sha(shell.body) }); return await route.fulfill({ status: 200, contentType: 'application/json', body: shell.body, headers: shell.date ? { date: shell.date } : {} }); }
          if (request.method() === 'GET' && allowedFlags.has(url.href) && request.resourceType() === 'image') {
            row.known.push({ kind: 'explicit-inert-source-known-flag', url: url.href });
            return await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="#334155"/></svg>' });
          }
          row.unknown.push({ method: request.method(), origin: url.origin, path: url.pathname, resourceType: request.resourceType() });
          return await route.abort();
        } catch (error) {
          row.unknown.push({ method: request.method(), origin: url.origin, path: url.pathname, error: error.message });
          return await route.abort();
        }
      });
      await context.routeWebSocket('**/*', socket => { row.unknown.push({ kind: 'websocket', url: socket.url() }); socket.close(); });
      page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => row.errors.push({ name: error.name, message: error.message, stack: error.stack }));
      page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
      page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.localFailures.push({ url: request.url(), error: request.failure()?.errorText }); });
      page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.localFailures.push({ url: response.url(), status: response.status() }); });
      async function open() {
        const response = await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
        need(response?.status() === 200 && sha(await response.body()) === servedSha, 'Actual saved-route host body mismatch');
        const slot = page.locator('[data-cm-slot-open]');
        await slot.waitFor({ state: 'visible' });
        await press(page, slot, row, 'saved-manager-slot');
        const academy = page.locator('[data-cm-hub] button').filter({ has: page.getByText('Academy', { exact: true }) });
        await academy.waitFor({ state: 'visible' });
        await press(page, academy, row, 'Academy-tile');
        const card = page.locator('[data-testid="cm-retired-son-application"]');
        await card.waitFor({ state: 'visible' });
        await page.evaluate(async () => {
          await Promise.all(['Inter', 'Space Grotesk'].flatMap(family => [400, 500, 600, 700].map(weight => document.fonts.load(weight + ' 16px "' + family + '"'))));
          await document.fonts.ready;
        });
        await align(page, card, row, 'application-card');
        return card;
      }
      async function capture(label) {
        if (SINGLE) return;
        const before = { viewport: page.viewportSize(), scroll: await page.evaluate(() => ({ x: scrollX, y: scrollY })), inputCount: await page.evaluate(() => window.__cmFamilyObserved.inputs.length) };
        need(report.screenshots.length < 12, 'Original screenshot limit');
        const file = id + '-' + label + '.png', target = path.join(OUT, file);
        await page.screenshot({ path: target, fullPage: false, animations: 'allow', caret: 'initial' });
        const after = { viewport: page.viewportSize(), scroll: await page.evaluate(() => ({ x: scrollX, y: scrollY })), inputCount: await page.evaluate(() => window.__cmFamilyObserved.inputs.length) };
        assert.deepEqual(after, before, 'CM_FAMILY_CAPTURE_GEOMETRY_AND_INPUT_HELD');
        const image = { ...descriptor(target), context: id, label, originalViewport: viewport, capture: 'ordinary-viewport', before, after };
        row.screenshots.push(image); report.screenshots.push(image);
      }
      const card = await open(), pending = await snapshot(page, card);
      row.initial = pending;
      judgeLayout(pending);
      judgeLabels(pending, fixture.offer, fixture.display, fixture.display.kitty, pending.state.academy.prospects.length);
      assert.equal(pending.state.retiredSonApplication.offer.id, fixture.offer.id, 'CM_FAMILY_ACTUAL_GENERATED_SAVE');
      assert.deepEqual(pending.state.retiredSonApplication.offer, fixture.offer, 'CM_FAMILY_FIXED_REPORT');
      assert.equal(pending.state.retiredSonApplication.offer.status, 'pending');
      const invite = card.getByRole('button', { name: 'Invite to academy', exact: true }), pass = card.getByRole('button', { name: 'Pass', exact: true });
      if (scenario === 'invite') {
        assert.equal(pending.ui.buttons[0].disabled, false, 'CM_FAMILY_INVITE_ENABLED');
        assert.equal(pending.ui.buttons[1].disabled, false, 'CM_FAMILY_PASS_ENABLED');
        await capture('pending');
        const trigger = page.getByRole('button', { name: 'How to play', exact: true });
        await align(page, trigger, row, 'question-mark-help');
        const beforeHelp = await probe(trigger);
        await press(page, trigger, row, 'open-help');
        const help = page.locator('[role="dialog"] [data-cm-help="retired-son"]');
        await help.waitFor({ state: 'visible' });
        await align(page, help, row, 'help-worked-example', true);
        row.help = { text: await help.textContent(), probe: await probe(help, true), font: await help.evaluate(element => parseFloat(getComputedStyle(element).fontSize)) };
        judgeHelp(row.help);
        await capture('help');
        await page.keyboard.press('Escape');
        await page.locator('[role="dialog"]').waitFor({ state: 'detached', timeout: 5000 });
        await stable(page, trigger);
        row.help.closed = { focused: await trigger.evaluate(element => document.activeElement === element), after: await probe(trigger), before: beforeHelp };
        assert(row.help.closed.focused, 'CM_FAMILY_HELP_FOCUS_RESTORED');
        assert(Math.abs(row.help.closed.after.viewport.scrollY - beforeHelp.viewport.scrollY) <= 0.75, 'CM_FAMILY_HELP_SCROLL_RESTORED');
      }
      if (scenario === 'full' || scenario === 'poor') {
        const navigationBefore = await snapshot(page, card);
        const { input, before } = await press(page, invite, row, 'disabled-Invite', null, true, () => snapshot(page, card));
        await stable(page, card);
        const after = await snapshot(page, card);
        row.refusal = { kind: scenario, navigationBefore, before, after, input };
        judgeRefusal(row.refusal);
        if (viewport.width === 390) await capture(scenario);
      }
      await align(page, card, row, 'before-decision');
      row.navigationBefore = await snapshot(page, card);
      const action = scenario === 'invite' ? 'invite' : 'pass', target = action === 'invite' ? invite : pass;
      const { input, before } = await press(page, target, row, action, viewport.width === 1440 ? (action === 'invite' ? 'Enter' : 'Space') : null, false, () => snapshot(page, card));
      row.attempt = { action, before, offer: fixture.offer, display: fixture.display, input };
      try {
        await page.waitForFunction(({ key, expected }) => {
          try { return JSON.parse(localStorage.getItem(key)).retiredSonApplication.offer.status === expected; } catch { return false; }
        }, { key: KEY, expected: action === 'invite' ? 'accepted' : 'declined' }, { timeout: 5000 });
      } catch (error) {
        assert.fail('CM_FAMILY_OWNED_ACTION_MUST_SAVE:' + action + ':' + error.message);
      }
      await stable(page, card);
      const after = await snapshot(page, card);
      row.action = { action, before, after, offer: fixture.offer, display: fixture.display, input };
      judgeAction(row.action);
      const repeatedRaw = after.raw;
      await press(page, target, row, 'resolved-disabled-repeat', null, true);
      assert.equal((await snapshot(page, card)).raw, repeatedRaw, 'CM_FAMILY_NO_SECOND_SETTLEMENT');
      if (scenario === 'invite') await capture('accepted');
      else if (scenario === 'pass' && viewport.width === 390) await capture('declined');
      const newCard = await open(), reloaded = await snapshot(page, newCard);
      judgeLayout(reloaded);
      assert.notEqual(reloaded.documentId, after.documentId, 'CM_FAMILY_REAL_DOCUMENT_RELOAD');
      assert.deepEqual(reloaded.state.retiredSonApplication, after.state.retiredSonApplication, 'CM_FAMILY_RELOAD_STATUS_HELD');
      assert.equal(reloaded.state.budget, after.state.budget, 'CM_FAMILY_RELOAD_BUDGET_HELD');
      assert.deepEqual(reloaded.state.academy, after.state.academy, 'CM_FAMILY_RELOAD_BOOKS_HELD');
      assert(reloaded.ui.buttons.every(button => button.disabled), 'CM_FAMILY_RELOADED_RESOLVED_DISABLED');
      row.reload = reloaded;
      need(row.unknown.length === 0 && row.localFailures.length === 0 && row.errors.length === 0, 'Unknown traffic, local failure or page error prevents attribution');
      row.status = 'PASS';
    } catch (error) {
      row.failure = { name: error.name, message: error.message, stack: error.stack };
      if (page && !page.isClosed()) row.failureDocument = await page.evaluate(key => ({ href: location.href,
        raw: localStorage.getItem(key), documentId: performance.timeOrigin, observed: window.__cmFamilyObserved,
        bodyTextPrefix: document.body?.textContent?.slice(0, 5000) ?? null }), KEY).catch(readError => ({ readError: readError.message }));
      row.status = error.name === 'AssertionError' && row.unknown.length === 0 && row.localFailures.length === 0 && row.errors.length === 0 ? 'PRODUCT_ASSERTION_FAILURE' : 'DRIVER_LIMITATION';
    } finally {
      if (page && !page.isClosed()) row.finalDocument = await page.evaluate(() => ({ href: location.href, documentId: performance.timeOrigin, fonts: document.fonts.status, observed: window.__cmFamilyObserved })).catch(error => ({ readError: error.message }));
      await context.close();
      json(id + '.json', row); flush();
    }
  }
  if (!SINGLE && report.cases.every(row => row.status === 'PASS')) {
    const invoke = report.cases.find(row => row.id === '390-invite').action;
    const refusal = report.cases.find(row => row.id === '390-full').refusal;
    const help = report.cases.find(row => row.id === '390-invite').help;
    const definitions = [
      { id: 'debit', foundation: invoke, judge: judgeAction, marker: 'CM_FAMILY_DEBIT', mutate: value => { value.after.state.budget = value.before.state.budget; } },
      { id: 'duplicate', foundation: invoke, judge: judgeAction, marker: 'CM_FAMILY_APPEND_EXACT', mutate: value => { const books = value.after.state.academy.prospects, last = books.slice(-1)[0]; assert(value.before.state.academy.prospects.length > 0 && books[0].id !== value.offer.prospect.id && last.id === value.offer.prospect.id, 'CM_FAMILY_DUPLICATE_CONTROL_ACTUAL_ORDINARY_AND_FAMILY_RECORDS'); books[0] = copy(last); } },
      { id: 'disabled', foundation: refusal, judge: judgeRefusal, marker: 'CM_FAMILY_REFUSAL_DISABLED', mutate: value => { value.before.ui.buttons[0].disabled = false; } },
      { id: 'help', foundation: help, judge: judgeHelp, marker: 'CM_FAMILY_HELP_EXAMPLE', mutate: value => { value.text = value.text.replace('0.8m', 'copied missing example amount'); } },
      { id: 'labels', foundation: invoke, judge: judgeAction, marker: 'CM_FAMILY_FIXED_UI_LABELS', mutate: value => { value.after.ui.text = value.after.ui.text.replace('Fee ' + value.display.fee, 'copied missing displayed fee'); } },
      { id: 'touch', foundation: invoke, judge: judgeAction, marker: 'CM_FAMILY_TOUCH44', mutate: value => { value.after.ui.buttons[0].box.width = 20; } },
      { id: 'scroll', foundation: invoke, judge: judgeAction, marker: 'CM_FAMILY_NO_ACTION_SCROLL', mutate: value => { value.after.geometry.viewport.scrollY += 4; } },
      { id: 'card-height', foundation: invoke, judge: judgeAction, marker: 'CM_FAMILY_RESOLUTION_GEOMETRY', mutate: value => { value.after.geometry.box.height += 4; } },
      { id: 'publication', foundation: invoke, judge: judgeAction, marker: 'CM_FAMILY_PERSIST_BEFORE_PUBLICATION', mutate: value => { const first = value.after.observed.publications.find(item => item.text?.startsWith('Invited.')); assert(first, 'CM_FAMILY_PUBLICATION_CONTROL_ACTUAL_SUBJECT'); first.diskStatus = 'pending'; } },
      { id: 'label-width', foundation: invoke, judge: judgeAction, marker: 'CM_FAMILY_LABEL_FIT', mutate: value => { assert(value.after.ui.texts.length > 0, 'CM_FAMILY_LABEL_CONTROL_ACTUAL_SUBJECT'); value.after.ui.texts[0].scrollWidth = value.after.ui.texts[0].clientWidth + 4; } },
      { id: 'click', foundation: invoke, judge: judgeAction, marker: 'CM_FAMILY_TRUSTED_CLICK', mutate: value => { value.input.events = value.input.events.filter(event => event.type !== 'click'); } },
    ];
    fs.mkdirSync(path.join(OUT, 'copied-controls'));
    for (const control of definitions) {
      const file = path.join(OUT, 'copied-controls', control.id + '.json'), original = Buffer.from(JSON.stringify(control.foundation, null, 2) + '\n');
      fs.writeFileSync(file, original);
      control.judge(JSON.parse(fs.readFileSync(file, 'utf8')));
      const changed = JSON.parse(original.toString('utf8')); control.mutate(changed);
      const bytes = Buffer.from(JSON.stringify(changed, null, 2) + '\n');
      assert(!original.equals(bytes), 'CM_FAMILY_CONTROL_ACTUALLY_CHANGED:' + control.id);
      const record = { id: control.id, file: path.relative(OUT, file), beforeSha256: sha(original), changedSha256: sha(bytes), marker: control.marker, refusal: null, restored: false };
      try {
        fs.writeFileSync(file, bytes);
        try { control.judge(JSON.parse(fs.readFileSync(file, 'utf8'))); }
        catch (error) { record.refusal = { name: error.name, message: error.message }; }
        assert(record.refusal?.name === 'AssertionError' && record.refusal.message.includes(control.marker), 'CM_FAMILY_CONTROL_OWNED_FIRST_CAUSE:' + control.id);
      } finally {
        fs.writeFileSync(file, original);
        assert(fs.readFileSync(file).equals(original), 'CM_FAMILY_SAME_PHYSICAL_COPY_RESTORED');
        control.judge(JSON.parse(fs.readFileSync(file, 'utf8')));
        record.restored = true; report.controls.push(record); flush();
      }
    }
  }
  report.sourceAfter = sourceHolds();
  assert.deepEqual(report.sourceAfter, report.sourceBefore, 'CM_FAMILY_FINAL_SOURCE_HOLDS');
  assert.deepEqual(inventory(DIST), distBefore, 'CM_FAMILY_DIST_HOLDS');
  assert.equal(git(['for-each-ref', '--format=%(refname) %(objectname)']), refsBefore, 'CM_FAMILY_FINAL_REFS_HELD');
  assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), statusBefore, 'CM_FAMILY_FINAL_MEMBER_HOLDS');
  if (FAULT) {
    const row = report.cases[0];
    assert.equal(report.cases.length, 1);
    assert.equal(report.screenshots.length, 0);
    assert(row.status === 'PRODUCT_ASSERTION_FAILURE' && row.failure.message.includes('CM_FAMILY_INVITE_ENABLED'), 'CM_FAMILY_BINDING_FAULT_MUST_REACH_OWNED_UI_REFUSAL');
    report.status = 'OWNED_PHYSICAL_BINDING_CONTROL_REFUSAL';
    process.exitCode = 1;
  } else if (report.cases.some(row => row.status === 'DRIVER_LIMITATION')) { report.status = 'DRIVER_LIMITATION'; process.exitCode = 2; }
  else if (report.cases.some(row => row.status !== 'PASS')) { report.status = 'PRODUCT_ASSERTION_FAILURE'; process.exitCode = 1; }
  else if (SMOKE) {
    assert.equal(report.cases.length, 1, 'CM_FAMILY_ONE_RESTORED_SMOKE_CONTEXT');
    assert.equal(report.screenshots.length, 0, 'CM_FAMILY_SMOKE_NO_EXTRA_ORIGINALS');
    assert.equal(report.controls.length, 0, 'CM_FAMILY_SMOKE_NO_COPIED_CONTROL_CREDIT');
    report.status = 'RESTORED_BINDING_SMOKE_PASS'; process.exitCode = 0;
  } else {
    assert.equal(report.cases.length, 12, 'CM_FAMILY_TWELVE_ACTUAL_CONTEXTS');
    assert.equal(report.screenshots.length, 12, 'CM_FAMILY_TWELVE_ORIGINAL_PNGS');
    assert.equal(report.controls.length, 11, 'CM_FAMILY_ELEVEN_EFFECTIVE_COPIED_CONTROLS');
    report.status = 'PASS'; process.exitCode = 0;
  }
} catch (error) {
  report.setupErrors.push({ name: error.name, message: error.message, stack: error.stack });
  report.status = 'SETUP_OR_METHOD_FAILURE'; process.exitCode = 2;
} finally {
  if (browser) await browser.close().catch(error => { report.setupErrors.push({ name: error.name, message: error.message }); report.status = 'SETUP_OR_METHOD_FAILURE'; process.exitCode = 2; });
  if (server && server.exitCode === null && server.signalCode === null) {
    server.kill('SIGTERM');
    await new Promise(resolve => { const timer = setTimeout(() => { server.kill('SIGKILL'); report.setupErrors.push({ name: 'OwnedServerCleanup', message: 'SIGTERM did not stop owned server within5000ms' }); report.status = 'SETUP_OR_METHOD_FAILURE'; process.exitCode = 2; resolve(); }, 5000); server.once('exit', () => { clearTimeout(timer); resolve(); }); });
  }
  fs.writeFileSync(path.join(OUT, 'server.stdout'), serverLog);
  fs.writeFileSync(path.join(OUT, 'server.stderr'), serverError);
  if (serverError) { report.setupErrors.push({ name: 'OwnedServerStderr', message: serverError }); report.status = 'SETUP_OR_METHOD_FAILURE'; process.exitCode = 2; }
  report.serverExit = server ? { pid: server.pid, exitCode: server.exitCode, signal: server.signalCode } : null;
  flush();
  console.log('CM retired-son browser: ' + report.status + '; contexts=' + report.cases.length + '; originalPNGs=' + report.screenshots.length + '; copiedControls=' + report.controls.length + '; forwardedExternal=' + report.forwardedExternal);
}
