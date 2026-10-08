/* REVIEWER walk for Round 1141: the BUILT app under Google's REAL page translator (website translate element),
   Soccer Career's create flow, seasons, then "show original". Network: the local server and Google's translate
   hosts only; supabase.co and everything else is aborted. Shots and a JSON go to RC_OUT.
   node .rc/x/rv-walk.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/+$/, '');
const OUT = process.env.RC_OUT || path.join(process.cwd(), '.tmp-fx', 'rv-out');
fs.mkdirSync(OUT, { recursive: true });
const TL = process.env.TL || 'pt';
const PRESSES = Number(process.env.PRESSES || 14);
const AFTER = Number(process.env.AFTER || 8);
const SIZES = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } };
const ALL = [
  { name: 'phone-motion', view: 'phone', motion: 'no-preference', translate: true },
  { name: 'desktop-reduce', view: 'desktop', motion: 'reduce', translate: true },
  { name: 'phone-nolive', view: 'phone', motion: 'no-preference', translate: true, nolive: true },
  { name: 'phone-centre', view: 'phone', motion: 'no-preference', translate: true, centre: true },
  { name: 'desktop-centre', view: 'desktop', motion: 'reduce', translate: true, centre: true },
  { name: 'phone-centre-nolive', view: 'phone', motion: 'no-preference', translate: true, centre: true, nolive: true },
];
const ONLY = process.env.VARIANTS ? process.env.VARIANTS.split(',') : null;
const VARIANTS = ONLY ? ALL.filter(v => ONLY.includes(v.name)) : ALL;
const ALLOW = [/^127\.0\.0\.1$/, /^localhost$/, /^translate\.google\.com$/, /^translate\.googleapis\.com$/, /^translate-pa\.googleapis\.com$/, /^www\.gstatic\.com$/];
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/* the flagship walker's own advancing actions and skip rule, read from its text */
const src = fs.readFileSync(path.join(process.cwd(), 'scripts/playSoccerCareer.mjs'), 'utf8');
const at = src.indexOf('const ACTIONS = [');
const body = src.slice(at, src.indexOf('];', at)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const ACTIONS = [...body.matchAll(/'([^']+)'/g)].map(m => m[1]);
const skipLine = src.split('\n').find(l => l.startsWith('const SKIP = /'));
const SKIP = skipLine.slice(skipLine.indexOf('/') + 1, skipLine.lastIndexOf('/'));
const NEVER = 'Report a bug|Light mode|Dark mode|Cookie|Sign up|Sign in|Log in|Log out|Essential only|Share|Copy|Install|Delete|Reset|New Career|Start over|Retire|\\bBack\\b|^Home$';

/* ---------------- page side: runs before the app boots ---------------- */
function pageInit(cfg) {
  if (cfg.nolive) window.__DUKB_NO_TRANSLATE_LIVE__ = true;
  if (cfg.translate) { try { document.cookie = `googtrans=/en/${cfg.tl}; path=/`; } catch (e) { /* nothing */ } }
  /* a seeded Math.random so the walks can be compared */
  let s = cfg.seed >>> 0;
  Math.random = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rv = (window.__rv = { swaps: 0, backs: 0 });
  /* what each translator wrapper stood for, in the words its text node held when it left */
  const seen = new WeakSet();
  const mo = new MutationObserver(recs => {
    for (const r of recs) {
      for (const n of r.removedNodes) {
        if (n.nodeType !== 3) continue;
        const p = r.previousSibling;
        if (p && p.nodeName === 'FONT' && p.__orig === undefined) { p.__orig = n.nodeValue; seen.add(n); rv.swaps += 1; }
      }
      for (const n of r.addedNodes) if (n.nodeType === 3 && seen.has(n)) rv.backs += 1;
    }
  });
  const start = () => mo.observe(document, { childList: true, subtree: true });
  if (document.documentElement) start(); else document.addEventListener('readystatechange', start, { once: true });
  rv.takenBefore = n => seen.has(n);
  const isWrap = n => n.nodeType === 1 && n.nodeName === 'FONT' && !Object.keys(n).some(k => k.startsWith('__reactFiber$'));
  rv.isWrap = isWrap;
  rv.origText = el => {
    let out = '';
    const go = n => {
      if (n.nodeType === 3) { out += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      if (isWrap(n) && n.__orig !== undefined) { out += n.__orig; return; }
      for (const c of n.childNodes) go(c);
    };
    go(el);
    return out;
  };
  const SKIPTAG = /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT|TITLE|IFRAME|CODE|OPTION)$/;
  /* text the translator has not reached yet: bare text nodes with letters in them, under #root and portals */
  rv.pending = () => {
    let n = 0;
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let t = tw.nextNode(); t; t = tw.nextNode()) {
      if (!/\S/.test(t.nodeValue)) continue;
      const p = t.parentElement;
      if (!p || p.closest('font,script,style,textarea,noscript,code,svg,[translate="no"],.notranslate,.skiptranslate,#google_translate_element')) continue;
      n += 1;
    }
    return n;
  };
  rv.fonts = () => document.querySelectorAll('#root font').length;

  /* THE JUDGE (mine, not the harness's): React's current fiber tree against the element's children.
     structure: the kinds in order (text or element) and the identity of the elements.
     raw: a bare text node must read exactly what React holds.
     digits: per run of text, the numbers on screen are the numbers React holds (words get translated, digits do not). */
  const fiberKey = el => Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'));
  const digits = str => (String(str).replace(/(\d)[.,   ](?=\d{3}(?!\d))/g, '$1').match(/\d+/g) || []).map(d => String(Number(d))).sort().join(',');
  const where = el => {
    const bits = [];
    for (let e = el, i = 0; e && e.nodeType === 1 && i < 3; e = e.parentElement, i += 1) bits.unshift(e.nodeName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/)[0] : ''));
    return bits.join('>');
  };
  rv.judge = () => {
    const rootEl = document.getElementById('root');
    const key = rootEl && fiberKey(rootEl);
    const out = { elements: 0, structure: [], raw: [], digits: [], back: 0 };
    if (!key) return out;
    let top = rootEl[key];
    while (top.return) top = top.return;
    const current = top.stateNode && top.stateNode.current ? top.stateNode.current : top;
    const flat = (fiber, list) => {
      for (let c = fiber.child; c; c = c.sibling) {
        if (c.tag === 6) list.push({ t: 'text', v: String(c.memoizedProps) });
        else if (c.tag === 5) list.push({ t: 'el', node: c.stateNode });
        else if (c.tag === 4) continue;
        else flat(c, list);
      }
    };
    const deep = (fiber, acc) => {
      for (let c = fiber.child; c; c = c.sibling) {
        if (c.tag === 6) acc.push(String(c.memoizedProps));
        else if (c.tag === 4) continue;
        else if (c.tag === 5) { const p = c.memoizedProps || {}; if (!c.child && (typeof p.children === 'string' || typeof p.children === 'number')) acc.push(String(p.children)); else deep(c, acc); }
        else deep(c, acc);
      }
      return acc;
    };
    const okUp = f0 => {
      let g = f0;
      for (let i = 0; i < 4 && g; i += 1) {
        const e = g.stateNode;
        const p = g.memoizedProps || {};
        const mine = !g.child && (typeof p.children === 'string' || typeof p.children === 'number') ? [String(p.children)] : deep(g, []);
        if (e && e.nodeType === 1 && digits(mine.join(' ')) === digits(e.textContent)) return true;
        g = g.return;
        while (g && g.tag !== 5) g = g.return;
      }
      return false;
    };
    rv.staleEls = [];
    const judgeEl = f => {
      const el = f.stateNode;
      if (!el || !el.isConnected || el.namespaceURI !== 'http://www.w3.org/1999/xhtml') return;
      if (/^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT|TITLE|IFRAME|CODE|SELECT|OPTION|INPUT)$/.test(el.nodeName)) return;
      if (el.closest('[translate="no"],.notranslate,[contenteditable="true"]')) return;
      const props = f.memoizedProps || {};
      if (props.dangerouslySetInnerHTML) return;
      const want = [];
      if (f.child) flat(f, want);
      else if (typeof props.children === 'string' || typeof props.children === 'number') { if (String(props.children) !== '') want.push({ t: 'text', v: String(props.children) }); }
      const have = [];
      for (const n of el.childNodes) {
        if (n.nodeType === 3) { if (n.nodeValue !== '') have.push({ t: 'text', v: n.nodeValue, raw: true, node: n }); }
        else if (n.nodeType === 1) {
          if (isWrap(n)) have.push({ t: 'text', v: n.textContent, font: true, orig: n.__orig });
          else if (fiberKey(n)) have.push({ t: 'el', node: n });
        }
      }
      if (!want.some(w => w.t === 'text') && !have.some(h => h.t === 'text')) return;
      out.elements += 1;
      const show = list => list.map(x => (x.t === 'el' ? '<' + x.node.nodeName.toLowerCase() + '>' : JSON.stringify(x.font ? `F:${x.v}` : x.v))).join(' ');
      const same = want.length === have.length && want.every((w, i) => w.t === have[i].t && (w.t !== 'el' || w.node === have[i].node));
      if (!same) { out.structure.push({ at: where(el), react: show(want).slice(0, 200), screen: show(have).slice(0, 200) }); return; }
      let wantRun = '';
      let haveRun = '';
      const close = () => {
        /* the translator may move a number between an element's own strings and a child's or a sibling's:
           only a number that is wrong for the element, and for the three elements around it, counts */
        if (digits(wantRun) !== digits(haveRun) && !okUp(f)) { out.digits.push({ at: where(el), react: wantRun.slice(0, 120), screen: haveRun.slice(0, 120) }); (rv.staleEls || (rv.staleEls = [])).push(el); }
        wantRun = ''; haveRun = '';
      };
      for (let i = 0; i < want.length; i += 1) {
        if (want[i].t === 'el') { close(); continue; }
        wantRun += want[i].v + ' ';
        haveRun += have[i].v + ' ';
        if (have[i].raw && have[i].v !== want[i].v) { out.raw.push({ at: where(el), react: want[i].v.slice(0, 80), screen: have[i].v.slice(0, 80) }); (rv.staleEls || (rv.staleEls = [])).push(el); }
        if (have[i].raw && seen.has(have[i].node)) out.back += 1;
      }
      close();
    };
    const walk = f => { for (; f; f = f.sibling) { if (f.tag === 5) judgeEl(f); if (f.child) walk(f.child); } };
    try { walk(current); } catch (e) { out.error = String(e).slice(0, 200); }
    return out;
  };
}

/* ---------------- node side ---------------- */
const sleep = (page, ms) => page.waitForTimeout(ms);
async function settle(W, max = 7000) {
  const { page } = W;
  await sleep(page, 380);
  if (!W.v.translate || W.restored || W.fast) { await sleep(page, 250); return 0; }
  const t0 = Date.now();
  let last = -2;
  let sameLooks = 0;
  while (Date.now() - t0 < max) {
    const p = await page.evaluate(() => window.__rv.pending()).catch(() => -1);
    sameLooks = p === last ? sameLooks + 1 : 0;
    last = p;
    if ((p === 0 && sameLooks >= 1) || (p > 0 && sameLooks >= 5)) return p;
    await sleep(page, 220);
  }
  return last;
}
async function locate(page, sel, want, how = 'includes', nth = 0) {
  return page.evaluate(([s, w, mode, n]) => {
    const rv = window.__rv;
    const label = el => rv.origText(el).replace(/\s+/g, ' ').trim() || (el.getAttribute('aria-label') || '').trim();
    const all = [...document.querySelectorAll(s)].filter(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    const hits = all.filter(el => {
      if (w === null) return true;
      const o = label(el);
      return mode === 'exact' ? o === w : mode === 'starts' ? o.startsWith(w) : o.includes(w);
    });
    const el = hits[n];
    if (!el) return { found: false, candidates: all.slice(0, 8).map(e => label(e).slice(0, 26)) };
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    window.__rvTarget = el;
    return { found: true, x, y, label: label(el).slice(0, 60), shown: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80), disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true', covered: !(top && (top === el || el.contains(top) || top.contains(el))) };
  }, [sel, want, how, nth]);
}
async function press(page, sel, want, how, nth) {
  const first = await locate(page, sel, want, how, nth);
  if (!first.found) return { ok: false, why: 'not found: ' + JSON.stringify(first.candidates) };
  if (first.disabled) return { ok: false, why: 'disabled', label: first.label };
  await sleep(page, 160);
  const at2 = await locate(page, sel, want, how, nth);
  if (!at2.found) return { ok: false, why: 'gone after the scroll' };
  if (at2.covered) { await page.evaluate(() => window.__rvTarget && window.__rvTarget.click()); return { ok: true, label: at2.label, shown: at2.shown, by: 'own click (covered)' }; }
  await page.mouse.click(at2.x, at2.y);
  return { ok: true, label: at2.label, shown: at2.shown, by: 'mouse' };
}
const ready = (page, words, ms) => page.waitForFunction(([t]) => [...document.querySelectorAll('button')].some(b => !b.disabled && window.__rv.origText(b).includes(t)), [words], { timeout: ms }).catch(() => {});
async function look(page) {
  return page.evaluate(() => {
    const rv = window.__rv;
    const text = el => rv.origText(el).replace(/\s+/g, ' ').trim();
    const j = rv.judge();
    let save = null;
    try { const raw = localStorage.getItem('soccerCareerSave'); save = raw ? JSON.parse(raw) : null; } catch (e) { save = null; }
    let header = null;
    for (const p of document.querySelectorAll('p')) {
      const m = /· Age (\d+) ·/.exec(text(p));
      if (m) { header = { react: Number(m[1]), shown: (p.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 90) }; break; }
    }
    const st = window.__dukbTranslateStats;
    return {
      boundary: [...document.querySelectorAll('h1')].some(h => text(h) === 'This page broke'),
      creation: !!document.getElementById('pname'),
      h1: [...document.querySelectorAll('h1')].map(h => (h.innerText || '').trim().slice(0, 50)).slice(0, 2),
      fonts: rv.fonts(), pending: rv.pending(), swaps: rv.swaps, backs: rv.backs,
      stats: st ? { swaps: st.swaps, removed: st.removed, inserted: st.inserted, restored: st.restored } : null,
      lang: document.documentElement.lang, cls: document.documentElement.className.slice(0, 60),
      judged: j.elements, structure: j.structure.length, raw: j.raw.length, digits: j.digits.length, back: j.back, jerr: j.error || '',
      samples: { structure: j.structure.slice(0, 5), raw: j.raw.slice(0, 5), digits: j.digits.slice(0, 5) },
      header,
      save: save ? { phase: save.phase || '', age: save.age, name: save.playerName || '', nat: save.nationality || '' } : null,
    };
  });
}

async function advance(page, counts) {
  const pick = await page.evaluate(([acts, skipS, neverS, seen]) => {
    const rv = window.__rv;
    const label = el => rv.origText(el).replace(/\s+/g, ' ').trim() || (el.getAttribute('aria-label') || '').trim();
    const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const skip = new RegExp(skipS);
    const never = new RegExp(neverS, 'i');
    const overlays = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],[role="listbox"],[role="menu"]')].filter(vis);
    const overlay = overlays[overlays.length - 1] || null;
    const scope = overlay || document.getElementById('dukb-main') || document.getElementById('root') || document.body;
    const usable = [...scope.querySelectorAll('button,[role="option"],[role="menuitem"],[role="tab"],[role="combobox"],[role="radio"],[role="switch"]')].filter(el => {
      if (!vis(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
      if (!overlay && el.closest('header,footer')) return false;
      const o = label(el);
      return !!o && !never.test(o) && !skip.test(o);
    });
    let el = null;
    for (const a of acts) { el = usable.find(b => label(b).startsWith(a)); if (el) break; }
    if (!el && overlay) {
      const kind = overlay.getAttribute('role');
      if (kind === 'listbox' || kind === 'menu') el = usable[1] || usable[0] || null;
      else el = usable.find(b => /^(let's play|got it|start|play|continue|begin|ok|okay|done|next|close)/i.test(label(b))) || null;
    }
    if (!el) { let best = Infinity; for (const b of usable) { const c = seen[label(b)] || 0; if (c < best) { best = c; el = b; } } }
    if (!el) return { found: false, overlay: overlay ? overlay.getAttribute('role') : '' };
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    window.__rvTarget = el;
    return { found: true, key: label(el), label: label(el).slice(0, 50) };
  }, [ACTIONS, SKIP, NEVER, counts]);
  if (!pick.found) { if (pick.overlay) { await page.keyboard.press('Escape'); return { ok: true, label: 'Escape' }; } return { ok: false, why: 'no usable control' }; }
  await sleep(page, 160);
  const p = await page.evaluate(() => { const el = window.__rvTarget; if (!el || !el.isConnected) return null; const r = el.getBoundingClientRect(); const x = r.left + r.width / 2; const y = r.top + r.height / 2; const top = document.elementFromPoint(x, y); return { x, y, covered: !(top && (top === el || el.contains(top))) }; });
  if (!p) return { ok: false, why: 'gone after the scroll' };
  counts[pick.key] = (counts[pick.key] || 0) + 1;
  if (p.covered) await page.evaluate(() => window.__rvTarget && window.__rvTarget.click()); else await page.mouse.click(p.x, p.y);
  return { ok: true, label: pick.label };
}

async function startTranslator(page) {
  await page.evaluate(() => {
    const css = document.createElement('style');
    /* a browser's own translate has no banner: keep the widget's out of the layout and out of the pictures */
    css.textContent = 'iframe.skiptranslate,.skiptranslate>iframe,#google_translate_element{position:fixed!important;left:-9999px!important;top:-9999px!important}body{top:0!important;position:static!important}';
    document.head.appendChild(css);
    const holder = document.createElement('div');
    holder.id = 'google_translate_element';
    document.body.appendChild(holder);
    window.googleTranslateElementInit = () => { new window.google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element'); };
    const s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(s);
  });
  try { await page.waitForFunction(() => document.querySelectorAll('#root font').length > 20, null, { timeout: 45000 }); return true; } catch { return false; }
}
/* "show original": the banner's own button, pressed the way a person presses it */
async function showOriginal(page) {
  const how = await page.evaluate(() => {
    for (const f of document.querySelectorAll('iframe')) {
      let d = null;
      try { d = f.contentDocument; } catch (e) { d = null; }
      if (!d) continue;
      const b = d.querySelector('[id$=".restore"]') || [...d.querySelectorAll('button,a')].find(x => /original/i.test(x.textContent || ''));
      if (b) { b.click(); return 'banner button ' + (b.id || b.textContent.trim().slice(0, 20)); }
    }
    return '';
  });
  return how;
}

/* The Season Centre lived week by week at 3x under the translator: the busiest stretch of the page. */
async function centre(W, rec, step, shot) {
  const { page } = W;
  const seen = () => page.evaluate(() => { const b = document.querySelector('[data-week-by-week]'); return !!b && b.getBoundingClientRect().width > 2; }).catch(() => false);
  const counts = {};
  for (let i = 1; i <= 14 && !(await seen()); i += 1) {
    if (!(await step(`on to the season bar ${i}`, async () => { const r = await advance(page, counts); await sleep(page, 450); return r; }))) break;
  }
  const C = (rec.centre = { found: await seen(), looks: [], requests: 0, bad: 0 });
  if (!C.found) return;
  await shot('C0-bar');
  page.on('request', r => { if (/translate(-pa)?\.googleapis\.com|translate\.google\.com/.test(r.url())) C.requests += 1; });
  page.on('response', r => { if (/translate(-pa)?\.googleapis\.com|translate\.google\.com/.test(r.url()) && r.status() >= 400) C.bad += 1; });
  await page.evaluate(() => {
    document.querySelector('[data-week-by-week]').click();
    const rv = window.__rv;
    const S = (rv.sample = { n: 0, withRaw: 0, rawSum: 0, wrapSum: 0, maxRaw: 0, minRaw: 1e9, started: 0, fast: false, hist: {} });
    const label = b => rv.origText(b).replace(/\s+/g, ' ').trim();
    const letters = /[A-Za-zÀ-ɏ]{2,}/;
    rv.rawNow = () => {
      const d = document.querySelector('[role="dialog"]');
      const list = [];
      if (!d) return list;
      const tw = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
      for (let t = tw.nextNode(); t; t = tw.nextNode()) {
        if (!letters.test(t.nodeValue)) continue;
        const p = t.parentElement;
        if (!p || p.closest('font,[translate="no"],.notranslate,svg,code')) continue;
        list.push(t.nodeValue.slice(0, 40));
      }
      return list;
    };
    rv.sampler = setInterval(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return;
      const raw = rv.rawNow().length;
      S.n += 1; S.rawSum += raw; if (raw > 0) S.withRaw += 1; if (raw > S.maxRaw) S.maxRaw = raw; if (raw < S.minRaw) S.minRaw = raw;
      S.hist[raw] = (S.hist[raw] || 0) + 1;
    }, 100);
    rv.driver = setInterval(() => {
      const buttons = [...document.querySelectorAll('[role="dialog"] button')].filter(b => !b.disabled && b.getBoundingClientRect().width > 2);
      if (!S.fast) { const f = buttons.find(b => label(b) === '3x'); if (f) { f.click(); S.fast = true; } }
      const play = buttons.find(b => /^Let it play/.test(label(b)));
      if (play) { play.click(); return; }
      const kick = document.querySelector('[data-kickoff] button');
      const next = kick || [...document.querySelectorAll('[data-centre-bar] button')].find(b => /^▶/.test(label(b)) && !/Resume/.test(label(b)));
      if (next && !next.disabled) { next.click(); S.started += 1; }
    }, 400);
  });
  W.fast = true;
  for (let k = 1; k <= 10; k += 1) {
    await step(`centre look ${k}`, async () => { await sleep(page, 2400); return { ok: true }; });
    const row = rec.steps[rec.steps.length - 1];
    C.looks.push({ k, raw: row.raw, digits: row.digits, structure: row.structure, rawNow: await page.evaluate(() => window.__rv.rawNow().slice(0, 6)).catch(() => []) });
    if (k === 2 || k === 5 || k === 9) await shot(`C${k}-centre`);
  }
  /* stop pressing, let the match in play run out, then look at a page that has come to rest */
  C.sample = await page.evaluate(() => { clearInterval(window.__rv.driver); clearInterval(window.__rv.sampler); return window.__rv.sample; });
  await page.waitForFunction(() => { const k = document.querySelector('[data-kickoff] button'); const n = [...document.querySelectorAll('[data-centre-bar] button')].some(b => !b.disabled && /^▶/.test(window.__rv.origText(b).trim())); return !!k || n; }, null, { timeout: 30000 }).catch(() => {});
  W.fast = false;
  await step('centre at rest', async () => { await sleep(page, 2500); return { ok: true }; });
  const rest = rec.steps[rec.steps.length - 1];
  C.rest = { raw: rest.raw, digits: rest.digits, structure: rest.structure, pend: rest.pend, rawNow: await page.evaluate(() => window.__rv.rawNow().slice(0, 10)).catch(() => []) };
  await shot('C-rest');
}

const PICKS = [['nationality', 'Brazil'], ['position', 'Striker'], ['era', 'Current era']];
async function runVariant(browser, v) {
  const ctx = await browser.newContext({ viewport: SIZES[v.view], locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', reducedMotion: v.motion });
  await ctx.addInitScript(pageInit, { seed: 20261008, translate: v.translate, tl: TL, nolive: !!v.nolive });
  const W = { v, page: null, restored: false, db: 0, blocked: new Set(), errors: [], notFound: [], guardLines: 0 };
  await ctx.route('**/*', route => {
    let host = '';
    try { host = new URL(route.request().url()).hostname; } catch { /* data: */ }
    if (!host || ALLOW.some(re => re.test(host))) return route.continue();
    if (host.endsWith('flagcdn.com')) return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
    W.blocked.add(host);
    return route.abort();
  });
  await ctx.route(/supabase\.co/, route => { W.db += 1; return route.abort(); });
  const page = await ctx.newPage();
  W.page = page;
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'warning' && t.startsWith('[dukb]')) W.guardLines += 1;
    if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(t)) { W.errors.push(t.slice(0, 200)); if (/NotFoundError|not a child of this node/.test(t)) W.notFound.push(t.slice(0, 160)); }
  });
  page.on('pageerror', e => { const t = String((e && (e.stack || e.message)) || e); W.errors.push('pageerror: ' + t.slice(0, 200)); if (/NotFoundError|not a child of this node/.test(t)) W.notFound.push(t.slice(0, 160)); });
  const rec = { name: v.name, view: v.view, motion: v.motion, translate: v.translate, nolive: !!v.nolive, steps: [], boxes: {}, stop: '', ageLooks: 0, ageWrong: [], worst: { structure: 0, raw: 0, digits: 0 }, all: { structure: new Map(), raw: new Map(), digits: new Map() } };
  const shot = name => page.screenshot({ path: path.join(OUT, `${v.name}-${name}.png`) }).catch(() => {});
  const step = async (name, fn) => {
    if (rec.stop) return false;
    let a;
    try { a = await fn(); } catch (e) { a = { ok: false, why: 'threw ' + String(e).split('\n')[0].slice(0, 120) }; }
    const pend = await settle(W);
    let s = null;
    for (let i = 0; i < 3 && !s; i += 1) { try { s = await look(page); } catch { await sleep(page, 400); } }
    const row = { name, ok: !(a && a.ok === false), did: String((a && (a.label || a.why)) || '').slice(0, 60), pend };
    if (s) {
      Object.assign(row, { structure: s.structure, raw: s.raw, digits: s.digits, back: s.back, fonts: s.fonts, judged: s.judged, header: s.header, age: s.save ? s.save.age : null, phase: s.save ? s.save.phase : '', stats: s.stats, backs: s.backs, jerr: s.jerr });
      for (const k of ['structure', 'raw', 'digits']) {
        if (s[k] > rec.worst[k]) rec.worst[k] = s[k];
        for (const x of s.samples[k]) { const key = `${x.at} | ${x.react} | ${x.screen}`; if (!rec.all[k].has(key)) rec.all[k].set(key, { ...x, step: name, phase: W.restored ? 'after show original' : 'translated' }); }
      }
      if (s.header && s.save && typeof s.save.age === 'number') {
        rec.ageLooks += 1;
        if (!(s.header.shown.match(/\d+/g) || []).includes(String(s.save.age))) rec.ageWrong.push({ step: name, shown: s.header.shown, save: s.save.age, restored: W.restored });
      }
    }
    rec.steps.push(row);
    rec.last = s;
    if (s && s.boundary) { rec.stop = 'BOUNDARY at ' + name; await shot('BOUNDARY'); return false; }
    if (a && a.ok === false) { rec.stop = `stuck at ${name}: ${a.why}`; await shot('STUCK'); return false; }
    return true;
  };
  try {
    await page.goto(BASE + '/soccer-career', { waitUntil: 'load', timeout: 45000 });
    await step('create screen draws', async () => { await page.waitForSelector('#pname', { timeout: 30000 }); await sleep(page, 700); return { ok: true }; });
    if (v.translate) {
      rec.translated = await startTranslator(page);
      if (!rec.translated) { rec.stop = 'COULD NOT TRANSLATE'; await shot('NOT-TRANSLATED'); }
      await step('translated', async () => { await sleep(page, 1500); return { ok: true }; });
    }
    await shot('1-create');
    await step('type the name', async () => { await page.fill('#pname', 'Joao Teste'); return { ok: true }; });
    for (let i = 0; i < PICKS.length; i += 1) {
      const [what, want] = PICKS[i];
      await step(`choose ${what} ${want}`, async () => {
        const open = await press(page, '[role="combobox"]', null, 'includes', i);
        if (!open.ok) return open;
        try { await page.waitForSelector('[role="option"]', { timeout: 8000 }); } catch { return { ok: false, why: 'no options opened' }; }
        await settle(W);
        if (i === 1) await shot('1b-options');
        let hit = await press(page, '[role="option"]', want, 'exact');
        if (!hit.ok) hit = await press(page, '[role="option"]', want, 'includes');
        if (!hit.ok) return hit;
        await page.waitForSelector('[role="option"]', { state: 'detached', timeout: 4000 }).catch(() => {});
        await settle(W);
        rec.boxes[what] = await page.evaluate(k => { const t = document.querySelectorAll('[role="combobox"]')[k]; return t ? { react: window.__rv.origText(t).replace(/\s+/g, ' ').trim(), shown: (t.innerText || '').replace(/\s+/g, ' ').trim() } : null; }, i);
        return hit;
      });
    }
    await shot('2-picks');
    await step('Generate Starting Potential', async () => { const r = await press(page, 'button', 'Generate Starting Potential'); if (r.ok) await ready(page, 'Roll again', 15000); return r; });
    await shot('3-roll');
    await step('Roll again', async () => { const r = await press(page, 'button', 'Roll again'); if (r.ok) { await sleep(page, 600); await ready(page, 'Customize your build', 15000); } return r; });
    await step('Customize your build', async () => { const r = await press(page, 'button', 'Customize your build'); if (r.ok) await ready(page, 'Lock in', 10000); return r; });
    await shot('3b-build');
    await step('Lock in build', async () => { const r = await press(page, 'button', 'Lock in'); if (r.ok) await ready(page, 'Begin Career', 10000); return r; });
    await step('Begin Career', async () => { const r = await press(page, 'button', 'Begin Career'); if (r.ok) { await page.waitForFunction(() => !document.getElementById('pname'), null, { timeout: 15000 }).catch(() => {}); await sleep(page, 1200); } return r; });
    await shot('4-hub');
    rec.reached = !!(rec.last && !rec.last.creation && rec.last.save && rec.last.save.name === 'Joao Teste');
    rec.startAge = rec.last && rec.last.save ? rec.last.save.age : null;
    const counts = {};
    if (v.centre && rec.reached) await centre(W, rec, step, shot);
    for (let i = 1; i <= PRESSES && rec.reached && !v.centre; i += 1) {
      if (!(await step(`career press ${i}`, async () => { const r = await advance(page, counts); await sleep(page, 450); return r; }))) break;
      if (i === 6) await shot('5-career-mid');
    }
    await shot('5-career');
    rec.ageBeforeRestore = rec.last && rec.last.save ? rec.last.save.age : null;
    if (v.translate && rec.reached && !rec.stop && !v.centre) {
      const before = await look(page);
      const how = await showOriginal(page);
      rec.restore = { how, fontsBefore: before.fonts, backsBefore: before.backs };
      if (how) {
        const t0 = Date.now();
        await page.waitForFunction(() => document.querySelectorAll('#root font').length === 0, null, { timeout: 12000 }).catch(() => {});
        await sleep(page, 800);
        W.restored = true;
        const after = await look(page);
        Object.assign(rec.restore, { ms: Date.now() - t0, fontsAfter: after.fonts, backsAfter: after.backs, lang: after.lang, cls: after.cls });
        await step('just after show original', async () => ({ ok: true }));
        await shot('6-original');
        for (let i = 1; i <= AFTER; i += 1) {
          if (!(await step(`original press ${i}`, async () => { const r = await advance(page, counts); await sleep(page, 450); return r; }))) break;
        }
        await shot('7-original-later');
        /* the picture a person would look at: the stale line itself, and the top of the page */
        const stale = await page.evaluateHandle(() => (window.__rv.staleEls || [])[0] || null);
        const el = stale.asElement();
        if (el) { await el.scrollIntoViewIfNeeded().catch(() => {}); await sleep(page, 200); await shot('8-original-stale-line'); rec.staleBox = await el.boundingBox().catch(() => null); }
        await page.evaluate(() => window.scrollTo(0, 0));
        await sleep(page, 300);
        await shot('9-original-top');
        const fin = await look(page);
        rec.afterTop = { header: fin.header, save: fin.save, raw: fin.raw, digits: fin.digits, samples: fin.samples };
      }
    }
  } catch (e) { rec.stop = rec.stop || 'walk threw: ' + String(e).split('\n')[0].slice(0, 200); }
  rec.end = rec.last ? { age: rec.last.save ? rec.last.save.age : null, phase: rec.last.save ? rec.last.save.phase : '', stats: rec.last.stats, fonts: rec.last.fonts, h1: rec.last.h1 } : null;
  rec.net = { db: W.db, blocked: [...W.blocked] };
  rec.errors = W.errors.slice(0, 8);
  rec.notFound = W.notFound.length;
  rec.guardLines = W.guardLines;
  for (const k of ['structure', 'raw', 'digits']) rec.all[k] = [...rec.all[k].values()];
  delete rec.last;
  await ctx.close();
  return rec;
}

/* ---------------- main: three walks side by side ---------------- */
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const queue = [...VARIANTS];
const results = [];
const worker = async () => {
  for (let v = queue.shift(); v; v = queue.shift()) {
    const t0 = Date.now();
    let rec;
    try { rec = await runVariant(browser, v); } catch (e) { rec = { name: v.name, stop: 'runVariant threw: ' + String(e).split('\n')[0].slice(0, 200), steps: [], worst: {}, all: { structure: [], raw: [], digits: [] }, ageWrong: [] }; }
    rec.seconds = Math.round((Date.now() - t0) / 1000);
    results.push(rec);
    fs.writeFileSync(path.join(OUT, `rv-walk-${v.name}.json`), JSON.stringify(rec, null, 1));
    const lastStep = rec.steps[rec.steps.length - 1] || {};
    console.log(`WALK ${rec.name}: ${rec.steps.length} steps in ${rec.seconds}s, stop=${JSON.stringify(rec.stop || '')}, translated=${rec.translated}, reached=${rec.reached}, age ${rec.startAge} -> ${rec.ageBeforeRestore} -> ${rec.end ? rec.end.age : '?'}`);
    console.log(`  worst at one look: structure ${rec.worst.structure}, raw ${rec.worst.raw}, digits ${rec.worst.digits}; different in all: structure ${rec.all.structure.length}, raw ${rec.all.raw.length}, digits ${rec.all.digits.length}`);
    console.log(`  age line: ${rec.ageLooks} looks, ${rec.ageWrong.length} wrong${rec.ageWrong[0] ? ' first ' + JSON.stringify(rec.ageWrong[0]) : ''}`);
    console.log(`  boxes: ${JSON.stringify(rec.boxes)}`);
    console.log(`  restore: ${JSON.stringify(rec.restore || null)}`);
    if (rec.afterTop) console.log(`  after show original, at the top: ${JSON.stringify(rec.afterTop).slice(0, 900)}`);
    if (rec.centre) console.log(`  centre: ${JSON.stringify({ found: rec.centre.found, requests: rec.centre.requests, bad: rec.centre.bad, sample: rec.centre.sample, rest: rec.centre.rest }).slice(0, 900)}`);
    if (rec.centre) for (const l of rec.centre.looks) console.log(`    look ${l.k}: raw ${l.raw} digits ${l.digits} structure ${l.structure} english now ${JSON.stringify(l.rawNow)}`.slice(0, 330));
    console.log(`  layer two stats at the end: ${JSON.stringify(rec.end ? rec.end.stats : null)}; guard lines ${rec.guardLines}; NotFoundError ${rec.notFound}; errors ${JSON.stringify((rec.errors || []).slice(0, 3))}`);
    console.log(`  net: db aborted ${rec.net ? rec.net.db : '?'}, other hosts aborted ${JSON.stringify(rec.net ? rec.net.blocked : [])}; last step ${JSON.stringify({ n: lastStep.name, pend: lastStep.pend, fonts: lastStep.fonts, judged: lastStep.judged })}`);
    for (const k of ['structure', 'raw', 'digits']) for (const x of rec.all[k].slice(0, 6)) console.log(`    ${k} [${x.phase} @ ${x.step}] ${x.at}: React ${x.react} | screen ${x.screen}`);
  }
};
await Promise.all([worker(), worker(), worker()]);
await browser.close();
fs.writeFileSync(path.join(OUT, 'rv-walk-all.json'), JSON.stringify(results, null, 1));
console.log(`rv-walk: ${results.length} walk(s) done, ${results.filter(r => r.stop).length} stopped early`);
