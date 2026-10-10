/* Reviewer's walk of Round 1112, the entry (never committed): node .rc/x/rv-walk-all.mjs */
import './rv-walk2.mjs';
import './rv-walk3.mjs';
import { browser, tally } from './rv-walk.mjs';

await browser.close();
const t = tally();
console.log(`\nrv-walk: ${t.checks} checks, ${t.failed} failed`);
process.exit(t.failed ? 1 : 0);
