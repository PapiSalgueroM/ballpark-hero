// Reviewer (runner lens) mutation tool, Round 1104. Runs on the GitHub runner's checkout only.
// node .rc/x/rv-mut.mjs <name>   applies one mutation, refusing unless its needle is in the file exactly once.
import fs from 'node:fs';

const M = {
  // off by one in the awards games gate (the brief: the season's length minus two)
  gate: [['src/lib/nflMyCareer.ts', 'const awardGames = seasonLen - 2;', 'const awardGames = seasonLen - 1;']],
  // a stale 17 in the injury branch of seasonGames
  injurylen: [['src/lib/nflMyCareer.ts', 'return { games: Math.max(4, len - missed), injuryNote', 'return { games: Math.max(4, NFL_RATE_GAMES - missed), injuryNote']],
  // the two readers in nflCareerLoop.ts go back to a hard 17
  loop17: [
    ['src/lib/nflCareerLoop.ts', 'fullSeasons: c.seasons.filter(s => s.games >= nflSeasonLength(s.year)).length', 'fullSeasons: c.seasons.filter(s => s.games >= 17 + 0 * nflSeasonLength(s.year)).length'],
    ['src/lib/nflCareerLoop.ts', 'Math.max(0, nflSeasonLength(line.year) - line.games)', 'Math.max(0, 17 - line.games)'],
  ],
  // on load a played save is zeroed without collecting from savings (savings a shield on reload)
  loadshield: [['src/lib/usCareerBank.ts', '    settleBank(next, money);\n    return next;', '    next.netWorth = 0;\n    return next;']],
  // the rival choice is no longer settled (a dropped wrapper)
  rivalraw: [['src/lib/usCareerBank.ts', '      if (!res) return res;\n      const cover = settleBank(res.state, money);', '      if (!res) return res;\n      const cover: string[] = [];']],
  // the inbox answer is no longer settled
  inboxraw: [['src/lib/usCareerBank.ts', '      const cover = settleBank(c, money);\n      return line === null', '      const cover: string[] = [];\n      return line === null']],
  // the season progress is no longer settled
  progressraw: [['src/lib/usCareerBank.ts', '      for (const line of settleBank(c, money)) notes.push(line);', '      void money;']],
  // the kicker field goal counts drop out of the award pace line
  pacek: [['src/lib/nflMyCareer.ts', "'forcedFum', 'passDef', 'fgAtt', 'fgMade'] as const", "'forcedFum', 'passDef'] as const"]],
  // sacks drop out of the award pace line
  pacesack: [['src/lib/nflMyCareer.ts', "'tackles', 'sacks', 'picks',", "'tackles', 'picks',"]],
  // the road to the draft loses the kicker offset, the quick start keeps it
  kickerroad: [['src/lib/nflCareerPreDraft.ts', '    pickOffset: nflPickOffset,\n', '']],
  // the quick start loses the kicker offset, the road keeps it
  kickerquick: [['src/lib/nflMyCareer.ts', 'rng() * 40)) + nflPickOffset(pos);', 'rng() * 40)) + 0 * nflPickOffset(pos);']],
  // the summerSalt mark is no longer read on load
  nosalt: [['src/lib/usCareerBank.ts', "(typeof c.summerSalt === 'string' && c.summerSalt.length > 0)", 'false']],
  // a later round pick is paid by place over 32, not 31 (off by one)
  place32: [['src/lib/usCareerRookieDeal.ts', '/ (NFL_PICKS_A_ROUND - 1);', '/ NFL_PICKS_A_ROUND;']],
  // the NFL trade request can land on his own club again
  selftrade: [['src/lib/nflMyCareer.ts', 'const pool = nflEraById(cc.eraId).teams.filter(t => t.abbr !== cc.team); const nt', 'const pool = nflEraById(cc.eraId).teams; const nt']],
  // an engine change for the digest gate's own control (TE yards cap lowered)
  digestctl: [['src/lib/nflMyCareer.ts', 'const NFL_TE_YDS_CAP = 1400;', 'const NFL_TE_YDS_CAP = 900;']],
};

const name = process.argv[2];
if (name === '--dry') {
  // counts only, writes nothing: every needle must be there exactly once
  let bad = 0;
  for (const [k, l] of Object.entries(M)) for (const [file, needle] of l) {
    const n = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split(needle).length - 1;
    if (n !== 1) bad += 1;
    console.log(`${n === 1 ? 'ok ' : 'BAD'} ${k} ${file} x${n}`);
  }
  process.exit(bad ? 3 : 0);
}
const list = M[name];
if (!list) { console.error(`rv-mut: no mutation named ${name}`); process.exit(2); }
for (const [file, needle, next] of list) {
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  const text = raw.replace(/\r\n/g, '\n');
  const n = text.split(needle).length - 1;
  if (n !== 1) { console.error(`rv-mut ${name}: needle found ${n} times in ${file}, refusing:\n  ${needle}`); process.exit(3); }
  const out = text.replace(needle, () => next);
  fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out);
  console.log(`rv-mut ${name}: mutated ${file}`);
}
