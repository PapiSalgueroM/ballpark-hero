// Remote-only XI-03 browser evidence. Fictional rows prove UI plumbing, not sports history.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent, storedConsent } from '../lib/answerConsent.mjs';

assert(process.env.CI, 'Remote CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, process.env.XI_UNRATED_BROWSER_OUT || 'xi-unrated-artifacts/browser');
assert(!fs.existsSync(OUT), 'Fresh evidence directory required'); fs.mkdirSync(OUT, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const put = (name, value) => { const file = name + '.json', bytes = Buffer.from(JSON.stringify(value, null, 2)); fs.mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true }); fs.writeFileSync(path.join(OUT, file), bytes); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const receipt = file => { const bytes = fs.readFileSync(path.join(ROOT, file)); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const inventory = folder => fs.readdirSync(path.join(ROOT, folder), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(item => item.isDirectory() ? inventory(folder + '/' + item.name) : item.isFile() ? [receipt(folder + '/' + item.name)] : []);
const entry = "export { FORMATIONS } from './src/types/lineupBuilder';export {clubTableNames} from './src/data/lineupTeams';export {getTodayET} from './src/lib/dateUtils';";
const compiled = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'xi-unrated-oracle.ts', loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, metafile: true, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const selector = path.join(OUT, 'oracle.cjs'); fs.writeFileSync(selector, compiled.outputFiles[0].contents);
const B = createRequire(import.meta.url)(selector), roles = B.FORMATIONS['4-4-2'], day = B.getTodayET();
assert(roles.length === 11 && roles[0].role === 'GK', 'Actual formation required');
const rawPosition = { GK: 'Goalkeeper', LB: 'Left-Back', CB: 'Centre-Back', RB: 'Right-Back', LM: 'Left Midfield', CM: 'Central Midfield', RM: 'Right Midfield', ST: 'Centre-Forward' };
const TITLE = 'This record is missing rating inputs';
const INSTRUCTION = 'Club year draft warns before you use a record with no usable value or age. Keep searching, or choose Use this unrated record to continue.';
const EXAMPLE = 'Example: a matching record with a value but no age needs your confirmation. Keep searching leaves the slot open. Use this unrated record keeps the original record, and the completed XI stays unrated.';
const held = ['src/pages/LineupBuilder.tsx', 'src/hooks/useLineupBuilder.ts', 'src/components/lineup/LineupHowToPlay.tsx', 'src/components/lineup/FormationPitch.tsx', 'src/components/lineup/TeamSpinner.tsx', 'src/components/lineup/XiFitBreakdown.tsx', 'src/components/game/PlayerAutocomplete.tsx', 'src/components/game/ResultScreen.tsx', 'src/components/ui/alert-dialog.tsx', 'src/components/ui/dialog.tsx', 'src/lib/playerSearch.ts', 'src/lib/nameFold.ts', 'src/lib/squadDeal.ts', 'src/lib/positionFit.ts', 'src/lib/xiFit.ts', 'src/lib/worldXi.ts', 'src/lib/localLineupEval.ts', 'src/lib/validatorClient.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/completions.ts', 'src/lib/safeStorage.ts', 'scripts/lib/offlineTransport.cjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/answerConsent.mjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/qa/playBuildXiUnratedWarning.mjs', 'package.json', 'package-lock.json'];
const sources = [...new Set([...held, ...Object.keys(compiled.metafile.inputs).filter(file => file.startsWith('src/'))])].sort();
const report = { status: 'running', checks: 0, day, scope: 'Actual built App. Three fresh Club year 2010 drafts use native setup, real spinner timing, three incomplete GK choices, cancellation by button/Escape, one confirmed incomplete record, ten complete record selections and a genuine unrated result.',
  fixtureScope: 'Only player_market_values GETs and their CORS preflights are fulfilled, with fictional rows matching the actual requested club/year and the actual selected formation role. Every other foreign request is aborted. No production write is forwarded.',
  limits: ['No App/source/save/DOM/clock/RNG override, injected final state or in-memory pool replacement.', 'Browser DOM verifies selected name, role, year, assigned club and unrated outcome. Hidden internal age/value metadata carry-through is owned by unit tests; served rows alone do not prove it.', 'Ordinary complete-record selection is exercised ten times per draft. A separate all-complete result and Mixed are outside this helper.', 'External fonts are aborted, so images cover fallback fonts. Real roster eligibility, live provider availability, backend writes, wider fleet and stale callback micro-boundaries are not claimed.'],
  sourceBefore: sources.map(receipt), distBefore: inventory('dist'), oracle: { entry, sha256: sha(compiled.outputFiles[0].contents) }, journeys: [], screenshots: [], externalForwarded: 0 };
const check = (ok, label) => { assert(ok, label); report.checks++; };
const equal = (a, b, label) => { assert.deepEqual(a, b, label); report.checks++; };
const sameDay = () => check(B.getTodayET() === day, 'Refuse ET day rollover');
const waitUntil = async (predicate, label, timeout = 10000) => { const end = Date.now() + timeout; while (!(await predicate())) { assert(Date.now() < end, label); await new Promise(resolve => setTimeout(resolve, 40)); } };
let browser, host;
try {
  const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const n = probe.address().port; probe.close(() => resolve(n)); }); });
  const BASE = 'http://127.0.0.1:' + port; report.base = BASE;
  host = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('Host startup timeout')), 15000); host.stdout.on('data', bytes => { if (String(bytes).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); host.once('error', reject); host.once('exit', code => { clearTimeout(timer); reject(Error('Host exited ' + code)); }); });
  browser = await pw.chromium.launch({ headless: true });
  for (const width of [320, 390, 1280]) {
    sameDay();
    const height = width === 320 ? 568 : width === 390 ? 844 : 900, id = String(width), mobile = width < 1000;
    const row = { width, height, mode: mobile ? 'touch with native Escape dismissal' : 'keyboard', status: 'running', frames: [], actions: [], layouts: [], requests: [], fixtures: [], picks: [], screenshots: [], events: [], errors: [], assetErrors: [], routeErrors: [] };
    report.journeys.push(row);
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile, serviceWorkers: 'block' });
    let page, plan = null;
    const input = () => page.getByRole('combobox');
    const warning = () => page.getByRole('alertdialog', { name: TITLE, exact: true });
    const pitch = () => page.locator('button').filter({ has: page.locator('span', { hasText: /^GK$/ }) }).first().locator('..');
    const slot = index => pitch().locator(':scope > button').nth(index);
    const progress = n => page.getByText(n + '/11', { exact: true });
    const settle = async () => page.evaluate(async () => { await document.fonts.ready; const end = performance.now() + 10000; let previous = '', stable = 0; do { await new Promise(requestAnimationFrame); const signature = JSON.stringify([...document.querySelectorAll('button,input,[role="alertdialog"],[role="dialog"]')].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return [r.x,r.y,r.width,r.height]; })); stable = signature === previous ? stable + 1 : 1; previous = signature; if (stable >= 4 && !document.getAnimations().some(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime))) return; } while (performance.now() < end); throw Error('Page did not settle'); });
    const frame = async name => {
      await settle(); sameDay();
      const value = await page.evaluate(() => ({ at: Date.now(), width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight), scroll: { x: scrollX, y: scrollY }, storage: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])), focus: { tag: document.activeElement?.tagName, role: document.activeElement?.getAttribute('role'), label: document.activeElement?.getAttribute('aria-label'), text: document.activeElement?.textContent?.trim() }, body: document.body.innerText, input: document.querySelector('[role="combobox"]')?.value ?? null, spinner: (()=>{const e=document.querySelector('main .relative.overflow-hidden.rounded-2xl.border.border-border.bg-card.p-5.shadow-lg');if(!e)return null;const r=e.getBoundingClientRect();const hint=e.querySelector('p.text-xs.text-muted-foreground.mt-0\\.5');return {x:r.x,y:r.y,width:r.width,height:r.height,docY:r.y+scrollY,text:e.innerText,hint:hint?{height:hint.getBoundingClientRect().height,scrollHeight:hint.scrollHeight,clientHeight:hint.clientHeight,text:hint.textContent,visibility:getComputedStyle(hint).visibility}:null};})() }));
      check(value.width === width && value.documentWidth <= width, id + ': actual width and no document overflow');
      row.frames.push(put(id + '/frames/' + String(row.frames.length).padStart(3, '0') + '-' + name, value)); return value;
    };
    const point = async (target, require44 = false) => {
      check(await target.count() === 1 && await target.isVisible(), id + ': one visible target');
      const info = await target.evaluate(el => { const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, hit = document.elementFromPoint(x, y); return { text: el.textContent?.trim(), rect: { x: r.x, y: r.y, width: r.width, height: r.height }, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, hit: hit === el || el.contains(hit), disabled: el.matches(':disabled') }; });
      check(info.rect.x >= -0.5 && info.rect.x + info.rect.width <= width + 0.5 && info.rect.y >= 0 && info.rect.y + info.rect.height <= height + 0.5 && info.hit && !info.disabled, id + ': target visible, reachable and enabled');
      if (require44) check(info.rect.height >= 44 && info.rect.width >= 44 && info.scrollWidth <= info.clientWidth + 1, id + ': warning target fits and is at least 44px');
      row.layouts.push(info); return info;
    };
    const press = async target => { if (mobile) await target.tap(); else { await target.focus(); await target.press('Enter'); } };
    const action = async (name, target, work, scrollHeld = true, require44 = false) => {
      if (target) { await target.scrollIntoViewIfNeeded(); await settle(); }
      const targetReceipt = target ? await point(target, require44) : null, before = await frame(name + '-before'), eventStart = row.events.length;
      await work(); const after = await frame(name + '-after');
      if (scrollHeld) equal(after.scroll, before.scroll, id + ': document position held after prepared ' + name);
      row.actions.push(put(id + '/actions/' + String(row.actions.length).padStart(3, '0') + '-' + name, { name, target: targetReceipt, scrollHeld, before, after, events: row.events.slice(eventStart) })); return { before, after };
    };
    const noAdmission = label => check(!row.requests.some(r => /\/(player_verified_positions|validate-player|evaluate-lineup|game_completions)$/.test(r.path)), id + ': no history, validator, evaluator or completion attempt ' + label);
    const heldState = (before, after, label) => { equal(after.storage, before.storage, id + ': storage held ' + label); noAdmission(label); };
    const currentClub = async () => {
      await page.getByTitle('Reroll club', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
      const label = page.locator('p').filter({ hasText: /^Matching .+ records from 2010$/ }); await label.waitFor();
      const match = /^Matching (.+) records from (2010)$/.exec(await label.innerText()); check(!!match, id + ': actual club/year label'); return match[1];
    };
    const fixture = async (index, kind) => {
      const club = await currentClub(), aliases = B.clubTableNames(club), position = rawPosition[roles[index].role];
      check(Array.isArray(aliases) && aliases.length > 0 && !!position, id + ': actual club aliases and selected role supported');
      const name = 'Fictional Record ' + id + ' ' + kind + ' ' + index;
      const record = { player_name: name, name_folded: name.toLowerCase(), person_key: 'xi-warning-' + id + '-' + kind + '-' + index, position, club: aliases[0], nationality: 'Fixtureland', year: 2010, age: kind === 'Age' || kind === 'Both' ? null : 26, market_value_usd: kind === 'Value' || kind === 'Both' ? null : 12000000 + index * 1000000 };
      plan = { index, kind, club, aliases, role: roles[index].role, record, readCount: 0 }; row.fixtures.push({ index, kind, club, aliases: [...aliases], role: roles[index].role, record: { ...record } }); return plan;
    };
    const choose = async (index, kind, expectedWarning, scrollHeld = true) => {
      await currentClub();
      await action('choose-slot-' + index + '-' + kind, slot(index), () => press(slot(index)));
      await input().waitFor();
      const chosen = await fixture(index, kind);
      await action('type-' + index + '-' + kind, input(), async () => { if (mobile) await input().tap(); else await input().focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type(chosen.record.player_name, { delay: 2 }); });
      const option = page.getByRole('option').filter({ has: page.locator('span.text-sm.font-medium').filter({ hasText: chosen.record.player_name }) });
      await option.waitFor();
      check(await option.count() === 1 && (await option.innerText()).includes(chosen.record.club), id + ': native option identifies original fictional record');
      const result = await action('select-' + index + '-' + kind, option, async () => { await press(option); if (expectedWarning) await warning().waitFor(); else if (index < 10) await progress(index + 1).waitFor(); else await page.getByRole('button', { name: 'Submit Team', exact: true }).waitFor(); }, scrollHeld);
      check(chosen.readCount > 0, id + ': selected record came from observed transport');
      if (!expectedWarning) check(await warning().count() === 0, id + ': complete record remains immediate');
      if (!expectedWarning && index < 10) {
        check(!!result.before.spinner && !!result.after.spinner, id + ': actual spinner measured across complete selection');
        equal(result.after.spinner.height, result.before.spinner.height, id + ': spinner height held during native selection transition');
      }
      return { chosen, ...result };
    };
    const inspectWarning = async chosen => {
      const dialog = warning(); check(await dialog.count() === 1 && await dialog.isVisible(), id + ': actual pending warning visible');
      const fields = chosen.kind === 'Age' ? 'age' : chosen.kind === 'Value' ? 'market value' : 'market value and age';
      const expected = 'No usable ' + fields + ' is recorded for ' + chosen.record.player_name + ' in 2010. If accepted, this pick leaves the completed XI unrated.';
      check((await dialog.innerText()).includes(expected), id + ': exact missing-input consequence and original name/year');
      await progress(0).waitFor(); check((await slot(0).innerText()).trim() === 'GK', id + ': warning has not committed original slot');
      check(await dialog.getByRole('button', { name: 'Keep searching', exact: true }).evaluate(el => el === document.activeElement), id + ': cancel owns initial focus');
      for (const name of ['Keep searching', 'Use this unrated record']) { const button = dialog.getByRole('button', { name, exact: true }); await button.scrollIntoViewIfNeeded(); await point(button, true); }
      const box = await dialog.boundingBox(); check(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height, id + ': warning fits viewport'); noAdmission('while warning is open');
      return frame('warning-' + chosen.kind);
    };
    const photo = async (name, target, fullPhase = false) => {
      let preparation = null, chrome = null;
      if (fullPhase) {
        const before = await frame(name + '-native-photo-preparation-before'), eventStart = row.events.length;
        const main = page.locator('#dukb-main'); check(await main.count() === 1 && await main.isVisible(), id + ': native photo preparation has the actual main landmark');
        await page.evaluate(() => {
          const observe = event => {
            if (event.key !== 'Home' || !event.ctrlKey) return;
            document.removeEventListener('keydown', observe, true);
            window.__xiWarningEvidence({ at: Date.now(), kind: 'native-photo-preparation', type: event.type, trusted: event.isTrusted, key: event.key, ctrlKey: event.ctrlKey, targetId: event.target?.id });
          };
          document.addEventListener('keydown', observe, true);
        });
        await main.focus(); await page.keyboard.press('Control+Home');
        await waitUntil(() => page.evaluate(() => scrollX === 0 && scrollY === 0), id + ': native Control+Home reaches document origin');
        await waitUntil(() => row.events.slice(eventStart).some(event => event.kind === 'native-photo-preparation' && event.trusted && event.ctrlKey && event.key === 'Home' && event.targetId === 'dukb-main'), id + ': actual trusted main Control+Home observed');
        const after = await frame(name + '-native-photo-preparation-after');
        equal(after.scroll, { x: 0, y: 0 }, id + ': confirmation photo starts at document origin');
        equal(after.storage, before.storage, id + ': full storage held through native photo preparation');
        chrome = await page.evaluate(() => {
          const observed = [...document.querySelectorAll('body *')].flatMap(el => {
            const style = getComputedStyle(el); if (!['fixed', 'sticky'].includes(style.position)) return [];
            const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0 || r.bottom <= 0 || r.top >= innerHeight || style.visibility === 'hidden' || style.display === 'none') return [];
            return [{ tag: el.tagName, id: el.id, role: el.getAttribute('role'), position: style.position, rect: { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom } }];
          });
          const top = observed.filter(el => el.rect.y <= 1 && el.rect.width >= innerWidth / 2);
          return { activeId: document.activeElement?.id, observed, top, bottom: Math.max(0, ...top.map(el => el.rect.bottom)) };
        });
        preparation = put(id + '/photo-preparations/' + name, { name: name + '-native-photo-preparation', prepared: true, nativeFocus: '#dukb-main', nativeKey: 'Control+Home', scrollHeld: false, before, after, chrome, events: row.events.slice(eventStart) });
        row.actions.push(preparation);
      }
      if (target && !fullPhase) await target.scrollIntoViewIfNeeded(); const value = await frame(name + '-photo'); let clip;
      if (fullPhase) { const a = await progress(1).boundingBox(), b = await pitch().boundingBox(); check(a && b, id + ': confirmation phase ROI exists'); check(a.y >= chrome.bottom && b.y >= chrome.bottom, id + ': actual progress and pitch start below observed top chrome'); row.layouts.push({ name: name + '-photo-geometry', scroll: value.scroll, progress: a, pitch: b, chrome }); const y = Math.max(0, Math.floor(Math.min(a.y, b.y) + value.scroll.y - 12)); clip = { x: 0, y, width, height: Math.min(value.documentHeight - y, Math.ceil(Math.max(a.y + a.height, b.y + b.height) + value.scroll.y + 12 - y)) }; }
      const file = id + '-' + name + '.png'; await page.screenshot({ path: path.join(OUT, file), ...(clip ? { fullPage: true, clip } : { fullPage: false }) });
      const bytes = fs.readFileSync(path.join(OUT, file)), item = { file, bytes: bytes.length, sha256: sha(bytes), clip: clip ?? null, frame: row.frames.at(-1), ...(preparation ? { preparation } : {}) }; report.screenshots.push(item); row.screenshots.push(item);
    };
    try {
      await context.routeWebSocket('**/*', route => { row.requests.push({ at: Date.now(), path: new URL(route.url()).pathname, method: 'WEBSOCKET', outcome: 'aborted' }); route.close({ code: 1008, reason: 'Offline fixture proof' }); });
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === BASE) return route.continue();
        const record = { at: Date.now(), method: request.method(), url: request.url(), path: url.pathname, query: Object.fromEntries(url.searchParams), outcome: 'aborted' }; row.requests.push(record);
        try {
          if (url.origin === 'https://flawuiqbvjobmkfkauhw.supabase.co' && url.pathname === '/rest/v1/player_market_values' && request.method() === 'OPTIONS') { record.outcome = 'fixture-cors'; return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,OPTIONS', 'access-control-allow-headers': request.headers()['access-control-request-headers'] || '*' } }); }
          if (url.origin === 'https://flawuiqbvjobmkfkauhw.supabase.co' && url.pathname === '/rest/v1/player_market_values' && request.method() === 'GET') {
            check(!!plan, id + ': search has an explicit fixture plan');
            const encoded = url.searchParams.get('club'), aliases = encoded?.startsWith('in.(') && encoded.endsWith(')') ? encoded.slice(4, -1).split(',').map(s => s.replace(/^"|"$/g, '')) : null;
            equal(aliases, plan.aliases, id + ': exact actual club filter'); check(url.searchParams.get('year') === 'eq.2010' && !url.searchParams.has('nationality'), id + ': exact recorded year and club-only query');
            check(rawPosition[roles[plan.index].role] === plan.record.position && plan.aliases.includes(plan.record.club), id + ': fixture matches actual selected role and club');
            const limit = Number(url.searchParams.get('limit')); check(Number.isInteger(limit) && limit > 0 && limit <= 1000, id + ': bounded actual read');
            const q = url.searchParams.get('name_folded'); let data = [plan.record];
            if (q !== null) { check(/^ilike\.%.*%$/.test(q), id + ': expected folded search'); const needle = q.slice(7, -1).toLowerCase(); data = data.filter(r => r.name_folded.includes(needle)); }
            const offset = Number(url.searchParams.get('offset') || 0); check(Number.isInteger(offset) && offset >= 0, id + ': bounded nonnegative offset'); data = data.slice(offset, offset + limit);
            plan.readCount++; record.outcome = 'fixture-fulfilled'; record.fixture = { index: plan.index, kind: plan.kind, club: plan.club, role: plan.role }; record.rows = data.map(r => ({ ...r })); record.bodySHA = sha(JSON.stringify(data));
            return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) });
          }
          if (request.method() === 'POST' && url.pathname.endsWith('/game_completions')) { const data = request.postDataJSON(); record.completion = Array.isArray(data) ? data[0] : data; }
          return route.abort('blockedbyclient');
        } catch (error) { row.routeErrors.push(String(error.stack || error)); await route.abort('failed').catch(() => {}); }
      });
      page = await context.newPage(); page.on('pageerror', error => row.errors.push(String(error)));
      page.on('response', response => { if (new URL(response.url()).origin === BASE && response.status() >= 400) row.assetErrors.push({ url: response.url(), status: response.status() }); });
      page.on('requestfailed', request => { if (new URL(request.url()).origin === BASE) row.assetErrors.push({ url: request.url(), failure: request.failure() }); });
      await page.exposeBinding('__xiWarningEvidence', (_source, event) => row.events.push(event));
      await page.addInitScript(() => { for (const type of ['pointerup', 'click', 'keydown']) document.addEventListener(type, e => { const target = e.target?.closest?.('button,input,select'); if (target) window.__xiWarningEvidence({ at: Date.now(), type, trusted: e.isTrusted, key: e.key, pointerType: e.pointerType, tag: target.tagName, text: target.textContent?.trim(), role: target.getAttribute('role') }); }, true); });
      await page.goto(BASE + '/build-your-xi', { waitUntil: 'networkidle' });
      const help = page.getByRole('dialog', { name: 'How to Play: Build Your XI', exact: true });
      if (await help.isVisible()) { await page.keyboard.press('Escape'); await help.waitFor({ state: 'hidden' }); }
      await answerConsent(page, { press: async target => { await action('reject-optional-consent', target, () => press(target), false); } }); check(await storedConsent(page) === 'rejected', id + ': optional consent refused');
      await page.getByRole('button', { name: 'Club year draft', exact: true }).waitFor();
      check(await page.getByRole('button', { name: 'Mixed', exact: true }).getAttribute('aria-pressed') === 'true', id + ': default Mixed remains available');
      const helpTrigger = page.getByRole('button', { name: 'How to play', exact: true }).filter({ hasText: /^\s*How to play\s*$/ });
      check(await helpTrigger.count() === 1, id + ': exact visible-text XI rules button');
      await action('reopen-help', helpTrigger, async () => { await press(helpTrigger); await help.waitFor(); });
      check((await help.innerText()).includes(INSTRUCTION) && (await help.innerText()).includes(EXAMPLE), id + ': actual reopenable instruction and worked example');
      await action('close-help', null, async () => { await page.keyboard.press('Escape'); await help.waitFor({ state: 'hidden' }); });
      await action('choose-club-year', page.getByRole('button', { name: 'Club year draft', exact: true }), () => press(page.getByRole('button', { name: 'Club year draft', exact: true })), false);
      const year = page.getByLabel('Recorded year', { exact: true });
      await action('choose-native-2010', year, async () => { if (mobile) await year.tap(); else await year.focus(); await page.keyboard.press('Home'); for (let n = 2026; n > 2010; n--) await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); }, false);
      check(await year.inputValue() === '2010', id + ': actual native recorded-year selection');
      const formation = page.getByRole('button', { name: /^4-4-2\b/ });
      await action('choose-formation', formation, () => press(formation), false);
      await currentClub(); await progress(0).waitFor();
      const initial = await frame('native-empty-draft');
      const age = await choose(0, 'Age', true); const ageOpen = await inspectWarning(age.chosen); heldState(initial, ageOpen, 'opening age warning');
      const cancel = warning().getByRole('button', { name: 'Keep searching', exact: true });
      const cancelled = await action('keep-searching', cancel, async () => { await press(cancel); await warning().waitFor({ state: 'hidden' }); await waitUntil(() => input().evaluate(el => el === document.activeElement), id + ': cancelled warning returns input focus'); }, true, true);
      await progress(0).waitFor(); heldState(ageOpen, cancelled.after, 'cancel');
      const value = await choose(0, 'Value', true); const valueOpen = await inspectWarning(value.chosen);
      const escaped = await action('escape-warning', null, async () => { await page.keyboard.press('Escape'); await warning().waitFor({ state: 'hidden' }); await waitUntil(() => input().evaluate(el => el === document.activeElement), id + ': Escape returns input focus'); });
      await progress(0).waitFor(); heldState(valueOpen, escaped.after, 'Escape');
      const both = await choose(0, 'Both', true); const bothOpen = await inspectWarning(both.chosen); heldState(initial, bothOpen, 'both missing before commit');
      await photo('warning-both', warning());
      const use = warning().getByRole('button', { name: 'Use this unrated record', exact: true });
      const accepted = await action('confirm-original-record', use, async () => { await press(use); await warning().waitFor({ state: 'hidden' }); await progress(1).waitFor(); }, true, true);
      check(!!accepted.before.spinner && !!accepted.after.spinner, id + ': actual spinner measured across warning confirmation');
      equal(accepted.after.spinner.height, accepted.before.spinner.height, id + ': spinner height held during warning confirmation');
      check((await slot(0).innerText()).includes(both.chosen.record.player_name) && await slot(0).isDisabled(), id + ': original named keeper is committed once');
      heldState(bothOpen, accepted.after, 'first confirmed record');
      row.picks.push({ ...both.chosen, record: { ...both.chosen.record } }); await currentClub(); await photo('confirmed-one-of-eleven', null, true);
      for (let index = 1; index < 11; index++) { const result = await choose(index, 'Complete', false, index < 10); row.picks.push({ ...result.chosen, record: { ...result.chosen.record } }); noAdmission('before final submission'); }
      check(row.picks.length === 11 && new Set(row.picks.map(p => p.record.player_name)).size === 11, id + ': eleven distinct native selected records');
      const submit = page.getByRole('button', { name: 'Submit Team', exact: true });
      const completion = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/game_completions'), { timeout: 15000 });
      await action('submit-unrated-xi', submit, async () => { await press(submit); await page.getByRole('heading', { name: 'Unrated recorded draft', exact: true }).waitFor(); await completion; }, false);
      const result = await frame('actual-unrated-result');
      check(result.body.includes('Club year draft: recorded year 2010') && result.body.includes('Draft complete. Some selected records are missing a value or age, so we cannot rate the full XI.'), id + ': actual unrated explanation and year');
      check(await page.getByRole('heading', { name: 'Season Report', exact: true }).count() === 0, id + ': missing inputs do not invent a rated season');
      const teamList = page.locator('p').filter({ hasText: /^Your 4-4-2 XI$/ }).locator('..').locator(':scope > div').first().locator(':scope > div');
      check(await teamList.count() === 11, id + ': actual result contains eleven row receipts');
      for (let index = 0; index < 11; index++) { const text = await teamList.nth(index).innerText(), picked = row.picks[index]; check(text.includes(picked.record.player_name) && text.includes('2010 value') && text.includes(picked.club) && text.includes(roles[index].label), id + ': visible chosen name, role, year and assigned club stay with slot ' + index); }
      const completions = row.requests.filter(r => r.completion?.game === 'build-your-xi'); check(completions.length === 1 && completions[0].outcome === 'aborted' && completions[0].completion.score === 500, id + ': one existing blocked completion attempt, unchanged score');
      check(!row.requests.some(r => /\/(player_verified_positions|validate-player|evaluate-lineup)$/.test(r.path)), id + ': matching selected records required no history or provider call');
      check(row.requests.every(r => ['aborted', 'fixture-fulfilled', 'fixture-cors'].includes(r.outcome)), id + ': no foreign forwarded');
      check(row.routeErrors.length === 0 && row.errors.length === 0 && row.assetErrors.length === 0, id + ': no route, App or local asset error');
      check(row.events.some(e => e.trusted && (mobile ? e.pointerType === 'touch' : e.type === 'keydown' && e.key === 'Enter')), id + ': actual native input mode observed');
      row.result = put(id + '/result', result); row.status = 'passed'; console.log('PASS native XI warning ' + width);
    } catch (error) { row.status = 'failed'; row.error = String(error.stack || error); if (page && !page.isClosed()) await frame('failure').catch(() => {}); throw error; }
    finally { await context.close(); put('report', report); }
  }
  check(report.screenshots.length === 6, 'Exactly three warning and three confirmation-phase PNGs');
  sameDay(); report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = String(error.stack || error); throw error; }
finally {
  if (browser) await browser.close(); if (host) host.kill();
  report.sourceAfter = sources.map(receipt); report.distAfter = inventory('dist'); report.sourceHeld = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); report.distHeld = JSON.stringify(report.distBefore) === JSON.stringify(report.distAfter);
  put('report', report); assert(report.sourceHeld && report.distHeld, 'Source/dist bodies must stay byte-identical');
}
