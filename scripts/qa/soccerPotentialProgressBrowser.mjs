// Remote built-page reads of declared saved boundaries, not natural career coverage.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';

assert(process.env.CI, 'This browser proof runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, process.env.SOCCER_POTENTIAL_BROWSER_OUT || 'potential-progress-artifacts/browser');
const BASE = process.env.BASE || process.env.SWEEP_BASE;
assert(BASE && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(BASE).hostname), 'Use the unchanged runner loopback server');
assert(!fs.existsSync(OUT), 'A fresh output directory preserves prior evidence');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'soccerCareerSave', FIXTURE = 'scripts/data/careerLeagueWorldSaves1100.json';
const sha = value => createHash('sha256').update(value).digest('hex');
const copy = value => JSON.parse(JSON.stringify(value));
const put = (name, value) => { const relative = `${name}.json`, body = Buffer.from(JSON.stringify(value, null, 2)); fs.writeFileSync(path.join(OUT, relative), body); return { path: relative, bytes: body.length, sha256: sha(body) }; };
const bodyRef = (bytes, suffix = 'bin') => {
  const body = Buffer.from(bytes), hash = sha(body), relative = `bodies/${hash}.${suffix}`;
  fs.mkdirSync(path.join(OUT, 'bodies'), { recursive: true });
  const target = path.join(OUT, relative);
  if (fs.existsSync(target)) assert(fs.readFileSync(target).equals(body), 'Reused whole body stays byte-identical');
  else fs.writeFileSync(target, body);
  return { path: relative, bytes: body.length, sha256: hash };
};
const sourceFiles = ['src/pages/SoccerCareer.tsx', 'src/components/soccer-career/PotentialProgress.tsx',
  'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts', 'src/lib/soccerAwardReveal.ts',
  'src/components/career/AwardsNightCard.tsx', 'src/components/soccer-career/careerMoments.ts',
  'src/hooks/useRevealScroll.ts', 'scripts/runAllSims.mjs', 'scripts/lib/offlineTransport.cjs',
  'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', FIXTURE, 'scripts/qa/soccerPotentialProgressBrowser.mjs'];
const source = () => sourceFiles.map(file => { const body = fs.readFileSync(path.join(ROOT, file)); return { file, ...bodyRef(body, 'source') }; });
const widths = [320, 390, 430, 1440], kinds = ['visible', 'pending', 'reveal', 'wall99', 'retired'];
const report = { status: 'running', scope: '20 declared saved-boundary built-page journeys. No natural careers or full ranked award list proof.',
  qualifications: ['Full ere save and complete boundary edits are retained. The pending/reveal boundary has an explicitly empty shortlist, as in the focused component fixture.',
    'All20 journeys use actual Attributes. Pending and reveal journeys also retain their actual phase views; pending Attributes masks counters, and revealed Attributes shows the actual saved values.',
    'Browser external transport is intercepted and recorded. External web fonts are aborted, with actual local/fallback fonts measured after document.fonts.ready.',
    'Opening Attributes may intentionally scroll the new screen into view. Unchanged reads and requirements toggles must preserve their established scroll position.',
    'Pending season summaries keep Full attributes available. Its actual Attributes screen must show the waiting message and omit ceiling, earned, elite-run, next-point and requirements before reveal.',
    'Startup and legitimate award reveal draws are retained separately. No draw may occur during measured Attributes reads, disclosure or Back. Reload preserves every saved byte and the complete actual pre-panel bootstrap caller sequence/count. All initial and reload draw values and full callers remain retained, without cross-document value equality, filtering or normalization.'],
  declarations: { widths, kinds, cases: 20, copiedControls: ['read-purity', 'pending-privacy', 'hard-wall', 'layout-observation'] },
  sourceBefore: source(), cases: [], controls: [], errors: [], forwardedExternalRequests: 0 };
put('report', report);
const rawFixture = fs.readFileSync(path.join(ROOT, FIXTURE));
report.fixture = bodyRef(rawFixture, 'fixture');
const fixtureRows = JSON.parse(rawFixture).saves.filter(row => row.id === 'ere');
assert.equal(fixtureRows.length, 1);
const base = fixtureRows[0].state;
assert.equal(base.phase, 'playing'); assert.equal(base.primeType, 'late');
const entry = "export * from './src/lib/soccerCareerEngine'; export {isSoccerCareerSave} from './src/lib/soccerCareerSave'; export {ballonDorAwaitingReveal,revealBallonDorResult} from './src/lib/soccerAwardReveal';";
const defineExpression = '{"DEV":false,"PROD":true,"MODE":"production"}';
let compiled;
try {
  compiled = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'potential-oracle.ts', loader: 'ts' },
    bundle: true, write: false, metafile: true, platform: 'browser', format: 'iife', globalName: '__potentialOracle',
    alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': defineExpression }, logLevel: 'error' });
} catch (error) { report.status = 'fail'; report.errors.push({ compilation: String(error.stack || error) }); put('report', report); throw error; }
report.oracle = { entry: bodyRef(Buffer.from(entry), 'source'), code: bodyRef(compiled.outputFiles[0].contents, 'js'),
  metafile: put('oracle-metafile', compiled.metafile), inputs: Object.keys(compiled.metafile.inputs).map(file => {
    if (file === 'potential-oracle.ts') return { file, synthetic: true, ...bodyRef(Buffer.from(entry), 'source') };
    if (file === '<define:import.meta.env>') return { file, synthetic: true, kind: 'esbuild-define',
      metafileInput: copy(compiled.metafile.inputs[file]), declaredDefine: { name: 'import.meta.env', expression: bodyRef(Buffer.from(defineExpression), 'define-expression') },
      scope: 'Declared define expression and actual metafile descriptor. No generated virtual-file bytes are asserted.' };
    assert(!file.startsWith('<'), 'Unknown build-generated input remains unqualified');
    const full = path.resolve(ROOT, file); assert(full.startsWith(`${ROOT}${path.sep}`)); return { file, ...bodyRef(fs.readFileSync(full), 'source') };
  }) };
function boundary(kind) {
  const value = copy(base), edits = [];
  const set = (key, next) => { edits.push({ path: key, existed: Object.hasOwn(value, key), before: Object.hasOwn(value, key) ? copy(value[key]) : null, after: copy(next) }); value[key] = next; };
  if (kind === 'visible') { set('overall', 88); set('potential', 90); set('potentialEarned', 2); set('eliteStreak', 2); }
  if (kind === 'pending' || kind === 'reveal') {
    const season = { ...copy(value.seasons.at(-1)), year: 2030, ballonDor: false, ballonDorRank: 3 };
    set('phase', kind === 'pending' ? 'season_summary' : 'ballon_dor'); set('overall', 78); set('potential', 80);
    set('potentialEarned', 2); set('eliteStreak', 3); set('seasons', [...value.seasons.slice(0, -1), season]);
    set('pendingSummary', season); set('pendingBallonDor', { year: 2030, playerRank: 3, playerPoints: 70, playerNominated: true, nominees: [], moved: '' });
  }
  if (kind === 'wall99') { set('potential', 99); set('potentialEarned', 0); set('eliteStreak', 5); set('overall', 95); }
  if (kind === 'retired') { set('retired', true); set('phase', 'retired'); set('potential', 85); set('potentialEarned', 2); set('eliteStreak', 2); }
  return { value, edits };
}
const privacyFindings = value => value.mode !== 'waiting' || value.progressCount !== 1 || value.ceilingCount || value.runCount || value.nextCount || value.summaryCount || value.revealed || value.text !== 'Potential progress is waiting for the award reveal.' ? ['pending-progress-exposure'] : [];
const wallFindings = value => value.mode !== 'visible' || value.nextCount || value.summaryCount || !value.text.includes('99 is the ceiling limit. It cannot rise further.') ? ['hard-wall-target'] : [];
const purityFindings = value => [value.beforeRaw !== value.afterRaw && 'raw-save', JSON.stringify(value.beforeDraws) !== JSON.stringify(value.afterDraws) && 'read-rng'].filter(Boolean);
const reloadFindings = value => [value.beforeRaw !== value.afterRaw && 'raw-save',
  JSON.stringify(value.beforeDraws.map(draw => draw.caller)) !== JSON.stringify(value.afterDraws.map(draw => draw.caller)) && 'read-rng'].filter(Boolean);
const layoutFindings = value => [value.overflow && 'horizontal-overflow',
  (!value.painted || Number(value.opacity) !== 1 || value.effectiveOpacity !== 1 || value.ancestors.some(layer => layer.display === 'none' || layer.visibility !== 'visible')) && 'paint',
  !value.fonts.ready && 'fonts', (value.rect.width <= 0 || value.rect.height <= 0 || value.rect.x < 0 || value.rect.right > value.viewport.width + 1 || value.rect.y < 0 || value.rect.bottom > value.viewport.height + 1) && 'viewport',
  value.stableFrames < 4 && 'stable', value.finite !== 0 && 'animations', value.control && (value.rect.width < 44 || value.rect.height < 44) && 'target-size',
  value.expectedScroll !== null && value.scrollY !== value.expectedScroll && 'scroll-position'].filter(Boolean);
function control(id, actual, mutate, reverse, detect, expected) {
  const row = { id, status: 'running', actual: put(`controls/${id}-actual`, actual) }; report.controls.push(row);
  assert.deepEqual(detect(actual), []);
  if (id === 'layout-observation') {
    assert(actual.ancestors.length > 1); const ancestorFault = copy(actual), layer = 1;
    const originalOpacity = ancestorFault.ancestors[layer].opacity;
    assert.equal(Number(originalOpacity), 1); ancestorFault.ancestors[layer].opacity = '0.5';
    ancestorFault.effectiveOpacity = ancestorFault.ancestors.reduce((value, entry) => value * Number(entry.opacity), 1);
    const ancestor = { status: 'running', actual: row.actual, fault: put(`controls/${id}-ancestor-fault`, ancestorFault) };
    row.ancestorPaint = ancestor; assert.notDeepEqual(ancestorFault, actual);
    ancestor.findings = detect(ancestorFault); assert.deepEqual(ancestor.findings, ['paint']);
    assert.equal(ancestorFault.ancestors[layer].opacity, '0.5'); ancestorFault.ancestors[layer].opacity = originalOpacity;
    ancestorFault.effectiveOpacity = ancestorFault.ancestors.reduce((value, entry) => value * Number(entry.opacity), 1);
    ancestor.undo = put(`controls/${id}-ancestor-undo`, ancestorFault); ancestor.reverseApplied = true;
    assert.deepEqual(ancestorFault, actual); assert.deepEqual(detect(ancestorFault), []);
    assert.equal(ancestor.undo.sha256, row.actual.sha256); ancestor.status = 'pass';
  }
  const fault = copy(actual); mutate(fault);
  row.fault = put(`controls/${id}-fault`, fault); assert.notDeepEqual(fault, actual, 'Labelled copied defect changed the complete observation');
  row.findings = detect(fault); assert.deepEqual(row.findings, expected);
  if (id === 'read-purity') {
    row.reloadCallerFindings = reloadFindings(fault);
    assert.deepEqual(reloadFindings(actual), []); assert.deepEqual(row.reloadCallerFindings, expected);
  }
  reverse(fault, actual); row.undo = put(`controls/${id}-undo`, fault); row.reverseApplied = true;
  assert.deepEqual(fault, actual); assert.deepEqual(detect(fault), []);
  if (id === 'read-purity') assert.deepEqual(reloadFindings(fault), []);
  assert.equal(row.actual.sha256, row.undo.sha256); row.status = 'pass';
}
fs.mkdirSync(path.join(OUT, 'controls'));
let browser, oracleContext;
try {
  browser = await pw.chromium.launch({ headless: true });
  oracleContext = await browser.newContext({ serviceWorkers: 'block' });
  const oraclePage = await oracleContext.newPage(); await oraclePage.goto('about:blank');
  await oraclePage.addScriptTag({ content: compiled.outputFiles[0].text });
  for (const width of widths) for (const kind of kinds) {
    const id = `${width}-${kind}`, fixture = boundary(kind), row = { id, width, kind, status: 'running',
      input: put(`${id}-input`, fixture.value), edits: put(`${id}-edits`, fixture.edits), errors: [], console: [], external: [], assets: [], steps: [], layouts: [], reloads: [], scopes: [] };
    report.cases.push(row); put('report', report);
    const predicted = await oraclePage.evaluate(({ input, reveal }) => {
      const before = JSON.stringify(input), draws = [], nativeRandom = Math.random;
      Math.random = () => { const value = nativeRandom(); draws.push({ value, caller: new Error().stack }); return value; };
      try { const valid = window.__potentialOracle.isSoccerCareerSave(input); const repaired = window.__potentialOracle.repairCareer(input);
        const output = reveal ? window.__potentialOracle.revealBallonDorResult(repaired) : repaired;
        return { valid, before, repaired: JSON.stringify(repaired), output: JSON.stringify(output), draws,
          awaiting: window.__potentialOracle.ballonDorAwaitingReveal(repaired), ceiling: window.__potentialOracle.effectivePotential(repaired) };
      } finally { Math.random = nativeRandom; }
    }, { input: copy(fixture.value), reveal: kind === 'reveal' });
    row.oracle = put(`${id}-actual-oracle`, predicted);
    assert(predicted.valid, 'The actual core save validator accepts the complete declared input'); assert.equal(predicted.draws.length, 0, 'The existing prime-type fixture needs no repair entropy');
    const height = width === 1440 ? 1000 : 900;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width !== 1440, isMobile: width !== 1440,
      reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [
        { name: KEY, value: JSON.stringify(fixture.value) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' },
        { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }, { name: 'rules-gate-seen:/soccer-career', value: '1' }] }] } });
    const pendingBodies = new Set();
    await context.exposeBinding('__recordPotentialScope', ({ frame }, value) => { row.scopes.push({ ...value, frameUrl: frame.url() }); });
    await context.addInitScript(({ origin, key }) => {
      const scope = { href: location.href, origin: location.origin, top: window === window.top, included: window === window.top && location.origin === origin };
      window.__potentialScopeReady = window.__recordPotentialScope(scope);
      if (!scope.included) return;
      const evidence = window.__potentialEvidence = { scope, draws: [], storage: [] }, random = Math.random;
      Math.random = function () { const value = random();
        evidence.draws.push({ value, caller: new Error().stack }); return value; };
      const originalGet = Storage.prototype.getItem;
      for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (...args) {
          if (this !== window.localStorage || method !== 'clear' && args[0] !== key) return original.apply(this, args);
          const entry = { method, args, before: originalGet.call(this, key), caller: new Error().stack }; evidence.storage.push(entry);
          try { const result = original.apply(this, args); entry.result = result === undefined ? '<undefined>' : result; entry.after = originalGet.call(this, key); return result; }
          catch (error) { entry.error = String(error.stack || error); throw error; }
        };
      }
    }, { origin: new URL(BASE).origin, key: KEY });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), observation = { url: url.href, method: request.method(), type: request.resourceType(), body: request.postData(), headers: await request.allHeaders() };
      if (url.origin === new URL(BASE).origin) { await route.continue(); return; }
      row.external.push(observation);
      if (url.hostname.endsWith('.supabase.co')) { observation.mock = 'recorded empty read or completion acknowledgement';
        await route.fulfill({ status: request.method() === 'OPTIONS' ? 204 : 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': observation.headers['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, contentType: 'application/json', body: request.method() === 'OPTIONS' ? '' : request.method() === 'GET' ? '[]' : '{}' }); return; }
      observation.mock = 'aborted external resource, actual fallback qualification'; await route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => row.errors.push(String(error.stack || error)));
    page.on('console', message => row.console.push({ type: message.type(), text: message.text() }));
    page.on('response', response => {
      if (new URL(response.url()).origin !== new URL(BASE).origin) return;
      const asset = { url: response.url(), status: response.status(), method: response.request().method() }; row.assets.push(asset);
      const promise = (async () => { try {
        const bytes = await response.body(); asset.body = bodyRef(bytes);
        const url = new URL(response.url()), relative = decodeURIComponent(url.pathname).replace(/^\/+/, ''), full = path.resolve(ROOT, 'dist', relative || 'index.html');
        assert(full.startsWith(`${path.resolve(ROOT, 'dist')}${path.sep}`));
        const disk = fs.existsSync(full) && fs.statSync(full).isDirectory() ? path.join(full, 'index.html') : full;
        assert.equal(response.status(), 200); assert(fs.existsSync(disk), 'Every same-origin served body has a complete built-file witness');
        const original = fs.readFileSync(disk); assert(original.equals(bytes), 'Whole response matches actual production build bytes'); asset.built = { file: path.relative(ROOT, disk), ...bodyRef(original) };
      } catch (error) { asset.error = String(error.stack || error); } })();
      pendingBodies.add(promise); promise.finally(() => pendingBodies.delete(promise));
    });
    const state = () => page.evaluate(async key => { await window.__potentialScopeReady; return { raw: localStorage.getItem(key), evidence: window.__potentialEvidence, scrollY,
      active: document.activeElement?.outerHTML, bodyOverflow: { inline: document.body.style.overflow, computed: getComputedStyle(document.body).overflow } }; }, KEY);
    const read = async (name, operation) => {
      const before = await state(), item = { name, status: 'running', before: put(`${id}-${name}-before`, before) }; row.steps.push(item);
      try { await operation(); const after = await state(); item.after = put(`${id}-${name}-after`, after);
        const witness = { beforeRaw: before.raw, afterRaw: after.raw, beforeDraws: before.evidence.draws, afterDraws: after.evidence.draws };
        item.purity = put(`${id}-${name}-purity`, witness); assert.deepEqual(purityFindings(witness), [], `${name} preserves whole save bytes and every draw`); item.status = 'pass'; return witness;
      } catch (error) { item.error = String(error.stack || error); throw error; }
    };
    const capture = async (locator, name, controlTarget = false, expectedScroll = null) => {
      await locator.waitFor({ state: 'visible' }); if (expectedScroll === null) await locator.scrollIntoViewIfNeeded(); await page.evaluate(() => document.fonts.ready);
      const observation = await locator.evaluate(async (element, args) => {
        let previous, stableFrames = 0, final;
        for (let frame = 0; frame < 240; frame++) {
          await new Promise(resolve => requestAnimationFrame(resolve)); const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
          const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2, painted = document.elementFromPoint(x, y);
          const runningFinite = animation => animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime);
          const elementFinite = element.getAnimations({ subtree: true }).filter(runningFinite).length;
          const ancestors = [];
          for (let node = element; node; node = node.parentElement) {
            const computed = getComputedStyle(node);
            ancestors.push({ tag: node.tagName, id: node.id, className: node.className, display: computed.display,
              visibility: computed.visibility, opacity: computed.opacity, finite: node.getAnimations().filter(runningFinite).length });
          }
          const documentFiniteAnimations = document.getAnimations().filter(runningFinite).map((animation, index) => ({
            index, playState: animation.playState, endTime: animation.effect.getComputedTiming().endTime,
            target: animation.effect.target instanceof Element ? { tag: animation.effect.target.tagName, id: animation.effect.target.id,
              className: animation.effect.target.className } : null }));
          const finite = documentFiniteAnimations.length, effectiveOpacity = ancestors.reduce((value, layer) => value * Number(layer.opacity), 1);
          final = { rect: rect.toJSON(), viewport: { width: innerWidth, height: innerHeight, scale: visualViewport?.scale ?? 1 }, scrollY, expectedScroll: args.expectedScroll,
            opacity: style.opacity, painted: !!painted && element.contains(painted), effectiveOpacity, ancestors, elementFinite, documentFiniteAnimations,
            overflow: document.documentElement.scrollWidth > innerWidth + 1, finite,
            control: args.controlTarget, fonts: { ready: document.fonts.status === 'loaded', family: style.fontFamily, faces: Array.from(document.fonts, font => ({ family: font.family, status: font.status })) },
            html: element.outerHTML, text: element.innerText, mode: element.getAttribute('data-potential-progress'), ceilingCount: element.querySelectorAll('[data-potential-ceiling]').length,
            runCount: element.querySelectorAll('[data-potential-run]').length, nextCount: element.querySelectorAll('[data-potential-next]').length, summaryCount: element.querySelectorAll('summary').length };
          const signature = JSON.stringify(final); stableFrames = signature === previous ? stableFrames + 1 : 1; previous = signature;
          if (stableFrames >= 4 && finite === 0) break;
        }
        return { ...final, stableFrames };
      }, { controlTarget, expectedScroll });
      const result = { name, observation: put(`${id}-${name}-layout`, observation) }; row.layouts.push(result);
      assert.deepEqual(layoutFindings(observation), [], `${name} is stable, painted and inside viewport`);
      const png = path.join(OUT, `${id}-${name}.png`); await page.screenshot({ path: png });
      result.png = { path: path.basename(png), bytes: fs.statSync(png).size, sha256: sha(fs.readFileSync(png)) }; return observation;
    };
    const attributes = () => page.getByRole('button', { name: /^Full attributes/ });
    const progress = () => page.getByRole('region', { name: 'Potential progress', exact: true });
    const back = () => page.getByRole('button', { name: '← Back', exact: true });
    try {
      await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'How to play', exact: true }).waitFor({ timeout: 45000 }); await page.evaluate(() => document.fonts.ready);
      if (kind === 'reveal') await page.locator('[data-award-result="revealed"]').waitFor({ timeout: 10000 });
      await page.waitForFunction(({ key, raw }) => localStorage.getItem(key) === raw, { key: KEY, raw: predicted.output });
      const loaded = await state(); row.loaded = put(`${id}-loaded`, loaded);
      assert.equal(loaded.raw, predicted.output, 'Actual initial page save equals complete actual repair/reveal output');
      if (kind === 'pending') {
        await read('pending-summary-read', async () => { await capture(page.getByRole('heading', { name: 'Season Summary', exact: true }), 'pending-summary-heading'); });
        const phaseView = { attributesCount: await attributes().count(), progressCount: await progress().count(), revealed: !!JSON.parse((await state()).raw).pendingBallonDor.revealed, html: await page.locator('main').innerHTML() };
        row.pendingPhaseView = put(`${id}-pending-phase-view`, phaseView);
        assert.equal(phaseView.attributesCount, 1); assert.equal(phaseView.progressCount, 0); assert.equal(phaseView.revealed, false);
        const waitingWitness = async view => ({ mode: view.mode, progressCount: await progress().count(), ceilingCount: view.ceilingCount,
          runCount: view.runCount, nextCount: view.nextCount, summaryCount: view.summaryCount, text: view.text,
          revealed: !!JSON.parse((await state()).raw).pendingBallonDor.revealed, html: await page.locator('main').innerHTML() });
        await read('open-pending-attributes', async () => { await attributes().scrollIntoViewIfNeeded(); await attributes().click(); await progress().waitFor(); });
        const waiting = await capture(progress(), 'pending-progress'), masked = await waitingWitness(waiting);
        row.inaccessiblePending = put(`${id}-pending-mask`, masked); assert.deepEqual(privacyFindings(masked), []);
        await read('back-to-pending-summary', async () => { await back().click(); await page.getByRole('heading', { name: 'Season Summary', exact: true }).waitFor(); });
        const beforeReload = await state(); await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('heading', { name: 'Season Summary', exact: true }).waitFor();
        const afterReload = await state(), pendingReload = { status: 'running', before: put(`${id}-pending-reload-before`, beforeReload), after: put(`${id}-pending-reload-after`, afterReload) }; row.reloads.push(pendingReload);
        const reloadWitness = { beforeRaw: beforeReload.raw, afterRaw: afterReload.raw, beforeDraws: loaded.evidence.draws, afterDraws: afterReload.evidence.draws };
        pendingReload.witness = put(`${id}-pending-reload-witness`, reloadWitness); pendingReload.bootstrap = row.loaded;
        assert.deepEqual(reloadFindings(reloadWitness), []); assert.equal(await attributes().count(), 1); assert.equal(await progress().count(), 0);
        assert.equal(!!JSON.parse(afterReload.raw).pendingBallonDor.revealed, false);
        await read('reload-pending-attributes', async () => { await attributes().scrollIntoViewIfNeeded(); await attributes().click(); await progress().waitFor(); });
        const reloadedWaiting = await capture(progress(), 'reloaded-pending-progress'), reloadedMasked = await waitingWitness(reloadedWaiting);
        pendingReload.mask = put(`${id}-pending-reload-mask`, reloadedMasked); assert.deepEqual(privacyFindings(reloadedMasked), []);
        assert.equal(reloadedWaiting.html, waiting.html); pendingReload.status = 'pass';
        if (id === '390-pending') control('pending-privacy', masked, fault => { fault.ceilingCount = 1; fault.html += '<p data-potential-ceiling>copied disclosure</p>'; },
          (fault, actual) => { const marker = '<p data-potential-ceiling>copied disclosure</p>'; assert(fault.html.endsWith(marker)); assert.equal(fault.ceilingCount, 1);
            fault.html = fault.html.slice(0, -marker.length); fault.ceilingCount = actual.ceilingCount; }, privacyFindings, ['pending-progress-exposure']);
        row.status = 'pass'; console.log(`PASS ${id}: actual Attributes waiting mask, no premature disclosure and complete raw save held`); continue;
      }
      if (kind === 'reveal') {
        assert.equal(JSON.parse(loaded.raw).pendingBallonDor.revealed, true); row.actualReveal = { expected: predicted.output, actual: loaded.raw, draws: loaded.evidence.draws, source: report.oracle };
        await read('revealed-award-read', async () => { await capture(page.locator('[data-award-headline]'), 'actual-reveal-headline'); });
        const phaseView = { attributesCount: await attributes().count(), progressCount: await progress().count(), html: await page.locator('main').innerHTML() };
        row.inaccessibleRevealed = put(`${id}-revealed-phase-view`, phaseView);
        assert.equal(phaseView.attributesCount, 1); assert.equal(phaseView.progressCount, 0);
        const checkRevealedView = async view => {
          const saved = JSON.parse((await state()).raw), ceiling = await oraclePage.evaluate(value => window.__potentialOracle.effectivePotential(value), saved);
          assert.equal(saved.pendingBallonDor.revealed, true); assert.equal(view.mode, 'visible'); assert.equal(view.ceilingCount, 1); assert.equal(view.runCount, 1);
          assert.equal(await progress().locator('[data-potential-ceiling]').innerText(), `Ceiling ${ceiling}/99${saved.potentialEarned > 0 ? ` · ${saved.potentialEarned} earned` : ''}.`);
          assert.equal(await progress().locator('[data-potential-run]').innerText(), `Elite run: ${saved.eliteStreak} ${saved.eliteStreak === 1 ? 'season' : 'seasons'}.`);
          assert.equal(view.nextCount, 1); assert.equal(view.summaryCount, 1);
          assert.equal(await progress().locator('[data-potential-next]').innerText(), `Next point: elite run 2+ and ${ceiling - 2}+ overall at season end.${saved.overall >= ceiling - 2 ? ' Overall target met now.' : ''}`);
        };
        await read('open-revealed-attributes', async () => { await attributes().scrollIntoViewIfNeeded(); await attributes().click(); await progress().waitFor(); });
        const revealed = await capture(progress(), 'revealed-progress'); row.revealedProgress = put(`${id}-revealed-progress-view`, revealed); await checkRevealedView(revealed);
        await read('back-to-revealed-award', async () => { await back().click(); await page.locator('[data-award-result="revealed"]').waitFor(); });
        const beforeReload = await state(); await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('[data-award-result="revealed"]').waitFor();
        const afterReload = await state(), reload = { status: 'running', before: put(`${id}-reveal-reload-before`, beforeReload), after: put(`${id}-reveal-reload-after`, afterReload) }; row.reloads.push(reload);
        const reloadWitness = { beforeRaw: beforeReload.raw, afterRaw: afterReload.raw, beforeDraws: loaded.evidence.draws, afterDraws: afterReload.evidence.draws };
        reload.witness = put(`${id}-reveal-reload-witness`, reloadWitness); reload.bootstrap = row.loaded;
        assert.deepEqual(reloadFindings(reloadWitness), []); assert.equal(await attributes().count(), 1); assert.equal(await progress().count(), 0);
        await read('reload-revealed-attributes', async () => { await attributes().scrollIntoViewIfNeeded(); await attributes().click(); await progress().waitFor(); });
        const restored = await capture(progress(), 'reloaded-revealed-progress'); reload.progress = put(`${id}-reveal-reload-view`, restored); await checkRevealedView(restored);
        assert.equal(restored.html, revealed.html); reload.status = 'pass';
        row.status = 'pass'; console.log(`PASS ${id}: actual reveal, saved Attributes values and complete raw reload held`); continue;
      }
      await attributes().waitFor();
      await read('open-attributes', async () => { await attributes().scrollIntoViewIfNeeded(); await attributes().click(); await progress().waitFor(); });
      const view = await capture(progress(), 'progress');
      {
        const expected = JSON.parse((await state()).raw);
        const actualCeiling = await oraclePage.evaluate(value => window.__potentialOracle.effectivePotential(value), expected);
        assert.equal(view.mode, 'visible'); assert.equal(view.ceilingCount, 1); assert.equal(view.runCount, 1);
        assert.equal(await progress().locator('[data-potential-ceiling]').innerText(), `Ceiling ${actualCeiling}/99${expected.potentialEarned > 0 ? ` · ${expected.potentialEarned} earned` : ''}.`);
        assert.equal(await progress().locator('[data-potential-run]').innerText(), `Elite run: ${expected.eliteStreak} ${expected.eliteStreak === 1 ? 'season' : 'seasons'}.`);
        if (kind === 'wall99') assert.deepEqual(wallFindings(view), []);
        else if (kind === 'retired') { assert(view.text.includes('Career complete.')); assert.equal(view.nextCount, 0); assert.equal(view.summaryCount, 0); }
        else { assert.equal(view.nextCount, 1); assert.equal(await progress().locator('[data-potential-next]').innerText(),
          `Next point: elite run 2+ and ${actualCeiling - 2}+ overall at season end.${expected.overall >= actualCeiling - 2 ? ' Overall target met now.' : ''}`); }
      }
      if (kind === 'visible') {
        const summary = progress().locator('summary'); await summary.scrollIntoViewIfNeeded();
        const establishedY = (await state()).scrollY; const target = await capture(summary, 'requirements-target', true, establishedY);
        await read('open-requirements', async () => { await summary.click(); await progress().locator('details').evaluate(node => { if (!node.open) throw new Error('Requirements did not open'); }); });
        await capture(progress(), 'requirements-open', false, establishedY);
        assert((await progress().innerText()).includes('30+ appearances and a 7.5+ rating'));
        await read('close-requirements', async () => { await summary.click(); assert.equal(await progress().locator('details').getAttribute('open'), null); });
        await capture(progress(), 'requirements-closed', false, establishedY);
        await read('reopen-requirements', async () => { await summary.click(); assert.equal(await progress().locator('details').evaluate(node => node.open), true); });
        await capture(progress(), 'requirements-reopened', false, establishedY);
        await read('close-reopened-requirements', async () => { await summary.click(); assert.equal(await progress().locator('details').getAttribute('open'), null); });
        await capture(progress(), 'requirements-reclosed', false, establishedY);
        if (id === '390-visible') control('layout-observation', target, fault => { fault.rect.height = 43; fault.rect.x = -1; fault.overflow = true; fault.painted = false;
          fault.fonts.ready = false; fault.stableFrames = 3; fault.finite = 1; fault.expectedScroll = fault.scrollY + 1; },
          (fault, actual) => { assert.equal(fault.rect.height, 43); assert.equal(fault.rect.x, -1); assert.equal(fault.overflow, true); assert.equal(fault.painted, false);
            assert.equal(fault.fonts.ready, false); assert.equal(fault.stableFrames, 3); assert.equal(fault.finite, 1); assert.equal(fault.expectedScroll, fault.scrollY + 1);
            fault.rect.height = actual.rect.height; fault.rect.x = actual.rect.x; fault.overflow = actual.overflow; fault.painted = actual.painted;
            fault.fonts.ready = actual.fonts.ready; fault.stableFrames = actual.stableFrames; fault.finite = actual.finite; fault.expectedScroll = actual.expectedScroll; }, layoutFindings,
          ['horizontal-overflow', 'paint', 'fonts', 'viewport', 'stable', 'animations', 'target-size', 'scroll-position']);
      }
      const purity = await read('back-and-reopen', async () => { await back().click(); await attributes().waitFor(); await attributes().scrollIntoViewIfNeeded(); await attributes().click(); await progress().waitFor(); });
      await capture(progress(), 'reopened-progress');
      const beforeReload = await state(), reload = { status: 'running', before: put(`${id}-reload-before`, beforeReload) }; row.reloads.push(reload);
      await page.reload({ waitUntil: 'domcontentloaded' }); await attributes().waitFor({ timeout: 45000 });
      const afterReload = await state(); reload.after = put(`${id}-reload-after`, afterReload);
      assert.equal(afterReload.raw, beforeReload.raw, 'Reload preserves every saved byte');
      const reloadWitness = { beforeRaw: beforeReload.raw, afterRaw: afterReload.raw, beforeDraws: loaded.evidence.draws, afterDraws: afterReload.evidence.draws };
      reload.bootstrap = row.loaded; reload.purity = put(`${id}-reload-purity`, reloadWitness);
      assert.deepEqual(reloadFindings(reloadWitness), [], 'Reload holds saved bytes and the complete actual initial-bootstrap caller sequence');
      await read('reload-open-attributes', async () => { await attributes().scrollIntoViewIfNeeded(); await attributes().click(); await progress().waitFor(); });
      const restoredView = await capture(progress(), 'reload-progress'); assert.equal(restoredView.html, view.html, 'Reload restores complete progress DOM'); reload.status = 'pass';
      if (id === '390-visible') control('read-purity', purity, fault => { fault.afterRaw += ' '; fault.afterDraws.push({ value: 0.25, caller: 'labelled copied observation only' }); },
        (fault, actual) => { assert.equal(fault.afterRaw, `${actual.afterRaw} `); assert.deepEqual(fault.afterDraws.at(-1), { value: 0.25, caller: 'labelled copied observation only' });
          fault.afterRaw = fault.afterRaw.slice(0, -1); fault.afterDraws.pop(); }, purityFindings, ['raw-save', 'read-rng']);
      if (id === '390-wall99') control('hard-wall', view, fault => { fault.nextCount = 1; fault.html += '<p data-potential-next>copied future target</p>'; },
        (fault, actual) => { const marker = '<p data-potential-next>copied future target</p>'; assert(fault.html.endsWith(marker)); assert.equal(fault.nextCount, 1);
          fault.html = fault.html.slice(0, -marker.length); fault.nextCount = actual.nextCount; }, wallFindings, ['hard-wall-target']);
      row.status = 'pass'; console.log(`PASS ${id}: actual Attributes, full save/reload and ${kind} boundary`);
    } catch (error) {
      row.status = 'fail'; row.error = String(error.stack || error); report.errors.push({ id, error: row.error });
      row.failureState = put(`${id}-failure-state`, await state().catch(error => ({ error: String(error.stack || error) })));
      const png = path.join(OUT, `${id}-failure.png`); try { await page.screenshot({ path: png }); row.failurePng = bodyRef(fs.readFileSync(png), 'png'); } catch (error) { row.failureCaptureError = String(error.stack || error); }
    } finally {
      while (pendingBodies.size) await Promise.all([...pendingBodies]);
      row.finalState = put(`${id}-final-state`, await state().catch(error => ({ error: String(error.stack || error) })));
      await context.close(); while (pendingBodies.size) await Promise.all([...pendingBodies]);
      const failedAssets = row.assets.filter(asset => asset.error);
      if (row.errors.length || failedAssets.length) { row.status = 'fail'; report.errors.push({ id, pageErrors: copy(row.errors), assetErrors: copy(failedAssets) }); }
      row.scopeRecord = put(`${id}-init-scopes`, row.scopes); row.assetRecord = put(`${id}-assets`, row.assets); put('report', report);
    }
  }
  assert.equal(report.cases.length, 20); assert(report.cases.every(row => row.status === 'pass'));
  assert.deepEqual(report.controls.map(row => row.id), ['layout-observation', 'read-purity', 'pending-privacy', 'hard-wall']);
  assert(report.controls.every(row => row.status === 'pass')); assert.equal(report.errors.length, 0);
  report.status = 'pass';
} catch (error) { report.status = 'fail'; report.errors.push({ fatal: String(error.stack || error) }); }
finally {
  try { report.sourceAfter = source(); assert.deepEqual(report.sourceAfter, report.sourceBefore); }
  catch (error) { report.status = 'fail'; report.errors.push({ sourceClosure: String(error.stack || error) }); }
  for (const [name, resource] of [['oracleContext', oracleContext], ['browser', browser]]) {
    if (!resource) continue;
    try { await resource.close(); }
    catch (error) { report.status = 'fail'; report.errors.push({ resourceClosure: name, error: String(error.stack || error) }); }
  }
  put('report', report);
}
console.log(`Potential progress browser: ${report.cases.length}/20 declared journeys, ${report.cases.filter(row => row.status === 'pass').length} passed.`);
console.log(`Potential progress controls: ${report.controls.filter(row => row.status === 'pass').length}/4 effective copied observation controls.`);
console.log(`Potential progress evidence: complete saves, draw callers, served bodies, geometry and original PNGs at ${OUT}`);
console.log(`${report.status === 'pass' ? 'PASS' : 'FAIL'} Soccer potential progress browser`);
if (report.status !== 'pass') process.exitCode = 1;
