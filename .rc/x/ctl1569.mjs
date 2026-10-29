/* Round 1569 (never committed): one source control on a runner checkout. Usage: node .rc/x/ctl1569.mjs <name>
   nobar     Start over is never drawn                      -> report A tests must fail
   noretire  the no offer talk loses its Retire now choice -> report B last season test must fail
   nowhy     the no offer talk loses its reason            -> report B tests must fail */
import fs from 'node:fs';

const board = 'src/components/us-career/UsCareerBoard.tsx';
const SWAPS = {
  nobar: ['{startOver && <UsCareerStartOver', '{false && <UsCareerStartOver'],
  noretire: ["retire={retireFromMarket('Retire now')}", 'retire={null}'],
  nowhy: ['why={extTalk.offer ? null : noOfferWhy(', 'why={extTalk.offer || true ? null : noOfferWhy('],
};
const [from, to] = SWAPS[process.argv[2]] ?? [];
const src = fs.readFileSync(board, 'utf8');
if (!from || !src.includes(from)) { console.log(`ctl1569 ABORT: no control ${process.argv[2]} or its anchor is missing`); process.exit(2); }
fs.writeFileSync(board, src.replace(from, to));
console.log(`ctl1569 applied ${process.argv[2]}`);
