/**
 * Round 186 harness: the season curtain in all four career games.
 *
 * What Round 186 shipped (S-3's third pass): the biggest beat of the
 * career loop, the season resolving, stopped landing as static feed text.
 * One shared engine (usCareerReveal.ts) decides the presentation facts
 * and one shared card (SeasonRevealCard) stages them: the year slams in,
 * the team result lands big, a title pours confetti, the story lines walk
 * in one by one. The engine INVENTS NOTHING: every line it emits is a
 * string the sport engines already wrote, passed through verbatim.
 *
 * The rules this file pins:
 *   - Confetti fires for a result starting 'WON THE' and for nothing
 *     else. The trap case is MLB, which words EVERY playoff exit
 *     'Lost the ...': a World Series LOSS must never shower confetti.
 *   - A suspended season gets the muted card: banned tone, no confetti,
 *     no stat line, and no per-line theatre even for emoji-led lines.
 *   - Output lines equal input lines, byte for byte, in engine order
 *     (camp note, then season notes, then progress notes).
 *   - Line tones come from the leading emoji dialect the engines already
 *     speak (rings and camp wins gold, benchings and bans stung), and
 *     anything else stays plain.
 *   - Integration: across seeded careers in all four sports, confetti on
 *     a season's reveal is TRUE exactly when that season added a ring
 *     (or a Cup), never otherwise.
 *
 * Run: node scripts/simSeasonReveal.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/seasonRevealEntry.mjs';
const BUNDLE = '/tmp/seasonReveal.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const nfl = await import('${ROOT}/src/lib/nflMyCareer.ts');
const nba = await import('${ROOT}/src/lib/nbaMyCareer.ts');
const nhl = await import('${ROOT}/src/lib/nhlMyCareer.ts');
const mlb = await import('${ROOT}/src/lib/mlbMyCareer.ts');
const reveal = await import('${ROOT}/src/lib/usCareerReveal.ts');
export { nfl, nba, nhl, mlb, reveal };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { nfl, nba, nhl, mlb, reveal } = await import(BUNDLE);
const { buildSeasonReveal, toneOfLine } = reveal;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

const base = over => buildSeasonReveal({
  year: 2029, subHeader: 'Testville · age 24 · QB', teamResult: 'Missed the playoffs',
  statLine: '4,100 yds, 31 TD, 9 INT', campNote: null, notes: [], progressNotes: [], ...over,
});

/* ---------- 1. Confetti truth table, all four sports ---------- */
console.log('1) Confetti fires on WON THE and on nothing else, the MLB trap included');
{
  const titles = ['WON THE SUPER BOWL', 'WON THE NBA FINALS', 'WON THE STANLEY CUP', 'WON THE WORLD SERIES'];
  for (const t of titles) {
    const r = base({ teamResult: t });
    if (!r.confetti) fail(`'${t}' did not fire confetti`);
    if (r.resultTone !== 'title') fail(`'${t}' tone is '${r.resultTone}', not 'title'`);
  }
  /* Every non-title exit each sport can word, including the trap: MLB
     words every exit 'Lost the ...', so a prefix looser than WON THE
     would celebrate a World Series loss. */
  const exits = [
    'Missed the playoffs', 'Missed October',
    'Lost in the Wild Card round', 'Lost in the Divisional round', 'Lost the Conference Championship', 'Lost the Super Bowl',
    'Lost in the first round', 'Lost in the conference semis', 'Lost the Conference Finals', 'Lost the NBA Finals',
    'Lost in Round 1', 'Lost in Round 2', 'Lost the Conference Final', 'Lost the Cup Final',
    'Lost the Wild Card series', 'Lost the Division Series', 'Lost the Championship Series', 'Lost the World Series',
  ];
  for (const t of exits) {
    const r = base({ teamResult: t });
    if (r.confetti) fail(`'${t}' fired confetti and must not`);
    if (r.resultTone !== 'out') fail(`'${t}' tone is '${r.resultTone}', not 'out'`);
  }
  console.log(`   ${titles.length} titles confetti, ${exits.length} exits quiet`);
}

/* ---------- 2. The suspended season is muted everywhere ---------- */
console.log('2) A banned year gets the muted card');
{
  const r = base({
    teamResult: 'SUSPENDED', statLine: 'should be wiped',
    progressNotes: ['🚫 The league office is not writing back.', '📉 Another point off the top.', 'A quiet winter.'],
  });
  if (r.resultTone !== 'banned') fail(`banned tone is '${r.resultTone}'`);
  if (r.confetti) fail('a banned season fired confetti');
  if (r.statLine !== '') fail(`a banned season kept a stat line: '${r.statLine}'`);
  if (!/suspended list/i.test(r.result)) fail(`banned result line reads '${r.result}'`);
  if (!r.lines.every(l => l.tone === 'plain')) fail('a banned season styled its lines; the muted card takes no theatre');
  console.log('   banned tone, no confetti, no stat line, all lines plain');
}

/* ---------- 3. Invent nothing: verbatim lines, engine order ---------- */
console.log('3) Output lines equal input lines, byte for byte, in order');
{
  const campNote = '🚀 You won the camp battle. The huddle is yours now.';
  const notes = ['💍 A RING.', 'The city threw a parade for a week.'];
  const progressNotes = ['Rating +2.', '🤕 The knee is louder every March.'];
  const r = base({ teamResult: 'WON THE SUPER BOWL', campNote, notes, progressNotes });
  const want = [campNote, ...notes, ...progressNotes];
  if (r.lines.length !== want.length) fail(`expected ${want.length} lines, got ${r.lines.length}`);
  want.forEach((w, i) => { if (r.lines[i]?.text !== w) fail(`line ${i} rewrote the engine: '${r.lines[i]?.text}'`); });
  const noCamp = base({ campNote: null, notes, progressNotes: [] });
  if (noCamp.lines.length !== notes.length) fail('a null camp note still produced a line');
  if (!base({}).header.includes('2029')) fail(`header lost the year: '${base({}).header}'`);
  if (base({}).statLine !== '4,100 yds, 31 TD, 9 INT') fail('the stat line did not pass through verbatim');
  console.log('   verbatim, ordered, null camp note skipped, header carries the year');
}

/* ---------- 4. The emoji dialect maps to tones ---------- */
console.log('4) Line tones follow the leading emoji');
{
  const cases = [
    ['💍 A RING.', 'award'],
    ['🏆 THE CUP. Your day with it is coming.', 'award'],
    ['🚀 You won the camp battle. The huddle is yours now.', 'award'],
    ['🪑 Benched. The new man outplayed you all camp.', 'sting'],
    ['🚫 Season served on the suspended list.', 'sting'],
    ['🤕 Surgery in May.', 'sting'],
    ['📉 The decline is real now.', 'sting'],
    ['Rating +3.', 'plain'],
    ['The city expects a savior.', 'plain'],
    ['🎯 Kickers do not sit. The job is yours from day one.', 'plain'],
  ];
  for (const [text, want] of cases) {
    const got = toneOfLine(text);
    if (got !== want) fail(`'${text.slice(0, 30)}' toned '${got}', wanted '${want}'`);
  }
  console.log(`   ${cases.length} lines toned right`);
}

/* ---------- 5. Integration: confetti exactly when the season added a ring ---------- */
console.log('5) Across seeded careers in all four sports, confetti tracks the ring count');
{
  const SPORTS = [
    { key: 'nfl', lib: nfl, start: (rng) => nfl.startCareer('Reveal Test', 'QB', nfl.ARCHETYPES.QB[0], rng, null, undefined), assign: (c, tq, rng) => nfl.nflAssignRole(c, tq, rng), camp: (c, tq, rng) => nfl.nflCampBattle(c, tq, rng), sim: (c, tq, rng) => nfl.simSeason(c, tq, rng), prog: (c, rng) => nfl.progress(c, rng), roll: (t, rng) => nfl.rollTeamQuality(t, rng), rings: c => c.rings },
    { key: 'nba', lib: nba, start: (rng) => nba.startNbaCareer('Reveal Test', 'PG', nba.NBA_ARCHETYPES.PG[0], rng, null, undefined), assign: (c, tq, rng) => nba.nbaAssignRole(c, tq, rng), camp: (c, tq, rng) => nba.nbaCampBattle(c, tq, rng), sim: (c, tq, rng) => nba.simNbaSeason(c, tq, rng), prog: (c, rng) => nba.nbaProgress(c, rng), roll: (t, rng) => nba.nbaRollTeamQuality(t, rng), rings: c => c.rings },
    { key: 'nhl', lib: nhl, start: (rng) => nhl.startNhlCareer('Reveal Test', 'C', nhl.NHL_ARCHETYPES.C[0], rng, null, undefined), assign: (c, tq, rng) => nhl.nhlAssignRole(c, tq, rng), camp: (c, tq, rng) => nhl.nhlCampBattle(c, tq, rng), sim: (c, tq, rng) => nhl.simNhlSeason(c, tq, rng), prog: (c, rng) => nhl.nhlProgress(c, rng), roll: (t, rng) => nhl.nhlRollTeamQuality(t, rng), rings: c => c.cups },
    { key: 'mlb', lib: mlb, start: (rng) => mlb.startMlbCareer('Reveal Test', 'CF', mlb.MLB_ARCHETYPES.CF[0], rng, null, undefined), assign: (c, tq, rng) => mlb.mlbAssignRole(c, tq, rng), camp: (c, tq, rng) => mlb.mlbCampBattle(c, tq, rng), sim: (c, tq, rng) => mlb.simMlbSeason(c, tq, rng), prog: (c, rng) => mlb.mlbProgress(c, rng), roll: (t, rng) => mlb.mlbRollTeamQuality(t, rng), rings: c => c.rings },
  ];
  for (const S of SPORTS) {
    const rng = seeded(186);
    let seasons = 0, confettis = 0, careers = 0;
    while (seasons < 120) {
      careers += 1;
      const c = S.start(rng);
      let tq = S.roll(null, rng);
      S.assign(c, tq, rng);
      for (let y = 0; y < 25 && seasons < 120; y++) {
        if (c.retired) break;
        c.contractYears = Math.max(c.contractYears, 2); // FA is Round 179's job, not this file's
        const before = S.rings(c);
        const campNote = S.camp(c, tq, rng);
        const { line, notes } = S.sim(c, tq, rng);
        const progressNotes = S.prog(c, rng);
        const r = buildSeasonReveal({
          year: line.year, subHeader: `Testville · age ${line.age}`,
          teamResult: line.teamResult, statLine: 'x', campNote, notes, progressNotes,
        });
        seasons += 1;
        const rang = S.rings(c) > before;
        if (r.confetti !== rang) { fail(`${S.key}: season ${seasons} confetti=${r.confetti} but ring added=${rang} ('${line.teamResult}')`); break; }
        if (r.confetti) confettis += 1;
        if (!r.header || !r.result) { fail(`${S.key}: an empty reveal field`); break; }
        tq = S.roll(tq, rng);
      }
      if (careers > 60) break; // a wall of instant retirements would spin forever; the pin below catches it
    }
    if (seasons < 120) fail(`${S.key}: only ${seasons} seasons simmed`);
    console.log(`   ${S.key}: ${seasons} seasons across ${careers} careers, ${confettis} title reveals, confetti tracked the ring count exactly`);
  }
}

if (failures > 0) { console.error(`\nsimSeasonReveal: ${failures} FAILURES`); process.exit(1); }
console.log('\nsimSeasonReveal: green. The curtain celebrates only what the engine wrote, and only when it earned it.');
