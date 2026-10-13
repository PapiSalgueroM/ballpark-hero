/**
 * Round 1325: Club Manager's squad list, contracts desk, dressing room and career card fit, at 320x640, 390x844,
 * 768x1024 and 1280x900, and the real page keeps its saves.
 *
 * PART 1, the fit (the playFirstTeamFit pattern): the four real components bundled with esbuild around careers the
 * engine builds (Liverpool and Dundee 2026-27, the committed Everton book save, an Arsenal career with a made up
 * manager), the CSS from dist/assets (CM_FIT_CSS may point at preview CSS, labelled as not release proof), every
 * request blocked. It runs twice: once on the components as they stand on the base (CM_FIT_BASE_SHA, read with git
 * show, never written to disk in src) and once on this tree, and measures on elements:
 *   heads     every squad head's word and sort arrow whole at 768 and up with each of the eleven sorts on, every cell
 *             under its head, the name column at least 120 px at 768 (cm m14)
 *   deskclip  no final year or clause row cut by a box that scrolls inside the card (cm m15); "Show the other N"
 *             leaves the page where it was and the first new row where the button was; the two short lists that
 *             keep a scroller show three whole rows at 320 and 390
 *   cut       no text cut by its box anywhere on the four screens (cm p6), a player's name excepted only when the
 *             whole name is in its title
 *   tap       every control the round adds or edits is at least 44 px tall and wide at 320 and 390
 *   small     every line the round adds or rewrites is at least 12 px, and on each screen the count of text under
 *             12 px does not rise from the base
 *   overflow  no sideways page scroll; motion: under reduced motion the rung tiles do not lift, the wage bar does
 *             not animate and nothing is running; shift: nothing moves after first paint; tiles: the rung tiles are
 *             one height; help: the "?" sheet opens and holds the game's deals paragraph once
 * The base run is expected red on heads, deskclip, cut and tap (the findings this round closes) and is printed as
 * that proof; the head run must be clean.
 * Negative controls (CM_FIT_CONTROL, Part 1 on this tree only, each anchor asserted exactly once):
 *   oldgrid    the squad grid back to the base's widths        heads red at 1280
 *   scrollbox  the 256 px box back around the final year rows   deskclip red at 390
 *   truncate   the dressing room window line truncates again     cut red at 320
 *   smalltap   the Release button loses its 44 px                tap red at 390
 * A control exits 1 and says FIRED when its finding appears at its size; 3 when it does not.
 *
 * PART 2 (CM_FIT_PART=2 or all; needs a served build of this tree at BASE and of the base at CM_FIT_BASE_URL, both
 * through scripts/lib/hostLikeServer.mjs; the database and ad hosts aborted):
 *   B  the labels and the low first defeat on the real page: Liverpool at 390, the Everton book save at 320
 *   C  reduced motion: document.getAnimations() empty after presses
 *   D  base against head: two careers played with the same presses, Math.random seeded and counted and Date frozen
 *      before any page code runs: the save and the draw count must be equal. A comparator check proves a save that
 *      differs by one byte is reported.
 *   E  the engine chunk (the one holding the save key) has the same file name and bytes in both builds.
 * Screenshots go to $RC_OUT/shots (or a temp folder). Run: CM_FIT_PART=1 node scripts/playCmTablesFit.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CM_DIR = 'src/components/club-manager';
const FILES = ['SquadScreen', 'ContractsCard', 'RolesScreen', 'ClubManagerCareerPanel'];
const PART = process.env.CM_FIT_PART || 'all';
const CONTROL = process.env.CM_FIT_CONTROL || '';
const BASE_SHA = process.env.CM_FIT_BASE_SHA || '8fea14e2';
const SIZES = [[320, 640], [390, 844], [768, 1024], [1280, 900]];
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-cm-fit-'));
const SHOTS = path.join(process.env.RC_OUT || TEMP, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const CONTROLS = {
  oldgrid: { file: 'SquadScreen', kind: 'heads', size: 1280,
    anchor: 'md:grid-cols-[2.5rem_minmax(0,1fr)_2.5rem_2.5rem_3.25rem_3rem_3.25rem_3rem_3.75rem_3rem_3.25rem_1rem]',
    to: 'md:grid-cols-[2.25rem_minmax(0,1fr)_1.75rem_2rem_3.25rem_2rem_2.75rem_2.25rem_3.5rem_3rem_1.5rem_1rem]' },
  scrollbox: { file: 'ContractsCard', kind: 'deskclip', size: 390,
    anchor: '<div data-cm-final-year-list>', to: '<div data-cm-final-year-list className="max-h-64 overflow-y-auto">' },
  truncate: { file: 'RolesScreen', kind: 'cut', size: 320,
    anchor: '<span className="min-w-0 text-xs text-muted-foreground break-words">', to: '<span className="min-w-0 text-xs text-muted-foreground truncate">' },
  smalltap: { file: 'ContractsCard', kind: 'tap', size: 390,
    anchor: 'title={block ? RELEASE_BLOCK_COPY[block].title : `Settle at ${sev.weekly}k a week for ${sev.weeksLeft} weeks`}\n                      className={cn(\'shrink-0 max-w-[55%] min-h-11 ',
    to: 'title={block ? RELEASE_BLOCK_COPY[block].title : `Settle at ${sev.weekly}k a week for ${sev.weeksLeft} weeks`}\n                      className={cn(\'shrink-0 max-w-[55%] ' },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.log(`FAIL: CM_FIT_CONTROL=${CONTROL} is not a control (${Object.keys(CONTROLS).join(', ')})`); process.exit(2); }

/** The four components as they stand on the base or in this tree, with a control applied to this tree's copy. */
function sources(which) {
  const out = {};
  for (const f of FILES) {
    const rel = `${CM_DIR}/${f}.tsx`;
    out[f] = which === 'base'
      ? execFileSync('git', ['show', `${BASE_SHA}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
      : fs.readFileSync(path.join(ROOT, rel), 'utf8');
    out[f] = out[f].replace(/\r\n/g, '\n');
  }
  if (which === 'head' && CONTROL) {
    const c = CONTROLS[CONTROL];
    const count = out[c.file].split(c.anchor).length - 1;
    if (count !== 1) { console.log(`FAIL control ${CONTROL}: its anchor occurs ${count} times in ${c.file}.tsx`); process.exit(3); }
    const changed = out[c.file].replace(c.anchor, () => c.to);
    if (changed === out[c.file]) { console.log(`FAIL control ${CONTROL}: the copy did not change`); process.exit(3); }
    out[c.file] = changed;
    console.log(`CONTROL ${CONTROL}: ${c.file}.tsx changed in the bundle only`);
  }
  return out;
}

/* The page the components are drawn on. Careers come from the engine; the only planted states are a bench run on
   six real men (so the dressing room has people who need a word) and, on a made up manager's Arsenal, a made up
   approach and a made up country offer so their buttons draw. Nothing here is shown to anybody but this walk. */
const FIXTURE = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { SquadScreen } from './src/components/club-manager/SquadScreen';
import { ContractsCard } from './src/components/club-manager/ContractsCard';
import { RolesScreen } from './src/components/club-manager/RolesScreen';
import ClubManagerCareerPanel from './src/components/club-manager/ClubManagerCareerPanel';
import ClubManagerHelp from './src/components/club-manager/ClubManagerHelp';
import { HowToPlayPopover } from './src/components/game/HowToPlayPopover';
import * as cm from './src/lib/clubManager';

let seed = 1325;
const roll = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), seed | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const seeded = fn => { const was = Math.random; Math.random = roll; try { return fn(); } finally { Math.random = was; } };
const noop = () => {};
const SPEC = { name: 'Sam Calloway', nationality: 'Spain', background: 'analyst', style: 'gegenpress' };
function liverpool() {
  const c = seeded(() => cm.startCareer('Liverpool'));
  cm.ensureFreeAgents(c);
  const top = [...c.squad].sort((a, b) => b.rating - a.rating).slice(0, 6).map(p => p.id);
  return { ...c, squad: c.squad.map(p => (top.includes(p.id) ? { ...p, lastTen: [0, 0.16, 0, 0.5, 0, 0] } : p)) };
}
const BUILD = {
  liverpool,
  liverpoolAllFinal: () => { const c = liverpool(); return { ...c, squad: c.squad.map(p => (p.onLoan ? p : { ...p, contractYears: 1 })) }; },
  dundee: () => { const c = seeded(() => cm.startCareer('Dundee')); cm.ensureFreeAgents(c); return c; },
  everton: () => { localStorage.setItem(cm.SAVE_KEY, window.__EVERTON_RAW__); const c = cm.loadCareer(); localStorage.removeItem(cm.SAVE_KEY); return c; },
  manager: () => {
    const c = seeded(() => cm.startCareer('Arsenal', undefined, undefined, SPEC));
    return { ...c, approach: { club: 'Fixture Town', leagueName: 'Fixture League', tierLabel: 'top flight', blurb: 'A made up suitor for the layout check.', week: c.week, expiresWeek: c.week + 4 } };
  },
};
const made = {};
const careerOf = name => (made[name] ??= BUILD[name]());
const OFFER = { nation: 'Spain', blurb: 'A made up offer for the layout check.' };
const G = { resignNation: noop, acceptNation: noop, answerApproach: noop, applyJob: noop, joinNow: noop, joinSummer: noop, updateManager: noop };

function Fixture() {
  const [view, setView] = useState({ screen: 'none', career: 'liverpool', n: 0 });
  window.__CMFIT__ = { show: (screen, career) => setView(v => ({ screen, career, n: v.n + 1 })), kinds: () => {
    const c = careerOf('liverpool');
    return { squad: c.squad.length };
  } };
  if (view.screen === 'none') return null;
  const c = careerOf(view.career);
  const key = view.screen + view.career + view.n;
  return (
    <div data-fit-screen={view.screen} key={key}>
      {view.screen === 'squad' && <SquadScreen squad={c.squad} xiIds={c.xiIds} eraId={c.eraId} captainId={null} career={c} />}
      {view.screen === 'desk' && <ContractsCard career={c} onRenew={noop} onRenewWithClause={noop} onRelease={noop} onSignFreeAgent={noop} />}
      {view.screen === 'room' && <RolesScreen career={c} onSetRole={noop} />}
      {view.screen === 'card' && <ClubManagerCareerPanel c={c} g={G} nationOffer={view.career === 'manager' ? OFFER : null} />}
      {view.screen === 'help' && <HowToPlayPopover title="How to Play Club Manager" triggerSide="right"><ClubManagerHelp /></HowToPlayPopover>}
    </div>
  );
}
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/club-manager']}><Fixture /></MemoryRouter>);
`;

async function bundle(which) {
  const src = sources(which);
  const outfile = path.join(TEMP, `fixture-${which}.js`);
  await build({
    stdin: { resolveDir: ROOT, loader: 'tsx', contents: FIXTURE },
    bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic', outfile,
    define: { 'process.env.NODE_ENV': '"production"' }, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
    plugins: [{ name: 'cm-fit-components', setup(b) {
      b.onLoad({ filter: /club-manager[\\/](SquadScreen|ContractsCard|RolesScreen|ClubManagerCareerPanel)\.tsx$/ }, args => {
        const name = path.basename(args.path, '.tsx');
        return { contents: src[name], loader: 'tsx', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  return outfile;
}

/* ---------------- measured in the page ---------------- */

/** Every text element on the drawn screen: cut ones, and how many sit under 12 px. */
function auditText() {
  const out = { findings: [], small: 0, texts: 0 };
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) out.findings.push({ kind: 'overflow', detail: `the page scrolls sideways by ${de.scrollWidth - de.clientWidth}px` });
  const root = document.querySelector('[data-fit-screen]');
  if (!root) { out.findings.push({ kind: 'missing', detail: 'nothing drawn' }); return out; }
  for (const el of root.querySelectorAll('*')) {
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    const r = el.getBoundingClientRect();
    if (!own || r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    out.texts += 1;
    if (parseFloat(cs.fontSize) < 12) out.small += 1;
    const text = el.textContent.trim();
    const named = (el.getAttribute('title') || '').trim() === text;
    const cutX = el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && (cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis');
    const cutY = el.clientHeight > 0 && cs.overflowY === 'hidden' && el.scrollHeight > el.clientHeight + 1;
    if ((cutX || cutY) && !named) {
      out.findings.push({ kind: el.closest('[data-cm-sort]') ? 'heads' : 'cut', detail: `"${text.slice(0, 50)}" is cut (${el.scrollWidth} of ${el.clientWidth} px wide)` });
    }
  }
  return out;
}

/** The squad heads with the current sort on: word and arrow whole, every cell under its head. */
function auditHeads() {
  const bad = [];
  for (const b of document.querySelectorAll('[data-cm-sort]')) {
    const key = b.getAttribute('data-cm-sort');
    const word = b.querySelector('span');
    const arrow = b.querySelector('svg');
    const br = b.getBoundingClientRect();
    if (word && word.scrollWidth > word.clientWidth + 1) bad.push(`the ${key} head's word is cut (${word.scrollWidth} of ${word.clientWidth} px)`);
    if (arrow && word) {
      const ar = arrow.getBoundingClientRect();
      const wr = word.getBoundingClientRect();
      if (ar.right > br.right + 1 || ar.left < br.left - 1) bad.push(`the ${key} head's arrow sits outside its column`);
      if (ar.left < wr.right - 1) bad.push(`the ${key} head's arrow sits on its word`);
    }
    for (const cell of document.querySelectorAll(`[data-cm-cell="${key}"]`)) {
      const r = cell.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.left < br.left - 1 || r.right > br.right + 1) { bad.push(`a ${key} cell sits outside its head`); break; }
    }
  }
  const name = document.querySelector('[data-cm-sort="name"]');
  return { bad, nameWidth: name ? Math.round(name.getBoundingClientRect().width) : 0 };
}

/** The desk: no forecast row cut by a box scrolling inside the card, and three whole rows in each kept scroller. */
function auditDesk() {
  const bad = [];
  const desk = document.querySelector('[data-contracts-desk]');
  if (!desk) return ['no desk drawn'];
  const rows = [...desk.querySelectorAll('[data-contract-preview="plain"], [data-contract-preview="remove"]')].map(f => f.closest('.border-b'));
  for (const row of new Set(rows)) {
    if (!row) continue;
    let a = row.parentElement;
    while (a && a !== desk && !['auto', 'scroll', 'hidden'].includes(getComputedStyle(a).overflowY)) a = a.parentElement;
    if (!a || a === desk) continue;
    const r = row.getBoundingClientRect();
    const box = a.getBoundingClientRect();
    if ((r.top < box.bottom - 1 && r.bottom > box.bottom + 1) || (r.top < box.top - 1 && r.bottom > box.top + 1)) {
      bad.push(`a contract row is cut by a ${Math.round(box.height)} px box that scrolls inside the card (${(row.textContent || '').slice(0, 40)})`);
    }
  }
  for (const [what, sel] of [['Let somebody go', '[data-release-id]'], ['free agent', '[data-sign-index]']]) {
    const first = desk.querySelector(sel);
    if (!first) continue;
    let s = first.parentElement;
    while (s && s !== desk && getComputedStyle(s).overflowY !== 'auto') s = s.parentElement;
    if (!s || s === desk) continue;
    const kids = [...s.children];
    if (kids.length < 3) continue;
    const bottom = s.getBoundingClientRect().top + s.clientHeight + 1;
    if (kids[2].getBoundingClientRect().bottom > bottom) bad.push(`the ${what} list shows fewer than three whole rows (${s.clientHeight} px box)`);
  }
  return bad;
}

/** The controls this round adds or edits that are on screen now, by selectors the base and this tree both carry. */
function tapTargets() {
  const all = s => [...document.querySelectorAll(s)];
  const said = (re, root = document) => [...root.querySelectorAll('button')].filter(b => re.test((b.textContent || '').trim()));
  const card = re => [...document.querySelectorAll('div')].find(d => re.test((d.firstElementChild?.textContent || '').trim()));
  const out = [];
  const put = (what, els) => els.forEach(el => out.push([what, el]));
  put('Release', all('[data-release-id]'));
  put('Sign', all('[data-sign-index]'));
  put('Show the other', said(/^Show the other/));
  put('Release him or Keep him', said(/^(Release him|Keep him)$/));
  const pick = document.querySelector('select[aria-label="Sort squad"]');
  if (pick && pick.getBoundingClientRect().width > 0) { put('sort picker', [pick]); put('sort direction', [pick.nextElementSibling]); }
  put('squad row', all('[data-cm-squad-row] > button'));
  const needs = card(/^Needs a word$/);
  if (needs) put('Needs a word row', [...needs.querySelectorAll('button')]);
  const view = document.querySelector('[data-fit-screen="room"] > div');
  if (view && !view.querySelector('.grid.grid-cols-2')) {
    const buttons = [...view.querySelectorAll('button')];
    if (buttons.length) put('dressing room back', [buttons[0]]);
    const ladder = card(/^Tell him what he is$/);
    if (ladder) put('Tell him what he is', [...ladder.querySelectorAll('button')]);
    else put('dressing room player row', buttons.slice(1));
  }
  put('Edit', said(/^Edit$/));
  put('Name your manager', said(/^Name your manager$/));
  put('nation or approach', said(/^(Step down from the national team|.*Take the .* job as well|.*Shake hands for the summer|Turn them down)$/));
  return out.map(([what, el]) => {
    const r = el.getBoundingClientRect();
    return { what, h: Math.round(r.height * 10) / 10, w: Math.round(r.width * 10) / 10, font: parseFloat(getComputedStyle(el).fontSize), text: (el.textContent || '').trim().slice(0, 40) };
  }).filter(t => t.w > 0);
}

/** The lines this round adds or rewrites, on this tree only: each must read at 12 px or more. */
function smallChanged() {
  const els = [
    ...[...document.querySelectorAll('[data-cm-deal-label]')].map(e => (e.tagName === 'SPAN' ? e.parentElement : e)),
    ...document.querySelectorAll('[data-cm-deal-note]'),
    ...document.querySelectorAll('[data-cm-room-row] span.break-words'),
    ...document.querySelectorAll('[data-cm-rung] > div:nth-child(2), [data-cm-rung] > div:nth-child(4)'),
    ...document.querySelectorAll('[data-cm-room-player] .break-words'),
    ...document.querySelectorAll('[data-cm-career-lines] p'),
    ...document.querySelectorAll('[data-cm-show-more]'),
  ];
  return els.filter(e => e.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(e).fontSize) < 12)
    .map(e => `"${(e.textContent || '').trim().slice(0, 50)}" at ${getComputedStyle(e).fontSize}`);
}

/** Reduced motion: what a hovered rung tile and the wage bar do, and anything still running. */
function motionNow() {
  const tile = document.querySelector('[data-fit-screen="room"] .grid.grid-cols-2 > button');
  const bar = document.querySelector('[data-contracts-desk] div[style*="width"]');
  const lift = el => { if (!el) return 0; const m = getComputedStyle(el).transform; if (!m || m === 'none') return 0; const v = m.slice(m.indexOf('(') + 1, -1).split(',').map(Number); return v.length === 6 ? v[5] : 0; };
  const moving = el => { if (!el) return false; const cs = getComputedStyle(el); return cs.transitionProperty !== 'none' && cs.transitionDuration.split(',').some(d => parseFloat(d) > 0); };
  const running = document.getAnimations().filter(a => a.playState === 'running').length;
  return { tileLift: lift(tile), tileMoves: moving(tile), barMoves: moving(bar), running };
}

/** The rung tiles: one height each. */
function tileHeights() {
  return [...document.querySelectorAll('[data-fit-screen="room"] .grid.grid-cols-2 > button')].map(b => Math.round(b.getBoundingClientRect().height * 10) / 10);
}

/* ---------------- Part 1: the four components at four sizes ---------------- */

const FIT_URL = 'http://cm-tables-fit.test/';
const SORT_KEYS = ['pos', 'name', 'age', 'ovr', 'pot', 'form', 'wage', 'deal', 'worth', 'fit', 'mood'];

async function partOne(which, browser, css) {
  const outfile = await bundle(which);
  const evertonRaw = fs.readFileSync(path.join(ROOT, 'scripts/data/cmBookSaveEvertonFixture.json'), 'utf8');
  const findings = [];
  const small = {};
  const notes = [];
  const add = (kind, w, where, detail) => findings.push({ kind, w, where, detail });
  for (const [w, h] of SIZES) {
    for (const motion of (w === 390 ? ['no-preference', 'reduce'] : ['no-preference'])) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
      await ctx.addInitScript(raw => {
        window.__EVERTON_RAW__ = raw;
        window.__cls = 0;
        try {
          new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; })
            .observe({ type: 'layout-shift', buffered: true });
        } catch { /* no layout shift API */ }
      }, evertonRaw);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
      /* The page is answered from memory at a made up http address and every other request is aborted: an
         about:blank page has no localStorage, and the Everton book save is read through the engine's loadCareer. */
      const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><style>${css}</style></head><body class="dark"><main id="root" class="relative mx-auto px-4 py-6 md:py-10 max-w-4xl"></main></body></html>`;
      await page.route('**/*', r => (r.request().url() === FIT_URL ? r.fulfill({ status: 200, contentType: 'text/html', body: html }) : r.abort()));
      await page.goto(FIT_URL);
      await page.addScriptTag({ path: outfile });
      await page.waitForFunction(() => !!window.__CMFIT__, null, { timeout: 60000 });
      const show = async (screen, career) => {
        await page.evaluate(([s, c]) => { window.__cls = 0; window.__CMFIT__.show(s, c); }, [screen, career]);
        await page.waitForSelector(`[data-fit-screen="${screen}"]`, { state: 'attached', timeout: 20000 }).catch(e => {
          throw new Error(`${which} at ${w}: the ${screen} screen for ${career} never drew. Page errors: ${errors.join(' | ') || 'none'}. ${String(e).slice(0, 120)}`);
        });
        await page.waitForTimeout(400);
        const cls = await page.evaluate(() => window.__cls);
        if (cls > 0.001) add('shift', w, `${screen} ${career}`, `the layout shifted ${cls.toFixed(4)} after first paint`);
      };
      const click = sel => page.evaluate(s => { const el = document.querySelector(s); if (el) el.click(); return !!el; }, sel);
      const text = async where => {
        const r = await page.evaluate(auditText);
        r.findings.forEach(f => add(f.kind, w, where, f.detail));
        return r;
      };
      const taps = async where => {
        if (w > 390) return;
        for (const t of await page.evaluate(tapTargets)) {
          if (t.h < 43.5 || t.w < 43.5) add('tap', w, where, `${t.what} "${t.text}" is ${t.w} by ${t.h} px`);
          if (which === 'head' && t.font < 12 && t.what !== 'squad row' && t.what !== 'Needs a word row' && t.what !== 'dressing room player row') add('small', w, where, `${t.what} "${t.text}" reads at ${t.font} px`);
        }
      };
      const changed = async where => {
        if (which !== 'head') return;
        for (const s of await page.evaluate(smallChanged)) add('small', w, where, s);
      };
      const shot = async name => {
        const el = page.locator('[data-fit-screen]');
        await el.screenshot({ path: path.join(SHOTS, `${which}-${name}-${w}.jpg`), type: 'jpeg', quality: 50 }).catch(() => {});
      };
      const count = (key, n) => { small[`${key}|${w}`] = n; };

      if (motion === 'reduce') {
        await show('room', 'liverpool');
        await page.hover('[data-fit-screen="room"] .grid.grid-cols-2 > button');
        await page.waitForTimeout(350);
        let m = await page.evaluate(motionNow);
        if (m.tileLift !== 0 || m.tileMoves) add('motion', w, 'room', `a rung tile lifts ${m.tileLift}px or animates under reduced motion`);
        await click('[data-fit-screen="room"] .grid.grid-cols-2 > button');
        await page.waitForTimeout(300);
        if ((await page.evaluate(motionNow)).running) add('motion', w, 'room', 'an animation runs after opening a rung under reduced motion');
        await show('desk', 'liverpoolAllFinal');
        m = await page.evaluate(motionNow);
        if (m.barMoves) add('motion', w, 'desk', 'the wage bar animates its width under reduced motion');
        await click('[data-cm-show-more]');
        await page.waitForTimeout(300);
        if ((await page.evaluate(motionNow)).running) add('motion', w, 'desk', 'an animation runs after a press under reduced motion');
        await show('squad', 'liverpool');
        await click('[data-cm-squad-row] > button');
        await page.waitForTimeout(300);
        if ((await page.evaluate(motionNow)).running) add('motion', w, 'squad', 'an animation runs after opening a row under reduced motion');
        await ctx.close();
        continue;
      }
      /* the squad list, and its heads with every sort on from 768 up */
      for (const career of (w >= 768 ? ['liverpool', 'dundee'] : ['liverpool'])) {
        await show('squad', career);
        const t = await text(`squad ${career}`);
        if (career === 'liverpool') { count('squad', t.small); await taps('squad'); await changed('squad'); await shot('squad'); }
        if (w >= 768) {
          for (const key of SORT_KEYS) {
            await click(`[data-cm-sort="${key}"]`);
            await page.waitForTimeout(60);
            const hd = await page.evaluate(auditHeads);
            hd.bad.forEach(b => add('heads', w, `squad ${career} sorted by ${key}`, b));
            if (w === 768 && key === 'pos' && career === 'liverpool') {
              notes.push(`${which}: the name column is ${hd.nameWidth} px at 768`);
              if (hd.nameWidth < 120) add('heads', w, 'squad', `the name column is ${hd.nameWidth} px at 768`);
            }
          }
          await text(`squad ${career} after every sort`);
          if (career === 'dundee') await shot('squad-dundee-heads');
        }
        if (career === 'liverpool') {
          await click('[data-cm-squad-row] > button');
          await page.waitForTimeout(200);
          await text('squad, a row open');
          await changed('squad, a row open');
          await shot('squad-open');
        }
      }

      /* the contracts desk, as it stands and with everybody in his final year */
      for (const career of ['liverpool', 'liverpoolAllFinal']) {
        await show('desk', career);
        await text(`desk ${career}`);
        for (const b of await page.evaluate(auditDesk)) add('deskclip', w, `desk ${career}`, b);
        await taps(`desk ${career}`);
        await changed(`desk ${career}`);
        if (career === 'liverpool') await shot('desk');
        for (let i = 0; i < 3; i++) {
          const has = await page.evaluate(n => {
            const b = document.querySelector('[data-cm-show-more]');
            if (!b) return false;
            b.parentElement.setAttribute('data-fit-list', String(n));
            b.scrollIntoView({ block: 'center' });
            return true;
          }, i);
          if (!has) break;
          await page.waitForTimeout(700);
          const before = await page.evaluate(() => {
            const b = document.querySelector('[data-cm-show-more]');
            return { y: window.scrollY, top: b.getBoundingClientRect().top, idx: [...b.parentElement.children].indexOf(b) };
          });
          await click('[data-cm-show-more]');
          await page.waitForTimeout(300);
          const after = await page.evaluate(([n, idx]) => {
            const list = document.querySelector(`[data-fit-list="${n}"]`);
            const row = list ? list.children[idx] : null;
            return { y: window.scrollY, top: row ? row.getBoundingClientRect().top : null };
          }, [i, before.idx]);
          if (Math.abs(after.y - before.y) > 1) add('jump', w, `desk ${career}`, `Show the other moved the page ${after.y - before.y} px`);
          if (after.top === null || Math.abs(after.top - before.top) > 2) add('jump', w, `desk ${career}`, `the first new row is ${after.top === null ? 'missing' : `${Math.round(after.top - before.top)} px`} from where the button was`);
          if (w === 390) notes.push(`${which} ${career} at 390: Show the other kept scrollY ${before.y} to ${after.y}, row top ${Math.round(before.top)} to ${after.top === null ? 'none' : Math.round(after.top)}`);
        }
        const t = await text(`desk ${career}, every list shown`);
        count(`desk ${career}`, t.small);
        for (const b of await page.evaluate(auditDesk)) add('deskclip', w, `desk ${career}, every list shown`, b);
        await changed(`desk ${career}, every list shown`);
        if (career === 'liverpool' && w <= 390) {
          const live = await page.evaluate(() => {
            const b = [...document.querySelectorAll('[data-release-id]')].find(x => !x.disabled);
            if (b) b.click();
            return !!b;
          });
          await page.waitForTimeout(200);
          if (live) { await taps('desk, a release asked'); await text('desk, a release asked'); }
        }
      }

      /* the dressing room: the front, every rung and the first man on it */
      await show('room', 'liverpool');
      const front = await text('room front');
      count('room', front.small);
      await taps('room front');
      await changed('room front');
      await shot('room');
      const hs = await page.evaluate(tileHeights);
      if (hs.length && Math.max(...hs) - Math.min(...hs) > 1) add('tiles', w, 'room', `the rung tiles are ${Math.min(...hs)} to ${Math.max(...hs)} px tall`);
      const rungs = hs.length;
      const roomButtons = 'document.querySelectorAll(\'[data-fit-screen="room"] > div button\')';
      for (let i = 0; i < rungs; i++) {
        await page.evaluate(n => document.querySelectorAll('[data-fit-screen="room"] .grid.grid-cols-2 > button')[n].click(), i);
        await page.waitForTimeout(150);
        await text(`room rung ${i + 1}`);
        await taps(`room rung ${i + 1}`);
        await changed(`room rung ${i + 1}`);
        const people = await page.evaluate(`${roomButtons}.length - 1`);
        if (people > 0) {
          await page.evaluate(`${roomButtons}[1].click()`);
          await page.waitForTimeout(150);
          await text(`room rung ${i + 1}, a player`);
          await taps(`room rung ${i + 1}, a player`);
          await changed(`room rung ${i + 1}, a player`);
          if (i === 0) await shot('room-player');
          await page.evaluate(`${roomButtons}[0].click()`);
          await page.waitForTimeout(100);
        }
        await page.evaluate(`${roomButtons}[0].click()`);
        await page.waitForTimeout(100);
      }

      /* the career card: an old save's worst defeat, a made up manager with an approach and a country, a Skip career */
      for (const career of ['everton', 'manager', 'liverpool']) {
        await show('card', career);
        const t = await text(`card ${career}`);
        count(`card ${career}`, t.small);
        await taps(`card ${career}`);
        await changed(`card ${career}`);
        await shot(`card-${career}`);
      }

      /* the "?" sheet holds the round's paragraph once */
      if (which === 'head') {
        await show('help', 'liverpool');
        const opened = await click('[data-fit-screen="help"] button');
        await page.waitForTimeout(700);
        const help = await page.evaluate(() => {
          const ps = [...document.querySelectorAll('[data-cm-help="game-deals"]')];
          const r = ps[0] ? ps[0].getBoundingClientRect() : null;
          return { n: ps.length, font: ps[0] ? parseFloat(getComputedStyle(ps[0]).fontSize) : 0, right: r ? r.right : 0, vw: window.innerWidth };
        });
        if (!opened || help.n !== 1) add('help', w, 'help', `the sheet holds the game's deals paragraph ${help.n} times`);
        else if (help.right > help.vw + 1) add('help', w, 'help', 'the paragraph runs off the screen');
      }
      if (errors.length) add('error', w, 'page', errors[0]);
      await ctx.close();
    }
  }
  return { findings, small, notes };
}

/** One line a finding, the same finding at the same place and size once. */
function summarise(label, findings) {
  const seen = new Set();
  const lines = [];
  for (const f of findings) {
    const line = `${f.kind} at ${f.w}: ${f.where}: ${f.detail}`;
    if (!seen.has(line)) { seen.add(line); lines.push(line); }
  }
  const kinds = {};
  for (const f of findings) kinds[f.kind] = (kinds[f.kind] || 0) + 1;
  console.log(`${label}: ${lines.length} findings (${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'})`);
  const byKind = {};
  for (const l of lines) { const k = l.split(' ')[0]; (byKind[k] ||= []).push(l); }
  for (const [, ls] of Object.entries(byKind)) ls.slice(0, 8).forEach(l => console.log(`   ${l}`));
  return lines;
}

let exitCode = 0;
const browser = (PART === '1' || PART === 'all') ? await chromium.launch() : null;
try {
  if (browser) {
    const cssFiles = process.env.CM_FIT_CSS ? [path.resolve(process.env.CM_FIT_CSS)]
      : fs.readdirSync(path.join(ROOT, 'dist/assets')).filter(n => n.endsWith('.css')).sort().map(n => path.join(ROOT, 'dist/assets', n));
    assert(cssFiles.length > 0, 'No built stylesheet in dist/assets. Nothing was checked.');
    const css = cssFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
    console.log(`PART 1, CSS: ${process.env.CM_FIT_CSS ? 'PRE-BUILD PREVIEW, not release proof' : 'built dist/assets'} (${cssFiles.length} file(s)), every request blocked`);
    /* Tailwind writes a rule only for a class its source holds, so the base's squad grid has no rule in this
       tree's stylesheet. The base components are drawn with the base build's own stylesheet when
       CM_FIT_BASE_DIST names it; otherwise, and for the oldgrid control, the one rule the old grid needs is
       written out by hand (an attribute selector, so no escaping), and the log says so. */
    const OLD_GRID_RULE = `@media (min-width: 768px) { [class~="${CONTROLS.oldgrid.to}"] { grid-template-columns: ${CONTROLS.oldgrid.to.slice('md:grid-cols-['.length, -1).replace(/_/g, ' ')}; } }`;
    const baseDist = process.env.CM_FIT_BASE_DIST ? path.join(process.env.CM_FIT_BASE_DIST, 'assets') : '';
    const baseCssFiles = baseDist && fs.existsSync(baseDist) ? fs.readdirSync(baseDist).filter(n => n.endsWith('.css')).sort().map(n => path.join(baseDist, n)) : [];
    const baseCss = baseCssFiles.length ? baseCssFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n') : `${css}\n${OLD_GRID_RULE}`;
    if (CONTROL) {
      if (CONTROL === 'oldgrid') console.log(`   the old grid's rule, written by hand: ${OLD_GRID_RULE}`);
      const head = await partOne('head', browser, CONTROL === 'oldgrid' ? `${css}\n${OLD_GRID_RULE}` : css);
      const c = CONTROLS[CONTROL];
      const hit = head.findings.filter(f => f.kind === c.kind && f.w === c.size);
      summarise(`control ${CONTROL}`, head.findings);
      if (hit.length) { console.log(`CONTROL ${CONTROL} FIRED: ${hit.length} ${c.kind} findings at ${c.size}, first: ${hit[0].where}: ${hit[0].detail}`); exitCode = 1; }
      else { console.log(`FAIL control ${CONTROL}: no ${c.kind} finding at ${c.size}`); exitCode = 3; }
    } else {
      console.log(`   the base is drawn with ${baseCssFiles.length ? `the base build's stylesheet (${baseDist})` : 'this tree\'s stylesheet plus the old grid\'s rule written by hand'}`);
      const base = await partOne('base', browser, baseCss);
      const baseLines = summarise(`PART 1 BASE (${BASE_SHA}, expected red: the findings this round closes)`, base.findings);
      const head = await partOne('head', browser, css);
      const headLines = summarise('PART 1 HEAD', head.findings);
      [...base.notes, ...head.notes].forEach(n => console.log(`   note: ${n}`));
      let rose = 0;
      for (const [key, n] of Object.entries(head.small)) {
        const was = base.small[key];
        if (was !== undefined && n > was) { rose += 1; console.log(`   FAIL under 12 px rose on ${key}: ${was} on the base, ${n} now`); }
      }
      const tally = Object.entries(head.small).map(([k, n]) => `${k} ${base.small[k] ?? '?'}>${n}`);
      console.log(`   under 12 px, base>head, per screen and size: ${tally.join('; ')}`);
      fs.writeFileSync(path.join(SHOTS, 'part1.json'), JSON.stringify({ base: baseLines, head: headLines, small: { base: base.small, head: head.small }, notes: [...base.notes, ...head.notes] }, null, 1));
      if (headLines.length || rose) exitCode = 1;
      console.log(headLines.length || rose ? `PART 1: FAIL, ${headLines.length} findings and ${rose} rises on this tree` : 'PART 1: green on this tree, every rule met at all four sizes');
    }
  }
} finally {
  if (browser) await browser.close();
}
/* ---------------- Part 2: the real page, a build of this tree against a build of the base ---------------- */

const SAVE_KEY = 'dukb-club-manager-save';
const HEAD_URL = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const BASE_URL = process.env.CM_FIT_BASE_URL || '';
const RUNGS = ['Star man', 'Key first teamer', 'Rotation option', 'Backup', 'One for the future'];
const fails = [];
const fail = m => { fails.push(m); console.log(`   FAIL ${m}`); };

async function realPage(browser, url, { w, h, seed, save, reduced }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([s0, raw, key]) => {
    let s = (s0 >>> 0) || 1;
    let draws = 0;
    Math.random = () => {
      draws += 1;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), s | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    window.__draws = () => draws;
    const FIXED = 1790000000000;
    const Real = Date;
    class Frozen extends Real {
      constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); }
      static now() { return FIXED; }
    }
    window.Date = Frozen;
    if (raw) { try { localStorage.setItem(key, raw); } catch { /* storage blocked */ } }
  }, [seed, save || '', SAVE_KEY]);
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

/** The presses both builds get, in order. `reads` runs only on this tree's build and only reads the page. */
async function playThrough(page, which, tag, reads) {
  const steps = [];
  const step = (ok, what) => { steps.push(`${ok ? 'ok' : 'MISSED'} ${what}`); };
  await pressText(page, /^Essential only$/i, 1500);
  step(await tab(page, 'Squad'), 'the Squad tab');
  await page.waitForTimeout(900);
  const picker = page.locator('select[aria-label="Sort squad"]:visible');
  if (await picker.count()) {
    for (const key of SORT_KEYS) { await picker.selectOption(key).catch(() => {}); await page.waitForTimeout(80); }
    step(true, 'every sort key once (the phone picker)');
  } else {
    for (const key of SORT_KEYS) await page.locator(`[data-cm-sort="${key}"]`).first().click({ timeout: 2000 }).catch(() => {});
    step(true, 'every sort key once (the heads)');
  }
  const rows = page.locator('[data-cm-squad-row] > button');
  for (let i = 0; i < 3; i++) {
    await rows.nth(i).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
    if (i === 0 && reads) await reads('squad row open', page);
    await rows.nth(i).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  step(true, 'three rows opened and shut');
  await page.locator('[data-contracts-desk]').scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  if (reads) await reads('desk', page);
  step(await tab(page, 'Home'), 'the Home tab');
  await page.waitForTimeout(600);
  step(await pressText(page, /^🤝\s*Dressing room/), 'the Dressing room tile');
  await page.waitForTimeout(700);
  let men = 0;
  for (const rung of RUNGS) {
    const tile = page.locator('button:visible').filter({ hasText: rung }).filter({ hasText: /\d+ players?/ }).first();
    if (!(await tile.click({ timeout: 2500 }).then(() => true).catch(() => false))) { step(false, `the ${rung} rung`); continue; }
    await page.waitForTimeout(400);
    if (men < 2) {
      const man = page.locator('button:visible').filter({ hasText: /in last \d+|No games yet/ }).first();
      if (await man.click({ timeout: 2000 }).then(() => true).catch(() => false)) {
        men += 1;
        await page.waitForTimeout(400);
        if (reads) await reads('dressing room man', page);
        await pressName(page, rung);
        await page.waitForTimeout(300);
      }
    }
    await pressName(page, 'The dressing room');
    await page.waitForTimeout(300);
  }
  step(men === 2, `${men} men opened in the dressing room`);
  step(await pressName(page, 'Club home'), 'back to the hub');
  await page.waitForTimeout(500);
  step(await pressText(page, /^🧢\s*Manager/), 'the Manager tile');
  await page.waitForTimeout(700);
  if (reads) await reads('manager', page);
  await pressName(page, 'Club home');
  await page.waitForTimeout(500);
  let sims = 0;
  for (let k = 0; k < 3; k++) {
    for (let tries = 0; tries < 8; tries++) {
      const quick = page.locator('[data-cm-way="quick"]:visible').first();
      if (await quick.count()) { await quick.click({ timeout: 3000 }).catch(() => {}); sims += 1; await page.waitForTimeout(2500); break; }
      const moved = await pressText(page, /^(Continue|Carry on|Next|Done|OK|Close the window|Shut the window|Back to club|Club home)$/i, 1500);
      if (!moved && !(await tab(page, 'Home'))) break;
      await page.waitForTimeout(900);
    }
  }
  step(sims === 3, `${sims} of 3 Quick Sims`);
  await page.waitForTimeout(1500);
  const save = await page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
  const draws = await page.evaluate(() => window.__draws());
  console.log(`   ${which} ${tag}: ${steps.join(', ')}; ${draws} random draws; save ${save ? save.length : 0} chars`);
  return { save, draws, steps };
}
async function newLiverpool(page) {
  await pressText(page, /^Essential only$/i, 1500);
  if (await page.locator('text=Start Fresh').count()) { await page.locator('text=Start Fresh').first().click(); await page.waitForTimeout(800); }
  await page.locator('button:has-text("2026-27")').first().click({ timeout: 10000 });
  await page.waitForTimeout(700);
  await page.locator('text=England').first().click({ timeout: 5000 });
  await page.waitForTimeout(700);
  await page.locator('button:has-text("Premier League")').first().click({ timeout: 5000 });
  await page.waitForTimeout(700);
  await page.locator('button:has-text("Liverpool")').first().click({ timeout: 5000 });
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
function firstDiff(a, b) {
  if (a === b) return -1;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return n;
}
function diffPaths(a, b, at = '', out = []) {
  if (out.length >= 10) return out;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${at || '(root)'}: ${String(JSON.stringify(a)).slice(0, 60)} on the base, ${String(JSON.stringify(b)).slice(0, 60)} now`);
    return out;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffPaths(a[k], b[k], `${at}.${k}`, out);
  return out;
}
const runningIn = (page, sel) => page.evaluate(s => {
  const all = document.getAnimations().filter(a => a.playState === 'running');
  const mine = all.filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest(s));
  return { mine: mine.length, all: all.length };
}, sel);

if (PART === '2' || PART === 'all') {
  console.log(`PART 2: this tree at ${HEAD_URL}, the base at ${BASE_URL || '(none given)'}`);
  const b2 = await chromium.launch();
  try {
    if (firstDiff('{"a":1,"b":"x"}', '{"a":1,"b":"y"}') < 0 || firstDiff('{"a":1}', '{"a":1}') !== -1) fail('the save comparator cannot tell a one byte change');
    else console.log('   comparator: a save altered by one byte is reported, an equal one is not');
    if (!BASE_URL) fail('no CM_FIT_BASE_URL, so section D compared nothing');
    const builds = [['head', HEAD_URL], ...(BASE_URL ? [['base', BASE_URL]] : [])];
    const results = {};
    const liverpoolReads = async (where, page) => {
      const n = s => page.locator(s).count();
      if (where === 'squad row open') {
        if (!(await n('[data-cm-deal-note="squad"]'))) fail('B Liverpool: the squad list has no note saying wages and deals are this game\'s');
        if (!(await n('[data-cm-squad-detail] [data-cm-deal-label]'))) fail('B Liverpool: an opened real man\'s row has no deal label');
      } else if (where === 'desk') {
        if (!(await n('[data-cm-deal-note="desk"]'))) fail('B Liverpool: the contracts desk has no note');
        if (!(await n('[data-contracts-desk] [data-cm-deal-label]'))) fail('B Liverpool: no real man on the desk carries the deal label');
      } else if (where === 'dressing room man') {
        if (!(await n('[data-cm-room-player] [data-cm-deal-label]'))) fail('B Liverpool: a real man in the dressing room has no wage label');
      }
    };
    const herthaReads = async (where, page) => {
      if (where !== 'manager') return;
      const line = (await page.locator('[data-cm-worst-defeat]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
      if (!line.includes('2-3 vs Nürnberg')) fail(`B Hertha: the worst defeat reads "${line}"`);
      else console.log(`   B Hertha at 320: "${line.trim()}"`);
    };
    for (const [which, url] of builds) {
      {
        const { ctx, page, errors } = await realPage(b2, url, { w: 390, h: 844, seed: 1 });
        await newLiverpool(page);
        results[`${which} liverpool`] = await playThrough(page, which, 'Liverpool 2026-27 at 390', which === 'head' ? liverpoolReads : null);
        await page.screenshot({ path: path.join(SHOTS, `real-${which}-liverpool-390.jpg`), type: 'jpeg', quality: 50 }).catch(() => {});
        if (errors.length) fail(`${which} Liverpool: page error ${errors[0]}`);
        await ctx.close();
      }
      {
        const raw = fs.readFileSync(path.join(ROOT, 'scripts/data/cmBookSaveHerthaFixture.json'), 'utf8');
        const { ctx, page, errors } = await realPage(b2, url, { w: 320, h: 640, seed: 2, save: raw });
        await resume(page);
        results[`${which} hertha`] = await playThrough(page, which, 'Hertha book save at 320', which === 'head' ? herthaReads : null);
        if (errors.length) fail(`${which} Hertha: page error ${errors[0]}`);
        await ctx.close();
      }
    }
    for (const career of ['liverpool', 'hertha']) {
      const h = results[`head ${career}`];
      const b = results[`base ${career}`];
      if (!h || !b) continue;
      if (!h.save || !b.save) { fail(`D ${career}: no save was written on ${!h.save ? 'this tree' : 'the base'}`); continue; }
      if (h.save !== b.save) fail(`D ${career}: the saves differ from char ${firstDiff(b.save, h.save)}: ${diffPaths(JSON.parse(b.save), JSON.parse(h.save)).join(' | ')}`);
      else console.log(`   D ${career}: the saves are byte equal, ${h.save.length} chars`);
      if (h.draws !== b.draws) fail(`D ${career}: ${b.draws} random draws on the base, ${h.draws} on this tree`);
      else console.log(`   D ${career}: ${h.draws} random draws on both builds`);
      if (h.steps.join('|') !== b.steps.join('|')) fail(`D ${career}: the two walks did not take the same steps`);
      if (h.steps.some(s => s.startsWith('MISSED'))) console.log(`   D ${career}: steps missed on both builds: ${h.steps.filter(s => s.startsWith('MISSED')).join(', ')}`);
    }
    /* B: the Everton book save's worst defeat at 320, low first on this tree and raw on the base */
    for (const [which, url] of builds) {
      const raw = fs.readFileSync(path.join(ROOT, 'scripts/data/cmBookSaveEvertonFixture.json'), 'utf8');
      const { ctx, page } = await realPage(b2, url, { w: 320, h: 640, seed: 3, save: raw });
      await resume(page);
      await pressText(page, /^🧢\s*Manager/);
      await page.waitForTimeout(800);
      const line = (await page.locator('p').filter({ hasText: 'Worst defeat:' }).first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      const want = which === 'head' ? '1-5 vs Newcastle' : '5-1 vs Newcastle';
      if (!line.includes(want)) fail(`B ${which}: the Everton save's worst defeat reads "${line}", not "${want}"`);
      else console.log(`   B ${which} Everton at 320: "${line}"`);
      await page.screenshot({ path: path.join(SHOTS, `real-${which}-everton-manager-320.jpg`), type: 'jpeg', quality: 50 }).catch(() => {});
      await ctx.close();
    }
    /* C: reduced motion on this tree, after a press on each screen */
    {
      const raw = fs.readFileSync(path.join(ROOT, 'scripts/data/cmBookSaveEvertonFixture.json'), 'utf8');
      const { ctx, page } = await realPage(b2, HEAD_URL, { w: 390, h: 844, seed: 4, save: raw, reduced: true });
      await resume(page);
      const seen = [];
      await tab(page, 'Squad');
      await page.waitForTimeout(800);
      await page.locator('[data-cm-squad-row] > button').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
      seen.push(['squad list', await runningIn(page, '[data-cm-squad-list]')]);
      await page.locator('[data-cm-show-more]').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
      seen.push(['contracts desk', await runningIn(page, '[data-contracts-desk]')]);
      await tab(page, 'Home');
      await page.waitForTimeout(500);
      await pressText(page, /^🤝\s*Dressing room/);
      await page.waitForTimeout(500);
      await page.locator('[data-cm-rung]').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
      seen.push(['dressing room', await runningIn(page, '[data-cm-roles]')]);
      await pressName(page, 'Club home');
      await page.waitForTimeout(400);
      await pressText(page, /^🧢\s*Manager/);
      await page.waitForTimeout(500);
      seen.push(['career card', await runningIn(page, '[data-cm-career-card]')]);
      for (const [where, r] of seen) {
        if (r.mine) fail(`C: ${r.mine} animations run on the ${where} under reduced motion`);
      }
      console.log(`   C reduced motion: ${seen.map(([w, r]) => `${w} ${r.mine} running (${r.all} on the whole page)`).join(', ')}`);
      await ctx.close();
    }
    /* E: the engine chunk, the one carrying the save key, is the same file in both builds */
    const baseDist = process.env.CM_FIT_BASE_DIST || '';
    /* A chunk's file name carries a hash of its bytes, and those bytes hold the names of the chunks it imports, so
       a change to any page renames every chunk that imports the entry. The engine chunk is therefore compared
       twice: by name and bytes as built, and with every hashed chunk name set aside, which is the engine's own
       code. The second is the one that must hold; the first is reported as measured. */
    const unhash = s => s.replace(/-[A-Za-z0-9_-]{8}\.(js|css)/g, '-HASH.$1');
    const withKey = dir => fs.readdirSync(path.join(dir, 'assets')).filter(f => f.endsWith('.js') && fs.readFileSync(path.join(dir, 'assets', f), 'utf8').includes(SAVE_KEY)).sort();
    if (!baseDist || !fs.existsSync(path.join(baseDist, 'assets'))) fail('E: no CM_FIT_BASE_DIST, so the engine chunks were not compared');
    else {
      const h = withKey(path.join(ROOT, 'dist'));
      const b = withKey(baseDist);
      const read = (dir, f) => fs.readFileSync(path.join(dir, 'assets', f), 'utf8');
      const raw = h.length === b.length && h.every((f, i) => f === b[i] && read(path.join(ROOT, 'dist'), f) === read(baseDist, b[i]));
      const code = h.length === b.length && h.every((f, i) => unhash(f) === unhash(b[i]) && unhash(read(path.join(ROOT, 'dist'), f)) === unhash(read(baseDist, b[i])));
      console.log(`   E: the chunks holding the save key: base ${b.map(f => `${f} (${read(baseDist, f).length} bytes)`).join(', ')}; this tree ${h.map(f => `${f} (${read(path.join(ROOT, 'dist'), f).length} bytes)`).join(', ')}; same name and bytes as built: ${raw ? 'yes' : 'no'}`);
      if (!code) fail('E: the chunks holding the save key differ in their own code, not only in the hashed names they import');
      else console.log('   E: with the hashed chunk names set aside, the engine chunks are byte equal');
    }
  } finally {
    await b2.close();
  }
  if (fails.length) exitCode = exitCode || 1;
  console.log(fails.length ? `PART 2: FAIL, ${fails.length} findings` : 'PART 2: green, labels and the low first defeat on the real page, nothing running under reduced motion, saves and draws equal');
}
console.log(`Shots and part1.json: ${SHOTS}`);
process.exit(exitCode);
