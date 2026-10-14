// Remote saved-boundary layout proof, not a natural retirement or full career run.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';

assert(process.env.CI, 'Remote CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, process.env.SOCCER_RETIREMENT_BROWSER_OUT || 'retirement-actions-artifacts/browser');
const BASE = process.env.BASE || process.env.SWEEP_BASE;
assert(BASE && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(BASE).hostname));
assert(!fs.existsSync(OUT), 'Fresh evidence directory required'); fs.mkdirSync(OUT, { recursive: true });
const KEY = 'soccerCareerSave', FIXTURE = 'scripts/data/careerLeagueWorldSaves1100.json', PAGE = 'src/pages/SoccerCareer.tsx';
const BASE_HEAD = '4aa47b12179f3e6bd734ffd84dd3a4b6641e36b5';
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), copy = value => JSON.parse(JSON.stringify(value));
const put = (name, value) => { const body = Buffer.from(JSON.stringify(value, null, 2)), relative = `${name}.json`; fs.writeFileSync(path.join(OUT, relative), body); return { path: relative, bytes: body.length, sha256: sha(body) }; };
const bodyRef = (bytes, suffix = 'bin') => { const body = Buffer.from(bytes), relative = `bodies/${sha(body)}.${suffix}`, target = path.join(OUT, relative); fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) assert(fs.readFileSync(target).equals(body)); else fs.writeFileSync(target, body); return { path: relative, bytes: body.length, sha256: sha(body) }; };
const widths = [320, 390, 430, 1440], positions = ['top', 'footer'];
const sourceFiles = [PAGE, 'src/components/ui/button.tsx', 'src/lib/utils.ts', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts',
  'src/hooks/useRevealScroll.ts', 'tailwind.config.ts', 'scripts/lib/offlineTransport.cjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', FIXTURE, 'scripts/qa/soccerRetirementActionsBrowser.mjs'];
const source = () => sourceFiles.map(file => ({ file, ...bodyRef(fs.readFileSync(path.join(ROOT, file)), 'source') }));
const props = {
  original: { group: 'flex-1 flex gap-2', share: 'flex-1 h-12 text-sm font-bold', start: 'flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-black' },
  current: { group: 'flex-1 min-w-0 flex gap-2', share: 'flex-1 min-w-0 h-12 whitespace-normal px-2 text-xs leading-tight font-bold sm:px-4 sm:text-sm',
    start: 'flex-1 min-w-0 h-12 whitespace-normal px-2 text-xs leading-tight font-bold sm:px-4 sm:text-base bg-emerald-600 hover:bg-emerald-500 text-black' }
};
const report = { status: 'running', declarations: { widths, positions, cases: 8, confirmations: 4, controls: ['old-style-dom', 'read-purity'] },
  scope: 'Actual built retired page, one complete ere saved boundary, eight geometry states and four genuine New Career/Cancel flows. No discard, Share action or natural-career claim.',
  qualifications: ['Full initial bootstrap draws and every measured raw draw value/caller are retained. In-document reads must consume no additional draw or change any saved byte.',
    'External transport is intercepted and recorded; web fonts are aborted and actual local/fallback fonts are measured.',
    'Legacy control classes come from actual canonical buttonVariants and cn exports, preserving every shared base class. No copied CVA implementation.',
    'Original failed Potential images lack footer rectangles. This fresh proof measures that separate row, and grants no Potential or full-suite credit.'],
  styles: { props }, cases: widths.flatMap(width => positions.map(position => ({ id: `${width}-${position}`, width, position, status: 'unstarted' }))),
  journeys: widths.map(width => ({ width, status: 'unstarted', errors: [], scopes: [], assets: [], external: [], steps: [] })), controls: [], errors: [], forwardedExternalRequests: 0 };
put('report', report);
const purityFindings = value => [value.beforeRaw !== value.afterRaw && 'raw-save', JSON.stringify(value.beforeDraws) !== JSON.stringify(value.afterDraws) && 'read-rng'].filter(Boolean);
const inside = (rect, bounds) => rect.x >= bounds.x - 1 && rect.y >= bounds.y - 1 && rect.right <= bounds.right + 1 && rect.bottom <= bounds.bottom + 1;
const fitFindings = value => {
  const viewport = { x: 0, y: 0, right: value.viewport.width, bottom: value.viewport.height }, controls = value.controls;
  const viewportFault = !inside(value.bar.rect, viewport) || !inside(value.group.rect, value.bar.rect) || controls.some(control => !inside(control.rect, value.bar.rect) || !inside(control.rect, viewport))
    || controls.some((control, i) => controls.slice(i + 1).some(other => Math.min(control.rect.right, other.rect.right) > Math.max(control.rect.x, other.rect.x) + 1 && Math.min(control.rect.bottom, other.rect.bottom) > Math.max(control.rect.y, other.rect.y) + 1));
  const labelFault = controls.some(control => control.scrollWidth > control.clientWidth + 1 || control.scrollHeight > control.clientHeight + 1
    || control.textNodes.some(node => node.text.trim() && node.rects.some(rect => !inside(rect, control.rect) || !inside(rect, viewport))));
  return [viewportFault && 'viewport-fit', labelFault && 'label-fit'].filter(Boolean);
};
let browser, oracleContext;
try {
  report.sourceBefore = source();
  const originalPage = execFileSync('git', ['cat-file', 'blob', `${BASE_HEAD}:${PAGE}`], { cwd: ROOT, maxBuffer: 1000000 });
  assert.equal(sha(originalPage), '6d7548e5e8446a3178a748b4a38694190a9249a3e076429cff04954b72b3a31a'); report.basePage = { commit: BASE_HEAD, ...bodyRef(originalPage, 'source') };
  const codeOnly = bytes => bytes.toString('utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const bindProps = (bytes, style) => { const block = `{career.phase === "retired" ? (\n          <div className="${style.group}">\n            <Button onClick={onShare} variant="outline" className="${style.share}">\n              📤 Share Legacy\n            </Button>\n            <Button onClick={onNewCareer} className="${style.start}">\n              ⚽ New Career\n            </Button>`;
    assert.equal(codeOnly(bytes).replaceAll('\r\n', '\n').split(block).length - 1, 1, 'Exact actual retired JSX, excluding comments'); };
  const currentPage = fs.readFileSync(path.join(ROOT, PAGE)); report.currentPage = bodyRef(currentPage, 'source');
  report.currentPageCanonicalSHA = sha(Buffer.from(currentPage.toString('utf8').replaceAll('\r\n', '\n')));
  assert.equal(report.currentPageCanonicalSHA, 'b06ecc7af7cfd75b7321c4ecae482ae924000969da27497e188f8b81f557e5eb');
  bindProps(originalPage, props.original); bindProps(currentPage, props.current);
  const fixtureBytes = fs.readFileSync(path.join(ROOT, FIXTURE)); report.fixture = bodyRef(fixtureBytes, 'fixture');
  const matches = JSON.parse(fixtureBytes).saves.filter(row => row.id === 'ere'); assert.equal(matches.length, 1);
  const input = copy(matches[0].state); assert.equal(input.phase, 'playing'); assert.equal(input.primeType, 'late');
  report.boundaryEdits = put('boundary-edits', ['retired', 'phase'].map(key => ({ key, existed: Object.hasOwn(input, key), before: Object.hasOwn(input, key) ? copy(input[key]) : null, after: key === 'retired' ? true : 'retired' })));
  input.retired = true; input.phase = 'retired'; report.input = put('whole-saved-input', input);
  const entry = "export {repairCareer} from './src/lib/soccerCareerEngine';export {isSoccerCareerSave} from './src/lib/soccerCareerSave';export {buttonVariants} from './src/components/ui/button';export {cn} from './src/lib/utils';";
  const defineExpression = '{"DEV":false,"PROD":true,"MODE":"production"}';
  const compiled = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'retirement-oracle.ts', loader: 'ts' }, bundle: true, write: false, metafile: true,
    platform: 'browser', format: 'iife', globalName: '__retirementOracle', alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': defineExpression }, logLevel: 'error' });
  report.oracleSource = { entry: bodyRef(Buffer.from(entry), 'source'), code: bodyRef(compiled.outputFiles[0].contents, 'js'), metafile: put('oracle-metafile', compiled.metafile), inputs: Object.keys(compiled.metafile.inputs).map(file => {
    if (file === 'retirement-oracle.ts') return { file, synthetic: true, ...bodyRef(Buffer.from(entry), 'source') };
    if (file === '<define:import.meta.env>') return { file, synthetic: true, kind: 'esbuild-define', metafileInput: copy(compiled.metafile.inputs[file]),
      declaredDefine: { name: 'import.meta.env', expression: bodyRef(Buffer.from(defineExpression), 'define-expression') }, scope: 'Declared expression and actual descriptor, not generated virtual-file bytes.' };
    assert(!file.startsWith('<'), 'Unknown virtual input fails closed'); const full = path.resolve(ROOT, file); assert(full.startsWith(`${ROOT}${path.sep}`)); return { file, ...bodyRef(fs.readFileSync(full), 'source') };
  }) };
  browser = await pw.chromium.launch({ headless: true }); oracleContext = await browser.newContext({ serviceWorkers: 'block' }); const oraclePage = await oracleContext.newPage(); await oraclePage.goto('about:blank');
  await oraclePage.addScriptTag({ content: compiled.outputFiles[0].text });
  const model = await oraclePage.evaluate(({ input, props }) => { const before = JSON.stringify(input), draws = [], nativeRandom = Math.random;
    Math.random = () => { const value = nativeRandom(); draws.push({ value, caller: new Error().stack }); return value; };
    try { const api = window.__retirementOracle, valid = api.isSoccerCareerSave(input), repaired = api.repairCareer(input), styles = {};
      for (const [kind, values] of Object.entries(props)) styles[kind] = { group: values.group, share: api.cn(api.buttonVariants({ variant: 'outline', className: values.share })), start: api.cn(api.buttonVariants({ className: values.start })) };
      return { valid, before, inputAfter: JSON.stringify(input), output: JSON.stringify(repaired), draws, styles };
    } finally { Math.random = nativeRandom; }
  }, { input: copy(input), props });
  report.model = put('actual-core-and-canonical-styles', model); assert.equal(model.valid, true); assert.equal(model.draws.length, 0); report.styles.fullClasses = model.styles;
  for (const width of widths) {
    const journey = report.journeys.find(row => row.width === width); journey.status = 'running'; let context, page;
    const pending = new Set();
    try {
      context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 900 }, hasTouch: width !== 1440, isMobile: width !== 1440, reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block',
        storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: KEY, value: JSON.stringify(input) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }, { name: 'rules-gate-seen:/soccer-career', value: '1' }] }] } });
      await context.exposeBinding('__retirementScope', ({ frame }, value) => journey.scopes.push({ ...value, frameUrl: frame.url() }));
      await context.addInitScript(({ origin, key }) => { const scope = { href: location.href, top: window === window.top, included: window === window.top && location.origin === origin };
        window.__retirementScopeReady = window.__retirementScope(scope); if (!scope.included) return;
        const evidence = window.__retirementEvidence = { scope, draws: [], storage: [] }, nativeRandom = Math.random, nativeGet = Storage.prototype.getItem;
        Math.random = () => { const value = nativeRandom(); evidence.draws.push({ value, caller: new Error().stack }); return value; };
        for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) { const native = Storage.prototype[method]; Storage.prototype[method] = function (...args) {
          if (this !== window.localStorage || method !== 'clear' && args[0] !== key) return native.apply(this, args);
          const row = { method, args, before: nativeGet.call(this, key), caller: new Error().stack }; evidence.storage.push(row);
          try { const result = native.apply(this, args); row.result = result === undefined ? '<undefined>' : result; row.after = nativeGet.call(this, key); return result; } catch (error) { row.error = String(error.stack || error); throw error; }
        }; }
      }, { origin: new URL(BASE).origin, key: KEY });
      await context.route('**/*', async route => { const request = route.request(), url = new URL(request.url()); if (url.origin === new URL(BASE).origin) { await route.continue(); return; }
        const row = { url: url.href, method: request.method(), type: request.resourceType(), body: request.postData(), headers: await request.allHeaders() }; journey.external.push(row);
        if (url.hostname.endsWith('.supabase.co')) { row.fixture = 'Empty recorded external read or acknowledgement'; await route.fulfill({ status: request.method() === 'OPTIONS' ? 204 : 200,
          headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': row.headers['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, contentType: 'application/json', body: request.method() === 'OPTIONS' ? '' : request.method() === 'GET' ? '[]' : '{}' }); }
        else { row.fixture = 'Aborted external resource, fallback font qualification'; await route.abort(); }
      });
      page = await context.newPage(); page.on('pageerror', error => journey.errors.push(String(error.stack || error)));
      page.on('response', response => { if (new URL(response.url()).origin !== new URL(BASE).origin) return; const asset = { url: response.url(), status: response.status(), method: response.request().method() }; journey.assets.push(asset);
        const promise = (async () => { try { const bytes = await response.body(); asset.body = bodyRef(bytes); const relative = decodeURIComponent(new URL(response.url()).pathname).replace(/^\/+/, ''), full = path.resolve(ROOT, 'dist', relative || 'index.html');
          assert(full.startsWith(`${path.resolve(ROOT, 'dist')}${path.sep}`)); const disk = fs.existsSync(full) && fs.statSync(full).isDirectory() ? path.join(full, 'index.html') : full;
          assert.equal(response.status(), 200); assert(fs.existsSync(disk)); const built = fs.readFileSync(disk); asset.built = { file: path.relative(ROOT, disk), ...bodyRef(built) }; assert(bytes.equals(built));
        } catch (error) { asset.error = String(error.stack || error); } })(); pending.add(promise); promise.finally(() => pending.delete(promise));
      });
      const state = () => page.evaluate(async key => { await window.__retirementScopeReady; return { raw: localStorage.getItem(key), evidence: window.__retirementEvidence, scrollX, scrollY, active: document.activeElement?.outerHTML }; }, KEY);
      const read = async (name, operation) => { const before = await state(), item = { name, status: 'running', before: put(`${width}-${name}-before`, before) }; journey.steps.push(item);
        try { const result = await operation(); item.result = result === undefined ? { kind: 'undefined' } : { kind: 'json', body: put(`${width}-${name}-result`, result) };
          const after = await state(); item.after = put(`${width}-${name}-after`, after); const witness = { beforeRaw: before.raw, afterRaw: after.raw, beforeDraws: before.evidence.draws, afterDraws: after.evidence.draws };
          item.purity = put(`${width}-${name}-purity`, witness); assert.deepEqual(purityFindings(witness), []); item.status = 'pass'; return { result, witness };
        } catch (error) { item.error = String(error.stack || error); throw error; } };
      const bar = () => page.locator('[data-career-action-bar="floating"]');
      const measure = () => bar().evaluate(async element => {
        const box = node => { const style = getComputedStyle(node), rect = node.getBoundingClientRect().toJSON(), textNodes = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let child;
          while ((child = walker.nextNode())) { const range = document.createRange(); range.selectNodeContents(child); textNodes.push({ text: child.nodeValue, rects: Array.from(range.getClientRects(), rect => rect.toJSON()) }); }
          const points = [[rect.x + rect.width / 2, rect.y + rect.height / 2], [rect.x + rect.width / 4, rect.y + rect.height / 4], [rect.x + rect.width * 3 / 4, rect.y + rect.height * 3 / 4]].map(([x, y]) => { const hit = document.elementFromPoint(x, y); return { x, y, painted: !!hit && (node === hit || node.contains(hit)) }; });
          return { rect, className: node.className, html: node.outerHTML, text: node.innerText, textNodes, points, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, clientHeight: node.clientHeight, scrollHeight: node.scrollHeight,
            style: { minWidth: style.minWidth, whiteSpace: style.whiteSpace, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight, font: style.font, lineHeight: style.lineHeight, position: style.position, opacity: style.opacity, visibility: style.visibility, display: style.display } }; };
        let previous, stable = 0, value;
        for (let frame = 0; frame < 240; frame++) { await new Promise(resolve => requestAnimationFrame(resolve)); const group = element.firstElementChild, buttons = Array.from(group.querySelectorAll('button')), age = element.lastElementChild;
          if (buttons.length !== 2) throw new Error('Actual retired button count differs'); const foot = document.querySelector('footer'), ancestors = [];
          for (let node = element; node; node = node.parentElement) { const css = getComputedStyle(node); ancestors.push({ tag: node.tagName, className: node.className, display: css.display, visibility: css.visibility, opacity: css.opacity }); }
          const finite = document.getAnimations().filter(animation => animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime)).length;
          value = { bar: box(element), group: box(group), controls: [...buttons, age].map(box), footer: foot?.getBoundingClientRect().toJSON(), ancestors, finite,
            viewport: { width: innerWidth, height: innerHeight, scale: visualViewport?.scale ?? 1 }, document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
            scrollX, scrollY, fonts: { ready: document.fonts.status === 'loaded', faces: Array.from(document.fonts, font => ({ family: font.family, status: font.status })) } };
          const signature = JSON.stringify(value); stable = signature === previous ? stable + 1 : 1; previous = signature; if (stable >= 4 && finite === 0) return { ...value, stableFrames: stable };
        } return { ...value, stableFrames: stable };
      });
      const requireHealthy = observed => { assert.deepEqual(fitFindings(observed), []); assert.equal(observed.bar.style.position, 'fixed'); assert(observed.stableFrames >= 4); assert.equal(observed.finite, 0); assert.equal(observed.fonts.ready, true);
        assert(observed.ancestors.every(layer => layer.display !== 'none' && layer.visibility === 'visible' && Number(layer.opacity) === 1)); assert(observed.controls.every(control => control.points.every(point => point.painted)));
        assert(observed.controls.slice(0, 2).every(control => control.rect.height >= 44)); assert(observed.controls[0].text.includes('Share Legacy')); assert(observed.controls[1].text.includes('New Career'));
        const ageText = observed.controls[2].text.trim().split(/\s+/); assert.equal(ageText[0], String(JSON.parse(model.output).age)); assert.equal(ageText[1].toLowerCase(), 'age'); assert.equal(ageText.length, 2);
        assert.equal(observed.group.className, model.styles.current.group); assert.equal(observed.controls[0].className, model.styles.current.share); assert.equal(observed.controls[1].className, model.styles.current.start); };
      const capture = async (name, observed) => { const png = path.join(OUT, `${name}.png`); await page.screenshot({ path: png }); return { observation: put(`${name}-geometry`, observed), png: { path: path.basename(png), bytes: fs.statSync(png).size, sha256: sha(fs.readFileSync(png)) } }; };
      await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'How to play', exact: true }).waitFor({ timeout: 45000 });
      await page.waitForFunction(({ key, raw }) => localStorage.getItem(key) === raw, { key: KEY, raw: model.output }); await page.evaluate(() => document.fonts.ready);
      assert.equal(await bar().count(), 1); journey.loaded = put(`${width}-loaded`, await state()); assert.equal((await state()).raw, model.output);
      for (const position of positions) { const row = report.cases.find(row => row.id === `${width}-${position}`); Object.assign(row, { status: 'running', loaded: journey.loaded, model: report.model });
        await read(`${position}-scroll`, async () => page.evaluate(position => scrollTo(0, position === 'top' ? 0 : document.documentElement.scrollHeight), position));
        const measured = await read(`${position}-geometry`, measure); row.capture = await capture(row.id, measured.result); row.purity = put(`${row.id}-purity`, measured.witness); requireHealthy(measured.result);
        if (position === 'top') {
          const confirmation = { status: 'running' }; journey.confirmation = confirmation;
          await read('open-confirmation', async () => { await bar().locator('button').nth(1).click(); await page.getByRole('dialog', { name: 'Start a new career?', exact: true }).waitFor(); });
          confirmation.openState = put(`${width}-confirmation-open-state`, await state()); confirmation.html = bodyRef(Buffer.from(await page.getByRole('dialog', { name: 'Start a new career?', exact: true }).evaluate(node => node.outerHTML)), 'html');
          const dialogPNG = path.join(OUT, `${width}-confirmation.png`); await page.screenshot({ path: dialogPNG }); confirmation.png = { path: path.basename(dialogPNG), bytes: fs.statSync(dialogPNG).size, sha256: sha(fs.readFileSync(dialogPNG)) };
          await read('cancel-confirmation', async () => { await page.getByRole('dialog', { name: 'Start a new career?', exact: true }).getByRole('button', { name: 'Cancel', exact: true }).click(); await page.getByRole('dialog', { name: 'Start a new career?', exact: true }).waitFor({ state: 'hidden' }); });
          confirmation.closedState = put(`${width}-confirmation-closed-state`, await state()); requireHealthy((await read('after-cancel-geometry', measure)).result); confirmation.status = 'pass';
          if (width === 320) {
            const actual = (await read('control-actual-geometry', measure)).result, control = { id: 'old-style-dom', status: 'running', actual: put('old-style-actual', actual), canonicalClasses: report.model }; report.controls.push(control); let changed = false;
            try { control.beforeDOM = bodyRef(Buffer.from(await bar().evaluate(node => node.outerHTML)), 'html');
              changed = true; control.mutationAttempted = true;
              control.mutation = put('old-style-mutation', (await read('control-legacy-classes', () => bar().evaluate((node, styles) => { const group = node.firstElementChild, buttons = Array.from(group.querySelectorAll('button')), actual = { group: group.className, share: buttons[0].className, start: buttons[1].className };
                for (const key of Object.keys(actual)) if (actual[key] !== styles.current[key]) throw new Error('Current canonical class guard differs'); group.className = styles.original.group; buttons[0].className = styles.original.share; buttons[1].className = styles.original.start;
                return { actual, fault: { group: group.className, share: buttons[0].className, start: buttons[1].className }, html: node.outerHTML }; }, model.styles))).result);
              const fault = (await read('control-legacy-geometry', measure)).result; control.fault = put('old-style-fault', fault); control.findings = fitFindings(fault); control.faultCapture = await capture('320-old-style-fault', fault);
              assert.notDeepEqual(fault.controls.map(value => value.rect), actual.controls.map(value => value.rect), 'Legacy styles changed actual measured boxes'); assert(control.findings.length > 0, 'Legacy styles must fail the actual fit detector');
            } catch (error) { control.error = String(error.stack || error); throw error; }
            finally { if (changed) { try { control.reversal = put('old-style-reversal', (await read('control-restore-classes', () => bar().evaluate((node, styles) => { const group = node.firstElementChild, buttons = Array.from(group.querySelectorAll('button'));
                for (const [key, value] of Object.entries({ group: group.className, share: buttons[0].className, start: buttons[1].className })) if (value !== styles.original[key] && value !== styles.current[key]) throw new Error('Do not overwrite an unexpected DOM class');
                group.className = styles.current.group; buttons[0].className = styles.current.share; buttons[1].className = styles.current.start; return { classes: { group: group.className, share: buttons[0].className, start: buttons[1].className }, html: node.outerHTML }; }, model.styles))).result);
              control.reverseApplied = true; control.undoDOM = bodyRef(Buffer.from(await bar().evaluate(node => node.outerHTML)), 'html'); assert.deepEqual(control.undoDOM, control.beforeDOM);
              const undo = (await read('control-restored-geometry', measure)).result; control.undo = put('old-style-undo', undo); assert.deepEqual(undo, actual); requireHealthy(undo);
              } catch (error) { control.reversalError = String(error.stack || error); throw error; } }
            } control.status = 'pass';
            const pure = measured.witness, fault = copy(pure), copied = { id: 'read-purity', status: 'running', actual: put('read-purity-actual', pure) }; report.controls.push(copied);
            fault.afterRaw += ' '; fault.afterDraws.push({ value: 0.25, caller: 'labelled copied observation only' }); copied.fault = put('read-purity-fault', fault); assert.notDeepEqual(fault, pure);
            copied.findings = purityFindings(fault); assert.deepEqual(copied.findings, ['raw-save', 'read-rng']); assert.equal(fault.afterRaw, `${pure.afterRaw} `); assert.deepEqual(fault.afterDraws.at(-1), { value: 0.25, caller: 'labelled copied observation only' });
            fault.afterRaw = fault.afterRaw.slice(0, -1); fault.afterDraws.pop(); copied.undo = put('read-purity-undo', fault); copied.reverseApplied = true; assert.deepEqual(fault, pure); assert.deepEqual(purityFindings(fault), []); assert.equal(copied.actual.sha256, copied.undo.sha256); copied.status = 'pass';
          }
        } row.status = 'pass'; console.log(`PASS ${row.id}: full retired labels, age and read purity`);
      } journey.status = 'pass';
    } catch (error) { journey.status = 'fail'; journey.error = String(error.stack || error); report.errors.push({ width, error: journey.error }); for (const row of report.cases.filter(row => row.width === width && row.status === 'running')) { row.status = 'fail'; row.error = journey.error; }
      if (page) { journey.failureState = put(`${width}-failure-state`, await page.evaluate(key => ({ raw: localStorage.getItem(key), evidence: window.__retirementEvidence }), KEY).catch(error => ({ error: String(error.stack || error) })));
        try { const png = path.join(OUT, `${width}-failure.png`); await page.screenshot({ path: png }); journey.failurePNG = { path: path.basename(png), bytes: fs.statSync(png).size, sha256: sha(fs.readFileSync(png)) }; } catch (error) { journey.failureCaptureError = String(error.stack || error); } }
    } finally { while (pending.size) await Promise.all([...pending]); if (page) journey.finalState = put(`${width}-final-state`, await page.evaluate(key => ({ raw: localStorage.getItem(key), evidence: window.__retirementEvidence, scrollX, scrollY }), KEY).catch(error => ({ error: String(error.stack || error) })));
      try { if (context) await context.close(); } catch (error) { journey.status = 'fail'; journey.contextCloseError = String(error.stack || error); report.errors.push({ width, contextClose: journey.contextCloseError }); }
      while (pending.size) await Promise.all([...pending]); if (journey.errors.length || journey.assets.some(asset => asset.error)) { journey.status = 'fail'; report.errors.push({ width, pageErrors: journey.errors, assetErrors: journey.assets.filter(asset => asset.error) }); } put('report', report); }
  }
  assert.deepEqual(report.cases.map(row => row.id), widths.flatMap(width => positions.map(position => `${width}-${position}`))); assert(report.cases.every(row => row.status === 'pass'));
  assert.equal(report.journeys.length, 4); assert(report.journeys.every(row => row.status === 'pass' && row.confirmation?.status === 'pass' && row.scopes.some(scope => scope.included && scope.top)));
  assert.deepEqual(report.controls.map(row => row.id), ['old-style-dom', 'read-purity']); assert(report.controls.every(row => row.status === 'pass' && row.reverseApplied === true)); assert.equal(report.errors.length, 0); report.status = 'pass';
} catch (error) { report.status = 'fail'; report.errors.push({ fatal: String(error.stack || error) }); }
finally {
  try { report.sourceAfter = source(); assert.deepEqual(report.sourceAfter, report.sourceBefore); } catch (error) { report.status = 'fail'; report.errors.push({ sourceAfter: String(error.stack || error) }); }
  try { if (oracleContext) await oracleContext.close(); } catch (error) { report.status = 'fail'; report.errors.push({ oracleClose: String(error.stack || error) }); }
  try { if (browser) await browser.close(); } catch (error) { report.status = 'fail'; report.errors.push({ browserClose: String(error.stack || error) }); } put('report', report);
}
console.log(`Retirement action states: ${report.cases.filter(row => row.status === 'pass').length}/8 declared.`);
console.log(`Retirement confirmations: ${report.journeys.filter(row => row.confirmation?.status === 'pass').length}/4 actual Cancel flows.`);
console.log(`Retirement controls: ${report.controls.filter(row => row.status === 'pass').length}/2 effective with full undo.`);
console.log(`${report.status === 'pass' ? 'PASS' : 'FAIL'} Soccer retirement actions browser`); if (report.status !== 'pass') process.exitCode = 1;
