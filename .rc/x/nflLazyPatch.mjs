// Reviewer probe patcher (runner only): node nflLazyPatch.mjs <FrontOfficeLazyDesk test copy>
// In case 1, after the "This week" box opens on the reloaded save, print whether a Play Week press is live, press it,
// and print the week the save is on.
import fs from 'node:fs';

const file = process.argv[2];
let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const anchor = "    fireEvent.click(screen.getByText('This week'));\n    await tick();\n    expect(G.loader.nflCareerKitState(), 'a season being played fetched the kit').toBe('idle');\n";
const n = src.split(anchor).length - 1;
if (n !== 1) { console.error(`NFL LAZY ABORT: anchor occurs ${n} times`); process.exit(2); }
src = src.replace(anchor, anchor
  + "    { const wk = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')?.league?.week;\n"
  + "      const pr = Array.from(document.querySelectorAll('button')).find(b => (b.textContent ?? '').trim().startsWith('Play Week')) as HTMLButtonElement | undefined;\n"
  + "      console.log('PROBE_NFL_PRESS|week=' + wk + '|found=' + !!pr + '|disabled=' + pr?.disabled);\n"
  + "      if (pr) fireEvent.click(pr); await tick();\n"
  + "      console.log('PROBE_NFL_WEEK|' + JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')?.league?.week); }\n");
fs.writeFileSync(file, src);
console.log(`NFL LAZY PATCHED ${file}`);
