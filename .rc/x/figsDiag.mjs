// Release BK triage, runner only: writes scripts/playDeskFigsDiag.mjs, a copy of playCmFinanceDesk.mjs that keeps the
// committed plant and, before any control plants, writes the gate's own figures into the kitty and cover cells (kitty
// "+£11.9m | +£63m", cover "+£13.1m | +£70.8m", rBK-rgK ctl-desk-wrap's reading, the case that missed). So the wrap
// control is measured on the figure that missed, whatever the unseeded career reached. Never touches the harness.
// usage: node .rc/x/figsDiag.mjs && CM_FINANCE_CONTROL=wrap node scripts/playDeskFigsDiag.mjs
import fs from 'node:fs';
const SRC = 'scripts/playCmFinanceDesk.mjs', OUT = 'scripts/playDeskFigsDiag.mjs';
const t = fs.readFileSync(SRC, 'utf8').replaceAll('\r\n', '\n');
const from = '  await page.addStyleTag({ content: css });\n';
if (t.split(from).length !== 2) { console.error('figsDiag: the style tag line is not there exactly once'); process.exit(3); }
const to = "  { const n = await page.evaluate(() => { let n = 0; const put = (sel, v) => { const td = document.querySelector(sel); const w = td && document.createTreeWalker(td, NodeFilter.SHOW_TEXT); const node = w && w.nextNode(); if (node) { node.data = v; n += 1; } };\n"
  + "      put('[data-projection-total=\"kitty\"] td:nth-child(2)', '+£11.9m'); put('[data-projection-total=\"kitty\"] td:last-child', '+£63m');\n"
  + "      put('[data-projection-total=\"cover\"] td:nth-child(2)', '+£13.1m'); put('[data-projection-total=\"cover\"] td:last-child', '+£70.8m'); return n; });\n"
  + "    console.log(`  figsDiag: ${n} of 4 figures written`); }\n"
  + from;
fs.writeFileSync(OUT, t.replace(from, to));
console.log('figsDiag: wrote ' + OUT);
