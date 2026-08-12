/**
 * NFL My Career engine (2026-08-05, the career-for-every-sport push).
 * A BitLife-style player career: you are a fictional prospect (your name,
 * your position, your archetype) drafted into the real 32-team league.
 * Seasons simulate position-appropriate stat lines driven by your rating,
 * your role and your team's quality; between seasons you make career
 * choices (training focus, holdouts, contract calls, trade requests,
 * playing hurt) that bend the curve. Awards, rings, records, decline,
 * retirement, legacy verdict. The player is explicitly fictional; the
 * teams are real.
 */

export type CareerPos = 'QB' | 'RB' | 'WR';

export const NFL_TEAM_NAMES: { abbr: string; label: string }[] = [
  { abbr: 'ARI', label: 'Arizona Cardinals' }, { abbr: 'ATL', label: 'Atlanta Falcons' },
  { abbr: 'BAL', label: 'Baltimore Ravens' }, { abbr: 'BUF', label: 'Buffalo Bills' },
  { abbr: 'CAR', label: 'Carolina Panthers' }, { abbr: 'CHI', label: 'Chicago Bears' },
  { abbr: 'CIN', label: 'Cincinnati Bengals' }, { abbr: 'CLE', label: 'Cleveland Browns' },
  { abbr: 'DAL', label: 'Dallas Cowboys' }, { abbr: 'DEN', label: 'Denver Broncos' },
  { abbr: 'DET', label: 'Detroit Lions' }, { abbr: 'GB', label: 'Green Bay Packers' },
  { abbr: 'HOU', label: 'Houston Texans' }, { abbr: 'IND', label: 'Indianapolis Colts' },
  { abbr: 'JAX', label: 'Jacksonville Jaguars' }, { abbr: 'KC', label: 'Kansas City Chiefs' },
  { abbr: 'LA', label: 'Los Angeles Rams' }, { abbr: 'LAC', label: 'Los Angeles Chargers' },
  { abbr: 'LV', label: 'Las Vegas Raiders' }, { abbr: 'MIA', label: 'Miami Dolphins' },
  { abbr: 'MIN', label: 'Minnesota Vikings' }, { abbr: 'NE', label: 'New England Patriots' },
  { abbr: 'NO', label: 'New Orleans Saints' }, { abbr: 'NYG', label: 'New York Giants' },
  { abbr: 'NYJ', label: 'New York Jets' }, { abbr: 'PHI', label: 'Philadelphia Eagles' },
  { abbr: 'PIT', label: 'Pittsburgh Steelers' }, { abbr: 'SEA', label: 'Seattle Seahawks' },
  { abbr: 'SF', label: 'San Francisco 49ers' }, { abbr: 'TB', label: 'Tampa Bay Buccaneers' },
  { abbr: 'TEN', label: 'Tennessee Titans' }, { abbr: 'WAS', label: 'Washington Commanders' },
];

export interface Archetype {
  id: string;
  label: string;
  desc: string;
  ovrBoost: number;
  potBoost: number;
  durability: number; // 0-1 injury resistance modifier
}

export const ARCHETYPES: Record<CareerPos, Archetype[]> = {
  QB: [
    { id: 'cannon', label: 'Cannon Arm', desc: 'Big throws, big turnovers', ovrBoost: 2, potBoost: 4, durability: 0.9 },
    { id: 'surgeon', label: 'Field Surgeon', desc: 'Accuracy and brains, slower start', ovrBoost: 0, potBoost: 6, durability: 1.0 },
    { id: 'dual', label: 'Dual Threat', desc: 'Legs change everything, hits add up', ovrBoost: 3, potBoost: 3, durability: 0.75 },
  ],
  RB: [
    { id: 'bell', label: 'Bellcow', desc: 'Volume monster, wears down', ovrBoost: 3, potBoost: 2, durability: 0.7 },
    { id: 'satellite', label: 'Satellite Back', desc: 'Catches everything, shares the room', ovrBoost: 1, potBoost: 4, durability: 0.95 },
    { id: 'hammer', label: 'The Hammer', desc: 'Short yardage god', ovrBoost: 2, potBoost: 2, durability: 0.85 },
  ],
  WR: [
    { id: 'burner', label: 'Burner', desc: 'Takes the top off', ovrBoost: 2, potBoost: 4, durability: 0.9 },
    { id: 'possession', label: 'Chain Mover', desc: 'Third down security blanket', ovrBoost: 1, potBoost: 4, durability: 1.0 },
    { id: 'alpha', label: 'Alpha X', desc: 'Contested catch king', ovrBoost: 3, potBoost: 3, durability: 0.9 },
  ],
};

export interface SeasonLine {
  year: number;
  team: string;
  age: number;
  ovr: number;
  games: number;
  // QB
  passYds?: number; passTd?: number; ints?: number;
  // RB
  rushYds?: number; rushTd?: number;
  // WR (and RB receiving)
  rec?: number; recYds?: number; recTd?: number;
  awards: string[];
  teamResult: string; // 'Missed playoffs' | 'Lost Wild Card' | ... | 'Won the Super Bowl'
  salary: number;
}

export interface CareerState {
  name: string;
  pos: CareerPos;
  archetype: Archetype;
  team: string;
  year: number;
  age: number;
  ovr: number;
  pot: number;
  morale: number;   // 0-100
  fanbase: number;  // 0-100
  health: number;   // 0-100, permanent wear
  salary: number;
  contractYears: number;
  seasons: SeasonLine[];
  rings: number;
  mvps: number;
  allPros: number;
  retired: boolean;
  draftPick: number;
  earnings: number;
}

export interface CareerEvent {
  id: string;
  title: string;
  body: string;
  options: { label: string; effect: string; apply: (c: CareerState, rng: () => number) => string }[];
}

export function startCareer(
  name: string, pos: CareerPos, archetype: Archetype, rng: () => number = Math.random,
): CareerState {
  const base = 66 + Math.floor(rng() * 8) + archetype.ovrBoost;
  const pot = Math.min(99, base + 10 + Math.floor(rng() * 14) + archetype.potBoost);
  // draft stock from rating: better prospects go earlier
  const stock = Math.max(1, Math.round(90 - (base - 64) * 9 + rng() * 40));
  const team = NFL_TEAM_NAMES[Math.floor(rng() * NFL_TEAM_NAMES.length)].abbr;
  const firstRound = stock <= 32;
  return {
    name, pos, archetype, team,
    year: 2026,
    age: 22,
    ovr: base,
    pot,
    morale: 70,
    fanbase: firstRound ? 55 : 35,
    health: 100,
    salary: firstRound ? Math.round((33 - stock) * 0.9 + 4) : 1.2,
    contractYears: 4,
    seasons: [],
    rings: 0, mvps: 0, allPros: 0,
    retired: false,
    draftPick: stock,
    earnings: 0,
  };
}

export function teamLabelOf(abbr: string): string {
  return NFL_TEAM_NAMES.find(t => t.abbr === abbr)?.label ?? abbr;
}

/** Team quality random-walks per season so franchises rise and fall. */
export function rollTeamQuality(prev: number | null, rng: () => number): number {
  if (prev == null) return 68 + Math.floor(rng() * 22);
  return Math.max(62, Math.min(94, Math.round(prev + (rng() * 14 - 7))));
}

function seasonGames(c: CareerState, rng: () => number): { games: number; injuryNote: string | null } {
  const risk = (1 - c.archetype.durability) * 0.5 + (100 - c.health) / 260 + (c.pos === 'RB' ? 0.07 : 0);
  if (rng() < risk) {
    const missed = 2 + Math.floor(rng() * 9);
    return { games: Math.max(4, 17 - missed), injuryNote: `Missed ${missed} games hurt.` };
  }
  return { games: 17, injuryNote: null };
}

export function simSeason(
  c: CareerState, teamQuality: number, rng: () => number,
): { line: SeasonLine; notes: string[] } {
  const notes: string[] = [];
  const { games, injuryNote } = seasonGames(c, rng);
  if (injuryNote) { notes.push(`🚑 ${injuryNote}`); c.health -= 6; }
  const form = c.ovr + (c.morale - 60) / 10 + (teamQuality - 78) / 5;
  const g = games / 17;
  const line: SeasonLine = {
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games,
    awards: [], teamResult: '', salary: c.salary,
  };
  if (c.pos === 'QB') {
    line.passYds = Math.round((1900 + (form - 62) * 92 + rng() * 500) * g);
    line.passTd = Math.max(4, Math.round((6 + (form - 62) * 0.95 + rng() * 6) * g));
    line.ints = Math.max(1, Math.round((18 - (form - 62) * 0.25 + rng() * 5) * g));
  } else if (c.pos === 'RB') {
    line.rushYds = Math.round((260 + (form - 62) * 46 + rng() * 260) * g);
    line.rushTd = Math.max(0, Math.round((1 + (form - 62) * 0.42 + rng() * 3) * g));
    line.rec = Math.round((14 + (form - 62) * 1.1 + rng() * 12) * g);
    line.recYds = Math.round((line.rec ?? 0) * (6.5 + rng() * 3));
  } else {
    line.rec = Math.round((28 + (form - 62) * 2.5 + rng() * 14) * g);
    line.recYds = Math.round((line.rec ?? 0) * (10.5 + rng() * 4));
    line.recTd = Math.max(0, Math.round((1 + (form - 62) * 0.32 + rng() * 3) * g));
  }

  // team result
  const strength = teamQuality + (c.ovr - 74) * (c.pos === 'QB' ? 0.55 : 0.25);
  const playoffOdds = Math.max(0.04, Math.min(0.92, (strength - 66) / 26));
  let result = 'Missed the playoffs';
  if (rng() < playoffOdds) {
    const runs = ['Lost in the Wild Card round', 'Lost in the Divisional round', 'Lost the Conference Championship', 'Lost the Super Bowl', 'WON THE SUPER BOWL'];
    let stage = 0;
    while (stage < 4 && rng() < 0.42 + (strength - 76) / 90) stage++;
    result = runs[stage];
    if (result === 'WON THE SUPER BOWL') { c.rings += 1; c.fanbase = Math.min(100, c.fanbase + 14); notes.push('💍 A RING.'); }
  }
  line.teamResult = result;

  // awards
  const statScore = c.pos === 'QB'
    ? (line.passYds ?? 0) / 48 + (line.passTd ?? 0) * 2.4 - (line.ints ?? 0)
    : c.pos === 'RB'
      ? ((line.rushYds ?? 0) + (line.recYds ?? 0)) / 16 + (line.rushTd ?? 0) * 3
      : (line.recYds ?? 0) / 14 + (line.recTd ?? 0) * 3;
  if (c.seasons.length === 0 && statScore > 68 && rng() < 0.7) { line.awards.push('Offensive Rookie of the Year'); notes.push('🏆 Offensive Rookie of the Year.'); }
  if (statScore > 105 && games >= 15) { line.awards.push('All-Pro'); c.allPros += 1; notes.push('⭐ First-team All-Pro.'); }
  if (statScore > 118 && games >= 15 && (c.pos === 'QB' ? c.ovr >= 90 && rng() < 0.28 : rng() < 0.06)) {
    line.awards.push('MVP'); c.mvps += 1; notes.push('👑 LEAGUE MVP.');
  }

  c.earnings += c.salary;
  c.seasons.push(line);
  return { line, notes };
}

/** End-of-season progression: growth to potential, decline with age and wear. */
export function progress(c: CareerState, rng: () => number): string[] {
  const notes: string[] = [];
  const before = c.ovr;
  if (c.age <= 26 && c.ovr < c.pot) {
    c.ovr = Math.min(c.pot, c.ovr + 2 + Math.floor(rng() * 3));
  } else if (c.age >= (c.pos === 'RB' ? 28 : 31)) {
    const wear = (100 - c.health) / 40;
    const cliff = c.pos === 'RB' ? 1.6 : 1;
    c.ovr = Math.max(60, Math.round(c.ovr - (1 + rng() * 2 + wear) * cliff));
  }
  if (c.ovr - before >= 4) notes.push(`📈 Leap year: ${before} to ${c.ovr}.`);
  if (before - c.ovr >= 3) notes.push(`📉 The dropoff is real: ${before} to ${c.ovr}.`);
  if (c.age >= 30) c.health = Math.max(30, c.health - 3);
  c.age += 1;
  c.year += 1;
  c.contractYears -= 1;
  c.morale = Math.max(20, Math.min(100, c.morale + Math.round(rng() * 10 - 4)));
  return notes;
}

export function marketSalary(c: CareerState): number {
  const posMult = c.pos === 'QB' ? 1.9 : c.pos === 'WR' ? 1.15 : 0.9;
  return Math.max(1.2, Math.round(((c.ovr - 64) * 1.55 - 6) * posMult * 10) / 10);
}

/** Between-season decision deck. One event is drawn per offseason. */
export function drawEvent(c: CareerState, rng: () => number): CareerEvent {
  const deck: CareerEvent[] = [];

  if (c.contractYears <= 0) {
    const market = marketSalary(c);
    deck.push({
      id: 'contract',
      title: 'Contract time',
      body: `Your deal is up. ${teamLabelOf(c.team)} offer ${Math.round(market * 0.88 * 10) / 10}M to stay. Free agency could pay ${market}M, on a contender or a rebuild, nobody knows.`,
      options: [
        {
          label: 'Re-sign at a hometown discount', effect: 'Loyalty, morale up',
          apply: (cc) => { cc.salary = Math.round(market * 0.88 * 10) / 10; cc.contractYears = 3; cc.morale += 8; cc.fanbase = Math.min(100, cc.fanbase + 10); return `Re-signed with ${teamLabelOf(cc.team)} for ${cc.salary}M x3.`; },
        },
        {
          label: 'Test free agency', effect: 'Max money, new city',
          apply: (cc, r) => {
            const newTeam = NFL_TEAM_NAMES[Math.floor(r() * NFL_TEAM_NAMES.length)].abbr;
            cc.team = newTeam; cc.salary = market; cc.contractYears = 3; cc.fanbase = 40;
            return `Signed with ${teamLabelOf(newTeam)} for ${market}M x3. New city, new pressure.`;
          },
        },
      ],
    });
  }

  deck.push({
    id: 'training',
    title: 'Offseason focus',
    body: 'Twelve weeks before camp. Where does the work go?',
    options: [
      { label: 'Skill work', effect: 'Push your ceiling', apply: (cc, r) => { if (cc.age >= 30) { cc.health = Math.min(100, cc.health + 4); return 'At this age the gains are in maintenance. Health +4.'; } const up = 1 + Math.floor(r() * 2); cc.ovr = Math.min(cc.pot + 1, cc.ovr + up); return `Rating +${up}.`; } },
      { label: 'Body work', effect: 'Durability and recovery', apply: (cc) => { cc.health = Math.min(100, cc.health + 10); return 'Health +10. You feel five years younger.'; } },
      { label: 'Brand work', effect: 'Fame and endorsements', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 12); cc.earnings += 3; return 'Fanbase +12 and a 3M endorsement.'; } },
    ],
  });

  if (c.morale < 55) {
    deck.push({
      id: 'frustration',
      title: 'Frustration boils',
      body: `Losing wears on you. Reporters smell it. What is the move?`,
      options: [
        { label: 'Request a trade', effect: 'Fresh start, fans burn the jersey', apply: (cc, r) => { const nt = NFL_TEAM_NAMES[Math.floor(r() * NFL_TEAM_NAMES.length)].abbr; cc.team = nt; cc.morale = 72; cc.fanbase = 35; return `Traded to ${teamLabelOf(nt)}.`; } },
        { label: 'Say the right things', effect: 'Stability', apply: (cc) => { cc.morale += 6; cc.fanbase += 5; return 'You take the high road. The locker room notices.'; } },
      ],
    });
  }

  if (c.health < 75) {
    deck.push({
      id: 'surgery',
      title: 'The knee talks to you',
      body: 'Doctors offer a cleanup operation: miss the start of the season, or push through another year.',
      options: [
        { label: 'Get the surgery', effect: 'Health back, slow start', apply: (cc) => { cc.health = Math.min(100, cc.health + 22); cc.morale -= 4; return 'Surgery done. You will start the season slow but whole.'; } },
        { label: 'Play through it', effect: 'Risk the wear', apply: (cc) => { cc.health -= 8; return 'You strap it up. The trainers exchange looks.'; } },
      ],
    });
  }

  deck.push({
    id: 'media',
    title: 'Prime time podcast invite',
    body: 'A famous podcast wants the unfiltered you. Producers promise fireworks.',
    options: [
      { label: 'Speak your mind', effect: 'Fame up, front office down', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 10); cc.morale -= 3; return 'The clips go viral. The GM texts: call me.'; } },
      { label: 'Politely decline', effect: 'Locker room respect', apply: (cc) => { cc.morale += 4; return 'Film room over fame. Coaches love it.'; } },
    ],
  });

  return deck[Math.floor(rng() * deck.length)];
}

export function shouldRetire(c: CareerState): boolean {
  return c.ovr <= 64
    || c.age >= 40
    || (c.pos === 'RB' && c.age >= 34)
    || c.seasons.length >= 19;
}

export interface Legacy {
  score: number;
  verdict: string;
  hof: boolean;
  bullets: string[];
}

export function legacyOf(c: CareerState): Legacy {
  const totals = careerTotals(c);
  let score = c.rings * 90 + c.mvps * 110 + c.allPros * 45 + c.seasons.length * 8;
  if (c.pos === 'QB') score += totals.passYds / 800 + totals.passTd * 0.5;
  if (c.pos === 'RB') score += totals.rushYds / 120;
  if (c.pos === 'WR') score += totals.recYds / 140;
  score = Math.round(score);
  const hof = score >= 520;
  const verdict = score >= 900 ? 'Inner-circle, first-ballot immortal'
    : score >= 520 ? 'Hall of Famer'
    : score >= 340 ? 'Ring of Honor type, Canton borderline'
    : score >= 180 ? 'A long, proud career'
    : 'A cup of coffee in the league';
  const bullets = [
    `${c.seasons.length} seasons, ${c.rings} ring${c.rings === 1 ? '' : 's'}, ${c.mvps} MVP${c.mvps === 1 ? '' : 's'}, ${c.allPros} All-Pro nod${c.allPros === 1 ? '' : 's'}`,
    c.pos === 'QB' ? `${totals.passYds.toLocaleString()} passing yards, ${totals.passTd} touchdowns`
      : c.pos === 'RB' ? `${totals.rushYds.toLocaleString()} rushing yards, ${totals.rushTd} touchdowns`
      : `${totals.rec} catches for ${totals.recYds.toLocaleString()} yards, ${totals.recTd} touchdowns`,
    `${Math.round(c.earnings)}M career earnings, drafted pick ${c.draftPick}`,
  ];
  return { score, verdict, hof, bullets };
}

export function careerTotals(c: CareerState) {
  const t = { passYds: 0, passTd: 0, ints: 0, rushYds: 0, rushTd: 0, rec: 0, recYds: 0, recTd: 0 };
  for (const s of c.seasons) {
    t.passYds += s.passYds ?? 0; t.passTd += s.passTd ?? 0; t.ints += s.ints ?? 0;
    t.rushYds += s.rushYds ?? 0; t.rushTd += s.rushTd ?? 0;
    t.rec += s.rec ?? 0; t.recYds += s.recYds ?? 0; t.recTd += s.recTd ?? 0;
  }
  return t;
}
