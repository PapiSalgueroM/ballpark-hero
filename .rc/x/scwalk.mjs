/* QA hunt walk for Soccer Career (qa-sc). Plays the real UI like a player.
   Env: TAG W H SEED SENIOR POS NAT ERA MAXMIN EXPLORE(hub,phone,train,week) INJECT RELOADS SHOTMAX */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pw = (await import(pathToFileURL(path.resolve('scripts/lib/playwrightLoader.mjs')).href)).default;
const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx/out';
fs.mkdirSync(OUT, { recursive: true });
const TAG = process.env.TAG || 'w';
const W = Number(process.env.W || 390), H = Number(process.env.H || 844);
const SEED = Number(process.env.SEED || 777);
const SENIOR = Number(process.env.SENIOR || 4);
const POS = process.env.POS || 'Striker';
const NAT = process.env.NAT || 'England';
const ERA = process.env.ERA || 'Current era';
const MAXMS = Number(process.env.MAXMIN || 16) * 60000;
const EXPLORE = new Set((process.env.EXPLORE || 'hub').split(',').filter(Boolean));
const INJECT = process.env.INJECT || '';
const RELOADS = new Set((process.env.RELOADS || '').split(',').filter(Boolean).map(Number));
const SHOTMAX = Number(process.env.SHOTMAX || 70);
const EXPLORE_EVERY = Number(process.env.EXPLORE_EVERY || 1);
const T0 = Date.now();
const mobile = W < 768;

const log = { tag: TAG, W, H, SEED, POS, NAT, ERA, steps: [], audits: [], explore: [], reloads: [], errors: [], pageErrors: [], failedRequests: [], events: [], stuck: [], notes: [], shots: [], scroll: [] };
let shots = 0;
const flush = () => fs.writeFileSync(path.join(OUT, `${TAG}-log.json`), JSON.stringify(log, null, 1));
const say = m => { console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s] ${m}`); };

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
let injectBody = INJECT ? fs.readFileSync(INJECT, 'utf8') : null;
await ctx.addInitScript(([s, inj, cur]) => {
  let t = s >>> 0;
  Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  try { localStorage.setItem('cookie-consent', 'essential'); } catch {}
  try { if (cur && !sessionStorage.getItem('qa-cur')) { localStorage.setItem('dukb-soccer-currency', cur); sessionStorage.setItem('qa-cur', '1'); } } catch {}
  try { if (inj && !sessionStorage.getItem('qa-injected')) { localStorage.setItem('soccerCareerSave', inj); sessionStorage.setItem('qa-injected', '1'); } } catch {}
}, [SEED, injectBody, process.env.CURRENCY || '']);
const page = await ctx.newPage();
await page.route(/supabase\.co/, r => r.abort());
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log.errors.push({ t: m.type(), at: log.steps.length, text: m.text().slice(0, 300) }); });
page.on('pageerror', e => log.pageErrors.push({ at: log.steps.length, text: String(e).slice(0, 400) }));
page.on('requestfailed', r => { if (!/supabase\.co|google|doubleclick|adsbygoogle|gstatic|flagcdn/.test(r.url())) log.failedRequests.push(r.url().slice(0, 200)); });

let rng = (SEED * 9301 + 49297) % 233280;
const rand = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };
const pick = arr => arr[Math.floor(rand() * arr.length)];
const sleep = ms => page.waitForTimeout(ms);

async function shot(name, opts = {}) {
  if (shots >= SHOTMAX && !opts.force) return null;
  shots++;
  const f = `${TAG}-${String(shots).padStart(3, '0')}-${name.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 50)}.jpg`;
  try { await page.screenshot({ path: path.join(OUT, f), type: 'jpeg', quality: opts.q || 50, fullPage: !!opts.full }); log.shots.push(f); return f; } catch (e) { return null; }
}
const save = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('soccerCareerSave') || 'null'); } catch { return null; } });
const saveRaw = () => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
const seniorCount = s => (s?.seasons || []).filter(r => r.type === 'playing').length;

async function audit(label) {
  const a = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth;
    const txt = document.body.innerText || '';
    const bad = [];
    for (const line of txt.split('\n')) if (/\b(undefined|NaN|Infinity)\b|\[object Object\]|\bnull\b/.test(line)) bad.push(line.trim().slice(0, 160));
    const off = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1.5 || r.left < -1.5) {
        let clipped = false;
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { clipped = true; break; } }
        if (!clipped && getComputedStyle(el).position !== 'fixed') off.push({ tag: el.tagName, cls: String(el.className).slice(0, 70), text: (el.innerText || '').trim().slice(0, 50), l: Math.round(r.left), r: Math.round(r.right) });
      }
    }
    const trunc = [];
    for (const el of document.querySelectorAll('main *')) {
      if (el.children.length > 1) continue;
      const s = getComputedStyle(el);
      if (el.scrollWidth > el.clientWidth + 2 && (s.overflowX === 'hidden' || s.overflow === 'hidden') && (el.innerText || '').trim().length > 3) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.bottom > 0 && r.top < innerHeight) trunc.push({ text: el.innerText.trim().slice(0, 70), w: Math.round(r.width), need: el.scrollWidth, ell: s.textOverflow });
      }
    }
    const small = [];
    for (const b of document.querySelectorAll('main button, [role=dialog] button')) {
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.top > innerHeight || r.bottom < 0) continue;
      if (r.height < 32 || r.width < 32) small.push({ text: (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
    }
    const covered = [];
    for (const b of document.querySelectorAll('main button, [role=dialog] button')) {
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.top < 0 || r.bottom > innerHeight) continue;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit && hit !== b && !b.contains(hit)) covered.push({ text: (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 40), by: (hit.innerText || hit.getAttribute('aria-label') || hit.tagName).trim().slice(0, 40), byCls: String(hit.className).slice(0, 50) });
    }
    return { vw, sw, overflow: sw > vw + 1, bad: [...new Set(bad)].slice(0, 8), off: off.slice(0, 6), trunc: trunc.slice(0, 8), small: small.slice(0, 8), covered: covered.slice(0, 6), boundary: /Something went wrong|went wrong on this page|could not open/i.test(txt) };
  });
  const interesting = a.overflow || a.bad.length || a.off.length || a.trunc.length || a.covered.length || a.boundary || a.small.length;
  if (interesting) log.audits.push({ label, step: log.steps.length, ...a });
  return a;
}

const SKIP = /^(🚪 )?Retire$|New Career|Report a bug|Light mode|Dark mode|Sound|Cookie|Sign up|Sign in|Essential only|Accept all|Share|Hang Up the Boots|Retire from|Sell Club|Walk Away|Copy|Log in/i;

async function candidates(scope) {
  return page.evaluate(([scopeSel, skipSrc]) => {
    const skip = new RegExp(skipSrc, 'i');
    document.querySelectorAll('[data-qa-idx]').forEach(e => e.removeAttribute('data-qa-idx'));
    const root = scopeSel ? document.querySelector(scopeSel) : document;
    if (!root) return [];
    const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
    const out = [];
    [...root.querySelectorAll('button, [role=button], a[href^="#"]')].forEach((b, i) => {
      if (b.disabled || b.getAttribute('aria-disabled') === 'true' || !vis(b)) return;
      const text = (b.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 70);
      const aria = b.getAttribute('aria-label') || '';
      if (skip.test(text) || skip.test(aria)) return;
      const attrs = [...b.attributes].map(a => a.name).filter(n => n.startsWith('data-')).join(' ');
      b.setAttribute('data-qa-idx', String(i));
      out.push({ i, text: text || aria, aria, attrs });
    });
    return out;
  }, [scope || null, SKIP.source]);
}

async function clickIdx(c, why) {
  const loc = page.locator(`[data-qa-idx="${c.i}"]`).first();
  try { await loc.click({ timeout: 3500 }); return true; }
  catch (e) {
    log.notes.push({ step: log.steps.length, kind: 'click-failed', text: c.text, why, err: String(e).split('\n').slice(0, 3).join(' ').slice(0, 300) });
    try { await loc.evaluate(el => el.click()); return true; } catch { return false; }
  }
}

/* ---------- hub helpers ---------- */
async function atHub() {
  return page.evaluate(() => {
    const bar = document.querySelector('[data-career-action-bar]');
    if (!bar) return false;
    const b = [...bar.querySelectorAll('button')].find(x => /^(Next Season|Next Year)/.test((x.innerText || '').trim()));
    if (!b) return false;
    if (document.querySelector('[aria-modal="true"],[role="dialog"],[role="alertdialog"]')) return false;
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (hit === b || b.contains(hit));
  });
}
async function closeAll(name) {
  const tried = [];
  for (let k = 0; k < 5; k++) {
    if (await atHub()) return { ok: true, tried };
    const closed = await page.evaluate(() => {
      const dlg = [...document.querySelectorAll('[aria-modal="true"],[role="dialog"],[role="alertdialog"]')].pop() || document.querySelector('main');
      const btns = [...dlg.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      const re = /^(close|done|back to your career|back to career|back|‹ ?back|‹ ?home|‹ ?drills|×|✕|hub|‹|← back|cancel|not now|keep it)$/i;
      const b = btns.find(b => re.test((b.innerText || '').trim())) || btns.find(b => /close|back|dismiss/i.test(b.getAttribute('aria-label') || ''));
      if (b) { b.click(); return (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 30); }
      return null;
    });
    tried.push(closed || 'Escape');
    if (!closed) await page.keyboard.press('Escape');
    await sleep(600);
  }
  return { ok: await atHub(), tried };
}
async function markOpener(sel) {
  return page.evaluate(sel => {
    document.querySelectorAll('[data-qa-open]').forEach(e => e.removeAttribute('data-qa-open'));
    let el = sel.startsWith('text=') ? [...document.querySelectorAll('main button')].find(b => (b.innerText || '').includes(sel.slice(5))) : document.querySelector(sel);
    if (!el) return null;
    if (el.tagName !== 'BUTTON' && el.getAttribute('role') !== 'button') el = el.querySelector('button') || el;
    el.setAttribute('data-qa-open', '1');
    return (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  }, sel);
}
async function dlgText() {
  return page.evaluate(() => { const d = [...document.querySelectorAll('[aria-modal="true"],[role="dialog"],[role="alertdialog"]')].pop(); return d ? (d.innerText || '').replace(/\s+/g, ' ').slice(0, 500) : null; });
}
async function clickInDialog(sel, n = 1) {
  return page.evaluate(([sel, n]) => {
    const d = [...document.querySelectorAll('[aria-modal="true"],[role="dialog"],[role="alertdialog"]')].pop() || document;
    const els = [...d.querySelectorAll(sel)].filter(b => !b.disabled && b.getBoundingClientRect().width > 0);
    if (!els.length) return null;
    const el = els[Math.min(n, els.length - 1)];
    el.click();
    return (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  }, [sel, n]);
}

async function explore(opener, name, interact) {
  if (Date.now() - T0 > MAXMS - 60000) return;
  if (!(await atHub())) { const c = await closeAll('pre-' + name); if (!c.ok) return; }
  const label = await markOpener(opener);
  const rec = { name, season: seniorCount(await save()), label, step: log.steps.length };
  if (label === null) { rec.missing = true; log.explore.push(rec); return; }
  try { await page.locator('[data-qa-open]').first().scrollIntoViewIfNeeded({ timeout: 2000 }); await sleep(300); } catch {}
  const y0 = await page.evaluate(() => scrollY);
  const before = await saveRaw();
  try { await page.locator('[data-qa-open]').first().click({ timeout: 3500 }); }
  catch (e) { rec.clickErr = String(e).split('\n').slice(0, 2).join(' ').slice(0, 240); try { await page.locator('[data-qa-open]').first().evaluate(el => el.click()); } catch {} }
  await sleep(900);
  rec.opened = await dlgText();
  rec.shot = await shot(`${name}`);
  rec.audit = await audit(`open ${name}`);
  if (interact) { try { rec.interact = await interact(rec); } catch (e) { rec.interactErr = String(e).slice(0, 240); } }
  const c = await closeAll(name);
  rec.closed = c;
  const y1 = await page.evaluate(() => scrollY);
  rec.scroll = { y0: Math.round(y0), y1: Math.round(y1) };
  rec.saveChanged = before !== (await saveRaw());
  if (!c.ok) {
    rec.trap = true;
    rec.trapShot = await shot(`TRAP-${name}`, { force: true });
    await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(2500);
    rec.afterReloadHub = await atHub();
  }
  log.explore.push(rec);
  say(`explore ${name}: ${label} -> closed ${c.ok} via ${c.tried.join('/')} scroll ${rec.scroll.y0}->${rec.scroll.y1}`);
}

async function exploreHub(season) {
  await shot(`hub-s${season}-top`);
  if (season === 0 || season === 2) await shot(`hub-s${season}-full`, { full: true, q: 35 });
  await explore('[data-season-ambition]', `ambition-s${season}`, async rec => {
    const picked = await clickInDialog('[data-ambition-option]', Math.floor(rand() * 3)); await sleep(500);
    rec.afterPick = await dlgText(); await shot(`ambition-picked-s${season}`); return picked;
  });
  await explore('[data-preseason-plan]', `preseason-s${season}`, async rec => {
    const picked = await clickInDialog('[data-preparation-option]', Math.floor(rand() * 3)); await sleep(500);
    rec.afterPick = await dlgText(); return picked;
  });
  if (season <= 1 || season % 2 === 0) {
    await explore('[data-squad-tile]', `squad-s${season}`);
    await explore('[data-press-room-open]', `press-s${season}`, async rec => {
      const out = [];
      const st = await clickInDialog('[data-press-start]', 0); out.push('start:' + st); await sleep(700);
      for (let q = 0; q < 6; q++) {
        const a = await clickInDialog('[data-press-answer]', Math.floor(rand() * 3)); if (!a) break; out.push(a); await sleep(800);
        if (q === 0) await shot(`press-q-s${season}`);
      }
      rec.end = await dlgText(); await shot(`press-end-s${season}`); return out;
    });
    await explore('[data-soccer-programme-open]', `programme-s${season}`, async rec => {
      const t = await clickInDialog('[data-programme-tile]', Math.floor(rand() * 4)); await sleep(600);
      await shot(`programme-tile-s${season}`); rec.tileText = await dlgText();
      const o = await clickInDialog('[data-programme-option]', 0); await sleep(600);
      rec.optText = await dlgText(); await shot(`programme-opt-s${season}`); return [t, o];
    });
  }
  if (season <= 1) {
    await explore('[data-career-mentor-tile]', `mentor-s${season}`);
    await explore('[data-career-records-tile]', `records-s${season}`);
    await explore('text=Full attributes', `attributes-s${season}`);
    await explore('[data-open-season-ratings]', `ratings-s${season}`);
    await explore('[data-open-career-story]', `story-s${season}`);
    await explore('[data-trophy-category="league"]', `trophy-s${season}`);
    await explore('[data-open-season-replays]', `replays-s${season}`);
  }
  if (EXPLORE.has('train')) await explore('[data-career-utility="training"]', `training-s${season}`, async rec => {
    await shot(`training-menu-s${season}`);
    const d = await page.evaluate(() => { const d = [...document.querySelectorAll('[aria-modal="true"],[role="dialog"],[role="alertdialog"]')].pop() || document; const b = [...d.querySelectorAll('button')].find(b => /Penalt|Shot stopping/i.test(b.innerText || '')); if (b) { b.click(); return b.innerText.trim().slice(0, 40); } return null; });
    await sleep(800);
    for (let k = 0; k < 6 && d; k++) { const z = await clickInDialog('[data-training-zone]', Math.floor(rand() * 6)); if (!z) break; await sleep(1500); }
    await sleep(800); await shot(`training-result-s${season}`);
    rec.result = await dlgText();
    const bank = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /Bank the session/.test(b.innerText || '')); if (b) { b.click(); return true; } return false; });
    await sleep(800);
    return { drill: d, bank };
  });
  if (EXPLORE.has('phone')) await explorePhone(season);
}

async function explorePhone(season) {
  await explore('[data-career-utility="phone"]', `phone-s${season}`, async rec => {
    const apps = await page.evaluate(() => [...document.querySelectorAll('[data-phone-app]')].map(b => b.getAttribute('data-phone-app')));
    rec.apps = [];
    for (const id of apps) {
      await page.evaluate(id => document.querySelector(`[data-phone-app="${id}"]`)?.click(), id); await sleep(700);
      const r = { id, text: (await dlgText() || '').slice(0, 300) };
      r.shot = await shot(`phone-${id}-s${season}`);
      r.audit = await audit(`phone ${id}`);
      if (id === 'shop') {
        const nw0 = (await save())?.netWorth;
        const cat = await page.evaluate(() => { const d = [...document.querySelectorAll('[aria-modal="true"],[role="dialog"]')].pop(); const b = [...d.querySelectorAll('button')].filter(b => !/Home|Back|away|‹/.test(b.innerText) && b.getBoundingClientRect().width > 0); const pick = b[Math.min(1, b.length - 1)]; if (pick) { pick.click(); return pick.innerText.trim().slice(0, 40); } return null; });
        await sleep(700); r.cat = cat; r.catShot = await shot('phone-shopcat-s' + season);
        const buy = await page.evaluate(() => { const d = [...document.querySelectorAll('[aria-modal="true"],[role="dialog"]')].pop(); const b = [...d.querySelectorAll('button')].filter(b => !b.disabled && /^(€|£|\$|Hire)/.test(b.innerText.trim())); if (b[0]) { const card = b[0].closest('div.rounded-xl'); const t = card ? card.innerText.replace(/\s+/g, ' ').slice(0, 200) : ''; b[0].click(); return t; } return null; });
        await sleep(800); r.bought = buy; const s1 = await save(); r.nw = [nw0, s1?.netWorth]; r.buyShot = await shot('phone-bought-s' + season);
        await page.evaluate(() => document.querySelector('[data-phone-back]')?.click()); await sleep(400);
      }
      if (id === 'messages' || id === 'bank' || id === 'contacts' || id === 'market') {
        const btns = await candidates('[aria-modal="true"],[role="dialog"],[role="alertdialog"]');
        r.buttons = btns.map(b => b.text).slice(0, 25);
        const act = btns.filter(b => !/back|home|close|‹|put phone away/i.test(b.text + b.aria));
        if (act.length) { const c = pick(act); await clickIdx(c, 'phone ' + id); r.clicked = c.text; await sleep(800); r.after = (await dlgText() || '').slice(0, 300); r.shot2 = await shot(`phone-${id}-act-s${season}`); }
      }
      rec.apps.push(r);
      for (let k = 0; k < 3; k++) { const back = await page.evaluate(() => { const b = document.querySelector('[data-phone-back]'); if (b) { b.click(); return true; } return false; }); if (!back) break; await sleep(400); }
    }
    return apps.length;
  });
}

/* ---------- creation ---------- */
async function pickCombo(triggerText, wanted) {
  const trigger = page.locator('[role="combobox"]', { hasText: triggerText }).first();
  await trigger.click();
  await page.waitForSelector('[role="option"]', { timeout: 8000 });
  const chosen = await page.evaluate(w => {
    const opts = [...document.querySelectorAll('[role="option"]')];
    const hit = opts.find(o => o.textContent.includes(w)) || opts[0];
    hit.scrollIntoView(); hit.click();
    return hit.textContent.trim();
  }, wanted);
  await sleep(400);
  return chosen;
}
async function createCareer() {
  await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[placeholder*="player name"]', { timeout: 20000 });
  await sleep(800);
  await shot('create-empty');
  await audit('create-empty');
  await page.fill('input[placeholder*="player name"]', process.env.PNAME || 'Danny Okafor-Whitfield');
  const nat = await pickCombo('Choose nationality', NAT);
  const pos = await pickCombo('Choose position', POS);
  const era = await pickCombo('Choose era', ERA);
  await page.getByRole('button', { name: /Generate Starting Potential/ }).click();
  await sleep(3200);
  await shot('create-rolled');
  await audit('create-rolled');
  await shot('create-rolled-full', { full: true, q: 35 });
  await page.getByRole('button', { name: /Begin Career/ }).scrollIntoViewIfNeeded();
  const yBegin = await page.evaluate(() => ({ y: Math.round(scrollY), docH: document.documentElement.scrollHeight }));
  await page.getByRole('button', { name: /Begin Career/ }).click();
  await sleep(2200);
  log.landing = { atBegin: yBegin, after: await page.evaluate(() => { const h = document.querySelector('main h1'); const r = h ? h.getBoundingClientRect() : null; const bar = document.querySelector('[data-career-action-bar]'); return { y: Math.round(scrollY), docH: document.documentElement.scrollHeight, nameTop: r ? Math.round(r.top) : null, nameText: h ? h.innerText : null, innerH: innerHeight, firstVisibleHeading: [...document.querySelectorAll('h1,h2,h3,span.uppercase')].find(e => { const q = e.getBoundingClientRect(); return q.top >= 0 && q.top < innerHeight; })?.innerText?.slice(0, 60) }; }) };
  await shot('landing-after-begin', { force: true });
  const s = await save();
  log.created = { nat, pos, era, phase: s?.phase, age: s?.age, club: s?.currentClub, ovr: s?.overall, pot: s?.potential };
  say(`created ${nat}/${pos}/${era} -> ${s?.phase} age ${s?.age} at ${s?.currentClub}`);
}

/* ---------- decision policy ---------- */
const ADV = ['Sign contract', 'Review contract', 'Join Club', 'Leave on free transfer', 'Continue at', 'Not Done Yet', 'Cry through', 'Continue', 'Next', 'Done', 'Close', 'Accept', 'Confirm', 'Proceed', 'Stay at'];
const TILE_ATTR = /data-press-room-open|data-soccer-programme-open|data-squad-tile|data-career-mentor-tile|data-career-records-tile|data-season-ambition|data-preseason-plan|data-farewell-open|data-trophy-category|data-open-|data-career-utility|data-watch-week-by-week/;
const REVEAL = 'main [class*="md:order-2"] > div';

async function decide(phase, s) {
  const modal = await page.evaluate(() => !!document.querySelector('[aria-modal="true"],[role="dialog"],[role="alertdialog"]'));
  let cands = await candidates(modal ? '[aria-modal="true"],[role="dialog"],[role="alertdialog"]' : REVEAL);
  if (!modal) cands = cands.filter(c => !TILE_ATTR.test(c.attrs) && !/^Full attributes/.test(c.text));
  if (!cands.length && !modal) { await sleep(1500); return { action: 'WAIT', options: [] }; }
  if (!cands.length) return { action: 'NONE', options: [] };
  let choice = null;
  const useAdv = rand() < (modal ? 0.6 : 0.35);
  if (useAdv) for (const a of ADV) { choice = cands.find(c => c.text.startsWith(a)); if (choice) break; }
  if (!choice) choice = pick(cands);
  const ok = await clickIdx(choice, phase);
  return { action: choice.text, options: cands.map(c => c.text.slice(0, 40)), ok, modal };
}

function captureEvent(phase, s) {
  const age = s?.age;
  try {
    if (phase === 'random_events' && s.pendingEvents?.length) log.events.push({ phase, age, ev: JSON.stringify(s.pendingEvents[0]).slice(0, 600) });
    else if (phase === 'newspaper' && s.pendingNews?.length) log.events.push({ phase, age, ev: JSON.stringify(s.pendingNews.map(n => n.headline || n.title || n)).slice(0, 600) });
    else if (phase === 'moral_dilemma') log.events.push({ phase, age, ev: JSON.stringify(s.pendingMoralDilemma || s.moralDilemma || null).slice(0, 600) });
    else if (phase === 'rivalry_event') log.events.push({ phase, age, ev: JSON.stringify(s.pendingRivalryEvent).slice(0, 400) });
    else if (phase === 'social_media_action') log.events.push({ phase, age, ev: 'social' });
  } catch {}
}

async function doReload(why) {
  const before = await saveRaw();
  const b = JSON.parse(before || 'null');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(2600);
  const after = await saveRaw();
  const a = JSON.parse(after || 'null');
  const rec = { why, step: log.steps.length, same: before === after, phaseBefore: b?.phase, phaseAfter: a?.phase, lenBefore: before?.length, lenAfter: after?.length };
  if (!rec.same && b && a) rec.diffKeys = Object.keys({ ...b, ...a }).filter(k => JSON.stringify(b[k]) !== JSON.stringify(a[k])).slice(0, 20);
  rec.shot = await shot(`reload-${b?.phase}`);
  rec.audit = await audit('after reload');
  rec.uiPhaseText = await page.evaluate(() => (document.querySelector('main')?.innerText || '').replace(/\s+/g, ' ').slice(0, 200));
  log.reloads.push(rec);
  say(`reload (${why}): same=${rec.same} phase ${rec.phaseBefore}->${rec.phaseAfter}`);
}

/* ---------- main ---------- */
try {
  if (INJECT) {
    await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2500);
    const s = await save();
    log.created = { injected: true, phase: s?.phase, age: s?.age, club: s?.currentClub };
    await shot('injected-load'); await audit('injected-load');
  } else await createCareer();
  const startSenior = seniorCount(await save());
  let lastSig = '', same = 0, exploredFor = new Set(), seenPhase = new Map(), weekDone = false, step = 0;
  while (Date.now() - T0 < MAXMS) {
    step++;
    const s = await save();
    if (!s) { log.notes.push({ step, kind: 'no-save' }); await shot('no-save', { force: true }); break; }
    const phase = s.phase;
    const senior = seniorCount(s) - startSenior;
    if (senior >= SENIOR && (phase === 'playing' || phase === 'youth')) { say(`target reached: ${senior} senior seasons`); break; }
    if (phase === 'retired' || (s.retired && !process.env.LATE)) { say('retired at ' + s.age); await shot('retired', { force: true }); break; }
    const n = (seenPhase.get(phase) || 0) + 1; seenPhase.set(phase, n);
    if (n === 1 || (phase === 'random_events' && n <= 6) || (n <= 3 && !['playing', 'youth'].includes(phase))) { await shot(`ph-${phase}-${n}`); }
    if (n <= 2 || phase === 'random_events') await audit(`phase ${phase} #${n}`);
    captureEvent(phase, s);
    if (RELOADS.has(step)) await doReload(`step ${step} in ${phase}`);
    const hub = (phase === 'playing' || phase === 'youth') && await atHub();
    let r;
    if (hub) {
      const key = `${seniorCount(s)}-${s.age}`;
      if (!exploredFor.has(key) && EXPLORE.has('hub') && phase === 'playing' && senior % EXPLORE_EVERY === 0) { exploredFor.add(key); await exploreHub(senior); }
      else if (!exploredFor.has(key) && phase === 'playing' && EXPLORE.has('phone')) { exploredFor.add(key); await explorePhone(senior); }
      const pre = { age: s.age, ovr: s.overall, nw: s.netWorth, wage: s.weeklyWage, val: s.marketValue, club: s.currentClub, years: s.contractYearsLeft };
      if (EXPLORE.has('double') && !log.doubleTap && phase === 'playing' && senior >= 1) {
        const before = { seasons: s.seasons.length, age: s.age };
        await page.evaluate(() => { const b = [...document.querySelectorAll('[data-career-action-bar] button')].find(x => /^Next Season/.test(x.innerText.trim())); b.click(); b.click(); });
        await sleep(1500);
        const a = await save();
        log.doubleTap = { before, after: { seasons: a?.seasons.length, age: a?.age, phase: a?.phase }, summaryYear: a?.pendingSummary?.year, lastRow: a?.seasons?.at(-1) ? { year: a.seasons.at(-1).year, apps: a.seasons.at(-1).apps, goals: a.seasons.at(-1).goals } : null, summary: a?.pendingSummary ? { year: a.pendingSummary.year, apps: a.pendingSummary.apps, goals: a.pendingSummary.goals } : null };
        await shot('double-tap');
        r = { action: 'double tap Next Season', options: [] };
      } else if (EXPLORE.has('week') && !weekDone && phase === 'playing') {
        weekDone = true;
        const ok = await page.evaluate(() => { const b = document.querySelector('[data-week-by-week]'); if (b) { b.click(); return true; } return false; });
        await sleep(1800); await shot('week-open'); await audit('week-open');
        const wk = { ok, clicks: [] };
        for (let k = 0; k < 40; k++) {
          const c = await candidates('[aria-modal="true"],[role="dialog"],[role="alertdialog"]');
          if (!c.length) break;
          const adv = c.find(x => /Next|Play|Continue|Sim|Kick|Finish|Skip/i.test(x.text)) || pick(c);
          await clickIdx(adv, 'week'); wk.clicks.push(adv.text.slice(0, 30)); await sleep(700);
          if (k % 8 === 3) await shot(`week-${k}`);
          if (!(await page.evaluate(() => !!document.querySelector('[aria-modal="true"],[role="dialog"],[role="alertdialog"]')))) break;
        }
        wk.end = await dlgText(); await shot('week-end');
        log.notes.push({ kind: 'week', ...wk });
        r = { action: 'Week by week', options: [] };
      } else {
        const b = page.locator('[data-career-action-bar] button').filter({ hasText: /^(Next Season|Next Year)/ }).first();
        try { await b.click({ timeout: 4000 }); r = { action: 'Next Season', options: [] }; }
        catch (e) { r = { action: 'NextSeason-click-failed', err: String(e).slice(0, 200) }; await b.evaluate(el => el.click()).catch(() => {}); }
      }
      await sleep(1500);
      const s2 = await save();
      log.notes.push({ kind: 'season-press', pre, post: s2 ? { phase: s2.phase, age: s2.age, ovr: s2.overall, nw: s2.netWorth, wage: s2.weeklyWage, val: s2.marketValue, club: s2.currentClub, years: s2.contractYearsLeft } : null });
    } else {
      r = { txt: await page.evaluate(sel => (document.querySelector(sel)?.innerText || '').replace(/\s+/g, ' ').slice(0, 700), REVEAL) };
      r = { ...(await decide(phase, s)), txt: r.txt };
      await sleep(phase === 'ballon_dor' || phase === 'world_cup' ? 1600 : 800);
    }
    const s3 = await save();
    const sig = `${s3?.phase}|${(JSON.stringify(s3) || '').length}|${await page.evaluate(() => (document.querySelector('main')?.innerText || '').length)}`;
    if (sig === lastSig) same++; else same = 0;
    lastSig = sig;
    log.steps.push({ step, phase, age: s.age, senior: seniorCount(s), club: s.currentClub, ovr: s.overall, action: r.action, options: r.options?.slice(0, 12), modal: r.modal, next: s3?.phase, txt: r.txt });
    if (same === 5) { await page.keyboard.press('Escape'); await sleep(500); log.notes.push({ step, kind: 'escape-unstick', phase }); }
    if (same === 10) { log.stuck.push({ step, phase, shot: await shot(`STUCK-${phase}`, { force: true }), options: r.options }); await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(2500); }
    if (same >= 16) { log.stuck.push({ step, phase, fatal: true }); break; }
    if (step % 10 === 0) flush();
  }
  const fin = await save();
  log.final = { phase: fin?.phase, age: fin?.age, senior: seniorCount(fin), club: fin?.currentClub, ovr: fin?.overall, steps: step, secs: Math.round((Date.now() - T0) / 1000) };
  fs.writeFileSync(path.join(OUT, `${TAG}-save.json`), JSON.stringify(fin));
  await doReload('final');
  await shot('final-hub-full', { full: true, q: 35, force: true });
  await audit('final');
  log.finalText = await page.evaluate(() => (document.querySelector('main')?.innerText || '').slice(0, 30000));
} catch (e) {
  log.fatal = String(e && e.stack || e).slice(0, 1200);
  await shot('FATAL', { force: true });
  try { fs.writeFileSync(path.join(OUT, `${TAG}-save.json`), (await saveRaw()) || 'null'); } catch {}
}
flush();
await browser.close();
say(`done: ${JSON.stringify(log.final)} shots=${shots} audits=${log.audits.length} errors=${log.errors.length} pageErrors=${log.pageErrors.length} stuck=${log.stuck.length} traps=${log.explore.filter(e => e.trap).length}`);
console.log(`WALK ${TAG} FINISHED`);
