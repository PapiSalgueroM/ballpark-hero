/* Round 1605 adversarial review walk (run lens, never committed). Plays the lifted controls the way a player meets
   them with the cookie banner unanswered, then answered, at phone, desktop, short laptop and landscape phone sizes,
   reduced motion on and off. Reads boxes, hit tests each control's centre (elementFromPoint), scrolls to the page
   bottom, taps the control for real, and saves screenshots into RC_OUT. It asserts nothing: it prints FLAG lines. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-walk');
fs.mkdirSync(OUT, { recursive: true });
const BANNER = '[role="region"][aria-label="Cookie choices"]';
const flags = [];
const rows = [];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
async function makeCareer() {
  const { build } = await import('esbuild');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rv1605-'));
  const out = path.join(tmp, 'career.mjs');
  const lib = f => JSON.stringify(path.join(ROOT, 'src/lib', f).split(path.sep).join('/'));
  await build({
    stdin: { contents: `export * as E from ${lib('soccerCareerEngine.ts')}; export * as S from ${lib('soccerCareerSave.ts')};`, resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  });
  if (!globalThis.localStorage) globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const { E, S } = await import(pathToFileURL(out).href);
  const real = Math.random; Math.random = mulberry(1605);
  const stat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  let s; try { s = E.initCareer('Probe', 'England', 'ST', '2020s', stat(62), 62, 2020, E.FALLBACK_CLUBS, null); } finally { Math.random = real; }
  return S.serializeSoccerCareerSave(s);
}

/* in page: boxes, hit tests and scroll facts for named controls */
function snapInPage({ BANNER, want }) {
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width >= 2 && r.height >= 2 && s.display !== 'none' && s.visibility !== 'hidden'; };
  const box = r => ({ top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) });
  const banner = [...document.querySelectorAll(BANNER)].find(vis) || null;
  const out = { vh: innerHeight, vw: innerWidth, scrollY: Math.round(scrollY), maxScroll: document.documentElement.scrollHeight - innerHeight,
    pending: document.body.dataset.consentPending != null, banner: banner ? box(banner.getBoundingClientRect()) : null, controls: {} };
  for (const [k, w] of Object.entries(want)) {
    const el = [...document.querySelectorAll(w.sel)].find(e => vis(e) && (!w.text || (e.textContent || '').includes(w.text)));
    if (!el) { out.controls[k] = null; continue; }
    const r = el.getBoundingClientRect();
    const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), cy = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
    const at = document.elementFromPoint(cx, cy);
    const cs = getComputedStyle(el);
    out.controls[k] = { ...box(r), position: cs.position, bottomCss: cs.bottom, hit: !!at && (el === at || el.contains(at)),
      atIs: at ? `${at.tagName.toLowerCase()}${banner && banner.contains(at) ? ' (banner)' : ''}` : 'nothing', onScreen: r.bottom > 0 && r.top < innerHeight };
  }
  return out;
}
function dismissInPage({ BANNER }) {
  const banner = document.querySelector(BANNER);
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width >= 2 && r.height >= 2 && s.display !== 'none' && s.visibility !== 'hidden'; };
  const d = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')].filter(x => vis(x) && !(banner && banner.contains(x))).pop();
  if (!d) return '';
  const label = b => ((b.textContent || '').trim() || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 30);
  const btns = [...d.querySelectorAll('button,[role="button"]')].filter(b => vis(b) && !b.disabled);
  const GO = /^(let'?s (go|play|start|do (it|this))|play|start|got it|continue|begin|ok|okay|i'?m ready|ready|kick ?off|go|done|enter)\b/i;
  const pick = btns.find(b => GO.test(label(b))) || btns.find(b => /\bbg-primary\b/.test(String(b.className))) || btns.find(b => /close|dismiss/i.test(label(b)));
  if (!pick) return 'stuck';
  pick.click();
  return label(pick);
}
function stepInPage({ BANNER, text, sibling }) {
  const banner = document.querySelector(BANNER);
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width >= 2 && r.height >= 2 && s.display !== 'none' && s.visibility !== 'hidden'; };
  const norm = el => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const re = new RegExp(text);
  const ok = b => vis(b) && !b.disabled && !(banner && banner.contains(b));
  const btn = [...document.querySelectorAll('button')].find(b => ok(b) && re.test(norm(b)));
  if (!btn) return `no button reads /${text}/`;
  const target = sibling ? [...(btn.parentElement?.children ?? [])].find(b => b !== btn && b.matches('button') && ok(b)) : btn;
  if (!target) return 'no sibling';
  target.click();
  return '';
}
function answerInPage({ BANNER }) {
  const b = document.querySelector(BANNER);
  const btn = b && b.querySelector('button');
  if (!btn) return 'no banner button';
  btn.click();
  return (btn.textContent || '').trim().slice(0, 30);
}

/* SCENARIOS */
const careerSave = await makeCareer();
const browser = await pw.chromium.launch();
async function open(route, [w, h], rm, init) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm });
  if (init) await ctx.addInitScript(init.fn, init.arg);
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  for (let i = 0; i < 3; i += 1) { const d = await page.evaluate(dismissInPage, { BANNER }); if (!d) break; await page.waitForTimeout(700); }
  return { ctx, page };
}
const plant = ({ entries }) => { try { if (sessionStorage.getItem('rv1605-planted')) return; sessionStorage.setItem('rv1605-planted', '1'); for (const [k, v] of entries) localStorage.setItem(k, v); } catch {} };
function judge(tag, snap, names) {
  const row = { tag, ...snap }; rows.push(row);
  const bb = snap.banner;
  const parts = [];
  for (const n of names) {
    const c = snap.controls[n];
    if (!c) { parts.push(`${n}=MISSING`); flags.push(`${tag} ${n} not on the page`); continue; }
    const gap = bb ? bb.top - c.bottom : snap.vh - c.bottom;
    parts.push(`${n}[${c.top}..${c.bottom} ${c.position} b=${c.bottomCss} hit=${c.hit ? 'y' : `NO(${c.atIs})`} gap=${gap}]`);
    if (!c.onScreen || c.top < 0) flags.push(`${tag} ${n} OFF SCREEN (top ${c.top}, bottom ${c.bottom}, vh ${snap.vh})`);
    else if (!c.hit) flags.push(`${tag} ${n} not tappable at its centre: ${c.atIs} is there`);
    if (bb && c.bottom > bb.top + 1 && c.onScreen) flags.push(`${tag} ${n} meets the banner by ${c.bottom - bb.top} px`);
  }
  console.log(`${tag} pending=${snap.pending} banner=${bb ? `${bb.top}..${bb.bottom}` : 'none'} scroll=${snap.scrollY}/${snap.maxScroll} ${parts.join(' ')}`);
}
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };
const HUB = { bar: { sel: '[data-career-action-bar="floating"]' }, training: { sel: '[data-career-utility="training"]' }, phone: { sel: '[data-career-utility="phone"]' } };

/* RV_PART limits a run: hub, cm, wc, setaside (comma list); default all */
const PART = (process.env.RV_PART || 'hub,cm,wc,setaside').split(',');
/* 1. Soccer Career hub: top, page bottom, answered (bottom and top) */
if (PART.includes('hub')) for (const [vp, rm] of [[[320, 640], 'no-preference'], [[390, 844], 'no-preference'], [[390, 844], 'reduce'], [[1280, 900], 'no-preference'], [[1280, 900], 'reduce'], [[1280, 720], 'no-preference'], [[844, 390], 'no-preference'], [[768, 1024], 'no-preference']]) {
  const tag = `hub-${vp[0]}x${vp[1]}${rm === 'reduce' ? '-rm' : ''}`;
  const { ctx, page } = await open('/soccer-career', vp, rm, { fn: plant, arg: { entries: [['soccerCareerSave', careerSave]] } });
  judge(`${tag} top`, await page.evaluate(snapInPage, { BANNER, want: HUB }), ['bar', 'training', 'phone']);
  await shot(page, `${tag}-top`);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(900);
  judge(`${tag} pagebottom`, await page.evaluate(snapInPage, { BANNER, want: HUB }), ['bar', 'training', 'phone']);
  await shot(page, `${tag}-pagebottom`);
  if (vp[0] >= 640) {
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(700);
    const t = await page.evaluate(snapInPage, { BANNER, want: HUB });
    const tr = t.controls.training;
    if (tr) { await page.mouse.click((tr.left + tr.right) / 2, (tr.top + tr.bottom) / 2); await page.waitForTimeout(1500);
      const opened = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].filter(d => d.getBoundingClientRect().height > 50 && !d.closest('[aria-label="Cookie choices"]')).map(d => (d.getAttribute('aria-label') || d.textContent || '').trim().slice(0, 40)));
      console.log(`${tag} real tap on Training while pending: ${opened.length ? `opened ${JSON.stringify(opened)}` : 'NOTHING OPENED'}`);
      if (!opened.length) flags.push(`${tag} a real tap on Training opened nothing`);
      await shot(page, `${tag}-training-tapped`); await page.keyboard.press('Escape'); await page.waitForTimeout(600); }
  }
  const a = await page.evaluate(answerInPage, { BANNER }); await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(900);
  judge(`${tag} answered(${a}) pagebottom`, await page.evaluate(snapInPage, { BANNER, want: HUB }), ['bar', 'training', 'phone']);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(900);
  judge(`${tag} answered top`, await page.evaluate(snapInPage, { BANNER, want: HUB }), ['bar', 'training', 'phone']);
  await shot(page, `${tag}-answered-top`);
  await ctx.close();
}

/* 2. Club Manager: Take the job and Found the club, pending, real tap, then answered */
const CM_STEPS = [{ text: 'Today\\.' }, { text: '^\\s*England' }, { text: 'Strongest sides' }];
async function cmTo(page, last) {
  for (const st of [...CM_STEPS, last]) {
    const why = await page.evaluate(stepInPage, { BANNER, ...st });
    if (why) return why;
    await page.waitForTimeout(900);
    for (let i = 0; i < 2; i += 1) { const d = await page.evaluate(dismissInPage, { BANNER }); if (!d) break; await page.waitForTimeout(600); }
  }
  return '';
}
const CM = { take: { sel: 'button', text: 'Take the job' } };
const CUSTOM = { found: { sel: 'button', text: 'Found the club' } };
if (PART.includes("cm")) for (const [vp, rm] of [[[320, 640], 'no-preference'], [[390, 844], 'no-preference'], [[390, 844], 'reduce'], [[1280, 900], 'no-preference'], [[844, 390], 'no-preference']]) {
  const tag = `cm-${vp[0]}x${vp[1]}${rm === 'reduce' ? '-rm' : ''}`;
  let { ctx, page } = await open('/club-manager', vp, rm);
  let why = await cmTo(page, { text: 'Create your own club', sibling: true });
  if (why) { flags.push(`${tag} could not reach the picked club: ${why}`); console.log(`${tag} STUCK ${why}`); await shot(page, `${tag}-stuck`); await ctx.close(); continue; }
  judge(`${tag} picked`, await page.evaluate(snapInPage, { BANNER, want: CM }), ['take']);
  await shot(page, `${tag}-picked`);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(700);
  judge(`${tag} picked pagebottom`, await page.evaluate(snapInPage, { BANNER, want: CM }), ['take']);
  await shot(page, `${tag}-picked-pagebottom`);
  const t = (await page.evaluate(snapInPage, { BANNER, want: CM })).controls.take;
  if (t) {
    await page.mouse.click((t.left + t.right) / 2, (t.top + t.bottom) / 2); await page.waitForTimeout(2500);
    const after = await page.evaluate(() => ({ still: [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes('Take the job') && b.getBoundingClientRect().height > 2),
      h: [...document.querySelectorAll('h1,h2,[role="dialog"] h2,[role="dialog"]')].map(e => (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)).slice(0, 4) }));
    console.log(`${tag} real tap on Take the job while pending: Take the job still there=${after.still}; now showing ${JSON.stringify(after.h)}`);
    await shot(page, `${tag}-take-tapped`);
  }
  await ctx.close();
  ({ ctx, page } = await open('/club-manager', vp, rm));
  why = await cmTo(page, { text: 'Create your own club', sibling: true });
  if (!why) {
    const a = await page.evaluate(answerInPage, { BANNER }); await page.waitForTimeout(1000);
    judge(`${tag} picked answered(${a})`, await page.evaluate(snapInPage, { BANNER, want: CM }), ['take']);
    await shot(page, `${tag}-picked-answered`);
  }
  await ctx.close();
  if (vp[0] === 1280 || vp[0] === 320 || vp[1] === 390) {
    ({ ctx, page } = await open('/club-manager', vp, rm));
    why = await cmTo(page, { text: 'Create your own club' });
    if (why) flags.push(`${tag} could not reach the custom club form: ${why}`);
    else { judge(`${tag} custom`, await page.evaluate(snapInPage, { BANNER, want: CUSTOM }), ['found']); await shot(page, `${tag}-custom`); }
    await ctx.close();
  }
}

/* 3. World Cup 2026 Bracket: Auto Fill Everything pending, real tap, answered */
if (PART.includes("wc")) for (const vp of [[390, 844], [1280, 900], [320, 640]]) {
  const tag = `wc-${vp[0]}x${vp[1]}`;
  const { ctx, page } = await open('/world-cup-bracket', vp, 'no-preference');
  const W = { auto: { sel: 'button', text: 'Auto Fill Everything' } };
  judge(`${tag} load`, await page.evaluate(snapInPage, { BANNER, want: W }), ['auto']);
  await shot(page, `${tag}-load`);
  const a = await page.evaluate(answerInPage, { BANNER }); await page.waitForTimeout(1200);
  judge(`${tag} answered(${a})`, await page.evaluate(snapInPage, { BANNER, want: W }), ['auto']);
  await ctx.close();
}

/* 4. The kept aside save card (BrokenSaveRestore, fixed bottom-4 z-50) with the banner pending: outside the net */
if (PART.includes("setaside")) for (const vp of [[390, 844], [1280, 900]]) {
  const tag = `setaside-${vp[0]}x${vp[1]}`;
  const { ctx, page } = await open('/soccer-career', vp, 'no-preference', { fn: plant, arg: { entries: [['soccerCareerSave.broken-2026-10-29T12-00-00', careerSave]] } });
  await page.waitForTimeout(1500);
  const S = { card: { sel: '[data-dukb-set-aside]' }, firstButton: { sel: '[data-dukb-set-aside] button' } };
  judge(`${tag} load`, await page.evaluate(snapInPage, { BANNER, want: S }), ['card', 'firstButton']);
  await shot(page, `${tag}-load`);
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'review-walk.json'), JSON.stringify(rows, null, 1));
console.log(`FLAGS (${flags.length}):`);
for (const f of flags) console.log(`FLAG ${f}`);
console.log(`review walk DONE: ${rows.length} reads, ${flags.length} flags`);
