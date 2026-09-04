/**
 * CBB Dynasty engine (2026-08-05). College basketball sibling of
 * cfbDynasty.ts. Real programs, fully fictional generated players (class
 * years FR-SR), so no real athlete's likeness appears anywhere.
 *
 * 40 real programs across six groups: ACC, SEC, Big Ten, Big 12, Big East
 * and a Mid-Major bucket built for Cinderella runs. Prestige is editorial.
 *
 * Season: 10 rounds of two games (20-game-shaped), single-elimination
 * conference tournaments (top four per group), then a 32-team national
 * tournament: six tournament champions auto-bid, 26 at-larges, straight
 * seeding, five rounds from the Round of 32 to the title. The engine
 * tracks the lowest seed to crash the Final Four for Cinderella headlines.
 *
 * College hoops flavor: elite freshmen are ONE-AND-DONE (88+ overall
 * declares after year one), the portal never sleeps, and a National Player
 * of the Year is crowned once per fictional career.
 */

export type CbbPos = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type CbbClass = 'FR' | 'SO' | 'JR' | 'SR';

export interface CbbSchool {
  id: string;
  name: string;
  color: string;
  prestige: number;
  conf: 'ACC' | 'SEC' | 'B1G' | 'B12' | 'BE' | 'MM';
}

export const CBB_SCHOOLS: CbbSchool[] = [
  // ACC (6)
  { id: 'DUKE', name: 'Duke', color: '#003087', prestige: 95, conf: 'ACC' },
  { id: 'UNC', name: 'North Carolina', color: '#7BAFD4', prestige: 93, conf: 'ACC' },
  { id: 'UVA', name: 'Virginia', color: '#232D4B', prestige: 84, conf: 'ACC' },
  { id: 'LOU', name: 'Louisville', color: '#AD0000', prestige: 84, conf: 'ACC' },
  { id: 'CUSE', name: 'Syracuse', color: '#F76900', prestige: 80, conf: 'ACC' },
  { id: 'NCST', name: 'NC State', color: '#CC0000', prestige: 79, conf: 'ACC' },
  // SEC (7)
  { id: 'UK', name: 'Kentucky', color: '#0033A0', prestige: 93, conf: 'SEC' },
  { id: 'AUB', name: 'Auburn', color: '#0C2340', prestige: 90, conf: 'SEC' },
  { id: 'FLA', name: 'Florida', color: '#0021A5', prestige: 90, conf: 'SEC' },
  { id: 'BAMA', name: 'Alabama', color: '#9E1B32', prestige: 89, conf: 'SEC' },
  { id: 'TENN', name: 'Tennessee', color: '#FF8200', prestige: 88, conf: 'SEC' },
  { id: 'ARK', name: 'Arkansas', color: '#9D2235', prestige: 84, conf: 'SEC' },
  { id: 'A&M', name: 'Texas A&M', color: '#500000', prestige: 82, conf: 'SEC' },
  // Big Ten (7)
  { id: 'PUR', name: 'Purdue', color: '#CEB888', prestige: 89, conf: 'B1G' },
  { id: 'MSU', name: 'Michigan State', color: '#18453B', prestige: 88, conf: 'B1G' },
  { id: 'UCLA', name: 'UCLA', color: '#2D68C4', prestige: 86, conf: 'B1G' },
  { id: 'ILL', name: 'Illinois', color: '#E84A27', prestige: 85, conf: 'B1G' },
  { id: 'MICH', name: 'Michigan', color: '#00274C', prestige: 84, conf: 'B1G' },
  { id: 'IU', name: 'Indiana', color: '#990000', prestige: 84, conf: 'B1G' },
  { id: 'WISC', name: 'Wisconsin', color: '#C5050C', prestige: 83, conf: 'B1G' },
  // Big 12 (7)
  { id: 'KU', name: 'Kansas', color: '#0051BA', prestige: 94, conf: 'B12' },
  { id: 'HOU', name: 'Houston', color: '#C8102E', prestige: 92, conf: 'B12' },
  { id: 'BAY', name: 'Baylor', color: '#154734', prestige: 87, conf: 'B12' },
  { id: 'ISU', name: 'Iowa State', color: '#C8102E', prestige: 86, conf: 'B12' },
  { id: 'TTU', name: 'Texas Tech', color: '#CC0000', prestige: 85, conf: 'B12' },
  { id: 'ZONA', name: 'Arizona', color: '#AB0520', prestige: 88, conf: 'B12' },
  { id: 'BYU', name: 'BYU', color: '#002E5D', prestige: 82, conf: 'B12' },
  // Big East (7)
  { id: 'UCONN', name: 'UConn', color: '#000E2F', prestige: 94, conf: 'BE' },
  { id: 'NOVA', name: 'Villanova', color: '#00205B', prestige: 85, conf: 'BE' },
  { id: 'CREI', name: 'Creighton', color: '#005CA9', prestige: 85, conf: 'BE' },
  { id: 'MARQ', name: 'Marquette', color: '#003366', prestige: 85, conf: 'BE' },
  { id: 'SJU', name: "St. John's", color: '#BA0C2F', prestige: 84, conf: 'BE' },
  { id: 'XAV', name: 'Xavier', color: '#0C2340', prestige: 81, conf: 'BE' },
  { id: 'BUT', name: 'Butler', color: '#13294B', prestige: 78, conf: 'BE' },
  // Mid-Majors (6): the Cinderella pipeline
  { id: 'ZAGA', name: 'Gonzaga', color: '#041E42', prestige: 90, conf: 'MM' },
  { id: 'SDSU', name: 'San Diego State', color: '#A6192E', prestige: 83, conf: 'MM' },
  { id: 'SMC', name: "Saint Mary's", color: '#06315B', prestige: 82, conf: 'MM' },
  { id: 'MEM', name: 'Memphis', color: '#003087', prestige: 81, conf: 'MM' },
  { id: 'DAY', name: 'Dayton', color: '#CE1141', prestige: 80, conf: 'MM' },
  { id: 'VCU', name: 'VCU', color: '#F8B800', prestige: 79, conf: 'MM' },
];

export const CBB_SCHOOL_MAP = new Map(CBB_SCHOOLS.map(s => [s.id, s]));
export const CBB_CONFS = ['ACC', 'SEC', 'B1G', 'B12', 'BE', 'MM'] as const;
export const CBB_ROUNDS = 10;
export const CBB_GAMES_PER_ROUND = 2;
export const DANCE_SIZE = 32;

export interface CbbPlayer {
  id: string;
  name: string;
  pos: CbbPos;
  cls: CbbClass;
  ovr: number;
  pot: number;
  stars: number;
}

export interface CbbTeam {
  id: string;
  players: CbbPlayer[];
  wins: number;
  losses: number;
  confChamp: boolean; // won the conference tournament
}

export interface CbbState {
  season: number;
  teams: Record<string, CbbTeam>;
  round: number;
  myTeam: string;
  nil: number;
  titles: { season: number; team: string }[];
  myTitles: number;
  seasonsPlayed: number;
  poyWinners: string[];
}

let cbbId = 0;
function fid(): string { cbbId += 1; return `b${cbbId}`; }

const FIRST = ['Jalen', 'Zion', 'Cooper', 'Tre', 'DeAndre', 'Boogie', 'Kellan', 'Marcus', 'Ty', 'Isaiah', 'Jett', 'Duncan', 'Ace', 'Miles', 'Quincy', 'Reed', 'Silas', 'Trey', 'Vance', 'Zeke'];
const LAST = ['Abernathy', 'Bright', 'Calloway', 'Dupree', 'Eastwood', 'Fenwick', 'Grimes', 'Holloway', 'Ivey', 'Jasper', 'Kingsley', 'Lockhart', 'Mabrey', 'Northcutt', 'Overton', 'Pryor', 'Quarles', 'Ridley', 'Sessoms', 'Thurman'];
export function cbbGenName(rng: () => number): string {
  return `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;
}

const ROSTER_SHAPE: CbbPos[] = ['PG', 'SG', 'SF', 'PF', 'C', 'SG', 'SF', 'PF'];
const CLASSES: CbbClass[] = ['FR', 'SO', 'JR', 'SR'];

function clampi(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

function starsFor(prestige: number, rng: () => number): number {
  const roll = rng() * 100 + (prestige - 80);
  return roll > 91 ? 5 : roll > 68 ? 4 : roll > 32 ? 3 : 2;
}

export function initCbb(myTeam: string, rng: () => number = Math.random): CbbState {
  const teams: Record<string, CbbTeam> = {};
  for (const s of CBB_SCHOOLS) {
    const players: CbbPlayer[] = ROSTER_SHAPE.map(pos => {
      const stars = starsFor(s.prestige, rng);
      const cls = CLASSES[Math.floor(rng() * 4)];
      const base = s.prestige - 13 + stars * 1.7 + (cls === 'FR' ? -1 : cls === 'SO' ? 0 : cls === 'JR' ? 1 : 2);
      const ovr = clampi(Math.round(base + rng() * 6 - 3), 55, 96);
      return { id: fid(), name: cbbGenName(rng), pos, cls, ovr, pot: clampi(ovr + (4 - CLASSES.indexOf(cls)) * 2 + Math.floor(rng() * 6), ovr, 99), stars };
    });
    teams[s.id] = { id: s.id, players, wins: 0, losses: 0, confChamp: false };
  }
  return { season: 2026, teams, round: 1, myTeam, nil: cbbNilFor(CBB_SCHOOL_MAP.get(myTeam)!.prestige, 0), titles: [], myTitles: 0, seasonsPlayed: 0, poyWinners: [] };
}

export function cbbStrength(t: CbbTeam): number {
  const sorted = [...t.players].sort((a, b) => b.ovr - a.ovr);
  const five = sorted.slice(0, 5);
  const bench = sorted.slice(5, 8);
  const avg = (xs: CbbPlayer[], f: number) => (xs.length ? xs.reduce((s, p) => s + p.ovr, 0) / xs.length : f);
  return avg(five, 60) * 0.75 + avg(bench, 60) * 0.25;
}

export function cbbWinProb(a: CbbTeam, b: CbbTeam): number {
  const gap = cbbStrength(a) - cbbStrength(b);
  return 1 / (1 + Math.pow(10, -gap / 6.5)); // one bad night can still end a season
}

export interface CbbGame { home: string; away: string; hs: number; as: number; winner: string }

function hoopsScore(win: boolean, rng: () => number): number {
  return win ? 68 + Math.floor(rng() * 26) : 52 + Math.floor(rng() * 24);
}

function playGame(aId: string, bId: string, st: CbbState, rng: () => number, record = true): CbbGame {
  const a = st.teams[aId], b = st.teams[bId];
  const p = cbbWinProb(a, b);
  const aWins = rng() < p;
  let hs = hoopsScore(aWins, rng), as2 = hoopsScore(!aWins, rng);
  if (aWins && hs <= as2) hs = as2 + 1 + Math.floor(rng() * 8);
  if (!aWins && as2 <= hs) as2 = hs + 1 + Math.floor(rng() * 8);
  const g: CbbGame = { home: aId, away: bId, hs, as: as2, winner: aWins ? aId : bId };
  if (record) {
    st.teams[g.winner].wins += 1;
    st.teams[g.winner === aId ? bId : aId].losses += 1;
  }
  return g;
}

/** One round: every program plays two games, one in-conference, one cross. */
export function simCbbRound(st: CbbState, rng: () => number): { games: CbbGame[]; myGames: CbbGame[] } {
  const games: CbbGame[] = [];
  for (const inConf of [true, false]) {
    const paired = new Set<string>();
    for (const s of CBB_SCHOOLS) {
      if (paired.has(s.id)) continue;
      const candidates = CBB_SCHOOLS.filter(o =>
        o.id !== s.id && !paired.has(o.id) && (inConf ? o.conf === s.conf : o.conf !== s.conf));
      const opp = candidates.length
        ? candidates[Math.floor(rng() * candidates.length)]
        : CBB_SCHOOLS.find(o => o.id !== s.id && !paired.has(o.id));
      if (!opp) continue;
      paired.add(s.id); paired.add(opp.id);
      games.push(playGame(s.id, opp.id, st, rng));
    }
  }
  return { games, myGames: games.filter(g => g.home === st.myTeam || g.away === st.myTeam) };
}

/** Committee score: record first, but the eye test (strength) matters. */
function seedScore(t: CbbTeam): number {
  return t.wins * 1.6 + cbbStrength(t) * 0.8;
}

export function cbbRankings(st: CbbState): CbbTeam[] {
  return Object.values(st.teams).sort((a, b) => seedScore(b) - seedScore(a));
}

export function cbbConfStandings(st: CbbState, conf: string): CbbTeam[] {
  return Object.values(st.teams)
    .filter(t => CBB_SCHOOL_MAP.get(t.id)!.conf === conf)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses || cbbStrength(b) - cbbStrength(a));
}

export interface CbbBracketGame { name: string; home: string; away: string; hs: number; as: number; winner: string; homeSeed: number; awaySeed: number }

export interface MarchResult {
  confFinals: CbbGame[];
  autoBids: string[];
  field: string[];             // 32 ids in seed order
  bracket: CbbBracketGame[];   // 31 games
  champion: string;
  cinderella: { team: string; seed: number } | null; // lowest seed in the Final Four (seed 5+)
  myExit: string;              // round name of my exit or 'Champions' or 'Missed the field'
}

/** Conference tournaments (top four, semis + final), then the 32-team Dance. */
export function runMarch(st: CbbState, rng: () => number): MarchResult {
  const confFinals: CbbGame[] = [];
  const autoBids: string[] = [];
  for (const conf of CBB_CONFS) {
    const top4 = cbbConfStandings(st, conf).slice(0, 4);
    const semi1 = playGame(top4[0].id, top4[3].id, st, rng, false);
    const semi2 = playGame(top4[1].id, top4[2].id, st, rng, false);
    const final = playGame(semi1.winner, semi2.winner, st, rng, false);
    confFinals.push(final);
    st.teams[final.winner].confChamp = true;
    autoBids.push(final.winner);
  }
  const ranked = cbbRankings(st).map(t => t.id);
  const bidSet = new Set(autoBids);
  const atLarge = ranked.filter(id => !bidSet.has(id)).slice(0, DANCE_SIZE - autoBids.length);
  const field = ranked.filter(id => bidSet.has(id) || atLarge.includes(id)).slice(0, DANCE_SIZE);
  const seedOf = new Map(field.map((id, i) => [id, i + 1]));

  const bracket: CbbBracketGame[] = [];
  const ROUND_NAMES = ['Round of 32', 'Sweet 16', 'Elite Eight', 'Final Four', 'National Championship'];
  // straight seeding: 1v32, 2v31... reseeded each round is NOT how it works; use fixed bracket pairing 1v32 etc, winners meet 1/32 vs 16/17 style
  let alive = [...field]; // in seed order
  let roundIdx = 0;
  while (alive.length > 1) {
    const next: string[] = [];
    const n = alive.length;
    for (let i = 0; i < n / 2; i++) {
      const aId = alive[i];
      const bId = alive[n - 1 - i];
      const g = playGame(aId, bId, st, rng, false);
      bracket.push({
        name: ROUND_NAMES[Math.min(roundIdx, ROUND_NAMES.length - 1)],
        home: aId, away: bId, hs: g.hs, as: g.as, winner: g.winner,
        homeSeed: seedOf.get(aId)!, awaySeed: seedOf.get(bId)!,
      });
      next.push(g.winner);
    }
    // keep bracket integrity: winners ordered by their original seed
    next.sort((x, y) => seedOf.get(x)! - seedOf.get(y)!);
    alive = next;
    roundIdx += 1;
  }
  const champion = alive[0];

  const finalFour = bracket.filter(g => g.name === 'Final Four').flatMap(g => [
    { team: g.home, seed: g.homeSeed }, { team: g.away, seed: g.awaySeed },
  ]);
  const lowest = finalFour.sort((a, b) => b.seed - a.seed)[0] ?? null;
  const cinderella = lowest && lowest.seed >= 10 ? lowest : null;

  let myExit = 'Missed the field';
  if (field.includes(st.myTeam)) {
    if (champion === st.myTeam) myExit = 'Champions';
    else {
      const lost = bracket.find(g => g.winner !== st.myTeam && (g.home === st.myTeam || g.away === st.myTeam));
      myExit = lost ? `Out in the ${lost.name}` : 'Out early';
    }
  }
  return { confFinals, autoBids, field, bracket, champion, cinderella, myExit };
}

export interface PoyFinalist { name: string; team: string; pos: CbbPos; score: number }

export function poyRace(st: CbbState, rng: () => number): PoyFinalist[] {
  const past = new Set(st.poyWinners ?? []);
  const out: PoyFinalist[] = [];
  for (const t of Object.values(st.teams)) {
    for (const p of t.players) {
      if (past.has(p.name)) continue;
      const score = p.ovr * 1.3 + t.wins * 1.6 + rng() * 8;
      out.push({ name: p.name, team: t.id, pos: p.pos, score: Math.round(score * 10) / 10 });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 4);
}

// ---- Recruiting ----

export interface CbbRecruit { id: string; name: string; pos: CbbPos; stars: number; grade: number; trueOvr: number; nilAsk: number }

export function cbbNilFor(prestige: number, winsLastSeason: number): number {
  return Math.round(36 + (prestige - 72) * 2.2 + winsLastSeason * 1.6);
}

export function cbbRecruitClass(rng: () => number, size = 14): CbbRecruit[] {
  const POS: CbbPos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
  const out: CbbRecruit[] = [];
  for (let i = 0; i < size; i++) {
    const roll = rng() * 100;
    const stars = roll > 92 ? 5 : roll > 70 ? 4 : roll > 32 ? 3 : 2;
    const trueOvr = 56 + stars * 5 + Math.floor(rng() * 9);
    out.push({
      id: fid(), name: cbbGenName(rng), pos: POS[Math.floor(rng() * POS.length)],
      stars, grade: clampi(trueOvr + Math.floor(rng() * 9) - 4, 50, 94), trueOvr,
      nilAsk: stars * 8 + Math.floor(rng() * 7),
    });
  }
  return out.sort((a, b) => b.stars - a.stars || b.grade - a.grade);
}

export function cbbPortalPool(rng: () => number, size = 7): CbbRecruit[] {
  const POS: CbbPos[] = ['PG', 'SG', 'SF', 'PF', 'C', 'SG', 'PF'];
  const out: CbbRecruit[] = [];
  for (let i = 0; i < size; i++) {
    const trueOvr = 72 + Math.floor(rng() * 15);
    out.push({
      id: fid(), name: cbbGenName(rng), pos: POS[i % POS.length],
      stars: trueOvr >= 83 ? 4 : 3, grade: trueOvr, trueOvr,
      nilAsk: Math.round((trueOvr - 64) * 1.3),
    });
  }
  return out.sort((a, b) => b.grade - a.grade);
}

export function cbbSignRecruit(st: CbbState, r: CbbRecruit, cls: CbbClass, rng: () => number): boolean {
  if (st.nil < r.nilAsk) return false;
  st.nil -= r.nilAsk;
  st.teams[st.myTeam].players.push({
    id: fid(), name: r.name, pos: r.pos, cls,
    ovr: r.trueOvr, pot: clampi(r.trueOvr + 5 + Math.floor(rng() * 9), r.trueOvr, 99),
    stars: r.stars,
  });
  return true;
}

/** Offseason: one-and-dones leave, seniors graduate, classes advance, AI reloads. */
export function cbbOffseason(st: CbbState, rng: () => number): string[] {
  const notes: string[] = [];
  for (const t of Object.values(st.teams)) {
    const prestige = CBB_SCHOOL_MAP.get(t.id)!.prestige;
    const keep: CbbPlayer[] = [];
    for (const p of t.players) {
      if (p.cls === 'FR' && p.ovr >= 88 && rng() < 0.85) {
        if (t.id === st.myTeam) notes.push(`🎓 One-and-done: ${p.name} (${p.pos}, ${p.ovr}) is off to the pros after one season.`);
        continue;
      }
      if (p.cls === 'SR') {
        if (t.id === st.myTeam) notes.push(`👋 ${p.name} (${p.pos}) graduates.`);
        continue;
      }
      if ((p.cls === 'SO' || p.cls === 'JR') && p.ovr >= 90 && rng() < 0.55) {
        if (t.id === st.myTeam) notes.push(`🏀 ${p.name} (${p.pos}, ${p.ovr}) declares for the draft.`);
        continue;
      }
      const grow = p.cls === 'FR' ? 3 + Math.floor(rng() * 4) : 2 + Math.floor(rng() * 3);
      p.ovr = clampi(Math.min(p.pot, p.ovr + grow), 55, 99);
      p.cls = p.cls === 'FR' ? 'SO' : p.cls === 'SO' ? 'JR' : 'SR';
      keep.push(p);
    }
    t.players = keep;
    /* Round 426 part four: top up the positions the roster is MISSING, the
       fix the CFB engine got in part two. Indexing ROSTER_SHAPE by how many
       players a team happens to have meant a team keeping five or more could
       only ever draw index 5 and up (SG, SF, PF), so point guards and centers
       drained out of every AI roster: measured over 20 seeds, 39 or 40 of the
       40 teams had no PG after five offseasons. Nothing crashed here, because
       poyRace has no position filter, but the roster tab showed teams with no
       point guard and no center. The rng draws are unchanged in count and
       order, so this only moves which position a freshman plays. */
    const need = [...ROSTER_SHAPE];
    for (const p of t.players) {
      const i = need.indexOf(p.pos);
      if (i !== -1) need.splice(i, 1);
    }
    while (t.players.length < 8) {
      const stars = starsFor(prestige, rng);
      const ovr = clampi(prestige - 15 + stars * 1.7 + Math.floor(rng() * 5), 55, 92);
      t.players.push({
        id: fid(), name: cbbGenName(rng),
        pos: need.shift() ?? ROSTER_SHAPE[t.players.length % ROSTER_SHAPE.length],
        cls: 'FR', ovr, pot: clampi(ovr + 6 + Math.floor(rng() * 8), ovr, 99), stars,
      });
    }
    t.wins = 0; t.losses = 0; t.confChamp = false;
  }
  st.season += 1;
  st.round = 1;
  return notes;
}
