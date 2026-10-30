// Reviewer probe patcher (runner only): node lazyPatch.mjs <NhlLazyDesk test copy>
// In case 1 ("a season being played never asks"), after the Play box opens on the reloaded round 5 save, print whether
// the round's press is live and press it, then print the round the save is on.
import fs from 'node:fs';

const file = process.argv[2];
let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const anchor = "    fireEvent.click(screen.getByText('Play'));\n    await tick();\n    expect(G.loader.state(), 'a season being played fetched the kit').toBe('idle');\n";
const n = src.split(anchor).length - 1;
if (n !== 1) { console.error(`LAZY ABORT: anchor occurs ${n} times`); process.exit(2); }
src = src.replace(anchor, anchor
  + "    { const pr = Array.from(document.querySelectorAll('button')).find(b => (b.textContent ?? '').includes('Play Round 5')) as HTMLButtonElement | undefined;\n"
  + "      console.log('PROBE_PRESS|found=' + !!pr + '|disabled=' + pr?.disabled);\n"
  + "      if (pr) fireEvent.click(pr); await tick();\n"
  + "      console.log('PROBE_ROUND|' + JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')?.league?.round); }\n");
fs.writeFileSync(file, src);
console.log(`LAZY PATCHED ${file}`);
