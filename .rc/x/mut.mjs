// Reviewer's mutation, run ONLY on the GitHub runner's throwaway checkout (sent as .rc/x/mut.mjs, never committed).
// Each mode edits one committed file on disk; the request line restores it with git checkout afterwards.
//   m1  one match of La Liga matchday 3 with home and away flipped, in the ledger file only
//   m2  both meetings of one pair of clubs flipped, in the ledger file only (still a whole double round robin)
//   m4  La Liga's line removed from the frozen file (the ledger and the receipt untouched)
//   m5  Serie A's receipt deleted
import fs from 'node:fs';

const mode = process.argv[2];
const LEDGER = 'src/data/clubManagerLaLigaFixtures2026.ts';
const FROZEN = 'scripts/data/cmLeagueFixtures.frozen.json';
const q = s => JSON.stringify(s);
const fail = msg => { console.error(`MUTATION ABORTED: ${msg}`); process.exit(9); };

if (mode === 'm1' || mode === 'm2') {
  const before = fs.readFileSync(LEDGER, 'utf8');
  const lines = before.split('\n');
  const start = lines.findIndex(l => l.trim() === 'rounds: [');
  if (start < 0) fail('no rounds line');
  const pairOf = line => {
    const open = line.indexOf('[[');
    const close = line.indexOf(']', open);
    return JSON.parse(line.slice(open + 1, close + 1));
  };
  if (mode === 'm1') {
    const i = start + 3;
    const [h, a] = pairOf(lines[i]);
    const from = `[${q(h)}, ${q(a)}]`;
    if (!lines[i].includes(from)) fail('pair text not found');
    lines[i] = lines[i].replace(from, `[${q(a)}, ${q(h)}]`);
    console.log(`m1: matchday 3, ${h} v ${a} flipped`);
  } else {
    const [h, a] = pairOf(lines[start + 1]);
    const ab = `[${q(h)}, ${q(a)}]`;
    const ba = `[${q(a)}, ${q(h)}]`;
    let count = 0;
    for (let i = start + 1; i < lines.length; i += 1) {
      if (lines[i].includes(ab)) { lines[i] = lines[i].replace(ab, '@@X@@'); count += 1; }
      if (lines[i].includes(ba)) { lines[i] = lines[i].replace(ba, ab); count += 1; }
      lines[i] = lines[i].replace('@@X@@', ba);
    }
    if (count !== 2) fail(`expected two meetings of ${h} and ${a}, found ${count}`);
    console.log(`m2: both meetings of ${h} and ${a} flipped`);
  }
  const after = lines.join('\n');
  if (after === before) fail('nothing changed');
  fs.writeFileSync(LEDGER, after);
} else if (mode === 'm4') {
  const frozen = JSON.parse(fs.readFileSync(FROZEN, 'utf8'));
  if (!frozen.ledgers['laliga-2026-27-v1']) fail('no laliga line to remove');
  delete frozen.ledgers['laliga-2026-27-v1'];
  fs.writeFileSync(FROZEN, `${JSON.stringify(frozen, null, 2)}\n`);
  console.log('m4: the frozen line of laliga removed');
} else if (mode === 'm5') {
  const receipt = 'scripts/data/clubManagerSerieAFixtures2026.receipt.json';
  if (!fs.existsSync(receipt)) fail('no receipt to delete');
  fs.rmSync(receipt);
  console.log('m5: the Serie A receipt deleted');
} else {
  fail(`no such mode ${mode}`);
}
