// Round 1328 trial: hand inboxTile the desk instead of importing deskOf, to see whether the engine chunk's export
// aliases then come out exactly as on the base build. Edits two files in the runner's checkout only.
import { readFileSync, writeFileSync } from 'node:fs';
const rep = (f, a, b) => {
  const s = readFileSync(f, 'utf8');
  if (!s.includes(a)) { console.log(`TRIAL ABORTED: ${f} does not hold ${a.slice(0, 60)}`); process.exit(3); }
  writeFileSync(f, s.replace(a, b));
};
const L = 'src/lib/clubManagerHubLines.ts';
rep(L, "import { deskOf } from '@/lib/clubManagerDecisions';", "import type { DeskItem } from '@/lib/clubManagerDecisions';");
rep(L, "export function inboxTile(c: Pick<CareerState, 'inbox' | 'decisions'>): { count: number; value: string; sub: string } {", "export function inboxTile(c: Pick<CareerState, 'inbox'>, desk: DeskItem[]): { count: number; value: string; sub: string } {");
rep(L, '  const desk = deskOf(c);\n', '');
rep('src/pages/ClubManager.tsx', 'const inboxLine = inboxTile(c);', 'const inboxLine = inboxTile(c, deskOf(c));');
console.log('TRIAL APPLIED');
