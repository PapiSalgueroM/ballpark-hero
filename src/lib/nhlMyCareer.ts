/**
 * NHL My Career engine (2026-08-05). Hockey sibling of nflMyCareer.ts:
 * a fictional prospect living a whole career inside the real 32-team
 * league. Season lines (G-A-P for skaters, W/SV% for goalies) driven by
 * rating, health and team quality; one big decision per offseason;
 * awards, Cups, aging, retirement, legacy verdict. The player is
 * fictional; the teams are real.
 */

import { NHL_TEAMS } from '@/data/conquestDataNhl';

export type NhlCareerPos = 'C' | 'W' | 'D' | 'G';

export interface NhlArchetype {
  id: string;
  label: string;
  desc: string;
  ovrBoost: number;
  potBoost: number;
  durability: number;
  scoringMult: number;
}

export const NHL_ARCHETYPES: Record<NhlCareerPos, NhlArchetype[]> = {
  C: [
    { id: 'generational', label: 'Generational Talent', desc: 'The hype since you were 14', ovrBoost: 4, potBoost: 5, durability: 0.9, scoringMult: 1.25 },
    { id: 'twoway', label: 'Two-Way Center', desc: 'Selke ceilings, coach in skates', ovrBoost: 1, potBoost: 4, durability: 1.0, scoringMult: 0.85 },
    { id: 'power', label: 'Power Center', desc: 'Net-front nightmare', ovrBoost: 2, potBoost: 4, durability: 0.85, scoringMult: 1.0 },
  ],
  W: [
    { id: 'sniper', label: 'Sniper', desc: 'One-timer from the circle, lights out', ovrBoost: 3, potBoost: 4, durability: 0.9, scoringMult: 1.3 },
    { id: 'powerforward', label: 'Power Forward', desc: 'Through you, not around you', ovrBoost: 2, potBoost: 4, durability: 0.8, scoringMult: 1.05 },
    { id: 'playmaker', label: 'Playmaking Winger', desc: 'Sees plays before they exist', ovrBoost: 1, potBoost: 5, durability: 0.95, scoringMult: 1.1 },
  ],
  D: [
    { id: 'offensive', label: 'Offensive Defenseman', desc: 'Norris numbers from the blue line', ovrBoost: 2, potBoost: 5, durability: 0.9, scoringMult: 0.75 },
    { id: 'shutdown', label: 'Shutdown Pair', desc: 'Stars hate your zip code', ovrBoost: 1, potBoost: 4, durability: 0.95, scoringMult: 0.4 },
    { id: 'complete', label: 'Complete Defenseman', desc: 'Thirty minutes a night', ovrBoost: 3, potBoost: 4, durability: 0.9, scoringMult: 0.6 },
  ],
  G: [
    { id: 'acrobat', label: 'The Acrobat', desc: 'Highlight saves nightly', ovrBoost: 2, potBoost: 4, durability: 0.9, scoringMult: 0 },
    { id: 'calm', label: 'The Statue', desc: 'Position, angles, boredom, wins', ovrBoost: 1, potBoost: 5, durability: 1.0, scoringMult: 0 },
    { id: 'athlete', label: 'The Athlete', desc: 'Six-four and moves like a cat', ovrBoost: 3, potBoost: 4, durability: 0.95, scoringMult: 0 },
  ],
};

export interface NhlSeasonLine {
  year: number;
  team: string;
  age: number;
  ovr: number;
  games: number;
  goals?: number; assists?: number; points?: number;
  wins?: number; svpct?: number;
  awards: string[];
  teamResult: string;
  salary: number;
}

export interface NhlCareerState {
  name: string;
  pos: NhlCareerPos;
  archetype: NhlArchetype;
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
  seasons: NhlSeasonLine[];
  cups: number;
  harts: number;      // Hart / Vezina / Norris majors, position-appropriate
  allStars: number;
  connSmythes: number;
  retired: boolean;
  draftPick: number;
  earnings: number;
}

export interface NhlCareerEvent {
  id: string;
  title: string;
  body: string;
  options: { label: string; effect: string; apply: (c: NhlCareerState, rng: () => number) => string }[];
}

export function nhlTeamLabelOf(id: string): string {
  const t = NHL_TEAMS.find(x => x.id === id);
  return t ? `${t.city} ${t.name}` : id;
}

export function majorAwardName(pos: NhlCareerPos): string {
  return pos === 'G' ? 'Vezina' : pos === 'D' ? 'Norris' : 'Hart';
}

export function startNhlCareer(
  name: string, pos: NhlCareerPos, archetype: NhlArchetype, rng: () => number = Math.random,
): NhlCareerState {
  const base = 66 + Math.floor(rng() * 8) + archetype.ovrBoost;
  const pot = Math.min(99, base + 11 + Math.floor(rng() * 13) + archetype.potBoost);
  const stock = Math.max(1, Math.round(50 - (base - 64) * 4.5 + rng() * 24));
  const team = NHL_TEAMS[Math.floor(rng() * NHL_TEAMS.length)].id;
  return {
    name, pos, archetype, team,
    year: 2026, age: 18 + Math.floor(rng() * 2),
    ovr: base, pot,
    morale: 70, fanbase: stock <= 10 ? 55 : 32, health: 100,
    salary: stock <= 10 ? 3.5 : 0.9,
    contractYears: 3,
    seasons: [],
    cups: 0, harts: 0, allStars: 0, connSmythes: 0,
    retired: false,
    draftPick: stock,
    earnings: 0,
  };
}

export function nhlRollTeamQuality(prev: number | null, rng: () => number): number {
  if (prev == null) return 70 + Math.floor(rng() * 20);
  return Math.max(64, Math.min(95, Math.round(prev + (rng() * 12 - 6))));
}

export function nhlMarketSalary(c: NhlCareerState): number {
  return Math.max(1, Math.round(((c.ovr - 66) * 0.62 - 1) * 10) / 10);
}

function gamesFor(c: NhlCareerState, rng: () => number): { games: number; note: string | null } {
  const risk = (1 - c.archetype.durability) * 0.5 + (100 - c.health) / 250;
  const full = c.pos === 'G' ? 58 + Math.floor(rng() * 10) : 79 + Math.floor(rng() * 4);
  if (rng() < risk) {
    const frac = 0.45 + rng() * 0.35;
    return { games: Math.max(20, Math.round(full * frac)), note: 'Injuries bit into the season.' };
  }
  return { games: full, note: null };
}

export function simNhlSeason(
  c: NhlCareerState, teamQuality: number, rng: () => number,
): { line: NhlSeasonLine; notes: string[] } {
  const notes: string[] = [];
  const { games, note } = gamesFor(c, rng);
  if (note) { notes.push(`🚑 ${note}`); c.health -= 7; }
  const form = c.ovr + (c.morale - 60) / 12 + (teamQuality - 78) / 9;
  const line: NhlSeasonLine = {
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games,
    awards: [], teamResult: '', salary: c.salary,
  };
  if (c.pos === 'G') {
    line.wins = Math.max(8, Math.round(games * (0.3 + (form - 64) * 0.009) + rng() * 4));
    line.svpct = Math.min(0.938, Math.max(0.885, Math.round((0.898 + (form - 64) * 0.0011 + rng() * 0.006) * 1000) / 1000));
  } else {
    const g = games / 82;
    const mult = c.archetype.scoringMult;
    line.goals = Math.min(72, Math.max(1, Math.round((4 + (form - 62) * 1.35) * mult * g + rng() * 5)));
    line.assists = Math.min(90, Math.max(2, Math.round((7 + (form - 62) * 1.5) * (c.pos === 'D' ? 1.15 : 1.05 - (mult - 1) * 0.5) * g + rng() * 7)));
    line.points = (line.goals ?? 0) + (line.assists ?? 0);
  }

  const strength = teamQuality + (c.ovr - 76) * 0.4;
  const playoffOdds = Math.max(0.05, Math.min(0.9, (strength - 66) / 28));
  let result = 'Missed the playoffs';
  if (rng() < playoffOdds) {
    const stages = ['Lost in Round 1', 'Lost in Round 2', 'Lost the Conference Final', 'Lost the Cup Final', 'WON THE STANLEY CUP'];
    let stage = 0;
    while (stage < 4 && rng() < 0.42 + (strength - 78) / 85) stage++;
    result = stages[stage];
    if (result === 'WON THE STANLEY CUP') {
      c.cups += 1;
      c.fanbase = Math.min(100, c.fanbase + 15);
      notes.push('🏆 THE CUP. Your day with it is coming.');
      if (c.ovr >= 88 && rng() < 0.5) { line.awards.push('Conn Smythe'); c.connSmythes += 1; notes.push('🏆 CONN SMYTHE.'); }
    }
  }
  line.teamResult = result;

  const statScore = c.pos === 'G'
    ? (line.wins ?? 0) * 1.8 + Math.max(0, ((line.svpct ?? 0.9) - 0.9) * 2400)
    : (line.points ?? 0) * (c.pos === 'D' ? 1.35 : 1);
  if (c.seasons.length === 0 && statScore > 48 && rng() < 0.72) { line.awards.push('Calder Trophy'); notes.push('🏆 Calder Trophy.'); }
  if (statScore > 82) { line.awards.push('All-Star'); c.allStars += 1; notes.push('⭐ All-Star.'); }
  if (statScore > 105 && c.ovr >= 91 && rng() < 0.3) {
    const award = majorAwardName(c.pos);
    line.awards.push(award); c.harts += 1; notes.push(`👑 THE ${award.toUpperCase()}.`);
  }

  c.earnings += c.salary;
  c.seasons.push(line);
  return { line, notes };
}

export function nhlProgress(c: NhlCareerState, rng: () => number): string[] {
  const notes: string[] = [];
  const before = c.ovr;
  if (c.age <= 25 && c.ovr < c.pot) c.ovr = Math.min(c.pot, c.ovr + 2 + Math.floor(rng() * 3));
  else if (c.age >= (c.pos === 'G' ? 34 : 31)) {
    const wear = (100 - c.health) / 40;
    c.ovr = Math.max(60, Math.round(c.ovr - (1 + rng() * 2 + wear) * (c.age >= 37 ? 1.5 : 1)));
  }
  if (c.ovr - before >= 4) notes.push(`📈 The leap: ${before} to ${c.ovr}.`);
  if (before - c.ovr >= 3) notes.push(`📉 The legs go first: ${before} to ${c.ovr}.`);
  if (c.age >= 31) c.health = Math.max(30, c.health - 3);
  c.age += 1;
  c.year += 1;
  c.contractYears -= 1;
  c.morale = Math.max(20, Math.min(100, c.morale + Math.round(rng() * 10 - 4)));
  return notes;
}

export function drawNhlEvent(c: NhlCareerState, rng: () => number): NhlCareerEvent {
  const deck: NhlCareerEvent[] = [];
  if (c.contractYears <= 0) {
    const market = nhlMarketSalary(c);
    deck.push({
      id: 'contract',
      title: 'Contract talks',
      body: `${nhlTeamLabelOf(c.team)} table ${Math.round(market * 0.88 * 10) / 10}M a year. July 1 could bring ${market}M somewhere else.`,
      options: [
        { label: 'Stay and build it here', effect: 'Loyalty', apply: (cc) => { cc.salary = Math.round(market * 0.88 * 10) / 10; cc.contractYears = 4; cc.fanbase = Math.min(100, cc.fanbase + 12); cc.morale += 6; return `Re-signed with ${nhlTeamLabelOf(cc.team)} for ${cc.salary}M x4.`; } },
        { label: 'Go to market', effect: 'Top dollar', apply: (cc, r) => { const nt = NHL_TEAMS[Math.floor(r() * NHL_TEAMS.length)].id; cc.team = nt; cc.salary = market; cc.contractYears = 4; cc.fanbase = 40; return `Signed with ${nhlTeamLabelOf(nt)} for ${market}M x4. July 1 fireworks.`; } },
      ],
    });
  }
  deck.push({
    id: 'training',
    title: 'Summer plan',
    body: 'The lake house or the gym. Where does the summer go?',
    options: [
      { label: 'Skills coach', effect: 'Push the ceiling', apply: (cc, r) => { if (cc.age >= 31) { cc.health = Math.min(100, cc.health + 4); return 'Maintenance summer. Health +4.'; } const up = 1 + Math.floor(r() * 2); cc.ovr = Math.min(cc.pot + 1, cc.ovr + up); return `Rating +${up}.`; } },
      { label: 'Strength block', effect: 'Durability', apply: (cc) => { cc.health = Math.min(100, cc.health + 10); return 'Health +10. Built for April through June.'; } },
      { label: 'The content summer', effect: 'Fame', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 12); cc.earnings += 2; return 'Golf videos and a doc crew. 2M banked.'; } },
    ],
  });
  if (c.morale < 55) {
    deck.push({
      id: 'unhappy',
      title: 'It is not working here',
      body: 'The system, the minutes, the losing. Your agent is on the phone.',
      options: [
        { label: 'Request a trade', effect: 'Fresh sheet of ice', apply: (cc, r) => { const nt = NHL_TEAMS[Math.floor(r() * NHL_TEAMS.length)].id; cc.team = nt; cc.morale = 74; cc.fanbase = 38; return `Traded to ${nhlTeamLabelOf(nt)}.`; } },
        { label: 'Say nothing, work', effect: 'Room respect', apply: (cc) => { cc.morale += 7; cc.fanbase += 4; return 'Heads down. The room respects it.'; } },
      ],
    });
  }
  deck.push({
    id: 'media',
    title: 'The spicy podcast',
    body: 'A player-run podcast wants your unfiltered thoughts on the league.',
    options: [
      { label: 'Chirp away', effect: 'Viral', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 10); cc.morale -= 3; return 'The clips rip around the league group chats.'; } },
      { label: 'Keep it boring', effect: 'Respect', apply: (cc) => { cc.morale += 4; return 'Good clip, no headlines. Hockey answer.'; } },
    ],
  });
  return deck[Math.floor(rng() * deck.length)];
}

export function nhlShouldRetire(c: NhlCareerState): boolean {
  return c.ovr <= 63 || c.age >= (c.pos === 'G' ? 41 : 40) || c.seasons.length >= 22;
}

export interface NhlLegacy { score: number; verdict: string; hof: boolean; bullets: string[] }

export function nhlCareerTotals(c: NhlCareerState) {
  let goals = 0, assists = 0, points = 0, wins = 0, games = 0;
  for (const s of c.seasons) {
    goals += s.goals ?? 0; assists += s.assists ?? 0; points += s.points ?? 0; wins += s.wins ?? 0; games += s.games;
  }
  return { goals, assists, points, wins, games };
}

export function nhlLegacyOf(c: NhlCareerState): NhlLegacy {
  const t = nhlCareerTotals(c);
  let score = c.cups * 85 + c.harts * 95 + c.connSmythes * 60 + c.allStars * 26 + c.seasons.length * 8;
  score += c.pos === 'G' ? t.wins / 3.2 : t.points / 9;
  score = Math.round(score);
  const hof = score >= 500;
  const verdict = score >= 900 ? 'Rushmore of the sport, the debate is over'
    : score >= 500 ? 'Hockey Hall of Famer'
    : score >= 330 ? 'Franchise icon, Hall of Very Good'
    : score >= 170 ? 'A long, honest NHL career'
    : 'A cup of coffee and a great story';
  const bullets = [
    `${c.seasons.length} seasons, ${c.cups} Cup${c.cups === 1 ? '' : 's'}, ${c.harts} ${majorAwardName(c.pos)}${c.harts === 1 ? '' : 's'}, ${c.connSmythes} Conn Smythe${c.connSmythes === 1 ? '' : 's'}, ${c.allStars} All-Star nods`,
    c.pos === 'G' ? `${t.wins} wins in ${t.games} games` : `${t.goals} goals, ${t.assists} assists, ${t.points} points in ${t.games} games`,
    `${Math.round(c.earnings)}M career earnings, drafted pick ${c.draftPick}`,
  ];
  return { score, verdict, hof, bullets };
}
