// Fix pass mutations for Round 1328. Usage: node fxmut.mjs <name> <root>
// Each asserts its needle exists first, so it can never silently change nothing.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const [name, root = '.'] = process.argv.slice(2);
const M = {
  arrivalEffect: [
    ['src/hooks/useArrivalTop.ts', "import { useLayoutEffect, useRef } from 'react';", "import { useEffect, useRef } from 'react';"],
    ['src/hooks/useArrivalTop.ts', 'useLayoutEffect(() => {', 'useEffect(() => {'],
  ],
  arrivalOr: [['src/hooks/useArrivalTop.ts', 'if (rect.top >= readTop - 2 && visible >= needed) return;', 'if (rect.top >= readTop - 2 || visible >= needed) return;']],
  league1: [['src/lib/clubManagerHubLines.ts', "if (week === 0) return 'Not started';", "if (week <= 1) return 'Not started';"]],
  inboxOrder: [
    ['src/lib/clubManagerHubLines.ts', '  if (openDesk[0]) return line(openDesk[0].from);\n', ''],
    ['src/lib/clubManagerHubLines.ts', '  if (openMessages[0]) return line(sender(openMessages[0]));\n', '  if (openMessages[0]) return line(sender(openMessages[0]));\n  if (openDesk[0]) return line(openDesk[0].from);\n'],
  ],
  kitty: [['src/lib/clubManagerHubLines.ts', '  for (const line of p.spend) {\n    if (line.kitty) continue;\n', '  for (const line of p.spend) {\n']],
  kittyIncome: [['src/lib/clubManagerHubLines.ts', '  for (const line of p.income) {\n    if (line.kitty) continue;\n    coverActual -= line.actual;\n    coverProjected -= line.projected;\n  }\n', '']],
  hubKey: [['src/pages/ClubManager.tsx', "useArrivalTop<HTMLDivElement>(g.phase === 'hub' && g.career ? 'hub' : null)", "useArrivalTop<HTMLDivElement>(g.career ? 'hub' : null)"]],
  observer: [['src/components/club-manager/CalendarScreen.tsx', "    pending.observe(document.body, { attributes: true, attributeFilter: ['data-consent-pending'] });\n", '']],
};
const edits = M[name];
if (!edits) { console.log(`MUTATION ABORTED: unknown ${name}`); process.exit(3); }
for (const [rel, from, to] of edits) {
  const f = path.join(root, rel);
  const src = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  if (!src.includes(from)) { console.log(`MUTATION ABORTED: ${name}: needle not in ${rel}`); process.exit(3); }
  writeFileSync(f, src.replace(from, to));
}
console.log(`MUTATION APPLIED: ${name} (${edits.length} edit(s))`);
