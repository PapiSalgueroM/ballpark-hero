// Remote saved-boundary dialog proof. Never confirms deletion or claims footer fit.
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
const OUT = path.resolve(ROOT, process.env.SOCCER_NEW_CAREER_BROWSER_OUT || 'new-career-dialog-artifacts/browser');
const BASE = process.env.BASE || process.env.SWEEP_BASE;
assert(BASE && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(BASE).hostname));
assert(!fs.existsSync(OUT), 'Fresh evidence directory required'); fs.mkdirSync(OUT, { recursive: true });
const PAGE = 'src/pages/SoccerCareer.tsx', FIXTURE = 'scripts/data/careerLeagueWorldSaves1100.json', KEY = 'soccerCareerSave';
const HEAD = '4a5f759aeab6d0e7b8d29e55d3cd624c8ad20c54', widths = [320, 390, 430, 1440];
const props = { original: 'flex gap-3', current: 'flex flex-col gap-3 sm:flex-row', originalCancel: 'flex-1 h-10 font-bold', originalDiscard: 'flex-1 h-10 font-bold bg-red-600 hover:bg-red-500 text-black', cancel: 'flex-none sm:flex-1 h-10 font-bold', discard: 'flex-none sm:flex-1 h-10 font-bold bg-red-600 hover:bg-red-500 text-black' };
const sha = value => createHash('sha256').update(value).digest('hex'), copy = value => JSON.parse(JSON.stringify(value));
const fileRef = (name, value) => { const body = Buffer.from(value); fs.mkdirSync(path.dirname(path.join(OUT, name)), { recursive: true }); fs.writeFileSync(path.join(OUT, name), body); return { path: name, bytes: body.length, sha256: sha(body) }; };
const put = (name, value) => fileRef(`${name}.json`, JSON.stringify(value, null, 2));
const bodyRef = (value, suffix = 'bin') => { const body = Buffer.from(value), name = `bodies/${sha(body)}.${suffix}`; if (fs.existsSync(path.join(OUT, name))) assert(fs.readFileSync(path.join(OUT, name)).equals(body)); return fileRef(name, body); };
const sourceFiles = [PAGE, 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts', 'src/components/ui/button.tsx', 'src/lib/utils.ts', FIXTURE,
  'scripts/lib/offlineTransport.cjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/hostLikeServer.mjs', 'package.json', 'package-lock.json', 'scripts/qa/soccerNewCareerDialogBrowser.mjs'];
const source = () => sourceFiles.map(file => ({ file, ...bodyRef(fs.readFileSync(path.join(ROOT, file)), 'source') }));
const inside = (rect, bounds) => rect.x >= bounds.x - 1 && rect.y >= bounds.y - 1 && rect.right <= bounds.right + 1 && rect.bottom <= bounds.bottom + 1;
const fitFindings = value => {
  const viewport = { x: 0, y: 0, right: value.viewport.width, bottom: value.viewport.height }, items = [value.heading, value.warning, ...value.buttons];
  const fault = !inside(value.dialog.rect, viewport) || !inside(value.group.rect, value.dialog.rect) || value.buttons.some(item => !inside(item.rect, value.group.rect)) || items.some(item => !inside(item.rect, value.dialog.rect) || !inside(item.rect, viewport)
    || item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1 || item.textNodes.some(node => node.text.trim() && node.rects.some(rect => !inside(rect, item.rect) || !inside(rect, value.dialog.rect) || !inside(rect, viewport))))
    || items.some((item, i) => items.slice(i + 1).some(other => Math.min(item.rect.right, other.rect.right) > Math.max(item.rect.x, other.rect.x) + 1 && Math.min(item.rect.bottom, other.rect.bottom) > Math.max(item.rect.y, other.rect.y) + 1))
    || [value.dialog, value.group, ...items].some(item => Object.values(item.rect).some(number => !Number.isFinite(number)) || item.rect.width <= 0 || item.rect.height <= 0 || item.style.display === 'none' || item.style.visibility !== 'visible' || Number(item.style.opacity) !== 1)
    || value.buttons.some(item => item.points.some(point => !point.painted)) || value.ancestors.some(layer => layer.display === 'none' || layer.visibility !== 'visible' || Number(layer.opacity) !== 1);
  return fault ? ['modal-action-fit'] : [];
};
const purityFindings = value => [value.beforeRaw !== value.afterRaw && 'raw-save', JSON.stringify(value.beforeDraws) !== JSON.stringify(value.afterDraws) && 'read-rng'].filter(Boolean);
const report = { status: 'running', declarations: { widths, cases: 4, controls: ['original-dialog-320', 'read-purity'], pngs: 5 },
  scope: 'Actual built page with the complete ere fixture and two explicit retired boundary edits. Four actual dialog open/Cancel flows only. No delete, Share, footer-fit, natural-career or full accessibility claim.',
  qualifications: ['Initial bootstrap draws and all measured values/callers remain complete. Only in-document open/measurement/style-control/Cancel reads must consume no additional draws or change saved bytes.',
    'External transport is intercepted, retained and never forwarded. Web fonts are aborted; actual fallback font readiness is measured.',
    'Both existing h10 buttons use phone flex-none and desktop sm:flex-1. The old-style control restores the original group and both full canonical CVA button classes. There is no 44px rule.',
    'Oracle node_modules inputs are observed installed dependency bodies, not canonical Git source or an exhaustive installed-file census.'],
  props, cases: widths.map(width => ({ id: String(width), width, status: 'unstarted', steps: [], scopes: [], assets: [], external: [], errors: [] })), controls: [], errors: [], forwardedExternalRequests: 0 };
put('report', report);
let browser, oracleContext;
try {
  report.sourceBefore = source();
  const original = execFileSync('git', ['cat-file', 'blob', `${HEAD}:${PAGE}`], { cwd: ROOT, maxBuffer: 1000000 }), current = fs.readFileSync(path.join(ROOT, PAGE));
  report.page = { commit: HEAD, original: bodyRef(original, 'source'), current: bodyRef(current, 'source'), canonicalSHA: sha(Buffer.from(current.toString('utf8').replaceAll('\r\n', '\n'))) };
  assert.equal(sha(original), '09107b95f228ec8ab5b153b9eac7f0ce3091974789f812986ca83f0bc2b72efc'); assert.equal(report.page.canonicalSHA, '23003dbda5dc5f96bc168d4183d8bb508c79ab196b2da3649ff8982c9ed93e6a');
  const block = (group, cancel, discard) => `            <div className="${group}">\n              <Button onClick={() => setShowNewCareerConfirm(false)} variant="outline" className="${cancel}">Cancel</Button>\n              <Button onClick={handleConfirmNewCareer} className="${discard}">Delete & Start Over</Button>`;
  const edits = [{from:block(props.original,props.originalCancel,props.originalDiscard),to:block(props.current,props.originalCancel,props.originalDiscard)},
    {from:`<Button onClick={() => setShowNewCareerConfirm(false)} variant="outline" className="${props.originalCancel}">Cancel</Button>`,to:`<Button onClick={() => setShowNewCareerConfirm(false)} variant="outline" className="${props.cancel}">Cancel</Button>`},
    {from:`<Button onClick={handleConfirmNewCareer} className="${props.originalDiscard}">Delete & Start Over</Button>`,to:`<Button onClick={handleConfirmNewCareer} className="${props.discard}">Delete & Start Over</Button>`}];
  const before=original.toString('utf8'),after=current.toString('utf8').replaceAll('\r\n','\n');let forward=before,reverse=after;
  for(const edit of edits){assert.equal(forward.split(edit.from).length-1,1);forward=forward.replace(edit.from,edit.to);}for(const edit of [...edits].reverse()){assert.equal(reverse.split(edit.to).length-1,1);reverse=reverse.replace(edit.to,edit.from);}assert.equal(forward,after);assert.equal(reverse,before);report.page.edits=put('page-edits',edits);
  const fixture = fs.readFileSync(path.join(ROOT, FIXTURE)); report.fixture = bodyRef(fixture, 'fixture'); const selected = JSON.parse(fixture).saves.filter(row => row.id === 'ere'); assert.equal(selected.length, 1);
  const input = copy(selected[0].state); assert.equal(input.phase, 'playing'); assert.equal(input.primeType, 'late');
  report.boundaryEdits = put('boundary-edits', ['retired', 'phase'].map(key => ({ key, existed: Object.hasOwn(input, key), before: Object.hasOwn(input, key) ? copy(input[key]) : null, after: key === 'retired' ? true : 'retired' })));
  input.retired = true; input.phase = 'retired'; report.input = put('whole-saved-input', input);
  const entry = "export {repairCareer} from './src/lib/soccerCareerEngine';export {isSoccerCareerSave} from './src/lib/soccerCareerSave';export {buttonVariants} from './src/components/ui/button';export {cn} from './src/lib/utils';", expression = '{"DEV":false,"PROD":true,"MODE":"production"}';
  const compiled = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'new-career-oracle.ts', loader: 'ts' }, bundle: true, write: false, metafile: true, platform: 'browser', format: 'iife', globalName: '__newCareerOracle', alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': expression }, logLevel: 'error' });
  assert.equal(compiled.outputFiles.length, 1); report.oracleSource = { entry: bodyRef(Buffer.from(entry), 'source'), code: bodyRef(compiled.outputFiles[0].contents, 'js'), metafile: put('oracle-metafile', compiled.metafile), inputs: Object.keys(compiled.metafile.inputs).map(file => {
    if (file === 'new-career-oracle.ts') return { file, synthetic: true, ...bodyRef(Buffer.from(entry), 'source') };
    if (file === '<define:import.meta.env>') return { file, synthetic: true, kind: 'esbuild-define', metafileInput: copy(compiled.metafile.inputs[file]), declaredDefine: { name: 'import.meta.env', expression: bodyRef(Buffer.from(expression), 'define-expression') }, scope: 'Declared expression and actual descriptor, not generated virtual-file bytes.' };
    assert(!file.startsWith('<'), 'Unknown virtual input fails closed'); const full = path.resolve(ROOT, file); assert(full.startsWith(`${ROOT}${path.sep}`)); return { file, ...bodyRef(fs.readFileSync(full), 'source') };
  }) };
  browser = await pw.chromium.launch({ headless: true }); oracleContext = await browser.newContext({ serviceWorkers: 'block' }); const oraclePage = await oracleContext.newPage(); await oraclePage.goto('about:blank'); await oraclePage.addScriptTag({ content: compiled.outputFiles[0].text });
  const model = await oraclePage.evaluate(({ input, props }) => { const before = JSON.stringify(input), draws = [], nativeRandom = Math.random; Math.random = () => { const value = nativeRandom(); draws.push({ value, caller: new Error().stack }); return value; };
    try { const api = window.__newCareerOracle, valid = api.isSoccerCareerSave(input), output = JSON.stringify(api.repairCareer(input)); return { valid, before, inputAfter: JSON.stringify(input), output, draws,
      classes: { cancel: api.cn(api.buttonVariants({ variant: 'outline', className: props.cancel })), discard: api.cn(api.buttonVariants({ className: props.discard })), originalCancel: api.cn(api.buttonVariants({ variant: 'outline', className: props.originalCancel })), originalDiscard: api.cn(api.buttonVariants({ className: props.originalDiscard })) } }; } finally { Math.random = nativeRandom; }
  }, { input: copy(input), props });
  report.model = put('actual-core-and-button-styles', model); assert.equal(model.valid, true); assert.equal(model.inputAfter, model.output); assert.equal(model.draws.length, 0);
  for (const row of report.cases) {
    row.status = 'running'; let context, page; const pending = new Set();
    try {
      context = await browser.newContext({ viewport: { width: row.width, height: row.width === 1440 ? 1000 : 900 }, hasTouch: row.width !== 1440, isMobile: row.width !== 1440, reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block',
        storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: KEY, value: JSON.stringify(input) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }, { name: 'rules-gate-seen:/soccer-career', value: '1' }] }] } });
      await context.exposeBinding('__newCareerScope', ({ frame }, value) => row.scopes.push({ ...value, frameUrl: frame.url() }));
      await context.addInitScript(({ origin, key }) => { const scope = { href: location.href, top: window === window.top, included: window === window.top && location.origin === origin }; window.__newCareerReady = window.__newCareerScope(scope); if (!scope.included) return;
        const evidence = window.__newCareerEvidence = { scope, draws: [], storage: [] }, random = Math.random, get = Storage.prototype.getItem;
        Math.random = () => { const value = random(); evidence.draws.push({ value, caller: new Error().stack }); return value; };
        for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) { const native = Storage.prototype[method]; Storage.prototype[method] = function (...args) { if (this !== window.localStorage || method !== 'clear' && args[0] !== key) return native.apply(this, args);
          const item = { method, args, before: get.call(this, key), caller: new Error().stack }; evidence.storage.push(item); try { const result = native.apply(this, args); item.result = result === undefined ? '<undefined>' : result; item.after = get.call(this, key); return result; } catch (error) { item.error = String(error.stack || error); throw error; } }; }
      }, { origin: new URL(BASE).origin, key: KEY });
      await context.route('**/*', async route => { const request = route.request(), url = new URL(request.url()); if (url.origin === new URL(BASE).origin) { await route.continue(); return; }
        const item = { url: url.href, method: request.method(), type: request.resourceType(), body: request.postData(), headers: await request.allHeaders() }; row.external.push(item);
        if (url.hostname.endsWith('.supabase.co')) { item.fixture = 'Empty external read or acknowledgement'; await route.fulfill({ status: request.method() === 'OPTIONS' ? 204 : 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': item.headers['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, contentType: 'application/json', body: request.method() === 'OPTIONS' ? '' : request.method() === 'GET' ? '[]' : '{}' }); }
        else { item.fixture = 'Aborted external resource; fallback fonts'; await route.abort(); }
      });
      page = await context.newPage(); page.on('pageerror', error => row.errors.push(String(error.stack || error)));
      page.on('response', response => { if (new URL(response.url()).origin !== new URL(BASE).origin) return; const asset = { url: response.url(), status: response.status(), method: response.request().method() }; row.assets.push(asset);
        const promise = (async () => { try { const bytes = await response.body(); asset.body = bodyRef(bytes); const relative = decodeURIComponent(new URL(response.url()).pathname).replace(/^\/+/, ''), full = path.resolve(ROOT, 'dist', relative || 'index.html'); assert(full.startsWith(`${path.resolve(ROOT, 'dist')}${path.sep}`));
          const disk = fs.existsSync(full) && fs.statSync(full).isDirectory() ? path.join(full, 'index.html') : full; assert.equal(response.status(), 200); assert(fs.existsSync(disk)); const built = fs.readFileSync(disk); asset.built = { file: path.relative(ROOT, disk), ...bodyRef(built) }; assert(bytes.equals(built)); } catch (error) { asset.error = String(error.stack || error); } })(); pending.add(promise); promise.finally(() => pending.delete(promise));
      });
      const state = () => page.evaluate(async key => { await window.__newCareerReady; return { raw: localStorage.getItem(key), evidence: window.__newCareerEvidence, scrollX, scrollY, active: document.activeElement?.outerHTML,
        confirmationCount: document.querySelectorAll('[role="dialog"][aria-label="Start a new career?"]').length }; }, KEY);
      const read = async (name, operation) => { const before = await state(), step = { name, status: 'running', before: put(`${row.id}-${name}-before`, before) }; row.steps.push(step); let result;
        try { result = await operation(); step.result = result === undefined ? { kind: 'undefined' } : { kind: 'json', body: put(`${row.id}-${name}-result`, result) }; }
        catch (error) { step.error = String(error.stack || error); throw error; }
        finally { try { const after = await state(), witness = { beforeRaw: before.raw, afterRaw: after.raw, beforeDraws: before.evidence.draws, afterDraws: after.evidence.draws }; step.after = put(`${row.id}-${name}-after`, after); step.purity = put(`${row.id}-${name}-purity`, witness); step.findings = purityFindings(witness); assert.deepEqual(step.findings, []); step.status = step.error ? 'fail' : 'pass'; } catch (error) { step.status = 'fail'; step.retentionError = String(error.stack || error); throw error; } } return result;
      };
      const dialog = () => page.getByRole('dialog', { name: 'Start a new career?', exact: true });
      const measure = () => dialog().evaluate(async node => {
        const box = element => { const style = getComputedStyle(element), rect = element.getBoundingClientRect().toJSON(), textNodes = [], walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT); let child;
          while ((child = walker.nextNode())) { const range = document.createRange(); range.selectNodeContents(child); textNodes.push({ text: child.nodeValue, rects: Array.from(range.getClientRects(), rect => rect.toJSON()) }); }
          const points = [[.5, .5], [.25, .25], [.75, .75]].map(([x, y]) => { x = rect.x + rect.width * x; y = rect.y + rect.height * y; const hit = document.elementFromPoint(x, y); return { x, y, painted: !!hit && (element === hit || element.contains(hit)) }; });
          return { rect, className: element.className, html: element.outerHTML, text: element.innerText, textNodes, points, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
            style: { display: style.display, visibility: style.visibility, opacity: style.opacity, font: style.font, whiteSpace: style.whiteSpace, flexDirection: style.flexDirection, gap: style.gap } }; };
        let previous, stable = 0, value;
        for (let frame = 0; frame < 240; frame++) { await new Promise(resolve => requestAnimationFrame(resolve)); const buttons = Array.from(node.querySelectorAll('button')); if (buttons.length !== 2 || buttons[0].parentElement !== buttons[1].parentElement) throw new Error('Actual confirmation action group differs');
          const ancestors = []; for (let layer = node; layer; layer = layer.parentElement) { const css = getComputedStyle(layer); ancestors.push({ tag: layer.tagName, className: layer.className, display: css.display, visibility: css.visibility, opacity: css.opacity }); }
          const finite = document.getAnimations().filter(animation => animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime)).length;
          value = { dialog: box(node), heading: box(node.querySelector('h3')), warning: box(node.querySelector('p')), group: box(buttons[0].parentElement), buttons: buttons.map(box), ancestors, finite,
            viewport: { width: innerWidth, height: innerHeight, scale: visualViewport?.scale ?? 1 }, scrollX, scrollY, fonts: { ready: document.fonts.status === 'loaded', faces: Array.from(document.fonts, font => ({ family: font.family, status: font.status })) } };
          const signature = JSON.stringify(value); stable = signature === previous ? stable + 1 : 1; previous = signature; if (stable >= 4 && finite === 0) return { ...value, stableFrames: stable };
        } return { ...value, stableFrames: stable };
      });
      const healthy = value => { assert.deepEqual(fitFindings(value), []); assert(value.stableFrames >= 4); assert.equal(value.finite, 0); assert.equal(value.fonts.ready, true);
        assert.equal(value.heading.text, '⚠️ Start New Career?'); assert.equal(value.warning.text, 'Are you sure? This will delete your current career. All progress will be lost forever.'); assert.deepEqual(value.buttons.map(item => item.text), ['Cancel', 'Delete & Start Over']);
        assert.equal(value.group.className, props.current); assert.deepEqual(value.buttons.map(item => item.className), [model.classes.cancel, model.classes.discard]); assert(value.buttons.every(item => Math.abs(item.rect.height - 40) <= 1)); };
      const capture = async (name, value) => { const png = path.join(OUT, `${name}.png`); await page.screenshot({ path: png }); return { geometry: put(`${name}-geometry`, value), png: { path: path.basename(png), bytes: fs.statSync(png).size, sha256: sha(fs.readFileSync(png)) } }; };
      await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'How to play', exact: true }).waitFor({ timeout: 45000 });
      await page.waitForFunction(({ key, raw }) => localStorage.getItem(key) === raw, { key: KEY, raw: model.output }); await page.evaluate(() => document.fonts.ready); row.loaded = put(`${row.id}-loaded`, await state()); assert.equal((await state()).raw, model.output);
      await read('open', async () => { await page.locator('[data-career-action-bar="floating"]').getByRole('button', { name: '⚽ New Career', exact: true }).click(); await dialog().waitFor(); });
      const actual = await read('measure', measure); row.capture = await capture(`${row.id}-dialog`, actual); row.open = put(`${row.id}-open`, await state()); healthy(actual);
      if (row.width === 320) {
        const control = { id: 'original-dialog-320', status: 'running', actual: put('original-group-actual', actual), beforeDOM: bodyRef(Buffer.from(actual.dialog.html), 'html') }; report.controls.push(control); let changed = false;
        try { changed = true; control.mutation = put('original-group-mutation', await read('legacy-group', () => dialog().evaluate((node, value) => { const buttons=Array.from(node.querySelectorAll('button')),group=buttons[0]?.parentElement,current=[value.classes.cancel,value.classes.discard],original=[value.classes.originalCancel,value.classes.originalDiscard];if(buttons.length!==2||buttons[1].parentElement!==group||group.className!==value.props.current||buttons.some((button,index)=>button.className!==current[index]))throw new Error('Current group or complete button classes differ');const before={group:group.className,buttons:buttons.map(button=>button.className)};group.className=value.props.original;buttons.forEach((button,index)=>{button.className=original[index];});const after={group:group.className,buttons:buttons.map(button=>button.className)};return {before,after,changed:[before.group!==after.group,...before.buttons.map((name,index)=>name!==after.buttons[index])],html:node.outerHTML}; }, {props,classes:model.classes})));
          assert.deepEqual(JSON.parse(fs.readFileSync(path.join(OUT,control.mutation.path))).changed,[true,true,true]);
          const fault = await read('legacy-measure', measure); control.fault = put('original-group-fault', fault); control.faultCapture = await capture('320-original-group-fault', fault); control.findings = fitFindings(fault);
          assert.notEqual(fault.dialog.html, actual.dialog.html); assert.notDeepEqual(fault.buttons.map(item => item.rect), actual.buttons.map(item => item.rect)); assert.deepEqual(fault.buttons.map(item => item.className), [model.classes.originalCancel,model.classes.originalDiscard]);assert(actual.buttons.every((item,index)=>item.className!==fault.buttons[index].className)); assert.deepEqual(control.findings, ['modal-action-fit']);
        } finally { if (changed) { control.reversal = put('original-group-reversal', await read('restore-group', () => dialog().evaluate((node, value) => { const buttons=Array.from(node.querySelectorAll('button')),group=buttons[0]?.parentElement,current=[value.classes.cancel,value.classes.discard],original=[value.classes.originalCancel,value.classes.originalDiscard];if(buttons.length!==2||buttons[1].parentElement!==group||group.className!==value.props.original||buttons.some((button,index)=>button.className!==original[index]))throw new Error('Do not overwrite unexpected original group or button classes');const before={group:group.className,buttons:buttons.map(button=>button.className)};group.className=value.props.current;buttons.forEach((button,index)=>{button.className=current[index];});return {before,after:{group:group.className,buttons:buttons.map(button=>button.className)},changed:[before.group!==group.className,...before.buttons.map((name,index)=>name!==buttons[index].className)],html:node.outerHTML}; }, {props,classes:model.classes})));
          control.reverseApplied = true; const undo = await read('undo-measure', measure); control.undo = put('original-group-undo', undo); control.undoDOM = bodyRef(Buffer.from(undo.dialog.html), 'html'); assert.deepEqual(undo, actual); assert.deepEqual(control.undoDOM, control.beforeDOM); healthy(undo); } } control.status = 'pass';
        const pure = JSON.parse(fs.readFileSync(path.join(OUT, row.steps.find(step => step.name === 'measure').purity.path))), fault = copy(pure), copied = { id: 'read-purity', status: 'running', actual: put('read-purity-actual', pure) }; report.controls.push(copied);
        fault.afterRaw += ' '; fault.afterDraws.push({ value: .25, caller: 'labelled copied observation only' }); copied.fault = put('read-purity-fault', fault); assert.notDeepEqual(fault, pure); copied.findings = purityFindings(fault); assert.deepEqual(copied.findings, ['raw-save', 'read-rng']);
        assert.equal(fault.afterRaw, `${pure.afterRaw} `); assert.deepEqual(fault.afterDraws.at(-1), { value: .25, caller: 'labelled copied observation only' }); fault.afterRaw = fault.afterRaw.slice(0, -1); fault.afterDraws.pop(); copied.undo = put('read-purity-undo', fault); copied.reverseApplied = true; assert.deepEqual(fault, pure); assert.deepEqual(purityFindings(fault), []); copied.status = 'pass';
      }
      await read('cancel', async () => { await dialog().getByRole('button', { name: 'Cancel', exact: true }).click(); await dialog().waitFor({ state: 'hidden' }); }); row.closed = put(`${row.id}-closed`, await state()); assert.equal(await dialog().count(), 0);
      for (const ref of [row.open, row.closed]) { const snapshot = JSON.parse(fs.readFileSync(path.join(OUT, ref.path))), loaded = JSON.parse(fs.readFileSync(path.join(OUT, row.loaded.path))); assert.equal(snapshot.raw, loaded.raw); assert.deepEqual(snapshot.evidence.draws, loaded.evidence.draws); } row.status = 'pass';
    } catch (error) { row.status = 'fail'; row.error = String(error.stack || error); report.errors.push({ width: row.width, error: row.error }); if (page) { try { const png = path.join(OUT, `${row.id}-failure.png`); await page.screenshot({ path: png }); row.failurePNG = { path: path.basename(png), bytes: fs.statSync(png).size, sha256: sha(fs.readFileSync(png)) }; } catch (failure) { row.failureCaptureError = String(failure.stack || failure); } } }
    finally { while (pending.size) await Promise.all([...pending]); if (page) row.finalState = put(`${row.id}-final`, await page.evaluate(key => ({ raw: localStorage.getItem(key), evidence: window.__newCareerEvidence,
        confirmationCount: document.querySelectorAll('[role="dialog"][aria-label="Start a new career?"]').length }), KEY).catch(error => ({ error: String(error.stack || error) })));
      try { if (context) await context.close(); } catch (error) { row.status = 'fail'; report.errors.push({ width: row.width, close: String(error.stack || error) }); }
      while (pending.size) await Promise.all([...pending]); if (row.errors.length || row.assets.some(asset => asset.error)) { row.status = 'fail'; report.errors.push({ width: row.width, pageErrors: row.errors, assetErrors: row.assets.filter(asset => asset.error) }); } put('report', report); }
    console.log(`${row.status === 'pass' ? 'PASS' : 'FAIL'} ${row.id}: actual New Career dialog and Cancel`);
  }
  assert(report.cases.every(row => row.status === 'pass')); assert.deepEqual(report.controls.map(item => item.id), ['original-dialog-320', 'read-purity']); assert(report.controls.every(item => item.status === 'pass' && item.reverseApplied)); assert.equal(report.errors.length, 0); report.status = 'pass';
} catch (error) { report.status = 'fail'; report.errors.push({ fatal: String(error.stack || error) }); }
finally { try { report.sourceAfter = source(); assert.deepEqual(report.sourceAfter, report.sourceBefore); } catch (error) { report.status = 'fail'; report.errors.push({ source: String(error.stack || error) }); }
  try { if (oracleContext) await oracleContext.close(); if (browser) await browser.close(); } catch (error) { report.status = 'fail'; report.errors.push({ close: String(error.stack || error) }); } put('report', report); }
console.log(`New Career dialogs: ${report.cases.filter(row => row.status === 'pass').length}/4 actual Cancel flows.`);
console.log(`New Career controls: ${report.controls.filter(row => row.status === 'pass').length}/2 effective full inverses.`);
console.log(`${report.status === 'pass' ? 'PASS' : 'FAIL'} Soccer New Career dialog browser`); if (report.status !== 'pass') process.exitCode = 1;
