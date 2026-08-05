// Career Ladder: guess the mystery footballer from their career, one stint at a time.
// Data lives in Supabase: career_players (identity) + career_seasons (the ladder rows).
import { foldSpecialLatin } from '@/lib/nameFold';
import { supabase } from '@/integrations/supabase/client';
import { dateSeed, getTodayET } from '@/lib/dateUtils';

export interface CareerStint {
  season: string;
  club: string;
  goals: number | null;
  assists: number | null;
  appearances: number | null;
  marketValue: number | null;
  sortOrder: number;
}

export interface CareerPlayer {
  id: string;
  name: string;
  nationality: string;
  position: string;
  seasons: CareerStint[];
}

export const MAX_GUESSES = 6;
export const MIN_STINTS = 4;
export const BASE_SCORE = 1000;
export const REVEAL_PENALTY = 150;
export const WRONG_GUESS_PENALTY = 100;
export const SCORE_FLOOR = 100;

/**
 * Daily-mode action log, persisted to localStorage via useDailyPuzzle.
 * Mirrors the CareerAction pattern in useCareerGame.ts (the sibling
 * "Career Path" game): a flat list of actions replayed to derive state,
 * rather than persisting revealed/wrongGuesses/score directly. There is no
 * explicit 'lost' action. CareerLadder.tsx derives the loss phase by
 * counting 'wrong' actions against MAX_GUESSES, the same way useCareerGame.ts
 * derives its own loss condition from a wrong-action count.
 */
export type LadderAction =
  | { t: 'reveal' }
  | { t: 'wrong'; name: string }
  | { t: 'won'; score: number }
  | { t: 'give' };

/**
 * Deterministically picks today's Career Ladder player: same result for
 * every user on the same ET date, using the site's canonical date-seed
 * utility (src/lib/dateUtils.ts). Eligibility mirrors startRound() in
 * CareerLadder.tsx (>= MIN_STINTS seasons) so the daily pool never differs
 * from what unlimited mode considers playable.
 */
export function pickDailyPlayer(pool: CareerPlayer[], dateStr: string = getTodayET()): CareerPlayer | null {
  const eligible = pool.filter(p => p.seasons.length >= MIN_STINTS);
  if (eligible.length === 0) return null;
  // Difficulty skew (owner request, July 2026): two of every three days draw
  // from the harder half of the pool (lower peak market value); every third
  // day the whole pool is fair game, so superstars still appear. Everything
  // stays deterministic per ET date - every user shares one daily player.
  const seed = dateSeed(dateStr);
  const harder = legendPool(pool);
  const source = seed % 3 === 0 || harder.length === 0 ? eligible : harder;
  // Sort by id for a stable, reproducible ordering before indexing. Pool
  // arrival order from Supabase is not guaranteed to be stable run to run.
  const sorted = [...source].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[seed % sorted.length];
}

/**
 * Prominence signal for difficulty: the player's peak single-season market
 * value in whole millions of euros. Every one of the 3514 career_seasons
 * rows carries market_value (verified against the live table 2026-07-15),
 * so this needs no extra fetch and no guesswork.
 */
export function peakValue(p: CareerPlayer): number {
  let peak = 0;
  for (const s of p.seasons) {
    if ((s.marketValue ?? 0) > peak) peak = s.marketValue ?? 0;
  }
  return peak;
}

export type LadderDifficulty = 'standard' | 'legend';

/**
 * Legend pool: the harder half of the eligible pool - players at or below
 * the pool's median peak market value, i.e. the deeper cuts rather than the
 * Ronaldos. Ties at the boundary break by id so the split is deterministic
 * regardless of fetch order. Falls back to the full eligible pool when the
 * pool is too small for a meaningful split.
 */
export function legendPool(pool: CareerPlayer[]): CareerPlayer[] {
  const eligible = pool.filter(p => p.seasons.length >= MIN_STINTS);
  if (eligible.length < 20) return eligible;
  const sorted = [...eligible].sort(
    (a, b) => peakValue(b) - peakValue(a) || a.id.localeCompare(b.id),
  );
  return sorted.slice(Math.floor(sorted.length / 2));
}

/** Lowercase + strip accents so "Raphaël" matches "raphael". */
export function normalizeName(s: string): string {
  return foldSpecialLatin(
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim(),
  );
}

/**
 * Score = 1000 base, minus a reveal penalty that SCALES TO CAREER LENGTH (revealing every
 * stint costs ~90% of base no matter how many stints there are), minus 100 per wrong guess,
 * never below 100. The length-scaling fixes short careers keeping a high score after all
 * hints: e.g. Xavi Simons used to leave ~550 with everything revealed; now that lands at the
 * floor, same as a long career fully revealed.
 */
export function careerScore(stintsShown: number, wrongGuesses: number, totalStints = 7): number {
  const revealsAvailable = Math.max(1, totalStints - 1);
  const revealsUsed = Math.max(0, stintsShown - 1);
  const revealPenalty = 0.9 * BASE_SCORE * Math.min(1, revealsUsed / revealsAvailable);
  const raw = BASE_SCORE - revealPenalty - WRONG_GUESS_PENALTY * Math.max(0, wrongGuesses);
  return Math.max(SCORE_FLOOR, Math.round(raw));
}

// The nationality column occasionally holds a birth city alongside (or instead
// of) the country, so we only map to a flag when the string contains a known
// country name as a whole word. Most specific entries sit first so compound
// names like "Equatorial Guinea" never fall through to "Guinea".
const COUNTRY_FLAGS: Array<[string, string]> = [
  ['equatorial guinea', '🇬🇶'],
  ['guinea-bissau', '🇬🇼'],
  ['northern ireland', '🇬🇧'],
  ['republic of ireland', '🇮🇪'],
  ['ivory coast', '🇨🇮'],
  ["cote d'ivoire", '🇨🇮'],
  ['south korea', '🇰🇷'],
  ['korea republic', '🇰🇷'],
  ['united states', '🇺🇸'],
  ['usa', '🇺🇸'],
  ['north macedonia', '🇲🇰'],
  ['czech', '🇨🇿'],
  ['bosnia', '🇧🇦'],
  ['england', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['scotland', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  ['wales', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'],
  ['ireland', '🇮🇪'],
  ['argentina', '🇦🇷'],
  ['brazil', '🇧🇷'],
  ['france', '🇫🇷'],
  ['spain', '🇪🇸'],
  ['germany', '🇩🇪'],
  ['portugal', '🇵🇹'],
  ['italy', '🇮🇹'],
  ['belgium', '🇧🇪'],
  ['netherlands', '🇳🇱'],
  ['croatia', '🇭🇷'],
  ['uruguay', '🇺🇾'],
  ['morocco', '🇲🇦'],
  ['sweden', '🇸🇪'],
  ['cameroon', '🇨🇲'],
  ['canada', '🇨🇦'],
  ['chile', '🇨🇱'],
  ['colombia', '🇨🇴'],
  ['denmark', '🇩🇰'],
  ['norway', '🇳🇴'],
  ['senegal', '🇸🇳'],
  ['algeria', '🇩🇿'],
  ['austria', '🇦🇹'],
  ['costa rica', '🇨🇷'],
  ['ecuador', '🇪🇨'],
  ['egypt', '🇪🇬'],
  ['gabon', '🇬🇦'],
  ['georgia', '🇬🇪'],
  ['nigeria', '🇳🇬'],
  ['poland', '🇵🇱'],
  ['serbia', '🇷🇸'],
  ['slovenia', '🇸🇮'],
  ['slovakia', '🇸🇰'],
  ['turkey', '🇹🇷'],
  ['switzerland', '🇨🇭'],
  ['ukraine', '🇺🇦'],
  ['russia', '🇷🇺'],
  ['greece', '🇬🇷'],
  ['hungary', '🇭🇺'],
  ['romania', '🇷🇴'],
  ['finland', '🇫🇮'],
  ['iceland', '🇮🇸'],
  ['ghana', '🇬🇭'],
  ['mali', '🇲🇱'],
  ['guinea', '🇬🇳'],
  ['tunisia', '🇹🇳'],
  ['mexico', '🇲🇽'],
  ['peru', '🇵🇪'],
  ['paraguay', '🇵🇾'],
  ['venezuela', '🇻🇪'],
  ['jamaica', '🇯🇲'],
  ['japan', '🇯🇵'],
  ['australia', '🇦🇺'],
  ['albania', '🇦🇱'],
  ['montenegro', '🇲🇪'],
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Flag emoji for a nationality string, or a globe when we cannot map it. */
export function flagForNationality(nationality: string | null | undefined): string {
  if (!nationality) return '🌍';
  const norm = normalizeName(nationality);
  for (const [country, flag] of COUNTRY_FLAGS) {
    if (new RegExp(`\\b${escapeRegExp(country)}\\b`).test(norm)) return flag;
  }
  return '🌍';
}

/**
 * Owner 2026-08-05: "a little flag next to the team they played for which
 * corresponds to which nation that team plays in." Club -> country flag,
 * evaluated in order so collision-prone entries (Inter Miami vs Inter,
 * Barcelona SC vs Barcelona, Atletico Nacional vs Nacional) resolve to the
 * right league's country. National-team stints (e.g. "Spain U21") fall back
 * to the country-name scan. Returns '' when unknown so rows can skip the flag
 * instead of showing a wrong one.
 */
const CLUB_COUNTRY: Array<[string, string]> = [
  // Order-sensitive entries FIRST (substring collisions)
  ['inter miami', '🇺🇸'], ['internacional', '🇧🇷'], ['barcelona sc', '🇪🇨'],
  ['atletico nacional', '🇨🇴'], ['sporting cristal', '🇵🇪'], ['sporting kansas', '🇺🇸'],
  ['america de cali', '🇨🇴'], ['america mineiro', '🇧🇷'], ['club america', '🇲🇽'],
  ['al nassr', '🇸🇦'], ['austria wien', '🇦🇹'], ['austria vienna', '🇦🇹'],
  ['atletico mineiro', '🇧🇷'], ['athletico paranaense', '🇧🇷'], ['atletico madrid', '🇪🇸'],
  ['red bull bragantino', '🇧🇷'], ['red bull salzburg', '🇦🇹'], ['rb leipzig', '🇩🇪'],
  ['york city', '🇺🇸'], ['toronto', '🇨🇦'], ['montreal', '🇨🇦'], ['vancouver', '🇨🇦'],
  ['wellington phoenix', '🇳🇿'],
  // England
  ['manchester city', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['man city', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['manchester united', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['man utd', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['liverpool', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['arsenal', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['chelsea', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['tottenham', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['newcastle', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['everton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['aston villa', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['west ham', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['leicester', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['southampton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['wolverhampton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['wolves', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['brighton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['crystal palace', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['fulham', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['brentford', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['nottingham forest', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['leeds', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['burnley', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['sunderland', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['middlesbrough', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['blackburn', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['bolton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['stoke', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['watford', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['norwich', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['west brom', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['sheffield', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['portsmouth', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['ipswich', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['derby', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['queens park rangers', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['qpr', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['hull', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['luton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['bournemouth', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['charlton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['wigan', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['birmingham', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['coventry', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['millwall', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['preston', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['reading', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['swansea', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'], ['cardiff', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'],
  // Spain
  ['real madrid', '🇪🇸'], ['barcelona', '🇪🇸'], ['sevilla', '🇪🇸'], ['valencia', '🇪🇸'],
  ['villarreal', '🇪🇸'], ['athletic bilbao', '🇪🇸'], ['athletic club', '🇪🇸'], ['real sociedad', '🇪🇸'],
  ['real betis', '🇪🇸'], ['betis', '🇪🇸'], ['celta', '🇪🇸'], ['espanyol', '🇪🇸'], ['getafe', '🇪🇸'],
  ['osasuna', '🇪🇸'], ['mallorca', '🇪🇸'], ['granada', '🇪🇸'], ['levante', '🇪🇸'], ['deportivo', '🇪🇸'],
  ['zaragoza', '🇪🇸'], ['malaga', '🇪🇸'], ['rayo vallecano', '🇪🇸'], ['alaves', '🇪🇸'], ['elche', '🇪🇸'],
  ['cadiz', '🇪🇸'], ['girona', '🇪🇸'], ['las palmas', '🇪🇸'], ['valladolid', '🇪🇸'], ['almeria', '🇪🇸'],
  // Italy
  ['juventus', '🇮🇹'], ['ac milan', '🇮🇹'], ['inter', '🇮🇹'], ['napoli', '🇮🇹'], ['as roma', '🇮🇹'], ['roma', '🇮🇹'],
  ['lazio', '🇮🇹'], ['atalanta', '🇮🇹'], ['fiorentina', '🇮🇹'], ['torino', '🇮🇹'], ['bologna', '🇮🇹'],
  ['sampdoria', '🇮🇹'], ['genoa', '🇮🇹'], ['udinese', '🇮🇹'], ['sassuolo', '🇮🇹'], ['cagliari', '🇮🇹'],
  ['parma', '🇮🇹'], ['palermo', '🇮🇹'], ['hellas verona', '🇮🇹'], ['verona', '🇮🇹'], ['empoli', '🇮🇹'],
  ['lecce', '🇮🇹'], ['monza', '🇮🇹'], ['salernitana', '🇮🇹'], ['spezia', '🇮🇹'], ['cremonese', '🇮🇹'], ['brescia', '🇮🇹'],
  // Germany
  ['bayern', '🇩🇪'], ['borussia dortmund', '🇩🇪'], ['dortmund', '🇩🇪'], ['leverkusen', '🇩🇪'], ['schalke', '🇩🇪'],
  ['wolfsburg', '🇩🇪'], ['eintracht frankfurt', '🇩🇪'], ['frankfurt', '🇩🇪'], ['monchengladbach', '🇩🇪'], ['gladbach', '🇩🇪'],
  ['hoffenheim', '🇩🇪'], ['stuttgart', '🇩🇪'], ['werder bremen', '🇩🇪'], ['bremen', '🇩🇪'], ['hertha', '🇩🇪'],
  ['mainz', '🇩🇪'], ['koln', '🇩🇪'], ['cologne', '🇩🇪'], ['freiburg', '🇩🇪'], ['augsburg', '🇩🇪'],
  ['union berlin', '🇩🇪'], ['hamburg', '🇩🇪'], ['hannover', '🇩🇪'], ['nurnberg', '🇩🇪'], ['bochum', '🇩🇪'],
  ['heidenheim', '🇩🇪'], ['kaiserslautern', '🇩🇪'], ['darmstadt', '🇩🇪'], ['st pauli', '🇩🇪'],
  // France
  ['paris saint-germain', '🇫🇷'], ['paris saint germain', '🇫🇷'], ['psg', '🇫🇷'], ['marseille', '🇫🇷'],
  ['lyon', '🇫🇷'], ['monaco', '🇲🇨'], ['lille', '🇫🇷'], ['rennes', '🇫🇷'], ['nice', '🇫🇷'], ['lens', '🇫🇷'],
  ['nantes', '🇫🇷'], ['montpellier', '🇫🇷'], ['strasbourg', '🇫🇷'], ['bordeaux', '🇫🇷'], ['saint-etienne', '🇫🇷'],
  ['saint etienne', '🇫🇷'], ['reims', '🇫🇷'], ['toulouse', '🇫🇷'], ['brest', '🇫🇷'], ['lorient', '🇫🇷'],
  ['metz', '🇫🇷'], ['angers', '🇫🇷'], ['auxerre', '🇫🇷'], ['ajaccio', '🇫🇷'], ['le havre', '🇫🇷'],
  ['troyes', '🇫🇷'], ['clermont', '🇫🇷'],
  // Portugal / Netherlands / Scotland
  ['benfica', '🇵🇹'], ['porto', '🇵🇹'], ['sporting cp', '🇵🇹'], ['sporting lisbon', '🇵🇹'], ['sporting', '🇵🇹'],
  ['braga', '🇵🇹'], ['vitoria guimaraes', '🇵🇹'], ['boavista', '🇵🇹'],
  ['ajax', '🇳🇱'], ['psv', '🇳🇱'], ['feyenoord', '🇳🇱'], ['az alkmaar', '🇳🇱'], ['twente', '🇳🇱'],
  ['utrecht', '🇳🇱'], ['vitesse', '🇳🇱'], ['heerenveen', '🇳🇱'], ['groningen', '🇳🇱'],
  ['celtic', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'], ['rangers', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'], ['aberdeen', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'], ['hearts', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'], ['hibernian', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  // Turkey / Greece / Belgium / Eastern Europe
  ['galatasaray', '🇹🇷'], ['fenerbahce', '🇹🇷'], ['besiktas', '🇹🇷'], ['trabzonspor', '🇹🇷'], ['basaksehir', '🇹🇷'],
  ['olympiacos', '🇬🇷'], ['panathinaikos', '🇬🇷'], ['aek athens', '🇬🇷'], ['paok', '🇬🇷'],
  ['anderlecht', '🇧🇪'], ['club brugge', '🇧🇪'], ['brugge', '🇧🇪'], ['standard liege', '🇧🇪'], ['genk', '🇧🇪'],
  ['gent', '🇧🇪'], ['antwerp', '🇧🇪'],
  ['zenit', '🇷🇺'], ['cska moscow', '🇷🇺'], ['spartak moscow', '🇷🇺'], ['lokomotiv moscow', '🇷🇺'],
  ['krasnodar', '🇷🇺'], ['dynamo moscow', '🇷🇺'], ['rubin', '🇷🇺'],
  ['shakhtar', '🇺🇦'], ['dynamo kyiv', '🇺🇦'], ['dynamo kiev', '🇺🇦'],
  ['legia', '🇵🇱'], ['lech poznan', '🇵🇱'], ['sparta prague', '🇨🇿'], ['sparta praha', '🇨🇿'],
  ['slavia prague', '🇨🇿'], ['slavia praha', '🇨🇿'], ['viktoria plzen', '🇨🇿'],
  ['dinamo zagreb', '🇭🇷'], ['hajduk split', '🇭🇷'], ['rijeka', '🇭🇷'],
  ['red star', '🇷🇸'], ['crvena zvezda', '🇷🇸'], ['partizan', '🇷🇸'],
  // Saudi / Gulf / Asia
  ['al hilal', '🇸🇦'], ['al ittihad', '🇸🇦'], ['al ahli', '🇸🇦'], ['al shabab', '🇸🇦'], ['al ettifaq', '🇸🇦'],
  ['al sadd', '🇶🇦'], ['al duhail', '🇶🇦'], ['al rayyan', '🇶🇦'], ['al gharafa', '🇶🇦'], ['al arabi', '🇶🇦'],
  ['al ain', '🇦🇪'], ['al wahda', '🇦🇪'], ['al jazira', '🇦🇪'], ['shabab al ahli', '🇦🇪'], ['al wasl', '🇦🇪'],
  ['shanghai', '🇨🇳'], ['guangzhou', '🇨🇳'], ['beijing guoan', '🇨🇳'], ['shandong', '🇨🇳'], ['jiangsu', '🇨🇳'],
  ['hebei', '🇨🇳'], ['tianjin', '🇨🇳'], ['dalian', '🇨🇳'], ['wuhan', '🇨🇳'], ['shenzhen', '🇨🇳'],
  ['kashima', '🇯🇵'], ['urawa', '🇯🇵'], ['kawasaki', '🇯🇵'], ['yokohama', '🇯🇵'], ['gamba osaka', '🇯🇵'],
  ['cerezo osaka', '🇯🇵'], ['vissel kobe', '🇯🇵'], ['fc tokyo', '🇯🇵'], ['nagoya', '🇯🇵'],
  ['jeonbuk', '🇰🇷'], ['ulsan', '🇰🇷'], ['fc seoul', '🇰🇷'], ['suwon', '🇰🇷'], ['pohang', '🇰🇷'],
  ['mumbai city', '🇮🇳'], ['mohun bagan', '🇮🇳'], ['kerala blasters', '🇮🇳'],
  // Alpine / Nordics
  ['salzburg', '🇦🇹'], ['rapid wien', '🇦🇹'], ['rapid vienna', '🇦🇹'], ['sturm graz', '🇦🇹'], ['lask', '🇦🇹'],
  ['basel', '🇨🇭'], ['young boys', '🇨🇭'], ['zurich', '🇨🇭'], ['grasshopper', '🇨🇭'], ['servette', '🇨🇭'],
  ['lugano', '🇨🇭'], ['sion', '🇨🇭'],
  ['copenhagen', '🇩🇰'], ['kobenhavn', '🇩🇰'], ['midtjylland', '🇩🇰'], ['brondby', '🇩🇰'],
  ['malmo', '🇸🇪'], ['aik', '🇸🇪'], ['hammarby', '🇸🇪'], ['djurgarden', '🇸🇪'], ['goteborg', '🇸🇪'], ['hacken', '🇸🇪'],
  ['rosenborg', '🇳🇴'], ['molde', '🇳🇴'], ['bodo/glimt', '🇳🇴'], ['bodo glimt', '🇳🇴'],
  // Americas
  ['la galaxy', '🇺🇸'], ['lafc', '🇺🇸'], ['los angeles fc', '🇺🇸'], ['red bulls', '🇺🇸'],
  ['seattle sounders', '🇺🇸'], ['atlanta united', '🇺🇸'], ['austin fc', '🇺🇸'], ['portland timbers', '🇺🇸'],
  ['orlando city', '🇺🇸'], ['chicago fire', '🇺🇸'], ['columbus crew', '🇺🇸'], ['philadelphia union', '🇺🇸'],
  ['dc united', '🇺🇸'], ['fc dallas', '🇺🇸'], ['houston dynamo', '🇺🇸'], ['minnesota united', '🇺🇸'],
  ['st. louis city', '🇺🇸'], ['san jose earthquakes', '🇺🇸'], ['fc cincinnati', '🇺🇸'], ['nashville', '🇺🇸'],
  ['colorado rapids', '🇺🇸'], ['real salt lake', '🇺🇸'], ['charlotte fc', '🇺🇸'], ['new england revolution', '🇺🇸'],
  ['club america', '🇲🇽'], ['guadalajara', '🇲🇽'], ['chivas', '🇲🇽'], ['cruz azul', '🇲🇽'], ['pumas', '🇲🇽'],
  ['unam', '🇲🇽'], ['tigres', '🇲🇽'], ['uanl', '🇲🇽'], ['monterrey', '🇲🇽'], ['santos laguna', '🇲🇽'],
  ['toluca', '🇲🇽'], ['pachuca', '🇲🇽'], ['club leon', '🇲🇽'], ['atlas', '🇲🇽'], ['puebla', '🇲🇽'],
  ['necaxa', '🇲🇽'], ['queretaro', '🇲🇽'], ['tijuana', '🇲🇽'], ['juarez', '🇲🇽'], ['mazatlan', '🇲🇽'],
  ['boca juniors', '🇦🇷'], ['river plate', '🇦🇷'], ['racing club', '🇦🇷'], ['independiente', '🇦🇷'],
  ['san lorenzo', '🇦🇷'], ['estudiantes', '🇦🇷'], ['velez', '🇦🇷'], ['newell', '🇦🇷'], ['rosario central', '🇦🇷'],
  ['lanus', '🇦🇷'], ['banfield', '🇦🇷'], ['talleres', '🇦🇷'], ['gimnasia', '🇦🇷'], ['huracan', '🇦🇷'],
  ['argentinos juniors', '🇦🇷'], ['godoy cruz', '🇦🇷'],
  ['flamengo', '🇧🇷'], ['palmeiras', '🇧🇷'], ['corinthians', '🇧🇷'], ['sao paulo', '🇧🇷'], ['santos', '🇧🇷'],
  ['gremio', '🇧🇷'], ['fluminense', '🇧🇷'], ['botafogo', '🇧🇷'], ['vasco', '🇧🇷'], ['cruzeiro', '🇧🇷'],
  ['bahia', '🇧🇷'], ['fortaleza', '🇧🇷'], ['ceara', '🇧🇷'], ['sport recife', '🇧🇷'], ['coritiba', '🇧🇷'],
  ['goias', '🇧🇷'], ['bragantino', '🇧🇷'], ['cuiaba', '🇧🇷'], ['juventude', '🇧🇷'], ['chapecoense', '🇧🇷'],
  ['ponte preta', '🇧🇷'], ['avai', '🇧🇷'], ['vitoria', '🇧🇷'],
  ['penarol', '🇺🇾'], ['nacional', '🇺🇾'],
  ['colo-colo', '🇨🇱'], ['colo colo', '🇨🇱'], ['universidad de chile', '🇨🇱'], ['universidad catolica', '🇨🇱'],
  ['alianza lima', '🇵🇪'], ['universitario', '🇵🇪'],
  ['millonarios', '🇨🇴'], ['junior', '🇨🇴'], ['ldu quito', '🇪🇨'], ['olimpia', '🇵🇾'], ['cerro porteno', '🇵🇾'],
  // Africa / Oceania
  ['al ahly', '🇪🇬'], ['zamalek', '🇪🇬'], ['wydad', '🇲🇦'], ['raja', '🇲🇦'], ['esperance', '🇹🇳'],
  ['kaizer chiefs', '🇿🇦'], ['orlando pirates', '🇿🇦'], ['mamelodi sundowns', '🇿🇦'],
  ['sydney fc', '🇦🇺'], ['melbourne victory', '🇦🇺'], ['melbourne city', '🇦🇺'], ['western sydney', '🇦🇺'],
  ['adelaide united', '🇦🇺'], ['brisbane roar', '🇦🇺'],
];

/** Flag for the country a CLUB plays in (not the player's nationality).
 *  National-team stints resolve through the country-name scan first. */
export function flagForClub(club: string | null | undefined): string {
  if (!club) return '';
  const norm = normalizeName(club);
  for (const [country, flag] of COUNTRY_FLAGS) {
    if (new RegExp(`\\b${escapeRegExp(country)}\\b`).test(norm)) return flag;
  }
  for (const [pattern, flag] of CLUB_COUNTRY) {
    if (norm.includes(pattern)) return flag;
  }
  return '';
}

/** market_value is stored as whole millions of euros. */
export function fmtMarketValue(value: number | null): string {
  if (value == null || value <= 0) return '';
  return `€${value}M`;
}

const SEASON_COLS = 'player_id, season, club, goals, assists, appearances, market_value, sort_order';
const PAGE_SIZE = 1000;

/**
 * Loads the whole pool: one query for players, plus paged queries for the
 * ~1726 season rows (PostgREST caps a single response at 1000 rows, so a lone
 * query would silently drop stints). Seasons are grouped per player on the
 * client and sorted by sort_order, which is chronological (0 = earliest).
 * Returns null when anything fails so the page can show an error state.
 */
export async function fetchCareerPool(): Promise<CareerPlayer[] | null> {
  try {
    const { data: playerRows, error: playersError } = await supabase
      .from('career_players' as any)
      .select('id, player_name, nationality, position');
    if (playersError) throw playersError;

    const seasonRows: any[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('career_seasons' as any)
        .select(SEASON_COLS)
        .order('player_id', { ascending: true })
        .order('sort_order', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const chunk = (data ?? []) as any[];
      seasonRows.push(...chunk);
      if (chunk.length < PAGE_SIZE) break;
    }

    const stintsByPlayer = new Map<string, CareerStint[]>();
    for (const row of seasonRows) {
      const stint: CareerStint = {
        season: String(row.season ?? ''),
        club: String(row.club ?? ''),
        goals: row.goals ?? null,
        assists: row.assists ?? null,
        appearances: row.appearances ?? null,
        marketValue: row.market_value ?? null,
        sortOrder: Number(row.sort_order ?? 0),
      };
      const key = String(row.player_id);
      const list = stintsByPlayer.get(key);
      if (list) list.push(stint);
      else stintsByPlayer.set(key, [stint]);
    }

    const players: CareerPlayer[] = ((playerRows ?? []) as any[])
      .map(p => ({
        id: String(p.id),
        name: String(p.player_name ?? ''),
        nationality: String(p.nationality ?? ''),
        position: String(p.position ?? ''),
        seasons: (stintsByPlayer.get(String(p.id)) ?? []).sort(
          (a, b) => a.sortOrder - b.sortOrder,
        ),
      }))
      .filter(p => p.name.length > 0);

    return players;
  } catch {
    return null;
  }
}
