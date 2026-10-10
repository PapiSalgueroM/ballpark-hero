// keeper-libs reviewer (Release AU): the broken save screen and the kept aside card, as a player meets them on the
// MERGED build, at 390x844 and 1280x900. Reads no network (everything that is not this machine is aborted, the
// database host included). Writes screenshots and one text log into $RC_OUT. Asserts little: it LOOKS and MEASURES.
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { buildRealSaves } from '../../scripts/lib/realSaves.mjs';

const { chromium } = pw;
const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/kl-out');
fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'klWalk-'));
const lines = [];
const say = s => { console.log(s); lines.push(s); };
let bad = 0;
const flag = s => { bad += 1; say('   FINDING? ' + s); };
const STAMP = '.broken-2026-01-02T03-04-05';
const WIDTHS = [390, 1280];

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const port = await freePort();
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('server did not start')), 20000);
  server.stdout.on('data', d => { if (String(d).includes('host-like server')) { clearTimeout(t); resolve(); } });
});
const SITE = 'http://127.0.0.1:' + port;

const { fleet } = await buildRealSaves({ root: ROOT, tmpDir: TMP, seeds: [0, 1] });
say('real saves built: soccer ' + fleet['/soccer-career'].map(s => s.length).join(',') + ' chars, nfl ' + fleet['/nfl-my-career'].map(s => s.length).join(',') + ', club manager ' + fleet['/club-manager'].map(s => s.length).join(','));

/* Runs at the start of every document. A switch in sessionStorage makes the store refuse writes the way a full one does. */
function installFull() {
  if (window.__klFull) return; window.__klFull = true;
  let ss; let ls; try { ss = window.sessionStorage; ls = window.localStorage; } catch { return; }
  const P = Storage.prototype; const set = P.setItem; const get = P.getItem;
  P.setItem = function setItem(k) {
    if (this === ls) {
      const mode = get.call(ss, '__kl_full');
      if (mode === 'all' || (mode === 'copy' && String(k).includes('.broken-'))) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    }
    return set.apply(this, arguments);
  };
}

const browser = await chromium.launch();
async function open(width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 } });
  await ctx.route('**/*', r => (r.request().url().startsWith(SITE) || /^(data|blob):/.test(r.request().url()) ? r.continue() : r.abort()));
  await ctx.addInitScript(installFull);
  const page = await ctx.newPage();
  page.on('pageerror', e => say('   pageerror: ' + String(e.message).slice(0, 160)));
  await page.goto(SITE + '/robots.txt', { waitUntil: 'domcontentloaded' });
  return { ctx, page };
}
const plant = (page, map, full = '') => page.evaluate(([m, f]) => {
  localStorage.clear(); sessionStorage.removeItem('__kl_full');
  localStorage.setItem('cookie-consent', 'essential');
  for (const [k, v] of Object.entries(m)) localStorage.setItem(k, v);
  if (f) sessionStorage.setItem('__kl_full', f);
}, [map, full]);
async function settle(page) {
  await page.waitForFunction(() => {
    const t = document.body?.innerText ?? '';
    return t.includes('This page broke') || (document.querySelectorAll('#root button').length > 0 && t.trim().length > 80);
  }, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1800);
}
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, name + '.png') }); say('   shot ' + name + '.png'); };
/* What is stored under one game's key and beside it, each value told apart by its bytes. */
const store = (page, key, known) => page.evaluate(([k, kn]) => {
  const out = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const name = localStorage.key(i);
    if (name !== k && !name.startsWith(k + '.broken-') && name !== 'dukb-save-pending' && name !== 'dukb-set-aside-seen') continue;
    const v = localStorage.getItem(name);
    const who = Object.entries(kn).find(([, text]) => text === v);
    out.push(name.replace(k, 'KEY') + '=' + (who ? who[0] : (name.startsWith('dukb-') ? v.slice(0, 120) : 'other(' + v.length + ')')));
  }
  return out.sort().join(' | ');
}, [key, known]);
/* The card: where it is, what it says, and every fixed or sticky thing of the page that it covers or that covers it. */
const card = page => page.evaluate(() => {
  const el = document.querySelector('[data-dukb-set-aside]');
  const dialog = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].filter(d => d.getBoundingClientRect().height > 0).map(d => (d.getAttribute('aria-label') || d.innerText || '').replace(/\s+/g, ' ').slice(0, 70));
  if (!el) return { none: true, dialog, broke: (document.body.innerText || '').includes('This page broke') };
  const r = el.getBoundingClientRect();
  const hit = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && el.contains(t); };
  const buttons = [...el.querySelectorAll('button')].map(b => { const q = b.getBoundingClientRect(); return { text: b.innerText.trim(), w: Math.round(q.width), h: Math.round(q.height), reach: hit(q.left + q.width / 2, q.top + q.height / 2), inView: q.top >= 0 && q.bottom <= innerHeight && q.left >= 0 && q.right <= innerWidth }; });
  const under = [];
  for (const o of document.querySelectorAll('body *')) {
    if (el.contains(o) || o.contains(el)) continue;
    const cs = getComputedStyle(o);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    const q = o.getBoundingClientRect();
    if (q.width < 4 || q.height < 4 || cs.visibility === 'hidden' || cs.display === 'none') continue;
    const overlap = Math.max(0, Math.min(q.right, r.right) - Math.max(q.left, r.left)) * Math.max(0, Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top));
    if (overlap > 0) under.push({ what: (o.getAttribute('data-testid') || o.getAttribute('aria-label') || o.className || o.tagName).toString().slice(0, 60), pos: cs.position, z: cs.zIndex, box: [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)], text: (o.innerText || '').replace(/\s+/g, ' ').slice(0, 50) });
  }
  return { box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vh: innerHeight, vw: innerWidth, scrollY: Math.round(scrollY), sideways: document.documentElement.scrollWidth > innerWidth, text: el.innerText.replace(/\s+/g, ' ').slice(0, 330), mark: el.getAttribute('data-dukb-put-back'), buttons, under, dialog };
});
const tell = (label, c) => {
  if (c.none) { say('   ' + label + ': NO CARD on screen' + (c.broke ? ' (the error page is up)' : '') + (c.dialog.length ? '; open dialog: ' + c.dialog.join(' / ') : '')); return; }
  say('   ' + label + ': card at ' + c.box.join(',') + ' of ' + c.vw + 'x' + c.vh + ', scrollY ' + c.scrollY + (c.mark ? ', put back ' + c.mark : '') + ' :: ' + c.text);
  say('      buttons: ' + c.buttons.map(b => b.text + ' ' + b.w + 'x' + b.h + (b.reach ? '' : ' NOT REACHABLE') + (b.inView ? '' : ' OUT OF VIEW')).join(' ; '));
  if (c.dialog.length) say('      a dialog is open over the page: ' + c.dialog.join(' / '));
  if (c.under.length) say('      overlaps: ' + c.under.map(u => u.pos + ' z' + u.z + ' [' + u.box.join(',') + '] ' + u.what + ' "' + u.text + '"').join(' ;; '));
  if (c.sideways) flag(label + ': the page scrolls sideways');
  for (const b of c.buttons) { if (!b.inView) flag(label + ': the button "' + b.text + '" is outside the screen'); if (b.h < 36) flag(label + ': the button "' + b.text + '" is ' + b.h + ' px tall'); }
};
/* A real pointer press on a button of the card, by its words. False when it cannot be reached. */
async function press(page, words, scope = '[data-dukb-set-aside]') {
  const box = await page.evaluate(([w, s]) => {
    const b = [...document.querySelectorAll(s + ' button')].find(x => x.innerText.trim() === w);
    if (!b) return null; const q = b.getBoundingClientRect();
    const x = q.left + q.width / 2; const y = q.top + q.height / 2; const t = document.elementFromPoint(x, y);
    return { x, y, ok: !!t && b.contains(t) };
  }, [words, scope]);
  if (!box) { say('      press "' + words + '": no such button'); return false; }
  if (!box.ok) { say('      press "' + words + '": something else is on top of it'); return false; }
  await page.mouse.click(box.x, box.y); return true;
}

/* Closes what the game opened on arrival the way a player would, and says what it was. */
async function closeDialogs(page, label) {
  for (let i = 0; i < 5; i += 1) {
    const d = await page.evaluate(() => {
      const el = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].find(x => x.getBoundingClientRect().height > 0);
      if (!el) return null;
      return { text: (el.getAttribute('aria-label') || el.innerText || '').replace(/\s+/g, ' ').slice(0, 90), buttons: [...el.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean).slice(0, 8) };
    });
    if (!d) return;
    say('      ' + label + ': on arrival a dialog is open: "' + d.text + '" buttons [' + d.buttons.join(', ') + ']');
    const want = ['Show result', 'Continue', 'Got it', 'Close', 'OK', 'Skip', "Let's go", 'Start'].find(w => d.buttons.includes(w));
    if (want) await page.evaluate(w => { const el = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].find(x => x.getBoundingClientRect().height > 0); [...el.querySelectorAll('button')].find(b => b.innerText.trim() === w).click(); }, want);
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(900);
  }
}

/* JOURNEY 1: a kept aside save on a game of the merged build. Offer, put back, the outcome, the undo offer. */
async function putBackJourney(width, route, key, tag) {
  say('\nJOURNEY 1 ' + route + ' at ' + width);
  const [B, A] = fleet[route];
  const { ctx, page } = await open(width);
  try {
    await plant(page, { [key]: B, [key + STAMP]: A });
    await page.goto(SITE + route, { waitUntil: 'load' }); await settle(page);
    await shot(page, 'kl-' + tag + '-arrive-' + width);
    tell('arrival', await card(page));
    await closeDialogs(page, 'arrival');
    await page.waitForTimeout(600);
    const offer = await card(page); tell('offer', offer);
    await shot(page, 'kl-' + tag + '-offer-' + width);
    say('   store before the press: ' + await store(page, key, { A, B }));
    if (!offer.none && await press(page, 'Put that save back')) {
      await page.waitForLoadState('load').catch(() => {}); await settle(page);
      const done = await card(page); tell('after the press', done);
      await shot(page, 'kl-' + tag + '-done-' + width);
      say('   store after the load: ' + await store(page, key, { A, B }));
      if (!done.none && done.mark !== 'done') flag(route + ' ' + width + ': the outcome card does not say done');
      if (await press(page, 'OK')) { await page.waitForTimeout(500); }
      await page.goto(SITE + route, { waitUntil: 'load' }); await settle(page); await closeDialogs(page, 'second visit');
      const undo = await card(page); tell('second visit (the undo offer)', undo);
      await shot(page, 'kl-' + tag + '-undo-' + width);
      say('   store on the second visit: ' + await store(page, key, { A, B }));
    } else flag(route + ' ' + width + ': the put back could not be pressed');
  } catch (e) { flag(route + ' ' + width + ' threw: ' + String(e.message).slice(0, 200)); }
  await ctx.close();
}

/* JOURNEY 2: a save that breaks the page. The error page, a fresh start, the offer, a put back that breaks again, a second fresh start. */
async function brokenJourney(width) {
  const route = '/nfl-my-career'; const key = 'nfl-my-career-save-v1';
  say('\nJOURNEY 2 (a save that breaks ' + route + ') at ' + width);
  const X = JSON.stringify({ c: { team: 'Shell Town', year: 3, retired: false } });
  const { ctx, page } = await open(width);
  try {
    await plant(page, { [key]: X });
    await page.goto(SITE + route, { waitUntil: 'load' }); await settle(page);
    const info = () => page.evaluate(() => {
      const b = document.querySelector('[data-dukb-fresh-start]'); const q = b ? b.getBoundingClientRect() : null;
      return { broke: (document.body.innerText || '').includes('This page broke'), text: (document.querySelector('main, #root')?.innerText || '').replace(/\s+/g, ' ').slice(0, 520), fresh: q ? [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)] : null, vh: innerHeight, sideways: document.documentElement.scrollWidth > innerWidth, docH: document.documentElement.scrollHeight };
    });
    let i = await info(); say('   error page: broke=' + i.broke + ' fresh button ' + JSON.stringify(i.fresh) + ' of height ' + i.vh + ', page height ' + i.docH + (i.sideways ? ' SIDEWAYS SCROLL' : '') + ' :: ' + i.text);
    await shot(page, 'kl-broke-' + width);
    if (!i.broke) flag('the shell save no longer breaks ' + route + ', so the error page was not seen');
    if (i.fresh && i.fresh[1] + i.fresh[3] > i.vh) say('   NOTE the fresh start button ends below the first screen (' + (i.fresh[1] + i.fresh[3]) + ' of ' + i.vh + ')');
    if (await press(page, 'Start a fresh game', 'body')) {
      await page.waitForLoadState('load').catch(() => {}); await settle(page);
      tell('after a fresh start', await card(page)); await shot(page, 'kl-fresh-' + width);
      say('   store after the fresh start: ' + await store(page, key, { X }));
      await closeDialogs(page, 'fresh');
      if (await press(page, 'Put that save back')) {
        await page.waitForLoadState('load').catch(() => {}); await settle(page);
        i = await info(); say('   after putting the broken save back: broke=' + i.broke + ' :: ' + i.text.slice(0, 260));
        tell('card over the error page', await card(page)); await shot(page, 'kl-broke-again-' + width);
        say('   store after the put back: ' + await store(page, key, { X }));
        if (await press(page, 'Start a fresh game', 'body')) {
          await page.waitForLoadState('load').catch(() => {}); await settle(page);
          tell('after the second fresh start', await card(page)); await shot(page, 'kl-fresh-again-' + width);
          say('   store after the second fresh start: ' + await store(page, key, { X }));
        }
      } else say('   the card could not be pressed after the fresh start');
    } else flag('no fresh start button could be pressed at ' + width);
  } catch (e) { flag('journey 2 at ' + width + ' threw: ' + String(e.message).slice(0, 200)); }
  await ctx.close();
}

/* JOURNEY 3: no room. (a) the press itself cannot write; (b) the press is staged and the load cannot write the copy. */
async function fullJourney(width, mode) {
  const route = '/nfl-my-career'; const key = 'nfl-my-career-save-v1';
  say('\nJOURNEY 3 storage full (' + mode + ') on ' + route + ' at ' + width);
  const [B, A] = fleet[route];
  const { ctx, page } = await open(width);
  try {
    await plant(page, { [key]: B, [key + STAMP]: A });
    await page.goto(SITE + route, { waitUntil: 'load' }); await settle(page); await closeDialogs(page, 'arrival');
    const before = await store(page, key, { A, B });
    await page.evaluate(m => sessionStorage.setItem('__kl_full', m), mode);
    if (!await press(page, 'Put that save back')) { flag('journey 3 ' + mode + ' ' + width + ': the button could not be pressed'); await ctx.close(); return; }
    await page.waitForTimeout(1200); await page.waitForLoadState('load').catch(() => {}); await settle(page);
    const c = await card(page); tell('after the press with the store full', c);
    const alert = await page.evaluate(() => [...document.querySelectorAll('[role="alert"],[role="status"]')].map(e => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' || ').slice(0, 400));
    say('   alerts and status lines on screen: ' + alert);
    await shot(page, 'kl-full-' + mode + '-' + width);
    const after = await store(page, key, { A, B });
    say('   store before: ' + before); say('   store after:  ' + after);
    const keyNow = await page.evaluate(k => localStorage.getItem(k), key);
    if (keyNow !== B) say('   NOTE the key no longer holds B byte for byte (the game may have written itself again): ' + (keyNow === A ? 'it holds A' : 'length ' + (keyNow || '').length + ' against ' + B.length));
    if (!after.includes('KEY' + STAMP + '=A')) flag('journey 3 ' + mode + ' ' + width + ': the kept aside save A is not where it was');
    if (after.includes('dukb-save-pending')) flag('journey 3 ' + mode + ' ' + width + ': the journal is still in the store');
  } catch (e) { flag('journey 3 ' + mode + ' at ' + width + ' threw: ' + String(e.message).slice(0, 200)); }
  await ctx.close();
}

/* JOURNEY 4: a Club Manager save from the version before. With room (a quiet copy) and without (the card says so). */
async function versionJourney(width, full) {
  const route = '/club-manager'; const key = 'dukb-club-manager-save';
  say('\nJOURNEY 4 a save one version down on ' + route + ' at ' + width + (full ? ', no room for its copy' : ''));
  const o = JSON.parse(fleet[route][0]); o.saveVersion = 2; const OLD = JSON.stringify(o);
  const { ctx, page } = await open(width);
  try {
    await plant(page, { [key]: OLD }, full ? 'copy' : '');
    await page.goto(SITE + route, { waitUntil: 'load' }); await settle(page); await page.waitForTimeout(5500);
    tell('arrival', await card(page));
    const words = await page.evaluate(() => (document.querySelector('main, #root')?.innerText || '').replace(/\s+/g, ' ').slice(0, 420));
    say('   the page says: ' + words);
    await shot(page, 'kl-version-' + (full ? 'noroom-' : 'copy-') + width);
    say('   store: ' + await store(page, key, { OLD }));
    await page.goto(SITE + route, { waitUntil: 'load' }); await settle(page);
    tell('second visit', await card(page));
    say('   store on the second visit: ' + await store(page, key, { OLD }));
  } catch (e) { flag('journey 4 at ' + width + ' threw: ' + String(e.message).slice(0, 200)); }
  await ctx.close();
}

const PARTS = (process.env.KL_PARTS || '1,2,3,4').split(',');
for (const w of WIDTHS) {
  if (PARTS.includes('1')) { await putBackJourney(w, '/soccer-career', 'soccerCareerSave', 'soccer'); await putBackJourney(w, '/nfl-my-career', 'nfl-my-career-save-v1', 'nfl'); }
  if (PARTS.includes('2')) await brokenJourney(w);
  if (PARTS.includes('3')) { await fullJourney(w, 'all'); await fullJourney(w, 'copy'); }
  if (PARTS.includes('4')) { await versionJourney(w, false); await versionJourney(w, true); }
}
await browser.close(); server.kill();
fs.writeFileSync(path.join(OUT, 'kl-walk.txt'), lines.join('\n') + '\n');
say('\nklWalk: done. ' + bad + ' line(s) marked FINDING?. Screenshots and kl-walk.txt are in RC_OUT.');
process.exit(0);
