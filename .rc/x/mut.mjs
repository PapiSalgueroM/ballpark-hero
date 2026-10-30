// Reviewer mutation applier for Round 1597 (runner only). Usage: node .rc/x/mut.mjs <name>
// Each anchor must occur exactly once in the file, or the script exits 2 (an ABORT, not a result).
import fs from 'node:fs';
const F = 'src/lib/clubManager.ts';
const name = process.argv[2];
const M = {
  probe: [
    ['    if (held.length === 1) {\n', '    if (held.length === 1) { console.log("PROBE_LEDGER " + held[0].status);\n'],
    ['    kept.push({ ...f, age: man.age,', '    console.log("PROBE_AGE"); kept.push({ ...f, age: man.age,'],
    ['      walkedFree619.push(...squad.filter(p => cut.has(p.id)).map(p => ({', '      console.log("PROBE_TRIM " + cut.size); walkedFree619.push(...squad.filter(p => cut.has(p.id)).map(p => ({'],
    ['    back.push({\n', '    console.log("PROBE_RECOVER"); back.push({\n'],
  ],
  ledgeroff: [['r.origin.birthYear === year - f.age && r.player.position', 'r.origin.birthYear === year - f.age - 1 && r.player.position']],
  noretnames: [['      ? { retiredNames: [...(career.retiredNames ?? []), ...poolSummer.retired.map(r => r.name)] } : {}) };', '      ? {} : {}) };']],
  notrimpool: [['      walkedFree619.push(...squad.filter(p => cut.has(p.id)).map(p => ({', '      ([] as FreeAgent[]).push(...squad.filter(p => cut.has(p.id)).map(p => ({']],
  staleseason: [['  const nextSeason = career.season + 1, year = worldYear(career);', '  const nextSeason = career.season, year = worldYear(career);']],
  mathrandom: [["    const random = keyedRng(`free-agent-summer|${worldSeedOf(career) ?? 'legacy'}|${f.name}|${f.since}|${nextSeason}`);", '    const random = Math.random;']],
};
if (!M[name]) { console.log(`MUT ABORT unknown ${name}`); process.exit(2); }
let text = fs.readFileSync(F, 'utf8');
for (const [from, to] of M[name]) {
  const n = text.split(from).length - 1;
  if (n !== 1) { console.log(`MUT ABORT ${name}: anchor found ${n} times: ${from.slice(0, 70)}`); process.exit(2); }
  text = text.replace(from, () => to);
}
fs.writeFileSync(F, text);
console.log(`MUT ${name} applied (${M[name].length} edit${M[name].length === 1 ? '' : 's'})`);
