// Closing check probe (never committed): the plugin's apply turned from build to serve (the review's m6).
// Proves which simPreloadWait sections see it. Refuses to run if the anchor is not there exactly once.
import fs from 'node:fs';
const f = 'scripts/lib/vitePreloadWait.mjs';
const t = fs.readFileSync(f, 'utf8');
const from = "apply: 'build',";
const n = t.split(from).length - 1;
if (n !== 1) { console.error('mutApply: anchor found ' + n + ' times, expected 1, refusing'); process.exit(3); }
fs.writeFileSync(f, t.replace(from, "apply: 'serve',"));
console.log('mutApply: apply set to serve in ' + f);
