/* Review of Round 1325 (run lens): play the four screens on the REAL served page the way a player would.
   BASE = this tree's served build; RW_BASE_URL (optional) = a served build of origin/main for the old save cross check.
   Screenshots and a findings file go to $RC_OUT. Exits 1 when any finding is recorded. Never committed. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const HEAD = process.env.BASE || 'http://localhost:4173';
const BASEURL = process.env.RW_BASE_URL || '';
const OUT = process.env.RC_OUT || fs.mkdtempSync('/tmp/rw-');
fs.mkdirSync(OUT, { recursive: true });
const SAVE_KEY = 'dukb-club-manager-save';
const SORT_KEYS = ['pos', 'name', 'age', 'ovr', 'pot', 'form', 'wage', 'deal', 'worth', 'fit', 'mood'];
const FIXTURES = {
  everton: 'scripts/data/cmBookSaveEvertonFixture.json',
  hertha: 'scripts/data/cmBookSaveHerthaFixture.json',
  sevilla: 'scripts/data/cmOldSave1052Fixture.json',
  valencia: 'scripts/data/cmSecondTierOldSaveFixture.json',
};
const findings = [];
const notes = [];
const find = (m) => { findings.push(m); console.log(`   FINDING ${m}`); };
const note = (m) => { notes.push(m); console.log(`   note ${m}`); };
const BROKEN = /\bundefined\b|\bNaN\b|\[object Object\]|\bInfinity\b/;

async function open(browser, url, { w, h, seed = 1, save = '', reduced = false }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([s0, raw, key]) => {
    let s = (s0 >>> 0) || 1; let draws = 0;
    Math.random = () => { draws += 1; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    window.__draws = () => draws;
    const FIXED = 1790000000000; const Real = Date;
    class Frozen extends Real { constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); } static now() { return FIXED; } }
    window.Date = Frozen;
    if (raw && !sessionStorage.getItem('rw-seeded')) { try { localStorage.setItem(key, raw); sessionStorage.setItem('rw-seeded', '1'); } catch { /* blocked */ } }
  }, [seed, save, SAVE_KEY]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.route(/supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/, r => r.abort());
  await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}
const pressText = async (page, re, ms = 3000) => page.locator('button:visible').filter({ hasText: re }).first().click({ timeout: ms }).then(() => true).catch(() => false);
const pressName = async (page, name) => page.getByRole('button', { name, exact: true }).first().click({ timeout: 3000 }).then(() => true).catch(() => false);
const tab = async (page, name) => page.getByRole('tab', { name, exact: true }).first().click({ timeout: 5000 }).then(() => true).catch(() => false);
const shot = async (page, name, loc) => {
  const file = path.join(OUT, `${name}.jpg`);
  try { if (loc) await loc.screenshot({ path: file, timeout: 5000, type: 'jpeg', quality: 60 }); else await page.screenshot({ path: file, type: 'jpeg', quality: 60 }); } catch (e) { note(`shot ${name} failed: ${String(e).slice(0, 80)}`); }
};
async function newClub(page, club, league = 'Premier League', nation = 'England') {
  await pressText(page, /^Essential only$/i, 1500);
  if (await page.locator('text=Start Fresh').count()) { await page.locator('text=Start Fresh').first().click(); await page.waitForTimeout(800); }
  await page.locator('button:has-text("2026-27")').first().click({ timeout: 10000 });
  await page.waitForTimeout(700);
  await page.locator(`text=${nation}`).first().click({ timeout: 5000 });
  await page.waitForTimeout(700);
  await page.locator(`button:has-text("${league}")`).first().click({ timeout: 5000 });
  await page.waitForTimeout(700);
  await page.locator(`button:has-text("${club}")`).first().click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await pressText(page, /^Essential only$/i, 1000);
  await page.locator('text=Take the job').first().click({ timeout: 5000 });
  await page.waitForTimeout(1200);
  await pressText(page, /^Skip: just manage$/i, 3000);
  await page.waitForTimeout(2000);
}
async function resume(page) {
  await pressText(page, /^Essential only$/i, 1500);
  await pressText(page, /Resume Career/i, 8000);
  await page.waitForTimeout(1800);
}
/* Generic page health: sideways scroll, broken words, small label text. */
async function health(page, where) {
  const r = await page.evaluate(() => {
    const over = document.documentElement.scrollWidth - window.innerWidth;
    const text = document.body.innerText;
    const small = [...document.querySelectorAll('[data-cm-deal-label],[data-cm-deal-note],[data-cm-worst-defeat],[data-cm-show-more]')]
      .map(e => [e.tagName, parseFloat(getComputedStyle(e).fontSize), (e.textContent || '').slice(0, 40)]).filter(x => x[1] < 12);
    return { over, text, small };
  });
  if (r.over > 1) find(`${where}: the page scrolls sideways by ${r.over} px`);
  const m = /\bundefined\b|\bNaN\b|\[object Object\]|\bInfinity\b/.exec(r.text);
  if (m) find(`${where}: the page reads "${r.text.slice(Math.max(0, m.index - 50), m.index + 30).replace(/\s+/g, ' ')}"`);
  for (const s of r.small) find(`${where}: ${s[0]} "${s[2]}" is ${s[1]} px`);
  return r;
}
/* Text cut by its own box (sideways or clamped), a name excused only when its whole text is in its title. */
async function cuts(page, sel, where) {
  const r = await page.evaluate((s) => {
    const out = [];
    for (const root of document.querySelectorAll(s)) {
      for (const el of root.querySelectorAll('*')) {
        if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || el.getClientRects().length === 0) continue;
        const side = el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible';
        const down = el.scrollHeight > el.clientHeight + 1 && cs.overflowY === 'hidden';
        if (!side && !down) continue;
        const t = (el.textContent || '').trim();
        if (el.getAttribute('title') === t) continue;
        out.push(`"${t.slice(0, 50)}" ${side ? `${el.scrollWidth} of ${el.clientWidth} px wide` : `${el.scrollHeight} of ${el.clientHeight} px tall`}`);
      }
    }
    return out;
  }, sel);
  for (const c of r.slice(0, 6)) find(`${where}: cut ${c}`);
  return r.length;
}
/* Controls under 44 px tall, in a container, filtered by their words. */
async function smallTaps(page, sel, re, where) {
  const r = await page.evaluate(([s, src]) => {
    const rx = new RegExp(src);
    return [...document.querySelectorAll(`${s} button, ${s} select`)].filter(b => b.getClientRects().length && rx.test((b.textContent || b.getAttribute('aria-label') || '').trim()))
      .map(b => [Math.round(b.getBoundingClientRect().height * 10) / 10, (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 40)]).filter(x => x[0] < 44);
  }, [sel, re.source]);
  for (const t of r.slice(0, 4)) find(`${where}: "${t[1]}" is ${t[0]} px tall`);
  return r.length;
}
async function squadChecks(page, tag, w) {
  await tab(page, 'Squad');
  await page.waitForTimeout(1000);
  await health(page, `${tag} squad`);
  const list = page.locator('[data-cm-squad-list]').first();
  if (w >= 768) {
    for (const key of SORT_KEYS) {
      await page.locator(`[data-cm-sort="${key}"]`).first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(150);
      const bad = await page.evaluate(() => [...document.querySelectorAll('[data-cm-sort]')].map(b => {
        const s = b.querySelector('span'); const svg = b.querySelector('svg'); const br = b.getBoundingClientRect();
        const sr = svg ? svg.getBoundingClientRect() : null;
        return { key: b.getAttribute('data-cm-sort'), cut: s ? s.scrollWidth > s.clientWidth + 0.5 : false, word: s ? `${s.scrollWidth} of ${s.clientWidth}` : '', out: sr ? sr.right > br.right + 0.5 : false };
      }).filter(x => x.cut || x.out));
      for (const c of bad) find(`${tag} heads sorted by ${key}: ${c.key}${c.cut ? ` word cut (${c.word} px)` : ''}${c.out ? ' arrow past its head' : ''}`);
      if (key === 'ovr' || key === 'mood' || key === 'worth') await shot(page, `${tag}-heads-${key}`, list);
    }
    const nameW = await page.evaluate(() => { const b = document.querySelector('[data-cm-sort="name"]'); return b ? b.getBoundingClientRect().width : -1; });
    note(`${tag}: name column ${Math.round(nameW)} px`);
    if (nameW < 120) find(`${tag}: the name column is ${Math.round(nameW)} px, under 120`);
  } else {
    const picker = page.locator('select[aria-label="Sort squad"]:visible').first();
    for (const key of SORT_KEYS) {
      await picker.selectOption(key).catch(() => {});
      await page.waitForTimeout(80);
      await cuts(page, '[data-cm-squad-list]', `${tag} squad sorted by ${key}`);
    }
    await picker.selectOption('ovr').catch(() => {});
    await smallTaps(page, '[data-cm-squad-list]', /./, `${tag} squad`);
  }
  await cuts(page, '[data-cm-squad-list]', `${tag} squad`);
  const rows = page.locator('[data-cm-squad-row] > button');
  await rows.nth(0).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  const d = page.locator('[data-cm-squad-detail]').first();
  const lab = await d.locator('[data-cm-deal-label]').count().catch(() => 0);
  note(`${tag}: first row detail has ${lab} deal label(s)`);
  await shot(page, `${tag}-squad-open`, page.locator('[data-cm-squad-row]').first());
  await cuts(page, '[data-cm-squad-detail]', `${tag} squad detail`);
  await rows.nth(0).click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(200);
  const foot = page.locator('[data-cm-deal-note="squad"]').first();
  await foot.scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, `${tag}-squad-foot`);
}
async function deskChecks(page, tag, w) {
  const desk = page.locator('[data-contracts-desk]').first();
  await desk.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, `${tag}-desk`, desk);
  await cuts(page, '[data-contracts-desk]', `${tag} desk`);
  if (w < 768) await smallTaps(page, '[data-contracts-desk]', /^(Release|Sign|Show the other|Release him|Keep him)/, `${tag} desk`);
  /* the two lists that keep a scroller: how many whole rows show */
  const boxes = await page.evaluate(() => [...document.querySelectorAll('[data-contracts-desk] .overflow-y-auto')].map(b => {
    const br = b.getBoundingClientRect();
    const rows = [...b.children];
    const whole = rows.filter(r => { const rr = r.getBoundingClientRect(); return rr.top >= br.top - 0.5 && rr.bottom <= br.bottom + 0.5; }).length;
    return { h: Math.round(br.height), rows: rows.length, whole };
  }));
  for (const b of boxes) { note(`${tag} desk scroller ${b.h} px: ${b.whole} whole of ${b.rows} rows`); if (b.rows >= 3 && b.whole < 3) find(`${tag} desk: a scroller shows ${b.whole} whole rows of ${b.rows}`); }
  const more = page.locator('[data-cm-final-year-list] [data-cm-show-more]').first();
  if (await more.count()) {
    await more.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => {
      const b = document.querySelector('[data-cm-final-year-list] [data-cm-show-more]');
      return { y: window.scrollY, top: b.getBoundingClientRect().top, rows: document.querySelectorAll('[data-cm-final-year-list] [data-cm-final-year]').length, text: b.textContent };
    });
    await more.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    const after = await page.evaluate((n) => {
      const rows = document.querySelectorAll('[data-cm-final-year-list] [data-cm-final-year]');
      return { y: window.scrollY, rows: rows.length, top: rows[n] ? rows[n].getBoundingClientRect().top : null };
    }, before.rows);
    const said = Number((/the other (\d+)/.exec(before.text) || [])[1]);
    note(`${tag} desk: "${before.text}" with ${before.rows} rows shown, ${after.rows} after; scrollY ${before.y} to ${after.y}; first new row ${after.top === null ? 'none' : Math.round(after.top)} where the button was ${Math.round(before.top)}`);
    if (after.rows - before.rows !== said) find(`${tag} desk: "${before.text}" put ${after.rows - before.rows} rows in`);
    if (Math.abs(after.y - before.y) > 1) find(`${tag} desk: Show the other moved the page ${after.y - before.y} px`);
    if (after.top !== null && Math.abs(after.top - before.top) > 2) find(`${tag} desk: the first new row is at ${Math.round(after.top)}, the button was at ${Math.round(before.top)}`);
    await shot(page, `${tag}-desk-all`, desk);
  } else note(`${tag} desk: no Show the other on the final year list`);
  const rel = page.locator('[data-cm-release-row] button:not([disabled])').first();
  if (await rel.count()) {
    const s0 = await page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
    await rel.scrollIntoViewIfNeeded().catch(() => {});
    await rel.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
    const ok = await page.getByRole('button', { name: 'Release him' }).count();
    if (!ok) find(`${tag} desk: pressing Release did not ask Release him or Keep him`);
    await shot(page, `${tag}-desk-confirm`, page.locator('[data-cm-release-row]').filter({ has: page.getByRole('button', { name: 'Keep him' }) }).first());
    if (w < 768) await smallTaps(page, '[data-contracts-desk]', /^(Release him|Keep him)$/, `${tag} desk confirm`);
    await pressName(page, 'Keep him');
    await page.waitForTimeout(300);
    const s1 = await page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
    if (s0 !== s1) find(`${tag} desk: opening and closing a release confirm changed the save`);
  }
  await health(page, `${tag} desk`);
}
async function roomChecks(page, tag, w, reduced) {
  await tab(page, 'Home');
  await page.waitForTimeout(600);
  if (!(await pressText(page, /^🤝\s*Dressing room/))) { find(`${tag}: no Dressing room tile`); return; }
  await page.waitForTimeout(800);
  await shot(page, `${tag}-room`);
  await cuts(page, '[data-cm-roles]', `${tag} room`);
  await health(page, `${tag} room`);
  const tile = page.locator('[data-cm-rung]').first();
  await tile.hover().catch(() => {});
  await page.waitForTimeout(400);
  const tf = await tile.evaluate(e => getComputedStyle(e).transform).catch(() => 'none');
  note(`${tag} room: a hovered rung tile has transform ${tf} (reduced ${reduced})`);
  if (reduced && tf !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(tf)) find(`${tag} room: a rung tile lifts on hover under reduced motion (${tf})`);
  const hs = await page.evaluate(() => [...document.querySelectorAll('[data-cm-rung]')].map(e => Math.round(e.getBoundingClientRect().height)));
  if (new Set(hs).size > 1) find(`${tag} room: rung tiles are ${hs.join(', ')} px tall`);
  for (const rung of await page.evaluate(() => [...document.querySelectorAll('[data-cm-rung]')].map(e => e.getAttribute('data-cm-rung')))) {
    await page.locator(`[data-cm-rung="${rung}"]`).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    const n = await page.locator('[data-cm-room-row]').count();
    if (!n) { await page.locator('[data-cm-room-back="rung"]').first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(300); continue; }
    await cuts(page, '[data-cm-roles]', `${tag} rung ${rung}`);
    if (w < 768) await smallTaps(page, '[data-cm-roles]', /./, `${tag} rung ${rung}`);
    await shot(page, `${tag}-rung`);
    await page.locator('[data-cm-room-row]').first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, `${tag}-room-player`);
    await cuts(page, '[data-cm-roles]', `${tag} room player`);
    if (w < 768) await smallTaps(page, '[data-cm-roles]', /./, `${tag} room player`);
    const lab = await page.locator('[data-cm-room-player] [data-cm-deal-label]').count();
    note(`${tag} room player: ${lab} label(s), "${(await page.locator('[data-cm-room-player]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 90)}"`);
    const anim = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
    if (reduced && anim) find(`${tag} room player: ${anim} animations running under reduced motion`);
    await page.locator('[data-cm-room-back="player"]').first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.locator('[data-cm-room-back="rung"]').first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
    break;
  }
}
async function managerChecks(page, tag, w) {
  await pressName(page, 'Club home');
  await page.waitForTimeout(500);
  if (!(await pressText(page, /^🧢\s*Manager/))) { find(`${tag}: no Manager tile`); return; }
  await page.waitForTimeout(800);
  const card = page.locator('[data-cm-career-card]').first();
  await card.scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, `${tag}-manager`, card);
  await cuts(page, '[data-cm-career-card]', `${tag} career card`);
  if (w < 768) await smallTaps(page, '[data-cm-career-card]', /./, `${tag} career card`);
  const line = (await page.locator('[data-cm-worst-defeat]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  note(`${tag} career card: "${line}"`);
  await health(page, `${tag} manager`);
  await pressName(page, 'Club home');
  await page.waitForTimeout(400);
  return line;
}
/* Every squad row opened: a label exactly on the men the page itself marks real (no "(Youth)", no MADE UP tag). */
async function labelTruth(page, tag) {
  await tab(page, 'Squad');
  await page.waitForTimeout(800);
  const n = await page.locator('[data-cm-squad-row] > button').count();
  for (let i = 0; i < n; i++) {
    const b = page.locator('[data-cm-squad-row] > button').nth(i);
    if ((await b.getAttribute('aria-expanded')) !== 'true') await b.click({ timeout: 2000 }).catch(() => {});
  }
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => [...document.querySelectorAll('[data-cm-squad-row]')].map(row => {
    const t = row.querySelector(':scope > button')?.textContent || '';
    const d = row.querySelector('[data-cm-squad-detail]');
    return { name: t.slice(0, 40), youth: /\(Youth\)/.test(t), madeUp: /MADE UP/i.test(t), opened: !!d, label: !!(d && d.querySelector('[data-cm-deal-label]')) };
  }));
  let real = 0; let fake = 0;
  for (const x of r) {
    if (!x.opened) { find(`${tag}: row "${x.name}" did not open`); continue; }
    const isReal = !x.youth && !x.madeUp;
    if (isReal) real += 1; else fake += 1;
    if (x.label !== isReal) find(`${tag}: "${x.name}" (${isReal ? 'real' : 'made up'}) ${x.label ? 'carries' : 'lacks'} the deal label`);
  }
  note(`${tag}: ${r.length} rows opened, ${real} read as real, ${fake} as made up`);
  await shot(page, `${tag}-squad-all-open`);
}
async function quickSims(page, k) {
  let sims = 0;
  for (let i = 0; i < k; i++) {
    for (let tries = 0; tries < 8; tries++) {
      const quick = page.locator('[data-cm-way="quick"]:visible').first();
      if (await quick.count()) { await quick.click({ timeout: 3000 }).catch(() => {}); sims += 1; await page.waitForTimeout(2500); break; }
      const ways = /^(Continue|Carry on|Next|Done|OK|Close the window|Shut the window|Back to club|Club home)$/i;
      const moved = (await page.getByRole('button', { name: ways }).first().click({ timeout: 1500 }).then(() => true).catch(() => false)) || (await pressText(page, ways, 1500));
      if (!moved && !(await tab(page, 'Home'))) break;
      await page.waitForTimeout(900);
    }
  }
  return sims;
}
/* Read only presses, the same on both builds (no Show the other: it exists only on the head). */
async function viewWalk(page) {
  const steps = [];
  steps.push(await tab(page, 'Squad'));
  await page.waitForTimeout(800);
  const rows = page.locator('[data-cm-squad-row] > button');
  for (let i = 0; i < 3; i++) { await rows.nth(i).click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(150); await rows.nth(i).click({ timeout: 2000 }).catch(() => {}); }
  await page.locator('[data-contracts-desk]').scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(300);
  steps.push(await tab(page, 'Home'));
  await page.waitForTimeout(500);
  steps.push(await pressText(page, /^🤝\s*Dressing room/));
  await page.waitForTimeout(600);
  const tile = page.locator('button:visible').filter({ hasText: /\d+ players?/ }).first();
  steps.push(await tile.click({ timeout: 2500 }).then(() => true).catch(() => false));
  await page.waitForTimeout(400);
  const man = page.locator('button:visible').filter({ hasText: /in last \d+|No games yet/ }).first();
  steps.push(await man.click({ timeout: 2000 }).then(() => true).catch(() => false));
  await page.waitForTimeout(400);
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: /^(Star man|Key first teamer|Rotation option|Backup|One for the future|The dressing room)$/ }).first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  steps.push(await pressName(page, 'Club home'));
  await page.waitForTimeout(400);
  steps.push(await pressText(page, /^🧢\s*Manager/));
  await page.waitForTimeout(600);
  steps.push(await pressName(page, 'Club home'));
  await page.waitForTimeout(800);
  return steps.map(s => (s ? 'ok' : 'MISSED')).join(',');
}

const SECTION = process.env.RW_SECTION || 'all';
const browser = await chromium.launch();
try {
  if (SECTION === 'all' || SECTION === 'A') {
    console.log('A: Liverpool 2026-27 new career, the four screens at four sizes');
    for (const [w, h, reduced] of [[390, 844, true], [1280, 900, false], [320, 640, true], [768, 1024, false], [390, 844, false]]) {
      const tag = `liv-${w}${reduced ? '-rm' : ''}`;
      const { ctx, page, errors } = await open(browser, HEAD, { w, h, reduced });
      try {
        await newClub(page, 'Liverpool');
        await shot(page, `${tag}-hub`);
        await squadChecks(page, tag, w);
        await deskChecks(page, tag, w);
        await roomChecks(page, tag, w, reduced);
        await managerChecks(page, tag, w);
        if (w === 390 && reduced) await labelTruth(page, tag);
      } catch (e) { find(`${tag}: the walk threw ${String(e).slice(0, 160)}`); }
      if (errors.length) find(`${tag}: page error ${errors[0]}`);
      await ctx.close();
    }
  }
  if (SECTION === 'all' || SECTION === 'B') {
    console.log('B: the four committed old saves resumed on this build');
    const want = { everton: '1-5 vs Newcastle', hertha: '2-3 vs Nürnberg', sevilla: '0-3 vs Atlético Madrid' };
    for (const [name, file] of Object.entries(FIXTURES)) {
      for (const [w, h, reduced] of [[320, 640, true], [1280, 900, false]]) {
        const tag = `${name}-${w}`;
        const raw = fs.readFileSync(path.join(ROOT, file), 'utf8');
        const { ctx, page, errors } = await open(browser, HEAD, { w, h, reduced, save: raw });
        try {
          await resume(page);
          await shot(page, `${tag}-hub`);
          await labelTruth(page, tag);
          await deskChecks(page, tag, w);
          await roomChecks(page, tag, w, reduced);
          const line = await managerChecks(page, tag, w);
          if (want[name] && !(line || '').includes(want[name])) find(`${tag}: the worst defeat reads "${line}", not "${want[name]}"`);
        } catch (e) { find(`${tag}: the walk threw ${String(e).slice(0, 160)}`); }
        if (errors.length) find(`${tag}: page error ${errors[0]}`);
        await ctx.close();
      }
    }
  }
  if ((SECTION === 'all' || SECTION === 'C') && BASEURL) {
    console.log(`C: saves made by the base build (${BASEURL}) loaded on both builds, read only presses, byte equal`);
    const saves = {};
    {
      const { ctx, page } = await open(browser, BASEURL, { w: 390, h: 844, seed: 7 });
      await newClub(page, 'Liverpool');
      const sims = await quickSims(page, 4);
      saves['base-made Liverpool'] = await page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
      note(`C: the base build played Liverpool ${sims} Quick Sims, save ${saves['base-made Liverpool'] ? saves['base-made Liverpool'].length : 0} chars`);
      await ctx.close();
    }
    {
      const { ctx, page } = await open(browser, BASEURL, { w: 390, h: 844, seed: 8 });
      await newClub(page, 'Dundee', 'Premiership', 'Scotland');
      const sims = await quickSims(page, 2);
      saves['base-made Dundee'] = await page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
      note(`C: the base build played Dundee ${sims} Quick Sims, save ${saves['base-made Dundee'] ? saves['base-made Dundee'].length : 0} chars`);
      await ctx.close();
    }
    for (const [name, file] of Object.entries(FIXTURES)) saves[name] = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const [name, raw] of Object.entries(saves)) {
      if (!raw) { find(`C ${name}: the base build wrote no save`); continue; }
      const got = {};
      for (const [which, url] of [['base', BASEURL], ['head', HEAD]]) {
        const { ctx, page, errors } = await open(browser, url, { w: 390, h: 844, seed: 11, save: raw });
        await resume(page);
        const steps = await viewWalk(page);
        got[which] = { save: await page.evaluate(k => localStorage.getItem(k), SAVE_KEY), draws: await page.evaluate(() => window.__draws()), steps, errors };
        await ctx.close();
      }
      const b = got.base; const hd = got.head;
      const same = b.save === hd.save;
      console.log(`   C ${name}: steps base ${b.steps} head ${hd.steps}; draws ${b.draws} and ${hd.draws}; save ${b.save ? b.save.length : 0} and ${hd.save ? hd.save.length : 0} chars, ${same ? 'byte equal' : 'DIFFERENT'}; loaded save ${raw === hd.save ? 'unchanged' : 'rewritten on load'}`);
      if (!same) find(`C ${name}: the save after the same read only presses differs between base and head`);
      if (b.draws !== hd.draws) find(`C ${name}: ${b.draws} draws on the base, ${hd.draws} on the head`);
      if (b.steps !== hd.steps) find(`C ${name}: the walks took different steps`);
      if (hd.errors.length) find(`C ${name}: page error on the head ${hd.errors[0]}`);
    }
  }
  if (SECTION === 'D') {
    console.log('D: the granted release clauses list with five clauses, collapsed and opened, on the real page');
    const save = JSON.parse(fs.readFileSync(path.join(ROOT, FIXTURES.everton), 'utf8'));
    let k = 0;
    for (const p of save.squad) { if (!p.onLoan && k < 5) { p.releaseClause = 20 + k; k += 1; } }
    for (const [w, h, reduced] of [[320, 640, true], [390, 844, false], [1280, 900, false]]) {
      const tag = `clauses-${w}`;
      const { ctx, page, errors } = await open(browser, HEAD, { w, h, reduced, save: JSON.stringify(save) });
      try {
        await resume(page);
        await tab(page, 'Squad');
        await page.waitForTimeout(900);
        const box = page.locator('[data-contract-clauses]').first();
        if (!(await box.count())) { find(`${tag}: no granted clauses list`); continue; }
        await box.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(300);
        const act = await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}.${a.className} "${(a.textContent || '').slice(0, 30)}" focus-visible ${a.matches(':focus-visible')}` : 'none'; });
        note(`${tag}: focused element before the shot: ${act}`);
        const rowsNow = () => page.evaluate(() => document.querySelector('[data-contract-clauses]').querySelectorAll(':scope > div:not([data-cm-show-more])').length);
        const r0 = await rowsNow();
        const more = box.locator('[data-cm-show-more]').first();
        const text = (await more.textContent().catch(() => '')) || '';
        note(`${tag}: ${r0} clause rows shown, button "${text}"`);
        if (r0 !== 3) find(`${tag}: ${r0} clause rows shown before the press, not 3`);
        if (!/Show the other 2$/.test(text.trim())) find(`${tag}: the clause button reads "${text}"`);
        await shot(page, `${tag}-collapsed`, page.locator('[data-contracts-desk]').first());
        if (w < 768) await smallTaps(page, '[data-contract-clauses]', /^Show the other/, tag);
        const before = await page.evaluate(() => ({ y: window.scrollY, top: document.querySelector('[data-contract-clauses] [data-cm-show-more]').getBoundingClientRect().top }));
        await more.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(400);
        const r1 = await rowsNow();
        const after = await page.evaluate(() => { const rows = document.querySelector('[data-contract-clauses]').querySelectorAll(':scope > div'); return { y: window.scrollY, top: rows[3] ? rows[3].getBoundingClientRect().top : null }; });
        note(`${tag}: ${r1} clause rows after, scrollY ${before.y} to ${after.y}, row 4 at ${after.top === null ? 'none' : Math.round(after.top)} where the button was ${Math.round(before.top)}`);
        if (r1 !== 5) find(`${tag}: ${r1} clause rows after the press, not 5`);
        if (Math.abs(after.y - before.y) > 1) find(`${tag}: the press moved the page ${after.y - before.y} px`);
        if (after.top !== null && Math.abs(after.top - before.top) > 2) find(`${tag}: row 4 at ${Math.round(after.top)}, the button was at ${Math.round(before.top)}`);
        await cuts(page, '[data-contract-clauses]', tag);
        await health(page, tag);
        await shot(page, `${tag}-open`, page.locator('[data-contracts-desk]').first());
      } catch (e) { find(`${tag}: the walk threw ${String(e).slice(0, 160)}`); }
      if (errors.length) find(`${tag}: page error ${errors[0]}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(OUT, `walk1325-${SECTION}.json`), JSON.stringify({ findings, notes }, null, 1));
console.log(findings.length ? `WALK1325: ${findings.length} findings` : 'WALK1325: green, no findings');
process.exit(findings.length ? 1 : 0);

