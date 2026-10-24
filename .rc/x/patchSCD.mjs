/* Round 1568 probe (never committed): a copy of playSoccerCareerDepth that prints, at each record sheet step,
   the tile's rect, the site bar's rect, what answers elementFromPoint at the tile's centre, scrollY and the body
   lock. Writes scripts/_probeSCD.mjs (same folder, so its imports hold). */
import fs from 'node:fs';
let src = fs.readFileSync('scripts/playSoccerCareerDepth.mjs', 'utf8').split('\r\n').join('\n');
const P = "const probeAt = (page, tag) => page.evaluate(tag => { const t = [...document.querySelectorAll('[data-career-records-tile]')].find(el => el.getBoundingClientRect().height > 0); const r = t ? t.getBoundingClientRect() : null; const at = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null; const b = document.querySelector('[data-site-chrome]')?.getBoundingClientRect(); const a = document.activeElement; return tag + ' tile ' + (r ? Math.round(r.top) + '-' + Math.round(r.bottom) : 'none') + ' bar ' + (b ? Math.round(b.top) + '-' + Math.round(b.bottom) : 'none') + ' hit ' + (at ? at.tagName.toLowerCase() + (at.closest('[data-site-chrome]') ? ' IN[data-site-chrome]' : '') + (t && t.contains(at) ? ' (the tile)' : '') : 'null') + ' scrollY ' + Math.round(scrollY) + ' body ' + document.body.style.overflow + '/' + getComputedStyle(document.body).overflow + ' locked ' + !!document.querySelector('[data-scroll-locked]') + ' active ' + (a ? a.tagName.toLowerCase() + (a.hasAttribute('data-career-records-tile') ? '[tile]' : '') + (a.getAttribute('aria-label') ? '[' + a.getAttribute('aria-label').slice(0, 24) + ']' : '') : 'none'); }, tag).then(s => console.log('PROBE ' + s));\n";
const swaps = [
  ["const bodyState = page => page.evaluate(() => ({ inline: document.body.style.overflow, computed: getComputedStyle(document.body).overflow, y: scrollY }));\n", null],
  ["    const beforeBookBody = await bodyState(page);\n", "    await probeAt(page, `${label} book-before`);\n"],
  ["    await tile.click(); await requested;\n", "    await probeAt(page, `${label} book-after-click`);\n"],
  ["    await page.keyboard.press('Escape'); await records.waitFor({ state: 'hidden' });\n    check(await page.evaluate(() => document.activeElement?.hasAttribute('data-career-records-tile')), `${label}: Escape closes and restores the record tile focus`);\n", "    await probeAt(page, `${label} book-after-escape`);\n"],
  ["    const body = await bodyState(page), afterRecovery = navigations;\n", "    await probeAt(page, `${label} fail-before`);\n"],
  ["    const dialog = page.getByRole('dialog', { name: 'Record book unavailable' }); await dialog.waitFor({ timeout: 15000 });\n", "    await probeAt(page, `${label} fail-open`);\n"],
  ["    check(await restored(page, body, `career-records-failure-${width}-escape`), `${label}: Escape restores the tile focus and original body scrolling`);\n", null],
];
for (const [a, after] of swaps) {
  if (src.split(a).length !== 2) { console.error('patchSCD: anchor not found exactly once: ' + a.slice(0, 70)); process.exit(3); }
  if (after === null) {
    if (a.startsWith('const bodyState')) src = src.replace(a, a + P);
    else src = src.replace(a, "    await probeAt(page, `${label} fail-after-escape`);\n" + a);
  } else if (a.includes('check(await page.evaluate(() => document.activeElement')) src = src.replace(a, a.split('\n')[0] + '\n' + after + a.split('\n').slice(1).join('\n'));
  else src = src.replace(a, a + after);
}
fs.writeFileSync('scripts/_probeSCD.mjs', src);
console.log('patchSCD: wrote scripts/_probeSCD.mjs');
