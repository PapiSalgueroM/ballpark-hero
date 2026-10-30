/* Reviewer mutation applier (round 1601, runner lens). node .rc/x/mut.mjs <name>
 * Applies one small plausible mutation to the checked out source on the runner; every anchor must occur exactly
 * once (else exit 2, the mutation did not apply). The request line restores with git checkout in the same line. */
import fs from 'node:fs';

const M = {
  keepoldest: ['src/lib/clubManagerCareerLines.ts', '.sort((a, b) => a[0] - b[0]).slice(-PAST_KEPT);', '.sort((a, b) => a[0] - b[0]).slice(0, PAST_KEPT);'],
  noloans: ['src/lib/clubManagerCareerLines.ts',
    'const men: LineIn[] = [...state.squad, ...(state.loanedOut ?? []).map(l => l?.player).filter((p): p is LineIn => !!p)];',
    'const men: LineIn[] = [...state.squad];'],
  clubyear: ['src/lib/clubManagerCards.ts', 'club: state.history.find(h => h.season === row[0])?.club ?? null,', 'club: state.history.find(h => h.season === row[0] - 1)?.club ?? null,'],
  latefrom: ['src/lib/clubManagerCards.ts', "if (back && boards && boards.from !== null) notes.push({ k: 'late', from: boards.from + 1 });", "if (back && boards && boards.from !== null) notes.push({ k: 'late', from: boards.from });"],
  restoredreveal: ['src/components/club-manager/SquadScreen.tsx', '{ enabled: isOpen && !restored, skipFirst: false }', '{ enabled: isOpen, skipFirst: false }'],
  revealkey: ['src/pages/ClubManager.tsx', "`hub:${hubPanel ?? ''}:${cards?.pushes ?? 0}`", "`hub:${hubPanel ?? ''}:${card ? JSON.stringify(card) : ''}`"],
  keptboundary: ['src/lib/clubManagerCards.ts', "return from > first ? [{ k: 'keptfrom', from }] : [];", "return from >= first ? [{ k: 'keptfrom', from }] : [];"],
};
const name = process.argv[2];
if (!M[name]) { console.log(`mut: no mutation ${name}`); process.exit(2); }
const [file, from, to] = M[name];
const text = fs.readFileSync(file, 'utf8');
const n = text.split(from).length - 1;
if (n !== 1) { console.log(`mut: ${name}: the anchor occurs ${n} times in ${file}, not once; NOT APPLIED`); process.exit(2); }
fs.writeFileSync(file, text.split(from).join(to));
console.log(`mut: ${name} applied to ${file}`);
