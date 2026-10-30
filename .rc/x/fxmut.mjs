// Fixer's fence sabotage (never committed): node .rc/x/fxmut.mjs <name>. Edits scripts/simClubManagerDugouts.mjs
// in the runner's checkout so a control can be shown to catch it (or, for nomirrorlist, to still fire without it).
// Refuses with exit 2 unless its anchor is present exactly once. The request line restores the file afterwards.
import fs from 'node:fs';
const F = 'scripts/simClubManagerDugouts.mjs';
const MUT = {
  ids1: ['doms.add(domainOf(s.url));', 'doms.add(s.id);'],
  ids4: [".map(r => domainOf(sources.get(r.source)?.url ?? 'https://x.invalid'))", '.map(r => r.source)'],
  fold7: ['if (caseFree(sp.name) !== caseFree(c.name))', 'if (fold(sp.name) !== fold(c.name))'],
  nodate6: ['s.published <= o.date)', 'true)'],
  nomirrorlist: ["'infogalactic.com', ", ''],
};
const name = process.argv[2];
const m = MUT[name];
if (!m) { console.error(`fxmut: unknown mutation ${name}`); process.exit(2); }
const t = fs.readFileSync(F, 'utf8');
const n = t.split(m[0]).length - 1;
if (n !== 1) { console.error(`fxmut: anchor for ${name} found ${n} times, refusing`); process.exit(2); }
fs.writeFileSync(F, t.replace(m[0], m[1]));
console.log(`mutation ${name} applied`);
