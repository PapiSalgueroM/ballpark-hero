/* Round 1547: what NFL Conquest's roster "key stat" may say, and nothing else.

   Before this round every roster row printed a number with no season beside
   it (T.J. Watt "19 sacks" was his 2023, Patrick Mahomes "4,502 pass yds"
   matched no season the two publishers print), next to team ratings built
   from 2025. Now a key stat is a 2025 regular season line read off
   scripts/data/nfl2025Production.json, the file where nflverse and ESPN print
   each man's 2025 line side by side, through scripts/lib/nflProduction.mjs's
   usable(): a number the two publishers disagree about, or that only one of
   them prints, feeds nothing and prints nothing. That covers every defender
   and lineman (ESPN's league tables there are passing, rushing and receiving
   only), so their rows print no stat at all rather than an unsourced one.

   The season is written into the string ("2025: 851 rec yds"), so the stat
   can never again reach a screen without it.

   Pure: the generator (scripts/genConquestKeyStats.mjs) and the harness
   (scripts/simConquestPeople.mjs) both call expectedNflKeyStats, so neither
   holds its own idea of a key stat. Nothing here reads a file. */
import { usable } from './nflProduction.mjs';

export const CONQUEST_STAT_SEASON = 2025;

/** The one field a Conquest position prints, and its unit. Every other position prints nothing. */
export const STAT_FOR_POSITION = {
  QB: { field: 'passYds', unit: 'pass yds', shelf: 'QB' },
  RB: { field: 'rushYds', unit: 'rush yds', shelf: 'RB' },
  FB: { field: 'rushYds', unit: 'rush yds', shelf: 'RB' },
  WR: { field: 'recYds', unit: 'rec yds', shelf: 'WR' },
  TE: { field: 'recYds', unit: 'rec yds', shelf: 'TE' },
};
const OFFENSE = new Set(['QB', 'RB', 'WR', 'TE']);
/** Conquest's team ids against the production file's (the file says LA for the Rams). */
const TEAM_ALIAS = { LAR: 'LA' };
/** One man, two spellings: Conquest writes the given name, the league's roster record the one he plays under. */
const NAME_ALIAS = { 'chigoziem okonkwo': 'chig okonkwo' };

const PUNCT = new RegExp(`[.'${String.fromCharCode(0x2019)}-]`, 'g');
export function normName(name) {
  return String(name)
    .normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(PUNCT, '')
    .split(/\s+/)
    .filter(t => t && !['jr', 'sr', 'ii', 'iii', 'iv', 'v'].includes(t))
    .join(' ');
}

export function formatKeyStat(value, unit, season = CONQUEST_STAT_SEASON) {
  return `${season}: ${Number(value).toLocaleString('en-US')} ${unit}`;
}

/** Every player row of NFL_TEAMS in conquestData.ts source text: team, name, position, keyStat, and the line it sits on. */
export function parseNflPlayers(src) {
  const lines = src.split(/\r?\n/);
  const start = lines.findIndex(l => /^export const NFL_TEAMS\b/.test(l));
  if (start < 0) throw new Error('conquestData.ts has no NFL_TEAMS table');
  const out = [];
  let team = null;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\];/.test(l)) break;
    const t = l.match(/^\s*\{ id: '([A-Z]+)'/);
    if (t) { team = t[1]; continue; }
    const p = l.match(/^(\s*\{ name: )(['"])(.+?)\2(, position: ')([A-Z]+)(', overall: )(\d+)(, keyStat: )(['"])(.*?)\9( \},?\s*)$/);
    if (p) out.push({ line: i, team, name: p[3], position: p[5], overall: Number(p[7]), keyStat: p[10], parts: p });
  }
  return out;
}

/** The key stat each NFL Conquest player may print, with the reason. */
export function expectedNflKeyStats(src, production) {
  if (production.season !== CONQUEST_STAT_SEASON) throw new Error(`nfl2025Production.json is season ${production.season}, expected ${CONQUEST_STAT_SEASON}`);
  const byName = new Map();
  for (const row of production.rows) {
    const [team, name, shelf] = row.key.split('|');
    if (!OFFENSE.has(shelf)) continue;
    const k = normName(name);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push({ team, name, shelf, row });
  }
  return parseNflPlayers(src).map(p => {
    const want = STAT_FOR_POSITION[p.position];
    if (!want) return { ...p, expected: '', how: 'no stat for this position' };
    const k = normName(p.name);
    let cands = byName.get(NAME_ALIAS[k] || k) || [];
    if (cands.length === 0) return { ...p, expected: '', how: 'no 2025 row' };
    const sameShelf = cands.filter(c => c.shelf === want.shelf);
    if (sameShelf.length) cands = sameShelf;
    if (cands.length > 1) {
      const team = TEAM_ALIAS[p.team] || p.team;
      const sameTeam = cands.filter(c => c.team === team);
      if (sameTeam.length !== 1) return { ...p, expected: '', how: `held: ${cands.length} namesakes` };
      cands = sameTeam;
    }
    const c = cands[0];
    const u = usable(c.row);
    if (!u) return { ...p, expected: '', how: `held: row is ${c.row.status}`, match: c };
    const v = u[want.field];
    if (!Number.isFinite(v)) return { ...p, expected: '', how: `held: ${want.field} not agreed`, match: c };
    if (v <= 0) return { ...p, expected: '', how: `no ${want.unit} in 2025`, match: c };
    return { ...p, expected: formatKeyStat(v, want.unit), how: `${c.row.status} ${c.team}|${c.name}|${c.shelf}`, match: c };
  });
}
