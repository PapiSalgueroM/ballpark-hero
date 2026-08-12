/**
 * MLB My Career engine (2026-08-05). Baseball sibling of nflMyCareer.ts:
 * a fictional prospect living a whole career inside the real 30-team
 * league, hitter or pitcher. Season lines (AVG/HR/RBI or W-L/ERA/K)
 * driven by rating, health and team quality; minor league grind before
 * the call-up; one big decision per offseason; awards, rings, aging,
 * retirement, legacy verdict. The player is fictional; the teams are real.
 */

import { MLB_TEAMS } from '@/data/conquestDataMlb';

export type MlbCareerPos = 'SP' | 'CF' | 'SS' | '1B';

export interface MlbArchetype {
  id: string;
  label: string;
  desc: string;
  ovrBoost: number;
  potBoost: number;
  durability: number;
}

export const MLB_ARCHETYPES: Record<MlbCareerPos, MlbArchetype[]> = {
  SP: [
    { id: 'flame', label: 'Flamethrower', desc: 'Triple digits, elbow prays nightly', ovrBoost: 3, potBoost: 4, durability: 0.72 },
    { id: 'crafty', label: 'Crafty Lefty', desc: 'Paints corners, ages forever', ovrBoost: 0, potBoost: 5, durability: 1.0 },
    { id: 'workhorse', label: 'Workhorse', desc: '200 innings, every year', ovrBoost: 2, potBoost: 3, durability: 0.9 },
  ],
  CF: [
    { id: 'fivetool', label: 'Five-Tool Freak', desc: 'Does everything, the face of the game', ovrBoost: 3, potBoost: 5, durability: 0.9 },
    { id: 'burner', label: 'Burner', desc: 'Eighty steals if you let him', ovrBoost: 1, potBoost: 4, durability: 0.9 },
    { id: 'wall', label: 'The Wall Climber', desc: 'Highlight-reel glove, growing bat', ovrBoost: 2, potBoost: 4, durability: 0.95 },
  ],
  SS: [
    { id: 'wizard', label: 'The Wizard', desc: 'Glove first, gold always', ovrBoost: 2, potBoost: 4, durability: 1.0 },
    { id: 'slugging', label: 'Slugging Shortstop', desc: 'The modern monster', ovrBoost: 3, potBoost: 4, durability: 0.9 },
    { id: 'sparkplug', label: 'Sparkplug', desc: 'Leadoff energy, dirt on the jersey', ovrBoost: 1, potBoost: 4, durability: 0.95 },
  ],
  '1B': [
    { id: 'masher', label: 'Masher', desc: '45 homers or bust', ovrBoost: 3, potBoost: 4, durability: 0.9 },
    { id: 'contact', label: 'Contact Machine', desc: 'A .320 season is normal', ovrBoost: 1, potBoost: 5, durability: 1.0 },
    { id: 'clutch', label: 'Captain Clutch', desc: 'October legend in the making', ovrBoost: 2, potBoost: 4, durability: 0.95 },
  ],
};

export interface MlbSeasonLine {
  year: number;
  team: string;
  age: number;
  ovr: number;
  games: number;
  // hitters
  avg?: number; hr?: number; rbi?: number; sb?: number;
  // pitchers
  wins?: number; lossesP?: number; era?: number; so?: number;
  awards: string[];
  teamResult: string;
  salary: number;
}

export interface MlbCareerState {
  name: string;
  pos: MlbCareerPos;
  archetype: MlbArchetype;
  team: string;
  year: number;
  age: number;
  ovr: number;
  pot: number;
  morale: number;
  fanbase: number;
  health: number;
  salary: number;
  contractYears: number;
  seasons: MlbSeasonLine[];
  rings: number;
  mvpCys: number;      // MVPs for hitters, Cy Youngs for pitchers
  allStars: number;
  retired: boolean;
  draftPick: number;
  earnings: number;
}

export interface MlbCareerEvent {
  id: string;
  title: string;
  body: string;
  options: { label: string; effect: string; apply: (c: MlbCareerState, rng: () => number) => string }[];
}

export function mlbTeamLabelOf(id: string): string {
  const t = MLB_TEAMS.find(x => x.id === id);
  return t ? `${t.city} ${t.name}` : id;
}

export function startMlbCareer(
  name: string, pos: MlbCareerPos, archetype: MlbArchetype, rng: () => number = Math.random,
): MlbCareerState {
  const base = 64 + Math.floor(rng() * 8) + archetype.ovrBoost;
  const pot = Math.min(99, base + 12 + Math.floor(rng() * 14) + archetype.potBoost);
  const stock = Math.max(1, Math.round(45 - (base - 62) * 4 + rng() * 25));
  const team = MLB_TEAMS[Math.floor(rng() * MLB_TEAMS.length)].id;
  return {
    name, pos, archetype, team,
    year: 2026, age: 21,
    ovr: base, pot,
    morale: 70, fanbase: stock <= 10 ? 50 : 30, health: 100,
    salary: 0.8,
    contractYears: 6, // team control years, baseball-style
    seasons: [],
    rings: 0, mvpCys: 0, allStars: 0,
    retired: false,
    draftPick: stock,
    earnings: 0,
  };
}

export function mlbRollTeamQuality(prev: number | null, rng: () => number): number {
  if (prev == null) return 70 + Math.floor(rng() * 20);
  return Math.max(64, Math.min(95, Math.round(prev + (rng() * 12 - 6))));
}

export function mlbMarketSalary(c: MlbCareerState): number {
  return Math.max(1, Math.round(((c.ovr - 64) * 1.5 - 6) * 10) / 10);
}

function gamesFor(c: MlbCareerState, rng: () => number): { games: number; note: string | null } {
  const isSp = c.pos === 'SP';
  const full = isSp ? 32 : 155 + Math.floor(rng() * 8);
  const risk = (1 - c.archetype.durability) * 0.55 + (100 - c.health) / 250;
  if (rng() < risk) {
    const frac = 0.35 + rng() * 0.4;
    return { games: Math.max(isSp ? 8 : 45, Math.round(full * frac)), note: isSp && rng() < 0.4 ? 'The elbow. Season shortened, surgery whispers.' : 'Injured list stints ate the season.' };
  }
  return { games: full, note: null };
}

export function simMlbSeason(
  c: MlbCareerState, teamQuality: number, rng: () => number,
): { line: MlbSeasonLine; notes: string[] } {
  const notes: string[] = [];
  const { games, note } = gamesFor(c, rng);
  if (note) { notes.push(`🚑 ${note}`); c.health -= 8; }
  const form = c.ovr + (c.morale - 60) / 12 + (teamQuality - 78) / 10;
  const line: MlbSeasonLine = {
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games,
    awards: [], teamResult: '', salary: c.salary,
  };
  if (c.pos === 'SP') {
    const gs = games;
    line.era = Math.max(1.85, Math.round((5.6 - (form - 62) * 0.075 + rng() * 0.8) * 100) / 100);
    line.wins = Math.max(1, Math.round(gs * (0.25 + (form - 62) * 0.009) + rng() * 3));
    line.lossesP = Math.max(0, Math.round(gs * 0.42 - (line.wins ?? 0) * 0.55 + rng() * 3));
    line.so = Math.max(40, Math.round(gs * (3.4 + (form - 62) * 0.11) + rng() * 25));
  } else {
    const g = games / 160;
    line.avg = Math.min(0.365, Math.max(0.205, Math.round((0.238 + (form - 62) * 0.0028 + rng() * 0.02) * 1000) / 1000));
    line.hr = Math.min(58, Math.max(2, Math.round((6 + (form - 62) * 1.05 + rng() * 8) * g)));
    line.rbi = Math.max(15, Math.round(((line.hr ?? 0) * 2.4 + 25 + rng() * 20) * g));
    line.sb = c.archetype.id === 'burner' ? Math.round((28 + rng() * 35) * g) : Math.round(rng() * 12 * g);
  }

  const strength = teamQuality + (c.ovr - 76) * 0.35;
  const playoffOdds = Math.max(0.05, Math.min(0.85, (strength - 68) / 30));
  let result = 'Missed October';
  if (rng() < playoffOdds) {
    const stages = ['Lost the Wild Card series', 'Lost the Division Series', 'Lost the Championship Series', 'Lost the World Series', 'WON THE WORLD SERIES'];
    let stage = 0;
    while (stage < 4 && rng() < 0.42 + (strength - 78) / 85) stage++;
    result = stages[stage];
    if (result === 'WON THE WORLD SERIES') { c.rings += 1; c.fanbase = Math.min(100, c.fanbase + 14); notes.push('💍 A RING. The parade is downtown.'); }
  }
  line.teamResult = result;

  const statScore = c.pos === 'SP'
    ? (line.so ?? 0) / 5 + (line.wins ?? 0) * 2.2 + Math.max(0, (3.8 - (line.era ?? 5)) * 22)
    : (line.hr ?? 0) * 1.6 + (line.rbi ?? 0) / 3 + Math.max(0, ((line.avg ?? 0.2) - 0.24) * 320) + (line.sb ?? 0) / 3;
  if (c.seasons.length === 0 && statScore > 55 && rng() < 0.72) { line.awards.push('Rookie of the Year'); notes.push('🏆 Rookie of the Year.'); }
  if (statScore > 88) { line.awards.push('All-Star'); c.allStars += 1; notes.push('⭐ All-Star.'); }
  if (statScore > 118 && c.ovr >= 90 && rng() < (c.pos === 'SP' ? 0.35 : 0.22)) {
    const award = c.pos === 'SP' ? 'Cy Young' : 'MVP';
    line.awards.push(award); c.mvpCys += 1; notes.push(`👑 ${award.toUpperCase()}.`);
  }

  c.earnings += c.salary;
  c.seasons.push(line);
  return { line, notes };
}

export function mlbProgress(c: MlbCareerState, rng: () => number): string[] {
  const notes: string[] = [];
  const before = c.ovr;
  if (c.age <= 26 && c.ovr < c.pot) c.ovr = Math.min(c.pot, c.ovr + 2 + Math.floor(rng() * 3));
  else if (c.age >= 32) {
    const wear = (100 - c.health) / 40;
    c.ovr = Math.max(60, Math.round(c.ovr - (1 + rng() * 2 + wear) * (c.age >= 37 ? 1.5 : 1)));
  }
  if (c.ovr - before >= 4) notes.push(`📈 The breakout: ${before} to ${c.ovr}.`);
  if (before - c.ovr >= 3) notes.push(`📉 The bat speed goes quietly: ${before} to ${c.ovr}.`);
  if (c.age >= 31) c.health = Math.max(30, c.health - 3);
  c.age += 1;
  c.year += 1;
  c.contractYears -= 1;
  c.morale = Math.max(20, Math.min(100, c.morale + Math.round(rng() * 10 - 4)));
  return notes;
}

export function drawMlbEvent(c: MlbCareerState, rng: () => number): MlbCareerEvent {
  const deck: MlbCareerEvent[] = [];
  if (c.contractYears <= 0) {
    const market = mlbMarketSalary(c);
    deck.push({
      id: 'contract',
      title: 'Free agency, finally',
      body: `Six years of team control are done. ${mlbTeamLabelOf(c.team)} offer ${Math.round(market * 0.85 * 10) / 10}M a year. The open market whispers ${market}M.`,
      options: [
        { label: 'Stay home', effect: 'Legacy with one club', apply: (cc) => { cc.salary = Math.round(market * 0.85 * 10) / 10; cc.contractYears = 4; cc.fanbase = Math.min(100, cc.fanbase + 12); cc.morale += 6; return `Re-signed with ${mlbTeamLabelOf(cc.team)} for ${cc.salary}M x4.`; } },
        { label: 'Take the biggest deal', effect: 'New city, top dollar', apply: (cc, r) => { const nt = MLB_TEAMS[Math.floor(r() * MLB_TEAMS.length)].id; cc.team = nt; cc.salary = market; cc.contractYears = 4; cc.fanbase = 40; return `Signed with ${mlbTeamLabelOf(nt)} for ${market}M x4. Back page of every paper.`; } },
      ],
    });
  }
  deck.push({
    id: 'training',
    title: 'Winter plan',
    body: 'The offseason is long. Where do the hours go?',
    options: [
      { label: c.pos === 'SP' ? 'New pitch lab' : 'Swing rebuild', effect: 'Push the ceiling', apply: (cc, r) => { if (cc.age >= 32) { cc.health = Math.min(100, cc.health + 4); return 'Veteran maintenance. Health +4.'; } const up = 1 + Math.floor(r() * 2); cc.ovr = Math.min(cc.pot + 1, cc.ovr + up); return `Rating +${up}.`; } },
      { label: 'Arm care and mobility', effect: 'Durability', apply: (cc) => { cc.health = Math.min(100, cc.health + 10); return 'Health +10. Spring training in the best shape of your life.'; } },
      { label: 'The commercial circuit', effect: 'Fame and money', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 12); cc.earnings += 3; return 'National ads all winter. 3M banked.'; } },
    ],
  });
  if (c.pos === 'SP' && c.health < 70) {
    deck.push({
      id: 'tj',
      title: 'The elbow decision',
      body: 'The MRI is not clean. Surgery now costs a season but saves the arm.',
      options: [
        { label: 'Get the surgery', effect: 'Miss time, save the arm', apply: (cc) => { cc.health = Math.min(100, cc.health + 30); cc.morale -= 5; return 'Surgery done. The rehab calendar goes on the wall.'; } },
        { label: 'Pitch through it', effect: 'Gamble', apply: (cc) => { cc.health -= 10; return 'You take the ball. Every start is a coin flip now.'; } },
      ],
    });
  }
  if (c.morale < 55) {
    deck.push({
      id: 'trade',
      title: 'Trade deadline rumors',
      body: 'The team is selling and your name leads every rumor column.',
      options: [
        { label: 'Ask out', effect: 'Contender bound', apply: (cc, r) => { const nt = MLB_TEAMS[Math.floor(r() * MLB_TEAMS.length)].id; cc.team = nt; cc.morale = 74; cc.fanbase = 38; return `Dealt to ${mlbTeamLabelOf(nt)} at the deadline.`; } },
        { label: 'Be the franchise guy', effect: 'Loyalty points', apply: (cc) => { cc.morale += 6; cc.fanbase += 6; return 'You stay and say the right things. The city loves it.'; } },
      ],
    });
  }
  return deck[Math.floor(rng() * deck.length)];
}

export function mlbShouldRetire(c: MlbCareerState): boolean {
  return c.ovr <= 62 || c.age >= 42 || c.seasons.length >= 21;
}

export interface MlbLegacy { score: number; verdict: string; hof: boolean; bullets: string[] }

export function mlbCareerTotals(c: MlbCareerState) {
  let hr = 0, rbi = 0, sb = 0, wins = 0, so = 0, games = 0;
  for (const s of c.seasons) {
    hr += s.hr ?? 0; rbi += s.rbi ?? 0; sb += s.sb ?? 0; wins += s.wins ?? 0; so += s.so ?? 0; games += s.games;
  }
  return { hr, rbi, sb, wins, so, games };
}

export function mlbLegacyOf(c: MlbCareerState): MlbLegacy {
  const t = mlbCareerTotals(c);
  let score = c.rings * 85 + c.mvpCys * 100 + c.allStars * 28 + c.seasons.length * 8;
  score += c.pos === 'SP' ? t.wins * 1.1 + t.so / 28 : t.hr * 0.85 + t.rbi / 22;
  score = Math.round(score);
  const hof = score >= 500;
  const verdict = score >= 900 ? 'Cooperstown first ballot, inner circle'
    : score >= 500 ? 'Hall of Famer'
    : score >= 330 ? 'Franchise legend, Hall of Very Good'
    : score >= 170 ? 'A long, proud big-league career'
    : 'A September call-up story to tell forever';
  const bullets = [
    `${c.seasons.length} seasons, ${c.rings} ring${c.rings === 1 ? '' : 's'}, ${c.mvpCys} ${c.pos === 'SP' ? 'Cy Young' : 'MVP'}${c.mvpCys === 1 ? '' : 's'}, ${c.allStars} All-Star nods`,
    c.pos === 'SP' ? `${t.wins} wins, ${t.so.toLocaleString()} strikeouts` : `${t.hr} home runs, ${t.rbi.toLocaleString()} RBI, ${t.sb} steals`,
    `${Math.round(c.earnings)}M career earnings, drafted pick ${c.draftPick}`,
  ];
  return { score, verdict, hof, bullets };
}
