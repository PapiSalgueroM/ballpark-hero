/* Reviewer's walk of Round 1112, second run entry (never committed): node .rc/x/rv-walk-all2.mjs */
const { browser, tally, say } = await import('./rv-walk.mjs');
for (const part of ['./rv-walk-b.mjs', './rv-walk-c.mjs']) {
  try { await import(part); } catch (e) { say(false, `${part} stopped: ${String(e && e.stack ? e.stack : e).split('\n').slice(0, 4).join(' | ')}`); }
}
await browser.close();
const t = tally();
console.log(`\nrv-walk second run: ${t.checks} checks, ${t.failed} failed`);
process.exit(t.failed ? 1 : 0);
