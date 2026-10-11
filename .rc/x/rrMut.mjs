/* Round 1302 review (run lens): one small mutation applied to the RUNNER's checkout, never to the repo.
 * Usage: node .rc/x/rrMut.mjs <name>. Each asserts its anchor exists exactly once, then writes the file. */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const name = process.argv[2];
const screen = 'src/components/club-manager/LiveSimScreen.tsx';
const helper = 'src/lib/clubManagerVar.ts';
const gen = 'scripts/genCmVarRates.mjs';
const ledger = 'scripts/data/cmVarRates.json';

function swap(file, from, to) {
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`rrMut ${name}: ABORT, anchor found ${n} times in ${file}`); process.exit(7); }
  fs.writeFileSync(file, src.replace(from, to));
  console.log(`rrMut ${name}: applied to ${file}`);
}
function regenerate() {
  const run = spawnSync(process.execPath, [gen], { encoding: 'utf8' });
  console.log(`rrMut ${name}: generator exit ${run.status}: ${(run.stdout || '').trim().split('\n').slice(-2).join(' | ')} ${(run.stderr || '').trim().split('\n').slice(-2).join(' | ')}`);
  return run.status;
}

if (name === 'm1') {
  /* off by one: the room a late ruled out goal needs no longer includes the place before it */
  swap(screen, 'placeOf(o) >= placeOf(e) - 1);', 'placeOf(o) >= placeOf(e));');
} else if (name === 'm2') {
  /* dropped filter: a real chance in the last places no longer keeps a late ruled out goal off the pitch */
  swap(screen, '(isChance(o) || (isRuledOut(o) && o.review!.id !== e.review!.id))', '(isRuledOut(o) && o.review!.id !== e.review!.id)');
} else if (name === 'm3') {
  /* the fourth clause of motionStillCommitted taken out */
  swap(screen, "|| feed.includes(motionEvent.event)\n    || feed.some(e => isRuledOut(e) && ruledOutKey(e) === motionEvent.key);", '|| feed.includes(motionEvent.event);');
} else if (name === 'm4') {
  /* the hold on penalties by review let go the way a ruling would: the owed entry marked accepted, generator run */
  const j = JSON.parse(fs.readFileSync(ledger, 'utf8'));
  const o = (j.owed ?? []).find(x => x.id === 'penalties-total');
  if (!o || o.state !== 'open') { console.log('rrMut m4: ABORT, no open owed entry penalties-total'); process.exit(7); }
  o.state = 'accepted'; o.ruling = 'Review mutation: accepted by a ruling, not by the engine.';
  fs.writeFileSync(ledger, JSON.stringify(j, null, 2) + '\n');
  console.log('rrMut m4: penalties-total marked accepted');
  regenerate();
} else if (name === 'm5') {
  /* the generator names a cup with reviews in its final only as if every round had them, and is run */
  swap(gen, "return row.key.startsWith('cup:') && Object.hasOwn(LATE_STAGE, row.from) ? `${row.name} (${LATE_STAGE[row.from]})` : row.name;", 'return row.name;');
  regenerate();
} else if (name === 'm6') {
  /* off by one in the stage rule: a cup is covered only AFTER its first stage with reviews */
  swap(helper, 'return at >= 0 && first >= 0 && at >= first;', 'return at >= 0 && first >= 0 && at > first;');
} else if (name === 'm7') {
  /* both owed entries marked accepted by a ruling, the generator run, the switch turned on */
  const j = JSON.parse(fs.readFileSync(ledger, 'utf8'));
  let n = 0;
  for (const o of j.owed ?? []) if (o.state === 'open') { o.state = 'accepted'; o.ruling = 'Review mutation: accepted by a ruling.'; n += 1; }
  if (!n) { console.log('rrMut m7: ABORT, nothing open'); process.exit(7); }
  fs.writeFileSync(ledger, JSON.stringify(j, null, 2) + '\n');
  console.log(`rrMut m7: ${n} owed entries marked accepted`);
  regenerate();
  swap('src/lib/clubManagerVarLive.ts', 'export const CM_VAR_LIVE: boolean = false;', 'export const CM_VAR_LIVE: boolean = true;');
} else if (name === 'm8') {
  /* only recent-seasons accepted by a ruling (the door Round 1218 left), generator run, the switch turned on */
  const j = JSON.parse(fs.readFileSync(ledger, 'utf8'));
  const o = (j.owed ?? []).find(x => x.id === 'recent-seasons');
  if (!o || o.state !== 'open') { console.log('rrMut m8: ABORT, no open owed entry recent-seasons'); process.exit(7); }
  o.state = 'accepted'; o.ruling = 'Review mutation: accepted by a ruling.';
  fs.writeFileSync(ledger, JSON.stringify(j, null, 2) + '\n');
  regenerate();
  swap('src/lib/clubManagerVarLive.ts', 'export const CM_VAR_LIVE: boolean = false;', 'export const CM_VAR_LIVE: boolean = true;');
} else {
  console.log(`rrMut: unknown mutation ${name}`); process.exit(7);
}
