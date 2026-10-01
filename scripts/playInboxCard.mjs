/* Round 771: actual retained InboxCard, real pure reply effects and native browser scheduling.
   INBOX_CARD_DIST selects a finished build; default is ROOT/dist.
   INBOX_CARD_CONTROL=passive|nowrap changes asserted temporary copies.
   INBOX_CARD_ARTIFACTS optionally saves screenshots and measured reports. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(process.env.INBOX_CARD_DIST || path.join(root, 'dist'));
const control = process.env.INBOX_CARD_CONTROL || '';
assert.ok(['', 'passive', 'nowrap'].includes(control), 'Unknown inbox browser control');
const artifacts = process.env.INBOX_CARD_ARTIFACTS ? path.resolve(process.env.INBOX_CARD_ARTIFACTS) : null;
const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'dukb-inbox-card-'));
const owned = [];
const results = [];
let server;
let browser;
async function write(name, content) {
  const file = path.join(folder, name);
  owned.push(file);
  await fs.writeFile(file, content);
  return file;
}
try {
  const mainCss = (await fs.readdir(path.join(dist, 'assets'))).filter(name => /^index-.*\.css$/.test(name));
  assert.equal(mainCss.length, 1);
  owned.push(path.join(folder, 'production.css'));
  await fs.copyFile(path.join(dist, 'assets', mainCss[0]), path.join(folder, 'production.css'));
  await write('fixture.tsx', `import React from 'react';
  import { createRoot } from 'react-dom/client';
  import { flushSync } from 'react-dom';
  import { InboxCard } from '@/components/club-manager/InboxCard';
  import { answerMessage } from '@/lib/clubManager';

  const initial = Array.from({ length: 8 }, (_, index) => ({
    id: \`fixture-message-\${index}\`, playerId: \`fixture-player-\${index}\`, playerName: \`Fixture Player \${index}\`,
    kind: index === 6 ? 'roleTalk' : 'startMe', from: index === 7 ? 'Fixture reporter' : 'Your captain',
    text: \`Fixture request \${index} needs a reply.\`, week: 24 - index,
    options: [{ label: \`Listen \${index}\`, effect: 'listen' }, { label: \`Promise \${index}\`, effect: 'promise' }, { label: \`Refuse \${index}\`, effect: 'refuse' }],
    ...(index < 5 ? { resolved: \`Fixture stored outcome \${index}, exactly as saved.\` } : {}),
  }));
  initial.forEach(message => { message.options.forEach(Object.freeze); Object.freeze(message.options); Object.freeze(message); });
  Object.freeze(initial);
  const initialBytes = JSON.stringify(initial);
  const makeState = inbox => ({ inbox, week: 24, budget: 500, promisedStarts: [], squad: initial.map(message => ({ id: message.playerId, morale: 50 })) });
  const root = createRoot(document.getElementById('root')!);
  let state = makeState(initial);
  let revision = 0;
  let noOp = false;
  window.__calls = [];
  const paint = () => flushSync(() => root.render(<main style={{ maxWidth: 672, margin: 'auto', padding: '24px 16px' }}><h1 className="mb-4 text-lg font-bold">Retained inbox fixture</h1><InboxCard key={revision} career={state} onAnswer={(id, index) => {
    window.__calls.push({ id, index });
    if (!noOp) { state = answerMessage(state, id, index); paint(); }
  }} /></main>));
  window.__qa = {
    clone: () => { state = { ...state, inbox: state.inbox.map(message => ({ ...message, options: message.options.map(option => ({ ...option })) })) }; paint(); },
    noOp: value => { noOp = value; },
    autoResolve: () => { state = { ...state, inbox: state.inbox.map(message => message.id === 'fixture-message-7' ? { ...message, resolved: 'Fixture automatically resolved later. No chosen option was recorded.' } : message) }; paint(); },
    reset: (kind = 'normal') => {
      revision += 1; noOp = false; window.__calls = [];
      const inbox = kind === 'empty' ? [] : kind === 'long' ? initial.map((message, index) => ({ ...message,
        from: index === 5 ? 'FixtureSenderWithAnUnbrokenLongGeneratedNameForNarrowPhoneTesting' : message.from,
        text: index === 5 ? 'FixtureUnbrokenMessageThatContainsTheCompleteSavedRequestAndMustWrapWithoutClippingAtTheNarrowestPhoneWidthForTesting' : index === 6 ? 'Fixture request with a very long spaced explanation that preserves every word from the retained message and wraps within the card without hiding any text.' : message.text,
        options: message.options.map((option, optionIndex) => ({ ...option, label: index === 5 && optionIndex === 0 ? 'FixtureUnbrokenOptionLabelThatMustRemainCompletelyReadableWhenItsReplyButtonWrapsAt320Pixels' : option.label })),
      })) : initial;
      state = makeState(inbox); paint();
    },
    receive: () => { state = makeState(initial); paint(); },
    state: () => state,
    untouched: () => JSON.stringify(initial) === initialBytes,
  };
  paint();
  `);
  const sourceCssPath = path.join(root, 'src/components/club-manager/InboxCard.module.css');
  const sourceCss = await fs.readFile(sourceCssPath, 'utf8');
  const controlCss = path.join(folder, 'ControlInboxCard.module.css');
  const cardPath = path.join(root, 'src/components/club-manager/InboxCard.tsx');
  const cardSource = await fs.readFile(cardPath, 'utf8');
  const probePath = path.join(folder, 'ProbeInboxCard.tsx');
  const alias = { '@': path.join(root, 'src') };
  if (control === 'passive') {
    const anchor = /  useLayoutEffect\(\(\) => \{\r?\n    if \(!answerRequest\)/g;
    assert.equal([...cardSource.matchAll(anchor)].length, 1, 'Real reply layout-effect binding must occur once');
    const cssImport = "from './InboxCard.module.css'";
    assert.equal(cardSource.split(cssImport).length - 1, 1);
    const changed = cardSource.replace(anchor, '  useEffect(() => {\n    if (!answerRequest)').replace(cssImport, "from '@/components/club-manager/InboxCard.module.css'");
    assert.notEqual(changed, cardSource, 'Control must change actual reply scheduling');
    await write(path.basename(probePath), changed);
    alias['@/components/club-manager/InboxCard'] = probePath;
  }
  if (control === 'nowrap') {
    const anchor = 'overflow-wrap: anywhere;';
    assert.equal(sourceCss.split(anchor).length - 1, 1, 'Real full-text wrap binding must occur once');
    const changed = sourceCss.replace(anchor, 'overflow-wrap: normal;');
    assert.notEqual(changed, sourceCss);
    await write(path.basename(controlCss), changed);
  }
  owned.push(path.join(folder, 'fixture.js'), path.join(folder, 'fixture.css'));
  await build({ entryPoints: [path.join(folder, 'fixture.tsx')], outfile: path.join(folder, 'fixture.js'), bundle: true, format: 'esm', jsx: 'automatic', nodePaths: [path.join(root, 'node_modules')], alias, loader: { '.module.css': 'local-css' }, define: { 'process.env.NODE_ENV': '"production"' }, plugins: control === 'nowrap' ? [{ name: 'asserted-no-wrap-copy', setup(build) { build.onResolve({ filter: /^\.\/InboxCard\.module\.css$/ }, () => ({ path: controlCss })); } }] : [] });
  const html = '<!doctype html><html class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/production.css"><link rel="stylesheet" href="/fixture.css"></head><body style="margin:0;background:hsl(var(--background));color:hsl(var(--foreground))"><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>';
  server = createServer(async (req, res) => {
    const name = new URL(req.url, 'http://local').pathname;
    try {
      if (['/production.css', '/fixture.css', '/fixture.js'].includes(name)) { res.setHeader('content-type', name.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(await fs.readFile(path.join(folder, name.slice(1)))); }
      else { res.setHeader('content-type', 'text/html'); res.end(html); }
    } catch { res.statusCode = 404; res.end('missing'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  for (const width of control ? [320] : [320, 390, 430, 1440]) for (const reduced of [false, true]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await context.addInitScript(() => { window.__writes = []; const write = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { window.__writes.push(key); return write.call(this, key, value); }; });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.getByRole('button', { name: 'All (8)', exact: true }).waitFor();
    const bootstrap = await page.evaluate(() => { const keys = [...window.__writes]; window.__writes = []; return keys; });
    assert.ok(bootstrap.every(key => /^lswt-/.test(key)), 'Only the existing storage availability probe can precede interactions');
    const cleanInteractions = async () => {
      assert.equal(await page.evaluate(() => window.__qa.untouched()), true);
      assert.deepEqual(await page.evaluate(() => window.__writes), []);
      assert.deepEqual(errors, []);
    };
    if (control === 'nowrap') {
      await page.evaluate(() => window.__qa.reset('long'));
      await page.getByRole('button', { name: 'Pending (3)' }).click();
      const broken = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, escaped: [...document.querySelectorAll('[data-inbox-message] p, [data-inbox-message] button')].filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.textContent) }));
      assert.ok(broken.overflow > 1, 'Asserted no-wrap copy must restore actual phone overflow');
      assert.ok(broken.escaped.some(text => text.includes('FixtureUnbroken')), 'Unbroken saved copy must trigger the measured defect');
      results.push({ width, motion: reduced ? 'reduced' : 'normal', ...broken });
      console.log(`inbox nowrap320 ${reduced ? 'reduced' : 'normal'}: asserted scoped CSS copy restores ${broken.overflow}px overflow and ${broken.escaped.length} overflowing full-text fields.`);
      await cleanInteractions();
      await context.close();
      continue;
    }
    const outcomes = [];
    const rectangles = [];
    const ids = () => page.locator('[data-inbox-message]').evaluateAll(cards => cards.map(card => card.dataset.inboxMessage));
    const verify = async (expected, text) => {
      assert.deepEqual(await ids(), expected.map(index => `fixture-message-${index}`));
      assert.equal(await page.getByRole('status').innerText(), text);
      const actual = await page.locator('[data-inbox-message]').evaluateAll(cards => cards.map(card => ({ id: card.dataset.inboxMessage, text: card.textContent, options: [...card.querySelectorAll('button')].map(button => button.textContent) })));
      const state = await page.evaluate(() => window.__qa.state());
      actual.forEach(card => {
        const saved = state.inbox.find(message => message.id === card.id);
        assert.ok(card.text.includes(`Week ${saved.week}`));
        assert.ok(card.text.includes(saved.text));
        if (saved.from) assert.ok(card.text.includes(saved.from));
        if (saved.resolved) { assert.ok(card.text.includes(saved.resolved)); assert.deepEqual(card.options, []); }
        else assert.deepEqual(card.options, saved.options.map(option => option.label));
      });
      outcomes.push({ ids: actual.map(card => card.id), status: text });
    };
    const geometry = async label => {
      const measured = await page.evaluate(() => {
        const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; };
        return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, controls: [...document.querySelectorAll('input,button')].map(element => ({ ...rect(element), label: element.getAttribute('aria-label') || element.textContent, clipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1 })), text: [...document.querySelectorAll('[data-inbox-message] p,[data-inbox-message] div')].map(element => ({ ...rect(element), clipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1, text: element.textContent })) };
      });
      assert.ok(measured.overflow <= 1, `${label} document overflow ${measured.overflow}px`);
      for (const control of measured.controls) {
        assert.ok(control.width >= 44 && control.height >= 44, `${label} target below44: ${control.label}`);
        assert.ok(control.left >= 0 && control.right <= width + 0.5, `${label} target escaped`);
        assert.equal(control.clipped, false, `${label} clipped target ${control.label}`);
      }
      measured.text.forEach(text => { assert.ok(text.left >= 0 && text.right <= width + 0.5, `${label} text escaped`); assert.equal(text.clipped, false, `${label} clipped saved text ${text.text}`); });
      rectangles.push({ label, ...measured });
    };
    const quiet = async () => {
      const state = await page.evaluate(() => ({ markers: [...document.querySelectorAll('[data-inbox-feedback]')].map(element => ({ id: element.dataset.inboxMessage, text: element.textContent })), animations: document.getAnimations().filter(animation => animation instanceof CSSAnimation).map(animation => ({ name: animation.animationName, target: animation.effect.target.dataset.inboxMessage, className: animation.effect.target.className })) }));
      assert.deepEqual(state.markers, [], JSON.stringify(state));
      assert.deepEqual(state.animations, [], JSON.stringify(state));
    };
    await verify([0, 1, 2, 3], 'Showing 4 of 8 retained messages.'); await quiet(); await geometry('default');
    await page.evaluate(() => { window.__firstCards = [...document.querySelectorAll('[data-inbox-message]')]; });
    const load = page.getByRole('button', { name: 'Load more messages' });
    await load.focus(); await page.keyboard.press('Enter');
    await verify([0, 1, 2, 3, 4, 5, 6, 7], 'Showing 8 of 8 retained messages.');
    assert.equal(await page.evaluate(() => window.__firstCards.every((card, index) => card === document.querySelectorAll('[data-inbox-message]')[index])), true);
    assert.equal(await page.locator('[data-inbox-message="fixture-message-4"]').evaluate(element => document.activeElement === element), true);
    assert.equal(await load.count(), 0); await geometry('all-loaded');
    await page.getByRole('button', { name: 'Pending (3)' }).click();
    await verify([5, 6, 7], 'Showing 3 of 3 pending messages.');
    const search = page.getByRole('searchbox', { name: 'Search messages' });
    await search.fill('ROLE TALK'); await verify([6], 'Showing 1 of 1 pending messages.');
    assert.equal(await search.evaluate(element => document.activeElement === element), true);
    await page.evaluate(() => { window.__search = document.querySelector('input'); window.__retained = document.querySelector('[data-inbox-message]'); window.__qa.clone(); });
    assert.equal(await page.evaluate(() => document.querySelector('input') === window.__search && document.activeElement === window.__search && document.querySelector('[data-inbox-message]') === window.__retained), true); await quiet();
    await search.fill('outcome 4'); await verify([], 'Showing 0 of 0 pending messages.');
    await page.getByText('No messages match your search in this view.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Resolved (5)' }).click(); await verify([4], 'Showing 1 of 1 resolved messages.');
    await page.getByRole('button', { name: 'Reset filters' }).click(); await verify([0, 1, 2, 3], 'Showing 4 of 8 retained messages.');
    assert.deepEqual(await page.evaluate(() => window.__calls), []); assert.equal(await search.inputValue(), '');
    await load.click();
    await page.evaluate(() => { window.__replyCard = document.querySelector('[data-inbox-message="fixture-message-7"]'); });
    await page.getByRole('button', { name: 'Promise 7', exact: true }).focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('[data-inbox-feedback]'));
    const motion = await page.evaluate(() => {
      window.__animations = document.getAnimations().filter(animation => animation instanceof CSSAnimation);
      return window.__animations.map(animation => ({ name: animation.animationName, duration: animation.effect.getTiming().duration, iterations: animation.effect.getTiming().iterations, id: animation.effect.target.dataset.inboxMessage }));
    });
    assert.equal(motion.length, reduced ? 0 : 1);
    if (!reduced) { assert.equal(motion[0].duration, 420); assert.equal(motion[0].iterations, 1); assert.equal(motion[0].id, 'fixture-message-7'); }
    assert.equal(await page.evaluate(() => document.querySelector('[data-inbox-message="fixture-message-7"]') === window.__replyCard && document.activeElement === window.__replyCard), true);
    await page.evaluate(() => window.__qa.clone());
    assert.equal(await page.evaluate(() => { const current = document.getAnimations().filter(animation => animation instanceof CSSAnimation); return current.length === window.__animations.length && current.every(animation => window.__animations.includes(animation)) && window.__animations.every(animation => current.includes(animation)); }), true, 'Running clone must retain the exact animation objects');
    assert.deepEqual(await page.evaluate(() => window.__calls), [{ id: 'fixture-message-7', index: 1 }]);
    const committed = await page.evaluate(() => window.__qa.state());
    assert.equal(committed.squad[7].morale, 60); assert.deepEqual(committed.promisedStarts, ['fixture-player-7']);
    assert.equal(committed.inbox[7].resolved, 'You promised him a start. He left smiling. Break it and he will notice.');
    await page.waitForTimeout(600); await quiet();
    await page.evaluate(() => window.__qa.clone()); await quiet();
    await page.getByRole('button', { name: 'Resolved (6)' }).click(); await load.click(); await quiet();
    await verify([0, 1, 2, 3, 4, 7], 'Showing 6 of 6 resolved messages.'); await geometry('resolved-outcomes');
    await page.evaluate(() => window.__qa.reset()); await load.click();
    await page.evaluate(() => window.__qa.noOp(true));
    await page.getByRole('button', { name: 'Listen 7', exact: true }).click(); await quiet();
    await page.evaluate(() => window.__qa.autoResolve());
    if (control === 'passive') {
      await page.waitForFunction(() => document.querySelector('[data-inbox-message="fixture-message-7"][data-inbox-feedback="committed"]'), null, { timeout: 350 });
      const race = await page.evaluate(() => ({ id: document.querySelector('[data-inbox-feedback]')?.dataset.inboxMessage, text: document.querySelector('[data-inbox-feedback]')?.textContent, animations: document.getAnimations().filter(animation => animation instanceof CSSAnimation).map(animation => ({ name: animation.animationName, duration: animation.effect.getTiming().duration, id: animation.effect.target.dataset.inboxMessage })) }));
      assert.equal(race.id, 'fixture-message-7', 'Changed passive hook must falsely cue the later automatic resolution');
      assert.ok(race.text.includes('Fixture automatically resolved later. No chosen option was recorded.'));
      assert.equal(race.animations.length, reduced ? 0 : 1);
      if (!reduced) { assert.equal(race.animations[0].duration, 420); assert.equal(race.animations[0].id, race.id); }
      results.push({ width, motion: reduced ? 'reduced' : 'normal', nativeNoOpThenAutomaticResolution: race });
      console.log(`inbox passive320 ${reduced ? 'reduced' : 'normal'}: asserted hook copy restores the false committed marker for the exact later automatic outcome; ${race.animations.length} CSS animations.`);
      await cleanInteractions();
      await context.close();
      continue;
    }
    await quiet();
    assert.equal(await page.locator('[data-inbox-message="fixture-message-7"]').getAttribute('data-inbox-state'), 'resolved');
    await page.evaluate(() => window.__qa.reset());
    await page.getByRole('button', { name: 'Pending (3)' }).click();
    await page.getByRole('button', { name: 'Listen 7', exact: true }).focus(); await page.keyboard.press('Space');
    await verify([5, 6], 'Showing 2 of 2 pending messages.');
    assert.equal(await page.getByRole('button', { name: 'Pending (2)' }).evaluate(element => document.activeElement === element), true);
    await page.getByRole('button', { name: 'Resolved (6)' }).click(); await load.click(); await quiet();
    assert.equal(await page.getByText('You heard him out. Sometimes that is all it takes.', { exact: true }).count(), 1);
    await page.evaluate(() => window.__qa.reset('long'));
    await page.getByRole('button', { name: 'Pending (3)' }).click(); await verify([5, 6, 7], 'Showing 3 of 3 pending messages.'); await geometry('long-saved-copy');
    assert.deepEqual(await page.evaluate(() => window.__calls), []);
    if (width === 320 && artifacts) { await fs.mkdir(artifacts, { recursive: true }); await page.screenshot({ path: path.join(artifacts, `320-${reduced ? 'reduced' : 'normal'}-pending.png`), fullPage: true }); }
    await page.evaluate(() => window.__qa.reset('empty')); assert.equal(await page.locator('[data-inbox-message]').count(), 0); await quiet();
    await page.evaluate(() => window.__qa.receive()); await verify([0, 1, 2, 3], 'Showing 4 of 8 retained messages.'); await quiet();
    await cleanInteractions();
    results.push({ width, motion: reduced ? 'reduced' : 'normal', initialStorageProbeKeys: bootstrap, outcomes, rectangles, committedAnimation: motion, exactCallbacksAndEffects: true, stableReplyAndLoadFocus: true, quietRestoredNoOpClonesAndViews: true, noInputMutationOrInteractionWrites: true, errors });
    console.log(`inbox ${width}px ${reduced ? 'reduced' : 'normal'}: all8 retained IDs, pending/resolved/search/reset, exact real-engine reply effects and both focus paths passed; max overflow ${Math.max(...rectangles.map(rectangle => rectangle.overflow))}px; zero interaction writes/errors.`);
    await context.close();
  }
  assert.equal(await fs.readFile(sourceCssPath, 'utf8'), sourceCss, 'Production CSS must remain unchanged');
  assert.equal(await fs.readFile(cardPath, 'utf8'), cardSource, 'Production card must remain unchanged');
  if (artifacts) {
    await fs.mkdir(artifacts, { recursive: true });
    await fs.writeFile(path.join(artifacts, control ? `${control}-report.json` : 'report.json'), JSON.stringify({ dist, fixture: 'Actual compiled InboxCard and real pure answerMessage, frozen fictional retained messages and finished production CSS. Standalone card fixture, not a full Club Manager saved session. Outside requests blocked.', results }, null, 2));
  }
  if (control) console.log(`playInboxCard ${control}: both motion modes reproduce the asserted real scheduling or wrapping defect.`);
  else console.log('playInboxCard: all eight viewport/motion cases pass with complete saved copy and 44px controls; original input order and reply identity retained.');
  console.log('playInboxCard: production card/CSS unchanged, no account or remote writes, zero interaction save writes; all temporary source copies are owned.');
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  for (const file of owned) await fs.rm(file, { force: true });
  await fs.rmdir(folder);
}
console.log('playInboxCard: owned temporary files, headless browser and localhost server cleaned.');
