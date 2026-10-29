/* fix3 scratch (sent as .rc/x/dashscan.mjs): the dash scan of ADDED lines. Every line the round added since
   its base (default f957b34ea) under src, scripts and supabase, read from git diff, must hold no en or em dash.
   Usage: node dashscan.mjs [base] ; DASH_CONTROL=1 adds one fake added line with a dash, which must fail. */
import { execSync } from 'node:child_process';
const base = process.argv[2] || 'f957b34ea';
const diff = execSync(`git diff ${base} HEAD -U0 -- src scripts supabase index.html`, { maxBuffer: 256 * 1024 * 1024 }).toString();
const dash = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
let file = '', added = 0;
const hits = [];
const lines = diff.split('\n');
if (process.env.DASH_CONTROL) lines.push('+++ b/control.ts', `+const x = 'a ${String.fromCharCode(0x2014)} b';`);
for (const l of lines) {
  if (l.startsWith('+++ ')) { file = l.slice(6); continue; }
  if (!l.startsWith('+') || l.startsWith('+++')) continue;
  added++;
  if (dash.test(l)) hits.push(`${file}: ${l.slice(1, 140)}`);
}
for (const h of hits.slice(0, 10)) console.log(`DASH ${h}`);
console.log(`dashscan ${hits.length ? 'FAIL' : 'PASS'}: ${hits.length} of ${added} added lines since ${base} carry a dash${process.env.DASH_CONTROL ? ', CONTROL' : ''}`);
process.exit(hits.length ? 1 : 0);
