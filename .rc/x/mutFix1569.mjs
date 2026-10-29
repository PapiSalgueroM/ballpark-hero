/* Round 1569 fix run (never committed): put back, on a runner checkout, the inputs of the fix run that the US
   board parity replay can see, so a recording with them put back shows whether anything else moved.
   Usage: node .rc/x/mutFix1569.mjs <all|wrapper|copy>
     wrapper  the board's own wrapper element (UsCareerBoard.tsx withSaveStatus returns a fragment again)
     copy     C1 the last season words with an offer (board: lastSeason only without an offer, as before)
              C2 the pulled offer's note in a last season (the old expression)
              C3 the market promise without "if your career goes on" (ExtensionCard.tsx)
              C4 "January" for an NFL run that reached the Super Bowl (careerVariance.ts)
     all      both
   Refuses (exit 2) unless every anchor is found exactly once. */
import fs from 'node:fs';

const mode = process.argv[2];
const B = 'src/components/us-career/UsCareerBoard.tsx', E = 'src/components/us-career/ExtensionCard.tsx', V = 'src/lib/careerVariance.ts';
const WRAPPER = [
  [B, 'const withSaveStatus = (content: ReactNode) => <div>', 'const withSaveStatus = (content: ReactNode) => <>'],
  [B, '    {content}\n  </div>;', '    {content}\n  </>;'],
];
const COPY = [
  [B, 'lastSeason={seasonAheadIsLast(career, sport.shouldRetire)}', 'lastSeason={!extTalk.offer && seasonAheadIsLast(career, sport.shouldRetire)}'],
  [E, '{!o && lastSeason ? (talk.pulled ? `${talk.label} pulled the offer.` : `${talk.label} are letting your deal run out.`) : talk.note}',
    '{!o && lastSeason && !talk.pulled ? `${talk.label} are letting your deal run out.` : talk.note}'],
  [E, 'year out and, if your career goes on, reach free agency, where', 'year out and reach free agency, where'],
  [V, "sport === 'nfl' && depth >= 3 ? 'the playoffs' : POSTSEASON_WORD[sport]", 'POSTSEASON_WORD[sport]'],
];
const swaps = mode === 'all' ? [...WRAPPER, ...COPY] : mode === 'wrapper' ? WRAPPER : mode === 'copy' ? COPY : null;
if (!swaps) { console.log(`mutFix1569 ABORT: unknown mode ${mode}`); process.exit(2); }
const files = new Map();
for (const [file, from, to] of swaps) {
  if (!files.has(file)) {
    const raw = fs.readFileSync(file, 'utf8');
    files.set(file, { crlf: raw.includes('\r\n'), src: raw.split('\r\n').join('\n') });
  }
  const f = files.get(file);
  if (f.src.split(from).length !== 2) { console.log(`mutFix1569 ABORT: anchor not found exactly once in ${file}: ${from.slice(0, 70)}`); process.exit(2); }
  f.src = f.src.replace(from, () => to);
}
for (const [file, f] of files) fs.writeFileSync(file, f.crlf ? f.src.split('\n').join('\r\n') : f.src);
console.log(`mutFix1569 applied ${mode}: ${swaps.length} swaps in ${files.size} files`);
