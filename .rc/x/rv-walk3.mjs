/* Reviewer's walk of Round 1112, parts cards, tile and pages (never committed). */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { open, playButton, sideways, saveOf, running, cutOff, overflowing, toHub, inject, close, say, note, shot, elShot, report, SAVES, PART, OUT, BASE } from './rv-walk.mjs';

const want = p => PART === 'all' || PART === p;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---- cards: the All-Star card in each reading, engine made saves, and the old coin card from a save of main. */
if (want('cards')) {
  const plan = [
    [390, 844, true, ['k306_mine', 'k306_both']], [1280, 900, false, ['k306_mine', 'k306_both']],
    [390, 844, false, ['k306_his', 'old306']], [1280, 900, true, ['k306_his', 'old306']],
  ];
  for (const [wd, ht, reduced, kinds] of plan) {
    const w = await open(wd, ht, reduced); const { page } = w;
    for (const k of kinds) {
      const sv = SAVES[k]; const what = `card ${k}, ${w.label}`;
      console.log(what);
      if (!sv) { say(false, `${what}: no such save was made`); continue; }
      say(await inject(page, sv.c), `${what}: wrote the engine made save`);
      const has = await page.locator('[data-rivalry-event]').count();
      say(has === 1, `${what}: the board opens on the pending rivalry card`);
      if (!has) { await shot(page, `card-${k}-${w.tag}-MISSING`); continue; }
      const text = (await page.locator('[data-rivalry-event]').innerText()).replace(/\s+/g, ' ').trim();
      say(text.includes(sv.card.description) && text.includes(sv.card.consequence) && text.includes(sv.card.title), `${what}: the card prints the engine's title, words and consequence ("${text.slice(0, 200)}")`);
      const cut = await cutOff(page, '[data-rivalry-event]'); const out = await overflowing(page, '[data-rivalry-event]');
      say(cut.length === 0 && out.length === 0, `${what}: nothing on the card is cut off or pokes out (${[...cut, ...out].join(' | ') || 'clean'})`);
      say((await sideways(page)) <= 1, `${what}: the card does not scroll sideways (${await sideways(page)} px over)`);
      await page.waitForTimeout(700);
      const anim = await running(page);
      if (reduced) say(anim.length === 0, `${what}: nothing is still animating under reduced motion (${anim.map(a => `${a.name} ${a.ms}ms x${a.iter}`).join('; ') || 'none'})`);
      else note(`${what}: animations running with motion on: ${anim.map(a => `${a.name} ${a.ms}ms x${a.iter}`).join('; ') || 'none'}`);
      await elShot(page, '[data-rivalry-event]', `card-${k}-${w.tag}-card`); await shot(page, `card-${k}-${w.tag}-view`);
      const before = (await saveOf(page)).c;
      const b = page.locator('[data-rivalry-event] button:not([disabled])'); await b.nth((await b.count()) - 1).click(); await page.waitForTimeout(700);
      const after = (await saveOf(page)).c;
      const dm = after.morale - before.morale; const df = after.fanbase - before.fanbase;
      const wantM = k === 'k306_mine' ? 5 : k === 'k306_his' ? -5 : 0; const wantF = k === 'k306_both' ? 3 : 0;
      await toHub(page, what);
      const body = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
      const told = k === 'k306_mine' ? /You made the All-Star roster and .+ did not/ : k === 'k306_his' ? /made the All-Star roster and you did not/ : k === 'k306_both' ? /both made the All-Star roster/ : /All-Star Ballot Squeeze/;
      report.cards.push({ kind: k, ctx: w.tag, text, dm, df, morale: [before.morale, after.morale], fanbase: [before.fanbase, after.fanbase], pendingAfter: after.pendingRivalryEvent ?? null, feedTold: told.test(body), lastId: after.lastRivalryEventId });
      if (k === 'old306') {
        note(`${what}: the old coin card said "${sv.card.description}" [${sv.card.consequence}] and Continue moved morale ${dm}, fanbase ${df}; the feed ${told.test(body) ? 'shows only its title' : 'shows nothing of it'}`);
        say(after.pendingRivalryEvent == null, `${what}: the old card is cleared and the save plays on`);
      } else {
        say(dm === clamp(before.morale + wantM, 0, 100) - before.morale && df === clamp(before.fanbase + wantF, 0, 100) - before.fanbase, `${what}: Continue moved exactly what the card promised (morale ${before.morale} to ${after.morale}, fanbase ${before.fanbase} to ${after.fanbase}; promised "${sv.card.consequence}")`);
        note(`${what}: back on the hub the feed ${told.test(body) ? 'says' : 'does NOT show'} what happened`);
      }
      await shot(page, `card-${k}-${w.tag}-after`);
    }
    await close(w, `cards, ${w.label}`);
  }
}

/* ---- tile: the Trophy Case tile over a case of lesser awards only, and over a star's full case. */
if (want('tile')) {
  for (const [wd, ht, reduced] of [[390, 844, true], [1280, 900, false]]) {
    const w = await open(wd, ht, reduced); const { page } = w;
    for (const k of ['lesserOnly', 'star']) {
      const sv = SAVES[k]; const what = `tile ${k}, ${w.label}`;
      console.log(what);
      if (!sv) { say(false, `${what}: no such save was made`); continue; }
      await inject(page, sv.c);
      await toHub(page, what);
      const tile = page.locator('button:has(div.uppercase)').filter({ hasText: /Trophy Case/i }).first();
      if (!(await tile.count())) { say(false, `${what}: no Trophy Case tile on the hub`); await shot(page, `tile-${k}-${w.tag}-MISSING`); continue; }
      const text = (await tile.innerText()).replace(/\s+/g, ' ').trim();
      const total = sv.c.rings + sv.honours.reduce((n, h) => n + h.n, 0);
      say(!/Empty/.test(text) && text.includes(`${total} honour`), `${what}: the tile counts ${total} (rings ${sv.c.rings}, ${sv.honours.map(h => `${h.n} ${h.label}`).join(', ')}) and reads "${text}"`);
      const cuts = await tile.evaluate(root => [...root.querySelectorAll('*')].filter(el => el.children.length === 0 && (el.textContent ?? '').trim() && el.scrollWidth > el.clientWidth + 1).map(el => `${el.textContent.trim()} (${el.scrollWidth}>${el.clientWidth})`));
      say(cuts.length === 0, `${what}: no line of the tile is cut off (${cuts.join(' | ') || 'clean'})`);
      await shot(page, `tile-${k}-${w.tag}-hub`);
      await tile.scrollIntoViewIfNeeded(); await tile.screenshot({ path: path.join(OUT, `tile-${k}-${w.tag}-tile.png`) }).catch(() => {});
      await tile.click(); await page.waitForTimeout(700);
      const caseText = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
      const m = /(\d+) individual honours? across (\d+) seasons?/.exec(caseText);
      report.tile.push({ kind: k, ctx: w.tag, tile: text, total, caseLine: m ? m[0] : null, awards: sv.awards });
      note(`${what}: the case behind it says "${m ? m[0] : 'no honours line found'}"; the tile said "${text}"`);
      await shot(page, `tile-${k}-${w.tag}-case`);
      say((await sideways(page)) <= 1, `${what}: the case does not scroll sideways (${await sideways(page)} px over)`);
      const hub = page.locator('button', { hasText: /^\s*Hub\s*$/ }); if (await hub.count()) { await hub.first().click(); await page.waitForTimeout(400); }
    }
    await close(w, `tile, ${w.label}`);
  }
}

/* ---- pages: What's New and the game's own "?" say what the round did. */
if (want('pages')) {
  for (const [wd, ht, reduced] of [[390, 844, false], [1280, 900, true]]) {
    const w = await open(wd, ht, reduced, false); const { page } = w; const what = `pages, ${w.label}`;
    console.log(what);
    await page.goto(`${BASE}/whats-new`, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
    const body = await page.locator('main').innerText();
    const para = body.split('\n').filter(l => /rival/i.test(l) && /NBA|All-Star|head to head/i.test(l));
    say(para.length > 0, `${what}: What's New has an entry that tells of the rival (${para.length} lines; the first: "${(para[0] ?? '').slice(0, 300)}")`);
    report.pages.push({ ctx: w.tag, whatsNew: para.slice(0, 3) });
    say(!para.some(l => /[–—]/.test(l)), `${what}: no em or en dash in those lines`);
    const el = page.locator('main *', { hasText: /rival/i }).filter({ hasText: /All-Star/ }).last();
    if (await el.count()) await el.scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, `pages-${w.tag}-whatsnew`);
    say((await sideways(page)) <= 1, `${what}: What's New does not scroll sideways (${await sideways(page)} px over)`);
    await page.goto(`${BASE}/nba-my-career`, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
    const help = page.locator('button[aria-label="How to play"]').first();
    if (await help.count()) {
      await help.click(); await page.waitForTimeout(700);
      const text = await page.locator('body').innerText();
      const lines = text.split('\n').filter(l => /rival/i.test(l));
      note(`${what}: the "?" lines that name the rival: ${lines.map(l => `"${l.trim().slice(0, 220)}"`).join(' / ') || 'none'}`);
      report.pages.push({ ctx: w.tag, help: lines.slice(0, 6) });
      await shot(page, `pages-${w.tag}-help`);
    } else note(`${what}: no "How to play" button on the create screen`);
    const guide = (await page.locator('body').innerText()).split('\n').filter(l => /same scale/i.test(l));
    note(`${what}: the page's guide lines with "same scale": ${guide.map(l => `"${l.trim().slice(0, 240)}"`).join(' / ') || 'none on this screen'}`);
    await close(w, what);
  }
}
writeFileSync(path.join(OUT, 'rv-walk-rest.json'), JSON.stringify({ cards: report.cards, tile: report.tile, pages: report.pages, fails: report.fails }, null, 1));
