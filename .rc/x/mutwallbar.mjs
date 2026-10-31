// Release BU re-join, one off negative control for playUsCareerHallWall's measured bar (runner only, never committed).
// Writes scripts/playUsCareerHallWallBar.tmp.mjs: the walk plus an init script that plants a fixed 60 px
// data-site-chrome bar (pointer-events none) 450 ms after the wall first appears, i.e. after the page has placed the
// wall under whatever bar there was. The "under the bar" and "fits the screen" checks must then go red.
// Exits 2 when its anchor is not in the walk exactly once.
import fs from 'node:fs';
const SRC = 'scripts/playUsCareerHallWall.mjs';
const OUT = 'scripts/playUsCareerHallWallBar.tmp.mjs';
const ANCHOR = "  if (CONTROL === 'nowall') await context.addInitScript(NOWALL);\n";
const text = fs.readFileSync(SRC, 'utf8').split('\r\n').join('\n');
const n = text.split(ANCHOR).length - 1;
if (n !== 1) { console.log(`mutwallbar: anchor found ${n} times`); process.exit(2); }
const PLANT = [
  "(() => { let done = false; const plant = () => { if (done || !document.querySelector('[data-career-hall-wall]')) return;",
  " done = true; setTimeout(() => { const b = document.createElement('div'); b.setAttribute('data-site-chrome', 'planted');",
  " b.style.cssText = 'position:fixed;top:0;left:0;right:0;height:60px;z-index:9999;pointer-events:none;background:rgba(255,0,0,0.4)';",
  " document.body.appendChild(b); window.__barPlanted = (window.__barPlanted || 0) + 1; }, 450); };",
  " new MutationObserver(plant).observe(document, { childList: true, subtree: true }); })()",
].join('');
const out = text.replace(ANCHOR, ANCHOR + `  await context.addInitScript(${JSON.stringify(PLANT)});\n`);
fs.writeFileSync(OUT, out);
console.log(`mutwallbar: wrote ${OUT}, the planted bar after the wall appears`);
