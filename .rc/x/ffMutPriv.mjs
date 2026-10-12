// Review mutation (facts-fences, Release BA), runner only, never committed.
// Deletes the diagnostics disclosure correction 15 added to the Reported issues bullet and the
// FormSubmit bullet's pointer to it, so simReportContext can show whether anything guards them.
import fs from 'node:fs';
const file = 'src/pages/PrivacyPolicy.tsx';
let src = fs.readFileSync(file, 'utf8');
const cuts = [
  " We record the report time in UTC. Where space allows, reports also include timezone, your browser's user agent string (its name, version and operating system) and language, viewport size and screen pixel ratio, and the loaded build filename when available. Each report also notes which Report button sent it (the game's own or the one in the footer) and whether the game details were shortened to fit. These small diagnostics help us reproduce the issue.",
  ' The relay also receives the time in UTC and the other report details and limited browser diagnostics described in Section 1.',
];
for (const cut of cuts) {
  if (!src.includes(cut)) { console.error('MUTATION ABORT: sentence not found: ' + cut.slice(0, 60)); process.exit(2); }
  const next = src.replace(cut, '');
  if (next === src) { console.error('MUTATION ABORT: replace changed nothing'); process.exit(2); }
  src = next;
}
fs.writeFileSync(file, src);
console.log('MUTATION APPLIED: both diagnostics disclosures removed from ' + file);
