// Fix pass 2 walk for Round 1543, closing check F3 (runner only, #!serve #!playwright). The reviewer's old save
// (49 wins, 140 goals, every non ladder rung held, base rungs aw1 aw10 ag25 ag100 win1 win10 goals25 held) opens on
// the head; its first tick owes win50 (milestone), aw50 and ag500 (badges). Sampled every 60 ms for 10 s:
//   - no two announcement floaters (a milestone or a badge) that are VISIBLE at the same moment overlap
//     by more than 5 percent of the smaller box, and every one of the three is seen visible at some point;
//   - the badge line names both badges, one after the other.
//   - no announcement floater is more than 10 percent under the badge line.
//   WALKF3_CONTROL=pile clones every announcement floater 8 px to its right: the overlap check must FIRE.
//   WALKF3_CONTROL=low pins every floater at top 47 percent: the badge line check must FIRE on the phone.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';
import { build } from 'esbuild';

const ROOT = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.walk-out');
const CONTROL = process.env.WALKF3_CONTROL || '';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'stadiumTycoonSaveV1';
const LADDER = new Set(['win1', 'win10', 'win50', 'goals25', 'streak5', 'aw1', 'aw10', 'aw50', 'aw150', 'aw400', 'ag25', 'ag100', 'ag500', 'ag2000', 'as5', 'as10']);
const etmp = fs.mkdtempSync(path.join(os.tmpdir(), 'walkf3-'));
await build({ entryPoints: [path.join(ROOT, 'src/lib/stadiumTycoon.ts')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(etmp, 'e.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const T = await import(pathToFileURL(path.join(etmp, 'e.mjs')).href);
let failures = 0; const fail = m => { failures += 1; console.error(`  FAIL: ${m}`); };
const facts = {};
const browser = await chromium.launch();
const context = async (w, h, reduced) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co|googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
  return ctx;
};
async function freshSave(ctx) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
  await p.waitForFunction(k => !!localStorage.getItem(k), KEY, { timeout: 20000 });
  const fresh = JSON.parse(await p.evaluate(k => localStorage.getItem(k), KEY));
  await p.close({ runBeforeUnload: true });
  return fresh;
}
const oldSave = fresh => {
  const s0 = { ...fresh, totalWins: 49, totalGoals: 140, totalMatches: 80, streak: 0, lifetime: 2e6, money: 50000 };
  const keepAch = T.ACHIEVEMENTS.filter(a => !LADDER.has(a.id) && a.hit(s0)).map(a => a.id);
  const keepMs = T.MILESTONES.filter(m => !LADDER.has(m.id) && m.hit(s0)).map(m => m.id);
  return { ...s0, ach: [...keepAch, 'aw1', 'aw10', 'ag25', 'ag100'], claimed: [...keepMs, 'win1', 'win10', 'goals25'] };
};
const LOW_CSS = '.st-float { top: 47% !important; }';
async function plant(ctx, save) {
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(({ k, v, ctl, low }) => {
    if (sessionStorage.getItem('walkf3-planted')) return;
    sessionStorage.setItem('walkf3-planted', '1');
    const s = JSON.parse(v); s.savedAt = Date.now() - 5000; localStorage.setItem(k, JSON.stringify(s));
    Math.random = () => 0.999;
    if (ctl === 'low') document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = low; document.head.appendChild(st); });
    if (ctl === 'pile') document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver(recs => { for (const r of recs) for (const n of r.addedNodes) {
        if (n.nodeType === 1 && n.classList.contains('st-float') && !n.dataset.clone && /^🏁|forever$/.test((n.textContent || '').trim())) { const c = n.cloneNode(true); c.dataset.clone = '1'; c.style.left = `calc(${n.style.left} + 8px)`; n.after(c); }
      } }).observe(document.body, { childList: true, subtree: true });
    });
  }, { k: KEY, v: JSON.stringify(save), ctl: CONTROL, low: LOW_CSS });
  await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'domcontentloaded' });
  return { page, errors };
}
const sample = () => {
  const ann = [...document.querySelectorAll('.st-float')].filter(e => /^🏁|forever$/.test((e.textContent || '').trim()));
  const vis = ann.map(e => { const r = e.getBoundingClientRect(); return { t: (e.textContent || '').trim(), x: r.x, y: r.y, w: r.width, h: r.height, o: Number(getComputedStyle(e).opacity) }; }).filter(f => f.o > 0.05);
  const line = (document.body.innerText.match(/🏅 Badge earned: [^\n]*/) || [''])[0];
  const lineEl = [...document.querySelectorAll('p')].find(p => (p.textContent || '').startsWith('🏅 Badge earned'));
  const lr = lineEl ? lineEl.getBoundingClientRect() : null;
  return { vis, line, lineBox: lr ? { x: lr.x, y: lr.y, w: lr.width, h: lr.height } : null };
};
const cover = (a, b) => {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)); const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return (100 * ix * iy) / Math.max(1, Math.min(a.w * a.h, b.w * b.h));
};
const OWED = ['35 wins', '35 career wins', '75 goals'];
const sizes = CONTROL ? [[390, 844, false]] : [[390, 844, false], [390, 844, true], [1280, 900, false], [1280, 900, true]];
for (const [w, h, reduced] of sizes) {
  const tag = `${w}x${h}${reduced ? '-reduced' : ''}`; const f = facts[tag] = { worst: 0, worstPair: '', seen: [], lines: [], overLine: 0, together: 0 };
  const ctx = await context(w, h, reduced);
  const { page, errors } = await plant(ctx, oldSave(await freshSave(ctx)));
  const t0 = Date.now(); let shots = 0;
  while (Date.now() - t0 < 10000) {
    const s = await page.evaluate(sample);
    for (const v of s.vis) if (!f.seen.includes(v.t)) f.seen.push(v.t);
    if (s.line && f.lines[f.lines.length - 1] !== s.line) f.lines.push(s.line);
    f.together = Math.max(f.together, s.vis.length);
    for (let i = 0; i < s.vis.length; i += 1) {
      for (let j = i + 1; j < s.vis.length; j += 1) { const c = cover(s.vis[i], s.vis[j]); if (c > f.worst) { f.worst = Math.round(c); f.worstPair = `"${s.vis[i].t}" and "${s.vis[j].t}"`; } }
      if (s.lineBox) f.overLine = Math.max(f.overLine, Math.round(cover(s.vis[i], s.lineBox)));
    }
    if ((shots === 0 && s.vis.length >= 2) || (shots === 1 && Date.now() - t0 > 2600 && s.vis.length >= 1)) {
      await page.screenshot({ path: path.join(OUT, `${CONTROL ? `${CONTROL}-` : ''}f3-${shots ? 'wave2' : 'wave1'}-${tag}.png`) }); shots += 1;
    }
    await page.waitForTimeout(60);
  }
  if (CONTROL === 'pile') {
    if (f.worst > 5) fail(`${tag} control FIRED: cloned floaters overlap ${f.worst} percent (${f.worstPair})`);
    else fail(`${tag} control did NOT fire: cloned floaters overlap only ${f.worst} percent`);
  } else if (CONTROL === 'low') {
    if (f.overLine > 10) fail(`${tag} control FIRED: a floater at 47 percent is ${f.overLine} percent under the badge line`);
    else fail(`${tag} control did NOT fire: a floater at 47 percent is only ${f.overLine} percent under the badge line`);
  } else {
    if (f.worst > 5) fail(`${tag}: two visible floaters overlap ${f.worst} percent (${f.worstPair})`);
    if (f.overLine > 10) fail(`${tag}: a floater is ${f.overLine} percent under the badge line`);
    for (const o of OWED) if (!f.seen.some(t => t.includes(o))) fail(`${tag}: "${o}" was never seen on the pitch`);
    for (const o of ['35 career wins', '75 goals']) if (!f.lines.some(l => l.includes(o))) fail(`${tag}: the badge line never named "${o}"`);
  }
  if (errors.length) fail(`${tag}: page errors ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, `${CONTROL ? `${CONTROL}-` : ''}walkf3.json`), JSON.stringify(facts, null, 2));
for (const [k, v] of Object.entries(facts)) console.log(`  ${k}: ${JSON.stringify(v).slice(0, 700)}`);
console.log(`walkf3${CONTROL ? ` (control ${CONTROL})` : ''}: ${failures ? `${failures} failure${failures === 1 ? '' : 's'}` : 'green'}`);
process.exit(failures ? 1 : 0);
