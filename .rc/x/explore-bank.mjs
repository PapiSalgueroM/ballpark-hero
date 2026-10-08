/* Round 1141 scratch: what stands between a fresh NBA My Career and a line in The Bank's statement.
   Untranslated, on the served build. Prints the buttons at every step so the harness walk can be scripted. */
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/+$/, '');
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch (e) { /* nothing */ } });
await ctx.route('**/*', route => {
  let host = '';
  try { host = new URL(route.request().url()).hostname; } catch { /* data: */ }
  if (!host || host === 'localhost' || host === '127.0.0.1') return route.continue();
  return route.abort();
});
await ctx.route(/supabase\.co/, route => route.abort());
const page = await ctx.newPage();
const look = async tag => {
  const s = await page.evaluate(() => {
    const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const lab = el => (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 34);
    const dialog = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].filter(vis).pop() || null;
    const scope = dialog || document.getElementById('root');
    const buttons = [...scope.querySelectorAll('button')].filter(vis).filter(b => dialog || !b.closest('header,footer')).map(b => (b.disabled ? '(off)' : '') + lab(b));
    const rows = [...document.querySelectorAll('span.font-black')].map(lab).filter(t => /\$/.test(t)).slice(0, 6);
    return { dialog: !!dialog, h: [...document.querySelectorAll('h1,h2')].filter(vis).map(lab).slice(0, 3), buttons: buttons.slice(0, 42), rows, tiles: !!document.querySelector('[data-career-hub-buttons]') };
  });
  console.log(`\n== ${tag} | dialog=${s.dialog} tiles=${s.tiles} | ${JSON.stringify(s.h)}`);
  console.log('   ' + s.buttons.join(' | '));
  if (s.rows.length) console.log('   statement: ' + s.rows.join(' | '));
  return s;
};
const click = async (sel, re) => {
  const ok = await page.evaluate(([s, src]) => {
    const rx = new RegExp(src, 'i');
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    const el = [...document.querySelectorAll(s)].filter(vis).find(b => !b.disabled && rx.test((b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()));
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.click();
    return true;
  }, [sel, re.source]);
  await page.waitForTimeout(900);
  return ok;
};
await page.goto(BASE + '/nba-my-career', { waitUntil: 'load', timeout: 45000 });
await page.waitForTimeout(2500);
let s = await look('loaded');
for (let i = 0; i < 3 && s.dialog; i++) { console.log('dialog button: ' + await click('[role="dialog"] button,[role="alertdialog"] button', /^(let's play|got it|start|play|continue|begin|ok|okay|done|next|close)/)); s = await look('after dialog ' + i); }
console.log('draft: ' + await click('button', /^Enter the draft$/));
s = await look('after the draft');
for (let round = 0; round < 3; round++) {
  console.log('bank tile: ' + await click('[data-career-hub-buttons] button', /The Bank/));
  s = await look(`in the bank, round ${round}`);
  const canSave = s.buttons.some(b => b === 'Save half');
  if (canSave) break;
  console.log('back: ' + await click('button', /back|close|←|‹/));
  await look('back on the board');
  console.log('play: ' + await click('button', /^Play the /));
  for (let k = 0; k < 14; k++) {
    s = await look(`season ${round} step ${k}`);
    if (s.tiles && s.buttons.some(b => /^Play the /.test(b))) break;
    const did = (s.dialog && await click('[role="dialog"] button,[role="alertdialog"] button', /.+/)) || await click('#root button', /^(continue|next|accept|sign|ok|done|advance|skip|see|keep|back to|on to|finish)/);
    console.log('   pressed something: ' + did);
    if (!did) break;
  }
}
for (const name of ['Save half', 'Take out half', 'Save 25%', 'Take it all out']) {
  console.log(`${name}: ` + await click('button', new RegExp('^' + name.replace('%', '\\%') + '$')));
  await look('after ' + name);
}
const html = await page.evaluate(() => { const sp = [...document.querySelectorAll('span.font-black')].filter(x => /\$/.test(x.textContent)); return sp.slice(0, 3).map(x => x.parentElement.parentElement.outerHTML.slice(0, 420)); });
console.log('\nrows html:\n' + html.join('\n'));
await browser.close();
console.log('explore done');
