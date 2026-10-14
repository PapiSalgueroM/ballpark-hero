// Round 1332 review mutations (run lens, never committed). Applies ONE plausible mutation to a source file
// on the runner's checkout; the request line runs the gates and then restores with git checkout.
//   node .rc/x/mut1332.mjs <name>
import fs from 'node:fs';

const ENGINE = 'src/lib/gmInbox.ts';
const PANEL = 'src/components/front-office-shared/GmInboxPanel.tsx';
const MUTS = {
  /* gmCardSafe forgets the men an option moves: only the subject and the person slots are checked. */
  choicetargets: [ENGINE, `  for (const c of e.choices) {
    if (c.out) people.push({ role: c.out.who });
    if (c.rating) people.push({ role: c.rating.who });
    for (const raw of Object.values(c.fx ?? {})) if (typeof raw !== 'number') people.push({ role: raw.who });
  }
`, '  /* mutant: choicetargets */\n'],
  /* gmCardSafe reads "not real" as "not marked real": a role that resolves to nobody passes. */
  nullpass: [ENGINE, '  return people.every(ref => who(ref)?.real === false);', '  return people.every(ref => who(ref)?.real !== true); /* mutant */'],
  /* The codec forgets that the staff settled a card: after a reload it reads as the manager's reply. */
  autodrop: [ENGINE, '  if (g.auto) out.x = 1;', '  /* mutant: autodrop */'],
  /* The prune drops a shared key once ANY card holding it has cooled. */
  prunesome: [ENGINE, '    if (sharing.every(e => (pack.clock', '    if (sharing.some(e => (pack.clock'],
  /* The prune uses the week rule on a season clock too (one season early). */
  seasonprune: [ENGINE, "(pack.clock === 'season' ? !onCooldown(last, e, clock, pack.cooldown) : clock - at >= (e.cooldown ?? pack.cooldown))",
    '(clock - at >= (e.cooldown ?? pack.cooldown))'],
  /* The answer no longer fails closed before the desk lines (an unregistered key). */
  failclosed: [ENGINE, '  if (c.fx && Object.keys(c.fx).some(k => !has(reg, k))) return null;', '  /* mutant: failclosed */'],
  /* The panel asks whether ANY card on the desk can expire, open or not. */
  canexpire: [PANEL, 'const canExpire = openMsgs.some(', 'const canExpire = messages.some('],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.error(`no mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`mutation ${name}: its anchor is in ${file} ${n} times, not once, refusing`); process.exit(2); }
const out = src.replace(from, to);
if (out === src) { console.error(`mutation ${name} changed nothing, refusing`); process.exit(2); }
fs.writeFileSync(file, out);
console.log(`mutation ${name} applied to ${file}`);
