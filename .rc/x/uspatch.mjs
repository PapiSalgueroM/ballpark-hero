/* Release AM fixer pass 2. A SCRATCH probe, never committed: it edits a copy of Codex's Round 1084 native
   driver inside a throwaway checkout on the runner, to test one idea about why that driver times out.

   The idea: the driver rewrites its whole report.json, synchronously, four times for every local request
   the page makes (start, status, body, end). The report grows with every finished case, so late in the run a
   page load of about a hundred requests spends longer writing receipts than the driver's own 15 second
   navigation limit allows.

     node uspatch.mjs measure  <driver>   only times save(), changes nothing else
     node uspatch.mjs throttle <driver>   also lets the four request path saves share one write per 250 ms

   Every assertion, wait, limit and fixture of the driver is left alone in both modes. */
import fs from 'node:fs';
import assert from 'node:assert/strict';

const [mode, file] = process.argv.slice(2);
assert(['measure', 'throttle'].includes(mode), 'mode is measure or throttle');
let src = fs.readFileSync(file, 'utf8');
const once = (from, to) => {
  assert.equal(src.split(from).length - 1, 1, `anchor appears exactly once: ${from}`);
  src = src.replace(from, () => to);
};

once(
  "const save = () => writeJSON('report.json', report);",
  [
    'let probeCalls = 0, probeMs = 0, probeMax = 0, probeTimer = null;',
    "const save = () => { const t = performance.now(); writeJSON('report.json', report); const d = performance.now() - t; probeCalls++; probeMs += d; if (d > probeMax) probeMax = d; };",
    'const saveSoon = () => { if (!probeTimer) probeTimer = setTimeout(() => { probeTimer = null; save(); }, 250); };',
    "process.on('exit', () => { let bytes = 0; try { bytes = fs.statSync(path.join(OUT, 'report.json')).size; } catch { bytes = -1; } console.log(`SAVE STATS mode=" + mode + " calls=${probeCalls} totalMs=${Math.round(probeMs)} maxMs=${Math.round(probeMax)} reportBytes=${bytes}`); });",
  ].join('\n'),
);

if (mode === 'throttle') {
  once('row.localRequests.push(receipt); save();', 'row.localRequests.push(receipt); saveSoon();');
  once('receipt.headers = response.headers(); save();', 'receipt.headers = response.headers(); saveSoon();');
  once('receipt.bodySha256 = digest(body); save();', 'receipt.bodySha256 = digest(body); saveSoon();');
  once('receipt.endPhase = row.routePhase; save();', 'receipt.endPhase = row.routePhase; saveSoon();');
}

fs.writeFileSync(file, src);
console.log(`uspatch: ${mode} applied to ${file}`);
