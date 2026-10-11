// Reviewer facts-fences, Release AW part one. Runs ON THE RUNNER'S COPY ONLY, never committed.
// Tries the cure the builder named and did not try: the comeback dialog keeps the name as text and gains its flag
// after it on the same line, and the OWED_BARE entry that excuses the bare print is taken out of the fence.
// Refuses to run unless each string it replaces is in its file exactly once.
import fs from 'node:fs';
const once = (file, from, to) => {
  const raw = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const count = raw.split(from).length - 1;
  if (count !== 1) { console.error(`mutFlag: refused, "${from.slice(0, 60)}" is in ${file} ${count} times`); process.exit(3); }
  fs.writeFileSync(file, raw.replace(from, to));
  console.log(`mutFlag: applied to ${file}`);
};
const CARD = 'src/components/soccer-career/InternationalReturnCard.tsx';
once(CARD,
  '<DialogDescription className="shrink-0">National-team selection for {career.nationality}.</DialogDescription>',
  '<DialogDescription className="shrink-0">National-team selection for {career.nationality}. <FlagImg name={career.nationality} size={12} /></DialogDescription>');
once(CARD,
  "import { Button } from '@/components/ui/button';",
  "import { Button } from '@/components/ui/button';\nimport { FlagImg } from '@/components/FlagImg';");
// The fence: drop the Release AW entry (from its comment to its closing brace) so the list is not stale.
const FENCE = 'scripts/simNationalityFlags.mjs';
const raw = fs.readFileSync(FENCE, 'utf8').replaceAll('\r\n', '\n');
const start = raw.indexOf('  /* Release AW: the comeback card of Rounds 1241 to 1243 came in with the train.');
const marker = "    file: 'src/components/soccer-career/InternationalReturnCard.tsx', site: 'career.nationality',";
const at = raw.indexOf(marker);
const end = raw.indexOf('\n  },\n', at);
if (start < 0 || at < 0 || end < 0 || at < start) { console.error('mutFlag: refused, the Release AW entry of OWED_BARE was not found'); process.exit(3); }
fs.writeFileSync(FENCE, raw.slice(0, start) + raw.slice(end + '\n  },\n'.length));
console.log(`mutFlag: the Release AW entry is out of ${FENCE} (${end + 6 - start} characters)`);
