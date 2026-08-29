import { supabase } from '@/integrations/supabase/client';
import { Player, Position, League } from '@/types/game';
import { players as fallbackPlayers } from '@/data/players';
import { getEnrichment } from '@/data/footleEnrichment';

/* ---------------- Position normalization ---------------- */
export const POSITION_NORMALIZE: Record<string, Position> = {
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
// Owner 2026-08-05: central-mid slots take central mids ONLY. Wide mids and
// (via the winger family) wingers were sneaking into CM slots; a CM slot now
// accepts CM/CDM/CAM and nothing wide.
const MD: Position[] = ['CM', 'CDM', 'CAM'];
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
  // 0-99 player card scale (owner 2026-08-05): he wanted our ratings to sit
  // where a player expects them to, so the anchors land on familiar card
  // numbers: £1M→62, £5M→71, £15M→77, £40M→82, £80M→86, £200M→91, capped at
  // 96. Bottom pros sit around 55-65.
  //
  // Age correction (owner: "just because people are old dosent mean their
  // value should be so low. ur giving lewa such a low rating even though he's
  // still so good"): market values crater for veterans while their level
  // doesn't. 30+ gets a value multiplier that roughly undoes the age discount
  // BEFORE the curve runs: Lewandowski (~£15M at 37) reads ~86 instead of 72,
  // 39-year-old Messi lands ~86, prime Mbappe/Yamal money still tops the pile.
  const age = typeof p.age === 'number' && p.age > 0 ? p.age : 27;
  const ageBoost = age >= 30 ? Math.min(6, 1 + (age - 29) * 0.55) : 1;
  const mv = Math.max(0.5, p.marketValue * ageBoost);
  const r = 62 + (33 * Math.log10(mv)) / Math.log10(400);
  return Math.max(52, Math.min(96, Math.round(r)));
}

/**
 * Owner (2026-07-10): "only giving the best defenders of all time 80 somethings
 * is so disrespectful." Legends get their own curve: the synthetic legend
 * market values (140-230) map to 85-99 so all-time greats read like it.
 */
export function ratingFor(p: Player, era: Era): number {
  if (era === 'legends') {
    const r = 85 + ((Math.max(140, Math.min(230, p.marketValue)) - 140) * 14) / 90;
    return Math.round(Math.max(85, Math.min(99, r)));
  }
  return playerRating(p);
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
  L('Pele', 'Santos', 'Brazil', 'Brazilian Série A', 'CF', 225, 643),
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
  L('Garrincha', 'Botafogo', 'Brazil', 'Brazilian Série A', 'RW', 185, 232),
  L('Michel Platini', 'Juventus', 'France', 'Serie A', 'CAM', 200, 224),
  // --- 2026-07-10 expansion: owner wants 10+ per position in the all-time pool ---
  // GK (now 12)
  L('Gordon Banks', 'Stoke City', 'England', 'Premier League', 'GK', 160),
  L('Peter Schmeichel', 'Manchester United', 'Denmark', 'Premier League', 'GK', 168),
  L('Oliver Kahn', 'Bayern Munich', 'Germany', 'Bundesliga', 'GK', 172),
  L('Edwin van der Sar', 'Manchester United', 'Netherlands', 'Premier League', 'GK', 162),
  L('Dino Zoff', 'Juventus', 'Italy', 'Serie A', 'GK', 166),
  L('Sepp Maier', 'Bayern Munich', 'Germany', 'Bundesliga', 'GK', 155),
  L('Petr Cech', 'Chelsea', 'Czechia', 'Premier League', 'GK', 158),
  L('Keylor Navas', 'Real Madrid', 'Costa Rica', 'La Liga', 'GK', 145),
  // CB (now 14)
  L('Alessandro Nesta', 'AC Milan', 'Italy', 'Serie A', 'CB', 172),
  L('Rio Ferdinand', 'Manchester United', 'England', 'Premier League', 'CB', 168),
  L('John Terry', 'Chelsea', 'England', 'Premier League', 'CB', 165),
  L('Nemanja Vidic', 'Manchester United', 'Serbia', 'Premier League', 'CB', 162),
  L('Gerard Pique', 'Barcelona', 'Spain', 'La Liga', 'CB', 168),
  L('Thiago Silva', 'Paris Saint-Germain', 'Brazil', 'Ligue 1', 'CB', 166),
  L('Virgil van Dijk', 'Liverpool', 'Netherlands', 'Premier League', 'CB', 178),
  L('Bobby Moore', 'West Ham United', 'England', 'Premier League', 'CB', 185),
  // FB/WB (RB now 7, LB now 6)
  L('Dani Alves', 'Barcelona', 'Brazil', 'La Liga', 'RB', 172),
  L('Javier Zanetti', 'Inter Milan', 'Argentina', 'Serie A', 'RB', 165),
  L('Gary Neville', 'Manchester United', 'England', 'Premier League', 'RB', 150),
  L('Kyle Walker', 'Manchester City', 'England', 'Premier League', 'RB', 145),
  L('Ashley Cole', 'Chelsea', 'England', 'Premier League', 'LB', 158),
  L('Marcelo', 'Real Madrid', 'Brazil', 'La Liga', 'LB', 165),
  L('Paolo Maldini (LB)', 'AC Milan', 'Italy', 'Serie A', 'LB', 182),
  L('Andrew Robertson', 'Liverpool', 'Scotland', 'Premier League', 'LB', 148),
  L('Trent Alexander-Arnold', 'Liverpool', 'England', 'Premier League', 'RB', 158),
  L('Giacinto Facchetti', 'Inter Milan', 'Italy', 'Serie A', 'LB', 168),
  // CM/CDM/CAM (now 20)
  L('Frank Lampard', 'Chelsea', 'England', 'Premier League', 'CM', 172, 211),
  L('Claude Makelele', 'Chelsea', 'France', 'Premier League', 'CDM', 160),
  L('Patrick Vieira', 'Arsenal', 'France', 'Premier League', 'CDM', 170),
  L('Roy Keane', 'Manchester United', 'Ireland', 'Premier League', 'CDM', 162),
  L('Sergio Busquets', 'Barcelona', 'Spain', 'La Liga', 'CDM', 168),
  L('N Golo Kante', 'Chelsea', 'France', 'Premier League', 'CDM', 165),
  L('Toni Kroos', 'Real Madrid', 'Germany', 'La Liga', 'CM', 175),
  L('Kevin De Bruyne', 'Manchester City', 'Belgium', 'Premier League', 'CM', 178, 105, 170),
  L('Kaka', 'AC Milan', 'Brazil', 'Serie A', 'CAM', 190, 130),
  L('Juan Roman Riquelme', 'Boca Juniors', 'Argentina', 'Argentine Primera División', 'CAM', 172),
  L('Francesco Totti', 'AS Roma', 'Italy', 'Serie A', 'CAM', 185, 250),
  L('Dennis Bergkamp', 'Arsenal', 'Netherlands', 'Premier League', 'CAM', 182, 120),
  // Wingers (now 12)
  L('Luis Figo', 'Real Madrid', 'Portugal', 'La Liga', 'RW', 190, 100),
  L('David Beckham', 'Manchester United', 'England', 'Premier League', 'RM', 178, 97, 160),
  L('Arjen Robben', 'Bayern Munich', 'Netherlands', 'Bundesliga', 'RW', 180, 144),
  L('Franck Ribery', 'Bayern Munich', 'France', 'Bundesliga', 'LW', 175, 124),
  L('Gareth Bale', 'Real Madrid', 'Wales', 'La Liga', 'RW', 172, 106),
  L('Neymar Jr', 'Barcelona', 'Brazil', 'La Liga', 'LW', 195, 250, 165),
  L('Mohamed Salah', 'Liverpool', 'Egypt', 'Premier League', 'RW', 180, 230),
  L('Jairzinho', 'Botafogo', 'Brazil', 'Brazilian Série A', 'RW', 170, 186),
  // ST/CF (now 16)
  L('Alfredo Di Stefano', 'Real Madrid', 'Argentina', 'La Liga', 'CF', 220, 308),
  L('Ferenc Puskas', 'Real Madrid', 'Hungary', 'La Liga', 'ST', 210, 512),
  L('Zlatan Ibrahimovic', 'AC Milan', 'Sweden', 'Serie A', 'ST', 190, 511),
  L('Samuel Eto o', 'Barcelona', 'Cameroon', 'La Liga', 'ST', 182, 360),
  L('Didier Drogba', 'Chelsea', 'Ivory Coast', 'Premier League', 'ST', 178, 275),
  L('Luis Suarez', 'Barcelona', 'Uruguay', 'La Liga', 'ST', 185, 400),
  L('Robert Lewandowski', 'Bayern Munich', 'Poland', 'Bundesliga', 'ST', 188, 550),
  L('Karim Benzema', 'Real Madrid', 'France', 'La Liga', 'CF', 182, 425),
  L('Sergio Aguero', 'Manchester City', 'Argentina', 'Premier League', 'ST', 180, 379),
  L('Roberto Baggio', 'Juventus', 'Italy', 'Serie A', 'CF', 188, 291),
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

export async function fetchSquadPool(era: Era, year = 2026): Promise<Player[]> {
  if (era === 'legends') return [...LEGENDS];
  try {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, position, age, nationality, club, market_value_usd, goals, assists')
      .eq('year', year)
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
        league: getEnrichment(row.player_name, row.club || '').league, goals: row.goals ?? 0, assists: row.assists ?? 0,
        position: pos, kitNumber: 0, age: row.age ?? 0,
        marketValue: Math.max(1, Math.round((row.market_value_usd || 1_000_000) / 1_000_000)), difficulty: 'easy',
      });
    }
    return pool.length >= 33 ? pool : fallbackPlayers.slice();
  } catch { return fallbackPlayers.slice(); }
}


/* ---------------- Topics (owner: themed pools like WC-2026-only) ---------------- */
export type Topic = 'all' | 'wc2026' | 'premier' | 'laliga' | 'seriea' | 'southamerica';

export const TOPICS: { id: Topic; label: string; emoji: string; desc: string }[] = [
  { id: 'all', label: 'All World', emoji: '🌍', desc: 'Every top player' },
  { id: 'wc2026', label: 'World Cup 2026', emoji: '🏆', desc: 'Nations at the 2026 World Cup' },
  { id: 'premier', label: 'Premier League', emoji: '🏴', desc: 'PL players only' },
  { id: 'laliga', label: 'La Liga', emoji: '🇪🇸', desc: 'La Liga players only' },
  { id: 'seriea', label: 'Serie A', emoji: '🇮🇹', desc: 'Serie A players only' },
  { id: 'southamerica', label: 'South America', emoji: '🌎', desc: 'CONMEBOL nations only' },
];

export const WC2026_NATIONS = new Set(['United States','Mexico','Canada','Argentina','France','Spain','England','Brazil','Portugal','Netherlands','Belgium','Croatia','Morocco','Germany','Italy','Uruguay','Colombia','Ecuador','Japan','South Korea','Korea, South','Australia','Iran','Saudi Arabia','Qatar','Senegal','Ghana','Cameroon','Nigeria','Egypt','Algeria','Ivory Coast',"Cote d'Ivoire",'Tunisia','Switzerland','Austria','Poland','Denmark','Sweden','Norway','Scotland','Wales','Serbia','Turkey','Türkiye','Ukraine','Greece','Czechia','Czech Republic','Paraguay','Panama','Costa Rica','Jordan','Uzbekistan','New Zealand','Bolivia','Haiti','Curacao','Cape Verde','South Africa','Bosnia-Herzegovina','Bosnia & Herzegovina','Iraq','DR Congo']);
const CONMEBOL = new Set(['Argentina','Brazil','Uruguay','Colombia','Chile','Ecuador','Paraguay','Peru','Bolivia','Venezuela']);

export function filterByTopic(pool: Player[], topic: Topic): Player[] {
  switch (topic) {
    case 'all': return pool;
    case 'wc2026': return pool.filter(p => WC2026_NATIONS.has(p.nationality));
    case 'premier': return pool.filter(p => p.league === 'Premier League');
    case 'laliga': return pool.filter(p => p.league === 'La Liga');
    case 'seriea': return pool.filter(p => p.league === 'Serie A');
    case 'southamerica': return pool.filter(p => CONMEBOL.has(p.nationality));
  }
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
export function bankerOffer(pool: Player[], slot: FormationSlot, unopened: Player[], used: Set<string>, roundFactor: number, excludeNames: Set<string> = new Set(), era: Era = 'current'): Player | null {
  const ratings = unopened.map(p => ratingFor(p, era));
  const avgR = ratings.length ? ratings.reduce((s2, r) => s2 + r, 0) / ratings.length : 55;
  const minR = ratings.length ? Math.min(...ratings) : 45;
  const maxR = ratings.length ? Math.max(...ratings) : 95;
  // Banker leans below average early (roundFactor climbs toward 1.0), but the offer must never
  // be worse than the worst case still in play - owner saw "a 60 offered when the lowest was 61".
  // Owner 2026-08-05 ("the bankers offers suck"): the banker now runs hotter.
  // Base target sits a notch ABOVE the old curve, and roughly one call in four
  // is a genuine sweetener near the top of what's still in play, so taking the
  // deal is a real decision instead of an obvious pass.
  const sweetener = Math.random() < 0.25;
  const base = avgR * roundFactor * 1.06;
  /* Owner 2026-08-28 ("how do i have 90% of players 80 and above and u give
     me a 78"): in a uniformly strong pool the old floor was the single worst
     box still in play, so the banker could undercut nearly everything left
     and the call was never a decision. The floor is now the 30th percentile
     of the remaining ratings: an offer is always better than the bottom
     third of what is still out there, and the sweetener still spikes it near
     the top one call in four. */
  const sorted = [...ratings].sort((a, b) => a - b);
  const floor = sorted.length ? sorted[Math.floor(0.3 * (sorted.length - 1))] : minR;
  const target = Math.max(floor, Math.min(maxR, sweetener ? maxR - 1 : base));
  const unopenedNames = new Set(unopened.map(p => p.name));
  // excludeNames = players the banker already offered this slot, so it never re-offers the same guy.
  const elig = pool.filter(p =>
    slot.allowed.includes(p.position) && !used.has(p.name) &&
    !unopenedNames.has(p.name) && !excludeNames.has(p.name));
  if (!elig.length) return null;
  let best = elig[0]; let bestD = Infinity;
  for (const p of elig) { const d = Math.abs(ratingFor(p, era) - target); if (d < bestD) { bestD = d; best = p; } }
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

/* ---------------- Extras as mystery box boards (owner 2026-07-10) ----------------
   He wanted the same blind box round for the non-player categories too, in his
   words "Like Klopp and Sir Alex Ferguson and Chelsea budget and Boca junior
   fans", 6 named cases per category, keep one,
   three get flipped, the Banker tempts you with a known alternative. */
export const EXTRA_DEALS: ExtraCategory[] = [
  { key: 'manager', title: 'Manager', emoji: '🎩', options: [
    { id: 'pep', label: 'Pep Guardiola', emoji: '🧠', desc: 'Positional-play professor', ratingMod: 5, chemMod: 8, fact: 'Pep drilled a passing machine: 70% possession every week.' },
    { id: 'fergie', label: 'Sir Alex Ferguson', emoji: '⏱️', desc: 'Fergie time is real', ratingMod: 5, chemMod: 10, fact: 'Sir Alex won three titles "playing badly". Mentality monsters.' },
    { id: 'klopp', label: 'Jürgen Klopp', emoji: '🔥', desc: 'Heavy-metal football', ratingMod: 4, chemMod: 9, fact: "Klopp's gegenpress turned the squad into a wrecking ball." },
    { id: 'ancelotti', label: 'Carlo Ancelotti', emoji: '🚬', desc: 'Eyebrow of calm', ratingMod: 4, chemMod: 7, fact: 'Don Carlo managed the egos like only Don Carlo can.' },
    { id: 'mourinho', label: 'José Mourinho', emoji: '🚌', desc: 'Parks the bus, wins finals', ratingMod: 3, chemMod: 4, fact: 'José won a cup and started three touchline wars.' },
    { id: 'dave', label: 'Your Mate Dave', emoji: '🍺', desc: 'Has a coaching badge (Level 1)', ratingMod: -3, chemMod: 3, fact: 'Dave subbed off your striker to "see something". Lost 4-0.' },
  ]},
  { key: 'stadium', title: 'Stadium', emoji: '🏟️', options: [
    { id: 'campnou', label: 'Camp Nou', emoji: '🔵', desc: '99,000 Catalans', ratingMod: 4, chemMod: 6, fact: 'The rebuilt Camp Nou shook for the big nights.' },
    { id: 'bernabeu', label: 'Santiago Bernabéu', emoji: '⚪', desc: 'The white wall', ratingMod: 4, chemMod: 5, fact: 'The Bernabéu demanded galáctico football and got it.' },
    { id: 'anfield', label: 'Anfield', emoji: '🔴', desc: 'European nights', ratingMod: 3, chemMod: 9, fact: 'Anfield dragged the team through two comebacks from 3 down.' },
    { id: 'bombonera', label: 'La Bombonera', emoji: '💛', desc: 'The box of chocolates bounces', ratingMod: 3, chemMod: 10, fact: 'La Bombonera literally trembled. Visitors hated every minute.' },
    { id: 'sansiro', label: 'San Siro', emoji: '🔴', desc: 'Opera of football', ratingMod: 3, chemMod: 6, fact: 'San Siro gave every match a cinematic edge.' },
    { id: 'park', label: 'The Local Park', emoji: '🌳', desc: 'Bring your own nets', ratingMod: -2, chemMod: 4, fact: 'A dog stopped play twice at the Local Park.' },
  ]},
  { key: 'fanbase', title: 'Fan Base', emoji: '📣', options: [
    { id: 'kop', label: 'The Kop', emoji: '🎼', desc: "You'll Never Walk Alone", ratingMod: 3, chemMod: 9, fact: 'The Kop sang the team over the line week after week.' },
    { id: 'yellowwall', label: 'The Yellow Wall', emoji: '🟡', desc: "25,000 standing Dortmunders", ratingMod: 3, chemMod: 8, fact: 'The Yellow Wall made warm-ups feel like finals.' },
    { id: 'ladoce', label: "Boca's La Doce", emoji: '💙', desc: 'The 12th player', ratingMod: 3, chemMod: 10, fact: 'La Doce never sat down. Not once. All season.' },
    { id: 'ultras', label: 'Galatasaray Ultras', emoji: '🔥', desc: 'Welcome to hell', ratingMod: 4, chemMod: 5, fact: 'Flares, tifos, and a wall of noise. Hell for visitors.' },
    { id: 'greenbrigade', label: 'The Green Brigade', emoji: '🍀', desc: 'Celtic Park eruption', ratingMod: 2, chemMod: 9, fact: 'The Green Brigade turned Tuesday nights into carnivals.' },
    { id: 'bored', label: '3 Season-Ticket Holders', emoji: '😴', desc: 'One brings a thermos', ratingMod: -2, chemMod: 2, fact: 'Attendance peaked at 41 (a school trip got lost).' },
  ]},
  { key: 'budget', title: 'Transfer Budget', emoji: '💰', options: [
    { id: 'oil', label: '£1B Oil Money', emoji: '🛢️', desc: 'Money is no object', ratingMod: 5, chemMod: -4, fact: 'The £1B warchest bought five superstars and one lawsuit.' },
    { id: 'chelsea', label: 'Chelsea Splurge (£800M)', emoji: '💳', desc: 'Sign everyone, sort it later', ratingMod: 4, chemMod: -3, fact: 'Signed 14 players. Three play the same position. Vibes.' },
    { id: 'galacticos', label: 'Galácticos (€500M)', emoji: '💎', desc: 'One superstar per summer', ratingMod: 4, chemMod: -1, fact: 'The Galáctico policy sold shirts AND won games this time.' },
    { id: 'fiftyplus1', label: '50+1 Sensible (€90M)', emoji: '🇩🇪', desc: 'German efficiency', ratingMod: 2, chemMod: 6, fact: 'Smart, sustainable spending. The fans owned the club and it showed.' },
    { id: 'moneyball', label: 'Moneyball (€30M)', emoji: '📊', desc: 'Spreadsheet FC', ratingMod: 1, chemMod: 8, fact: 'Moneyball found two gems the big clubs never scouted.' },
    { id: 'academy', label: 'Academy Only (€0)', emoji: '🌱', desc: 'La Masia dreams', ratingMod: -1, chemMod: 12, fact: 'Eleven academy kids who grew up together. Chemistry off the charts.' },
  ]},
  // Owner 2026-08-05: "u still haven't added the... jerseys". Fifth board.
  { key: 'kit', title: 'Home Kit', emoji: '👕', options: [
    { id: 'iconic', label: 'The Iconic Classic', emoji: '🏛️', desc: 'Clean stripes, timeless', ratingMod: 2, chemMod: 8, fact: 'The classic kit had opponents feeling like underdogs at kickoff.' },
    { id: 'retro', label: '90s Retro Reissue', emoji: '📼', desc: 'Loud in the best way', ratingMod: 2, chemMod: 7, fact: 'The retro shirt sold out twice and the away ends hated it.' },
    { id: 'blackout', label: 'The Blackout', emoji: '🖤', desc: 'All black everything', ratingMod: 3, chemMod: 4, fact: 'The blackout kit made every night game feel like a heist.' },
    { id: 'neon', label: 'Neon Statement', emoji: '🟨', desc: 'Visible from space', ratingMod: 1, chemMod: 5, fact: 'The neon kit was a menace on TV and worse in person.' },
    { id: 'sponsorless', label: 'Sponsorless Purist', emoji: '🕊️', desc: 'Just the badge', ratingMod: 1, chemMod: 9, fact: 'No sponsor, just the badge. The purists wept with joy.' },
    { id: 'cursed', label: 'The Cursed Third Kit', emoji: '🩹', desc: 'Beige-on-beige chaos', ratingMod: -2, chemMod: 2, fact: 'The cursed third kit clashed with itself. Two own goals wearing it.' },
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
export function simulateSquad(picks: Player[], extras: ExtraOption[] = [], era: Era = 'current'): SquadResult {
  if (!picks.length) return { rating: 0, chemistry: 0, grade: 'D', facts: [] };
  const ratings = picks.map(p => ratingFor(p, era));
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
  if (star) facts.push('Star man: ' + star.name + ' (rated ' + ratingFor(star, era) + ')');
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
