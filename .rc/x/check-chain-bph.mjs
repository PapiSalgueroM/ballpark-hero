/* Release BP part two: the whole soccer inverse chain from this tree's engine. 1524's rows (owner tail) give 1523's
   head pin, 1523's rows (morale) give the ninth's head pin, and the ninth's functions (which apply both in front of
   their own rows) give the ninth's base pin, with one receipt in that order. Run from the worktree root. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { inverseSoccerDeck, soccerDeckReceiptProblem, SOCCER_DECK_SHA256 } from '../../scripts/lib/careerSoccerDeck1334.mjs';
import { SOCCER_MORALE_ROWS, SOCCER_MORALE_SHA256 } from '../../scripts/lib/careerSoccerMorale1523.mjs';
import { SOCCER_OWNER_ROWS, SOCCER_OWNER_SHA256 } from '../../scripts/lib/careerSoccerOwner1524.mjs';
const F = 'src/lib/soccerCareerEngine.ts';
const sha = s => createHash('sha256').update(s).digest('hex');
const once = (text, r) => { if (text.split(r.from).length !== 2) throw new Error(`${r.name} not exactly once`); return text.replace(r.from, () => r.to); };
const head = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
const ok = [];
console.log('tree engine', sha(head).slice(0, 16), '1524 head pin', SOCCER_OWNER_SHA256[F].head.slice(0, 16));
ok.push(sha(head) === SOCCER_OWNER_SHA256[F].head);
let a = head;
for (const r of SOCCER_OWNER_ROWS) a = once(a, r);
console.log('after 1524', sha(a).slice(0, 16), '1524 base pin', SOCCER_OWNER_SHA256[F].base.slice(0, 16), '1523 head pin', SOCCER_MORALE_SHA256[F].head.slice(0, 16));
ok.push(sha(a) === SOCCER_OWNER_SHA256[F].base, sha(a) === SOCCER_MORALE_SHA256[F].head);
let b = a;
for (const r of SOCCER_MORALE_ROWS) b = once(b, r);
console.log('after 1523', sha(b).slice(0, 16), '1523 base pin', SOCCER_MORALE_SHA256[F].base.slice(0, 16), 'ninth head pin', SOCCER_DECK_SHA256[F].head.slice(0, 16));
ok.push(sha(b) === SOCCER_MORALE_SHA256[F].base, sha(b) === SOCCER_DECK_SHA256[F].head);
const receipt = [];
const out = inverseSoccerDeck(F, head, receipt);
console.log('after the ninth', sha(out).slice(0, 16), 'ninth base pin', SOCCER_DECK_SHA256[F].base.slice(0, 16));
ok.push(sha(out) === SOCCER_DECK_SHA256[F].base);
const problem = soccerDeckReceiptProblem(receipt);
console.log('receipt', receipt.map(r => r.addition).join(' '), '| problem:', JSON.stringify(problem));
ok.push(problem === '');
const want = [...SOCCER_OWNER_ROWS, ...SOCCER_MORALE_ROWS].map(r => r.name).join();
ok.push(receipt.slice(0, SOCCER_OWNER_ROWS.length + SOCCER_MORALE_ROWS.length).map(r => r.addition).join() === want);
console.log(ok.every(Boolean) ? `CHAIN OK (${ok.length} checks)` : `CHAIN BROKEN (${ok.map(Number).join('')})`);
process.exit(ok.every(Boolean) ? 0 : 1);
