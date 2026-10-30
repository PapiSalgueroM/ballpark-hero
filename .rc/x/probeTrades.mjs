// Fixer probe (runner only): print what the hub shows after the new club's draft in the talks case.
import fs from 'node:fs';

const file = 'src/components/front-office-shared/FrontOfficeGmCareer.test.tsx';
let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const anchor = "      expect(readSave(row).phase).toBe('hub');\n      openTile('Trades');\n";
const n = src.split(anchor).length - 1;
if (n !== 1) { console.error(`PROBE ABORT: anchor occurs ${n} times`); process.exit(2); }
src = src.replace(anchor, "      expect(readSave(row).phase).toBe('hub');\n"
  + "      console.log('PROBE_BUTTONS|' + row.sport + '|' + buttons().map(b => (b.textContent ?? '').trim().slice(0, 50)).join(' || '));\n"
  + "      console.log('PROBE_PANEL|' + row.sport + '|' + (document.querySelector('[data-gm-desk=\"panel\"]')?.getAttribute('data-gm-panel') ?? 'none') + '|press ' + !!document.querySelector('[data-gm-press]'));\n"
  + "      openTile('Trades');\n");
fs.writeFileSync(file, src);
console.log('PROBE PATCHED');
