// Journey 4: cup nights between league games in the Season Centre, the competition views, the pinned Next Season bar,
// and one season played from the hub by pressing what a player presses.
const C = '[data-season-centre]:not([aria-hidden="true"])';

async function openCentre(T) {
  const { page } = T;
  const watch = page.locator('[data-watch-week-by-week]');
  await watch.waitFor({ timeout: 15000 });
  await watch.scrollIntoViewIfNeeded(); await T.settle(250);
  await T.shot('summary-with-watch');
  await watch.click();
  await page.locator(C).first().waitFor(); await T.settle(500);
  const got = page.getByRole('button', { name: 'Got it', exact: true });
  if (await got.count()) {
    const help = await page.evaluate(() => { const c = document.querySelector('[data-season-centre]:not([aria-hidden="true"])'); return { cupExample: c.innerText.includes('A cup night'), cupRule: c.innerText.includes('Saved cup games appear between league games') }; });
    T.fact('centre help on first open', help);
    if (!help.cupExample) T.problem('centre help has no cup night example', help);
    await T.shot('centre-help');
    await got.click(); await T.settle(300);
  } else T.fact('centre help on first open', 'not shown');
}
/** Plays league games from..to on Results speed; returns when the last one is at full time. */
async function playTo(T, from, to) {
  const { page } = T;
  const active = page.locator(C).first();
  for (let md = from; md <= to; md += 1) {
    const poster = active.getByRole('button', { name: new RegExp('^▶ (?:Matchday|League game) ' + md + '$') });
    if (await poster.count()) await poster.click();
    const pass0 = active.locator('[data-moment-pass]'); if (await pass0.count()) await pass0.first().click();
    const results = active.getByRole('button', { name: 'Results', exact: true });
    if (await results.count()) { const on = await results.getAttribute('aria-pressed', { timeout: 1500 }).catch(() => 'gone'); if (on !== 'true' && on !== 'gone') await results.click({ timeout: 1500 }).catch(() => {}); }
    const pass = active.getByRole('button', { name: /Let it play/ }); if (await pass.count()) await pass.first().click();
    await page.waitForFunction(n => document.querySelector('[data-matchday="' + n + '"] [data-match-clock]')?.getAttribute('data-minute') === '90', md, { timeout: 5000 }).catch(async () => {
      const again = active.getByRole('button', { name: /Let it play/ }); if (await again.count()) await again.first().click();
      await page.waitForFunction(() => document.querySelector('[data-match-clock]')?.getAttribute('data-minute') === '90', undefined, { timeout: 6000 });
    });
    await T.settle(200);
    if (md < to) {
      const next = active.getByRole('button', { name: new RegExp('^▶ (?:Matchday|League game) ' + (md + 1) + '$') });
      if (await next.count()) await next.click();
      else { const cup = active.locator('[data-centre-next-cup]'); if (await cup.count() && await cup.getAttribute('data-centre-next-cup')) return md; throw new Error('no way on after league game ' + md); }
    }
  }
  return to;
}
const cupNow = T => T.page.evaluate(() => { const c = document.querySelector('[data-centre-calendar-cup]'); if (!c) return null; return { id: c.getAttribute('data-centre-calendar-cup'), revealed: c.getAttribute('data-cup-revealed'), text: c.innerText.slice(0, 500), buttons: [...document.querySelectorAll('[data-season-centre]:not([aria-hidden="true"]) button')].filter(b => b.getBoundingClientRect().height > 0).map(b => (b.textContent || '').trim().slice(0, 40)).slice(0, 24) }; });

export default async function run({ visit, audit, NEW, OLD, WIDTHS }) {
  for (const width of WIDTHS) {
    for (const [name, save] of [['cup-win', NEW.summaryWin], ['cup-out', NEW.summaryOut], ['cup-old', OLD.summaryWin]]) {
      await visit(name, width, save, {}, async T => {
        const { page } = T;
        const s = await T.saved(), run = s.pendingSummary.cupRun, raw0 = await T.raw();
        T.fact('saved cup run', { cup: run.cup, stages: run.stages, opening: run.opening ?? null, year: s.pendingSummary.year, club: s.pendingSummary.club, league: s.pendingSummary.leagueApps });
        await openCentre(T);
        const active = page.locator(C).first();
        await T.shot('kickoff');
        await audit(T, C, 'kickoff');
        await active.getByRole('button', { name: /Kick off/ }).first().click(); await T.settle(300);
        const reached = await playTo(T, 1, 5);
        T.fact('league games played before the cup night', reached);
        await active.locator('[data-centre-next-cup]').first().waitFor({ timeout: 5000 });
        T.fact('the button after league game ' + reached, await active.locator('[data-centre-next-cup]').first().textContent());
        await T.shot('league-five-full-time');
        await active.locator('[data-centre-next-cup]').first().click();
        await page.locator('[data-centre-calendar-cup]').first().waitFor(); await T.settle(300);
        T.fact('cup night before the reveal', await cupNow(T));
        await T.shot('cup-before');
        await audit(T, C, 'cup night');
        await active.locator('[data-calendar-cup-reveal]').click(); await T.settle(300);
        const shown = await cupNow(T);
        T.fact('cup night after the reveal', shown);
        await T.shot('cup-result');
        const early = run.stages[0], opening = run.opening;
        if (opening && !shown.text.includes(`${opening.for}-${opening.against}`)) T.problem('cup night: the score shown is not the saved one', { opening, text: shown.text });
        if (opening && !shown.text.includes(opening.opp)) T.problem('cup night: the opponent shown is not the saved one', { opening, text: shown.text });
        if (!shown.text.includes(early.won ? 'Through' : 'Out')) T.problem('cup night: verdict is not the saved one', { early, text: shown.text });
        if (width < 1000) { await active.locator('[data-centre-fixtures]').click(); await T.settle(300); }
        const list = await page.evaluate(() => [...document.querySelectorAll('[data-fixture-cup]')].filter(e => e.getBoundingClientRect().height > 0).map(e => ({ id: e.getAttribute('data-fixture-cup'), after: e.getAttribute('data-cup-after-league'), text: e.innerText.replace(/\n/g, ' | '), h: Math.round(e.getBoundingClientRect().height) })));
        T.fact('cup rows in the fixture list after the reveal', list);
        if (early.won && !list.some(r => r.id === 'domestic:1')) T.problem('a win did not reveal the next round in the list', list);
        if (!early.won && list.some(r => r.id !== 'domestic:0')) T.problem('a deciding loss left a later cup row', list);
        const cupRow = page.locator('[data-fixture-cup]:visible').first();
        if (await cupRow.count()) await cupRow.scrollIntoViewIfNeeded();
        await T.shot('fixtures-with-cup');
        if (width < 1000) { await active.getByRole('button', { name: '← Back', exact: true }).click(); await T.settle(200); }
        await active.locator('[data-calendar-cup-competition]').click();
        await page.locator('[data-centre-cup-bracket], [data-centre-cup-missing]').first().waitFor(); await T.settle(300);
        const bracket = await page.evaluate(() => ({ rounds: [...document.querySelectorAll('[data-centre-cup-round]')].map(r => r.innerText.replace(/\n/g, ' | ').slice(0, 160)), games: document.querySelectorAll('[data-centre-cup-open]').length }));
        T.fact('bracket', bracket);
        if (bracket.games !== run.stages.length) T.problem('bracket: not one tile a saved tie', { games: bracket.games, stages: run.stages.length });
        await T.shot('bracket');
        await audit(T, C, 'bracket');
        const tie = page.locator('[data-centre-cup-open="0"]');
        if (await tie.count()) { await tie.click(); await T.settle(300); await T.shot('bracket-tie'); T.fact('bracket tie opened', await page.evaluate(() => document.querySelector('[data-season-centre]:not([aria-hidden="true"]) [data-centre-stage], [data-season-centre]:not([aria-hidden="true"])')?.innerText.slice(0, 400))); }
        await active.locator('[data-centre-competition="league"]').click(); await T.settle(300);
        await T.shot('back-on-league');
        const cont = active.locator('[data-calendar-cup-continue]');
        if (!(await cont.count())) { T.problem('back on the league view the cup night lost its continue button', await cupNow(T)); return; }
        T.fact('continue button', await cont.textContent());
        // leave at the cup night and come back: what does Resume show
        await active.locator('[data-centre-exit]').click(); await T.settle(500);
        if ((await T.raw()) !== raw0) T.fact('leaving the centre changed the save (stars or resume are allowed)', 'bytes differ');
        await page.locator('[data-watch-week-by-week]').waitFor({ timeout: 8000 });
        await page.locator('[data-watch-week-by-week]').click(); await page.locator(C).first().waitFor(); await T.settle(500);
        await T.shot('reopened');
        T.fact('reopened: buttons', await page.evaluate(() => [...document.querySelectorAll('[data-season-centre]:not([aria-hidden="true"]) button')].filter(b => b.getBoundingClientRect().height > 0).map(b => (b.textContent || '').trim().slice(0, 40)).slice(0, 16)));
        const resume = page.locator(C).first().getByRole('button', { name: /Kick off|Resume|Carry on|Pick up/ }).first();
        if (await resume.count()) { await resume.click(); await T.settle(400); T.fact('after resume', await cupNow(T) ?? 'not a cup night'); await T.shot('resumed'); }
        const rest = page.locator(C).first().getByRole('button', { name: /Sim the rest|Straight to the end|to the end/ }).first();
        if (await rest.count()) { await rest.click(); await T.settle(900); await T.shot('review'); const all = await page.evaluate(() => [...document.querySelectorAll('[data-fixture-cup]')].map(e => e.getAttribute('data-fixture-cup'))); T.fact('cup rows at the review', all); }
        const finalSave = await T.saved();
        if (JSON.stringify(finalSave.pendingSummary.cupRun) !== JSON.stringify(run)) T.problem('the saved cup run changed while watching', '');
      });
    }
    await visit('euro', width, NEW.summaryEuro, {}, async T => {
      const { page } = T;
      await openCentre(T);
      const active = page.locator(C).first();
      const nav = await page.evaluate(() => [...document.querySelectorAll('[data-season-centre]:not([aria-hidden="true"]) [data-centre-competition]')].map(b => ({ id: b.getAttribute('data-centre-competition'), text: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height), w: Math.round(b.getBoundingClientRect().width) })));
      T.fact('competition buttons', nav);
      for (const id of ['club', 'domestic', 'squad']) {
        const b = active.locator(`[data-centre-competition="${id}"]`);
        if (!(await b.count())) { T.fact('no competition button', id); continue; }
        await b.click(); await T.settle(500);
        await T.shot(`competition-${id}`);
        await audit(T, C, `competition ${id}`);
        if (id === 'club') { T.fact('club view', await page.evaluate(() => ({ tables: [...document.querySelectorAll('[data-centre-cup-table]')].map(t => t.innerText.replace(/\n/g, ' | ').slice(0, 300)), rounds: [...document.querySelectorAll('[data-centre-cup-round]')].map(r => r.innerText.replace(/\n/g, ' | ').slice(0, 120)) }))); await page.evaluate(() => { const st = document.querySelector('[data-centre-cup-bracket]'); st?.scrollIntoView({ block: 'start' }); }); await T.settle(200); await T.shot('competition-club-bracket'); }
      }
      await active.locator('[data-centre-competition="league"]').click(); await T.settle(200);
      const help = active.locator('[data-centre-help], button[aria-label*="How"], button[aria-label*="help" i]').first();
      if (await help.count()) { await help.click(); await T.settle(300); await T.shot('competition-help'); const gi = page.getByRole('button', { name: 'Got it', exact: true }); if (await gi.count()) await gi.click(); await T.settle(200); }
    });
    await visit('euro-night', width, NEW.summaryEuro, {}, async T => {
      const { page } = T;
      await openCentre(T);
      const active = page.locator(C).first();
      await active.getByRole('button', { name: /Kick off/ }).first().click(); await T.settle(300);
      const reached = await playTo(T, 1, 5);
      const next = active.locator('[data-centre-next-cup]').first();
      T.fact('league games before the first cup night', { reached, button: await next.textContent().catch(() => null), id: await next.getAttribute('data-centre-next-cup').catch(() => null) });
      await T.shot('before-first-night');
      await next.click(); await page.locator('[data-centre-calendar-cup]').first().waitFor(); await T.settle(300);
      T.fact('first cup night', await cupNow(T));
      await T.shot('night-before');
      await active.locator('[data-calendar-cup-reveal]').click(); await T.settle(300);
      T.fact('first cup night revealed', await cupNow(T));
      await T.shot('night-result');
      await audit(T, C, 'european night');
      const cont = active.locator('[data-calendar-cup-continue]');
      T.fact('continue says', await cont.textContent());
      await cont.click(); await T.settle(500);
      await T.shot('after-night');
      T.fact('after the night', (await cupNow(T)) ?? await page.evaluate(() => document.querySelector('[data-matchday]')?.getAttribute('data-matchday') ?? 'no matchday on screen'));
    });
  }
  await visit('pinned-bar', 430, NEW.plan, {}, async T => {
    const { page } = T;
    const read = () => page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /^Next Season/.test((x.textContent || '').trim())); if (!b) return null; const r = b.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { y: Math.round(scrollY), max: document.documentElement.scrollHeight - innerHeight, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, hit: !!hit && (hit === b || b.contains(hit)) }; });
    const stops = [];
    for (const y of [0, 600, 1500, 3000, 99999]) { await page.evaluate(v => scrollTo(0, v), y); await T.settle(350); const r = await read(); stops.push(r); if (!r || !r.hit || r.bottom > r.vh + 1 || r.top < 0) T.problem('the Next Season bar is not pinned and reachable at scroll ' + y, r); if (y === 3000) await T.shot('bar-at-3000'); if (y === 99999) await T.shot('bar-at-bottom'); }
    T.fact('Next Season button at five scroll stops', stops);
  });
}
