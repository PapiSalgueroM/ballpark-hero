// Release AU probe: does the page move when the Squad sheet of Soccer Career is closed? Measured the way PR216's
// walk measures it (scripts/playCareerProgramme.mjs line 113 to 132), on any served build, so the head and
// origin/release-at-gate can be read side by side. The save is PR216's own fixture (native-fixtures.json, the first
// soccer row), which holds no field the older build does not know.
// usage: node squadBackProbe.mjs <label> <base url> <fixtures json>
import fs from 'node:fs';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const [label, base, fixturesFile] = process.argv.slice(2);
const fixture = JSON.parse(fs.readFileSync(fixturesFile, 'utf8')).find(f => f.slug === 'soccer-career' && !f.id);
const browser = await pw.chromium.launch({ headless: true });
let moved = 0;
for (const [width, height] of [[320, 568], [360, 740], [390, 844], [1280, 900]]) {
  for (const route of ['close', 'eleven']) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.route('**/*', r => (r.request().url().startsWith(base + '/') || r.request().url().startsWith('data:') ? r.continue() : r.abort()));
    await context.addInitScript(({ key, value }) => {
      if (!sessionStorage.getItem('probe-seeded')) { localStorage.setItem(key, JSON.stringify(value)); sessionStorage.setItem('probe-seeded', '1'); }
    }, { key: fixture.key, value: fixture.value });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e).slice(0, 120)));
    await page.goto(base + '/soccer-career', { waitUntil: 'networkidle' });
    const consent = page.getByRole('button', { name: 'Essential only', exact: true });
    if (await consent.count()) await consent.first().click().catch(() => {});
    const opener = page.locator('[data-squad-tile]');
    const squad = page.locator('[data-squad-sheet] [role="dialog"]');
    let line = `${label} ${width}x${height} ${route}: `;
    try {
      await opener.waitFor({ timeout: 20000 });
      await opener.scrollIntoViewIfNeeded();
      const state = () => page.evaluate(() => ({ y: Math.round(scrollY), page: document.documentElement.scrollHeight, tileTop: Math.round(document.querySelector('[data-squad-tile]')?.getBoundingClientRect().top ?? -1), view: innerHeight }));
      const before = await state();
      await opener.click();
      await squad.waitFor({ timeout: 15000 });
      const back = squad.getByRole('button', { name: '← Back', exact: true });
      if (await squad.locator('[data-squad-screen="help"]').count()) await back.click();
      if (route === 'eleven') {
        const eleven = squad.getByRole('button', { name: 'Starting 11', exact: true });
        if (await eleven.count()) { await eleven.click(); await back.click(); } else line += '(no Starting 11 button on this build) ';
      }
      await squad.getByRole('button', { name: '← Back to your career', exact: true }).click();
      await squad.waitFor({ state: 'hidden', timeout: 15000 });
      await page.waitForTimeout(700);
      const after = await state();
      const focus = await page.evaluate(() => document.activeElement?.hasAttribute('data-squad-tile') === true);
      if (after.y !== before.y) moved += 1;
      line += `page at ${before.y} before, ${after.y} after (${after.y === before.y ? 'held' : 'MOVED ' + (after.y - before.y)}); tile top ${before.tileTop} then ${after.tileTop}; page height ${before.page} then ${after.page}; view ${before.view}; focus back on the tile ${focus}; page errors ${errors.length}`;
    } catch (err) { line += `STOPPED: ${String(err).split(String.fromCharCode(10))[0].slice(0, 160)}`; moved += 100; }
    console.log(line);
    await context.close();
  }
}
await browser.close();
console.log(`squadBackProbe ${label}: ${moved === 0 ? 'the page held at every width' : moved >= 100 ? 'a journey stopped' : `the page MOVED in ${moved} journey(s)`}`);
process.exit(moved === 0 ? 0 : 1);
