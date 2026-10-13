// Review (run lens) walk for Round 1330. Runs on a runner from the repo root as node .rc/x/walk.mjs
// Env: BASE (head served by #!serve), BASE_DIST (a plain build of the base), BASE_ROOT (the base tree,
// for realSaves), RC_OUT (pictures). Supabase and ad hosts are aborted in every context.
// PART fleet: old saves made by the BASE engine (scripts/lib/realSaves.mjs, seeds 0 to 7) load on head
//   and base; the save bytes after mount and after one press of the bar's first button must be equal,
//   and on head the fence key must read 1 after mount (old save, no key) and move with the press.
// PART play: a player made through the form at 390x844 and 1280x900, reduced motion on and off: the
//   landing, a few steps with every toast sampled, a second tab and its notice, the header Retire.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const { chromium } = await imp('scripts/lib/playwrightLoader.mjs');
const { seedPages } = await imp('scripts/lib/pageSeed.mjs');
const OUT = process.env.RC_OUT || path.join(ROOT, 'review-walk-out');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'soccerCareerSave';
const FENCE = 'dukb-fence:soccerCareerSave';
const PARTS = (process.env.PARTS || 'fleet,play').split(',');
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
const fails = [];
const fail = m => { fails.push(m); console.log(`  FAIL ${m}`); };
const ok = m => console.log(`  ok   ${m}`);
const HEAD = (process.env.SWEEP_BASE || process.env.BASE || '').replace(/\/$/, '');
if (!HEAD) { console.log('WALK ABORTED: no BASE'); process.exit(3); }
let BASEURL = null;
if (process.env.BASE_DIST) {
  spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), process.env.BASE_DIST, '4190'], { stdio: 'ignore', detached: false });
  BASEURL = 'http://127.0.0.1:4190';
  for (let i = 0; i < 60 && !(await fetch(BASEURL + '/').then(r => r.ok).catch(() => false)); i++) await new Promise(r => setTimeout(r, 250));
}
const browser = await chromium.launch();
async function ctxFor(w, h, motion = 'no-preference', seed = 1330) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, reducedMotion: motion });
  await ctx.route(BLOCK, r => r.abort());
  await seedPages(ctx, seed);
  await ctx.addInitScript(() => {
    window.__toasts = [];
    const INTER = 'button, a[href], input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"]), summary';
    const sample = (li, when) => {
      if (!li.isConnected) return;
      const r = li.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const hits = [];
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
        const x = r.left + (r.width * (i + 0.5)) / 5, y = r.top + (r.height * (j + 0.5)) / 3;
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
        const under = document.elementsFromPoint(x, y).find(el => !li.contains(el) && !el.closest('[data-sonner-toaster]'));
        const c = under?.closest(INTER);
        const hd = under?.closest('main h1, main h2, main h3');
        if (c) hits.push('control: ' + (c.getAttribute('aria-label') || c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40));
        else if (hd) hits.push('heading: ' + (hd.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40));
      }
      window.__toasts.push({ words: (li.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70), when, box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], hits: [...new Set(hits)] });
    };
    const seen = new WeakSet();
    const go = () => new MutationObserver(() => {
      for (const li of document.querySelectorAll('[data-sonner-toast]')) {
        if (seen.has(li)) continue;
        seen.add(li);
        requestAnimationFrame(() => sample(li, 'first'));
        setTimeout(() => sample(li, 'settled'), 500);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
    if (document.documentElement) go(); else document.addEventListener('DOMContentLoaded', go);
  });
  return ctx;
}
async function plant(p, url, kv) {
  await p.goto(url + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await p.evaluate(e => { localStorage.clear(); for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v); }, kv);
}
async function openSoccer(p, url) {
  await p.goto(url + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.locator('[data-career-action-bar], input[placeholder*="player name"], [role="alert"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(700);
  await p.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    if (await p.locator('[role="dialog"]:visible').count().catch(() => 0) === 0) break;
    await p.keyboard.press('Escape').catch(() => {});
    await p.waitForTimeout(300);
  }
}
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `${n}.jpg`), type: 'jpeg', quality: 60 }).catch(() => {});
const read = p => p.evaluate(([k, f]) => ({ save: localStorage.getItem(k), fence: localStorage.getItem(f), h1: (document.querySelector('main h1')?.textContent || '').trim(), first: (document.querySelector('[data-career-action-bar] button')?.textContent || '').replace(/\s+/g, ' ').trim(), notice: !!document.querySelector('[role="alertdialog"]') }), [KEY, FENCE]);
const pressFirst = p => p.evaluate(() => {
  const b = document.querySelector('[data-career-action-bar] button');
  if (!b || b.getBoundingClientRect().height === 0 || b.disabled) return null;
  b.click();
  return (b.textContent || '').replace(/\s+/g, ' ').trim();
});

/* ---------- fleet: old saves made by the base engine ---------- */
if (PARTS.includes('fleet')) {
  if (!BASEURL || !process.env.BASE_ROOT) { console.log('WALK ABORTED: fleet needs BASE_DIST and BASE_ROOT'); process.exit(3); }
  const { buildRealSaves } = await import(pathToFileURL(path.join(process.env.BASE_ROOT, 'scripts/lib/realSaves.mjs')).href);
  const seeds = (process.env.FLEET_SEEDS || '0,1,2,3,4,5,6,7').split(',').map(Number);
  const real = await buildRealSaves({ root: process.env.BASE_ROOT, tmpDir: path.join(os.tmpdir(), 'rs-tmp-' + process.pid), seeds });
  const saves = real.fleet['/soccer-career'];
  console.log(`fleet: ${saves.length} soccer saves from the base engine, seeds ${seeds.join(',')}`);
  let equalMount = 0, equalPress = 0, fenced = 0;
  for (let i = 0; i < saves.length; i++) {
    const got = {};
    for (const [arm, url] of [['head', HEAD], ['base', BASEURL]]) {
      const ctx = await ctxFor(390, 844, 'no-preference', 4242 + i);
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => errs.push(String(e.message).slice(0, 100)));
      await plant(p, url, { [KEY]: saves[i] });
      await openSoccer(p, url);
      const mount = await read(p);
      const pressed = await pressFirst(p);
      await p.waitForTimeout(1500);
      const after = await read(p);
      got[arm] = { mount, pressed, after, errs };
      if (i < 2) await shot(p, `fleet-${arm}-${i}`);
      await ctx.close();
    }
    const h = got.head, b = got.base;
    const tag = `seed ${seeds[i]} (${JSON.parse(saves[i]).phase}, h1 "${h.mount.h1.slice(0, 30)}", first "${h.mount.first.slice(0, 20)}", pressed "${h.pressed}")`;
    if (h.errs.length) fail(`${tag}: page errors on head ${h.errs.join(' | ')}`);
    if (h.mount.save === b.mount.save) equalMount++; else fail(`${tag}: save bytes after mount differ head ${h.mount.save?.length} base ${b.mount.save?.length}`);
    if (h.after.save === b.after.save) equalPress++; else fail(`${tag}: save bytes after one press differ head ${h.after.save?.length} base ${b.after.save?.length}`);
    if (h.mount.h1 !== b.mount.h1 || h.mount.first !== b.mount.first) fail(`${tag}: hub differs: head "${h.mount.h1}" / "${h.mount.first}" base "${b.mount.h1}" / "${b.mount.first}"`);
    if (h.mount.notice || h.after.notice) fail(`${tag}: a notice showed in a single tab`);
    if (b.mount.fence !== null) fail(`${tag}: the base wrote a fence key (${b.mount.fence})`);
    const moved = h.after.save !== h.mount.save;
    const fm = Number(h.mount.fence), fa = Number(h.after.fence);
    if (h.mount.fence !== null && fm >= 1 && (moved ? fa > fm : fa >= fm)) fenced++;
    else fail(`${tag}: fence after mount ${h.mount.fence}, after press ${h.after.fence} (save ${moved ? 'changed' : 'unchanged'})`);
    console.log(`  ${tag}: mount ${h.mount.save === b.mount.save ? 'equal' : 'DIFF'}, press ${h.after.save === b.after.save ? 'equal' : 'DIFF'}, fence ${h.mount.fence} to ${h.after.fence}`);
  }
  console.log(`fleet: ${equalMount}/${saves.length} equal after mount, ${equalPress}/${saves.length} equal after a press, ${fenced}/${saves.length} fenced as wanted`);
}

/* ---------- play: a player through the form, as a person would ---------- */
async function pickCombo(p, trigger, wanted) {
  await p.locator('[role="combobox"]', { hasText: trigger }).first().click({ timeout: 5000 });
  await p.waitForSelector('[role="option"]', { timeout: 8000 });
  await p.evaluate(w => { const o = [...document.querySelectorAll('[role="option"]')]; const h = o.find(x => x.textContent.includes(w)) || o[0]; h.scrollIntoView(); h.click(); }, wanted);
  await p.waitForTimeout(400);
}
function driveOne() {
  const ADV = ['Sign contract', 'Review contract', 'Join Club', 'Continue at', 'Stay at', 'Continue', 'Accept', 'Next', 'Done', 'Confirm', 'Proceed'];
  const vis = b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !b.disabled; };
  const text = b => (b.textContent || '').replace(/\s+/g, ' ').trim();
  const modal = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].find(vis);
  const bar = document.querySelector('[data-career-action-bar] button');
  if (!modal && bar && vis(bar) && /^Next (Year|Season)/.test(text(bar))) { bar.click(); return text(bar).slice(0, 30); }
  const scope = modal ? [modal] : [...document.querySelectorAll('main [class*="md:order-2"] > div')];
  const cands = scope.flatMap(s => [...s.querySelectorAll('button')]).filter(vis).filter(b => !/close|help/i.test(b.getAttribute('aria-label') || '') && !/^(Close|Back)$/.test(text(b)) && !/^Full attributes/.test(text(b)) && !b.closest('[data-career-utility]'));
  let pick = null;
  for (const a of ADV) { pick = cands.find(b => text(b).startsWith(a)); if (pick) break; }
  pick = pick || cands[0] || (bar && vis(bar) ? bar : null);
  if (!pick) return null;
  pick.click();
  return text(pick).slice(0, 30);
}
if (PARTS.includes('play')) {
  for (const [w, h] of [[390, 844], [1280, 900]]) for (const motion of ['reduce', 'no-preference']) {
    const tag = `${w}x${h}-${motion === 'reduce' ? 'rm' : 'mo'}`;
    console.log(`play ${tag}`);
    const ctx = await ctxFor(w, h, motion, 77);
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
    await plant(p, HEAD, {});
    await openSoccer(p, HEAD);
    try {
      await p.fill('input[placeholder*="player name"]', 'Danny Okafor-Whitfield');
      await pickCombo(p, 'Choose nationality', 'England');
      await pickCombo(p, 'Choose position', 'Striker');
      await pickCombo(p, 'Choose era', 'Current era');
      await p.getByRole('button', { name: /Generate Starting Potential/ }).click({ timeout: 5000 });
      await p.waitForTimeout(3500);
    } catch (e) { fail(`${tag}: the form did not fill (${String(e.message).slice(0, 80)})`); await ctx.close(); continue; }
    const begin = p.getByRole('button', { name: /Begin Career/ });
    await begin.scrollIntoViewIfNeeded().catch(() => {});
    await p.waitForTimeout(300);
    await shot(p, `${tag}-01-begin`);
    await p.evaluate(() => { window.__land = null; const b = [...document.querySelectorAll('button')].find(x => /Begin Career/.test(x.textContent || '')); b?.addEventListener('click', () => requestAnimationFrame(() => { const r = document.querySelector('main h1')?.getBoundingClientRect(); window.__land = { y: Math.round(scrollY), top: r ? Math.round(r.top) : null }; }), { capture: true, once: true }); });
    await begin.click({ timeout: 5000 });
    await p.waitForFunction(() => window.__land !== null, null, { timeout: 5000 }).catch(() => {});
    const first = await p.evaluate(() => window.__land);
    await shot(p, `${tag}-02-landing`);
    await p.waitForTimeout(1000);
    const later = await p.evaluate(() => { const r = document.querySelector('main h1')?.getBoundingClientRect(); return { y: Math.round(scrollY), top: r ? Math.round(r.top) : null, bottom: r ? Math.round(r.bottom) : null }; });
    console.log(`  landing first ${JSON.stringify(first)} later ${JSON.stringify(later)}`);
    if (!first || first.y !== later.y) fail(`${tag}: the page moved after the landing frame (${JSON.stringify(first)} then ${JSON.stringify(later)})`);
    if (later.top === null || later.top < 0 || later.bottom > h - 70) fail(`${tag}: the name heading is not on screen after Begin Career (${JSON.stringify(later)})`);
    await shot(p, `${tag}-03-landed`);
    let shots = 0;
    for (let i = 0; i < 14; i++) {
      const before = await p.evaluate(() => window.__toasts.length);
      const pressed = await p.evaluate(driveOne).catch(() => null);
      await p.waitForTimeout(350);
      const toastUp = await p.locator('[data-sonner-toast]').count().catch(() => 0);
      if (toastUp && shots < 4) { await shot(p, `${tag}-1${shots}-toast-step${i + 1}`); shots++; }
      await p.waitForTimeout(700);
      const after = await p.evaluate(() => window.__toasts.length);
      if (after > before) console.log(`  step ${i + 1} (${pressed}): toast`);
      if (!pressed) break;
    }
    const toasts = await p.evaluate(() => window.__toasts);
    for (const t of toasts) {
      console.log(`  toast "${t.words}" ${t.when} box ${t.box.join(',')} under ${t.hits.join('; ') || 'nothing'}`);
      if (t.hits.some(x => x.startsWith('control'))) fail(`${tag}: toast "${t.words}" (${t.when}) lies over ${t.hits.filter(x => x.startsWith('control')).join('; ')}`);
    }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(400);
    await shot(p, `${tag}-20-hub-top`);
    const beforeNotice = await p.evaluate(() => ({ y: Math.round(scrollY), docH: document.documentElement.scrollHeight }));
    const p2 = await ctx.newPage();
    await openSoccer(p2, HEAD);
    await p2.waitForTimeout(800);
    await p.waitForTimeout(1200);
    await shot(p, `${tag}-21-notice`);
    await shot(p2, `${tag}-22-second-tab`);
    const nb = await p.evaluate(() => { const d = document.querySelector('[role="alertdialog"]'); if (!d) return null; const r = d.getBoundingClientRect(); const btn = [...d.querySelectorAll('button')].find(b => /Reload/.test(b.textContent || '')); const br = btn?.getBoundingClientRect(); return { box: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], reloadH: br ? Math.round(br.height) : null, text: (d.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120), y: Math.round(scrollY), docH: document.documentElement.scrollHeight, toasts: document.querySelectorAll('[data-sonner-toast]').length }; });
    console.log(`  notice ${JSON.stringify(nb)}`);
    if (!nb) fail(`${tag}: the older tab shows no notice after a second tab opened the career`);
    else {
      if (nb.box[0] < 0 || nb.box[2] > w || nb.box[1] < 0 || nb.box[3] > h) fail(`${tag}: the notice is not inside the screen ${nb.box.join(',')}`);
      if ((nb.reloadH ?? 0) < 44) fail(`${tag}: Reload is ${nb.reloadH} px tall`);
      if (nb.y !== beforeNotice.y || nb.docH !== beforeNotice.docH) fail(`${tag}: the page moved under the notice (${JSON.stringify(beforeNotice)} to y ${nb.y} docH ${nb.docH})`);
    }
    await p.getByRole('button', { name: /Reload/ }).click({ timeout: 3000 }).catch(() => fail(`${tag}: could not press Reload`));
    await p.waitForTimeout(2500);
    const reloaded = await read(p);
    if (reloaded.notice) fail(`${tag}: the notice is still up after Reload`);
    await shot(p, `${tag}-23-after-reload`);
    const retire = p.getByRole('button', { name: /^(🚪 )?Retire$/ });
    console.log(`  Retire controls on the hub after reload: ${await retire.count()}`);
    await retire.first().click({ timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(600);
    await shot(p, `${tag}-24-retire-dialog`);
    if (errs.length) fail(`${tag}: page errors ${errs.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
}
/* ---------- bytes: the same seeded career on head and base, longer than the round's own walk ---------- */
async function phoneBuy(p) {
  const opened = await p.evaluate(() => { const b = document.querySelector('[data-career-utility="phone"]'); if (!b) return false; b.click(); return true; });
  if (!opened) return 'no phone button';
  await p.waitForTimeout(700);
  if (!await p.evaluate(() => { const b = document.querySelector('[data-phone-app="shop"]'); if (!b) return false; b.click(); return true; })) return 'no My Life app';
  await p.waitForTimeout(600);
  const r = await p.evaluate(async () => {
    const scope = () => document.querySelector('[data-phone-back]')?.closest('[role="dialog"], [aria-modal="true"], .fixed') || null;
    const btns = () => [...(scope()?.querySelectorAll('button') ?? [])].filter(b => b.getBoundingClientRect().height > 0 && !b.hasAttribute('data-phone-back') && !/Put phone away|Home/.test(b.textContent || ''));
    const cats = btns();
    if (!cats.length) return `no category (scope ${scope() ? scope().tagName : 'none'})`;
    cats[0].click();
    await new Promise(z => setTimeout(z, 600));
    const items = btns();
    const buy = items.find(b => /Buy|€|\$|£/.test(b.textContent || '') && !b.disabled);
    if (!buy) return `no item (${items.slice(0, 4).map(b => (b.textContent || '').trim().slice(0, 20)).join(' | ')})`;
    buy.click();
    return 'bought ' + (buy.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  });
  await p.waitForTimeout(800);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Put phone away/.test(x.textContent || '')); b?.click(); });
  await p.keyboard.press('Escape').catch(() => {});
  await p.waitForTimeout(400);
  return r;
}
if (PARTS.includes('bytes')) {
  if (!BASEURL) { console.log('WALK ABORTED: bytes needs BASE_DIST'); process.exit(3); }
  for (const seed of (process.env.BYTES_SEEDS || '77,4242').split(',').map(Number)) {
    const run = {};
    for (const [arm, url] of [['head', HEAD], ['base', BASEURL]]) {
      /* BYTES_CONTROL=seed: the head arm plays another seed, so the comparison must go red. */
      const ctx = await ctxFor(390, 844, 'reduce', process.env.BYTES_CONTROL === 'seed' && arm === 'head' ? seed + 1 : seed);
      const p = await ctx.newPage();
      await plant(p, url, {});
      await openSoccer(p, url);
      await p.fill('input[placeholder*="player name"]', 'Bytes Probe');
      await pickCombo(p, 'Choose nationality', 'England');
      await pickCombo(p, 'Choose position', 'Striker');
      await pickCombo(p, 'Choose era', 'Current era');
      await p.getByRole('button', { name: /Generate Starting Potential/ }).click({ timeout: 5000 });
      await p.waitForTimeout(3500);
      await p.getByRole('button', { name: /Begin Career/ }).click({ timeout: 5000 });
      await p.waitForTimeout(1200);
      const steps = [{ label: 'begin', save: (await read(p)).save }];
      let phoneDone = false;
      for (let i = 0; i < Number(process.env.BYTES_STEPS || 22); i++) {
        const pressed = await p.evaluate(driveOne).catch(() => null);
        await p.waitForTimeout(1000);
        const s = (await read(p)).save;
        let phase = null; try { phase = JSON.parse(s)?.phase; } catch { phase = null; }
        steps.push({ label: `${phase}: ${pressed}`, save: s });
        if (!pressed) break;
        if (!phoneDone && phase === 'playing') {
          phoneDone = true;
          const bought = await phoneBuy(p);
          steps.push({ label: `phone: ${bought}`, save: (await read(p)).save });
        }
      }
      run[arm] = steps;
      await ctx.close();
    }
    const n = Math.min(run.head.length, run.base.length);
    let equal = 0;
    for (let i = 0; i < n; i++) {
      const same = run.head[i].save === run.base[i].save && run.head[i].label === run.base[i].label;
      if (same) equal++; else fail(`bytes seed ${seed} step ${i}: head "${run.head[i].label}" ${run.head[i].save?.length} base "${run.base[i].label}" ${run.base[i].save?.length}`);
    }
    if (run.head.length !== run.base.length) fail(`bytes seed ${seed}: head took ${run.head.length} steps, base ${run.base.length}`);
    console.log(`bytes seed ${seed}: ${equal}/${n} steps equal; steps: ${run.head.map(s => s.label.slice(0, 34)).join(' / ')}`);
  }
}
await browser.close();
console.log(fails.length ? `REVIEW WALK RED: ${fails.length} finding(s)` : 'REVIEW WALK GREEN');
process.exit(fails.length ? 1 : 0);
