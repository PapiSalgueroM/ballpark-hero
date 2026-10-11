// Release AX review (engine-saves): ruling C3 for pressRoom on the REAL page. A real recorded save on its playing
// screen (the other lane's own native fixture, written by scripts/simCareerPressMarket.mjs) answers the press,
// reloads, and is then damaged twelve ways in storage before the app boots. Each time the page must load with no
// error screen, the tile must be on the page again reading 50/100, the dialog must open with no past answers,
// and an answer must write a fresh part. usage (#!serve #!playwright, after the sim): node .rc/x/walkSoccerPress.mjs
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(process.cwd(), '.tmp-fx', 'review-engine-saves', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'soccerCareerSave';
const fixtures = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'career-press-market-artifacts', 'native-fixtures.json'), 'utf8'));
const fixture = fixtures.find(f => f.slug === 'soccer-career');
if (!fixture) { console.log('walkSoccerPress: CANNOT RUN, no soccer fixture in native-fixtures.json'); process.exit(2); }
let checks = 0, failed = 0;
const check = (name, cond, line) => { checks += 1; if (!cond) failed += 1; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}: ${line}`); };
const DAMAGES = ['null', 'string', 'array', 'version', 'historyObject', 'nullRow', 'sourceNull', 'sourceFar', 'credString', 'promiseString', 'twice', 'rowGoals'];
const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
const errors = [];

for (const [tag, size] of [['390', { width: 390, height: 844 }], ['1280', { width: 1280, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport: size });
  await ctx.addInitScript(([key, raw]) => {
    if (!localStorage.getItem('review-seeded')) {
      localStorage.setItem('review-seeded', '1'); localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('dukb-guest-handle', 'CornerCaptain'); localStorage.setItem(key, raw);
    }
    const d = sessionStorage.getItem('review-damage');
    if (d) {
      /* the damage goes into storage BEFORE the app boots, over whatever the page wrote while it was leaving */
      sessionStorage.removeItem('review-damage');
      const s = JSON.parse(sessionStorage.getItem('review-good')), p = s.pressRoom;
      if (d === 'null') s.pressRoom = null;
      if (d === 'string') s.pressRoom = 'garbage';
      if (d === 'array') s.pressRoom = [];
      if (d === 'version') p.version = 2;
      if (d === 'historyObject') p.history = { 0: p.history[0] };
      if (d === 'nullRow') p.history.push(null);
      if (d === 'sourceNull') p.history[0].source = null;
      if (d === 'sourceFar') p.history[0].source.index = 1e9;
      if (d === 'credString') p.credibility = '50';
      if (d === 'promiseString') { p.history[0].choice = 'ambitious'; p.history[0].promise = 'promise'; }
      if (d === 'twice') p.history.push(JSON.parse(JSON.stringify(p.history[0])));
      if (d === 'rowGoals') s.seasons[p.history[0].source.index].goals += 4;
      localStorage.setItem(key, JSON.stringify(s));
      sessionStorage.setItem('review-applied', d);
    }
  }, [KEY, JSON.stringify(fixture.value)]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${tag}: ${String(e).slice(0, 200)}`));
  const part = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null')?.pressRoom, KEY);
  const press = async sel => { await page.locator(sel).first().waitFor({ state: 'attached', timeout: 20000 }); return page.evaluate(q => { const el = document.querySelector(q); if (!el || el.disabled) return false; el.click(); return true; }, sel); };
  const tileText = async () => { const ok = await page.locator('[data-press-room-open]').first().waitFor({ state: 'visible', timeout: 30000 }).then(() => true, () => false); return ok ? (await page.locator('[data-press-room-open]').first().innerText()).replace(/\s+/g, ' ') : null; };
  const broke = () => page.evaluate(() => /This page broke|Something went wrong/i.test(document.body.innerText));
  const answer = async choice => {
    await press('[data-press-room-open]'); await press('[data-press-start]');
    await page.locator('[data-press-answer="calm"]').waitFor({ state: 'visible', timeout: 20000 });
    const past = await page.evaluate(() => [...document.querySelectorAll('[data-press-room] button')].some(b => /Your past answers/.test(b.textContent || '')));
    const pick = choice === 'ambitious' && await page.evaluate(() => { const b = document.querySelector('[data-press-answer="ambitious"]'); return !!b && !b.disabled; }) ? 'ambitious' : choice === 'ambitious' ? 'accountable' : choice;
    await press(`[data-press-answer="${pick}"]`);
    const receipt = await page.locator('[data-press-receipt]').waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false);
    await page.waitForFunction(k => (JSON.parse(localStorage.getItem(k) || 'null')?.pressRoom?.history?.length ?? 0) >= 1, KEY, { timeout: 10000 }).catch(() => undefined);
    return { past, pick, receipt };
  };
  try {
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const first = await tileText();
    check('tile', !!first && /Answer for your season/.test(first) && /50\/100/.test(first), `${tag}: on a real save's playing screen the Press room tile reads "${first}"`);
    await page.locator('[data-press-room-open]').first().scrollIntoViewIfNeeded().catch(() => undefined);
    await page.screenshot({ path: path.join(OUT, `S-${tag}-tile.png`) });
    const a = await answer('ambitious');
    await page.screenshot({ path: path.join(OUT, `S-${tag}-receipt.png`) });
    const p1 = await part();
    check('answer', a.receipt && !a.past && p1?.version === 1 && p1.history.length === 1, `${tag}: an answer (${a.pick}) is on the save: ${p1?.history?.length} row, credibility ${p1?.credibility}, promise ${p1?.history?.[0]?.promise?.outcome ?? 'none'}`);
    await press('[data-press-close]');
    await page.reload({ waitUntil: 'domcontentloaded' });
    const after = await tileText();
    const good = await page.evaluate(k => localStorage.getItem(k), KEY);
    check('reload', !!after && /Your answers and promises/.test(after) && JSON.stringify(JSON.parse(good).pressRoom) === JSON.stringify(p1), `${tag}: after a reload the tile reads "${after}" and the part is the one that was written`);
    let ok = 0; const bad = [];
    for (const d of DAMAGES) {
      const before = errors.length;
      await page.evaluate(([name, raw]) => { sessionStorage.setItem('review-good', raw); sessionStorage.setItem('review-damage', name); }, [d, good]);
      await page.reload({ waitUntil: 'domcontentloaded' });
      const applied = await page.evaluate(() => sessionStorage.getItem('review-applied'));
      const text = await tileText(), crashed = await broke();
      const offered = !!text && /Answer for your season/.test(text) && /50\/100/.test(text);
      const r = offered ? await answer('calm') : { past: null, receipt: false };
      const fresh = await part();
      const fine = applied === d && !crashed && offered && r.receipt && r.past === false && fresh?.version === 1 && Array.isArray(fresh.history) && fresh.history.length === 1 && fresh.credibility === 50 && errors.length === before;
      if (fine) ok += 1; else bad.push(`${d} (applied ${applied}, error screen ${crashed}, tile "${text}", receipt ${r.receipt}, past answers shown ${r.past}, part after ${JSON.stringify(fresh)?.slice(0, 90)}, page errors ${errors.length - before})`);
      if (d === 'rowGoals') await page.screenshot({ path: path.join(OUT, `S-${tag}-after-damage-rowGoals.png`) });
      if (offered) await press('[data-press-close]').catch(() => undefined);
    }
    check('damage', bad.length === 0, `${tag}: ${ok} of ${DAMAGES.length} damaged parts loaded with no error screen, offered the room again at 50/100 with no past answers, and took a fresh answer${bad.length ? '; NOT: ' + bad.join('; ') : ''}`);
  } catch (e) { failed += 1; console.log(`FAIL ${tag} stopped: ${String(e?.stack ?? e).split('\n').slice(0, 6).join(' | ')}`); await page.screenshot({ path: path.join(OUT, `S-${tag}-stopped.png`) }).catch(() => undefined); }
  await ctx.close();
}
await browser.close();
check('page errors', errors.length === 0, `${errors.length} uncaught page error(s)${errors.length ? ': ' + errors.slice(0, 4).join(' | ') : ''}`);
console.log(`walkSoccerPress: ${checks} checks, ${failed} failed. ${failed ? 'RED' : 'GREEN'}`);
process.exit(failed ? 1 : 0);
