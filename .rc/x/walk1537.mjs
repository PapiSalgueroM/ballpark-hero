// Reviewer walk for Round 1537 (run lens). Plays the NBA and NHL Connections planning bench the way a player does
// at 390x844 (touch) and 1280x900, reduced motion on and off, then plays the NBA Front Office hub past tip off,
// waives one man and reads the Roster box with a hurt star and with a fit squad. Host blocked, shots into RC_OUT.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const { chromium, devices } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '/tmp/walk1537';
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const say = s => { console.log(s); log.push(s); };
const browser = await chromium.launch();

async function open(route, { width, height, motion }) {
  const phone = width < 700;
  const ctx = await browser.newContext({ ...(phone ? devices['iPhone 13'] : {}), viewport: { width, height }, reducedMotion: motion });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(600);
  await answerConsent(page); await page.waitForTimeout(300);
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(900);
  return { ctx, page, errors };
}

/* ---------- A. the NBA and NHL Connections planning bench ---------- */
const SIZES = [{ width: 390, height: 844, motion: 'reduce' }, { width: 390, height: 844, motion: 'no-preference' },
  { width: 1280, height: 900, motion: 'reduce' }, { width: 1280, height: 900, motion: 'no-preference' }];
for (const route of ['/nba-connections', '/nhl-connections']) {
  for (const size of SIZES) {
    const tag = `${route.slice(1, 4)}-${size.width}-${size.motion === 'reduce' ? 'rm' : 'mo'}`;
    const { ctx, page, errors } = await open(route, size);
    const rulesUp = await page.locator('[role="dialog"]').count();
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    const box = page.getByRole('group', { name: 'Available players' });
    if (await box.count() === 0) { say(`${tag}: NO BENCH (dialog count ${rulesUp})`); await ctx.close(); continue; }
    const geo = await box.evaluate(el => ({ sh: el.scrollHeight, ch: el.clientHeight, n: el.querySelectorAll('button').length }));
    await page.locator('section[aria-label="Planning bench"]').evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${tag}-bench.png`) });
    /* What a finger at the centre of each action button lands on, with the box at its top. */
    const hitAt = async label => page.evaluate(l => {
      const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === l);
      const r = b.getBoundingClientRect();
      const h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return h === b || b.contains(h) ? 'itself' : (h?.textContent ?? '').trim().slice(0, 30);
    }, label);
    const clearHit = await hitAt('Clear draft'), submitHit = await hitAt('Submit five');
    /* Scroll the names box with the wheel over it, the way a thumb or a mouse does, to the bottom. */
    const bb = await box.boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
    const y0 = await page.evaluate(() => window.scrollY);
    for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(80); }
    await page.waitForTimeout(300);
    const after = await box.evaluate(el => ({ top: el.scrollTop, max: el.scrollHeight - el.clientHeight }));
    const y1 = await page.evaluate(() => window.scrollY);
    await page.screenshot({ path: path.join(OUT, `${tag}-scrolled.png`) });
    /* Tap the last name, now in view, then Clear draft. */
    const names = box.getByRole('button');
    const last = names.nth(geo.n - 1);
    const lastName = (await last.innerText()).trim();
    const lb = await last.boundingBox();
    await page.mouse.click(lb.x + lb.width / 2, lb.y + lb.height / 2);
    await page.waitForTimeout(300);
    const draft1 = (await page.getByText(/Draft [A-D]: \d\/5/).first().innerText()).trim();
    const pressed = await last.getAttribute('aria-pressed');
    await page.screenshot({ path: path.join(OUT, `${tag}-picked.png`) });
    const cb = await page.getByRole('button', { name: 'Clear draft' }).boundingBox();
    await page.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2);
    await page.waitForTimeout(300);
    const draft0 = (await page.getByText(/Draft [A-D]: \d\/5/).first().innerText()).trim();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    say(`${tag}: rules dialog ${rulesUp}, names ${geo.n}, box ${geo.ch}/${geo.sh}px, tap Clear->${clearHit}, Submit->${submitHit}, wheel scrolled box ${after.top}/${after.max}, page ${y0}->${y1}, tapped "${lastName}" pressed=${pressed} "${draft1}", Clear draft -> "${draft0}", overflow ${overflow}px, errors ${errors.filter(e => !/supabase|Failed to fetch/i.test(e)).length}`);
    await ctx.close();
  }
}
/* The three Connections games without a bench, at 390, as a sanity look. */
for (const route of ['/connections', '/baseball-connections', '/nfl-connections']) {
  const { ctx, page } = await open(route, SIZES[0]);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${route.slice(1).replace(/-/g, '')}-390.png`) });
  await ctx.close();
}

/* ---------- C. the NBA Front Office Roster box past tip off ---------- */
const KEY = 'nba-front-office-save-v1';
const tile = (page, word) => page.locator('button:has(div.uppercase)').filter({ hasText: new RegExp(word, 'i') }).first();
const readBox = async (page, shot) => {
  const t = tile(page, 'Roster');
  const text = (await t.innerText()).replace(/\n/g, ' / ');
  const dots = await t.locator('span.animate-pulse').count();
  if (shot) await t.screenshot({ path: path.join(OUT, shot) });
  return `"${text}" dots=${dots}`;
};
const press = async page => {
  if (await page.locator('[data-gm-press]').count() > 0) { await page.locator('[data-gm-press] button').first().click(); await page.waitForTimeout(500); }
};
const hub = async page => {
  const back = page.locator('button:has-text("Hub")');
  if (await back.count()) { await back.first().click(); await page.waitForTimeout(500); }
};
for (const size of [SIZES[0], SIZES[3]]) {
  const tag = `nbafo-${size.width}`;
  const { ctx, page, errors } = await open('/nba-front-office', size);
  await page.locator('.grid button').first().click();
  await page.waitForTimeout(900);
  await press(page);
  say(`${tag} fresh: ${await readBox(page, `${tag}-1-fresh.png`)}`);
  await tile(page, 'Play').click(); await page.waitForTimeout(500);
  await page.locator('button:has-text("Play Round")').first().click(); await page.waitForTimeout(1200);
  await press(page);
  const feed = (await page.locator('body').innerText()).match(/You tipped off[^\n]{0,120}/)?.[0] ?? '(no tip off line)';
  await hub(page);
  const n1 = await page.evaluate(k => JSON.parse(localStorage.getItem(k)).league.teams[JSON.parse(localStorage.getItem(k)).myTeam].players.length, KEY);
  say(`${tag} after round 1 (${n1} men, feed: ${feed}): ${await readBox(page, `${tag}-2-tipoff.png`)}`);
  await tile(page, 'Roster').click(); await page.waitForTimeout(500);
  const waives = page.locator('button:has-text("Waive, $"):not([disabled])');
  const nw = await waives.count();
  if (nw > 0) {
    await waives.nth(nw - 1).click(); await page.waitForTimeout(300);
    await page.locator('[data-cut-confirm] button:has-text("Waive him")').first().click(); await page.waitForTimeout(500);
  }
  await hub(page);
  const n2 = await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); return { n: s.league.teams[s.myTeam].players.length, round: s.league.round }; }, KEY);
  say(`${tag} after one waive (${nw} waive buttons, ${n2.n} men, round ${n2.round}): ${await readBox(page, `${tag}-3-waived.png`)}`);
  const star = await page.evaluate(k => {
    const s = JSON.parse(localStorage.getItem(k));
    const sq = s.league.teams[s.myTeam].players;
    for (const p of sq) p.out = 0;
    const st = [...sq].sort((a, b) => b.ovr - a.ovr)[0]; st.out = 3;
    localStorage.setItem(k, JSON.stringify(s)); return st.name;
  }, KEY);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
  say(`${tag} hurt star ${star}, 13 men, mid season: ${await readBox(page, `${tag}-4-hurtstar.png`)}`);
  await page.screenshot({ path: path.join(OUT, `${tag}-4-hub.png`) });
  await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); for (const p of s.league.teams[s.myTeam].players) p.out = 0; localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
  say(`${tag} fit squad, 13 men: ${await readBox(page, `${tag}-5-fit.png`)}`);
  await tile(page, 'Play').click(); await page.waitForTimeout(500);
  await page.locator('button:has-text("Play Round")').first().click(); await page.waitForTimeout(1200);
  await press(page); await hub(page);
  const n3 = await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); return { n: s.league.teams[s.myTeam].players.length, round: s.league.round }; }, KEY);
  say(`${tag} after round 2 (${n3.n} men, round ${n3.round}): ${await readBox(page, `${tag}-6-round2.png`)}`);
  say(`${tag}: page errors ${errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e)).length}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk1537.txt'), log.join('\n') + '\n');
console.log('walk1537: done, every reading above, shots in RC_OUT');
