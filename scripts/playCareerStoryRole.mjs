// Actual saved Soccer Career story and mobile controls in Chromium, remote CI only.
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
assert(process.env.CI, 'Run this native journey only in remote CI');
process.env.CAREER_STORY_ROLE_IMPORT_ONLY = '1';
const { bundleCareerStoryRole, withCareerStorySeed } = await import('./simCareerStoryRole.mjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/career-story-role/native');
const CACHE = path.resolve(ROOT, process.env.FREE_KICK_FONT_CACHE || '.tmp-fx/career-story-role/font-cache');
const KEY = 'soccerCareerSave', NOW = 1791586800000, copy = value => JSON.parse(JSON.stringify(value));
const sha = value => createHash('sha256').update(value).digest('hex');
const files = ['src/components/soccer-career/CareerStory.tsx', 'src/pages/SoccerCareer.tsx', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerRole.ts', 'src/lib/soccerCareerMilestone.ts', 'src/components/soccer-career/ReducedRoleNote.tsx', 'src/data/gameContent/soccer2.ts', 'scripts/playCareerStoryRole.mjs'];
function sourceHashes() {
  const hashes = {};
  for (const file of files) { const bytes = fs.readFileSync(path.join(ROOT, file)); hashes[file] = sha(bytes); }
  return hashes;
}
const report = { cases: [], controls: [], checks: 0, failed: 0, forwardedExternalRequests: 0, sourceBefore: sourceHashes() };
fs.mkdirSync(OUT, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(value, null, 2));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(CACHE, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file)); const body = fs.readFileSync(path.join(CACHE, entry.file));
  assert.equal(sha(body), entry.sha256, 'Retained font bytes match their manifest');
  return [entry.url, { body, contentType: entry.contentType }];
}));
assert(/^\s+setClubs\(FALLBACK_CLUBS\);$/m.test(fs.readFileSync(path.join(ROOT, 'src/pages/SoccerCareer.tsx'), 'utf8').replaceAll('\r\n', '\n')), 'Route and oracle use the same actual club pool');
const B = await bundleCareerStoryRole();
const captured = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(save => save.id === 'ere').state;
function step(E, s) {
  const clubs = E.FALLBACK_CLUBS;
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'contract_offer': assert(s.pendingOffers?.length, 'Actual contract screen has an offer'); return E.acceptOffer(s, s.pendingOffers[0]);
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': assert(s.pendingEvents?.length, 'Actual event screen has a choice'); return E.applyEventChoice(s, s.pendingEvents[0].choices.length - 1, clubs);
    case 'moral_dilemma': return s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, s.pendingMoralDilemma.choices.length - 1) : E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'club_move': return E.stayAtClub(s);
    case 'transfer_window': return s.transferSituation?.type === 'contract_expiry' ? E.signExtension(s) : E.stayAtClub(s);
    case 'retirement_suggestion': return E.declineRetirementSuggestion(s, clubs);
    default: throw new Error(`No actual fixture driver for ${s.phase}`);
  }
}
const prepared = withCareerStorySeed(118900, () => {
  let s = B.soccer.repairCareer(copy(captured)), playing;
  for (let turn = 0; turn < 650 && !s.retired; turn++) {
    const latest = s.seasons.at(-1);
    if (s.phase === 'playing' && !s.loan && s.story?.length >= 12 && latest?.type === 'playing' && latest.apps > 0 && !latest.injurySevere && !['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'].includes(s.currentClub)) playing = copy(s);
    s = step(B.soccer, copy(s));
  }
  assert(playing?.story?.length >= 12, 'Actual engine produces a navigable recorded career');
  const retired = B.soccer.choosePostRetirement(B.soccer.manualRetire(copy(playing)), 'retire', B.soccer.FALLBACK_CLUBS);
  playing.reducedRole = { club: playing.currentClub, year: playing.seasons.at(-1).year + 1 };
  return { playing, retired };
});
write('fixture-preparation', { simulation: 'Actual seeded continuation of the captured fictional career', seed: 118900, draws: prepared.draws, storyYears: prepared.value.playing.story.map(chapter => chapter.year) });
const browserBuild = await build({ stdin: { contents: "export * as soccer from './src/lib/soccerCareerEngine'; export * as story from './src/components/soccer-career/CareerStory'; export * as reveal from './src/lib/soccerAwardReveal'; export * as flags from './src/lib/flagUtils'; export * as currency from './src/lib/soccerCurrency'; export * as moments from './src/components/soccer-career/careerMoments';", resolveDir: ROOT, loader: 'ts' }, bundle: true, platform: 'browser', format: 'iife', globalName: '__storyRoleOracle', write: false, jsx: 'automatic', alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'error' });
function differences(expected, actual, at = '$', rows = []) {
  if (Object.is(expected, actual)) return rows;
  if (!expected || !actual || typeof expected !== 'object' || typeof actual !== 'object' || Array.isArray(expected) !== Array.isArray(actual)) { rows.push({ at, expected, actual }); return rows; }
  const a = Object.keys(expected), b = Object.keys(actual);
  if (JSON.stringify(a) !== JSON.stringify(b)) rows.push({ at: `${at}.[keys]`, expected: a, actual: b });
  for (const key of new Set([...a, ...b])) {
    if (!Object.hasOwn(expected, key) || !Object.hasOwn(actual, key)) rows.push({ at: `${at}.${key}`, expected: Object.hasOwn(expected, key) ? expected[key] : '<absent>', actual: Object.hasOwn(actual, key) ? actual[key] : '<absent>' });
    else differences(expected[key], actual[key], `${at}.${key}`, rows);
  }
  return rows;
}
const layoutFailures = o => [o.stable < 4 && 'stable-frames', !o.inside && 'viewport', !o.painted && 'painted-center', Number(o.opacity) !== 1 && 'opacity', o.finite !== 0 && 'animations', o.overflow && 'horizontal-overflow', o.controls.some(c => c.points.some(p => !p.painted)) && 'overlap'].filter(Boolean);
const restorationFailures = o => [!o.actual.activeMatches && 'focus', o.actual.inline !== o.expected.inline && 'inline-overflow', o.actual.computed !== o.expected.computed && 'computed-overflow', o.actual.y !== o.expected.y && 'page-position'].filter(Boolean);
const chapterFailures = o => [JSON.stringify(o.expected) !== JSON.stringify(o.actual) && 'wrong-chapter'].filter(Boolean);
const rectanglesOverlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const helpUtilityFailures = o => [o.mobile && (o.help.width < 44 || o.help.height < 44) && 'help-target', o.utilities.some(button => rectanglesOverlap(o.help, button.rect)) && 'help-overlap'].filter(Boolean);
const TRAINING_GUIDE_FRAGMENT = 'the dumbbell button, above your player on phones or bottom right on desktop';
const trainingGuideFailures = o => [!o.guide.includes(TRAINING_GUIDE_FRAGMENT) && 'guide-training'].filter(Boolean);
const helpUtilityGuideFailures = o => [...helpUtilityFailures(o), ...trainingGuideFailures(o)];
function detectorControl(name, before, mutate, detector, expectedFailures) {
  assert.deepEqual(detector(before), [], `${name}: actual baseline passes`);
  const faulty = copy(before); const undo = mutate(faulty); assert.equal(typeof undo, 'function', `${name}: the copied defect provides an exact undo`); assert.notDeepEqual(faulty, before, `${name}: the copied defect changes the actual observation`);
  const failures = detector(faulty); assert.deepEqual(failures, expectedFailures, `${name}: only the intended detector failures fire`);
  write(`control-${name}-baseline`, before); write(`control-${name}-mutated`, faulty);
  undo(); assert.deepEqual(faulty, before); assert.deepEqual(detector(faulty), []);
  report.controls.push({ name, changed: true, failures, restored: true, scope: 'Copied actual browser observation, not a served product mutation' });
  console.log(`CONTROL FIRED(native ${name}): ${failures.join(', ')}`);
}
const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => error ? reject(error) : resolve(value)); }); });
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let browser, serverLog = '';
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { serverLog += data; if (serverLog.includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', data => { serverLog += data; });
});
try {
  await ready; browser = await pw.chromium.launch({ headless: true });
  for (const profile of [{ width: 320, height: 568, touch: true }, { width: 390, height: 844, touch: true }, { width: 1280, height: 900, touch: false }]) {
    for (const kind of ['playing', 'summary', 'retired']) {
      const id = `${profile.width}-${kind}`, row = { id, ...profile, kind, checks: [], errors: [], assetErrors: [], intercepted: [], writes: [], layouts: [], restorations: [], reloads: [], saves: [], chapters: [] };
      report.cases.push(row); const check = (ok, label) => { report.checks++; if (!ok) report.failed++; row.checks.push({ ok: !!ok, label }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${id}: ${label}`); assert(ok, `${id}: ${label}`); };
      let fixture = copy(prepared.value[kind === 'retired' ? 'retired' : 'playing']);
      if (kind === 'summary') {
        fixture.phase = 'season_summary'; delete fixture.reducedRole;
        const seniors = fixture.seasons.filter(r => r.type === 'playing' && r.apps > 0 && !['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'].includes(r.club));
        assert(seniors.length >= 2 && seniors.at(-1) === fixture.seasons.at(-1), 'Held summary has a current actual senior row');
        for (const r of seniors) r.goals = 0; seniors[0].goals = 99; const last = seniors.at(-1); last.goals = 2;
        const interrupted = profile.width === 320;
        if (interrupted) { last.injurySevere = true; last.injury = 'Held fixture rehabilitation'; last.injuryWeeks = 40; }
        last.reducedRole = { club: last.club, year: last.year, plannedReduction: 4, outcome: interrupted ? 'interrupted' : 'served' };
        fixture.pendingSummary = copy(last);
        // A held legacy book omits its earliest recorded chapters and retains an exact truncated count.
        fixture.story = fixture.story.slice(2); const folded = fixture.story.find(chapter => chapter.lines.length > 2);
        assert(folded, 'Actual recorded chapter has enough lines for its honest more notice'); folded.more = folded.lines.length - 2; folded.lines = folded.lines.slice(0, 2);
      }
      write(`${id}-fixture`, { simulation: 'Explicit fictional UI save. Story lines come from the seeded engine; summary goals and role outcomes are held test inputs, not real historical results.', fixture });
      const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: JSON.stringify(fixture) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }] }] } });
      const oracleContext = await browser.newContext({ reducedMotion: 'reduce' }), oracle = await oracleContext.newPage();
      const fixedClock = now => { const OldDate = Date; window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }; };
      await context.addInitScript(fixedClock, NOW); await oracle.addInitScript(fixedClock, NOW);
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === BASE) { assert(['GET', 'HEAD'].includes(request.method())); return route.continue(); }
        row.intercepted.push({ method: request.method(), origin: url.origin, path: url.pathname, blocked: true });
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) row.writes.push({ method: request.method(), path: url.pathname, blocked: true });
        if (request.method() === 'GET' && fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href) });
        if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) { row.assetErrors.push(`Uncached font ${url.href}`); return route.abort(); }
        if (request.resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12"/>' });
        return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
      });
      await context.routeWebSocket('**/*', socket => socket.close());
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      page.on('pageerror', error => row.errors.push(String(error))); page.on('requestfailed', request => { if (request.url().startsWith(BASE)) row.assetErrors.push(`${request.url()}: ${request.failure()?.errorText}`); });
      page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(`${response.url()}: ${response.status()}`); });
      const bytes = () => page.evaluate(key => localStorage.getItem(key), KEY), saved = async () => JSON.parse(await bytes());
      const body = () => page.evaluate(() => ({ inline: document.body.style.overflow, computed: getComputedStyle(document.body).overflow, y: scrollY }));
      const activate = async button => { await button.scrollIntoViewIfNeeded(); await button.focus(); if (profile.touch) await button.tap(); else await button.press('Enter'); };
      const compare = (expected, actual, name) => { const diff = differences(expected, actual); write(`${id}-${name}-expected`, expected); write(`${id}-${name}-actual`, actual); write(`${id}-${name}-diff`, diff); row.saves.push({ name, expectedHash: sha(JSON.stringify(expected)), actualHash: sha(JSON.stringify(actual)), diffCount: diff.length }); check(JSON.stringify(expected) === JSON.stringify(actual), `${name}: every serialized saved field and key is identical`); };
      const unchanged = async name => { const actual = await saved(); compare(canonical, actual, name); check(await bytes() === canonicalBytes, `${name}: raw complete save bytes stay unchanged`); };
      const restored = async (selector, expected, name) => {
        await page.waitForFunction(({ selector, expected }) => document.activeElement?.matches(selector) && document.body.style.overflow === expected.inline && getComputedStyle(document.body).overflow === expected.computed && scrollY === expected.y, { selector, expected }, { timeout: 2000 }).catch(() => {});
        const observation = { expected, actual: { ...await body(), activeMatches: await page.locator(selector).evaluate(element => document.activeElement === element) }, active: await page.evaluate(() => document.activeElement?.outerHTML) };
        row.restorations.push({ name, ...observation }); write(`${id}-${name}-restoration`, observation); check(restorationFailures(observation).length === 0, `${name}: exact opener focus, body scroll and page position restore`); return observation;
      };
      const dialogReady = async dialog => { await dialog.waitFor(); const selector = await dialog.getAttribute('data-career-story') === 'dialog' ? '[data-career-story="dialog"]' : `[role="dialog"][aria-label="${await dialog.getAttribute('aria-label')}"]`; await page.waitForFunction(selector => { const dialog = document.querySelector(selector); return dialog && dialog.contains(document.activeElement); }, selector, { timeout: 2000 }); };
      const capture = async (target, name) => {
        await page.bringToFront(); const toastObserved = await page.locator('[data-sonner-toast]').count(); await page.waitForFunction(() => !document.querySelector('[data-sonner-toast]'), undefined, { timeout: 10000 }); await target.scrollIntoViewIfNeeded();
        const layout = await target.evaluate(async element => {
          let prior = '', stable = 0, last; const started = performance.now();
          while (performance.now() - started < 2000) {
            await new Promise(resolve => requestAnimationFrame(resolve)); const r = element.getBoundingClientRect(), style = getComputedStyle(element), center = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            const controls = [...element.querySelectorAll('button, a[href]'), ...(element.matches('button, a[href]') ? [element] : [])].flatMap(control => {
              const b = control.getBoundingClientRect(), css = getComputedStyle(control), scroller = control.closest('[data-story-scroll]'), clip = scroller?.getBoundingClientRect();
              if (!control.getClientRects().length || css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) === 0 || b.y < 0 || b.bottom > innerHeight + 1 || (clip && (b.y < clip.y || b.bottom > clip.bottom))) return [];
              return [{ label: control.getAttribute('aria-label') || control.innerText, width: b.width, height: b.height, points: [[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]].map(([x,y]) => { const px = b.x + b.width * x, py = b.y + b.height * y, hit = document.elementFromPoint(px, py); return { x: px, y: py, painted: !!hit && control.contains(hit) }; }) }];
            });
            last = { x: r.x, y: r.y, width: r.width, height: r.height, viewport: [innerWidth, innerHeight], pageY: scrollY, ownScroll: element.scrollTop, opacity: style.opacity, inside: r.width > 0 && r.height > 0 && r.x >= 0 && r.right <= innerWidth + 1 && r.y >= 0 && r.bottom <= innerHeight + 1, painted: !!center && element.contains(center), finite: document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity).length, overflow: document.documentElement.scrollWidth > innerWidth + 1, controls };
            const signature = JSON.stringify(last); stable = signature === prior ? stable + 1 : 1; prior = signature;
            if (stable >= 4 && layoutGood(last)) return { ...last, stable };
          }
          return { ...last, stable };
          function layoutGood(o) { return o.inside && o.painted && Number(o.opacity) === 1 && o.finite === 0 && !o.overflow && o.controls.every(c => c.points.every(p => p.painted)); }
        });
        layout.toastObserved = toastObserved; layout.toastRemaining = await page.locator('[data-sonner-toast]').count(); row.layouts.push({ name, ...layout }); write(`${id}-${name}-layout`, layout); check(layoutFailures(layout).length === 0 && layout.toastRemaining === 0, `${name}: painted controls and readable capture settle for four frames without overlap`); await page.screenshot({ path: path.join(OUT, `${id}-${name}.png`) }); return layout;
      };
      const reload = async name => { const before = await bytes(); await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'How to play', exact: true }).waitFor({ timeout: 45000 }); await page.locator('[data-career-utilities]').waitFor({ state: 'attached' }); await page.locator('[data-career-utility="phone"]').waitFor(); await page.evaluate(() => document.fonts.ready); const after = await bytes(); write(`${id}-${name}-reload-bytes`, { before, after }); const receipt = { name, beforeHash: sha(before), afterHash: sha(after), beforeBytes: Buffer.byteLength(before), afterBytes: Buffer.byteLength(after), equal: before === after }; row.reloads.push(receipt); check(receipt.equal, `${name}: reload preserves every raw saved byte`); };
      let canonical, canonicalBytes, chapterControl, restorationControl, overlapControl;
      try {
        await oracle.goto('about:blank'); await oracle.addScriptTag({ content: browserBuild.outputFiles[0].text });
        const initial = await oracle.evaluate(input => { const E = window.__storyRoleOracle; const state = E.soccer.repairCareer(structuredClone(input)); E.moments.settleLoadedMoments(state); return JSON.parse(JSON.stringify(state)); }, fixture);
        await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'How to play', exact: true }).waitFor({ timeout: 45000 }); await page.locator('[data-career-utilities]').waitFor({ state: 'attached' }); await page.locator('[data-career-utility="phone"]').waitFor(); await page.evaluate(() => document.fonts.ready);
        canonical = await saved(); compare(initial, canonical, 'initial-current-Chromium-loader'); canonicalBytes = await bytes(); await reload('canonical-second-load');
        const utilityHelp = await page.evaluate(mobile => {
          const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
          const help = document.querySelector('button[aria-label="How to play"]');
          return { mobile, viewport: [innerWidth, innerHeight], pageY: scrollY, help: rect(help), wrapper: rect(help.parentElement), utilities: [...document.querySelectorAll('[data-career-utility]')].map(button => ({ id: button.getAttribute('data-career-utility'), rect: rect(button) })) };
        }, profile.touch);
        row.utilityHelp = utilityHelp; write(`${id}-help-utility-rectangles`, utilityHelp);
        check(utilityHelp.utilities.length > 0 && helpUtilityFailures(utilityHelp).length === 0, 'Before utility scrolling, the mobile Help target is at least 44 pixels and every utility rectangle is disjoint from Help');
        const help = page.getByRole('button', { name: 'How to play', exact: true }); await help.scrollIntoViewIfNeeded(); await help.focus(); const beforeHelp = await body();
        await activate(help); const helpDialog = page.getByRole('dialog', { name: 'How to play', exact: true }); await helpDialog.waitFor();
        await page.waitForFunction(() => { const dialog = document.querySelector('[role="dialog"]'); return dialog && dialog.contains(document.activeElement); }, undefined, { timeout: 2000 });
        const rules = await helpDialog.innerText(); check(rules.includes('All seasons returns to the tile you opened') && rules.includes('a selection of 30 becomes 26') && rules.includes('99 senior club goals plus 2 this season'), 'Reopenable help explains chapter navigation, the four-game role and the personal goal example');
        utilityHelp.guide = rules; write(`${id}-help-utility-guide-observed`, utilityHelp);
        check(trainingGuideFailures(utilityHelp).length === 0, 'The actual loaded guide states both the mobile and desktop Training positions');
        await capture(helpDialog, 'rules'); await page.keyboard.press('Escape'); await helpDialog.waitFor({ state: 'hidden' }); await restored('button[aria-label="How to play"]', beforeHelp, 'rules-escape'); await unchanged('rules-readonly');
        const tiles = await oracle.evaluate(input => { const E = window.__storyRoleOracle; return E.story.storyTiles(E.reveal.careerBeforeBallonDorReveal(input)).map(tile => ({ ...tile, textLines: tile.lines.map(line => E.flags.splitFlagSegments(E.currency.localizeMoney(line)).filter(segment => 'text' in segment).map(segment => segment.text).join('')) })); }, canonical);
        write(`${id}-chapter-oracle`, tiles); check(tiles.length >= 12, 'Recorded chapter oracle contains the actual saved years and lines');
        const utilities = page.locator('[data-career-utilities]'), expectedUtilities = kind === 'retired' ? ['phone'] : ['training', 'phone'];
        check(await utilities.locator('[data-career-utility]').count() === expectedUtilities.length, 'The page contains one persistent utility button per available action');
        for (const utility of expectedUtilities) {
          const button = page.locator(`[data-career-utility="${utility}"]`), css = await button.evaluate(element => ({ position: getComputedStyle(element).position, translate: getComputedStyle(element).translate, rect: { width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height } }));
          write(`${id}-${utility}-computed-css`, css); check(css.position === (profile.touch ? 'relative' : 'fixed') && (!profile.touch || css.translate === 'none' || /^0(px)? 0(px)?$/.test(css.translate)), `${utility}: compiled CSS uses mobile flow and the desktop dock`); check(css.rect.width >= 44 && css.rect.height >= 44, `${utility}: actual control is at least 44 pixels`);
          await button.scrollIntoViewIfNeeded(); await button.focus(); const before = await body(); await activate(button); const dialog = page.getByRole('dialog', { name: utility === 'phone' ? 'Your phone' : 'Training ground', exact: true }); await dialogReady(dialog);
          check(await dialog.evaluate(element => element.contains(document.activeElement)), `${utility}: opening places focus inside the actual panel`);
          const close = dialog.getByRole('button', { name: utility === 'phone' ? 'Put phone away' : 'Close', exact: true }); await activate(close); await dialog.waitFor({ state: 'hidden' }); const observation = await restored(`[data-career-utility="${utility}"]`, before, `${utility}-close`); restorationControl ??= observation; await unchanged(`${utility}-readonly`);
        }
        overlapControl = await capture(profile.touch ? utilities : page.locator('[data-career-utility="phone"]'), 'utilities');
        if (kind === 'playing') { const plan = await page.locator('[data-reduced-role-plan]').innerText(); const p = canonical.reducedRole; check(plan.includes(`${p.club} for ${p.year}/${String(p.year + 1).slice(-2)}: 4 fewer planned league games`) && plan.includes('Selection limits, injuries and bans still apply'), 'The saved role note states exact club, upcoming year and four planned games'); }
        if (kind === 'summary') {
          const result = canonical.pendingSummary.reducedRole, note = await page.locator('[data-reduced-role-result]').innerText(); check(note.includes(result.club) && (result.outcome === 'served' ? note.includes('4 fewer league games before limits, injuries and bans') && note.includes('finished') : note.includes('interrupted') && note.includes('will not carry')), 'Summary accurately distinguishes served and interrupted selection plans');
          const milestone = await page.locator('[data-career-goal-milestone]').innerText(); check(milestone === 'You reached 100 senior club goals this season. Your recorded tally went from 99 to 101.' && !/club record/i.test(milestone), 'Summary milestone uses only the held senior tally and makes no club record claim');
          const continuation = page.getByRole('button', { name: /^Continue\s*→$/ }); check(await continuation.count() === 1, 'Actual summary has exactly one Continue control'); const layout = await capture(continuation, 'summary-continue'); check(layout.controls[0].width >= 44 && layout.controls[0].height >= 44, 'Summary Continue is painted and at least 44 pixels');
        }
        const story = page.locator(`[data-career-story="${kind === 'retired' ? 'inline' : 'dialog'}"]`), opener = page.locator('[data-open-career-story]'); let beforeStory;
        if (kind !== 'retired') { await opener.scrollIntoViewIfNeeded(); await opener.focus(); beforeStory = await body(); await activate(opener); await dialogReady(story); check(await page.evaluate(() => getComputedStyle(document.body).overflow === 'hidden'), 'Shared story dialog locks body scrolling'); }
        else await story.locator('[data-story-tile]').last().scrollIntoViewIfNeeded();
        const scroll = story.locator('[data-story-scroll]'); check(await story.locator('[data-story-tile]').count() === tiles.length, 'Story list contains exactly the projected saved chapters');
        if (kind === 'summary') { const starts = await story.locator('[data-story-starts-late]').innerText(); check(starts.includes(`The book starts in ${tiles[0].year}`), 'Legacy notice truthfully preserves the first retained story year'); }
        const selected = kind === 'summary' ? tiles.findIndex(tile => tile.more > 0) : tiles.length - 2; assert(selected >= 0);
        const tileButton = story.locator(`[data-story-tile="${tiles[selected].key}"]`); await tileButton.scrollIntoViewIfNeeded(); await tileButton.focus(); const listPosition = { top: await scroll.evaluate(element => element.scrollTop), y: (await body()).y }; await activate(tileButton);
        const inspect = async index => {
          const tile = tiles[index]; await story.locator(`[data-story-season="${tile.key}"]`).waitFor();
          const expected = { key: tile.key, heading: `${tile.year}${tile.current ? (canonical.retired ? ', the last chapter' : ', this season') : ''}`, identity: `Age ${tile.age} at ${tile.club}`, lines: tile.textLines };
          const actual = await story.evaluate(element => ({ key: element.querySelector('[data-story-season]').getAttribute('data-story-season'), heading: element.querySelector('[data-story-heading]').textContent, identity: element.querySelector('[data-story-identity]').textContent, lines: [...element.querySelectorAll('[data-story-line]')].map(line => line.children[1].textContent) }));
          const observation = { expected, actual }; row.chapters.push(observation); write(`${id}-chapter-${row.chapters.length}`, observation); check(chapterFailures(observation).length === 0, `Chapter ${tile.key}: exact saved year, age, club and every recorded line are shown`); chapterControl ??= observation;
          check(await story.locator('[data-story-heading]').evaluate(element => document.activeElement === element), `Chapter ${tile.key}: heading receives focus`);
          check(await story.locator('[data-story-previous]').isDisabled() === (index === 0) && await story.locator('[data-story-next]').isDisabled() === (index === tiles.length - 1), `Chapter ${tile.key}: navigation stops at the real recorded boundaries`);
          if (tile.more) check((await story.locator('[data-story-more]').innerText()) === `Plus ${tile.more} more from that season that did not fit in the book.`, 'The exact saved truncated count remains visible');
          await unchanged(`chapter-${row.chapters.length}`);
        };
        await inspect(selected); let index = selected;
        if (index > 0) { await activate(story.locator('[data-story-previous]')); await inspect(--index); }
        await activate(story.locator('[data-story-next]')); await inspect(++index);
        if (kind !== 'retired') {
          for (const key of ['Tab', 'Tab', 'Shift+Tab', 'Shift+Tab']) { await page.keyboard.press(key); check(await story.evaluate(element => element.contains(document.activeElement)), `${key} remains within the story dialog`); }
          const layout = await capture(story, 'story-chapter'); check(layout.controls.filter(control => /All seasons|chapter|Back to your career|Close/.test(control.label)).every(control => control.width >= 44 && control.height >= 44), 'Visible chapter, Back and Close controls are at least 44 pixels');
        } else await capture(story.locator('[data-story-heading]'), 'retired-chapter');
        await activate(story.locator('[data-story-back]')); await story.locator('[data-story-tiles]').waitFor(); const returned = { top: await scroll.evaluate(element => element.scrollTop), y: (await body()).y, focus: await tileButton.evaluate(element => document.activeElement === element) }; write(`${id}-list-return`, { expected: listPosition, actual: returned }); check(returned.focus && returned.top === listPosition.top && returned.y === listPosition.y, 'All seasons restores the original selected tile, list offset and page position');
        if (profile.width === 320 && kind === 'playing') check(listPosition.top > 0, 'Short phone journey exercises a genuinely scrolled recorded chapter list');
        await activate(story.locator(`[data-story-tile="${tiles.at(-1).key}"]`)); await inspect(tiles.length - 1);
        await activate(story.locator('[data-story-back]')); await story.locator('[data-story-tiles]').waitFor(); check(await story.locator(`[data-story-tile="${tiles.at(-1).key}"]`).evaluate(element => document.activeElement === element), 'Returning from the actual NOW or LAST chapter restores its tile');
        if (kind !== 'retired') {
          await page.keyboard.press('Escape'); await story.waitFor({ state: 'hidden' }); restorationControl = await restored('[data-open-career-story]', beforeStory, 'story-escape'); await unchanged('story-escape');
          await activate(opener); await dialogReady(story); await activate(story.locator('[data-story-close]')); await story.waitFor({ state: 'hidden' }); await restored('[data-open-career-story]', beforeStory, 'story-back'); await unchanged('story-back');
        }
        const footerLink = page.locator('footer a[href="/privacy"]').first(); await footerLink.focus(); await capture(footerLink, 'footer-access'); await unchanged('footer-readonly'); await reload('read-only-complete');
        if (kind === 'summary') check(await page.locator('[data-career-goal-milestone]').innerText() === 'You reached 100 senior club goals this season. Your recorded tally went from 99 to 101.', 'Reload retains the derived personal goal milestone');
        if (report.controls.length === 0) {
          const before = await bytes(); assert(overlapControl.controls.length > 0);
          detectorControl('overlap', overlapControl, outcome => { const point = outcome.controls[0].points[0], old = point.painted; point.painted = false; return () => { point.painted = old; }; }, layoutFailures, ['overlap']);
          detectorControl('wrong-chapter', chapterControl, outcome => { const old = outcome.actual.identity; outcome.actual.identity += ' at an incorrect club'; return () => { outcome.actual.identity = old; }; }, chapterFailures, ['wrong-chapter']);
          detectorControl('focus-body', restorationControl, outcome => { const old = { ...outcome.actual }; outcome.actual.activeMatches = false; outcome.actual.computed = 'hidden'; return () => { outcome.actual = old; }; }, restorationFailures, ['focus', 'computed-overflow']);
          detectorControl('help-utilities', utilityHelp, outcome => {
            const oldHelp = { ...outcome.help }, oldRect = { ...outcome.utilities[0].rect }, oldGuide = outcome.guide;
            outcome.help.width = 43; outcome.utilities[0].rect.x = outcome.help.x; outcome.utilities[0].rect.y = outcome.help.y;
            outcome.guide = outcome.guide.replace(TRAINING_GUIDE_FRAGMENT, 'the dumbbell button, bottom right');
            return () => { outcome.help = oldHelp; outcome.utilities[0].rect = oldRect; outcome.guide = oldGuide; };
          }, helpUtilityGuideFailures, ['help-target', 'help-overlap', 'guide-training']);
          check(await bytes() === before, 'All copied detector controls leave the actual complete save unchanged');
        }
        check(row.errors.length === 0 && row.assetErrors.length === 0, 'Actual page and owned assets report no errors'); check(row.writes.every(write => write.blocked) && report.forwardedExternalRequests === 0, 'Every external write attempt is intercepted locally, with zero forwarding'); row.ok = true;
      } catch (error) { row.ok = false; row.error = String(error?.stack || error); report.failed++; console.log(`FAIL ${id}: ${row.error}`); await page.screenshot({ path: path.join(OUT, `${id}-failure.png`) }).catch(() => {}); }
      finally { await context.close(); await oracleContext.close(); write(`${id}-report`, row); }
    }
  }
  report.sourceAfter = sourceHashes(); assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Product and driver source bytes are held throughout native proof'); report.fontManifestEntries = fonts.size;
} finally { await browser?.close(); server.kill(); write('report', report); }
console.log(`Career Story native: ${report.checks} checks, ${report.failed} failed, ${report.cases.filter(row => row.ok).length}/${report.cases.length} journeys; artifacts ${OUT}`);
assert.equal(report.cases.length, 9); assert.equal(report.controls.length, 4); assert.equal(report.failed, 0); assert(report.cases.every(row => row.ok));
