/* Reviewer's walk of Round 1100 (never committed). Runs on the runner from the repo root:
     BASE=http://localhost:4173 node .rc/x/rvwalk.mjs
   Loads the recorded saves through the game's own storage key, plays a season with Week by week
   (plain league, 24 club league, odd league, the Hertha hold) and a dugout season (Scottish, Segunda),
   at 390x844 and 1280x900, motion on and reduced. Prints what the page says and saves screenshots
   into $RC_OUT. It asserts little: the reviewer reads the READ lines and looks at the shots. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx/rvshots';
fs.mkdirSync(OUT, { recursive: true });
const saves = JSON.parse(fs.readFileSync('scripts/data/careerLeagueWorldSaves1100.json', 'utf8')).saves;
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
let problems = 0;
const note = (ok, msg) => { if (!ok) problems += 1; console.log(`${ok ? 'ok  ' : 'ODD '} ${msg}`); };
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };

async function open(id, width, height, reduced, seed) {
  const save = saves.find(s => s.id === id);
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([v, s]) => {
    let t = s >>> 0;
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      if (!sessionStorage.getItem('rv-harness')) {
        sessionStorage.setItem('rv-harness', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('soccerCareerSave', v);
        localStorage.setItem('seasonCentre:help', '1');
      }
    } catch { /* private mode */ }
  }, [JSON.stringify(save.state), seed]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  return { ctx, page, errors, save };
}
const clickText = async (page, text) => {
  const ok = await page.evaluate(t => {
    const b = [...document.querySelectorAll('button')].find(x => !x.disabled && x.textContent.trim().startsWith(t));
    if (!b) return false;
    b.click();
    return true;
  }, text);
  await page.waitForTimeout(400);
  return ok;
};
const tableRead = page => page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-centre-table] [data-club]')];
  return { n: rows.length, text: rows.map(r => r.textContent.replace(/\s+/g, ' ').trim()), sw: document.documentElement.scrollWidth };
});
/* any element whose own box is wider than the viewport or pokes out of it, and any text node clipped by its box */
const overflow = (page, width) => page.evaluate(w => {
  const out = [];
  for (const el of document.querySelectorAll('[data-season-centre] *, main *')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > w + 1 || r.left < -1)) { out.push(`${el.tagName}.${String(el.className).slice(0, 40)} ${Math.round(r.left)}..${Math.round(r.right)}`); if (out.length > 4) break; }
  }
  return out;
}, width);

async function playerWalk(id, width, height, reduced, first, want) {
  const tag = `${id}-${width}${reduced ? '-reduced' : ''}`;
  for (const seed of [first, first + 1, first + 2, first + 3]) {
    const { ctx, page, errors, save } = await open(id, width, height, reduced, seed);
    const y0 = await page.evaluate(() => window.scrollY);
    if (!(await page.$('[data-week-by-week]'))) { note(false, `${tag}: no Week by week button on the hub`); await shot(page, `${tag}-nohub`); await ctx.close(); return; }
    await shot(page, `${tag}-0hub`);
    await page.click('[data-week-by-week]');
    await page.waitForSelector('[data-kickoff]', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(900);
    const k = await page.evaluate(() => ({
      head: document.querySelector('[data-kickoff]')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 330) ?? null,
      frame: document.querySelector('[data-frame-line]')?.textContent.trim() ?? null,
      why: document.querySelector('[data-results-why]')?.textContent.trim() ?? null,
      y: window.scrollY,
    }));
    if (k.why && /cut short/.test(k.why) && seed !== first + 3) { await ctx.close(); continue; }
    console.log(`READ ${tag} (${save.club}, seed ${seed}) kickoff: frame="${k.frame}" why="${k.why}"`);
    console.log(`READ ${tag} kickoff card: ${k.head}`);
    note(k.y === y0, `${tag}: the page did not move when the Season Centre opened (${y0} then ${k.y})`);
    const t0 = await tableRead(page);
    console.log(`READ ${tag} table before a ball: ${t0.n} rows: ${t0.text.slice(0, 26).join(' / ').slice(0, 900)}`);
    if (want.rows !== undefined) note((width >= 768 ? t0.n === want.rows : t0.n >= 3) && !t0.text.some(x => /another club/.test(x)), `${tag}: table rows ${t0.n} (want ${width >= 768 ? want.rows : 'a compact window'}), unnamed ${t0.text.filter(x => /another club/.test(x)).length}`);
    if (want.frame) note(!!k.frame && want.frame.every(f => k.frame.includes(f)), `${tag}: the frame line says ${want.frame.join(' and ')}`);
    if (want.results) note(!k.frame && t0.n === 0 && !!k.why, `${tag}: Results only (no frame line, no table, a reason: "${k.why}")`);
    note(t0.sw <= width + 1, `${tag}: no sideways scroll on kick off (${t0.sw})`);
    const of0 = await overflow(page, width);
    note(of0.length === 0, `${tag}: nothing pokes out of the viewport on kick off ${of0.join(' | ')}`);
    await shot(page, `${tag}-1kickoff`);
    /* kick off and watch two matchdays so the live table is seen, then jump */
    if (await clickText(page, '▶ Kick off')) {
      await page.waitForTimeout(reduced ? 1500 : 3500);
      await shot(page, `${tag}-2live`);
      const live = await tableRead(page);
      console.log(`READ ${tag} live: ${live.n} table rows, sw ${live.sw}; bar: ${await page.evaluate(() => document.querySelector('[data-centre-bar]')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) ?? 'none')}`);
      const of1 = await overflow(page, width);
      note(of1.length === 0 && live.sw <= width + 1, `${tag}: nothing pokes out while a matchday plays ${of1.join(' | ')}`);
    }
    const buttons = await page.evaluate(() => [...document.querySelectorAll('[data-season-centre] button')].map(b => b.textContent.trim().slice(0, 40)));
    console.log(`READ ${tag} buttons mid season: ${buttons.join(' | ').slice(0, 400)}`);
    for (const label of ['⏭ Straight to the final table', '⏭ Straight to the season review', '⏭', 'Skip']) if (await clickText(page, label)) break;
    await page.waitForSelector('[data-review]', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => ({
      finish: document.querySelector('[data-review-finish]')?.textContent.trim() ?? null,
      champion: document.querySelector('[data-review-champion]')?.textContent.trim() ?? null,
      review: document.querySelector('[data-review]')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 500) ?? null,
    }));
    const t1 = await tableRead(page);
    console.log(`READ ${tag} review: finish="${r.finish}" champion="${r.champion}"`);
    console.log(`READ ${tag} review text: ${r.review}`);
    console.log(`READ ${tag} final table: ${t1.n} rows: ${t1.text.join(' / ').slice(0, 1500)}`);
    await shot(page, `${tag}-3review`);
    await page.screenshot({ path: path.join(OUT, `${tag}-3review-full.png`), fullPage: true });
    const of2 = await overflow(page, width);
    note(of2.length === 0, `${tag}: nothing pokes out on the review ${of2.join(' | ')}`);
    if (want.of) note(!!r.finish && r.finish.includes(`of ${want.of}`), `${tag}: the review prints a position of ${want.of} ("${r.finish}")`);
    if (want.noLeague) note(!(r.finish ?? '').includes(want.noLeague) && !(r.review ?? '').includes(want.noLeague), `${tag}: the review never names ${want.noLeague}`);
    await page.click('[data-centre-exit]').catch(() => {});
    await page.waitForTimeout(800);
    let card = null;
    for (let i = 0; i < 6 && !card; i += 1) {
      card = await page.evaluate(() => {
        const h = [...document.querySelectorAll('h3')].find(x => x.textContent.trim() === 'Season Summary');
        const box = h ? h.closest('div.relative') ?? h.parentElement : null;
        return box ? box.textContent.replace(/\s+/g, ' ').trim().slice(0, 700) : null;
      });
      if (!card && !(await clickText(page, 'Continue to Season Summary'))) await page.waitForTimeout(500);
    }
    console.log(`READ ${tag} summary card: ${card}`);
    if (want.of) note(!!card && new RegExp(`of ${want.of}\\b`).test(card), `${tag}: the Season Summary card prints "of ${want.of}"`);
    if (want.noLeague) note(!!card && !card.includes(want.noLeague), `${tag}: the Season Summary card never names ${want.noLeague}`);
    await shot(page, `${tag}-4summary`);
    note(errors.length === 0, `${tag}: no page error ${errors.join(' | ')}`);
    await ctx.close();
    return;
  }
}

async function dugoutWalk(id, width, height, reduced, seed, want) {
  const tag = `${id}-${width}${reduced ? '-reduced' : ''}`;
  const { ctx, page, errors, save } = await open(id, width, height, reduced, seed);
  const read = () => page.evaluate(() => {
    const h = [...document.querySelectorAll('span')].find(x => /^Final table/.test(x.textContent.trim()));
    const box = h ? h.closest('div.rounded-xl') : null;
    const rows = box ? [...box.querySelectorAll('div.cm-tick-in')].map(r => r.textContent.replace(/\s+/g, ' ').trim()) : [];
    const results = [...document.querySelectorAll('div.cm-tick-in')].filter(d => /^S\d{4}/.test(d.textContent.trim())).map(d => d.textContent.replace(/\s+/g, ' ').trim());
    return { box: box ? box.textContent.replace(/\s+/g, ' ').trim().slice(0, 600) : null, rows, results, y: window.scrollY, sw: document.documentElement.scrollWidth };
  });
  const before = await read();
  console.log(`READ ${tag} (${save.club}) BEFORE advancing (the old save's own last row): ${before.box}`);
  await shot(page, `${tag}-0before`);
  for (let i = 0; i < 2; i += 1) {
    if (!(await clickText(page, 'Next Manager Season'))) { note(false, `${tag}: no Next Manager Season button (step ${i})`); break; }
    await page.waitForTimeout(reduced ? 1200 : 2600);
    const a = await read();
    console.log(`READ ${tag} season ${i + 1}: results ${a.results.slice(-2).join(' || ')}`);
    console.log(`READ ${tag} season ${i + 1}: table box: ${a.box}`);
    console.log(`READ ${tag} season ${i + 1}: ${a.rows.length} rows shown: ${a.rows.join(' / ').slice(0, 500)}`);
    if (want.sentence && a.box) note(a.box.includes(want.sentence), `${tag}: season ${i + 1} prints "${want.sentence}"`);
    if (want.noPoints && a.box) note(!/\bpts\b|points on|\d+ points/.test(a.box) || a.box.includes('so no points here'), `${tag}: season ${i + 1} prints no points`);
    if (want.never && a.box) note(!a.box.includes(want.never), `${tag}: season ${i + 1} never says "${want.never}"`);
    if (want.of && a.results.length) note(a.results[a.results.length - 1].includes(`of ${want.of}`), `${tag}: season ${i + 1} result says of ${want.of} ("${a.results[a.results.length - 1]}")`);
    note(a.sw <= width + 1, `${tag}: no sideways scroll (${a.sw})`);
    await shot(page, `${tag}-${i + 1}season`);
    if (!a.box) break;
  }
  await page.screenshot({ path: path.join(OUT, `${tag}-full.png`), fullPage: true });
  note(errors.length === 0, `${tag}: no page error ${errors.join(' | ')}`);
  await ctx.close();
}

try {
  let n = 0;
  for (const [w, h] of [[390, 844], [1280, 900]]) for (const reduced of [false, true]) { await playerWalk('ere', w, h, reduced, 2100 + 53 * n, { rows: 18, frame: ['18 clubs', '34 matchdays'], of: 18 }); n += 1; }
  await playerWalk('cha', 390, 844, false, 3100, { rows: 24, frame: ['24 clubs', '46 matchdays'], of: 24 });
  await playerWalk('cha', 1280, 900, true, 3200, { rows: 24, frame: ['24 clubs', '46 matchdays'], of: 24 });
  await playerWalk('sco', 390, 844, false, 4100, { results: true });
  await playerWalk('sco', 1280, 900, true, 4200, { results: true });
  await playerWalk('her', 390, 844, false, 5100, { noLeague: '2. Bundesliga' });
  await playerWalk('nan', 1280, 900, false, 5200, { noLeague: 'Ligue 2' });
  await dugoutWalk('mgrSco', 390, 844, false, 6100, { sentence: 'The order only: the Scottish Premiership splits in two late in the season, so no points here.', noPoints: true, never: "we don't know how many" });
  await dugoutWalk('mgrSco', 1280, 900, true, 6200, { sentence: 'The order only: the Scottish Premiership splits in two late in the season, so no points here.', noPoints: true, never: "we don't know how many" });
  await dugoutWalk('mgrSeg', 390, 844, true, 6300, { of: 22 });
  await dugoutWalk('mgrSeg', 1280, 900, false, 6400, { of: 22 });
} catch (e) {
  note(false, `the walk threw: ${String(e && e.stack ? e.stack : e).slice(0, 400)}`);
}
await browser.close();
console.log(`rvwalk: ${problems} odd things`);
process.exit(problems ? 1 : 0);
