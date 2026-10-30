// Reviewer fleet patcher (runner only). node fleetPatch.mjs <test copy> <seeds csv> [mount block file]
// 1. the default path runs over <seeds> instead of 1, 2, 3
// 2. every checkpoint also keeps the raw save (FLEET_SAVES_OUT names the file written after all)
// 3. with a mount block file, appends it (it mounts saves read from FLEET_MOUNT_IN on this tree's boards)
import fs from 'node:fs';

const [file, seeds, block] = process.argv.slice(2);
let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const swap = (from, to) => {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`FLEET ABORT: anchor occurs ${n} times: ${from.slice(0, 60)}`); process.exit(2); }
  src = src.replace(from, to);
};
swap('for (const seed of [1, 2, 3])', `for (const seed of [${seeds}])`);
swap('  const at = (label: string) => out.push(`${label}:${digest(row, epoch)}`);',
  '  const at = (label: string) => { out.push(`${label}:${digest(row, epoch)}`); ((globalThis as any).__FLEET ||= []).push({ sport: row.sport, seed, deskOn, label, save: localStorage.getItem(row.saveKey) }); };');
src += `
import { afterAll as __fleetAfterAll } from 'vitest';
__fleetAfterAll(() => {
  const out = process.env.FLEET_SAVES_OUT;
  if (out) { fs.writeFileSync(out, JSON.stringify((globalThis as any).__FLEET ?? [])); console.log('FLEET_SAVES ' + ((globalThis as any).__FLEET ?? []).length + ' -> ' + out); }
});
`;
if (block) src += '\n' + fs.readFileSync(block, 'utf8');
fs.writeFileSync(file, src);
console.log(`FLEET PATCHED ${file} seeds ${seeds}${block ? ' + mount block' : ''}`);
