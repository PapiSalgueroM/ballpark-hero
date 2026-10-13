// Reviewer mutation tool (Round 1326, RUN lens). Applies ONE plausible mutation to the runner's checkout.
// node .rc/x/mut.mjs <id>   exits 2 when the anchor is not found exactly once (the mutation did not apply).
import fs from 'node:fs';

const M = {
  // M1: the promotion ladder's title ask drops toLeague altogether ("Win Championship").
  promo: ['src/lib/clubManager.ts',
    'if (rank <= 1) return { target: 1, label: `Win ${toLeague(league.name)}` };',
    'if (rank <= 1) return { target: 1, label: `Win ${league.name}` };'],
  // M2: dramaText loses its global flag (only the first sentence gets a capital).
  dramag: ['src/lib/clubManager.ts',
    "return text.replace(/(^|[.?!] )([a-z])/g, (_m",
    "return text.replace(/(^|[.?!] )([a-z])/, (_m"],
  // M3: the projected cover sums the actual column (copy paste slip).
  coverproj: ['src/components/club-manager/FinancesScreen.tsx',
    'const coverProjected = r2(running.reduce((n, l) => n + l.projected, 0));',
    'const coverProjected = r2(running.reduce((n, l) => n + l.actual, 0));'],
  // M4: the staff branch boundary flips, so a desk with none left is told it can match 0 more offers.
  staffedge: ['src/lib/clubManagerStaff.ts',
    ': n > 0\n',
    ': n >= 0\n'],
  // M5: the kitty colour reads red at zero.
  kittyzero: ['src/components/club-manager/FinancesScreen.tsx',
    "k.kittyActual < 0 ? 'text-red-400'",
    "k.kittyActual <= 0 ? 'text-red-400'"],
  // M6: the drama line describes p1 twice (swapped argument), no draw moves.
  dramaarg: ['src/lib/clubManager.ts',
    'text: dramaText(drama.text, d1, otherDescriptor(p2, d1)),',
    'text: dramaText(drama.text, d1, otherDescriptor(p1, d1)),'],
  // M7: the calendar line goes back to the old claim (the intl control only covers the break note).
  markline: ['src/lib/clubManagerInternationals.ts',
    "'This calendar plays on through it: your internationals",
    "'Your fixtures do not stop for it: your internationals"],
  // M8: Match Centre's opponent line goes back to "the".
  matchcentre: ['src/components/club-manager/MatchCentre.tsx',
    ': f.oppLeagueName ? `Plays in ${toLeague(f.oppLeagueName)}` : null;',
    ': f.oppLeagueName ? `Plays in the ${f.oppLeagueName}` : null;'],
  // M9: the staff weeks read one less than the approach (off by one).
  staffweeks: ['src/lib/clubManagerStaff.ts',
    'const weeks = s.poach?.weeksLeft ?? 0;',
    'const weeks = (s.poach?.weeksLeft ?? 1) - 1;'],
  // M10: the cover filter flips to the kitty lines.
  coverflip: ['src/components/club-manager/FinancesScreen.tsx',
    'const running = p.spend.filter(l => l.kitty === false);',
    'const running = p.spend.filter(l => l.kitty !== true && l.id !== \'travel\');'],
  // M11: a number moves with no draw: the promotion ladder asks the top club for second.
  promotarget: ['src/lib/clubManager.ts',
    'if (rank <= 1) return { target: 1, label: `Win ${toLeague(league.name)}` };',
    'if (rank <= 1) return { target: 2, label: `Win ${toLeague(league.name)}` };'],
};

const id = process.argv[2];
const m = M[id];
if (!m) { console.error(`mut: no mutation ${id}`); process.exit(2); }
const [file, from, to] = m;
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
const src = crlf ? raw.split('\r\n').join('\n') : raw;
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`mut ${id}: anchor found ${n} times in ${file}, NOT APPLIED`); process.exit(2); }
let out = src.replace(from, to);
if (crlf) out = out.split('\n').join('\r\n');
fs.writeFileSync(file, out);
console.log(`mut ${id}: APPLIED to ${file}`);
