// Round 1343 fixer's mutations, applied on a runner checkout only and undone there with git checkout.
// Each anchor must be in its file exactly once, or the script exits 2 and changes nothing.
import { readFileSync, writeFileSync } from 'node:fs';

const MUTS = {
  sackedfirst: [['src/hooks/useClubManager.ts',
    "return c.retired ? 'retired' : c.sacked ? 'sacked' : c.pendingSummary ? 'seasonEnd' : 'hub';",
    "return c.sacked ? 'sacked' : c.retired ? 'retired' : c.pendingSummary ? 'seasonEnd' : 'hub';"]],
  missedtwo: [['src/components/club-manager/ClubManagerCareerPanel.tsx', '(high.missed ?? 0) >= 1 &&', '(high.missed ?? 0) > 1 &&']],
  seasonover: [['src/lib/clubManagerRetire.ts',
    '  return !!c && !c.retired && !c.live && !seasonPlayedOut(c);',
    '  return !!c && !c.retired && !c.live;']],
  nofocus: [['src/components/club-manager/RetireDoor.tsx', 'doorRef.current?.focus({ preventScroll: true });', '']],
  position0: [
    ['src/lib/clubManagerRetire.ts', '    if (played > 0) retired.position = leaguePosition(c);', '    retired.position = leaguePosition(c);'],
    ['src/lib/clubManagerRetire.ts', '    const pos = leagueGames(c) > 0 ? leaguePosition(c) : 0;', '    const pos = leaguePosition(c);'],
    ['src/components/club-manager/ClubManagerFarewell.tsx', 'r.position && (r.played ?? 0) > 0 ?', 'r.position ?'],
  ],
  endedline: [['src/components/club-manager/ClubManagerFarewell.tsx', '<ManagerRecordLines c={c} ended />', '<ManagerRecordLines c={c} />']],
};

const name = process.argv[2];
const steps = MUTS[name];
if (!steps) { console.log(`MUT unknown ${name}`); process.exit(2); }
const texts = new Map();
for (const [file, from, to] of steps) {
  const t = texts.get(file) ?? readFileSync(file, 'utf8');
  const n = t.split(from).length - 1;
  if (n !== 1) { console.log(`MUT ${name}: anchor in ${file} ${n} times, not once; nothing changed`); process.exit(2); }
  texts.set(file, t.replace(from, to));
}
for (const [file, t] of texts) writeFileSync(file, t);
console.log(`MUT ${name} applied (${steps.length} edit${steps.length === 1 ? '' : 's'})`);
