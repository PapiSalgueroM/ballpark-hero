/* Round 1523 probe: the ninth's functions, with the tenth chained in front, give the ninth's base from this tree. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { inverseSoccerDeck, soccerDeckReceiptProblem, SOCCER_DECK_SHA256 } from '../../scripts/lib/careerSoccerDeck1334.mjs';
import { SOCCER_MORALE_ROWS, SOCCER_MORALE_SHA256 } from '../../scripts/lib/careerSoccerMorale1523.mjs';
const F = 'src/lib/soccerCareerEngine.ts';
const sha = s => createHash('sha256').update(s).digest('hex');
const head = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
console.log('tree engine', sha(head).slice(0, 16), 'tenth head pin', SOCCER_MORALE_SHA256[F].head.slice(0, 16));
let mid = head;
for (const r of SOCCER_MORALE_ROWS) mid = mid.replace(r.from, () => r.to);
console.log('after tenth', sha(mid).slice(0, 16), 'ninth head pin', SOCCER_DECK_SHA256[F].head.slice(0, 16));
const receipt = [];
const out = inverseSoccerDeck(F, head, receipt);
console.log('after both', sha(out).slice(0, 16), 'ninth base pin', SOCCER_DECK_SHA256[F].base.slice(0, 16));
console.log('receipt', receipt.map(r => r.addition).join(' '), '| problem:', JSON.stringify(soccerDeckReceiptProblem(receipt)));
console.log(sha(out) === SOCCER_DECK_SHA256[F].base ? 'CHAIN OK' : 'CHAIN BROKEN');
