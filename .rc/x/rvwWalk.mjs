// Reviewer's browser walk (never committed). BASE is the served build, RC_OUT takes the screenshots.
// Every request that is not the local server is cut (supabase.co among them).
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const SHOTS = process.env.RC_OUT || '.';
const origin = new URL(BASE).origin;
const SAVE = fs.existsSync('/tmp/rvw-base-save-LV.json') ? fs.readFileSync('/tmp/rvw-base-save-LV.json', 'utf8') : null;
let failures = 0;
const say = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) failures += 1; };
const note = what => console.log(`      ${what}`);
const browser = await chromium.launch();

const readRows = page => page.evaluate(() => Array.from(document.querySelectorAll('[data-roster-group-open] [data-roster-row]')).map(row => {
  const b = row.querySelector('b');
  const number = Number(Array.from(b?.childNodes ?? []).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim());
  const r = row.getBoundingClientRect();
  return { name: (row.querySelector('span.font-bold')?.textContent ?? '').trim(), number, mark: !!b?.querySelector('sup[data-rating-partial]'), text: (row.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 90), right: Math.round(r.right), clipped: row.scrollWidth > row.clientWidth + 1 };
}));
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  for (const motion of ['no-preference', 'reduce']) {
    const tag = `${viewport.width}-${motion === 'reduce' ? 'rm' : 'motion'}`;
    console.log(`\n##### ${viewport.width} by ${viewport.height}, reduced motion ${motion === 'reduce' ? 'ON' : 'off'}`);
    const ctx = await browser.newContext({ viewport, reducedMotion: motion });
    const page = await ctx.newPage();
    const errors = [], consoleErrors = [], away = new Set();
    page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) consoleErrors.push(m.text().slice(0, 200)); });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === origin || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
      away.add(url.host); return route.abort();
    });
    const settle = async () => {
      await page.waitForTimeout(900);
      const consent = page.locator('button:has-text("Essential only")');
      if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
    };
    const shot = async name => { await page.screenshot({ path: path.join(SHOTS, `${name}-${tag}.png`) }); };
    const full = motion === 'no-preference';

    /* ---- A. a fresh franchise ---- */
    try {
      await page.goto(`${BASE}/front-office`, { waitUntil: 'domcontentloaded' });
      await settle();
      if (full) await shot('fo-landing');
      await page.locator('.grid button').filter({ hasText: 'Las Vegas Raiders' }).first().click();
      const tile = page.locator('button:has(div.uppercase)').filter({ hasText: /roster/i }).first();
      await tile.waitFor({ state: 'visible', timeout: 30000 });
      if (full) await shot('fo-hub');
      await tile.click();
      await page.locator('[data-roster-group="RB"]').waitFor({ state: 'visible', timeout: 10000 });
      if (full) await shot('fo-groups');
      for (const g of ['QB', 'RB', 'WR', 'TE']) {
        await page.locator(`[data-roster-group="${g}"]`).click();
        await page.locator(`[data-roster-group-open="${g}"]`).waitFor({ state: 'visible', timeout: 10000 });
        const rows = await readRows(page);
        note(`${g}: ${rows.map(r => `${r.name} ${r.number}${r.mark ? 'e' : ''}`).join(', ')}`);
        const sorted = rows.every((r, i) => i === 0 || rows[i - 1].number >= r.number);
        say(rows.length > 0 && rows.every(r => Number.isFinite(r.number) && r.number >= 40 && r.number <= 99), `${tag} fresh ${g}: every row prints a number (${rows.length} rows)`);
        note(`${g} rows in rating order: ${sorted}; rows past the right edge: ${rows.filter(r => r.right > viewport.width).length}; clipped rows: ${rows.filter(r => r.clipped).length}`);
        if (g === 'RB' || (full && g !== 'TE')) await shot(`fo-${g}`);
        if (g === 'RB') {
          const j = rows.find(r => r.name.startsWith('Ashton Jeanty')), h = rows.find(r => r.name.startsWith('Connor Heyward'));
          say(!!j && !!h && j.number > h.number && rows[0] === j, `${tag} fresh RB: Jeanty ${j?.number} leads, Heyward ${h?.number}${h?.mark ? 'e' : ''} under him (row ${rows.indexOf(h) + 1} of ${rows.length})`);
          const legend = await page.locator('[data-rating-legend]').first().textContent().catch(() => null);
          note(`legend: ${legend}`);
        }
        await page.locator('[data-roster-group-open] button').filter({ hasText: 'Groups' }).first().click();
        await page.locator('[data-roster-group="RB"]').waitFor({ state: 'visible', timeout: 10000 });
      }
      say((await overflow(page)) <= 2, `${tag} fresh franchise: no horizontal overflow`);
      const saved = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('front-office-save-v1') ?? 'null'); const j = s?.league?.teams?.LV?.players?.find(p => p.name === 'Ashton Jeanty'); return j ? { ovr: j.ovr, lineage: j.openingRatingEvidence } : null; });
      note(`a fresh save holds Jeanty as ${JSON.stringify(saved)}`);
      say(saved?.lineage?.modelVersion === 'nfl-v2.3-2026-10-08', `${tag} a franchise started today saves the new model version (${saved?.lineage?.modelVersion})`);
    } catch (e) { say(false, `${tag} fresh franchise walk broke: ${String(e.message).split('\n')[0].slice(0, 200)}`); await shot('fo-broke').catch(() => {}); }
    /* ---- B. a save the base wrote, opened in this build ---- */
    if (SAVE && full) {
      try {
        await page.evaluate(text => localStorage.setItem('front-office-save-v1', text), SAVE);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await settle();
        const tile = page.locator('button:has(div.uppercase)').filter({ hasText: /roster/i }).first();
        await tile.waitFor({ state: 'visible', timeout: 30000 });
        say((await page.locator('button:has-text("Delete unusable save")').count()) === 0, `${tag} old save: no unusable save notice`);
        await shot('fo-oldsave-hub');
        await tile.click();
        await page.locator('[data-roster-group="RB"]').click();
        await page.locator('[data-roster-group-open="RB"]').waitFor({ state: 'visible', timeout: 10000 });
        const rows = await readRows(page);
        const want = JSON.parse(SAVE).league.teams.LV.players.filter(p => p.pos === 'RB').map(p => `${p.name} ${p.ovr}`).sort().join(', ');
        const seen = rows.map(r => `${r.name} ${r.number}`).sort().join(', ');
        note(`old save RB shelf: ${rows.map(r => `${r.name} ${r.number}${r.mark ? 'e' : ''}`).join(', ')}`);
        say(seen === want, `${tag} old save: the running backs print the SAVED numbers (${want})`);
        await shot('fo-oldsave-RB');
        const after = await page.evaluate(() => localStorage.getItem('front-office-save-v1'));
        const j = JSON.parse(after).league.teams.LV.players.find(p => p.name === 'Ashton Jeanty'), j0 = JSON.parse(SAVE).league.teams.LV.players.find(p => p.name === 'Ashton Jeanty');
        say(j.ovr === j0.ovr && JSON.stringify(j.openingRatingEvidence) === JSON.stringify(j0.openingRatingEvidence), `${tag} old save: after opening it the stored Jeanty is still ${j0.ovr} with lineage ${JSON.stringify(j0.openingRatingEvidence)} (now ${j.ovr})`);
        await page.evaluate(() => localStorage.removeItem('front-office-save-v1'));
      } catch (e) { say(false, `${tag} old save walk broke: ${String(e.message).split('\n')[0].slice(0, 200)}`); await shot('fo-oldsave-broke').catch(() => {}); }
    } else if (full) note('old save part SKIPPED: /tmp/rvw-base-save-LV.json is not there');

    /* ---- C. the words ---- */
    if (full) {
      try {
        const how = page.locator('text=sixty carries').first();
        await page.goto(`${BASE}/front-office`, { waitUntil: 'domcontentloaded' }); await settle();
        say((await how.count()) > 0, `${tag}: the how to play line with the worked example is on /front-office`);
        if (await how.count()) { await how.scrollIntoViewIfNeeded(); await shot('fo-howto'); }
        const help = page.locator('button[aria-label*="how to play" i], button[aria-label*="help" i], button:has-text("How to play")');
        note(`help buttons found on /front-office: ${await help.count()}`);
        await page.goto(`${BASE}/whats-new`, { waitUntil: 'domcontentloaded' }); await settle();
        const entry = page.locator('li, article, div').filter({ hasText: /^NFL Front Office: / }).last();
        const first = await page.evaluate(() => { const el = Array.from(document.querySelectorAll('strong, b, h3, h4')).find(e => /NFL Front Office: (one|backs|ratings)/i.test(e.textContent ?? '')); return el ? (el.closest('li, article, div')?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 700) : null; });
        note(`what's new entry: ${first}`);
        say(!!first, `${tag}: the What's New entry is on the page`);
        await shot('whatsnew-top');
        say((await overflow(page)) <= 2, `${tag} whats-new: no horizontal overflow`);
        void entry;
      } catch (e) { say(false, `${tag} words walk broke: ${String(e.message).split('\n')[0].slice(0, 200)}`); }
    }

    /* ---- D. Gauntlet Draft: NFL, a whole run ---- */
    try {
      await page.goto(`${BASE}/nfl-gauntlet-draft`, { waitUntil: 'domcontentloaded' }); await settle();
      if (full) await shot('gauntlet-setup');
      const setup = await page.locator('p', { hasText: 'knockout rounds' }).first().textContent().catch(() => null);
      note(`setup copy: ${setup}`);
      await page.locator('button').filter({ hasText: 'Unlimited' }).first().click();
      const tiers = {};
      for (let pick = 1; pick <= 7; pick += 1) {
        await page.locator('p', { hasText: `Pick ${pick} of 7` }).first().waitFor({ state: 'visible', timeout: 10000 });
        const dealt = await page.evaluate(() => Array.from(document.querySelectorAll('div.grid > button')).map(b => ({ spans: Array.from(b.querySelectorAll(':scope > span')).map(s => (s.textContent ?? '').trim()), cls: b.className, w: Math.round(b.getBoundingClientRect().width), clipped: Array.from(b.querySelectorAll(':scope > span')).some(s => s.scrollWidth > s.clientWidth + 1) })).filter(c => c.spans.length === 4));
        note(`pick ${pick}: ${dealt.map(c => `${c.spans[0]} ${c.spans[1]} ${c.spans[2]} [${c.spans[3]}]`).join(' | ')}`);
        for (const c of dealt) { const band = (c.cls.match(/border-(gold|primary|correct|border|amber|yellow|slate|zinc)[^ ]*/) ?? ['other'])[0]; tiers[band] = (tiers[band] ?? 0) + 1; }
        if (pick === 1) await shot('gauntlet-deal');
        await page.locator('div.grid > button').filter({ hasText: dealt[0].spans[2] }).first().click();
      }
      note(`card classes over 35 cards: ${JSON.stringify(tiers)}`);
      await page.waitForTimeout(motion === 'reduce' ? 2500 : 2500);
      if (full) await shot('gauntlet-running');
      await page.locator('text=rounds survived').first().waitFor({ state: 'visible', timeout: 20000 });
      const result = await page.evaluate(() => (document.querySelector('main')?.textContent ?? '').replace(/\s+/g, ' ').match(/(Champions!|Out at)[^.]*?rounds survived with a \d+ rated offense/)?.[0] ?? null);
      note(`result: ${result}`);
      const lines = await page.evaluate(() => Array.from(document.querySelectorAll('main p')).map(p => (p.textContent ?? '').trim()).filter(t => /they rate|\d+ - \d+|v [A-Z]/.test(t)).slice(0, 12));
      note(`match lines: ${lines.join(' || ')}`);
      await shot('gauntlet-result');
      say((await overflow(page)) <= 2, `${tag} gauntlet: no horizontal overflow`);
    } catch (e) { say(false, `${tag} gauntlet walk broke: ${String(e.message).split('\n')[0].slice(0, 200)}`); await shot('gauntlet-broke').catch(() => {}); }
    say(errors.length === 0, `${tag}: no uncaught page error (${errors.slice(0, 2).join(' | ') || 'none'})`);
    note(`console errors: ${consoleErrors.length}${consoleErrors.length ? ' ' + consoleErrors.slice(0, 3).join(' | ') : ''}; other hosts asked for and cut: ${[...away].sort().join(', ') || 'none'}`);
    await ctx.close();
  }
}
await browser.close();
console.log(failures ? `rvwWalk: ${failures} FAILURE(S)` : 'rvwWalk: nothing failed');
process.exit(failures ? 1 : 0);
