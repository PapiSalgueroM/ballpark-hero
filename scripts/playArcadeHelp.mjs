/* Round 757: arcade rules are reachable inside their game headers.
   BASE points at a finished, served build. ARCADE_HELP_CONTROL=unanchored restores
   the old floating trigger in the browser without changing source or game state.
   ARCADE_HELP_ARTIFACTS optionally saves measured rectangles and screenshots. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.BASE || 'http://127.0.0.1:4173';
const control = process.env.ARCADE_HELP_CONTROL || '';
const artifacts = process.env.ARCADE_HELP_ARTIFACTS;
assert.ok(['', 'unanchored'].includes(control), 'Unknown arcade help control');
const routes = [['/free-kick', 'FreeKick.tsx'], ['/buzzer-beater', 'BuzzerBeater.tsx']];
if (control) for (const [, file] of routes) {
  const source = await readFile(path.join(root, 'src/pages', file), 'utf8');
  assert.equal(source.split('<GameHelp inline className="h-11 w-11 shrink-0" />').length - 1, 1,
    `${file}: control must anchor to the actual inline trigger`);
}
const compiled = await build({
  stdin: { contents: `import {SOCCER_CONTENT_2} from './src/data/gameContent/soccer2';
import {BASKETBALL_CONTENT} from './src/data/gameContent/basketball';
import {flatGuide} from './src/data/gameContent/guideShape';
export const guides={'/free-kick':flatGuide(SOCCER_CONTENT_2['/free-kick']),'/buzzer-beater':flatGuide(BASKETBALL_CONTENT['/buzzer-beater'])};`,
    resolveDir: root, loader: 'ts' },
  bundle: true, format: 'esm', write: false, platform: 'node',
});
const { guides } = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const reports = [];
const browser = await chromium.launch({ headless: true });
try {
  if (artifacts) await mkdir(artifacts, { recursive: true });
  for (const [route] of routes) for (const width of [320, 390, 430, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    try {
      await context.route('**/*', request => {
        const url = new URL(request.request().url());
        return url.origin === new URL(base).origin ? request.continue() : request.abort();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      const trigger = page.getByRole('button', { name: 'How to play', exact: true });
      await trigger.waitFor();
      await page.waitForTimeout(800);
      if (control) await trigger.evaluate(button => {
        if (getComputedStyle(button).position !== 'static') throw new Error('Control requires the repaired inline button');
        Object.assign(button.style, { position: 'absolute', left: '0', top: '0', width: 'auto', height: 'auto' });
        if (getComputedStyle(button).position !== 'absolute') throw new Error('Control did not restore floating positioning');
      });
      const geometry = await trigger.evaluate(button => {
        const rect = element => {
          const r = element.getBoundingClientRect();
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        };
        const b = rect(button), h = rect(document.querySelector('main header')), title = rect(document.querySelector('main h1'));
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return { button: b, header: h, title,
          inHeader: b.left >= h.left - 1 && b.right <= h.right + 1 && b.top >= h.top - 1 && b.bottom <= h.bottom + 1,
          hit: button === hit || button.contains(hit),
          titleOverlap: Math.max(0, Math.min(b.right, title.right) - Math.max(b.left, title.left)) * Math.max(0, Math.min(b.bottom, title.bottom) - Math.max(b.top, title.top)),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      if (control) {
        assert.equal(geometry.inHeader, false, `${route}/${width}: old position must fail the header check`);
        assert.equal(geometry.button.top, 0);
        if (width === 1440) {
          assert.equal(geometry.hit, false, 'Desktop ticker must reproduce interception');
          await assert.rejects(trigger.click({ timeout: 900 }), /Timeout/, 'Normal click must reproduce the blocked help');
        }
      } else {
        assert.equal(geometry.inHeader, true);
        assert.equal(geometry.hit, true);
        assert.equal(geometry.titleOverlap, 0);
        assert.ok(geometry.button.width >= 44 && geometry.button.height >= 44);
        assert.ok(geometry.overflow <= 1);
        for (const activation of ['pointer', 'Enter', 'Space']) {
          if (activation === 'pointer') await trigger.click();
          else { await trigger.focus(); await trigger.press(activation); }
          const dialog = page.getByRole('dialog');
          await dialog.waitFor();
          await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement));
          await dialog.evaluate(async element => {
            await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {})));
          });
          await page.waitForTimeout(50);
          const content = await dialog.evaluate(element => [...element.querySelectorAll('ol li, ul li, .space-y-2 p')].map(line => line.textContent));
          assert.deepEqual(content, [...guides[route].howToPlay, ...guides[route].rules, ...guides[route].example]);
          if (activation === 'Space') await page.keyboard.press('Escape');
          else await dialog.getByRole('button', { name: activation === 'pointer' ? "Let's Play!" : 'Close', exact: true }).click();
          await dialog.waitFor({ state: 'hidden' });
          await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'How to play', null, { timeout: 1500 }).catch(async () => {
            assert.fail(`Help focus did not return: ${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 250))}`);
          });
        }
      }
      assert.deepEqual(errors, []);
      reports.push({ route, width, ...geometry });
      if (artifacts) await page.screenshot({ path: path.join(artifacts, `${route.slice(1)}-${width}${control ? '-control' : ''}.png`) });
      console.log(`PASS ${route} ${width}px: ${control ? 'old floating defect reproduced' : '44px help, exact rules, pointer and keyboard, focus restored'}`);
    } finally { await context.close(); }
  }
  if (artifacts) await writeFile(path.join(artifacts, `evidence${control ? '-control' : ''}.json`), JSON.stringify(reports, null, 2));
  console.log(`playArcadeHelp: ${reports.length} route/width checks green${control ? ', old positioning control fired' : ', no overflow or page errors'}.`);
} finally { await browser.close(); }
