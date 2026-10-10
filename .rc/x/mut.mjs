/* Reviewer's mutations for Round 1227 (run on a GitHub runner only, on a throwaway checkout).
   node .rc/x/mut.mjs <id>   applies ONE plausible mutation to a source file, refuses (exit 2) when its anchor is
   not there exactly once. The request line restores the tree with git checkout afterwards. */
import { readFileSync, writeFileSync } from 'node:fs';

const NL = '\n';
const M = {
  /* M1: the one place rule's fact never reaches the hook (the call site passes false). The rule of the critic's
     correction 2 is then off in the real game, while the hook itself is untouched. */
  m1: { file: 'src/lib/nflMyCareer.ts',
    find: 'firstTeam: line.awards.includes(NFL_ROSTER_AWARD) }',
    put: 'firstTeam: false }' },
  /* M2: an off by one on the season whose length the rival plays (2021 reads 2020's 16 games, 2005 reads 2004). */
  m2: { file: 'src/lib/nflMyCareer.ts',
    find: '    const len = nflSeasonLength(year);',
    put: '    const len = nflSeasonLength(year - 1);' },
  /* M3: the shared "only him" card pays the wrong way (the chip says Morale -5, the tap adds 5). All four sports
     that bind rosterBeat would carry it. */
  m3: { file: 'src/lib/careerRivalryEvents.ts',
    find: ['        consequence: "Morale -5",', '        move: s => { s.morale = meter(s.morale - 5); },', '        line: (_s, r) => spec.onlyHim.line(r),'].join(NL),
    put: ['        consequence: "Morale -5",', '        move: s => { s.morale = meter(s.morale + 5); },', '        line: (_s, r) => spec.onlyHim.line(r),'].join(NL) },
  /* M4: rosterFacts no longer asks that the rival's last season is the save's last season (a dropped filter). */
  m4: { file: 'src/lib/careerRivalryEvents.ts',
    find: '  if (!last || r.lastYear !== last.year) return null;',
    put: '  if (!last) return null;' },
  /* M5: the rival's All-Pro is judged on his raw line, not on the full schedule pace the player's is judged on
     (a 16 game season is a seventeenth short of the field). */
  m5: { file: 'src/lib/nflMyCareer.ts',
    find: "    const won = wonAward(keyed, 'nfl', 'allPro', pos, nflSeasonScore(pos, nflAwardPaceLine(season, len)));",
    put: "    const won = wonAward(keyed, 'nfl', 'allPro', pos, nflSeasonScore(pos, season));" },
  /* M6: the floor at zero taken off a back's rushing yards (the builder's own found defect put back). */
  m6: { file: 'src/lib/nflMyCareer.ts',
    find: '    line.rushYds = Math.max(0, Math.min(2080, Math.round((260 + (form - 62) * 46 + rng() * 260) * g)));',
    put: '    line.rushYds = Math.min(2080, Math.round((260 + (form - 62) * 46 + rng() * 260) * g));' },
  /* M7: the head to head reads the player's side at a full schedule pace (the award's line), the rival's raw.
     Nothing moves in a 17 game season; in a 16 game season the player gains a seventeenth. */
  m7: { file: 'src/lib/nflMyCareer.ts',
    find: "judgeRivalSeason(c.rival, nflHeadToHeadScore(c.pos, line), c.name, 'nfl', rng,",
    put: "judgeRivalSeason(c.rival, nflHeadToHeadScore(c.pos, nflAwardPaceLine(line, seasonLen)), c.name, 'nfl', rng," },
};

const id = process.argv[2];
const m = M[id];
if (!m) { console.error(`unknown mutation ${id}`); process.exit(2); }
const src = readFileSync(m.file, 'utf8').replace(/\r\n/g, NL);
const hits = src.split(m.find).length - 1;
if (hits !== 1) { console.error(`mutation ${id}: anchor found ${hits} times in ${m.file}, expected 1. Refusing.`); process.exit(2); }
const out = src.replace(m.find, () => m.put);
if (out === src) { console.error(`mutation ${id}: the swap changed nothing. Refusing.`); process.exit(2); }
writeFileSync(m.file, out);
console.log(`mutation ${id} applied to ${m.file}`);
