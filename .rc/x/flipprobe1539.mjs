// One shot (Round 1539 fix pass, never committed): proves plantInPage serves the seeded stream until the card opens
// and 0.999 after. Writes a copy of the walk (scripts/pfFlipProbe1539.mjs on the runner, so ROOT stays the repo) that
// reads three Math.random values in the page right after each seeded line is measured, and prints them.
import fs from 'node:fs';
const src = fs.readFileSync('scripts/playFirstVisitDialogs.mjs', 'utf8').replace(/\r\n/g, '\n');
const anchor = '    Object.assign(res, await page.evaluate(measureInPage, { BANNER, control: CONTROL }));\n';
const n = src.split(anchor).length - 1;
if (n !== 1) { console.log(`flipprobe ABORTED: the anchor is in the walk ${n} times, expected 1`); process.exit(2); }
const inject = anchor
  + '    if (scene) { const flip = await page.evaluate(() => [Math.random(), Math.random(), Math.random()]); console.log(`FLIP ${key} card=${res.card?.open} ${JSON.stringify(flip)}`); }\n';
fs.writeFileSync('scripts/pfFlipProbe1539.mjs', src.replace(anchor, inject));
console.log('flipprobe: wrote scripts/pfFlipProbe1539.mjs');
