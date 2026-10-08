/* Release AO review: one small mutation of the tree, applied on the runner (never on the owner's PC).
   node .rc/x/rvMut.mjs <id>   applies it, refusing to run when the text it changes is not there exactly `count` times.
   The request line restores with git checkout afterwards. */
import fs from 'node:fs';

const NL = '\n';
const M = {
  /* merge h taken the other way: the stamp after the write */
  m1: [{
    file: 'src/components/us-career/UsCareerBoard.tsx',
    from: '    if (sport.hall) stampOnRetirement(c, sport.saveKey);',
    to: '    /* rv m1: moved below the write */',
  }, {
    file: 'src/components/us-career/UsCareerBoard.tsx',
    from: '    saveValue(JSON.stringify({ c, phase: ph, teamQuality: tq, coach: coachRef.current } satisfies SaveShape));',
    to: '    saveValue(JSON.stringify({ c, phase: ph, teamQuality: tq, coach: coachRef.current } satisfies SaveShape));' + NL + '    if (sport.hall) stampOnRetirement(c, sport.saveKey);',
  }],
  /* merge d taken Round 1046's way on a phone: Round 1048's record panel dropped */
  m2: [{
    file: 'src/components/season-centre/SeasonCentre.tsx',
    from: "                {!wide && s.mode === 'record' && <RecordPanel model={model} played={played} compact reduced={reduced} tie={copy.tie} groups={model.groups} short={model.sport.clock.short} />}",
    to: '                {/* rv m2: the phone record panel dropped */}',
  }],
  /* merge d taken Round 1046's way in his line: Round 1048's chip dropped */
  m3: [{
    file: 'src/components/season-centre/SeasonCentre.tsx',
    from: '{sport.markChip ? sport.markChip(g) : sport.markOf(g).toFixed(1)}',
    to: '{sport.markOf(g).toFixed(1)}',
  }],
  /* merge d taken Round 1046's way for the round word: a record season says "League game" */
  m4: [{
    file: 'src/components/season-centre/SeasonCentre.tsx',
    from: "const roundWord = s.mode === 'results' ? 'League game' : model.words.round;",
    to: "const roundWord = s.mode === 'table' ? model.words.round : 'League game';",
  }],
  /* a stale size: the Russian top flight at 18 */
  m5: [{
    file: 'src/lib/soccerCareerLeague.ts',
    from: '"Russian Premier League": [{ from: 2026, size: 16 }],',
    to: '"Russian Premier League": [{ from: 2026, size: 18 }],',
  }],
  /* the sixteen Russian clubs join the dailies inside the next 13 dates */
  m6: [{
    file: 'src/data/dailyClubPool.json',
    from: '"from":"2026-11-07"',
    to: '"from":"2026-10-12"',
    count: 16,
  }],
  /* decision 1i's remedy taken out: the zero debounce box goes through the timer again, no flushSync */
  m7: [{
    file: 'src/components/game/PlayerAutocomplete.tsx',
    from: 'if (debounceMs <= 0) flushSync(commit); else commit();',
    to: 'commit();',
  }, {
    file: 'src/components/game/PlayerAutocomplete.tsx',
    from: 'if (debounceMs <= 0) runSearch(); else debounceRef.current = window.setTimeout(runSearch, debounceMs);',
    to: 'debounceRef.current = window.setTimeout(runSearch, debounceMs);',
  }, {
    file: 'src/components/game/PlayerAutocomplete.tsx',
    from: "import { flushSync } from 'react-dom';",
    to: '',
  }],
  /* sound on for a visitor who never chose */
  m8: [{
    file: 'src/lib/sound.ts',
    from: "  return visit === 'on';",
    to: "  return visit !== 'off';",
  }],
  /* a stale rule: three go down in Russia */
  m9: [{
    file: 'src/lib/clubManager.ts',
    from: "nationId: 'russia', flag: 'Russia', cup: 'Russian Cup', europe: null, drop: 2,",
    to: "nationId: 'russia', flag: 'Russia', cup: 'Russian Cup', europe: null, drop: 3,",
  }],
};

const id = process.argv[2];
if (!M[id]) { console.error(`rvMut: no mutation ${id}`); process.exit(2); }
for (const { file, from, to, count = 1 } of M[id]) {
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== count) { console.error(`rvMut ${id}: expected ${count} of the text in ${file}, found ${n}. NOT APPLIED.`); process.exit(2); }
  if (process.argv[3] !== "--dry") fs.writeFileSync(file, src.split(from).join(to));
}
console.log(`rvMut ${id}: applied to ${[...new Set(M[id].map(x => x.file))].join(', ')}`);
