// Release BK triage, runner only: the finance desk's wrap plant on its own, in Chromium. A table cell holding one
// kitty figure, with the plant BEFORE f77d6c88 (white-space normal, 1 px) and AFTER it (plus word-break: break-all),
// counted the way playCmFinanceDesk counts (the distinct tops of the text's client rects). Exits 0 only when the old
// plant keeps "+£63m" on one line (the miss reproduced) and the new plant breaks every figure.
import { chromium } from 'playwright';
const FIGS = ['+£63m', '+£64.7m', '+£62.1m', '+£11.9m', '+£70.8m', '-£3m', '+£100m'];
const OLD = 'white-space: normal !important; width: 1px !important; max-width: 1px !important;';
const NEW = 'white-space: normal !important; word-break: break-all !important; width: 1px !important; max-width: 1px !important;';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const html = (css) => `<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui,sans-serif} td.t{${css}}</style>
<table><tbody>${FIGS.map(f => `<tr><td>Kitty change</td><td class="t">${f}</td></tr>`).join('')}</tbody></table>`;
const lines = async (css) => {
  await page.setContent(html(css));
  return page.evaluate(() => [...document.querySelectorAll('td.t')].map(td => {
    const range = document.createRange(); range.selectNodeContents(td);
    return new Set([...range.getClientRects()].filter(b => b.width > 0).map(b => Math.round(b.top))).size;
  }));
};
const before = await lines(OLD), after = await lines(NEW);
await browser.close();
FIGS.forEach((f, i) => console.log(`${f.padEnd(8)} old plant ${before[i]} line(s), new plant ${after[i]} line(s)`));
const miss = before[FIGS.indexOf('+£63m')] === 1, all = after.every(n => n > 1);
console.log(`wrapProof: old plant keeps +£63m on one line: ${miss}; new plant breaks every figure: ${all}`);
process.exit(miss && all ? 0 : 1);
