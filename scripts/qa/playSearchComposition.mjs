import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '../lib/playwrightLoader.mjs';
import { loadFonts, inventory, staticRequest, seed } from './siteMenuNavigationSupport.mjs';

async function main() {
  const out = process.env.SEARCH_COMPOSITION_OUT;
  if (!out || !path.isAbsolute(out)) throw new Error('Absolute SEARCH_COMPOSITION_OUT required');
  fs.mkdirSync(out);
  const base = 'http://127.0.0.1:4173';
  const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
  const files = new Set(inventory('dist').map(row => '/' + row.file));
  const cases = [];

  function sample() {
    const field = document.querySelector('input[aria-label="Search games"]');
    const links = [...document.querySelectorAll('main a[data-result]')];
    const select = document.querySelector('main select');
    return {
      href: location.href,
      query: field?.value,
      inputFocused: document.activeElement === field,
      resultFocus: links.indexOf(document.activeElement),
      selection: field ? [field.selectionStart, field.selectionEnd] : null,
      results: links.map(link => ({ href: link.getAttribute('href'), text: link.textContent })),
      select: select ? { value: select.value, focused: document.activeElement === select,
        options: [...select.options].map(option => option.value) } : null,
      groups: [...document.querySelectorAll('main section > h2')].map(node => node.textContent),
      events: window.__searchKeys || [],
      fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'),
        display: document.fonts.check('16px "Space Grotesk"') },
      viewport: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth },
    };
  }

  const browser = await chromium.launch();
  try {
    for (const spec of [
      { width:328, height:515, theme:'dark' },
      { width:1280, height:900, theme:'light' },
    ]) {
      const id = spec.width + '-' + spec.height + '-' + spec.theme;
      const record = { id, ...spec, observations:[], errors:[], io:[], syntheticComposition:true, osImeTested:false };
      const context = await browser.newContext({ viewport:{ width:spec.width, height:spec.height }, serviceWorkers:'block' });
      await context.routeWebSocket('**/*', async socket => {
        record.io.push({ kind:'websocket-abort' }); await socket.close();
      });
      const page = await context.newPage();
      page.on('pageerror', error => record.errors.push({ name:error.name, message:error.message, stack:error.stack }));
      await context.addInitScript(seed, { theme:spec.theme, pending:false });
      await context.addInitScript(() => {
        window.__searchKeys = [];
        window.addEventListener('keydown', event => {
          const target = event.target;
          window.__searchKeys.push({ key:event.key, code:event.code, keyCode:event.keyCode,
            isComposing:event.isComposing, isTrusted:event.isTrusted, defaultPrevented:event.defaultPrevented,
            target:target?.tagName, targetName:target?.getAttribute?.('aria-label') });
        });
      });
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url()), font = fonts.get(request.url());
        if (font && request.method() === 'GET' && ['stylesheet','font'].includes(request.resourceType())) {
          record.io.push({ kind:'prepared-font', url:request.url(), sha256:font.sha256 });
          return route.fulfill({ status:200, contentType:font.contentType, body:font.body });
        }
        if (url.origin === base) {
          let checked = url;
          if (request.method() === 'GET' && request.resourceType() === 'document'
            && url.pathname === '/search' && url.search === '?q=career&source=composition&tag=one&tag=two') {
            checked = new URL(url);
            checked.search = '';
          }
          staticRequest(checked, request.method(), base, files);
          return route.continue();
        }
        record.io.push({ kind:'external-abort', url:request.url(), method:request.method(), resourceType:request.resourceType() });
        return route.abort();
      });
      const field = page.getByRole('textbox', { name:'Search games', exact:true });
      const read = () => page.evaluate(sample);
      const ordinary = async (name, target, key) => {
        await target.focus();
        const before = await read();
        await page.keyboard.press(key);
        const after = await read();
        const events = after.events.slice(before.events.length);
        record.observations.push({ name, kind:'trusted-keyboard', key, before, after, events });
        assert.equal(events.length, 1, name + ': one keydown observed');
        assert.equal(events[0].key, key);
        assert.equal(events[0].isTrusted, true);
        assert.equal(events[0].isComposing, false);
        return { before, after, event:events[0] };
      };
      try {
        await page.goto(base + '/search?q=career&source=composition&tag=one&tag=two', { waitUntil:'domcontentloaded' });
        await field.waitFor();
        await page.locator('main a[data-result]').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        for (const mode of ['modern', 'legacy']) {
          for (const key of ['ArrowDown', 'ArrowUp', 'Escape']) {
            await field.focus();
            const before = await read();
            assert.ok(before.results.length > 1, 'Actual search results required');
            const event = await field.evaluate((node, args) => {
              const dispatched = new KeyboardEvent('keydown', { key:args.key, bubbles:true, cancelable:true,
                isComposing:args.mode === 'modern', keyCode:args.mode === 'legacy' ? 229 : 0 });
              node.dispatchEvent(dispatched);
              return { key:dispatched.key, keyCode:dispatched.keyCode, isComposing:dispatched.isComposing,
                isTrusted:dispatched.isTrusted, defaultPrevented:dispatched.defaultPrevented };
            }, { mode, key });
            const after = await read();
            record.observations.push({ name:mode + '-' + key, kind:'synthetic-composition', before, event, after });
            assert.equal(event.isTrusted, false);
            assert.equal(event.isComposing, mode === 'modern');
            assert.equal(event.keyCode, mode === 'legacy' ? 229 : 0);
            assert.equal(event.defaultPrevented, false, mode + '-' + key + ': composition key left unconsumed');
            assert.equal(after.inputFocused, true);
            assert.equal(after.query, before.query);
            assert.equal(after.href, before.href);
            assert.deepEqual(after.results, before.results);
          }
        }
        const down = await ordinary('ordinary-down', field, 'ArrowDown');
        assert.equal(down.event.defaultPrevented, true);
        assert.equal(down.after.resultFocus, 0);
        const up = await ordinary('ordinary-up', field, 'ArrowUp');
        assert.equal(up.event.defaultPrevented, true);
        assert.equal(up.after.resultFocus, up.after.results.length - 1);

        await field.focus();
        await field.evaluate(node => node.setSelectionRange(3, 3));
        const left = await ordinary('ordinary-cursor-left', field, 'ArrowLeft');
        assert.equal(left.event.defaultPrevented, false);
        assert.deepEqual(left.after.selection, [2, 2]);
        const right = await ordinary('ordinary-cursor-right', field, 'ArrowRight');
        assert.equal(right.event.defaultPrevented, false);
        assert.deepEqual(right.after.selection, [3, 3]);
        assert.equal(right.after.query, 'career');

        const select = page.getByRole('combobox', { name:'Filter by sport', exact:true });
        const selected = await ordinary('ordinary-select-down', select, 'ArrowDown');
        assert.equal(selected.event.defaultPrevented, false);
        assert.equal(selected.after.select.focused, true);
        assert.equal(selected.after.select.value, selected.before.select.options[1]);
        assert.equal(selected.after.groups.length, 1);
        assert.ok(selected.after.groups[0].includes(selected.after.select.value));
        assert.ok(selected.after.results.length > 0);
        assert.equal(selected.after.query, 'career');
        assert.equal(selected.after.href, selected.before.href);
        const selectUp = await ordinary('ordinary-select-up', select, 'ArrowUp');
        assert.equal(selectUp.event.defaultPrevented, false);
        assert.equal(selectUp.after.select.value, selectUp.before.select.options[0]);

        const escape = await ordinary('ordinary-escape', field, 'Escape');
        assert.equal(escape.event.defaultPrevented, true);
        assert.equal(escape.after.query, '');
        assert.equal(escape.after.inputFocused, true);
        await page.waitForURL(url => !url.searchParams.has('q'));
        const cleared = await read();
        record.observations.push({ name:'escape-url-settled', value:cleared });
        const url = new URL(cleared.href);
        assert.equal(url.searchParams.get('source'), 'composition');
        assert.deepEqual(url.searchParams.getAll('tag'), ['one', 'two']);
        const empty = await ordinary('empty-escape', field, 'Escape');
        assert.equal(empty.event.defaultPrevented, false);
        assert.equal(empty.after.query, '');
        assert.equal(empty.after.href, empty.before.href);

        await field.fill('career');
        await page.waitForURL(url => url.searchParams.get('q') === 'career');
        await field.focus();
        await page.evaluate(() => document.fonts.ready);
        record.observations.push({ name:'settled-search', value:await read() });
        await page.screenshot({ path:path.join(out, id + '.png') });
        assert.deepEqual(record.errors, [], 'No application page errors');
        record.complete = true;
      } catch (error) {
        record.failure = { name:error.name, message:error.message, stack:error.stack };
        throw error;
      } finally {
        cases.push(record);
        fs.writeFileSync(path.join(out, id + '.json'), JSON.stringify(record,null,2) + '\n', { flag:'wx' });
        await context.close();
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out, 'browser-observations.json'), JSON.stringify({
      source:process.env.GITHUB_SHA, run:process.env.GITHUB_RUN_ID, attempt:process.env.GITHUB_RUN_ATTEMPT,
      syntheticComposition:true, osImeTested:false, pixelsReviewed:false, cases,
    },null,2) + '\n', { flag:'wx' });
  }
  console.log('Retained ' + cases.length + ' Search contexts with synthetic composition and trusted ordinary keyboard observations.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
