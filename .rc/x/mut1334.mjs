// Round 1334 review: one plausible mutation per run, applied to the runner's checkout only.
// Usage: node .rc/x/mut1334.mjs <name>. Each edit must find its text exactly once, or it exits 2.
import fs from 'node:fs';

const name = process.argv[2];
const once = (file, from, to) => {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes('\r\n')) { from = from.split('\n').join('\r\n'); to = to.split('\n').join('\r\n'); }
  const hits = src.split(from).length - 1;
  if (hits !== 1) { console.error(`MUT ${name}: text found ${hits} times in ${file}, refusing`); process.exit(2); }
  fs.writeFileSync(file, src.replace(from, () => to));
  console.log(`MUT ${name}: applied to ${file}`);
};
const DECK = 'src/lib/soccerDeck.ts';
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const PACK = 'src/data/soccerDeck/starter.ts';

if (name === 'hold') {
  // the ceiling hold: every option must fit -> some option fits (a card with a neutral option always passes)
  once(DECK, '.filter(e => e.choices.every(c => trainingOf(c) <= room)', '.filter(e => e.choices.some(c => trainingOf(c) <= room)');
} else if (name === 'stamp') {
  // the slot line moved below the stamp loop: the deck card is dealt but never stamped
  const src = fs.readFileSync(ENGINE, 'utf8');
  const at = src.indexOf('  picked.unshift(...soccerDeckSlot(');
  if (at < 0 || src.indexOf('  picked.unshift(...soccerDeckSlot(', at + 1) >= 0) { console.error('MUT stamp: slot line not found once'); process.exit(2); }
  const end = src.indexOf('\n', at);
  const line = src.slice(at, end + 1);
  fs.writeFileSync(ENGINE, src.slice(0, at) + src.slice(end + 1));
  once(ENGINE, '    state.eventLastFired = fired;\n  }\n  return picked;\n}\n', '    state.eventLastFired = fired;\n  }\n' + line + '  return picked;\n}\n');
} else if (name === 'contract') {
  // the stale contract rule of the draft (correction 10a): 0 years left reads as the last year
  once(DECK, 'contractYear: state.contractYearsLeft === 1,', 'contractYear: (state.contractYearsLeft ?? 0) <= 1,');
} else if (name === 'capgate') {
  // card 724 says "You played for your country last season": its gate dropped
  once(PACK, "when: [{ fact: 'capped', op: '==', value: true }],", 'when: [],');
} else if (name === 'moralesay') {
  // the log line prints the promised morale, not what landed (correction 14)
  once(DECK, 'said.push(moved === 0 ? `Morale stays at ${s.morale}` : moved === c.morale ? `Morale ${plus(moved)}` : `Morale ${plus(moved)}, now at ${s.morale}`);',
    'said.push(`Morale ${plus(c.morale)}`);');
} else if (name === 'injgate') {
  // card 726 says "You spent a long spell out injured last season": the gate's bound made stale (8 weeks -> 1)
  once(PACK, "when: [{ fact: 'injuryWeeks', op: '>=', value: 8 }],", "when: [{ fact: 'injuryWeeks', op: '>=', value: 1 }],");
} else {
  console.error(`MUT: unknown mutation ${name}`); process.exit(2);
}
