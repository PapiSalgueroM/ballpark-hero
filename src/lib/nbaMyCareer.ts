/**
 * NBA My Career engine (2026-08-05). Basketball sibling of nflMyCareer.ts:
 * a fictional prospect living a whole career inside the real 30-team
 * league. Per-game stat lines (points, rebounds, assists) driven by
 * rating, role, health and team quality; one big decision per offseason;
 * awards, rings, aging, retirement, legacy verdict with GOAT-tier
 * language. The player is fictional; the teams are real.
 */

import { NBA_TEAMS } from '@/data/conquestDataNba';

export type NbaCareerPos = 'G' | 'F' | 'C';

export interface NbaArchetype {
  id: string;
  label: string;
  desc: string;
  ovrBoost: number;
  potBoost: number;
  durability: number;
  scoring: number;   // stat flavor multipliers
  playmaking: number;
  rebounding: number;
}

export const NBA_ARCHETYPES: Record<NbaCareerPos, NbaArchetype[]> = {
  G: [
    { id: 'bucket', label: 'Bucket Getter', desc: 'Shot creation from anywhere', ovrBoost: 3, potBoost: 4, durability: 0.9, scoring: 1.25, playmaking: 0.9, rebounding: 0.6 },
    { id: 'pointgod', label: 'Point God', desc: 'The offense runs through you', ovrBoost: 1, potBoost: 5, durability: 0.95, scoring: 0.85, playmaking: 1.5, rebounding: 0.6 },
    { id: 'twoway', label: 'Two-Way Menace', desc: 'Picks pockets, hits threes', ovrBoost: 2, potBoost: 4, durability: 1.0, scoring: 1.0, playmaking: 1.0, rebounding: 0.7 },
  ],
  F: [
    { id: 'alpha', label: 'Alpha Wing', desc: 'Face of the franchise scorer', ovrBoost: 3, potBoost: 4, durability: 0.9, scoring: 1.2, playmaking: 0.95, rebounding: 0.9 },
    { id: 'threed', label: '3-and-D Wing', desc: 'Corner threes and lockdowns', ovrBoost: 1, potBoost: 4, durability: 1.0, scoring: 0.85, playmaking: 0.7, rebounding: 0.9 },
    { id: 'pointforward', label: 'Point Forward', desc: 'Jumbo playmaker', ovrBoost: 2, potBoost: 5, durability: 0.9, scoring: 1.0, playmaking: 1.3, rebounding: 1.0 },
  ],
  C: [
    { id: 'paintbeast', label: 'Paint Beast', desc: 'Dunks, boards, blocks', ovrBoost: 3, potBoost: 3, durability: 0.85, scoring: 1.0, playmaking: 0.5, rebounding: 1.45 },
    { id: 'stretch', label: 'Stretch Five', desc: 'A center who lives at the arc', ovrBoost: 1, potBoost: 5, durability: 0.95, scoring: 1.05, playmaking: 0.7, rebounding: 1.1 },
    { id: 'anchor', label: 'Defensive Anchor', desc: 'DPOY ceilings, capped usage', ovrBoost: 2, potBoost: 4, durability: 0.95, scoring: 0.75, playmaking: 0.6, rebounding: 1.35 },
  ],
};

export interface NbaSeasonLine {
  year: number;
  team: string;
  age: number;
  ovr: number;
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
  awards: string[];
  teamResult: string;
  salary: number;
}

export interface NbaCareerState {
  name: string;
  pos: NbaCareerPos;
  archetype: NbaArchetype;
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
  seasons: NbaSeasonLine[];
  rings: number;
  mvps: number;
  allNbas: number;
  finalsMvps: number;
  retired: boolean;
  draftPick: number;
  earnings: number;
}

export interface NbaCareerEvent {
  id: string;
  title: string;
  body: string;
  options: { label: string; effect: string; apply: (c: NbaCareerState, rng: () => number) => string }[];
}

export function nbaTeamLabelOf(id: string): string {
  const t = NBA_TEAMS.find(x => x.id === id);
  return t ? `${t.city} ${t.name}` : id;
}

export function startNbaCareer(
  name: string, pos: NbaCareerPos, archetype: NbaArchetype, rng: () => number = Math.random,
): NbaCareerState {
  const base = 68 + Math.floor(rng() * 8) + archetype.ovrBoost;
  const pot = Math.min(99, base + 10 + Math.floor(rng() * 13) + archetype.potBoost);
  const stock = Math.max(1, Math.round(62 - (base - 66) * 5.5 + rng() * 22));
  const team = NBA_TEAMS[Math.floor(rng() * NBA_TEAMS.length)].id;
  const lottery = stock <= 14;
  return {
    name, pos, archetype, team,
    year: 2026, age: 19 + Math.floor(rng() * 3),
    ovr: base, pot,
    morale: 70, fanbase: lottery ? 60 : 35, health: 100,
    salary: lottery ? Math.round((16 - stock) * 0.7 + 6) : 2.5,
    contractYears: 4,
    seasons: [],
    rings: 0, mvps: 0, allNbas: 0, finalsMvps: 0,
    retired: false,
    draftPick: stock,
    earnings: 0,
  };
}

export function nbaRollTeamQuality(prev: number | null, rng: () => number): number {
  if (prev == null) return 70 + Math.floor(rng() * 20);
  return Math.max(64, Math.min(95, Math.round(prev + (rng() * 12 - 6))));
}

export function nbaMarketSalary(c: NbaCareerState): number {
  return Math.max(2.5, Math.round(((c.ovr - 66) * 2.3 - 6) * 10) / 10);
}

function gamesFor(c: NbaCareerState, rng: () => number): { games: number; note: string | null } {
  const risk = (1 - c.archetype.durability) * 0.5 + (100 - c.health) / 240;
  if (rng() < risk) {
    const missed = 8 + Math.floor(rng() * 35);
    return { games: Math.max(20, 82 - missed), note: `Missed ${missed} games hurt.` };
  }
  return { games: 78 + Math.floor(rng() * 5), note: null };
}

export function simNbaSeason(
  c: NbaCareerState, teamQuality: number, rng: () => number,
): { line: NbaSeasonLine; notes: string[] } {
  const notes: string[] = [];
  const { games, note } = gamesFor(c, rng);
  if (note) { notes.push(`🚑 ${note}`); c.health -= 7; }
  const form = c.ovr + (c.morale - 60) / 12 + (teamQuality - 78) / 8;
  const a = c.archetype;
  const ppg = Math.min(38, Math.max(4, Math.round((6 + (form - 64) * 0.82) * a.scoring + rng() * 3)));
  const rpg = Math.min(16, Math.max(1, Math.round(((2 + (form - 64) * 0.2) * a.rebounding + rng() * 2) * 10) / 10));
  const apg = Math.min(13, Math.max(0.5, Math.round(((1.5 + (form - 64) * 0.22) * a.playmaking + rng() * 2) * 10) / 10));
  const line: NbaSeasonLine = {
    year: c.year, team: c.team, age: c.age, ovr: c.ovr, games,
    ppg, rpg, apg, awards: [], teamResult: '', salary: c.salary,
  };

  const strength = teamQuality + (c.ovr - 78) * 0.5;
  const playoffOdds = Math.max(0.05, Math.min(0.92, (strength - 66) / 28));
  let result = 'Missed the playoffs';
  if (rng() < playoffOdds) {
    const stages = ['Lost in the first round', 'Lost in the conference semis', 'Lost the Conference Finals', 'Lost the NBA Finals', 'WON THE NBA FINALS'];
    let stage = 0;
    while (stage < 4 && rng() < 0.42 + (strength - 78) / 80) stage++;
    result = stages[stage];
    if (result === 'WON THE NBA FINALS') {
      c.rings += 1;
      c.fanbase = Math.min(100, c.fanbase + 15);
      notes.push('💍 A RING.');
      if (c.ovr >= 88 && rng() < 0.65) { line.awards.push('Finals MVP'); c.finalsMvps += 1; notes.push('🏆 FINALS MVP.'); }
    }
  }
  line.teamResult = result;

  const statScore = ppg * 1.6 + rpg * 1.4 + apg * 1.7;
  if (c.seasons.length === 0 && statScore > 42 && rng() < 0.72) { line.awards.push('Rookie of the Year'); notes.push('🏆 Rookie of the Year.'); }
  if (statScore > 62 && games >= 62) { line.awards.push('All-NBA'); c.allNbas += 1; notes.push('⭐ All-NBA.'); }
  if (statScore > 74 && games >= 62 && c.ovr >= 92 && rng() < 0.3) { line.awards.push('MVP'); c.mvps += 1; notes.push('👑 LEAGUE MVP.'); }

  c.earnings += c.salary;
  c.seasons.push(line);
  return { line, notes };
}

export function nbaProgress(c: NbaCareerState, rng: () => number): string[] {
  const notes: string[] = [];
  const before = c.ovr;
  if (c.age <= 25 && c.ovr < c.pot) c.ovr = Math.min(c.pot, c.ovr + 2 + Math.floor(rng() * 3));
  else if (c.age >= 32) {
    const wear = (100 - c.health) / 40;
    c.ovr = Math.max(62, Math.round(c.ovr - (1 + rng() * 2 + wear) * (c.age >= 36 ? 1.6 : 1)));
  }
  if (c.ovr - before >= 4) notes.push(`📈 Leap season: ${before} to ${c.ovr}.`);
  if (before - c.ovr >= 3) notes.push(`📉 Father Time checks in: ${before} to ${c.ovr}.`);
  if (c.age >= 31) c.health = Math.max(30, c.health - 3);
  c.age += 1;
  c.year += 1;
  c.contractYears -= 1;
  c.morale = Math.max(20, Math.min(100, c.morale + Math.round(rng() * 10 - 4)));
  return notes;
}

export function drawNbaEvent(c: NbaCareerState, rng: () => number): NbaCareerEvent {
  const deck: NbaCareerEvent[] = [];
  if (c.contractYears <= 0) {
    const market = nbaMarketSalary(c);
    deck.push({
      id: 'contract',
      title: 'Contract summer',
      body: `${nbaTeamLabelOf(c.team)} can offer ${Math.round(market * 0.9 * 10) / 10}M to stay. The open market says ${market}M somewhere new.`,
      options: [
        { label: 'Stay loyal', effect: 'Fanbase loves it', apply: (cc) => { cc.salary = Math.round(market * 0.9 * 10) / 10; cc.contractYears = 3; cc.fanbase = Math.min(100, cc.fanbase + 12); cc.morale += 6; return `Re-signed with ${nbaTeamLabelOf(cc.team)} for ${cc.salary}M x3.`; } },
        { label: 'Hit free agency', effect: 'Max money, new city', apply: (cc, r) => { const nt = NBA_TEAMS[Math.floor(r() * NBA_TEAMS.length)].id; cc.team = nt; cc.salary = market; cc.contractYears = 3; cc.fanbase = 42; return `Signed with ${nbaTeamLabelOf(nt)} for ${market}M x3. The decision gets its own show.`; } },
      ],
    });
  }
  deck.push({
    id: 'training',
    title: 'Summer plan',
    body: 'The offseason belongs to you. What gets the hours?',
    options: [
      { label: 'Skill grind', effect: 'Push the ceiling', apply: (cc, r) => { if (cc.age >= 31) { cc.health = Math.min(100, cc.health + 4); return 'Maintenance year. Health +4.'; } const up = 1 + Math.floor(r() * 2); cc.ovr = Math.min(cc.pot + 1, cc.ovr + up); return `Rating +${up}.`; } },
      { label: 'Body work', effect: 'Durability', apply: (cc) => { cc.health = Math.min(100, cc.health + 10); return 'Health +10. Load managed properly.'; } },
      { label: 'Build the brand', effect: 'Fame and money', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 12); cc.earnings += 5; return 'Signature shoe talks. 5M endorsement banked.'; } },
    ],
  });
  if (c.morale < 55) {
    deck.push({
      id: 'unhappy',
      title: 'The fit is broken',
      body: 'Losing, touches down, trade rumors everywhere.',
      options: [
        { label: 'Demand a trade', effect: 'Fresh start', apply: (cc, r) => { const nt = NBA_TEAMS[Math.floor(r() * NBA_TEAMS.length)].id; cc.team = nt; cc.morale = 74; cc.fanbase = 38; return `Traded to ${nbaTeamLabelOf(nt)}. New chapter.`; } },
        { label: 'Ride it out', effect: 'Respect', apply: (cc) => { cc.morale += 7; cc.fanbase += 4; return 'You stay professional. The league notices.'; } },
      ],
    });
  }
  if (c.health < 72) {
    deck.push({
      id: 'surgery',
      title: 'The knee conversation',
      body: 'A cleanup surgery costs the start of the season but resets the body.',
      options: [
        { label: 'Get the surgery', effect: 'Health back', apply: (cc) => { cc.health = Math.min(100, cc.health + 20); cc.morale -= 3; return 'Surgery done. Slow start, whole body.'; } },
        { label: 'Load management only', effect: 'Risk it', apply: (cc) => { cc.health -= 6; return 'You manage the minutes and cross your fingers.'; } },
      ],
    });
  }
  deck.push({
    id: 'media',
    title: 'Podcast wars',
    body: 'A famous show wants you to speak on the state of the league. Unfiltered.',
    options: [
      { label: 'Full honesty', effect: 'Viral fame', apply: (cc) => { cc.fanbase = Math.min(100, cc.fanbase + 10); cc.morale -= 3; return 'Clips everywhere. The front office is not thrilled.'; } },
      { label: 'Stay in the gym', effect: 'Locker room respect', apply: (cc) => { cc.morale += 4; return 'No distractions. Hooper answer.'; } },
    ],
  });
  return deck[Math.floor(rng() * deck.length)];
}

export function nbaShouldRetire(c: NbaCareerState): boolean {
  return c.ovr <= 66 || c.age >= 41 || c.seasons.length >= 21;
}

export interface NbaLegacy { score: number; verdict: string; hof: boolean; bullets: string[] }

export function nbaCareerTotals(c: NbaCareerState) {
  let pts = 0, reb = 0, ast = 0, games = 0;
  for (const s of c.seasons) {
    pts += s.ppg * s.games; reb += s.rpg * s.games; ast += s.apg * s.games; games += s.games;
  }
  return { pts: Math.round(pts), reb: Math.round(reb), ast: Math.round(ast), games };
}

export function nbaLegacyOf(c: NbaCareerState): NbaLegacy {
  const t = nbaCareerTotals(c);
  let score = c.rings * 95 + c.mvps * 120 + c.finalsMvps * 70 + c.allNbas * 40 + c.seasons.length * 8 + t.pts / 320;
  score = Math.round(score);
  const hof = score >= 500;
  const verdict = score >= 950 ? 'On the short list. The GOAT debate has your name in it'
    : score >= 650 ? 'First-ballot Hall of Famer, jersey in the rafters'
    : score >= 500 ? 'Hall of Famer'
    : score >= 330 ? 'Beloved star, Hall of Very Good'
    : score >= 170 ? 'A long, real NBA career'
    : 'Ten-day contracts and what-ifs';
  const bullets = [
    `${c.seasons.length} seasons, ${c.rings} ring${c.rings === 1 ? '' : 's'}, ${c.mvps} MVP${c.mvps === 1 ? '' : 's'}, ${c.finalsMvps} Finals MVP${c.finalsMvps === 1 ? '' : 's'}, ${c.allNbas} All-NBA`,
    `${t.pts.toLocaleString()} points, ${t.reb.toLocaleString()} rebounds, ${t.ast.toLocaleString()} assists in ${t.games} games`,
    `${Math.round(c.earnings)}M career earnings, drafted pick ${c.draftPick}`,
  ];
  return { score, verdict, hof, bullets };
}
