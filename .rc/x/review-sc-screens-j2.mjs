// Journey 2: a settled promise, the keeper's and the edited save's plans, an old save, and the counteroffer in the transfer window.
const D = '[data-soccer-programme]';

async function openPlans(T) {
  const { page } = T;
  const open = page.locator('[data-soccer-programme-open]');
  await open.waitFor({ timeout: 15000 });
  await open.scrollIntoViewIfNeeded();
  await T.settle(200);
  const before = await T.where();
  await open.click();
  await page.locator(D).waitFor();
  await T.settle(400);
  const after = await T.where();
  if (after.y !== before.y) T.problem('open: the page moved', { before: before.y, after: after.y });
  await page.locator('[data-programme-start]').scrollIntoViewIfNeeded();
  await page.locator('[data-programme-start]').click();
  await T.settle(200);
  return before;
}
async function detail(T, id, audit, name = id) {
  const { page } = T;
  const tile = page.locator(`[data-programme-tile="${id}"]`);
  await tile.scrollIntoViewIfNeeded();
  await tile.click();
  await page.locator(`[data-programme-detail="${id}"]`).waitFor();
  await T.settle(200);
  const info = await page.evaluate(() => ({ context: document.querySelector('[data-programme-context]')?.textContent, current: document.querySelector('[data-programme-current]')?.textContent, options: [...document.querySelectorAll('[data-programme-option]')].map(o => ({ id: o.getAttribute('data-programme-option'), reason: o.querySelector('[data-programme-disabled-reason]')?.textContent ?? null, button: o.querySelector('button')?.textContent, disabled: o.querySelector('button')?.disabled })) }));
  T.fact(`detail ${name}`, info);
  await T.shot(`detail-${name}`);
  await audit(T, D, `detail ${name}`);
  return info;
}
const back = async T => { await T.page.locator('[data-programme-back]').click(); await T.settle(150); };

export default async function run({ visit, audit, NEW, OLD, WIDTHS, notes }) {
  for (const width of WIDTHS) {
    await visit('settled', width, NEW.settled, {}, async T => {
      const { page } = T;
      await T.shot('hub-top');
      if (width !== 1280) await T.shot('hub-full', true);
      await openPlans(T);
      await T.shot('list');
      for (const id of ['promise', 'bonuses', 'set_pieces', 'tactics']) { await detail(T, id, audit); await back(T); }
      T.fact('receipt on the save', (await T.saved()).seasons.slice(-1)[0].programme);
    });
    await visit('keeper', width, NEW.keeper, {}, async T => {
      await openPlans(T);
      for (const id of ['tactics', 'set_pieces', 'bonuses', 'position']) { await detail(T, id, audit); await back(T); }
    });
    await visit('edited', width, NEW.edited, {}, async T => {
      const { page } = T;
      await openPlans(T);
      for (const [id, pick] of [['captain', 'calm'], ['fitness', 'managed'], ['adaptation', null], ['loan', null], ['position', null]]) {
        const info = await detail(T, id, audit);
        if (pick) {
          const b = page.locator(`[data-programme-choice="${pick}"]`);
          if (await b.isDisabled()) T.problem(`${id}: ${pick} is not offered on a save that should qualify`, info.options);
          else { await b.scrollIntoViewIfNeeded(); await b.click(); await T.settle(200); T.fact(`chose ${id}`, await page.locator('[data-programme-current]').textContent()); await T.shot(`detail-${id}-chosen`); }
        }
        await back(T);
      }
    });
    await visit('oldplan', width, OLD.plan, {}, async T => {
      const { page } = T;
      const first = await T.saved();
      T.fact('old save fields', { programme: 'programme' in first, chanceWheel: 'chanceWheel' in first, seasons: first.seasons.length, club: first.currentClub, phase: first.phase });
      await T.shot('hub-top');
      if (width !== 1280) await T.shot('hub-full', true);
      await openPlans(T);
      await T.shot('list');
      for (const id of ['tactics', 'promise', 'negotiation']) { await detail(T, id, audit); await back(T); }
      await page.keyboard.press('Escape'); await page.locator(D).waitFor({ state: 'hidden' }); await T.settle(300);
      const after = await T.saved();
      T.fact('old save after only reading', { programme: 'programme' in after, chanceWheel: 'chanceWheel' in after, same: JSON.stringify(after.seasons) === JSON.stringify(first.seasons) });
    });
    for (const [name, save] of [['offerNo', NEW.offerNo], ['offerYes', NEW.offerYes], ['oldoffer', OLD.offerNo]]) {
      await visit(name, width, save, {}, async T => {
        const { page } = T;
        const s0 = await T.saved();
        const offer0 = s0.transferSituation.offer;
        T.fact('offer on the save', { club: offer0.club.name, wage: offer0.wage, years: offer0.contractYears, overall: s0.overall, lastRating: [...s0.seasons].reverse().find(r => r.type === 'playing')?.rating });
        const stay = page.getByRole('button', { name: /Reject & Stay/ });
        await stay.waitFor({ timeout: 15000 });
        await stay.scrollIntoViewIfNeeded();
        await T.settle(300);
        await T.shot('window-actions');
        const actions = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => /Reject & |Review contract|Accept/.test(b.textContent || '')).map(b => { const r = b.getBoundingClientRect(); return { text: b.textContent.trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right), lines: Math.round(r.height / parseFloat(getComputedStyle(b).lineHeight || '20')), cut: b.scrollWidth > b.clientWidth + 1 }; }));
        T.fact('window: action buttons', actions);
        for (const a of actions) if (a.h < 43.5 || a.cut || a.right > T.width + 1) T.problem('window: an action is small, cut or off screen', a);
        await T.shot('window-full', true);
        await openPlans(T);
        await T.shot('list-in-window');
        const info = await detail(T, 'negotiation', audit);
        const wage = page.locator('[data-programme-choice="wage"]');
        if (await wage.isDisabled()) { T.problem('negotiation: Ask for more pay is not offered', info.options); return; }
        await wage.scrollIntoViewIfNeeded(); await wage.click(); await T.settle(300);
        const s1 = await T.saved();
        const verdict = { outcome: await page.locator('[data-programme-outcome]').textContent(), current: await page.locator('[data-programme-current]').textContent(), negotiated: s1.programme?.negotiated, wageNow: s1.transferSituation.offer.wage, wageWas: offer0.wage, weeklyWage: s1.weeklyWage };
        T.fact('counteroffer verdict', verdict);
        await page.locator('[data-programme-body]').evaluate(b => { b.scrollTop = 0; });
        await T.shot('negotiation-verdict');
        const options = await page.evaluate(() => [...document.querySelectorAll('[data-programme-option]')].map(o => ({ id: o.getAttribute('data-programme-option'), reason: o.querySelector('[data-programme-disabled-reason]')?.textContent ?? null, disabled: o.querySelector('button')?.disabled, button: o.querySelector('button')?.textContent })));
        T.fact('after the ask: options', options);
        await page.locator('[data-programme-body]').evaluate(b => { b.scrollTop = b.scrollHeight; }); await T.settle(120);
        await T.shot('negotiation-verdict-bottom');
        await back(T);
        await detail(T, 'tactics', audit, 'tactics-in-window');
        await page.keyboard.press('Escape'); await page.locator(D).waitFor({ state: 'hidden' }); await T.settle(400);
        await stay.scrollIntoViewIfNeeded(); await T.settle(200);
        await T.shot('window-after-counter');
        const card = await page.evaluate(() => document.body.innerText.match(/[^\n]*\/\s?w(?:ee)?k[^\n]*/gi)?.slice(0, 8) ?? []);
        T.fact('wage lines on the page after the counteroffer', card);
        await page.reload({ waitUntil: 'networkidle' });
        const s2 = await T.saved();
        if (s2.transferSituation.offer.wage !== s1.transferSituation.offer.wage) T.problem('reload: the offered wage changed', { before: s1.transferSituation.offer.wage, after: s2.transferSituation.offer.wage });
        const review = page.getByRole('button', { name: /^Review contract with / });
        if (await review.count()) {
          await review.first().scrollIntoViewIfNeeded(); await review.first().click();
          const sheet = page.locator('[data-soccer-offer-review]');
          await sheet.waitFor({ timeout: 5000 }); await T.settle(300);
          const shown = await sheet.locator('[data-offer-signed-wage]').getAttribute('data-offer-signed-wage').catch(() => null);
          T.fact('contract review: signed wage shown', { shown, saved: s2.transferSituation.offer.wage });
          if (shown !== null && Number(shown) !== s2.transferSituation.offer.wage) T.problem('contract review shows another wage than the save', { shown, saved: s2.transferSituation.offer.wage });
          await T.shot('contract-review');
        } else T.fact('contract review button', 'none on this card');
      });
    }
  }
}
