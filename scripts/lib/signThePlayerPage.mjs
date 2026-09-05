/* Round 441: plays the REAL SignThePlayer page in jsdom.
 *
 * The auction's rules live in src/lib/auctionHouse.ts and are held by the
 * engine sections of scripts/simSignThePlayerAuction.mjs. What lives only in
 * the page is the wiring: whose turn it is, and who starts the rivals when
 * you have no say in a lot. That cannot be checked without rendering the real
 * component, so this does exactly that: mounts the page with the providers
 * main.tsx gives it, serves it the committed market snapshot, collapses the
 * animation delays (they pace the room, they are not rules), then presses the
 * buttons a player would press until the showdown appears or nothing moves.
 *
 * `control: true` restores the pre Round 441 wiring in a bundled copy of the
 * page: the rivals started from a separate effect keyed on whether you were
 * active, which fires only when that flag CHANGES, so two lots in a row you
 * could not bid on killed the auction. It refuses to run if either line it
 * means to rewrite is not in the source.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';

const OLD_WIRING = `
  const youActive = activeIds.has('you');
  useEffect(() => {
    if (phase === 'auction' && lot && lot.kind === 'auction' && !youActive && aiThinking) {
      runAis(price, leader, activeIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lotIndex, youActive]);

  const score`;

export async function playPageAuctions({ root, rows, control = false, runs = 6 }) {
  const TMP = os.tmpdir().replace(/\\/g, '/');
  const ENTRY = `${TMP}/signThePlayerPage.entry.mjs`;
  const BUNDLE = `${TMP}/signThePlayerPage.${control ? 'control' : 'live'}.bundle.cjs`;
  const PAGE = `${root}/src/pages/SignThePlayer.tsx`;

  let pagePath = PAGE;
  if (control) {
    /* A fresh checkout is CRLF, so match against normalised text or the
       control silently finds nothing and proves nothing. */
    const src = fs.readFileSync(PAGE, 'utf8').replace(/\r\n/g, '\n');
    const startNeedle = `    if (!active.has('you')) {\n      setAiThinking(true);\n      runAis(lot.player.basePrice, null, active);\n    }`;
    const scoreNeedle = '\n  const score';
    if (!src.includes(startNeedle)) throw new Error('control run: the lot opener no longer starts the rivals itself, refusing to run a dead control');
    if (!src.includes(scoreNeedle)) throw new Error('control run: could not find where to put the old effect back, refusing to run a dead control');
    pagePath = `${TMP}/SignThePlayer.control.tsx`;
    fs.writeFileSync(pagePath, src
      .replace(startNeedle, `    if (!active.has('you')) setAiThinking(true);`)
      .replace(scoreNeedle, OLD_WIRING));
  }

  fs.writeFileSync(ENTRY, `
export { default as Page } from '${pagePath}';
import React from '${root}/node_modules/react/index.js';
export { React };
export * as ReactDom from '${root}/node_modules/react-dom/client.js';
export * as TL from '${root}/node_modules/@testing-library/react/dist/index.js';
export { AuthProvider } from '${root}/src/contexts/AuthContext.tsx';
export { MemoryRouter } from '${root}/node_modules/react-router-dom/dist/index.js';
export { QueryClient, QueryClientProvider } from '${root}/node_modules/@tanstack/react-query/build/modern/index.js';
export { HelmetProvider } from '${root}/node_modules/react-helmet-async/lib/index.esm.js';
`);
  execSync(`"${root}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=cjs --platform=browser --jsx=automatic --alias:@=${root}/src --outfile="${BUNDLE}" --log-level=error --define:process.env.NODE_ENV='"development"' --define:global=globalThis`,
    { stdio: 'inherit', env: { ...process.env, NODE_PATH: `${root}/node_modules` } });

  const require2 = createRequire(import.meta.url);
  const { JSDOM } = require2(`${root}/node_modules/jsdom/lib/api.js`);
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://douknowball.com/sign-the-player', pretendToBeVisual: true });
  const win = dom.window;
  for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'localStorage', 'sessionStorage', 'CustomEvent', 'DOMParser', 'MutationObserver']) {
    if (win[k] !== undefined) { try { Object.defineProperty(globalThis, k, { value: win[k], writable: true, configurable: true }); } catch { /* locked by the runtime, the window copy is enough */ } }
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  class NoopObserver { observe() {} unobserve() {} disconnect() {} }
  globalThis.IntersectionObserver = NoopObserver;
  win.IntersectionObserver = NoopObserver;
  win.scrollTo = () => {};
  win.HTMLElement.prototype.scrollIntoView = () => {};

  const realFetch = globalThis.fetch;
  const served = async (u, i) => {
    const href = String(u && u.url ? u.url : u);
    if (href.includes('/rest/v1/player_market_values')) {
      return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    /* Nothing else the page reaches for matters to the auction, and a harness
       must not depend on the network to answer. */
    return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  globalThis.fetch = served;
  win.fetch = served;

  /* The room's timers only pace it. Collapse them to microtasks so a 22 lot
     auction plays in a moment, but keep clearTimeout working: the page uses
     it to cancel a decay you snap. */
  const realSetTimeout = globalThis.setTimeout;
  let tid = 0;
  const cancelled = new Set();
  win.setTimeout = fn => {
    const id = (tid += 1);
    Promise.resolve().then(() => { if (!cancelled.has(id)) fn(); });
    return id;
  };
  win.clearTimeout = id => cancelled.add(id);

  const mod = require2(BUNDLE);
  const { Page, React, ReactDom, TL, AuthProvider, MemoryRouter, QueryClient, QueryClientProvider, HelmetProvider } = mod;
  const { act } = TL;

  const settle = async () => {
    await act(async () => {
      for (let i = 0; i < 400; i += 1) await Promise.resolve();
      await new Promise(r => realSetTimeout(r, 0));
    });
  };

  const results = [];
  const POLICIES = ['open', 'pass', 'chase'];
  for (let n = 0; n < runs; n += 1) {
    const policy = POLICIES[n % POLICIES.length];
    const host = win.document.createElement('div');
    win.document.body.appendChild(host);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tree = React.createElement(HelmetProvider, null,
      React.createElement(QueryClientProvider, { client: qc },
        React.createElement(AuthProvider, null,
          React.createElement(MemoryRouter, { initialEntries: ['/sign-the-player'] },
            React.createElement(Page)))));
    const reactRoot = ReactDom.createRoot(host);
    await act(async () => { reactRoot.render(tree); });
    await settle();

    const buttons = () => [...host.querySelectorAll('button')].map(b => ({ el: b, text: b.textContent.trim(), off: b.disabled }));
    const press = async match => {
      const b = buttons().find(x => match(x.text) && !x.off);
      if (!b) return false;
      await act(async () => { b.el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); });
      await settle();
      return true;
    };
    const lotLabel = () => (host.textContent.match(/Lot \d+\/\d+/) || [null])[0];
    const done = () => host.textContent.includes('Golden Boot');

    await press(t => t.includes('Current Stars'));
    for (let i = 0; i < 80 && !lotLabel() && !done(); i += 1) { await new Promise(r => realSetTimeout(r, 25)); await settle(); }

    const seen = new Set();
    let last = null;
    let idle = 0;
    let finished = false;
    for (let turn = 0; turn < 900; turn += 1) {
      if (done()) { finished = true; break; }
      const here = lotLabel();
      if (here) seen.add(here);
      let acted = false;
      if (policy !== 'pass') acted = await press(t => /^Open at/.test(t));
      if (!acted) acted = await press(t => /^Take him at/.test(t));
      if (!acted && policy === 'chase') acted = await press(t => t === 'Bid +5M');
      if (!acted) acted = await press(t => t === 'Pass');
      if (!acted) { await new Promise(r => realSetTimeout(r, 20)); await settle(); }
      if (here === last) idle += 1; else { idle = 0; last = here; }
      if (idle > 40) break;
    }
    const text = host.textContent;
    /* Markers that appear in ONE phase only: the SEO block at the foot of the
       page names the themes in every phase, so "Current Stars" is not one. */
    const stage = lotLabel() ? 'the auction' : text.includes('Run it back') ? 'the showdown screen'
      : text.includes('The auction: you vs') ? 'the intro' : 'a screen with no lot and no result';
    results.push({
      policy,
      finished,
      stage,
      lastLot: lotLabel() ?? stage,
      lotsSeen: seen.size,
      buttons: buttons().filter(b => !b.off && /Open at|Take him at|Bid \+|^Pass$/.test(b.text)).length,
      screen: text.replace(/\s+/g, ' ').slice(0, 160),
    });
    await act(async () => { reactRoot.unmount(); });
    host.remove();
  }

  globalThis.fetch = realFetch;
  /* pretendToBeVisual installs a requestAnimationFrame loop, which holds the
     event loop open forever and would leave this harness hanging after its
     last green line. Closing the window tears that down. */
  win.close();
  return results;
}
