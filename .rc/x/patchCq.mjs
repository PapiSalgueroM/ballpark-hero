/* Round 1568 probe (never committed): a copy of playConquestScenes whose reach check also says WHAT answers
   elementFromPoint, where the site bar is, scrollY and the timeline's stacking chain. With PROBE_SM=1 the
   timeline gets scroll-margin-top 52px before the scroll, to see whether scrollIntoViewIfNeeded honours it.
   Writes scripts/_probeCq.mjs (same folder, so its imports hold). */
import fs from 'node:fs';
let src = fs.readFileSync('scripts/playConquestScenes.mjs', 'utf8').split('\r\n').join('\n');
const swaps = [
  ["async function bringIntoReach(page, locator) {\n",
   "async function bringIntoReach(page, locator) {\n  if (process.env.PROBE_SM) await locator.evaluate(el => { el.style.scrollMarginTop = '52px'; }).catch(() => {});\n"],
  ["      top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight,\n",
   "      top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight,\n      at: hit ? hit.tagName.toLowerCase() + (hit.closest('[data-site-chrome]') ? ' IN[data-site-chrome]' : '') + ' ' + String(hit.className).slice(0, 50) : 'null',\n      bar: (() => { const b = document.querySelector('[data-site-chrome]'); if (!b) return 'none'; const q = b.getBoundingClientRect(); return Math.round(q.top) + '-' + Math.round(q.bottom) + ' ' + getComputedStyle(b).position + ' z' + getComputedStyle(b).zIndex; })(),\n      sy: Math.round(scrollY), sm: getComputedStyle(el).scrollMarginTop,\n      chain: (() => { const o = []; for (let n = el; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); const bits = []; if (cs.position !== 'static') bits.push(cs.position); if (cs.zIndex !== 'auto') bits.push('z' + cs.zIndex); if (cs.transform !== 'none') bits.push('transform'); if (cs.isolation === 'isolate') bits.push('isolate'); if (bits.length) o.push(n.tagName.toLowerCase() + '(' + bits.join(',') + ')'); } return o.join(' > '); })(),\n"],
  ["${seen.onTop ? 'it answers elementFromPoint' : 'SOMETHING ELSE answers elementFromPoint'}`,\n",
   "${seen.onTop ? 'it answers elementFromPoint' : 'SOMETHING ELSE answers elementFromPoint'} [PROBE at ${seen.at}; bar ${seen.bar}; scrollY ${seen.sy}; scroll-margin-top ${seen.sm}; chain ${seen.chain}]`,\n"],
];
for (const [a, b] of swaps) {
  if (src.split(a).length !== 2) { console.error('patchCq: anchor not found exactly once: ' + a.slice(0, 60)); process.exit(3); }
  src = src.replace(a, b);
}
fs.writeFileSync('scripts/_probeCq.mjs', src);
console.log('patchCq: wrote scripts/_probeCq.mjs');
