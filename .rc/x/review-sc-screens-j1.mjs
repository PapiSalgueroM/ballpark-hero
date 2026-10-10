// Journey 1: the hub and "Your next season" (the ten plans), on the plan save, the keeper, the edited save and a settled one.
const D = '[data-soccer-programme]';
const TILES = ['tactics', 'position', 'set_pieces', 'promise', 'negotiation', 'bonuses', 'adaptation', 'fitness', 'captain', 'loan'];

async function bodyBox(T) {
  return T.page.evaluate(() => {
    const b = document.querySelector('[data-programme-body]'), d = document.querySelector('[data-soccer-programme]');
    if (!b || !d) return null;
    const start = document.querySelector('[data-programme-start]');
    const br = b.getBoundingClientRect(), dr = d.getBoundingClientRect(), sr = start?.getBoundingClientRect();
    return { mode: d.getAttribute('data-programme-mode'), dialog: { top: Math.round(dr.top), bottom: Math.round(dr.bottom), h: Math.round(dr.height) }, body: { top: Math.round(br.top), bottom: Math.round(br.bottom), client: b.clientHeight, scroll: b.scrollHeight, at: Math.round(b.scrollTop) }, start: sr ? { top: Math.round(sr.top), bottom: Math.round(sr.bottom), below: Math.round(sr.bottom - br.bottom) } : null, title: d.querySelector('h2')?.textContent };
  });
}

export default async function run({ visit, audit, NEW, OLD, WIDTHS }) {
  for (const width of WIDTHS) {
    await visit('plans', width, NEW.plan, {}, async T => {
      const { page } = T;
      await T.shot('hub-top');
      await T.shot('hub-full', true);
      const hub = await page.evaluate(() => {
        const open = document.querySelector('[data-soccer-programme-open]'), r = open?.getBoundingClientRect();
        const bar = [...document.querySelectorAll('button')].find(b => /^Next Season/.test((b.textContent || '').trim()));
        const br = bar?.getBoundingClientRect();
        return { page: document.documentElement.scrollHeight, vh: innerHeight, open: r ? { top: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width) } : null, next: br ? { top: Math.round(br.top), bottom: Math.round(br.bottom) } : null, wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
      });
      T.fact('hub', hub);
      if (!hub.open) throw new Error('no Your next season button on the hub');
      if (hub.wide) T.problem('hub: sideways overflow', hub);
      await audit(T, 'main, #root', 'hub');
      const open = page.locator('[data-soccer-programme-open]');
      await open.scrollIntoViewIfNeeded();
      await T.settle();
      const before = await T.where();
      const rawBefore = await T.raw();
      await T.shot('hub-at-button');
      await open.click();
      await page.locator(D).waitFor();
      await T.settle(500);
      const opened = await T.where();
      T.fact('open: page before and after', { before: before.y, after: opened.y, locked: opened.locked, overflow: opened.overflow });
      if (opened.y !== before.y) T.problem('open: the page moved', { before: before.y, after: opened.y });
      const help = await bodyBox(T);
      T.fact('help: boxes', help);
      if (help.start && help.start.below > 0) T.problem('help: See my plans is below the fold of the dialog', help);
      await T.shot('help');
      await audit(T, D, 'help');
      if ((await T.raw()) !== rawBefore) T.problem('help: opening changed the save', 'bytes differ');
      // the ? does nothing in the first help; scroll to the start button the way a thumb would
      await page.locator('[data-programme-start]').scrollIntoViewIfNeeded();
      await T.shot('help-bottom');
      await page.locator('[data-programme-start]').click();
      await T.settle();
      const list = await bodyBox(T);
      T.fact('list: boxes', list);
      const tiles = await page.locator('[data-programme-tile]').evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { id: e.getAttribute('data-programme-tile'), w: Math.round(r.width), h: Math.round(r.height) }; }));
      T.fact('list: tiles', tiles);
      if (tiles.length !== 10) T.problem('list: not ten tiles', tiles.length);
      await T.shot('list');
      await audit(T, D, 'list');
      await page.locator('[data-programme-body]').evaluate(b => { b.scrollTop = b.scrollHeight; });
      await T.settle(150);
      await T.shot('list-bottom');
      for (const id of TILES) {
        const tile = page.locator(`[data-programme-tile="${id}"]`);
        await tile.scrollIntoViewIfNeeded();
        const listAt = await page.locator('[data-programme-body]').evaluate(b => Math.round(b.scrollTop));
        await tile.click();
        await page.locator(`[data-programme-detail="${id}"]`).waitFor();
        await T.settle(150);
        const detail = await bodyBox(T);
        const info = await page.evaluate(() => ({ context: document.querySelector('[data-programme-context]')?.textContent, current: document.querySelector('[data-programme-current]')?.textContent, options: [...document.querySelectorAll('[data-programme-option]')].map(o => ({ id: o.getAttribute('data-programme-option'), reason: o.querySelector('[data-programme-disabled-reason]')?.textContent ?? null, button: o.querySelector('button')?.textContent, disabled: o.querySelector('button')?.disabled })), focus: document.activeElement?.tagName + ':' + (document.activeElement?.textContent || '').slice(0, 30) }));
        T.fact(`detail ${id}`, { scroll: detail.body, ...info });
        await T.shot(`detail-${id}`);
        await audit(T, D, `detail ${id}`);
        if (detail.body.scroll > detail.body.client + 1) { await page.locator('[data-programme-body]').evaluate(b => { b.scrollTop = b.scrollHeight; }); await T.settle(120); await T.shot(`detail-${id}-bottom`); }
        const pick = { tactics: 'finisher', promise: 'starter', bonuses: 'appearances', set_pieces: 'penalties' }[id];
        if (pick) {
          const choice = page.locator(`[data-programme-choice="${pick}"]`);
          await choice.scrollIntoViewIfNeeded();
          const old = await T.raw();
          await choice.click();
          await T.settle(250);
          const now = await T.saved();
          if ((await T.raw()) === old) T.problem(`detail ${id}: choosing ${pick} saved nothing`, info.options);
          T.fact(`chose ${id}`, { plan: now.programme?.plan, button: await choice.textContent(), current: await page.locator('[data-programme-current]').textContent() });
          await page.locator('[data-programme-body]').evaluate(b => { b.scrollTop = 0; });
          await T.shot(`detail-${id}-chosen`);
        }
        if (id === 'promise') {
          // the ? from a detail goes to the rules and Back returns to the same detail
          await page.locator('[data-programme-help]').click(); await T.settle(150);
          const inHelp = await bodyBox(T);
          await T.shot('help-from-detail');
          await page.locator('[data-programme-back]').click(); await T.settle(150);
          const back = await bodyBox(T);
          T.fact('? from a detail and Back', { help: inHelp.mode, back: back.mode, title: back.title });
          if (back.mode !== 'detail') T.problem('? then Back did not return to the detail', back);
        }
        await page.locator('[data-programme-back]').click();
        await T.settle(150);
        const after = await page.evaluate(() => ({ at: Math.round(document.querySelector('[data-programme-body]').scrollTop), focus: document.activeElement?.getAttribute('data-programme-tile') }));
        if (after.focus !== id || Math.abs(after.at - listAt) > 2) T.problem(`Back from ${id}: list place or focus lost`, { listAt, ...after });
      }
      await page.locator('[data-programme-body]').evaluate(b => { b.scrollTop = 0; });
      await T.shot('list-with-choices');
      const chosen = await T.raw();
      await page.keyboard.press('Escape');
      await page.locator(D).waitFor({ state: 'hidden' });
      await T.settle(400);
      const closed = await T.where();
      T.fact('Escape: page and focus', closed);
      if (closed.y !== before.y || closed.active !== 'programme-open' || closed.locked) T.problem('Escape: page, focus or lock not put back', { before, closed });
      await page.reload({ waitUntil: 'networkidle' });
      if ((await T.raw()) !== chosen) T.problem('reload: the saved plan changed', 'bytes differ');
      await page.locator('[data-soccer-programme-open]').scrollIntoViewIfNeeded();
      await page.locator('[data-soccer-programme-open]').click();
      await page.locator(D).waitFor(); await T.settle(300);
      T.fact('reopen after reload: mode', (await bodyBox(T)).mode);
      await page.locator('[data-programme-start]').scrollIntoViewIfNeeded();
      await page.locator('[data-programme-start]').click(); await T.settle(150);
      await page.locator('[data-programme-tile="promise"]').click(); await T.settle(150);
      T.fact('after reload: promise detail', await page.locator('[data-programme-current]').textContent());
      await T.shot('after-reload-promise');
      // cancel a plan, then close with Close
      const cancel = page.locator('[data-programme-cancel]');
      if (await cancel.count()) { await cancel.scrollIntoViewIfNeeded(); await T.shot('promise-cancel-button'); await cancel.click(); await T.settle(200); T.fact('after Cancel plan', await page.locator('[data-programme-current]').textContent()); }
      else T.problem('promise: no Cancel plan button for a queued choice', '');
      const y0 = (await T.where()).y;
      await page.locator('[data-programme-close]').click();
      await page.locator(D).waitFor({ state: 'hidden' }); await T.settle(400);
      const closed2 = await T.where();
      if (closed2.y !== y0 || closed2.active !== 'programme-open') T.problem('Close: page or focus not put back', { y0, closed2 });
    });
  }
}
