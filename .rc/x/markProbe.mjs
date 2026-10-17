// Round 1340 probe v3 (never committed): when does a timeline mark leave its name's last line in Chromium, and does
// playCmMatchDay's "forced" rule (the last word and the mark together wider than the column, the mark on the very
// next line) tell a necessary wrap from a fault? The real Entry markup (a flex cell holding the entry span, 10 px
// bold), every column width from 60 to 220 px. Arms: pre (the shipped class), nowrap, and a control with a <br> in
// front of the mark (off its line with room to spare: must be counted a fault). Near misses print how far over.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const names = ['Giorgi Mamardashvili', 'Alexander Isak', 'Trent Alexander-Arnold', 'Virgil van Dijk', 'Dominik Szoboszlai', 'Amaimouni-Echghouyab'];
const marks = [' (O.G)', ' (P)'];
const entry = (mark, br) => names.flatMap(n => marks.map(m => `<div class="cell" style="width:W;min-width:0;display:flex;justify-content:flex-end"><span data-cm-tl-entry="1" style="min-width:0;max-width:100%;white-space:normal;overflow-wrap:break-word;line-height:1.25;text-align:right;font-weight:700;font-size:10px"><span data-cm-tl-name="1">⚽ Goal: ${n}</span>${br ? '<br>' : ''}<span data-cm-tl-mark="1" style="${mark}">${m}</span></span></div>`)).join('');
const arms = { pre: ['white-space:pre', false], nowrap: ['white-space:nowrap', false], control: ['white-space:pre', true] };
const result = {};
for (const [arm, [style, br]] of Object.entries(arms)) {
  let on = 0, forced = 0, fault = 0; const near = [];
  for (let w = 60; w <= 220; w += 1) {
    await page.setContent(`<body style="font-family:Arial,sans-serif;margin:0">${entry(style, br).replaceAll('width:W', `width:${w}px`)}</body>`);
    const r = await page.evaluate(() => [...document.querySelectorAll('[data-cm-tl-mark]')].map(m => {
      const name = m.parentElement.querySelector('[data-cm-tl-name]');
      const lines = [...name.getClientRects()], last = lines[lines.length - 1], rr = m.getBoundingClientRect();
      const onLast = rr.top < last.bottom && rr.bottom > last.top;
      const room = m.closest('[data-cm-tl-entry]').parentElement.clientWidth;
      const over = last.width + rr.width - room;
      const isForced = !onLast && rr.top >= last.bottom - 1 && rr.top < last.bottom + last.height && over > -0.5;
      return onLast ? 'on' : isForced ? 'forced' : `fault ${over.toFixed(2)}`;
    }));
    on += r.filter(x => x === 'on').length; forced += r.filter(x => x === 'forced').length; fault += r.filter(x => x.startsWith('fault')).length; near.push(...r.filter(x => x.startsWith('fault')).map(x => x.slice(6)));
  }
  result[arm] = { on, forced, fault };
  console.log(`${arm}: ${on} on the last line, ${forced} on the next line with no room on the last, ${fault} off it with room (a fault${near.length ? `, last line plus mark minus the column: ${[...new Set(near)].slice(0, 8).join(' ')}` : ''})`);
}
await browser.close();
const good = result.pre.fault === 0 && result.pre.forced > 0 && result.control.fault > 0;
console.log(good ? 'markProbe: green. With the shipped class a mark leaves its line only when there is no room for it, and the control is caught' : 'markProbe: RED');
process.exit(good ? 0 : 1);
