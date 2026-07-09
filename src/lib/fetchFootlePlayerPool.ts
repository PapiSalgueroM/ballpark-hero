import { supabase } from '@/integrations/supabase/client';
import { Player, Position, League } from '@/types/game';
import { players as fallbackPlayers } from '@/data/players';
import { getEnrichment } from '@/data/footleEnrichment';
import { normalizeName } from '@/lib/playerSearch';

// ---------------------------------------------------------------------------
// GOATs that no longer rank highly by CURRENT market value but are the most
// recognizable names in the sport. They are always merged into the pool and
// always tiered 'easy' — value is a fame proxy that breaks for aging legends
// (a 39-year-old Messi is worth $12.8M, less than a mid-table squad player).
// ---------------------------------------------------------------------------
const GOAT_NAMES = new Set([
  'Lionel Messi',
  'Cristiano Ronaldo',
  'Neymar',
  'Zlatan Ibrahimovic',
  'Karim Benzema',
  'Andrés Iniesta',
  'Xavi',
  'Luka Modric',
  'Robert Lewandowski',
  'Sergio Ramos',
  'Gareth Bale',
  'Kylian Mbappé',
  'Luis Suárez',
]);

// Accent/case-insensitive GOAT keys so DB spellings ("Luka Modrić") and the
// fallback file's accents both match the list above.
const GOAT_KEYS = new Set([...GOAT_NAMES].map(n => normalizeName(n)));

// ---------------------------------------------------------------------------
// Transfermarkt-style position string → Position union type
// ---------------------------------------------------------------------------
const POSITION_NORMALIZE: Record<string, Position> = {
  // Goalkeepers
  'Goalkeeper': 'GK',
  'GK': 'GK',

  // Defenders
  'Centre-Back': 'CB',
  'Center-Back': 'CB',
  'CB': 'CB',
  'Left-Back': 'LB',
  'LB': 'LB',
  'Right-Back': 'RB',
  'RB': 'RB',
  'Left Wing-Back': 'LWB',
  'LWB': 'LWB',
  'Right Wing-Back': 'RWB',
  'RWB': 'RWB',
  'Defender': 'CB',

  // Midfielders
  'Defensive Midfield': 'CDM',
  'Central Midfield': 'CM',
  'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM',
  'Right Midfield': 'RM',
  'CDM': 'CDM',
  'CM': 'CM',
  'CAM': 'CAM',
  'LM': 'LM',
  'RM': 'RM',
  'Midfield': 'CM',

  // Forwards
  'Left Winger': 'LW',
  'Right Winger': 'RW',
  'Centre-Forward': 'CF',
  'Center-Forward': 'CF',
  'Second Striker': 'CF',
  'Striker': 'ST',
  'LW': 'LW',
  'RW': 'RW',
  'CF': 'CF',
  'ST': 'ST',
  'Forward': 'ST',
  'Attack': 'ST',
};

// ---------------------------------------------------------------------------
// Difficulty bands (owner feedback 2026-07-08: "I put unlimited mode on
// insane and I just got Messi. Insane should be a nobody").
//
// The old pool was the global top 150 by value split 40/40/20 per position
// group, so even 'insane' was a $40M+ star. The new bands are absolute:
//   easy   = GOATs + the global top EASY_TOP_N by 2026 market value
//            (rank 80 ≈ $65M — verified via SQL on flawuiqbvjobmkfkauhw,
//            2026-07-08: rank 1 = $216M, rank 80 = $65M, rank 300 = $32M,
//            rank 500 = $24M).
//   hard   = ranks EASY_TOP_N+1 .. FAMOUS_FETCH_N (≈ $32-65M): squad-rotation
//            names at big clubs.
//   insane = a separate low-value batch, value UNDER INSANE_VALUE_CEILING
//            (≈ global rank 1,500+, nowhere near the top 500): genuinely
//            obscure pros from second tiers, smaller leagues and deep squads.
// A player appears in exactly one band: the insane batch can't overlap the
// famous batch by value, and GOAT names are excluded from it by name.
// ---------------------------------------------------------------------------
const EASY_TOP_N = 80;
const FAMOUS_FETCH_N = 300;
const INSANE_VALUE_CEILING = 8_000_000; // USD
const INSANE_POOL_MAX = 1200;

// ---------------------------------------------------------------------------
// Honest league labels for the obscure batch.
//
// getEnrichment() falls back to 'Premier League' for any club it doesn't
// know, which is fine for the famous top-300 (nearly all name-mapped) but
// would tag ~1,000 obscure players with a fake league — and compareGuess()
// paints the club tile yellow on a league match, so fake leagues would emit
// actively wrong "close" hints. Instead the insane batch is fetched ONLY from
// clubs listed here, with the league labeled by hand. Club spellings are the
// exact player_market_values.club strings for 2025/26 (verified via SQL on
// flawuiqbvjobmkfkauhw, 2026-07-08); leagues are each club's 2025/26 division.
// ---------------------------------------------------------------------------
const INSANE_CLUB_LEAGUE: Record<string, League> = {
  // Serie A
  'Pisa Sporting Club': 'Serie A', 'Udinese Calcio': 'Serie A', 'Torino FC': 'Serie A',
  'US Cremonese': 'Serie A', 'US Lecce': 'Serie A', 'Cagliari Calcio': 'Serie A',
  'Hellas Verona': 'Serie A', 'Genoa CFC': 'Serie A', 'Parma Calcio 1913': 'Serie A',
  'SS Lazio': 'Serie A', 'Bologna FC 1909': 'Serie A', 'US Sassuolo': 'Serie A',
  // La Liga
  'RCD Mallorca': 'La Liga', 'Elche CF': 'La Liga', 'Deportivo Alavés': 'La Liga',
  'Real Oviedo': 'La Liga', 'Athletic Bilbao': 'La Liga', 'Valencia CF': 'La Liga',
  'Villarreal CF': 'La Liga', 'Real Betis Balompié': 'La Liga', 'Girona FC': 'La Liga',
  'Rayo Vallecano': 'La Liga', 'RCD Espanyol Barcelona': 'La Liga',
  // Bundesliga
  'VfL Wolfsburg': 'Bundesliga', 'FC Augsburg': 'Bundesliga', 'Borussia Mönchengladbach': 'Bundesliga',
  '1.FC Heidenheim 1846': 'Bundesliga', '1.FC Köln': 'Bundesliga', 'Hamburger SV': 'Bundesliga',
  '1.FC Union Berlin': 'Bundesliga', 'SV Werder Bremen': 'Bundesliga', 'TSG 1899 Hoffenheim': 'Bundesliga',
  'FC St. Pauli': 'Bundesliga', '1.FSV Mainz 05': 'Bundesliga', 'RB Leipzig': 'Bundesliga',
  // Ligue 1
  'Stade Brestois 29': 'Ligue 1', 'RC Lens': 'Ligue 1', 'FC Lorient': 'Ligue 1',
  'FC Toulouse': 'Ligue 1', 'AJ Auxerre': 'Ligue 1', 'Le Havre AC': 'Ligue 1', 'Paris FC': 'Ligue 1',
  // Premier League fringe
  'Burnley FC': 'Premier League',
  // EFL Championship
  'Norwich City': 'EFL Championship', 'Birmingham City': 'EFL Championship',
  'Queens Park Rangers': 'EFL Championship', 'Preston North End': 'EFL Championship',
  'Bristol City': 'EFL Championship', 'Watford FC': 'EFL Championship',
  'Sheffield United': 'EFL Championship', 'Stoke City': 'EFL Championship',
  'Millwall FC': 'EFL Championship', 'Swansea City': 'EFL Championship',
  'West Bromwich Albion': 'EFL Championship', 'Southampton FC': 'EFL Championship',
  'Leicester City': 'EFL Championship', 'Ipswich Town': 'EFL Championship',
  // Belgian Pro League
  'RSC Anderlecht': 'Belgian Pro League', 'KRC Genk': 'Belgian Pro League',
  'KAA Gent': 'Belgian Pro League', 'Union Saint-Gilloise': 'Belgian Pro League',
  'Royal Antwerp FC': 'Belgian Pro League', 'Club Brugge KV': 'Belgian Pro League',
  // Eredivisie
  'Ajax Amsterdam': 'Eredivisie', 'Feyenoord Rotterdam': 'Eredivisie', 'AZ Alkmaar': 'Eredivisie',
  // Liga Portugal
  'FC Famalicão': 'Liga Portugal', 'Vitória Guimarães SC': 'Liga Portugal', 'Rio Ave FC': 'Liga Portugal',
  // Scottish Premiership
  'Rangers FC': 'Scottish Premiership', 'Celtic FC': 'Scottish Premiership',
  // Turkish Süper Lig
  'Besiktas JK': 'Turkish Süper Lig', 'Trabzonspor': 'Turkish Süper Lig',
  'Samsunspor': 'Turkish Süper Lig', 'Basaksehir FK': 'Turkish Süper Lig',
  // Greek Super League
  'AEK Athens': 'Greek Super League', 'Olympiacos Piraeus': 'Greek Super League',
  'Panathinaikos': 'Greek Super League', 'PAOK Thessaloniki': 'Greek Super League',
  // Czech First League
  'AC Sparta Prague': 'Czech First League', 'SK Slavia Prague': 'Czech First League',
  'FC Viktoria Plzen': 'Czech First League',
  // Danish Superliga
  'FC Copenhagen': 'Danish Superliga',
  // Austrian Bundesliga
  'Red Bull Salzburg': 'Austrian Bundesliga',
  // Swiss Super League
  'FC Basel 1893': 'Swiss Super League', 'FC St. Gallen 1879': 'Swiss Super League',
  // Croatian HNL
  'GNK Dinamo Zagreb': 'Croatian HNL',
  // Polish Ekstraklasa
  'Raków Częstochowa': 'Polish Ekstraklasa', 'Legia Warszawa': 'Polish Ekstraklasa',
  // Ukrainian Premier League
  'Shakhtar Donetsk': 'Ukrainian Premier League', 'Dynamo Kyiv': 'Ukrainian Premier League',
  // Russian Premier League
  'Lokomotiv Moscow': 'Russian Premier League', 'Spartak Moscow': 'Russian Premier League',
  'Dynamo Moscow': 'Russian Premier League', 'CSKA Moscow': 'Russian Premier League',
  'FC Rostov': 'Russian Premier League',
  // Serbian SuperLiga
  'Red Star Belgrade': 'Serbian SuperLiga',
  // MLS
  'Columbus Crew': 'MLS', 'New England Revolution': 'MLS', 'Seattle Sounders FC': 'MLS',
  'Inter Miami CF': 'MLS', 'Austin FC': 'MLS', 'Minnesota United FC': 'MLS',
  'Portland Timbers': 'MLS', 'Charlotte FC': 'MLS', 'Red Bull New York': 'MLS',
  'Orlando City SC': 'MLS', 'Houston Dynamo FC': 'MLS', 'Vancouver Whitecaps FC': 'MLS',
  // Liga MX
  'CF América': 'Liga MX', 'CF Monterrey': 'Liga MX', 'Deportivo Toluca': 'Liga MX',
  'CD Cruz Azul': 'Liga MX', 'Club León FC': 'Liga MX', 'Tigres UANL': 'Liga MX',
  'Atlético de San Luis': 'Liga MX', 'Club Necaxa': 'Liga MX', 'Deportivo Guadalajara': 'Liga MX',
  // Argentine Primera División
  'CA River Plate': 'Argentine Primera División', 'CA Boca Juniors': 'Argentine Primera División',
  'Racing Club': 'Argentine Primera División', 'CA Rosario Central': 'Argentine Primera División',
  'CA Independiente': 'Argentine Primera División', 'Club Estudiantes de La Plata': 'Argentine Primera División',
  // Brazilian Série A
  'Sport Club Internacional': 'Brazilian Série A', 'Red Bull Bragantino': 'Brazilian Série A',
  'Esporte Clube Bahia': 'Brazilian Série A', 'Clube Atlético Mineiro': 'Brazilian Série A',
  'Club Athletico Paranaense': 'Brazilian Série A', 'Sociedade Esportiva Palmeiras': 'Brazilian Série A',
  'São Paulo Futebol Clube': 'Brazilian Série A', 'Grêmio Foot-Ball Porto Alegrense': 'Brazilian Série A',
  'Fluminense Football Club': 'Brazilian Série A', 'Clube de Regatas Vasco da Gama': 'Brazilian Série A',
  'Santos FC': 'Brazilian Série A',
  // J1 League
  'Sanfrecce Hiroshima': 'J1 League',
  // UAE Pro League
  'Sharjah FC': 'UAE Pro League',
};

interface MarketRow {
  player_name: string;
  position: string | null;
  age: number;
  nationality: string;
  club: string;
  market_value_usd: number;
  goals: number | null;
  assists: number | null;
}

/**
 * Fetches the sub-$8M obscure batch, restricted to clubs whose 2025/26 league
 * is known (INSANE_CLUB_LEAGUE). Split into two .in() chunks so the request
 * URLs stay comfortably small, same pattern whoAmI's fetchClubHistory uses.
 */
async function fetchObscureRows(): Promise<MarketRow[] | null> {
  const clubs = Object.keys(INSANE_CLUB_LEAGUE);
  const mid = Math.ceil(clubs.length / 2);
  const chunks = [clubs.slice(0, mid), clubs.slice(mid)];
  const results = await Promise.all(
    chunks.map(chunk =>
      supabase
        .from('player_market_values')
        .select('player_name, position, age, nationality, club, market_value_usd, goals, assists')
        .eq('year', 2026)
        .gt('market_value_usd', 0)
        .lt('market_value_usd', INSANE_VALUE_CEILING)
        .not('age', 'is', null)
        .in('club', chunk)
        .order('market_value_usd', { ascending: false })
        .order('player_name', { ascending: true })
        .limit(1000),
    ),
  );
  if (results.some(r => r.error)) return null;
  const rows = results.flatMap(r => (r.data ?? []) as MarketRow[]);
  // Deterministic order so the daily-puzzle index maps to the same player for
  // every visitor: value desc, then name asc (names are unique per 2026 row).
  rows.sort((a, b) => b.market_value_usd - a.market_value_usd || a.player_name.localeCompare(b.player_name));
  return rows.slice(0, INSANE_POOL_MAX);
}

// ---------------------------------------------------------------------------
// Main export: famous top-300 (easy/hard) + obscure sub-$8M batch (insane).
// Returns [] on any error — the caller (useGame.ts) falls back to players.ts,
// which carries its own hand-labeled easy/hard/insane tiers.
// ---------------------------------------------------------------------------
export async function fetchFootlePlayerPool(): Promise<Player[]> {
  try {
    const famousQuery = supabase
      .from('player_market_values')
      .select('player_name, position, age, nationality, club, market_value_usd, goals, assists')
      .eq('year', 2026)
      .not('age', 'is', null)
      // Order by real market value (global), not `rank` — `rank` is per-position.
      // player_name breaks value ties deterministically (2026 rows are already
      // deduped to one per player) so every client builds an identical pool,
      // which the seeded daily puzzle index depends on.
      .order('market_value_usd', { ascending: false })
      .order('player_name', { ascending: true })
      .limit(FAMOUS_FETCH_N);

    const [famousRes, obscureRows] = await Promise.all([famousQuery, fetchObscureRows()]);

    if (famousRes.error || !famousRes.data || famousRes.data.length === 0) {
      console.warn('[fetchFootlePlayerPool] Supabase returned empty or errored — using fallback');
      return [];
    }

    const pool: Player[] = [];
    const takenKeys = new Set<string>();

    // ---- easy + hard: the famous top-300 by current value ----
    let famousMapped = 0;
    for (const row of famousRes.data as MarketRow[]) {
      const position = POSITION_NORMALIZE[row.position ?? ''];
      if (!position) {
        console.warn(`[fetchFootlePlayerPool] Unknown position "${row.position}" for ${row.player_name} — skipping`);
        continue;
      }
      const key = normalizeName(row.player_name);
      if (takenKeys.has(key)) continue;
      takenKeys.add(key);

      const enrichment = getEnrichment(row.player_name, row.club);
      const isGoat = GOAT_KEYS.has(key);
      pool.push({
        name: row.player_name,
        club: row.club,
        nationality: row.nationality,
        league: enrichment.league,
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
        position,
        kitNumber: enrichment.kitNumber,
        age: row.age,
        marketValue: Math.round(row.market_value_usd / 1_000_000),
        // GOATs are always 'easy' regardless of rank; everyone else splits by
        // global value rank: top EASY_TOP_N famous, the rest squad-rotation hard.
        difficulty: isGoat || famousMapped < EASY_TOP_N ? 'easy' : 'hard',
      });
      famousMapped++;
    }

    // ---- GOATs missing from the famous batch (aging legends with low current
    // value, e.g. Messi at $12.8M) come from the players.ts fallback, always easy.
    for (const goatKey of GOAT_KEYS) {
      if (takenKeys.has(goatKey)) continue;
      const fallback = fallbackPlayers.find(p => normalizeName(p.name) === goatKey);
      if (fallback) {
        takenKeys.add(goatKey);
        pool.push({ ...fallback, difficulty: 'easy' });
      }
      // If not in fallbackPlayers either, silently skip
    }

    // ---- insane: the obscure batch. Never a GOAT, never someone already
    // placed in easy/hard (the value ranges can't overlap, but be safe).
    if (obscureRows) {
      for (const row of obscureRows) {
        const position = POSITION_NORMALIZE[row.position ?? ''];
        if (!position) continue;
        const key = normalizeName(row.player_name);
        if (takenKeys.has(key) || GOAT_KEYS.has(key)) continue;
        const league = INSANE_CLUB_LEAGUE[row.club];
        if (!league) continue;
        takenKeys.add(key);
        pool.push({
          name: row.player_name,
          club: row.club,
          nationality: row.nationality,
          league,
          goals: row.goals ?? 0,
          assists: row.assists ?? 0,
          position,
          // No kit-number data for players this obscure; 0 is the existing
          // "unknown" convention getEnrichment uses. getEnrichment itself is
          // deliberately NOT called here: a name collision with a famous entry
          // (e.g. a youth "Gabriel Jesus") would poison league/kit data.
          kitNumber: 0,
          age: row.age,
          marketValue: Math.round(row.market_value_usd / 1_000_000),
          difficulty: 'insane',
        });
      }
    } else {
      console.warn('[fetchFootlePlayerPool] Obscure batch failed — pool has no insane tier this session');
    }

    return pool;
  } catch (err) {
    console.warn('[fetchFootlePlayerPool] Unexpected error:', err);
    return [];
  }
}
