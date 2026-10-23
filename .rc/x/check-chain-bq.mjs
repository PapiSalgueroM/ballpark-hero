/* Release BQ: the whole soccer inverse chain from this tree's engine. 1525's rows (the eleventh, season awards) give
   1524's head pin, 1524's rows (owner tail) give 1523's head pin, 1523's own rows (morale) give the ninth's head pin,
   and the ninth's functions (which apply all three in front of their own rows) give the ninth's base pin, with one
   receipt in that order. The tenth's own importers (SOCCER_MORALE_ROWS = 1525's then 1523's) are checked to find every
   row once on this engine too. Run from the worktree root. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { inverseSoccerDeck, soccerDeckReceiptProblem, SOCCER_DECK_SHA256 } from '../../scripts/lib/careerSoccerDeck1334.mjs';
import { SOCCER_MORALE_ROWS, SOCCER_MORALE_OWN_ROWS, SOCCER_MORALE_SHA256, inverseSoccerMorale, soccerMoraleReceiptProblem } from '../../scripts/lib/careerSoccerMorale1523.mjs';
import { SOCCER_OWNER_ROWS, SOCCER_OWNER_SHA256 } from '../../scripts/lib/careerSoccerOwner1524.mjs';
import { SOCCER_AWARDS_ROWS, SOCCER_AWARDS_SHA256, inverseSoccerAwards, soccerAwardsReceiptProblem } from '../../scripts/lib/careerSoccerAwards1525.mjs';
const F = 'src/lib/soccerCareerEngine.ts';
const sha = s => createHash('sha256').update(s).digest('hex');
const s16 = s => sha(s).slice(0, 16);
const once = (text, r) => { if (text.split(r.from).length !== 2) throw new Error(`${r.name} not exactly once`); return text.replace(r.from, () => r.to); };
const head = fs.readFileSync(F, 'utf8').split('\r\n').join('\n');
const ok = [];
const check = (label, cond) => { ok.push(cond); if (!cond) console.log('  FAIL ' + label); };
console.log('tree engine', s16(head), '1525 head pin', SOCCER_AWARDS_SHA256[F].head.slice(0, 16));
check('tree is 1525 head pin', sha(head) === SOCCER_AWARDS_SHA256[F].head);
let a = head;
for (const r of SOCCER_AWARDS_ROWS) a = once(a, r);
console.log('after 1525', s16(a), '1525 base pin', SOCCER_AWARDS_SHA256[F].base.slice(0, 16), '1524 head pin', SOCCER_OWNER_SHA256[F].head.slice(0, 16));
check('after 1525 is its base pin', sha(a) === SOCCER_AWARDS_SHA256[F].base);
check('after 1525 is 1524 head pin', sha(a) === SOCCER_OWNER_SHA256[F].head);
let b = a;
for (const r of SOCCER_OWNER_ROWS) b = once(b, r);
console.log('after 1524', s16(b), '1524 base pin', SOCCER_OWNER_SHA256[F].base.slice(0, 16), '1523 head pin', SOCCER_MORALE_SHA256[F].head.slice(0, 16));
check('after 1524 is its base pin', sha(b) === SOCCER_OWNER_SHA256[F].base);
check('after 1524 is 1523 head pin', sha(b) === SOCCER_MORALE_SHA256[F].head);
let c = b;
for (const r of SOCCER_MORALE_OWN_ROWS) c = once(c, r);
console.log('after 1523', s16(c), '1523 base pin', SOCCER_MORALE_SHA256[F].base.slice(0, 16), 'ninth head pin', SOCCER_DECK_SHA256[F].head.slice(0, 16));
check('after 1523 is its base pin', sha(c) === SOCCER_MORALE_SHA256[F].base);
check('after 1523 is ninth head pin', sha(c) === SOCCER_DECK_SHA256[F].head);
const receipt = [];
const out = inverseSoccerDeck(F, head, receipt);
console.log('after the ninth', s16(out), 'ninth base pin', SOCCER_DECK_SHA256[F].base.slice(0, 16));
check('ninth gives its base pin', sha(out) === SOCCER_DECK_SHA256[F].base);
const problem = soccerDeckReceiptProblem(receipt);
console.log('receipt', receipt.map(r => r.addition).join(' '), '| problem:', JSON.stringify(problem));
check('ninth receipt', problem === '');
const want = [...SOCCER_AWARDS_ROWS, ...SOCCER_OWNER_ROWS, ...SOCCER_MORALE_OWN_ROWS].map(r => r.name).join();
check('ninth receipt order', receipt.slice(0, SOCCER_AWARDS_ROWS.length + SOCCER_OWNER_ROWS.length + SOCCER_MORALE_OWN_ROWS.length).map(r => r.addition).join() === want);
const r10 = [];
const t10 = inverseSoccerMorale(F, head, r10);
check('tenth importers: receipt', soccerMoraleReceiptProblem(r10) === '');
check('tenth starts with 1525', SOCCER_MORALE_ROWS.slice(0, SOCCER_AWARDS_ROWS.length).map(r => r.name).join() === SOCCER_AWARDS_ROWS.map(r => r.name).join());
const r11 = [];
const t11 = inverseSoccerAwards(F, head, r11);
check('eleventh alone gives its base', sha(t11) === SOCCER_AWARDS_SHA256[F].base && soccerAwardsReceiptProblem(r11) === '');
console.log('tenth alone', s16(t10), '(1525 and 1523 out, 1524 in)');
console.log(ok.every(Boolean) ? `CHAIN OK (${ok.length} checks)` : `CHAIN BROKEN (${ok.map(Number).join('')})`);
process.exit(ok.every(Boolean) ? 0 : 1);
