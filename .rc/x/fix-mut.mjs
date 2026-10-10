/* Fixer's mutation tool (never committed). Each mutation takes one rule of the fix pass back out, or breaks one rule a
   reviewer found unfenced. On a runner: `node .rc/x/fix-mut.mjs <name>` edits the checked out file (its string must
   be there exactly once, or it refuses with exit 3), the unit files are run, and the line restores the tree with
   git checkout. On the owner's PC nothing on disk is edited: .tmp-fx/fix-unit.mjs applies the same table in its bundle. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCORE = 'src/lib/gmGameScore.ts';
const DAY = 'src/lib/gmGameDay.ts';
const BRACKET = 'src/lib/gmBracket.ts';
const NFL_DATA = 'src/data/gmBrackets/nfl.ts';

export const MUTATIONS = {
  /* finding 1 */
  noceiling: { file: SCORE, from: 'n >= 0 && n <= GM_SCORE_CEILING;', to: 'n >= 0;' },
  nolawmax: { file: DAY, from: "if (typeof law.maxScore !== 'number' || !(g.homeScore <= law.maxScore) || !(g.awayScore <= law.maxScore)) return null;", to: '' },
  bracketscore: { file: BRACKET, from: 'isRecord(g) && isGmScore(g.homeScore) && isGmScore(g.awayScore) && club(g.winner)', to: 'isRecord(g) && isCount(g.homeScore) && isCount(g.awayScore) && club(g.winner)' },
  /* findings 2, 9 */
  noseedsok: { file: BRACKET, from: "if (problems.length === 0 && seedsOk([...value.seeds]) !== true) problems.push('the league does not accept the seeds of the block');", to: '' },
  nofreshcheck: { file: BRACKET, from: 'if (wrong.length > 0) throw new Error(', to: 'if (wrong.length < 0) throw new Error(' },
  /* finding 7 */
  outofturn: { file: BRACKET, from: 'if (!format.order && format.ties.some(t => t.week < tie.week && !done[t.id])) return save;', to: '' },
  /* finding 6 (the run reviewer's cchost: the worse seed hosts the conference championship) */
  cchost: { file: NFL_DATA, from: 'home: { rankedWinnerOf: div, rank: 0 }, away: { rankedWinnerOf: div, rank: 1 }', to: 'home: { rankedWinnerOf: div, rank: 1 }, away: { rankedWinnerOf: div, rank: 0 }' },
  /* findings 4, 8 */
  quickdropsbeyond: { file: SCORE, from: 'awayScore: s.away, ...(f.decided.beyond === true ? { beyond: true } : {}) }', to: 'awayScore: s.away }' },
  savedropsbeyond: { file: SCORE, from: 'winner, ...(told.beyond === true ? { beyond: true } : {}) };', to: 'winner };' },
  readdropsbeyond: { file: SCORE, from: 'winner: o.winner, ...(o.beyond === true ? { beyond: true } : {}) };', to: 'winner: o.winner };' },
  storyignoresbeyond: { file: DAY, from: 'const past = g.beyond === true;', to: 'const past = false;' },
  nobeyondlaw: { file: DAY, from: "if (past && typeof law.storyBeyond !== 'function') return null;", to: 'if (past && !law.storyBeyond) return storyOf(law, { ...g, beyond: false }, viewAs, md);' },
  /* finding 10 */
  scorethrows: { file: SCORE, from: "  } catch {\n    /* a law that throws has refused: a press handler keeps the engine's score, it does not crash */\n    return null;", to: '  } catch (e) {\n    throw e;' },
  storythrows: { file: DAY, from: 'return storyOf(law, g, viewAs, md);\n  } catch {', to: 'return storyOf(law, g, viewAs, md);\n  } catch (e) {\n    throw e;' },
  /* finding 15 and the last period */
  goahead: { file: DAY, from: 'deciding: decided.plays, goAhead: decided.goAhead, shape', to: 'deciding: decided.plays, goAhead: decided.plays[0], shape' },
  regulation: { file: DAY, from: 'const last = (past ? count : law.periods.regulation ?? count) - 1;', to: 'const last = count - 1;' },
};

const norm = s => s.replace(/\r\n/g, '\n');
/** The file's text with the mutation in, or null when its string is not there exactly once. */
export function mutate(name, src) {
  const m = MUTATIONS[name];
  const text = norm(src);
  return text.split(m.from).length === 2 ? text.replace(m.from, () => m.to) : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const name = process.argv[2];
  if (name === '--list') { console.log(Object.keys(MUTATIONS).join(' ')); process.exit(0); }
  const m = MUTATIONS[name];
  if (!m) { console.error(`fix-mut: no mutation ${name}`); process.exit(3); }
  const out = mutate(name, fs.readFileSync(m.file, 'utf8'));
  if (out === null) { console.error(`fix-mut ${name}: its string is not exactly once in ${m.file}, refusing`); process.exit(3); }
  fs.writeFileSync(m.file, out);
  console.log(`fix-mut ${name}: applied to ${m.file}`);
}
