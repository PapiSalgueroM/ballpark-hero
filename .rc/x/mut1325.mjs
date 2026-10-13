/* Review of Round 1325: apply ONE named mutation to a source file on the runner's checkout.
   Refuses (exit 4) unless the anchor occurs exactly once and the file changes. The caller restores
   with git checkout -- src scripts in the same line. */
import fs from 'node:fs';

const CM = 'src/components/club-manager/';
const M = {
  // dropped filter: academy graduates read as real
  noacademy: [CM + 'SquadScreen.tsx', '  return !p.generated && !p.isYouth && !p.academyGrad;', '  return !p.generated && !p.isYouth;'],
  // dropped filter: youth pads read as real
  noyouth: [CM + 'SquadScreen.tsx', '  return !p.generated && !p.isYouth && !p.academyGrad;', '  return !p.generated && !p.academyGrad;'],
  // the desk note forgets the Let somebody go list
  desknote: [CM + 'ContractsCard.tsx', 'const deskHasReal = expiring.some(isRealPlayer) || (!!onRelease && releasable.some(isRealPlayer));', 'const deskHasReal = expiring.some(isRealPlayer);'],
  // the squad foot note shows only when everyone is real
  footevery: [CM + 'SquadScreen.tsx', '{squad.some(isRealPlayer) && (', '{squad.every(isRealPlayer) && ('],
  // the dressing room uses a stale rule (generated only)
  roomstale: [CM + 'RolesScreen.tsx', '{isRealPlayer(open) && <>', '{!open.generated && <>'],
  // the squad detail line uses a stale rule (generated only)
  detailstale: [CM + 'SquadScreen.tsx', '      {isRealPlayer(p) && (', '      {!p.generated && ('],
  // the Show the other count off by the shown rows
  showcount: [CM + 'ContractsCard.tsx', 'n={expiring.length - SHOWN}', 'n={expiring.length}'],
  // off by one: the collapsed list shows one row fewer than the button assumes
  sliceone: [CM + 'ContractsCard.tsx', 'expiring.slice(0, SHOWN)', 'expiring.slice(0, SHOWN - 1)'],
  // swapped argument: lowFirst prints max first
  lowswap: [CM + 'ClubManagerCareerPanel.tsx', 'return `${Math.min(a, b)}-${Math.max(a, b)}`;', 'return `${Math.max(a, b)}-${Math.min(a, b)}`;'],
};
const name = process.argv[2];
if (!M[name]) { console.log(`MUT: unknown mutation ${name}`); process.exit(4); }
const [file, from, to] = M[name];
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`MUT ${name}: anchor occurs ${n} times in ${file}, refusing`); process.exit(4); }
const out = src.replace(from, () => to);
if (out === src) { console.log(`MUT ${name}: no change, refusing`); process.exit(4); }
fs.writeFileSync(file, out);
console.log(`MUT ${name} applied to ${file}`);
