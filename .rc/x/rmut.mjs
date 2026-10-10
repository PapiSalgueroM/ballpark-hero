/* Reviewer's mutation applier for Round 1222 (run lens). Runs on the runner only, against a checkout that is
   restored with git checkout in the same request line. Usage: node .rc/x/rmut.mjs <name>
   Exits 3 when the anchor is not in the file exactly once, so a mutation that changed nothing is never read as a result. */
import fs from 'node:fs';

const ORDER = 'src/lib/gmDraftOrder.ts';
const NIGHT = 'src/lib/gmDraftNight.ts';
const LOTTERY = 'src/lib/gmLotteryNight.ts';

const M = {
  oddToLoser: [ORDER,
    'at.forEach((i, k) => { pct[i] = ((each + (k < odd ? 1 : 0)) / units) * 100; });',
    'at.forEach((i, k) => { pct[i] = ((each + (k >= group.length - odd ? 1 : 0)) / units) * 100; });'],
  slotsLaterAsFirst: [ORDER,
    'round === 1 ? order.first : order.later)) {',
    'round === 1 ? order.first : order.first)) {'],
  thinIgnored: [ORDER,
    "if (!fact || fact.thin) return 'thin-rule';",
    "if (!fact) return 'thin-rule';"],
  fieldSizeIgnored: [ORDER,
    "if (fieldSize !== lottery.clubs || lottery.odds.length !== lottery.clubs) return 'field-size';",
    "if (lottery.odds.length !== lottery.clubs) return 'field-size';"],
  tableIgnored: [ORDER,
    "if (!lottery || lottery.table !== rules.lottery.table) return 'table';",
    "if (!lottery) return 'table';"],
  combosFloor: [ORDER,
    'const whole = Math.round((total / 100) * units);',
    'const whole = Math.floor((total / 100) * units);'],
  restLevelDropped: [ORDER,
    'for (const group of [...missed.level, ...rest.level]) {',
    'for (const group of missed.level) {'],
  tieValuesReversed: [ORDER,
    'const t = (a.tie?.[i] ?? 0) - (b.tie?.[i] ?? 0);',
    'const t = (b.tie?.[i] ?? 0) - (a.tie?.[i] ?? 0);'],
  rivalTieHigherId: [ORDER,
    '(score === bestScore && h.id(p) < h.id(best))',
    '(score === bestScore && h.id(p) > h.id(best))'],
  needDropped: [ORDER,
    'const score = h.read(p) + needWeight * (need[h.pos(p)] ?? 0);',
    'const score = h.read(p);'],
  movedSwapped: [LOTTERY,
    'rows.push({ slot, label: labelOf(club), seed, moved: seed - slot,',
    'rows.push({ slot, label: labelOf(club), seed, moved: slot - seed,'],
  headlineSwapped: [LOTTERY,
    'const moved = (seedOf.get(myClub) ?? mineSlot) - mineSlot;',
    'const moved = mineSlot - (seedOf.get(myClub) ?? mineSlot);'],
  exampleOffByOne: [LOTTERY,
    'picks no lower than ${ordinal(facts.drawn + 1)}.',
    'picks no lower than ${ordinal(facts.drawn)}.'],
  lotteryNightSeedOrder: [LOTTERY,
    'const club = saved.first[slot - 1];',
    'const club = saved.lottery.field[slot - 1].club;'],
  userOutOfTurn: [NIGHT,
    '  if (!slot || slot.holder !== me) return null;\n  const prospect = left.find(p => host.id(p) === prospectId);',
    '  if (!slot) return null;\n  const prospect = left.find(p => host.id(p) === prospectId);'],
  staleYear: [NIGHT,
    "if (n.v !== 1 || n.year !== year || typeof n.seen !== 'boolean') return false;",
    "if (n.v !== 1 || typeof n.seen !== 'boolean') return false;"],
  consumeSkipped: [NIGHT,
    'if (choice === null || !host.consume(league, club, slot)) continue;',
    'if (choice === null) continue;'],
  poolNotShrunk: [NIGHT,
    '    pool = pool.filter(p => p !== choice);\n',
    ''],
  staffNotMine: [NIGHT,
    'steps.push(stepOf(host, slot, choice, club === me));',
    'steps.push(stepOf(host, slot, choice, false));'],
  madeBeyondSlots: [NIGHT,
    '(n.made as number) <= slots.length;',
    '(n.made as number) <= slots.length + 1;'],
};

const name = process.argv[2];
if (name === 'DRY') {
  /* Reads only: says how many times each anchor is in its file. Writes nothing. */
  for (const [k, [file, was]] of Object.entries(M)) {
    const text = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
    console.log(`${k.padEnd(24)} ${text.split(was).length - 1}`);
  }
  process.exit(0);
}
const m = M[name];
if (!m) { console.log(`rmut: no mutation named ${name}`); process.exit(3); }
const [file, was, now] = m;
const src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const count = src.split(was).length - 1;
if (count !== 1) { console.log(`rmut ${name}: the anchor is in ${file} ${count} times, not once. NOT APPLIED.`); process.exit(3); }
const out = src.split(was).join(now);
if (out === src) { console.log(`rmut ${name}: changed nothing. NOT APPLIED.`); process.exit(3); }
fs.writeFileSync(file, out);
console.log(`rmut ${name}: applied to ${file}`);
