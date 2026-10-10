/* Round 1215, a measuring aid sent to a runner as an extra file and never committed: how often do the PAGES of a
   browser walk call Math.random? It SEEDS NOTHING: the page keeps the generator it had, every call is only counted.
   Preloaded in front of an unedited walk:   node --import ./.rc/x/drawcount.mjs scripts/playX.mjs
   Every walk reaches the browser through the one playwright module, so wrapping its launch reaches every context.
   The count is a floor: a page reports twice a second and when it is hidden, so draws made in the last half second
   before a navigation can go uncounted. The last line printed is the total and the walk's own exit code. */
import pw from 'playwright';

const byPath = new Map();
let loads = 0;
let contexts = 0;
const wrapped = new WeakSet();

function inPage() {
  if (window.__drawCount) return;
  const real = Math.random;
  const state = { n: 0, sent: -1 };
  window.__drawCount = state;
  Math.random = function counted() { state.n += 1; return real.call(Math); };
  const flush = () => {
    if (state.n === state.sent || typeof window.__drawReport !== 'function') return;
    const more = state.n - Math.max(0, state.sent);
    const first = state.sent < 0;
    state.sent = state.n;
    try { window.__drawReport(location.pathname, more, first); } catch (e) { /* the page is going away */ }
  };
  setInterval(flush, 500);
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', flush);
}

async function wrapContext(context) {
  if (wrapped.has(context)) return context;
  wrapped.add(context);
  contexts += 1;
  try {
    await context.exposeBinding('__drawReport', (source, pathname, more, first) => {
      if (first) loads += 1;
      byPath.set(pathname, (byPath.get(pathname) || 0) + (Number(more) || 0));
    });
    await context.addInitScript(inPage);
  } catch (e) { console.log(`[draws] a context could not be counted: ${e.message}`); }
  return context;
}

function wrapBrowser(browser) {
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => wrapContext(await newContext(...args));
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => { const page = await newPage(...args); await wrapContext(page.context()); return page; };
  return browser;
}

for (const type of [pw.chromium, pw.firefox, pw.webkit]) {
  if (!type || typeof type.launch !== 'function') continue;
  const launch = type.launch.bind(type);
  type.launch = async (...args) => wrapBrowser(await launch(...args));
  const persistent = type.launchPersistentContext.bind(type);
  type.launchPersistentContext = async (...args) => wrapContext(await persistent(...args));
}

/* a walk cut off by `timeout` still says what it had counted */
process.on('SIGTERM', () => process.exit(143));
process.on('exit', code => {
  const total = [...byPath.values()].reduce((a, b) => a + b, 0);
  const paths = [...byPath.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, n]) => `${p} ${n}`).join(', ');
  console.log(`[draws] total ${total} in ${loads} page loads of ${contexts} contexts, walk exit ${code}; by path: ${paths || 'none'}`);
});
