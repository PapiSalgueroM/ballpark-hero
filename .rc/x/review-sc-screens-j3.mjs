// Journey 3: the chance wheel (a choice with odds, a reload mid wheel, reduced motion, Escape, the appeal card behind it)
// and the Starting 11 of the Squad sheet (real names, invented names, roles).
const W = '[data-career-chance-wheel]';

async function wheelBox(T) {
  return T.page.evaluate(() => {
    const d = document.querySelector('[data-career-chance-wheel]');
    if (!d) return null;
    const disk = d.querySelector('[data-wheel-disk]'), scroller = disk?.closest('.overflow-y-auto'), result = d.querySelector('[data-wheel-result]');
    const r = x => { const q = x.getBoundingClientRect(); return { top: Math.round(q.top), bottom: Math.round(q.bottom), h: Math.round(q.height), w: Math.round(q.width) }; };
    const s = getComputedStyle(disk);
    return { dialog: r(d), vh: innerHeight, disk: r(disk), scroller: scroller ? { ...r(scroller), client: scroller.clientHeight, scroll: scroller.scrollHeight, at: Math.round(scroller.scrollTop) } : null, result: { ...r(result), text: result.textContent }, transform: disk.style.transform, transition: s.transitionDuration + ' ' + s.transitionProperty, background: disk.style.background.slice(0, 90), buttons: [...d.querySelectorAll('button')].map(b => b.textContent), title: d.querySelector('h2')?.textContent, text: d.innerText.slice(0, 600) };
  });
}
function wheelProblems(T, box, label) {
  if (!box) { T.problem(label + ': no wheel', ''); return; }
  if (box.scroller && box.scroller.scroll > box.scroller.client + 1) T.problem(label + ': the wheel dialog scrolls inside', { scroller: box.scroller, disk: box.disk, result: box.result });
  if (box.scroller && (box.disk.bottom > box.scroller.bottom + 1 || box.disk.top < box.scroller.top - 1)) T.problem(label + ': the disk is partly out of view', { disk: box.disk, scroller: box.scroller });
  if (box.scroller && box.result.bottom > box.scroller.bottom + 1) T.problem(label + ': the result line is out of view without scrolling', { result: box.result, scroller: box.scroller });
}

export default async function run({ visit, audit, NEW, OLD, WIDTHS, notes }) {
  const ev = notes.event;
  for (const width of WIDTHS) {
    for (const reduced of [false, true]) {
      await visit(reduced ? 'wheel-reduced' : 'wheel', width, NEW.event, { reduced }, async T => {
        const { page } = T;
        const choice = page.getByRole('button', { name: new RegExp(ev.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first();
        await choice.waitFor({ timeout: 15000 });
        await choice.scrollIntoViewIfNeeded(); await T.settle(250);
        await T.shot('event-card');
        const cardText = await page.evaluate(label => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent || '').includes(label)); return b ? b.innerText.slice(0, 200) : null; }, ev.label);
        T.fact('the choice as the card words it', cardText);
        const before = await T.where();
        await choice.click();
        await page.locator(W).waitFor({ timeout: 5000 });
        await T.settle(450);
        const opened = await T.where();
        const s1 = await T.saved(), receipt = s1.chanceWheel, raw1 = await T.raw();
        T.fact('receipt', receipt);
        T.fact('open: page', { before: before.y, after: opened.y, locked: opened.locked });
        if (opened.y !== before.y) T.problem('wheel open: the page moved', { before: before.y, after: opened.y });
        const box = await wheelBox(T);
        T.fact('wheel boxes', box);
        wheelProblems(T, box, 'wheel open');
        await T.shot('wheel-open');
        await audit(T, W, 'wheel');
        if (!reduced) {
          await page.reload({ waitUntil: 'networkidle' });
          const up = await page.locator(W).waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
          if (!up) { T.problem('reload mid wheel: the wheel did not come back', (await T.saved()).chanceWheel); return; }
          await T.settle(400);
          if ((await T.raw()) !== raw1) T.problem('reload mid wheel: the save changed', 'bytes differ');
          T.fact('after reload mid wheel', (await wheelBox(T)).result.text);
          await T.shot('wheel-after-reload');
        }
        const expected = receipt.result ? receipt.hit : receipt.miss;
        const t0 = Date.now();
        await page.locator('[data-wheel-spin]').click();
        await T.settle(reduced ? 60 : 700);
        const mid = await wheelBox(T);
        await T.shot(reduced ? 'wheel-spun-reduced' : 'wheel-spinning');
        if (reduced && mid.result.text !== expected) T.problem('reduced motion: the result is not shown at once', mid.result.text);
        if (reduced && !/^0s/.test(mid.transition)) T.problem('reduced motion: the disk still has a transition', mid.transition);
        if (!reduced && mid.result.text === expected) T.problem('the result shows before the wheel stops', { after: Date.now() - t0 });
        await page.waitForFunction(want => document.querySelector('[data-wheel-result]')?.textContent === want, expected, { timeout: 6000 });
        const done = await wheelBox(T);
        T.fact('spun', { ms: Date.now() - t0, transform: done.transform, text: done.result.text, buttons: done.buttons, transition: done.transition });
        wheelProblems(T, done, 'wheel result');
        await T.shot('wheel-result');
        if ((await T.raw()) !== raw1) T.problem('spinning changed the save', 'bytes differ');
        await page.locator('[data-wheel-continue]').click();
        await page.locator(W).waitFor({ state: 'hidden' }); await T.settle(400);
        const closed = await T.where();
        T.fact('Continue: page and focus', closed);
        if (closed.y !== before.y || closed.locked) T.problem('wheel Continue: page not put back', { before, closed });
        await T.shot('after-wheel');
        await page.reload({ waitUntil: 'networkidle' }); await T.settle(500);
        if (await page.locator(W).count()) T.problem('an answered wheel came back after a reload', (await T.saved()).chanceWheel);
      });
    }
    await visit('wheel-escape', width, NEW.event, {}, async T => {
      const { page } = T;
      const choice = page.getByRole('button', { name: new RegExp(ev.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first();
      await choice.waitFor({ timeout: 15000 }); await choice.scrollIntoViewIfNeeded(); await choice.click();
      await page.locator(W).waitFor({ timeout: 5000 }); await T.settle(300);
      const receipt = (await T.saved()).chanceWheel;
      await page.keyboard.press('Escape');
      await page.locator(W).waitFor({ state: 'hidden' }); await T.settle(400);
      const s = await T.saved();
      const expected = receipt.result ? receipt.hit : receipt.miss;
      const onPage = await page.evaluate(want => document.body.innerText.includes(want), expected);
      T.fact('Escape before the reveal', { seen: s.chanceWheel?.seen, expected, wheelWordsOnPage: onPage, lastEvents: (s.events || []).slice(-2), phase: s.phase });
      await T.shot('after-escape');
    });
    await visit('wheel-appeal', width, NEW.appeal, {}, async T => {
      const { page } = T;
      await page.locator(W).waitFor({ timeout: 8000 }); await T.settle(500);
      const s = await T.saved();
      T.fact('appeal save', { wheel: s.chanceWheel, pendingAppealResult: s.pendingAppealResult });
      const behind = await page.evaluate(() => { const h = [...document.querySelectorAll('h3')].find(x => /APPEAL (SUCCESSFUL|REJECTED)/.test(x.textContent || '')); if (!h) return null; const r = h.getBoundingClientRect(); const o = document.querySelector('[data-radix-dialog-overlay], .fixed.inset-0'); return { text: h.textContent, top: Math.round(r.top), bottom: Math.round(r.bottom), overlay: o ? getComputedStyle(o).backgroundColor : null }; });
      T.fact('the appeal card behind the wheel', behind);
      await T.shot('wheel-over-appeal');
      await page.locator('[data-wheel-skip]').click(); await T.settle(200);
      await T.shot('wheel-over-appeal-result');
      await page.locator('[data-wheel-continue]').click(); await page.locator(W).waitFor({ state: 'hidden' }); await T.settle(300);
      await T.shot('appeal-card');
    });
    await visit('wheel-hub', width, NEW.unseenHub, {}, async T => {
      const { page } = T;
      await page.locator(W).waitFor({ timeout: 8000 }); await T.settle(500);
      T.fact('unseen receipt on a pre season save', (await T.saved()).chanceWheel);
      await T.shot('wheel-on-load');
      wheelProblems(T, await wheelBox(T), 'wheel on load');
    });
    for (const [name, save] of [['squad-real', NEW.real], ['squad-roles', NEW.roles], ['squad-invented', NEW.plan], ['squad-old', OLD.real]]) {
      await visit(name, width, save, {}, async T => {
        const { page } = T;
        const tile = page.locator('[data-squad-tile]');
        await tile.waitFor({ timeout: 15000 }); await tile.scrollIntoViewIfNeeded(); await T.settle(300);
        const before = await T.where();
        await T.shot('squad-tile');
        await tile.click();
        const sheet = page.locator('[data-squad-sheet] [role="dialog"]');
        await sheet.waitFor(); await T.settle(500);
        const screen = () => page.evaluate(() => { const d = document.querySelector('[data-squad-sheet] [role="dialog"]'); const s = d?.querySelector('[data-squad-screen]'); const sc = [...(d?.querySelectorAll('*') ?? [])].find(e => /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1); const r = d?.getBoundingClientRect(); return { screen: s?.getAttribute('data-squad-screen'), dialog: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) } : null, vh: innerHeight, scrolls: sc ? { client: sc.clientHeight, scroll: sc.scrollHeight } : null, pageY: Math.round(scrollY) }; });
        const first = await screen();
        T.fact('sheet first screen', first);
        await T.shot('squad-first');
        if (first.screen === 'help') { if (first.scrolls) T.problem('squad help scrolls', first.scrolls); await audit(T, '[data-squad-sheet] [role="dialog"]', 'squad help'); await sheet.getByRole('button', { name: '← Back', exact: true }).click(); await T.settle(250); await T.shot('squad-home'); }
        await sheet.getByRole('button', { name: 'Starting 11', exact: true }).click(); await T.settle(700);
        const xi = await page.evaluate(() => ({ heading: document.querySelector('[data-squad-xi-heading]')?.textContent, scope: document.querySelector('[data-squad-xi-scope]')?.textContent, source: document.querySelector('[data-squad-source]')?.getAttribute('data-squad-source'), cells: [...document.querySelectorAll('[data-squad-xi] [data-squad-man]')].map(c => { const r = c.getBoundingClientRect(), n = c.querySelector('[data-squad-cell-name]'); return { name: n?.textContent ?? ('ROLE ' + (c.querySelector('[data-squad-role-cell]')?.textContent ?? '')), pos: c.querySelector('[data-squad-cell-position]')?.textContent, ovr: c.querySelector('[data-squad-cell-rating]')?.textContent, src: c.getAttribute('data-squad-cell-source'), w: Math.round(r.width), h: Math.round(r.height), nameLines: n ? Math.round(n.getBoundingClientRect().height / parseFloat(getComputedStyle(n).lineHeight)) : 0, cut: n ? n.scrollWidth > n.clientWidth + 1 : false }; }) }));
        T.fact('starting eleven', xi);
        if (xi.cells.length !== 11) T.problem('starting eleven: not eleven cells', xi.cells.length);
        const tall = xi.cells.filter(c => c.nameLines >= 4 || c.cut);
        if (tall.length) T.problem('starting eleven: a name takes four lines or more, or is cut', tall);
        const at = await screen();
        T.fact('eleven screen', at);
        if (at.scrolls) T.problem('starting eleven scrolls inside the sheet', at.scrolls);
        await T.shot('squad-eleven');
        await audit(T, '[data-squad-sheet] [role="dialog"]', 'starting eleven');
        await sheet.getByRole('button', { name: '← Back', exact: true }).click(); await T.settle(250);
        const bench = sheet.locator('[data-squad-open="bench"]');
        if (await bench.count()) { await bench.click(); await T.settle(400); await T.shot('squad-bench'); await audit(T, '[data-squad-sheet] [role="dialog"]', 'bench'); await sheet.getByRole('button', { name: '← Back', exact: true }).click(); await T.settle(250); }
        await sheet.getByRole('button', { name: '← Back to your career', exact: true }).click();
        await sheet.waitFor({ state: 'hidden' }); await T.settle(500);
        const after = await T.where();
        T.fact('squad Back: page and focus', { before, after });
        if (after.y !== before.y) T.problem('squad Back: the page moved', { before: before.y, after: after.y });
        if (after.active !== 'squad-tile') T.problem('squad Back: focus did not return to the tile', after.active);
      });
    }
  }
}
