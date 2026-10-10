/* Reviewer's walk of Round 1112, the entry (never committed): node .rc/x/rv-walk-all.mjs
   The parts are imported one after another (two static imports with top level await run side by side). */
const { browser, tally, say } = await import('./rv-walk.mjs');
for (const part of ['./rv-walk2.mjs', './rv-walk3.mjs']) {
  try { await import(part); } catch (e) { say(false, `${part} stopped: ${String(e && e.stack ? e.stack : e).split('\n').slice(0, 4).join(' | ')}`); }
}
await browser.close();
const t = tally();
console.log(`\nrv-walk: ${t.checks} checks, ${t.failed} failed`);
process.exit(t.failed ? 1 : 0);
