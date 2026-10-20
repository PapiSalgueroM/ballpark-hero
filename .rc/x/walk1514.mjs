/* Reviewer walk (runs lens, Round 1514). The served dist (BASE from #!serve), supabase.co and the ad hosts aborted,
 * saves made by the engine (the head, and the base engines for old saves) planted from /robots.txt, at 390x844 and
 * 1280x900, reduced motion on and off. Prints every tile and card text, measures each view, screenshots into
 * $RC_OUT/shots. Exit 0 always unless it could not run (2); findings are printed as FAIL lines. */
import fs from 'node:fs';
import path from 'node:path';
import { engineOf, tape } from '../../scripts/lib/worldUclFleet.mjs';
import { chromium } from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const SHOTS = path.join(process.env.RC_OUT || '/tmp/walk-out', 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const cannot = why => { console.log(`walk: could not run. ${why}`); process.exit(2); };
const OPTS = { skipHalftime: true, noCoach: true };
const findings = [];
const finding = (where, what) => { findings.push(`${where}: ${what}`); console.log(`   FAIL ${where}: ${what}`); };
function runner(seed) { let k = 0; return fn => { k += 1; return tape((seed * 0x9e3779b1 + k * 7919) >>> 0, fn).value; }; }
function play(M, st, T, stop = null) {
  for (let i = 0; i < 300; i += 1) {
    if (stop && stop(st, i)) return st;
    const r = T(() => M.cm.playNextEntry(st, OPTS));
    st = r.state;
    if (r.kind === 'seasonOver') return st;
  }
  throw new Error('season did not end');
}
function saved(M, s) { M.store.clear(); if (!M.cm.saveCareer(s)) cannot('the engine refused to save'); return [...M.store.entries()]; }
const brief = s => { const d = s.worldComps?.dsc, u = s.worldComps?.usc; return `${s.clubName} s${s.season} w${s.week}; dsc ${d ? `${d.row} ${d.skip ?? d.clubs.join(' v ')}` : 'none'}; usc ${u ? `${u.row} ${u.skip ?? u.clubs.join(' v ')}` : 'none'}`; };

const E = await engineOf(ROOT, 'walk-head', {}, cannot);
const saves = {};
{
  let M = await E.fresh(); let T = runner(11);
  const ita = T(() => M.cm.startCareer('Juventus'));
  saves.ita = saved(M, ita); console.log(`save ita: ${brief(ita)}`);
  const itaDec = play(M, ita, T, s => M.cm.oneOffNightsDone(s) >= 1);
  saves.itaDec = saved(M, itaDec); console.log(`save itaDec: ${brief(itaDec)}; eval ${JSON.stringify(M.cm.evalOneOff(itaDec)?.fixtures ?? null)?.slice(0, 200)}`);
  M = await E.fresh(); T = runner(12);
  const ger = T(() => M.cm.startCareer('Bayer Leverkusen'));
  saves.ger = saved(M, ger); console.log(`save ger: ${brief(ger)}; eval ${JSON.stringify(M.cm.evalOneOff(ger)?.fixtures ?? null)?.slice(0, 200)}`);
  M = await E.fresh(); T = runner(13);
  let ch = T(() => M.cm.startCareer('Chelsea'));
  ch = play(M, ch, T);
  ch = T(() => M.cm.finishSeason(ch)).state;
  ch = T(() => M.cm.startNextSeason(ch));
  ch = play(M, ch, T, s => M.cm.oneOffNightsDone(s, 'usc') >= 1);
  saves.usc2 = saved(M, ch); console.log(`save usc2: ${brief(ch)}; eval ${JSON.stringify(M.cm.evalOneOff(ch, undefined, 'usc')?.fixtures ?? null)?.slice(0, 200)}`);
  M = await E.fresh(); T = runner(16);
  const inter = T(() => M.cm.startCareer('Inter Milan'));
  saves.inter = saved(M, inter); console.log(`save inter: ${brief(inter)}`);
  /* A REAL Champions League winner (p-real: Bayern Munich, seed 1) in season two, before and after its night. */
  M = await E.fresh(); T = runner(1);
  let by = T(() => M.cm.startCareer('Bayern Munich'));
  by = play(M, by, T);
  by = T(() => M.cm.finishSeason(by)).state;
  by = T(() => M.cm.startNextSeason(by));
  saves.mine0 = saved(M, by); console.log(`save mine0: ${brief(by)}`);
  by = play(M, by, T, s => M.cm.oneOffNightsDone(s, 'usc') >= 1);
  saves.mine1 = saved(M, by); console.log(`save mine1: ${brief(by)}; mine ${JSON.stringify(by.worldComps?.usc?.mine ?? null)}; cabinet ${(by.trophies ?? []).filter(t => t.name === 'UEFA Super Cup').length}`);
  const B0 = await engineOf(ROOT, 'walk-b0', { base: '92290f81' }, cannot);
  const Mb = await B0.fresh(); const Tb = runner(14);
  const old = play(Mb, Tb(() => Mb.cm.startCareer('Juventus')), Tb, (s, i) => i >= 12);
  saves.oldIta = saved(Mb, old); console.log(`save oldIta (base 92290f81): Juventus s${old.season} w${old.week}`);
  const B1 = await engineOf(ROOT, 'walk-b1', { base: '77556430' }, cannot);
  const M1 = await B1.fresh(); const T1 = runner(15);
  let o1 = play(M1, T1(() => M1.cm.startCareer('Chelsea')), T1);
  o1 = T1(() => M1.cm.finishSeason(o1)).state;
  const items = saved(M1, o1);
  const Mh = await E.fresh(); for (const [k, v] of items) Mh.store.set(k, v);
  let h1 = Mh.cm.loadCareer();
  if (!h1) cannot('the head could not load the pre-1509 save');
  h1 = T1(() => Mh.cm.startNextSeason(h1));
  saves.old1509 = saved(Mh, h1); console.log(`save old1509 (base 77556430, rolled on the head): ${brief(h1)}`);
}

/* ---------- the page ---------- */
const url = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
for (let i = 0; i < 60; i += 1) {
  if (await fetch(`${url}/robots.txt`).then(r => r.ok).catch(() => false)) break;
  if (i === 59) cannot(`nothing is served at ${url}`);
  await new Promise(r => setTimeout(r, 500));
}
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
async function press(page, loc, ms = 3000) {
  try { await loc.first().waitFor({ state: 'visible', timeout: ms }); await loc.first().evaluate(el => el.click()); await page.waitForTimeout(400); return true; } catch { return false; }
}
const flat = async (page, sel) => ((await page.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
async function measure(page, where) {
  const m = await page.evaluate(() => {
    const root = document.querySelector('[data-cm-cups-view]');
    if (!root) return null;
    const vw = window.innerWidth;
    const words = el => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const shown = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const out = { short: [], small: [], cut: [], overlap: [], sideways: document.scrollingElement.scrollWidth > vw + 1, anims: document.getAnimations().filter(a => a.playState === 'running').length };
    const ctl = [...root.querySelectorAll('button, a')].filter(shown);
    for (const el of ctl) { const h = el.getBoundingClientRect().height; if (h < 43.5) out.short.push(`"${words(el)}" ${h.toFixed(1)} px`); }
    for (let i = 0; i < ctl.length; i += 1) for (let j = i + 1; j < ctl.length; j += 1) {
      if (ctl[i].contains(ctl[j]) || ctl[j].contains(ctl[i])) continue;
      const a = ctl[i].getBoundingClientRect(), b = ctl[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) out.overlap.push(`"${words(ctl[i])}" on "${words(ctl[j])}"`);
    }
    for (const el of root.querySelectorAll('*')) {
      if (!shown(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const st = getComputedStyle(el), r = el.getBoundingClientRect();
      if (parseFloat(st.fontSize) < 11.95) out.small.push(`"${words(el)}" ${st.fontSize}`);
      if (r.right > vw + 1 || r.left < -1) out.cut.push(`"${words(el)}" runs off the screen`);
      if ((st.overflowX === 'hidden' || st.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1) out.cut.push(`"${words(el)}" is cut by its box`);
    }
    return out;
  });
  if (!m) { finding(where, 'no Cups view on the page'); return; }
  for (const s of m.short) finding(where, `control under 44 px: ${s}`);
  for (const s of m.small) finding(where, `text under 12 px: ${s}`);
  for (const s of m.cut) finding(where, s);
  for (const s of m.overlap) finding(where, `controls overlap: ${s}`);
  if (m.sideways) finding(where, 'the page scrolls sideways');
  console.log(`   ${where}: measured, running animations ${m.anims}`);
}
async function visit(browser, key, [w, h], motion) {
  const tag = `${key}-${w}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.route(BLOCK, r => r.abort());
  try {
    await page.goto(`${url}/robots.txt`);
    await page.evaluate(entries => { localStorage.clear(); for (const [k, v] of entries) localStorage.setItem(k, v); }, saves[key]);
    await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await press(page, page.getByRole('button', { name: /^Essential only$/i }), 1500);
    await press(page, page.getByRole('button', { name: 'Resume Career', exact: true }), 5000);
    await page.waitForTimeout(800);
    if (key.startsWith("mine") || key === "oldIta") await page.screenshot({ path: path.join(SHOTS, `${tag}-hub.jpg`), type: "jpeg", quality: 55 }).catch(() => {});
    const okCups = await press(page, page.getByRole('button').filter({ has: page.getByText('Cups', { exact: true }) }), 20000);
    if (!okCups || !(await page.locator('[data-cm-cups-view="tiles"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false))) { finding(tag, 'the Cups panel did not open'); return; }
    await page.waitForTimeout(500);
    await measure(page, `${tag} tiles`);
    await page.screenshot({ path: path.join(SHOTS, `${tag}-tiles.jpg`), type: "jpeg", quality: 55 }).catch(() => {});
    for (const t of ['dsc', 'usc']) {
      const tileSel = `[data-cm-world-tile="${t}"]`;
      console.log(`${tag} tile ${t}: ${(await page.locator(tileSel).count()) ? await flat(page, tileSel) : 'NO TILE'}`);
      if (!(await page.locator(tileSel).count())) continue;
      await page.locator(tileSel).first().scrollIntoViewIfNeeded().catch(() => {});
      const before = await page.evaluate(() => [Math.round(window.scrollY), document.scrollingElement.scrollHeight]);
      if (!(await press(page, page.locator(tileSel)))) { finding(tag, `the ${t} tile could not be pressed`); continue; }
      await page.waitForTimeout(500);
      await page.locator("[data-cm-cups-view]").first().screenshot({ path: path.join(SHOTS, `${tag}-${t}-card.jpg`), type: "jpeg", quality: 60 }).catch(() => {});
      console.log(`${tag} card ${t}: ${(await flat(page, '[data-cm-cups-view]')).slice(0, 900)}`);
      await measure(page, `${tag} ${t} card`);
      if (!(await press(page, page.locator('[data-cm-world-back]')))) { finding(tag, `no back button on the ${t} card`); continue; }
      await page.waitForTimeout(600);
      const after = await page.evaluate(() => [Math.round(window.scrollY), document.scrollingElement.scrollHeight]);
      if (Math.abs(after[0] - before[0]) > 1 || Math.abs(after[1] - before[1]) > 1) finding(tag, `back from ${t}: scrollY ${before[0]} then ${after[0]}, height ${before[1]} then ${after[1]}`);
    }
    if (errors.length) finding(tag, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}
const browser = await chromium.launch();
try {
  for (const key of Object.keys(saves)) {
    for (const size of [[390, 844], [1280, 900]]) {
      for (const motion of ['reduce', 'no-preference']) {
        if (motion === 'no-preference' && !(key === 'ita' && size[0] === 390)) continue;
        await visit(browser, key, size, motion);
      }
    }
  }
} finally { await browser.close(); }
console.log(`walk: ${findings.length} findings${findings.length ? `: ${findings.slice(0, 4).join(' / ')}` : ''}`);
process.exit(0);
