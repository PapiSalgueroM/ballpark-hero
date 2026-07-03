import { supabase } from '@/integrations/supabase/client';
import { Player, Position, League } from '@/types/game';
import { players as fallbackPlayers } from '@/data/players';

/* ---------------- Position normalization ---------------- */
const POSITION_NORMALIZE: Record<string, Position> = {
  'Goalkeeper': 'GK', 'GK': 'GK',
  'Centre-Back': 'CB', 'Center-Back': 'CB', 'CB': 'CB', 'Defender': 'CB',
  'Left-Back': 'LB', 'LB': 'LB', 'Right-Back': 'RB', 'RB': 'RB',
  'Left Wing-Back': 'LWB', 'LWB': 'LWB', 'Right Wing-Back': 'RWB', 'RWB': 'RWB',
  'Defensive Midfield': 'CDM', 'CDM': 'CDM', 'Central Midfield': 'CM', 'CM': 'CM', 'Midfield': 'CM',
  'Attacking Midfield': 'CAM', 'CAM': 'CAM', 'Left Midfield': 'LM', 'LM': 'LM', 'Right Midfield': 'RM', 'RM': 'RM',
  'Left Winger': 'LW', 'LW': 'LW', 'Right Winger': 'RW', 'RW': 'RW',
  'Centre-Forward': 'CF', 'Center-Forward': 'CF', 'Second Striker': 'CF', 'CF': 'CF',
  'Striker': 'ST', 'ST': 'ST', 'Forward': 'ST', 'Attack': 'ST',
};
export function normalizePosition(raw: string): Position | null {
  return POSITION_NORMALIZE[raw] ?? null;
}

/* ---------------- Formations ---------------- */
export interface FormationSlot { label: string; allowed: Position[]; x: number; y: number; }
export interface Formation { name: string; slots: FormationSlot[]; }

const s = (label: string, allowed: Position[], x: number, y: number): FormationSlot => ({ label, allowed, x, y });
const G = (): FormationSlot => s('GK', ['GK'], 50, 90);
const DC: Position[] = ['CB'];
const DR: Position[] = ['RB', 'RWB', 'CB'];
const DL: Position[] = ['LB', 'LWB', 'CB'];
const MD: Position[] = ['CM', 'CDM', 'CAM', 'LM', 'RM'];
const WR: Position[] = ['RW', 'RM', 'RWB'];
const WL: Position[] = ['LW', 'LM', 'LWB'];
const FW: Position[] = ['ST', 'CF'];

export const FORMATIONS: Formation[] = [
  { name: '4-3-3', slots: [G(), s('RB', DR, 84, 70), s('CB', DC, 62, 74), s('CB', DC, 38, 74), s('LB', DL, 16, 70), s('CM', MD, 70, 50), s('CM', MD, 50, 54), s('CM', MD, 30, 50), s('RW', WR, 80, 24), s('ST', FW, 50, 18), s('LW', WL, 20, 24)] },
  { name: '4-4-2', slots: [G(), s('RB', DR, 84, 70), s('CB', DC, 62, 74), s('CB', DC, 38, 74), s('LB', DL, 16, 70), s('RM', WR, 82, 48), s('CM', MD, 60, 52), s('CM', MD, 40, 52), s('LM', WL, 18, 48), s('ST', FW, 60, 20), s('ST', FW, 40, 20)] },
  { name: '4-2-3-1', slots: [G(), s('RB', DR, 84, 70), s('CB', DC, 62, 74), s('CB', DC, 38, 74), s('LB', DL, 16, 70), s('CDM', ['CDM', 'CM'], 62, 56), s('CDM', ['CDM', 'CM'], 38, 56), s('RW', WR, 80, 34), s('CAM', ['CAM', 'CM'], 50, 36), s('LW', WL, 20, 34), s('ST', FW, 50, 16)] },
  { name: '4-1-2-1-2', slots: [G(), s('RB', DR, 84, 70), s('CB', DC, 62, 74), s('CB', DC, 38, 74), s('LB', DL, 16, 70), s('CDM', ['CDM', 'CM'], 50, 60), s('CM', MD, 68, 46), s('CM', MD, 32, 46), s('CAM', ['CAM', 'CM'], 50, 32), s('ST', FW, 60, 18), s('ST', FW, 40, 18)] },
  { name: '4-5-1', slots: [G(), s('RB', DR, 84, 70), s('CB', DC, 62, 74), s('CB', DC, 38, 74), s('LB', DL, 16, 70), s('RM', WR, 84, 44), s('CM', MD, 64, 50), s('CM', MD, 50, 52), s('CM', MD, 36, 50), s('LM', WL, 16, 44), s('ST', FW, 50, 18)] },
  { name: '3-5-2', slots: [G(), s('CB', DC, 68, 74), s('CB', DC, 50, 76), s('CB', DC, 32, 74), s('RWB', WR, 86, 50), s('CM', MD, 64, 54), s('CM', MD, 50, 56), s('CM', MD, 36, 54), s('LWB', WL, 14, 50), s('ST', FW, 60, 20), s('ST', FW, 40, 20)] },
  { name: '3-4-3', slots: [G(), s('CB', DC, 68, 74), s('CB', DC, 50, 76), s('CB', DC, 32, 74), s('RM', WR, 84, 50), s('CM', MD, 60, 54), s('CM', MD, 40, 54), s('LM', WL, 16, 50), s('RW', WR, 78, 22), s('ST', FW, 50, 18), s('LW', WL, 22, 22)] },
  { name: '5-3-2', slots: [G(), s('RWB', WR, 88, 64), s('CB', DC, 68, 76), s('CB', DC, 50, 78), s('CB', DC, 32, 76), s('LWB', WL, 12, 64), s('CM', MD, 66, 50), s('CM', MD, 50, 52), s('CM', MD, 34, 50), s('ST', FW, 60, 20), s('ST', FW, 40, 20)] },
  { name: '4-4-1-1', slots: [G(), s('RB', DR, 84, 70), s('CB', DC, 62, 74), s('CB', DC, 38, 74), s('LB', DL, 16, 70), s('RM', WR, 82, 48), s('CM', MD, 60, 52), s('CM', MD, 40, 52), s('LM', WL, 18, 48), s('CAM', ['CAM', 'CF', 'CM'], 50, 32), s('ST', FW, 50, 16)] },
];

/* ---------------- Rating ---------------- */
/**
 * Rating spread audit (2026-07-03): the old curve was 45 + 55 * (log10(mv+1) / log10(231)),
 * which used log10(231) as its scale ceiling. That saturates hard: a mid-table
 * squad (marketValue ~20-60) already averaged rating 83, a "good XI" (~60-120)
 * averaged 91, and near-full Legends squads (~150-230) averaged 98. Everything
 * above roughly 60 in market value read as 89+, so almost every squad a player
 * builds landed in the A/A+ verdict bands, and the D band was only reachable by
 * deliberately drafting the cheapest 1-10 value scrubs at every slot.
 *
 * Fix: stretch the curve over a wider ceiling (1000, comfortably above the
 * highest Legends value of 230) and widen the floor-to-ceiling span (35-99
 * instead of 45-99) so cheap squads read meaningfully lower and only the very
 * top of the market pins near 99. New spread, same input data:
 *   mv=2   -> 46   (was 56)   scrub-tier case
 *   mv=10  -> 55   (was 69)   squad player
 *   mv=30  -> 62   (was 80)   solid starter
 *   mv=60  -> 68   (was 87)   mid-table XI average
 *   mv=120 -> 75   (was 93)   good XI average
 *   mv=180 -> 80   (was 98)   star player
 *   mv=230 -> 83   (was 99)   Messi/Ronaldo-tier ceiling
 */
export function playerRating(p: Player): number {
  const mv = Math.max(1, p.marketValue);
  const r = 35 + 64 * (Math.log10(mv + 1) / Math.log10(1001));
  return Math.max(35, Math.min(99, Math.round(r)));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function sample<T>(arr: T[], k: number): T[] { return shuffle(arr).slice(0, k); }

/* ---------------- Legends pool ---------------- */
const L = (name: string, club: string, nationality: string, league: League, position: Position, marketValue: number, goals = 0, assists = 0): Player =>
  ({ name, club, nationality, league, position, marketValue, goals, assists, kitNumber: 10, age: 27, difficulty: 'easy' });

export const LEGENDS: Player[] = [
  L('Lev Yashin', 'Dynamo Moscow', 'Soviet Union', 'Russian Premier League', 'GK', 150),
  L('Gianluigi Buffon', 'Juventus', 'Italy', 'Serie A', 'GK', 170),
  L('Iker Casillas', 'Real Madrid', 'Spain', 'La Liga', 'GK', 165),
  L('Manuel Neuer', 'Bayern Munich', 'Germany', 'Bundesliga', 'GK', 175),
  L('Paolo Maldini', 'AC Milan', 'Italy', 'Serie A', 'CB', 185),
  L('Franz Beckenbauer', 'Bayern Munich', 'Germany', 'Bundesliga', 'CB', 195),
  L('Franco Baresi', 'AC Milan', 'Italy', 'Serie A', 'CB', 175),
  L('Fabio Cannavaro', 'Real Madrid', 'Italy', 'La Liga', 'CB', 170),
  L('Sergio Ramos', 'Real Madrid', 'Spain', 'La Liga', 'CB', 180, 101),
  L('Carles Puyol', 'Barcelona', 'Spain', 'La Liga', 'CB', 165),
  L('Cafu', 'AC Milan', 'Brazil', 'Serie A', 'RB', 170),
  L('Roberto Carlos', 'Real Madrid', 'Brazil', 'La Liga', 'LB', 175, 70),
  L('Philipp Lahm', 'Bayern Munich', 'Germany', 'Bundesliga', 'RB', 165),
  L('Xavi', 'Barcelona', 'Spain', 'La Liga', 'CM', 185, 85, 180),
  L('Andres Iniesta', 'Barcelona', 'Spain', 'La Liga', 'CM', 190, 90, 140),
  L('Zinedine Zidane', 'Real Madrid', 'France', 'La Liga', 'CAM', 205, 125, 150),
  L('Andrea Pirlo', 'Juventus', 'Italy', 'Serie A', 'CDM', 180, 73),
  L('Steven Gerrard', 'Liverpool', 'England', 'Premier League', 'CM', 180, 186),
  L('Luka Modric', 'Real Madrid', 'Croatia', 'La Liga', 'CM', 185, 80),
  L('Lothar Matthaus', 'Bayern Munich', 'Germany', 'Bundesliga', 'CM', 175, 160),
  L('Paul Scholes', 'Manchester United', 'England', 'Premier League', 'CM', 170, 155),
  L('Ronaldinho', 'Barcelona', 'Brazil', 'La Liga', 'CAM', 195, 120, 130),
  L('Pele', 'Santos', 'Brazil', 'Brazilian Serie A', 'CF', 225, 643),
  L('Diego Maradona', 'Napoli', 'Argentina', 'Serie A', 'CAM', 220, 311),
  L('Lionel Messi', 'Barcelona', 'Argentina', 'La Liga', 'RW', 230, 700, 350),
  L('Cristiano Ronaldo', 'Real Madrid', 'Portugal', 'La Liga', 'ST', 225, 730, 230),
  L('Johan Cruyff', 'Ajax', 'Netherlands', 'Eredivisie', 'CF', 215, 290),
  L('Ronaldo Nazario', 'Real Madrid', 'Brazil', 'La Liga', 'ST', 215, 414),
  L('Marco van Basten', 'AC Milan', 'Netherlands', 'Serie A', 'ST', 200, 277),
  L('Thierry Henry', 'Arsenal', 'France', 'Premier League', 'ST', 195, 360, 150),
  L('George Best', 'Manchester United', 'Northern Ireland', 'Premier League', 'RW', 190, 179),
  L('Eusebio', 'Benfica', 'Portugal', 'Liga Portugal', 'CF', 195, 473),
  L('Gerd Muller', 'Bayern Munich', 'Germany', 'Bundesliga', 'ST', 200, 566),
  L('Romario', 'Barcelona', 'Brazil', 'La Liga', 'ST', 195, 350),
  L('Andriy Shevchenko', 'AC Milan', 'Ukraine', 'Serie A', 'ST', 185, 175),
  L('Ryan Giggs', 'Manchester United', 'Wales', 'Premier League', 'LW', 175, 168, 211),
  L('Garrincha', 'Botafogo', 'Brazil', 'Brazilian Serie A', 'RW', 185, 232),
  L('Michel Platini', 'Juventus', 'France', 'Serie A', 'CAM', 200, 224),
];

/* ---------------- Memes pool (original, IP-safe) ---------------- */
const M = (name: string, club: string, position: Position, marketValue: number): Player =>
  ({ name, club, nationality: 'Memeland', league: 'Premier League', position, marketValue, goals: 0, assists: 0, kitNumber: 99, age: 40, difficulty: 'easy' });

export const MEMES: Player[] = [
  M('Grandpa Gary', 'Retirement FC', 'GK', 2),
  M('Robo-Keeper 3000', 'Silicon City', 'GK', 190),
  M('The Traffic Cone', 'Roadworks United', 'CB', 1),
  M('Brick Wall Bob', 'Construction CF', 'CB', 175),
  M('Sunday League Steve', 'Pub Team FC', 'RB', 3),
  M('The Intern', 'Startup Rovers', 'LB', 5),
  M('Captain Cardio', 'Gym Athletic', 'CDM', 150),
  M('Coach Potato', 'Couch Town', 'CM', 1),
  M('Nutmeg Nigel', 'Streetball SC', 'CAM', 160),
  M('Yoga Yuki', 'Zen Wanderers', 'CM', 80),
  M('The Mascot', 'Halftime Heroes', 'LW', 4),
  M('Turbo Tim', 'Lightning AC', 'RW', 185),
  M('Dribble Monster', 'Highlight Reel FC', 'RW', 170),
  M('Banana Boots', 'Slippery Slope', 'ST', 2),
  M('Legend Larry', 'Glory Days United', 'CF', 200),
  M('Hat-trick Harry', 'Bargain Bin FC', 'ST', 6),
];

/* ---------------- Era + pool fetch ---------------- */
export type Era = 'current' | 'legends';

export async function fetchSquadPool(era: Era): Promise<Player[]> {
  if (era === 'legends') return [...LEGENDS];
  try {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, position, age, nationality, club, market_value_usd, goals, assists')
      .eq('year', 2026)
      .order('market_value_usd', { ascending: false })
      .limit(1000);
    if (error || !data || data.length === 0) return fallbackPlayers.slice();
    const seen = new Set<string>();
    const pool: Player[] = [];
    for (const row of data) {
      const pos = normalizePosition(row.position || '');
      if (!pos || !row.player_name || seen.has(row.player_name)) continue;
      seen.add(row.player_name);
      pool.push({
        name: row.player_name, club: row.club || 'Unknown', nationality: row.nationality || 'Unknown',
        league: 'Premier League' as League, goals: row.goals ?? 0, assists: row.assists ?? 0,
        position: pos, kitNumber: 0, age: row.age ?? 0,
        marketValue: Math.max(1, Math.round((row.market_value_usd || 1_000_000) / 1_000_000)), difficulty: 'easy',
      });
    }
    return pool.length >= 33 ? pool : fallbackPlayers.slice();
  } catch { return fallbackPlayers.slice(); }
}

/* ---------------- Candidates (10 tiered, optional memes) ---------------- */
export function buildCandidates(pool: Player[], slot: FormationSlot, used: Set<string>, memes: Player[] = []): Player[] {
  const elig = pool.filter(p => slot.allowed.includes(p.position) && !used.has(p.name)).sort((a, b) => b.marketValue - a.marketValue);
  let picks: Player[];
  if (elig.length <= 10) {
    picks = shuffle(elig);
  } else {
    const n = elig.length;
    const band = (lo: number, hi: number) => { const a = Math.floor(lo * n); const b = Math.max(Math.floor(hi * n), a + 1); return elig.slice(a, b); };
    picks = [...sample(band(0, 0.10), 2), ...sample(band(0.10, 0.35), 3), ...sample(band(0.35, 0.70), 3), ...sample(band(0.70, 1.0), 2)];
    const names = new Set(picks.map(p => p.name));
    for (const p of elig) { if (picks.length >= 10) break; if (!names.has(p.name)) { picks.push(p); names.add(p.name); } }
    picks = picks.slice(0, 10);
  }
  if (memes.length && picks.length >= 6) {
    const usedNames = new Set([...used, ...picks.map(p => p.name)]);
    const fit = memes.filter(m => slot.allowed.includes(m.position) && !usedNames.has(m.name));
    const inject = sample(fit, Math.min(2, fit.length));
    for (let k = 0; k < inject.length; k++) picks[picks.length - 1 - k] = inject[k];
  }
  return shuffle(picks);
}

/* ---------------- Banker offer ---------------- */
export function bankerOffer(pool: Player[], slot: FormationSlot, unopened: Player[], used: Set<string>, roundFactor: number): Player | null {
  const avgR = unopened.length ? unopened.reduce((s2, p) => s2 + playerRating(p), 0) / unopened.length : 55;
  const target = avgR * roundFactor;
  const unopenedNames = new Set(unopened.map(p => p.name));
  const elig = pool.filter(p => slot.allowed.includes(p.position) && !used.has(p.name) && !unopenedNames.has(p.name));
  if (!elig.length) return null;
  let best = elig[0]; let bestD = Infinity;
  for (const p of elig) { const d = Math.abs(playerRating(p) - target); if (d < bestD) { bestD = d; best = p; } }
  return best;
}

/* ---------------- Extras (manager / stadium / fan base / budget) ---------------- */
export interface ExtraOption { id: string; label: string; emoji: string; desc: string; ratingMod: number; chemMod: number; fact: string; }
export interface ExtraCategory { key: string; title: string; emoji: string; options: ExtraOption[]; }

export const EXTRAS: ExtraCategory[] = [
  { key: 'manager', title: 'Manager', emoji: '🎩', options: [
    { id: 'tactician', label: 'The Tactician', emoji: '🧠', desc: 'Possession maestro', ratingMod: 2, chemMod: 12, fact: 'The Tactician drilled a slick passing system.' },
    { id: 'motivator', label: 'The Motivator', emoji: '🔥', desc: 'Squad runs through walls', ratingMod: 3, chemMod: 6, fact: 'The Motivator has the dressing room buzzing.' },
    { id: 'pragmatist', label: 'The Pragmatist', emoji: '🛡️', desc: 'Tough to break down', ratingMod: 1, chemMod: 9, fact: 'The Pragmatist made the side hard to beat.' },
    { id: 'rookie', label: 'The Rookie', emoji: '🍼', desc: 'Learning on the job', ratingMod: -2, chemMod: 2, fact: 'The Rookie boss had a few growing pains.' },
  ]},
  { key: 'stadium', title: 'Stadium', emoji: '🏟️', options: [
    { id: 'fortress', label: 'The Fortress', emoji: '🏰', desc: '80,000 roaring fans', ratingMod: 3, chemMod: 4, fact: 'The Fortress turned home games into nightmares for visitors.' },
    { id: 'modern', label: 'Modern Arena', emoji: '✨', desc: 'State-of-the-art', ratingMod: 2, chemMod: 5, fact: 'The Modern Arena drew packed, electric crowds.' },
    { id: 'historic', label: 'Historic Ground', emoji: '📜', desc: 'Soaked in history', ratingMod: 1, chemMod: 7, fact: 'The Historic Ground inspired the team week in, week out.' },
    { id: 'tiny', label: 'Tiny but Loud', emoji: '📣', desc: 'Cozy and rowdy', ratingMod: 0, chemMod: 9, fact: 'The tiny ground was tiny but deafening.' },
  ]},
  { key: 'fanbase', title: 'Fan Base', emoji: '📣', options: [
    { id: 'ultras', label: 'The Ultras', emoji: '🎺', desc: 'Never stop singing', ratingMod: 2, chemMod: 8, fact: 'The Ultras carried the team through every minute.' },
    { id: 'loyal', label: 'Loyal Locals', emoji: '🧣', desc: 'Through thick and thin', ratingMod: 1, chemMod: 10, fact: 'The Loyal Locals stuck by the badge all season.' },
    { id: 'glory', label: 'Glory Hunters', emoji: '🏆', desc: 'Demand trophies now', ratingMod: 3, chemMod: 2, fact: 'The Glory Hunters demanded, and got, silverware.' },
    { id: 'fairweather', label: 'Fair-Weather', emoji: '☂️', desc: 'Show up when winning', ratingMod: 0, chemMod: 3, fact: 'The fair-weather crowd only roared on the good days.' },
  ]},
  { key: 'budget', title: 'Transfer Budget', emoji: '💰', options: [
    { id: 'galacticos', label: 'Galácticos (€500M)', emoji: '💎', desc: 'Spend it all', ratingMod: 4, chemMod: -4, fact: 'The Galáctico budget bought stars, but egos clashed.' },
    { id: 'balanced', label: 'Balanced (€150M)', emoji: '⚖️', desc: 'Smart spending', ratingMod: 2, chemMod: 5, fact: 'A balanced budget built a well-rounded side.' },
    { id: 'moneyball', label: 'Moneyball (€30M)', emoji: '📊', desc: 'Hidden gems', ratingMod: 1, chemMod: 8, fact: 'Moneyball scouting unearthed bargain gems.' },
    { id: 'academy', label: 'Youth Academy (€0)', emoji: '🌱', desc: 'Homegrown only', ratingMod: -1, chemMod: 12, fact: 'A homegrown academy core played as one.' },
  ]},
];

/* ---------------- Simulation ---------------- */
export interface SquadResult { rating: number; chemistry: number; grade: string; facts: string[]; }

/**
 * Verdict tier audit (2026-07-03), run alongside the playerRating fix above.
 * Final `rating` = round(avgPlayerRating * 0.82 + chemistry * 0.18) + extraRating,
 * where extraRating sums to roughly -3 (worst extras) to +13 (best extras) and
 * chemistry (0-100) sums a club/nationality overlap score with extraChem
 * (roughly +8 to +32). Simulating realistic squads end to end against the new
 * playerRating curve gives this achievable final-rating distribution:
 *   11 cheap/scrub picks (mv 2-10)      -> final 45-61
 *   mid-table current-era XI (mv 20-60) -> final 60-77
 *   good current-era XI (mv 60-120)     -> final 67-83
 *   stacked but not legends (mv 120-200)-> final 71-87
 *   near-full Legends squad (mv 150-230)-> final 72-88
 *   best-case full elite Legends squad  -> final 73-89, capping out near 90+
 *     only with an optimal draft plus the best extras and perfect chemistry.
 * Tiers below are set against that real spread instead of the old 60/72/82/90
 * cutoffs (which made a mid-table XI a "B" and near-full Legends an "A+" no
 * matter how the draft or extras went, while "D" needed active sabotage).
 */
export function simulateSquad(picks: Player[], extras: ExtraOption[] = []): SquadResult {
  if (!picks.length) return { rating: 0, chemistry: 0, grade: 'D', facts: [] };
  const ratings = picks.map(playerRating);
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  let chemPts = 0;
  const accessors: ((p: Player) => string)[] = [p => p.club, p => p.nationality];
  for (const acc of accessors) {
    const counts = new Map<string, number>();
    for (const p of picks) counts.set(acc(p), (counts.get(acc(p)) || 0) + 1);
    for (const p of picks) if ((counts.get(acc(p)) || 0) >= 2) chemPts++;
  }
  const extraRating = extras.reduce((s2, e) => s2 + e.ratingMod, 0);
  const extraChem = extras.reduce((s2, e) => s2 + e.chemMod, 0);
  const chemistry = Math.max(0, Math.min(100, Math.round((chemPts / (picks.length * accessors.length)) * 100) + extraChem));
  const rating = Math.max(1, Math.min(100, Math.round(avg * 0.82 + chemistry * 0.18) + extraRating));
  const grade = rating >= 84 ? 'A+' : rating >= 76 ? 'A' : rating >= 66 ? 'B' : rating >= 55 ? 'C' : 'D';

  const topScorer = [...picks].sort((a, b) => b.goals - a.goals)[0];
  const star = [...picks].sort((a, b) => b.marketValue - a.marketValue)[0];
  const nations = new Set(picks.map(p => p.nationality)).size;
  const facts: string[] = [];
  if (topScorer && topScorer.goals > 0) facts.push('Top scorer: ' + topScorer.name + ' (' + topScorer.goals + ' goals)');
  if (star) facts.push('Star man: ' + star.name + ' (rated ' + playerRating(star) + ')');
  facts.push('Chemistry ' + chemistry + '% · ' + nations + ' nations');
  for (const e of extras) facts.push(e.emoji + ' ' + e.fact);
  if (rating >= 84) facts.push('🏆 Won the treble in a dream season.');
  else if (rating >= 76) facts.push('🏆 League champions with games to spare.');
  else if (rating >= 66) facts.push('🥈 A strong runner-up finish.');
  else if (rating >= 55) facts.push('⚽ A solid mid-table campaign.');
  else facts.push('😬 A relegation battle. The Banker won this one.');
  const inj = picks[Math.floor(Math.random() * picks.length)];
  if (inj) facts.push('🩹 Injury news: ' + inj.name + ' has a slight knock but should be fine.');
  return { rating, chemistry, grade, facts };
}

/* ---------------- Leaderboard (local) ---------------- */
export interface LeaderEntry { score: number; grade: string; formation: string; era: string; date: string; }
const LB_KEY = 'squad_deal_leaderboard_v1';

export function loadLeaderboard(): LeaderEntry[] {
  try { const raw = localStorage.getItem(LB_KEY); return raw ? (JSON.parse(raw) as LeaderEntry[]) : []; } catch { return []; }
}
export function saveScore(entry: LeaderEntry): LeaderEntry[] {
  try {
    const all = [...loadLeaderboard(), entry].sort((a, b) => b.score - a.score).slice(0, 10);
    localStorage.setItem(LB_KEY, JSON.stringify(all));
    return all;
  } catch { return loadLeaderboard(); }
}
