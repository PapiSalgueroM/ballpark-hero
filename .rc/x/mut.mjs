// Round 1534 review (the runner lens): apply ONE plausible mutation to the checked out tree, by exact string,
// asserting the needle is there exactly once. The request line restores the tree with git checkout afterwards.
// Usage: node .rc/x/mut.mjs <name>
import fs from 'node:fs';

const M = {
  // the office reads Cash before the steady returns (an order slip)
  officeorder: ['src/lib/usCareerAnnualBenefits.ts',
    'const added = office && cash + steady > 0 ? (cash + steady) * US_FAMILY_OFFICE_RATE : 0;',
    'const added = office && cash > 0 ? cash * US_FAMILY_OFFICE_RATE : 0;'],
  // a dropped filter: a one time steady card held twice pays twice
  onetime: ['src/lib/usCareerAnnualBenefits.ts',
    'steady += card.cost * row.rate * (card.oneTime ? 1 : count);',
    'steady += card.cost * row.rate * count;'],
  // a dropped variable: every stake of one id in one season shares one roll
  stakeindex: ['src/lib/usCareerAnnualBenefits.ts',
    'keyedRng(`${summerCareerKey(c)}|shop|${card.id}|${c.year}|${i}`)()',
    'keyedRng(`${summerCareerKey(c)}|shop|${card.id}|${c.year}|0`)()'],
  // the desk: one of the four banAhead calls forgets the lawyer's cool (the "now" one)
  desknow: ['src/lib/careerDirtyMoney.ts',
    'const now = banAhead(heat, pending, cool);',
    'const now = banAhead(heat, pending);'],
  // the desk: the wash's free path forgets the cool
  deskfree: ['src/lib/careerDirtyMoney.ts',
    'const free = banAhead(after, pending, cool);',
    'const free = banAhead(after, pending);'],
  // a stale constant in one sport: the NHL lawyer id typed wrong in the shared list
  nhllawyer: ['src/lib/usCareerAnnualBenefits.ts',
    "'mshady_lawyer', 'hshady_lawyer']",
    "'mshady_lawyer', 'hshady_lawyers']"],
  // the carry floor turned into a round: banks a tenth too much and leaves a negative carry
  carryround: ['src/lib/usCareerAnnualBenefits.ts',
    'const tenths = Math.floor(exact / 1000);',
    'const tenths = Math.round(exact / 1000);'],
};

const name = process.argv[2];
if (name === 'settleafter') {
  // the NBA settle call moved below the money app's tick (placement)
  const f = 'src/lib/nbaMyCareer.ts';
  let t = fs.readFileSync(f, 'utf8');
  const call = '  /* Round 1534: the shop pays what its cards print (src/lib/usCareerAnnualBenefits.ts), straight after the pay\n'
    + '     line so Cash is in tenths, and before the money app. Stakes draw on their own keyed stream, never this rng. */\n'
    + '  for (const line of settleUsCareerShop(c, NBA_SPEND_ITEMS)) notes.push(line);\n';
  const tick = '  for (const line of nbaMoneySeasonTick(c).events) notes.push(line);\n';
  for (const n of [call, tick]) if (t.split(n).length !== 2) { console.log(`MUTATION could not apply: ${n.trim()} is not there once`); process.exit(2); }
  t = t.replace(call, '').replace(tick, tick + call);
  fs.writeFileSync(f, t);
  console.log('MUTATION settleafter applied to', f);
  process.exit(0);
}
if (name === 'settlebeforepay') {
  // the NBA settle call moved above the pay line (placement)
  const f = 'src/lib/nbaMyCareer.ts';
  let t = fs.readFileSync(f, 'utf8');
  const call = '  /* Round 1534: the shop pays what its cards print (src/lib/usCareerAnnualBenefits.ts), straight after the pay\n'
    + '     line so Cash is in tenths, and before the money app. Stakes draw on their own keyed stream, never this rng. */\n'
    + '  for (const line of settleUsCareerShop(c, NBA_SPEND_ITEMS)) notes.push(line);\n';
  const pay ='  const upkeep = c.yearlyCosts ?? 0;\n  const priorNet = c.netWorth ??';
  for (const n of [call, pay]) if (t.split(n).length !== 2) { console.log(`MUTATION could not apply: ${n.trim()} is not there once`); process.exit(2); }
  t = t.replace(call, '').replace(pay, call + pay);
  fs.writeFileSync(f, t);
  console.log('MUTATION settlebeforepay applied to', f);
  process.exit(0);
}
const m = M[name];
if (!m) { console.log(`MUTATION unknown: ${name}`); process.exit(2); }
const [file, from, to] = m;
const text = fs.readFileSync(file, 'utf8');
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`MUTATION could not apply: ${name} needle found ${n} times in ${file}`); process.exit(2); }
fs.writeFileSync(file, text.replace(from, () => to));
console.log(`MUTATION ${name} applied to ${file}`);
