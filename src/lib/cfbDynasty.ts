/**
 * CFB Dynasty engine (2026-08-05). The college pillar of the sim suite.
 *
 * Real schools (a curated 40-program subset of the post-2024 realignment:
 * SEC and Big Ten at full flagship strength, ACC and Big 12 cores, and a
 * Group of Five bucket) with editorial prestige ratings. Every PLAYER is
 * fictional by design: rosters, recruits and transfers are generated names
 * with class years, so no real athlete's likeness is used anywhere.
 *
 * Season model: 12 rounds of one game each (4 cross-conference, then 8
 * conference games), conference championship games, then the real 12-team
 * College Football Playoff: the five conference champions auto-qualify,
 * seven at-larges fill the field, straight seeding by ranking (the 2025
 * format), byes for the top four, single elimination to the title.
 *
 * Offseason: classes advance (FR to SR), seniors graduate, elite juniors
 * declare early, a 2-to-5-star recruiting board with scouting error and an
 * NIL budget that scales with prestige and success, plus a transfer portal.
 */

export type CfbPos = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'DB' | 'K';
export type CfbClass = 'FR' | 'SO' | 'JR' | 'SR';

export interface CfbSchool {
  id: string;
  name: string;
  color: string;
  prestige: number; // 60-97 editorial
  conf: 'SEC' | 'B1G' | 'ACC' | 'B12' | 'G5';
}

/** Curated subset, post-2024 realignment memberships (Texas and Oklahoma in
 *  the SEC; USC, UCLA, Oregon and Washington in the Big Ten; Cal, Stanford
 *  and SMU in the ACC; Utah, Arizona and Colorado in the Big 12). */
export const CFB_SCHOOLS: CfbSchool[] = [
  // SEC (12)
  { id: 'ALA', name: 'Alabama', color: '#9E1B32', prestige: 95, conf: 'SEC' },
  { id: 'UGA', name: 'Georgia', color: '#BA0C2F', prestige: 96, conf: 'SEC' },
  { id: 'TEX', name: 'Texas', color: '#BF5700', prestige: 94, conf: 'SEC' },
  { id: 'OU', name: 'Oklahoma', color: '#841617', prestige: 88, conf: 'SEC' },
  { id: 'LSU', name: 'LSU', color: '#461D7C', prestige: 91, conf: 'SEC' },
  { id: 'TENN', name: 'Tennessee', color: '#FF8200', prestige: 89, conf: 'SEC' },
  { id: 'AUB', name: 'Auburn', color: '#0C2340', prestige: 84, conf: 'SEC' },
  { id: 'FLA', name: 'Florida', color: '#0021A5', prestige: 85, conf: 'SEC' },
  { id: 'A&M', name: 'Texas A&M', color: '#500000', prestige: 86, conf: 'SEC' },
  { id: 'MISS', name: 'Ole Miss', color: '#CE1126', prestige: 87, conf: 'SEC' },
  { id: 'MIZZ', name: 'Missouri', color: '#F1B82D', prestige: 82, conf: 'SEC' },
  { id: 'SCAR', name: 'South Carolina', color: '#73000A', prestige: 81, conf: 'SEC' },
  // Big Ten (12)
  { id: 'OSU', name: 'Ohio State', color: '#BB0000', prestige: 96, conf: 'B1G' },
  { id: 'MICH', name: 'Michigan', color: '#00274C', prestige: 92, conf: 'B1G' },
  { id: 'ORE', name: 'Oregon', color: '#154733', prestige: 93, conf: 'B1G' },
  { id: 'PSU', name: 'Penn State', color: '#041E42', prestige: 91, conf: 'B1G' },
  { id: 'USC', name: 'USC', color: '#990000', prestige: 87, conf: 'B1G' },
  { id: 'WASH', name: 'Washington', color: '#4B2E83', prestige: 84, conf: 'B1G' },
  { id: 'UCLA', name: 'UCLA', color: '#2D68C4', prestige: 78, conf: 'B1G' },
  { id: 'WISC', name: 'Wisconsin', color: '#C5050C', prestige: 81, conf: 'B1G' },
  { id: 'IOWA', name: 'Iowa', color: '#FFCD00', prestige: 82, conf: 'B1G' },
  { id: 'NEB', name: 'Nebraska', color: '#E41C38', prestige: 80, conf: 'B1G' },
  { id: 'IND', name: 'Indiana', color: '#990000', prestige: 79, conf: 'B1G' },
  { id: 'MSU', name: 'Michigan State', color: '#18453B', prestige: 77, conf: 'B1G' },
  // ACC (8)
  { id: 'CLEM', name: 'Clemson', color: '#F56600', prestige: 89, conf: 'ACC' },
  { id: 'FSU', name: 'Florida State', color: '#782F40', prestige: 85, conf: 'ACC' },
  { id: 'MIA', name: 'Miami', color: '#F47321', prestige: 86, conf: 'ACC' },
  { id: 'ND', name: 'Notre Dame', color: '#0C2340', prestige: 92, conf: 'ACC' },
  { id: 'UNC', name: 'North Carolina', color: '#7BAFD4', prestige: 78, conf: 'ACC' },
  { id: 'LOU', name: 'Louisville', color: '#AD0000', prestige: 79, conf: 'ACC' },
  { id: 'SMU', name: 'SMU', color: '#0033A0', prestige: 80, conf: 'ACC' },
  { id: 'VT', name: 'Virginia Tech', color: '#630031', prestige: 76, conf: 'ACC' },
  // Big 12 (8)
  { id: 'UTAH', name: 'Utah', color: '#CC0000', prestige: 82, conf: 'B12' },
  { id: 'KSU', name: 'Kansas State', color: '#512888', prestige: 80, conf: 'B12' },
  { id: 'OKST', name: 'Oklahoma State', color: '#FF7300', prestige: 78, conf: 'B12' },
  { id: 'TCU', name: 'TCU', color: '#4D1979', prestige: 79, conf: 'B12' },
  { id: 'BAY', name: 'Baylor', color: '#154734', prestige: 77, conf: 'B12' },
  { id: 'ASU', name: 'Arizona State', color: '#8C1D40', prestige: 78, conf: 'B12' },
  { id: 'COL', name: 'Colorado', color: '#CFB87C', prestige: 79, conf: 'B12' },
  { id: 'ISU', name: 'Iowa State', color: '#C8102E', prestige: 76, conf: 'B12' },
  // Group of Five (4, compressed bucket)
  { id: 'BSU', name: 'Boise State', color: '#0033A0', prestige: 78, conf: 'G5' },
  { id: 'MEM', name: 'Memphis', color: '#003087', prestige: 72, conf: 'G5' },
  { id: 'TUL', name: 'Tulane', color: '#006747', prestige: 71, conf: 'G5' },
  { id: 'UNLV', name: 'UNLV', color: '#B10202', prestige: 69, conf: 'G5' },
];

export const CFB_SCHOOL_MAP = new Map(CFB_SCHOOLS.map(s => [s.id, s]));
export const CFB_CONFS = ['SEC', 'B1G', 'ACC', 'B12', 'G5'] as const;
export const CFB_ROUNDS = 12;
export const CONF_GAMES_START = 5; // rounds 5-12 are conference play

export interface CfbPlayer {
  id: string;
  name: string;
  pos: CfbPos;
  cls: CfbClass;
  ovr: number;
  pot: number;
  stars: number; // recruiting pedigree 2-5
}

export interface CfbTeam {
  id: string;
  players: CfbPlayer[];
  wins: number;
  losses: number;
  confWins: number;
  confLosses: number;
  champion: boolean; // won its conference this season
}

export interface CfbState {
  season: number;
  teams: Record<string, CfbTeam>;
  round: number; // 1..CFB_ROUNDS
  myTeam: string;
  nil: number; // my NIL budget for the next recruiting cycle
  natties: { season: number; team: string }[];
  myTitles: number;
  seasonsPlayed: number;
  heismanWinners: string[];
}

let cfbId = 0;
function fid(): string { cfbId += 1; return `c${cfbId}`; }

const FIRST = ['Jaylen', 'Cade', 'Marcus', 'Deuce', 'Bryce', 'Trey', 'Xavier', 'Knox', 'Amari', 'Judd', 'Tyce', 'Rocco', 'Dax', 'Malachi', 'Beau', 'Kingston', 'Zeke', 'Landry', 'Colt', 'Rex'];
const LAST = ['Whitfield', 'Broussard', 'Callahan', 'Okafor', 'Ledoux', 'Maddox', 'Prather', 'Stallworth', 'Vann', 'Hollins', 'Beaumont', 'Rucker', 'Tatum', 'Winslow', 'Crowder', 'Delgado', 'Fontaine', 'Granger', 'Huxley', 'McCrae'];
export function cfbGenName(rng: () => number): string {
  return `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;
}

const ROSTER_SHAPE: CfbPos[] = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'DL', 'LB', 'DB', 'DB'];
const CLASSES: CfbClass[] = ['FR', 'SO', 'JR', 'SR'];

function starsFor(prestige: number, rng: () => number): number {
  const roll = rng() * 100 + (prestige - 78);
  return roll > 92 ? 5 : roll > 70 ? 4 : roll > 35 ? 3 : 2;
}

export function initCfb(myTeam: string, rng: () => number = Math.random): CfbState {
  const teams: Record<string, CfbTeam> = {};
  for (const s of CFB_SCHOOLS) {
    const players: CfbPlayer[] = ROSTER_SHAPE.map(pos => {
      const stars = starsFor(s.prestige, rng);
      const cls = CLASSES[Math.floor(rng() * 4)];
      const base = s.prestige - 14 + stars * 1.6 + (cls === 'FR' ? -2 : cls === 'SO' ? 0 : cls === 'JR' ? 2 : 3);
      const ovr = clampi(Math.round(base + rng() * 6 - 3), 55, 95);
      return { id: fid(), name: cfbGenName(rng), pos, cls, ovr, pot: clampi(ovr + (4 - CLASSES.indexOf(cls)) * 2 + Math.floor(rng() * 5), ovr, 99), stars };
    });
    teams[s.id] = { id: s.id, players, wins: 0, losses: 0, confWins: 0, confLosses: 0, champion: false };
  }
  return { season: 2026, teams, round: 1, myTeam, nil: nilBudgetFor(CFB_SCHOOL_MAP.get(myTeam)!.prestige, 0), natties: [], myTitles: 0, seasonsPlayed: 0, heismanWinners: [] };
}

function clampi(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

export function cfbStrength(t: CfbTeam): number {
  const sorted = [...t.players].sort((a, b) => b.ovr - a.ovr);
  const top = sorted.slice(0, 8);
  const depth = sorted.slice(8, 12);
  const avg = (xs: CfbPlayer[], f: number) => (xs.length ? xs.reduce((s, p) => s + p.ovr, 0) / xs.length : f);
  const qb = t.players.filter(p => p.pos === 'QB').sort((a, b) => b.ovr - a.ovr)[0];
  return avg(top, 60) * 0.6 + avg(depth, 60) * 0.2 + (qb ? qb.ovr : 60) * 0.2;
}

export function cfbWinProb(a: CfbTeam, b: CfbTeam): number {
  const gap = cfbStrength(a) - cfbStrength(b);
  return 1 / (1 + Math.pow(10, -gap / 9)); // college blowout variance: steeper than pro
}

export interface CfbGame { home: string; away: string; hs: number; as: number; winner: string; conference: boolean }

function scoreFor(win: boolean, rng: () => number): number {
  return win ? 24 + Math.floor(rng() * 32) : 3 + Math.floor(rng() * 25);
}

/** One round: every school plays one game. Rounds 1-4 cross-conference, 5-12 in-conference. */
export function simCfbRound(st: CfbState, rng: () => number): { games: CfbGame[]; myGame: CfbGame | null } {
  const conference = st.round >= CONF_GAMES_START;
  const games: CfbGame[] = [];
  const pool = [...CFB_SCHOOLS];
  const paired = new Set<string>();
  for (const s of pool) {
    if (paired.has(s.id)) continue;
    const candidates = pool.filter(o =>
      o.id !== s.id && !paired.has(o.id) && (conference ? o.conf === s.conf : o.conf !== s.conf));
    const opp = candidates.length
      ? candidates[Math.floor(rng() * candidates.length)]
      : pool.find(o => o.id !== s.id && !paired.has(o.id));
    if (!opp) continue;
    paired.add(s.id); paired.add(opp.id);
    const home = st.teams[s.id];
    const away = st.teams[opp.id];
    const p = cfbWinProb(home, away);
    const homeWins = rng() < p;
    const isConf = s.conf === opp.conf;
    const g: CfbGame = {
      home: s.id, away: opp.id,
      hs: scoreFor(homeWins, rng), as: scoreFor(!homeWins, rng),
      winner: homeWins ? s.id : opp.id, conference: isConf,
    };
    if (g.hs === g.as) g.hs += 3;
    games.push(g);
    const w = st.teams[g.winner];
    const l = st.teams[g.winner === g.home ? g.away : g.home];
    w.wins += 1; l.losses += 1;
    if (isConf) { w.confWins += 1; l.confLosses += 1; }
  }
  const myGame = games.find(g => g.home === st.myTeam || g.away === st.myTeam) ?? null;
  return { games, myGame };
}

/** Poll ranking: wins first, then strength. */
export function cfbRankings(st: CfbState): CfbTeam[] {
  return Object.values(st.teams).sort((a, b) =>
    b.wins - a.wins || a.losses - b.losses || cfbStrength(b) - cfbStrength(a));
}

export function confStandings(st: CfbState, conf: string): CfbTeam[] {
  return Object.values(st.teams)
    .filter(t => CFB_SCHOOL_MAP.get(t.id)!.conf === conf)
    .sort((a, b) => b.confWins - a.confWins || a.confLosses - b.confLosses || b.wins - a.wins || cfbStrength(b) - cfbStrength(a));
}

export interface CfbPlayoffGame { name: string; home: string; away: string; hs: number; as: number; winner: string }

/** Conference title games, then the real 12-team CFP (5 champs + 7 at-large, straight seeding, byes for 1-4). */
export function runCfbPostseason(st: CfbState, rng: () => number): { ccgs: CfbPlayoffGame[]; bracket: CfbPlayoffGame[]; champion: string; field: string[] } {
  const ccgs: CfbPlayoffGame[] = [];
  const champs: string[] = [];
  for (const conf of CFB_CONFS) {
    const table = confStandings(st, conf);
    const a = table[0], b = table[1];
    const p = cfbWinProb(st.teams[a.id], st.teams[b.id]);
    const aWins = rng() < p;
    let hs = scoreFor(aWins, rng), as2 = scoreFor(!aWins, rng);
    if (hs === as2) hs += 3;
    const winner = aWins ? a.id : b.id;
    ccgs.push({ name: `${conf} Championship`, home: a.id, away: b.id, hs, as: as2, winner });
    st.teams[winner].wins += 1; st.teams[aWins ? b.id : a.id].losses += 1;
    st.teams[winner].champion = true;
    champs.push(winner);
  }
  const ranked = cfbRankings(st).map(t => t.id);
  const champSet = new Set(champs);
  const atLarge = ranked.filter(id => !champSet.has(id)).slice(0, 7);
  const field = ranked.filter(id => champSet.has(id) || atLarge.includes(id)).slice(0, 12);
  const seed = (i: number) => st.teams[field[i]];

  const bracket: CfbPlayoffGame[] = [];
  const play = (name: string, hi: number, lo: string): string => {
    const home = seed(hi);
    const away = st.teams[lo];
    const p = cfbWinProb(home, away);
    const homeWins = rng() < p;
    let hs = scoreFor(homeWins, rng), as2 = scoreFor(!homeWins, rng);
    if (hs === as2) hs += 3;
    const winner = homeWins ? home.id : away.id;
    bracket.push({ name, home: home.id, away: away.id, hs, as: as2, winner });
    return winner;
  };
  // First round: 5v12 6v11 7v10 8v9 (1-4 byes)
  const r1 = [
    play('CFP First Round', 4, field[11]),
    play('CFP First Round', 5, field[10]),
    play('CFP First Round', 6, field[9]),
    play('CFP First Round', 7, field[8]),
  ];
  // Quarterfinals: 1 vs winner(8v9), 2 vs winner(7v10), 3 vs winner(6v11), 4 vs winner(5v12)
  const qf = [
    play('CFP Quarterfinal', 0, r1[3]),
    play('CFP Quarterfinal', 1, r1[2]),
    play('CFP Quarterfinal', 2, r1[1]),
    play('CFP Quarterfinal', 3, r1[0]),
  ];
  const sf1 = playPair('CFP Semifinal', qf[0], qf[3], st, rng, bracket);
  const sf2 = playPair('CFP Semifinal', qf[1], qf[2], st, rng, bracket);
  const champion = playPair('National Championship', sf1, sf2, st, rng, bracket);
  return { ccgs, bracket, champion, field };
}

function playPair(name: string, aId: string, bId: string, st: CfbState, rng: () => number, out: CfbPlayoffGame[]): string {
  const a = st.teams[aId], b = st.teams[bId];
  const p = cfbWinProb(a, b);
  const aWins = rng() < p;
  let hs = scoreFor(aWins, rng), as2 = scoreFor(!aWins, rng);
  if (hs === as2) hs += 3;
  const winner = aWins ? aId : bId;
  out.push({ name, home: aId, away: bId, hs, as: as2, winner });
  return winner;
}

export interface HeismanFinalist { name: string; team: string; pos: CfbPos; score: number }

/** Heisman: offensive skill players on winning teams, best score wins. */
export function heismanRace(st: CfbState, rng: () => number): HeismanFinalist[] {
  const finalists: HeismanFinalist[] = [];
  const past = new Set(st.heismanWinners ?? []);
  for (const t of Object.values(st.teams)) {
    for (const p of t.players) {
      if (p.pos !== 'QB' && p.pos !== 'RB' && p.pos !== 'WR') continue;
      if (past.has(p.name)) continue; // one Heisman per fictional legend
      const score = p.ovr * 1.2 + t.wins * 2.4 + (p.pos === 'QB' ? 6 : 0) + rng() * 10;
      finalists.push({ name: p.name, team: t.id, pos: p.pos, score: Math.round(score * 10) / 10 });
    }
  }
  return finalists.sort((a, b) => b.score - a.score).slice(0, 4);
}

// ---- Recruiting + portal ----

export interface CfbRecruit { id: string; name: string; pos: CfbPos; stars: number; grade: number; trueOvr: number; nilAsk: number }

export function nilBudgetFor(prestige: number, winsLastSeason: number): number {
  return Math.round(40 + (prestige - 70) * 2.2 + winsLastSeason * 3);
}

export function cfbRecruitClass(rng: () => number, size = 18): CfbRecruit[] {
  const POS: CfbPos[] = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'DL', 'LB', 'DB', 'DB'];
  const out: CfbRecruit[] = [];
  for (let i = 0; i < size; i++) {
    const starRoll = rng() * 100;
    const stars = starRoll > 93 ? 5 : starRoll > 72 ? 4 : starRoll > 34 ? 3 : 2;
    const trueOvr = 54 + stars * 5 + Math.floor(rng() * 9);
    out.push({
      id: fid(), name: cfbGenName(rng), pos: POS[Math.floor(rng() * POS.length)],
      stars,
      grade: clampi(trueOvr + Math.floor(rng() * 9) - 4, 50, 92),
      trueOvr,
      nilAsk: stars * 9 + Math.floor(rng() * 8),
    });
  }
  return out.sort((a, b) => b.stars - a.stars || b.grade - a.grade);
}

export function cfbPortalPool(rng: () => number, size = 8): CfbRecruit[] {
  const POS: CfbPos[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'];
  const out: CfbRecruit[] = [];
  for (let i = 0; i < size; i++) {
    const trueOvr = 70 + Math.floor(rng() * 16);
    out.push({
      id: fid(), name: cfbGenName(rng), pos: POS[i % POS.length],
      stars: trueOvr >= 82 ? 4 : 3,
      grade: trueOvr, // portal players have real tape: no scouting error
      trueOvr,
      nilAsk: Math.round((trueOvr - 62) * 1.4),
    });
  }
  return out.sort((a, b) => b.grade - a.grade);
}

export function signRecruit(st: CfbState, r: CfbRecruit, cls: CfbClass, rng: () => number): boolean {
  if (st.nil < r.nilAsk) return false;
  st.nil -= r.nilAsk;
  st.teams[st.myTeam].players.push({
    id: fid(), name: r.name, pos: r.pos, cls,
    ovr: r.trueOvr, pot: clampi(r.trueOvr + 5 + Math.floor(rng() * 8), r.trueOvr, 99),
    stars: r.stars,
  });
  return true;
}

/** Offseason: classes advance, seniors graduate, elite juniors declare, everyone develops, AI reloads. */
export function cfbOffseason(st: CfbState, rng: () => number): string[] {
  const notes: string[] = [];
  for (const t of Object.values(st.teams)) {
    const prestige = CFB_SCHOOL_MAP.get(t.id)!.prestige;
    const keep: CfbPlayer[] = [];
    for (const p of t.players) {
      if (p.cls === 'SR') {
        if (t.id === st.myTeam) notes.push(`🎓 ${p.name} (${p.pos}) graduates.`);
        continue;
      }
      if (p.cls === 'JR' && p.ovr >= 88 && rng() < 0.6) {
        if (t.id === st.myTeam) notes.push(`🏈 ${p.name} (${p.pos}, ${p.ovr}) declares for the draft.`);
        continue;
      }
      const grow = p.cls === 'FR' ? 3 + Math.floor(rng() * 4) : p.cls === 'SO' ? 2 + Math.floor(rng() * 3) : 1 + Math.floor(rng() * 3);
      p.ovr = clampi(Math.min(p.pot, p.ovr + grow), 55, 99);
      p.cls = p.cls === 'FR' ? 'SO' : p.cls === 'SO' ? 'JR' : 'SR';
      keep.push(p);
    }
    t.players = keep;
    /* AI reload: fill back to 12 with freshmen scaled to prestige.
       ROUND 426: TOP UP THE POSITIONS THE ROSTER IS MISSING. This used to read
       ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length], which indexes by how
       many players the team happens to have while filling. The skill positions
       are the FIRST five entries of ROSTER_SHAPE, so any team that kept five or
       more players could only ever draw index 5 and up: linemen and defenders.
       Seniors graduate and elite juniors declare every offseason, so quarterbacks,
       backs and receivers drained away season after season and were never
       replaced. By the fifth season no team on the board had a QB, RB or WR,
       heismanRace found nobody eligible and came back empty, and the [0] index in
       the board threw and bricked the save (part one of this round).
       Subtracting what the roster already has from a copy of ROSTER_SHAPE fills
       the actual holes instead. The rng draws are unchanged in count and order,
       so this only moves which position a freshman plays. */
    const need = [...ROSTER_SHAPE];
    for (const p of t.players) {
      const i = need.indexOf(p.pos);
      if (i !== -1) need.splice(i, 1);
    }
    while (t.players.length < 12) {
      const stars = starsFor(prestige, rng);
      const ovr = clampi(prestige - 16 + stars * 1.6 + Math.floor(rng() * 5), 55, 90);
      t.players.push({
        id: fid(), name: cfbGenName(rng),
        pos: need.shift() ?? ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length],
        cls: 'FR', ovr, pot: clampi(ovr + 6 + Math.floor(rng() * 7), ovr, 99), stars,
      });
    }
    t.wins = 0; t.losses = 0; t.confWins = 0; t.confLosses = 0; t.champion = false;
  }
  st.season += 1;
  st.round = 1;
  return notes;
}
