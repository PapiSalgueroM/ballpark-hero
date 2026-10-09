/* Release AP closing fix, a probe that is never committed.
   Rewrites src/pages/StadiumTycoon.tsx in the tree it is run from (a throwaway copy on the runner):
     nodialog  the Latest season review cut out altogether (the most a split could ever save)
     lazy      the same component moved to a file of its own and loaded on demand
   Every anchor is asserted before it is used, so a variant that changed nothing cannot be weighed. */
import fs from 'node:fs';

const mode = process.argv[2];
if (mode !== 'nodialog' && mode !== 'lazy') { console.error('mode is nodialog or lazy'); process.exit(2); }
const PAGE = 'src/pages/StadiumTycoon.tsx';
let src = fs.readFileSync(PAGE, 'utf-8');
const once = (needle) => {
  const n = src.split(needle).length - 1;
  if (n !== 1) { console.error(`anchor found ${n} times, wanted 1: ${needle.slice(0, 70)}`); process.exit(2); }
};
const START = '/* Release AP: exported so src/test/tycoonLatestSeason.test.tsx';
const END = "/* Round 582: the league.";
const USE = '      {last && <LatestSeasonReview last={last} league={lg} />}\n';
const LAZY_AFTER = "const SetPieceBoard = lazy(() => import('@/components/tycoon/SetPieceBoard').then(module => ({ default: module.WatchedSetPieceBoard })));\n";
once(START); once(END); once(USE); once(LAZY_AFTER);
const a = src.indexOf(START);
const b = src.indexOf(END);
if (!(a < b)) { console.error('anchors out of order'); process.exit(2); }
const region = src.slice(a, b);
if (!region.includes('export function LatestSeasonReview(') || !region.includes('data-latest-season-review')) { console.error('the region is not the review'); process.exit(2); }
src = src.slice(0, a) + src.slice(b);

if (mode === 'nodialog') {
  src = src.replace(USE, '');
} else {
  const body = region.slice(region.indexOf('export function LatestSeasonReview(')).replace('export function LatestSeasonReview(', 'export default function LatestSeasonReview(');
  const file = [
    "import { useRef, useState } from 'react';",
    "import { cn } from '@/lib/utils';",
    "import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';",
    "import { leagueStandings, ordinal, type TycoonLeague } from '@/lib/stadiumTycoon';",
    "import type { LastSeason } from '@/hooks/useStadiumTycoon';",
    '',
    body,
  ].join('\n');
  fs.writeFileSync('src/components/tycoon/LatestSeasonReview.tsx', file);
  src = src.replace(LAZY_AFTER, LAZY_AFTER + "const LatestSeasonReview = lazy(() => import('@/components/tycoon/LatestSeasonReview'));\n");
  src = src.replace(USE, '      {last && <Suspense fallback={<div className="min-h-11" />}><LatestSeasonReview last={last} league={lg} /></Suspense>}\n');
  src = src.replace("import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';", "import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';");
  src = src.replace("SET_PIECE_WINDOW_SEC, type TycoonLeague,\n", 'SET_PIECE_WINDOW_SEC,\n');
  src = src.replace("import type { LastSeason } from '@/hooks/useStadiumTycoon';\n", '');
}
if (src.includes('<LatestSeasonReview') !== (mode === 'lazy')) { console.error('the use site did not change as meant'); process.exit(2); }
fs.writeFileSync(PAGE, src);
console.log(`variant ${mode}: the page is ${src.length} characters, the review region was ${region.length}`);
