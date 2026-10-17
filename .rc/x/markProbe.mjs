// Round 1340 probe (never committed): does a timeline mark ever wrap alone below its name in Chromium?
// The entry markup of MatchTimeline.tsx, at every column width from 60 to 220 px, with the mark span's
// white-space set to pre (the red build) and nowrap (the fix). Prints how many widths leave the mark off the
// name's last line for each, and exits 1 unless pre has some and nowrap has none.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const names = ['Giorgi Mamardashvili', 'Alexander Isak', 'Trent Alexander-Arnold', 'Virgil van Dijk', 'Dominik Szoboszlai'];
const marks = [' (O.G)', ' (P)'];
const html = (ws) => names.flatMap(n => marks.map(m => `<div class="col" style="width:W"><span class="entry" style="white-space:normal;overflow-wrap:break-word;line-height:1.25;text-align:right"><span data-name>⚽ Goal: ${n}</span><span data-mark style="white-space:${ws}">${m}</span></span></div>`)).join('');
const result = {};
for (const ws of ['pre', 'nowrap']) {
  let off = 0, total = 0;
  for (let w = 60; w <= 220; w += 1) {
    await page.setContent(`<body style="font:12px Arial,sans-serif;margin:0">${html(ws).replaceAll('W', w + 'px')}</body>`);
    const r = await page.evaluate(() => [...document.querySelectorAll('.entry')].map(e => {
      const name = e.querySelector('[data-name]'), mark = e.querySelector('[data-mark]');
      const lines = [...name.getClientRects()], last = lines[lines.length - 1], m = mark.getBoundingClientRect();
      return m.top < last.bottom && m.bottom > last.top;
    }));
    total += r.length; off += r.filter(x => !x).length;
  }
  result[ws] = { off, total };
  console.log(`white-space ${ws}: ${off} of ${total} entries have the mark off the name's last line`);
}
await browser.close();
const good = result.pre.off > 0 && result.nowrap.off === 0;
console.log(good ? 'markProbe: green. pre lets the mark wrap alone, nowrap never does' : 'markProbe: RED');
process.exit(good ? 0 : 1);
