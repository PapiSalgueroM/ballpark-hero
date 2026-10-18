// Release BK triage, runner only: writes scripts/playDeskWrapDiag.mjs, a copy of playCmFinanceDesk.mjs whose wrap
// plant is chosen by DIAG_PLANT (old: the plant before f77d6c88; breakall: f77d6c88's; block: the cell also taken out
// of the table's column sizing with display: block; minblock: the same block at its min-content width, one glyph a
// line) and which, with DIAG_FIGS=1, first writes the gate's figures into
// the kitty and cover cells (kitty "+£11.9m | +£63m", cover "+£13.1m | +£70.8m", rBK-rgK ctl-desk-wrap's reading), so
// every run measures the figure that missed whatever the unseeded career reached. Never touches the harness.
// usage: node .rc/x/wrapDiag.mjs && DIAG_PLANT=breakall DIAG_FIGS=1 CM_FINANCE_CONTROL=wrap node scripts/playDeskWrapDiag.mjs
import fs from 'node:fs';
const SRC = 'scripts/playCmFinanceDesk.mjs', OUT = 'scripts/playDeskWrapDiag.mjs';
const t = fs.readFileSync(SRC, 'utf8').replaceAll('\r\n', '\n');
const from = "      : `${target} { white-space: normal !important; word-break: break-all !important; width: 1px !important; max-width: 1px !important; }`;\n  await page.addStyleTag({ content: css });\n";
if (t.split(from).length !== 2) { console.error('wrapDiag: the plant line is not there exactly once'); process.exit(3); }
const to = "      : ({ old: `${target} { white-space: normal !important; width: 1px !important; max-width: 1px !important; }`,\n"
  + "          breakall: `${target} { white-space: normal !important; word-break: break-all !important; width: 1px !important; max-width: 1px !important; }`,\n"
  + "          block: `${target} { display: block !important; white-space: normal !important; word-break: break-all !important; width: 1px !important; max-width: 1px !important; }`,\n"
  + "          minblock: `${target} { display: block !important; white-space: normal !important; word-break: break-all !important; width: min-content !important; }` })[process.env.DIAG_PLANT];\n"
  + "  if (!css) refuse('wrapDiag: DIAG_PLANT must be old, breakall, block or minblock');\n"
  + "  if (process.env.DIAG_FIGS === '1') {\n"
  + "    const n = await page.evaluate(() => { let n = 0; const put = (sel, v) => { const td = document.querySelector(sel); const w = td && document.createTreeWalker(td, NodeFilter.SHOW_TEXT); const node = w && w.nextNode(); if (node) { node.data = v; n += 1; } };\n"
  + "      put('[data-projection-total=\"kitty\"] td:nth-child(2)', '+£11.9m'); put('[data-projection-total=\"kitty\"] td:last-child', '+£63m');\n"
  + "      put('[data-projection-total=\"cover\"] td:nth-child(2)', '+£13.1m'); put('[data-projection-total=\"cover\"] td:last-child', '+£70.8m'); return n; });\n"
  + "    console.log(`  wrapDiag: plant ${process.env.DIAG_PLANT}, ${n} of 4 figures written`);\n"
  + "  }\n"
  + "  await page.addStyleTag({ content: css });\n";
fs.writeFileSync(OUT, t.replace(from, to));
console.log('wrapDiag: wrote ' + OUT);
