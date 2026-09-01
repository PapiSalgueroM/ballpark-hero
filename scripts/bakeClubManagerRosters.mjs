/**
 * Rounds 70+72: bake real rosters for Club Manager from the Transfermarkt
 * style data in Supabase (player_market_values_dedup view), then apply the
 * VERIFIED summer 2026 transfer overlay (scripts/transferOverlay2026.mjs)
 * so squads reflect August 2026 after the window, not the pre-window
 * snapshot the dataset was imported from.
 *
 * Leagues baked: the big five (2026-27 memberships), EFL Championship,
 * Saudi Pro League, MLS East + West, Eredivisie, plus the UCL flavor clubs.
 * Preference order per player: year 2026 row, else year 2025 row (value
 * discounted 5%, age +1). Clubs with fewer than 8 real players are listed
 * in CM_PARTIAL so the UI can say so honestly.
 *
 * Re-run whenever the data or the overlay moves:
 *   node scripts/bakeClubManagerRosters.mjs
 *
 * FAILS CLOSED on unmapped positions, missing anchor players, or thin CORE
 * league clubs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { TRANSFER_OVERLAY_2026 } from './transferOverlay2026.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ */
/* Supabase client from the app's own hardcoded values                */
/* ------------------------------------------------------------------ */
const clientTs = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const urlMatch = clientTs.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
const keyMatch = clientTs.match(/eyJ[A-Za-z0-9_.-]+/);
if (!urlMatch || !keyMatch) {
  console.error('FATAL: could not extract Supabase URL/key from client.ts');
  process.exit(1);
}
const supabase = createClient(urlMatch[0], keyMatch[0], { auth: { persistSession: false } });

/* ------------------------------------------------------------------ */
/* DB club name -> engine club name                                   */
/* ------------------------------------------------------------------ */
const DB_TO_ENGINE = {
  // Premier League 2026-27
  'Arsenal FC': 'Arsenal', 'Aston Villa': 'Aston Villa', 'AFC Bournemouth': 'Bournemouth',
  'Brentford FC': 'Brentford', 'Brighton & Hove Albion': 'Brighton',
  'Chelsea FC': 'Chelsea', 'Coventry City': 'Coventry City', 'Crystal Palace': 'Crystal Palace',
  'Everton FC': 'Everton', 'Fulham FC': 'Fulham', 'Hull City': 'Hull City',
  'Ipswich Town': 'Ipswich Town', 'Leeds United': 'Leeds United', 'Liverpool FC': 'Liverpool',
  'Manchester City': 'Manchester City', 'Manchester United': 'Manchester United',
  'Newcastle United': 'Newcastle', 'Nottingham Forest': 'Nottingham Forest',
  'Sunderland AFC': 'Sunderland', 'Tottenham Hotspur': 'Tottenham',
  // EFL Championship 2026-27
  'West Ham United': 'West Ham', 'Wolverhampton Wanderers': 'Wolves', 'Burnley FC': 'Burnley',
  'Birmingham City': 'Birmingham City', 'Blackburn Rovers': 'Blackburn Rovers',
  'Bolton Wanderers': 'Bolton Wanderers', 'Bristol City': 'Bristol City',
  'Cardiff City': 'Cardiff City', 'Charlton Athletic': 'Charlton Athletic',
  'Derby County': 'Derby County', 'Lincoln City': 'Lincoln City',
  'Middlesbrough FC': 'Middlesbrough', 'Millwall FC': 'Millwall', 'Norwich City': 'Norwich City',
  'Portsmouth FC': 'Portsmouth', 'Preston North End': 'Preston North End',
  'Queens Park Rangers': 'QPR', 'Sheffield United': 'Sheffield United',
  'Southampton FC': 'Southampton', 'Stoke City': 'Stoke City', 'Swansea City': 'Swansea City',
  'Watford FC': 'Watford', 'West Bromwich Albion': 'West Brom', 'Wrexham AFC': 'Wrexham',
  // La Liga 2026-27
  'Deportivo Alavés': 'Alavés', 'Athletic Bilbao': 'Athletic Club', 'Atlético de Madrid': 'Atlético Madrid',
  'FC Barcelona': 'Barcelona', 'Real Betis Balompié': 'Real Betis', 'Celta de Vigo': 'Celta Vigo',
  'Deportivo de La Coruña': 'Deportivo La Coruña', 'Elche CF': 'Elche',
  'RCD Espanyol Barcelona': 'Espanyol', 'Getafe CF': 'Getafe', 'Levante UD': 'Levante',
  'Málaga CF': 'Málaga', 'CA Osasuna': 'Osasuna', 'Racing Santander': 'Racing Santander',
  'Rayo Vallecano': 'Rayo Vallecano', 'Real Madrid': 'Real Madrid', 'Real Sociedad': 'Real Sociedad',
  'Sevilla FC': 'Sevilla', 'Valencia CF': 'Valencia', 'Villarreal CF': 'Villarreal',
  // Serie A 2026-27
  'Atalanta BC': 'Atalanta', 'Bologna FC 1909': 'Bologna', 'Cagliari Calcio': 'Cagliari',
  'Como 1907': 'Como', 'ACF Fiorentina': 'Fiorentina', 'Frosinone Calcio': 'Frosinone',
  'Genoa CFC': 'Genoa', 'Inter Milan': 'Inter Milan', 'Juventus FC': 'Juventus',
  'SS Lazio': 'Lazio', 'US Lecce': 'Lecce', 'AC Milan': 'AC Milan', 'AC Monza': 'Monza',
  'SSC Napoli': 'Napoli', 'Parma Calcio 1913': 'Parma', 'AS Roma': 'Roma',
  'US Sassuolo': 'Sassuolo', 'Torino FC': 'Torino', 'Udinese Calcio': 'Udinese',
  'Venezia FC': 'Venezia',
  // Bundesliga 2026-27
  'FC Augsburg': 'Augsburg', 'Bayer 04 Leverkusen': 'Bayer Leverkusen', 'Bayern Munich': 'Bayern Munich',
  'Borussia Dortmund': 'Borussia Dortmund', 'Borussia Mönchengladbach': 'Gladbach',
  'Eintracht Frankfurt': 'Eintracht Frankfurt', 'SC Freiburg': 'Freiburg', 'Hamburger SV': 'Hamburg',
  'TSG 1899 Hoffenheim': 'Hoffenheim', '1.FC Köln': 'Köln', '1.FSV Mainz 05': 'Mainz',
  'RB Leipzig': 'RB Leipzig', 'FC Schalke 04': 'Schalke 04', 'SV 07 Elversberg': 'Elversberg',
  'SC Paderborn 07': 'Paderborn', 'VfB Stuttgart': 'Stuttgart',
  '1.FC Union Berlin': 'Union Berlin', 'SV Werder Bremen': 'Werder Bremen',
  // Ligue 1 2026-27
  'Angers SCO': 'Angers', 'AJ Auxerre': 'Auxerre', 'Stade Brestois 29': 'Brest',
  'Le Havre AC': 'Le Havre', 'Le Mans FC': 'Le Mans', 'RC Lens': 'Lens', 'LOSC Lille': 'Lille',
  'FC Lorient': 'Lorient', 'Olympique Lyon': 'Lyon', 'Olympique Marseille': 'Marseille',
  'AS Monaco': 'Monaco', 'OGC Nice': 'Nice', 'Paris FC': 'Paris FC',
  'Paris Saint-Germain': 'PSG', 'Stade Rennais FC': 'Rennes', 'RC Strasbourg Alsace': 'Strasbourg',
  'FC Toulouse': 'Toulouse', 'ESTAC Troyes': 'Troyes',
  // Saudi Pro League 2026-27
  'Al-Ahli SFC': 'Al-Ahli', 'Al-Ettifaq FC': 'Al-Ettifaq', 'Al-Faisaly FC': 'Al-Faisaly',
  'Al-Fateh SC': 'Al-Fateh', 'Al-Fayha FC': 'Al-Fayha', 'Al-Hazem SC': 'Al-Hazem',
  'Al-Hilal SFC': 'Al-Hilal', 'Al-Ittihad Club': 'Al-Ittihad', 'Al-Khaleej FC': 'Al-Khaleej',
  'Al-Kholood Club': 'Al-Kholood', 'Al-Nassr FC': 'Al-Nassr', 'Al-Qadsiah FC': 'Al-Qadsiah',
  'Al-Riyadh SC': 'Al-Riyadh', 'Al-Shabab FC': 'Al-Shabab', 'Al-Taawoun FC': 'Al-Taawoun',
  'Al-Diraiyah FC': 'Al-Diriyah', 'NEOM SC': 'NEOM SC',
  // MLS 2026
  'Atlanta United FC': 'Atlanta United', 'Charlotte FC': 'Charlotte FC',
  'Chicago Fire FC': 'Chicago Fire', 'FC Cincinnati': 'FC Cincinnati',
  'Columbus Crew': 'Columbus Crew', 'D.C. United': 'D.C. United', 'Inter Miami CF': 'Inter Miami',
  'CF Montréal': 'CF Montréal', 'Nashville SC': 'Nashville SC',
  'New England Revolution': 'New England Revolution', 'New York City FC': 'New York City FC',
  'Red Bull New York': 'New York Red Bulls', 'Orlando City SC': 'Orlando City',
  'Philadelphia Union': 'Philadelphia Union', 'Toronto FC': 'Toronto FC',
  'Austin FC': 'Austin FC', 'Colorado Rapids': 'Colorado Rapids', 'FC Dallas': 'FC Dallas',
  'Houston Dynamo FC': 'Houston Dynamo', 'Los Angeles Galaxy': 'LA Galaxy',
  'Los Angeles FC': 'LAFC', 'Minnesota United FC': 'Minnesota United',
  'Portland Timbers': 'Portland Timbers', 'Real Salt Lake City': 'Real Salt Lake',
  'San Diego FC': 'San Diego FC', 'San Jose Earthquakes': 'San Jose Earthquakes',
  'Seattle Sounders FC': 'Seattle Sounders', 'Sporting Kansas City': 'Sporting Kansas City',
  'St. Louis CITY SC': 'St. Louis City', 'Vancouver Whitecaps FC': 'Vancouver Whitecaps',
  // Eredivisie 2026-27
  'Ajax Amsterdam': 'Ajax', 'PSV Eindhoven': 'PSV', 'Feyenoord Rotterdam': 'Feyenoord',
  'AZ Alkmaar': 'AZ Alkmaar', 'FC Utrecht': 'Utrecht', 'FC Twente Enschede': 'Twente',
  'NEC Nijmegen': 'NEC Nijmegen', 'Sparta Rotterdam': 'Sparta Rotterdam',
  'Go Ahead Eagles': 'Go Ahead Eagles', 'Fortuna Sittard': 'Fortuna Sittard',
  'SC Heerenveen': 'Heerenveen', 'PEC Zwolle': 'PEC Zwolle', 'FC Groningen': 'Groningen',
  'Excelsior Rotterdam': 'Excelsior', 'SC Telstar': 'Telstar', 'Willem II Tilburg': 'Willem II',
  // Primeira Liga 2026-27 (Round 140: promoted Marítimo + Académico de Viseu
  // replace relegated Tondela + AVS; Casa Pia survived the playoff)
  'SL Benfica': 'Benfica', 'FC Porto': 'Porto', 'Sporting CP': 'Sporting CP',
  'SC Braga': 'Braga', 'Vitória Guimarães SC': 'Vitória Guimarães',
  'FC Famalicão': 'Famalicão', 'Rio Ave FC': 'Rio Ave', 'Casa Pia AC': 'Casa Pia',
  'GD Estoril Praia': 'Estoril', 'Moreirense FC': 'Moreirense', 'FC Arouca': 'Arouca',
  'Gil Vicente FC': 'Gil Vicente', 'CD Santa Clara': 'Santa Clara', 'CD Nacional': 'Nacional',
  'CF Estrela Amadora': 'Estrela Amadora', 'FC Alverca': 'Alverca',
  // Scottish Premiership 2026-27 (St Johnstone up, Livingston down,
  // St Mirren survived the playoff)
  'Celtic FC': 'Celtic', 'Rangers FC': 'Rangers', 'Aberdeen FC': 'Aberdeen',
  'Heart of Midlothian FC': 'Hearts', 'Hibernian FC': 'Hibernian',
  'Dundee United FC': 'Dundee United', 'Dundee FC': 'Dundee', 'Motherwell FC': 'Motherwell',
  'Kilmarnock FC': 'Kilmarnock', 'Falkirk FC': 'Falkirk', 'St. Johnstone FC': 'St Johnstone',
  // Süper Lig 2026-27 (Erzurumspor, Amedspor and Çorum FK up; Antalyaspor,
  // Kayserispor and Fatih Karagümrük down)
  'Galatasaray': 'Galatasaray', 'Fenerbahce': 'Fenerbahçe', 'Besiktas JK': 'Beşiktaş',
  'Trabzonspor': 'Trabzonspor', 'Basaksehir FK': 'Başakşehir', 'Samsunspor': 'Samsunspor',
  'Eyüpspor': 'Eyüpspor', 'Göztepe': 'Göztepe', 'Kasimpasa': 'Kasımpaşa',
  'Alanyaspor': 'Alanyaspor', 'Konyaspor': 'Konyaspor', 'Gaziantep FK': 'Gaziantep FK',
  'Genclerbirligi Ankara': 'Gençlerbirliği', 'Caykur Rizespor': 'Rizespor',
  // Round 177: Austrian Bundesliga 2026-27 (Rapid, LASK and co join; RB
  // Salzburg was already baked as a UCL flavor club and keeps its name).
  // Membership verified 2026-08-19 against worldfootball's live table and
  // Soccerway's fixtures, which agree on all twelve.
  'Red Bull Salzburg': 'RB Salzburg', 'SK Sturm Graz': 'Sturm Graz',
  'Rapid Vienna': 'Rapid Wien', 'LASK': 'LASK', 'Wolfsberger AC': 'Wolfsberger AC',
  'SCR Altach': 'Altach', 'Austria Vienna': 'Austria Wien',
  'Grazer AK 1902': 'Grazer AK', 'SV Ried': 'Ried', 'WSG Tirol': 'WSG Tirol',
  'TSV Hartberg': 'Hartberg',
  // Round 177: Super League Greece 2026-27 (Olympiacos was already baked as
  // a UCL flavor club and keeps its name). Membership verified 2026-08-19
  // against Soccerway's fixtures and the Wikipedia season page (Iraklis and
  // Kalamata up, AEL and Panserraikos down).
  'Olympiacos Piraeus': 'Olympiacos', 'Panathinaikos': 'Panathinaikos',
  'AEK Athens': 'AEK Athens', 'PAOK Thessaloniki': 'PAOK',
  'Aris Thessaloniki': 'Aris', 'Asteras Aktor': 'Asteras Tripolis',
  'Atromitos Athens': 'Atromitos', 'Levadiakos': 'Levadiakos',
  'OFI Crete': 'OFI', 'Panetolikos': 'Panetolikos',
  // Round 185: Danish Superliga 2026-27. Membership verified 2026-08-19
  // against the Wikipedia season page and worldfootball's live table, which
  // agree on all twelve (Lyngby and AC Horsens up, Fredericia and Vejle
  // down; AGF the reigning champions). The dataset spells two clubs with
  // ö for ø, mapped here as found.
  'Bröndby IF': 'Brøndby IF', 'FC Copenhagen': 'FC Copenhagen',
  'FC Midtjylland': 'FC Midtjylland', 'FC Nordsjaelland': 'FC Nordsjælland',
  'Aarhus GF': 'AGF', 'Viborg FF': 'Viborg FF', 'Randers FC': 'Randers FC',
  'Odense Boldklub': 'OB', 'Silkeborg IF': 'Silkeborg IF',
  'Lyngby Boldklub': 'Lyngby',
  // Round 185: Swiss Super League 2026-27. Membership verified 2026-08-19
  // against the Wikipedia season page and Swiss press coverage (Nau.ch),
  // which agree on all twelve (Vaduz up after five years, Winterthur down;
  // Thun the reigning champions; Vaduz are the league's Liechtenstein
  // guests exactly as in real life).
  'FC Basel 1893': 'Basel', 'BSC Young Boys': 'Young Boys',
  'FC St. Gallen 1879': 'St. Gallen', 'FC Luzern': 'Luzern',
  'FC Lausanne-Sport': 'Lausanne-Sport', 'Servette FC': 'Servette',
  'Grasshopper Club Zurich': 'Grasshopper', 'FC Lugano': 'Lugano',
  'FC Sion': 'Sion', 'FC Thun': 'Thun', 'FC Zürich': 'FC Zürich',
  'FC Vaduz': 'Vaduz',
  // Round 189: SuperSport HNL 2026-27. Membership verified 2026-08-19
  // against rezultati.com's live 2026-27 fixture list, which names exactly
  // these ten, agreeing with the season math (Vukovar 1991 relegated 10th
  // of 10 per their Wikipedia club page; Rudeš promoted per Index.hr and
  // Vrisak.info, both 2026-05-23; Dinamo Zagreb the reigning champions,
  // their 26th). The dataset's Croatia traps: FK Istra is a DIFFERENT
  // club (Serbia), ND Gorica is Slovenian, and the Dinamo family spans
  // eight countries, so every mapping below is the exact full DB name.
  'GNK Dinamo Zagreb': 'Dinamo Zagreb', 'HNK Hajduk Split': 'Hajduk Split',
  'HNK Rijeka': 'Rijeka', 'NK Osijek': 'Osijek', 'NK Varazdin': 'Varaždin',
  'Slaven Belupo Koprivnica': 'Slaven Belupo', 'NK Istra 1961': 'Istra 1961',
  'NK Lokomotiva Zagreb': 'Lokomotiva Zagreb', 'HNK Gorica': 'Gorica',
  'NK Rudes': 'Rudeš',
  // UCL flavor clubs outside the baked leagues
  'Club Brugge KV': 'Club Brugge',
};

/** Engine clubs with no dataset rows at all: baked as empty, youth-padded in game.
 *  Round 140 additions: the import ranks players by value worldwide, so newly
 *  promoted sides and the smallest top flight squads sit below its floor.
 *  They are real clubs in verified 2026-27 memberships, marked CM_PARTIAL. */
const KNOWN_EMPTY = ['Abha', 'ADO Den Haag', 'Cambuur',
  'Marítimo', 'Académico de Viseu', 'St Mirren',
  'Erzurumspor', 'Amedspor', 'Çorum FK', 'Kocaelispor',
  // Round 177: verified 2026-27 members with zero current dataset rows.
  'Austria Lustenau', 'Iraklis', 'Kalamata', 'Kifisia', 'Volos',
  // Round 185: verified 2026-27 members with zero usable (2025/2026) rows.
  // AC Horsens have 28 rows in the dataset, every one from older seasons.
  'AC Horsens', 'SønderjyskE',
  // Round 189: verified 2026-27 HNL members with zero usable rows. Istra
  // 1961's single 2025 row (Moris Valincic) is superseded by his own 2026
  // row at Dinamo Zagreb, which empties them honestly.
  'Varaždin', 'Lokomotiva Zagreb', 'Gorica', 'Rudeš', 'Istra 1961'];

/** Core clubs (big five leagues) must have 7+ players or the bake fails. */
const CORE_LEAGUE_CLUBS = new Set([
  'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 'Chelsea', 'Coventry City',
  'Crystal Palace', 'Everton', 'Fulham', 'Hull City', 'Ipswich Town', 'Leeds United', 'Liverpool',
  'Manchester City', 'Manchester United', 'Newcastle', 'Nottingham Forest', 'Sunderland', 'Tottenham',
  'Alavés', 'Athletic Club', 'Atlético Madrid', 'Barcelona', 'Real Betis', 'Celta Vigo', 'Elche',
  'Espanyol', 'Getafe', 'Levante', 'Osasuna', 'Rayo Vallecano', 'Real Madrid', 'Real Sociedad',
  'Sevilla', 'Valencia', 'Villarreal',
  'Atalanta', 'Bologna', 'Cagliari', 'Como', 'Fiorentina', 'Genoa', 'Inter Milan', 'Juventus',
  'Lazio', 'Lecce', 'AC Milan', 'Napoli', 'Parma', 'Roma', 'Sassuolo', 'Torino', 'Udinese', 'Venezia',
  'Augsburg', 'Bayer Leverkusen', 'Bayern Munich', 'Borussia Dortmund', 'Gladbach',
  'Eintracht Frankfurt', 'Freiburg', 'Hamburg', 'Hoffenheim', 'Köln', 'Mainz', 'RB Leipzig',
  'Schalke 04', 'Stuttgart', 'Union Berlin', 'Werder Bremen',
  'Angers', 'Auxerre', 'Brest', 'Le Havre', 'Lens', 'Lille', 'Lorient', 'Lyon', 'Marseille',
  'Monaco', 'Nice', 'Paris FC', 'PSG', 'Rennes', 'Strasbourg', 'Toulouse',
]);

const POS_MAP = {
  'Goalkeeper': 'GK', 'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB',
  'Defensive Midfield': 'CDM', 'Central Midfield': 'CM', 'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM', 'Right Midfield': 'RM', 'Left Winger': 'LW', 'Right Winger': 'RW',
  'Centre-Forward': 'ST', 'Second Striker': 'CF',
};

/** USD market value -> game rating on a 48-94 curve ($216m -> 94, $1m -> 64). */
function ratingOf(usd) {
  if (!usd || usd <= 0) return 48;
  const r = Math.round(-13.106 + 12.851 * Math.log10(usd));
  return Math.max(48, Math.min(94, r));
}

/** USD -> pounds sterling millions, one decimal. */
function gbpM(usd) {
  const m = (usd * 0.75) / 1e6;
  return Math.round(m * 10) / 10;
}

/* ------------------------------------------------------------------ */
/* Fetch: 2026 preferred, 2025 fallback                               */
/* ------------------------------------------------------------------ */
const dbNames = Object.keys(DB_TO_ENGINE);
const rows = [];

/* Round 140: `--dump=path.json` runs the bake OFFLINE from a rows dump,
 * because the cloud sandbox's network egress does not reach Supabase
 * directly. The dump is produced through the Supabase MCP with:
 *   SELECT id,player_name,club,position,age,market_value_usd,year
 *   FROM player_market_values_dedup WHERE year IN (2025,2026)
 * saved as {"rows":[...]}. Same columns, same source view, so the two
 * paths bake identical files. With no flag it fetches live as always. */
const dumpArg = process.argv.find(a => a.startsWith('--dump='));
if (dumpArg) {
  const dumpPath = dumpArg.slice('--dump='.length);
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  const all = dump.rows ?? dump;
  const nameSet = new Set(dbNames);
  rows.push(...all.filter(r => [2025, 2026].includes(r.year) && nameSet.has(r.club)));
  console.log(`Loaded ${rows.length} usable rows from dump ${dumpPath} (${all.length} in file)`);
} else {
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('player_market_values_dedup')
      .select('id,player_name,club,position,age,market_value_usd,year')
      .in('year', [2025, 2026])
      .in('club', dbNames)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) {
      console.error('FATAL: query failed:', error.message);
      process.exit(1);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  console.log(`Fetched ${rows.length} rows (2025+2026)`);
}

/* ------------------------------------------------------------------ */
/* Assemble: per player keep the 2026 row, else discounted 2025       */
/* ------------------------------------------------------------------ */
const errors = [];
const byPlayer = new Map();
for (const r of rows) {
  const engineClub = DB_TO_ENGINE[r.club];
  if (!engineClub) continue;
  const pos = POS_MAP[r.position];
  if (!pos) { errors.push(`Unmapped position "${r.position}" (${r.player_name})`); continue; }
  const name = String(r.player_name ?? '').trim();
  if (!name) continue;
  const age = Number(r.age);
  const usd = Number(r.market_value_usd);
  if (!Number.isFinite(age) || age < 14 || age > 45) continue;
  if (!Number.isFinite(usd) || usd <= 0) continue;
  const existing = byPlayer.get(name);
  if (existing && existing.year >= r.year) continue;
  const isFallback = r.year === 2025;
  byPlayer.set(name, {
    year: r.year,
    club: engineClub,
    p: pos,
    a: isFallback ? age + 1 : age,
    usd: isFallback ? usd * 0.95 : usd,
  });
}

/* ------------------------------------------------------------------ */
/* Apply the verified summer 2026 overlay                             */
/* ------------------------------------------------------------------ */
/* Round 393: one set over both lists. Five HNL clubs (Gorica, Istra 1961,
   Lokomotiva Zagreb, Rudes, Varazdin) are mapped dataset clubs AND listed as
   known empty, and concat emitted each of them twice, which tsc refuses as a
   duplicate object key. The committed roster predates that overlap. */
const engineClubs = [...new Set([...Object.values(DB_TO_ENGINE), ...KNOWN_EMPTY])];
const engineClubSet = new Set(engineClubs);
let overlayMoved = 0;
let overlayDropped = 0;
for (const move of TRANSFER_OVERLAY_2026) {
  const rec = byPlayer.get(move.name);
  if (move.to === null) {
    if (rec) { byPlayer.delete(move.name); overlayDropped += 1; }
    continue;
  }
  if (!engineClubSet.has(move.to)) { errors.push(`OVERLAY: unknown destination "${move.to}" for ${move.name}`); continue; }
  if (rec) {
    rec.club = move.to;
    overlayMoved += 1;
  } else if (move.add) {
    const pos = POS_MAP[move.add.p];
    if (!pos) { errors.push(`OVERLAY ADD: bad position for ${move.name}`); continue; }
    byPlayer.set(move.name, { year: 2026, club: move.to, p: pos, a: move.add.a, usd: move.add.usd });
    overlayMoved += 1;
  } else {
    errors.push(`OVERLAY: "${move.name}" not found in dataset and no add data`);
  }
}
console.log(`Overlay applied: ${overlayMoved} moved, ${overlayDropped} left the modeled world`);

/* ------------------------------------------------------------------ */
/* Group by club + validate                                           */
/* ------------------------------------------------------------------ */
const byClub = new Map(engineClubs.map(c => [c, []]));
for (const [name, rec] of byPlayer) {
  byClub.get(rec.club).push({ n: name, p: rec.p, a: rec.a, v: gbpM(rec.usd), r: ratingOf(rec.usd) });
}
for (const list of byClub.values()) list.sort((a, b) => b.v - a.v || a.n.localeCompare(b.n));

/* Round 393: the file carries two leagues the bake never mapped, the
   2. Bundesliga (Round 142) and the Belgian Pro League (Round 143), spliced
   in by hand under comment markers. A plain re-bake dropped all 35 of them,
   which is how this was found. Any club block in the existing file whose key
   this bake does not generate is carried verbatim, counted, and flagged
   partial by the same rule, so the bake can be re-run for a transfer window
   without losing a league. Mapping those leagues into DB_TO_ENGINE is the
   real fix and is filed on the board. */
const existingPath = path.join(ROOT, 'src/data/clubManagerRosters.ts');
const carried = [];
if (fs.existsSync(existingPath)) {
  const prev = fs.readFileSync(existingPath, 'utf8').split('\r\n').join('\n');
  const blockRe = /^  '((?:[^'\\]|\\.)+)': \[\n([\s\S]*?)^  \],\n/gm;
  let m;
  while ((m = blockRe.exec(prev))) {
    const key = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    if (engineClubSet.has(key)) continue;
    carried.push({ key, body: m[2], players: (m[2].match(/\{ n: /g) || []).length });
  }
}
const carriedPlayers = carried.reduce((s, c) => s + c.players, 0);
console.log(`Carried from the previous file: ${carried.length} clubs, ${carriedPlayers} players (leagues the bake does not map)`);

const partial = [];
for (const c of carried) if (c.players < 8) partial.push(c.key);
for (const club of engineClubs) {
  const n = byClub.get(club).length;
  if (CORE_LEAGUE_CLUBS.has(club) && n < 7) errors.push(`CORE club too thin: ${club} has ${n}`);
  if (n < 8) partial.push(club);
}

// Anchors: the owner's exact complaints and verified window facts must hold.
const at = (club, frag) => (byClub.get(club) ?? []).some(p => p.n.includes(frag));
if (!at('Chicago Fire', 'Lewandowski')) errors.push('ANCHOR: Lewandowski not at Chicago Fire');
if (!at('Ajax', 'ter Stegen')) errors.push('ANCHOR: ter Stegen not at Ajax');
if (!at('Chelsea', 'Morgan Rogers')) errors.push('ANCHOR: Rogers not at Chelsea');
if (!at('Orlando City', 'Griezmann')) errors.push('ANCHOR: Griezmann not at Orlando City');
if (!at('Real Madrid', 'Mbapp')) errors.push('ANCHOR: Mbappé missing from Real Madrid');
if (!at('Al-Nassr', 'Ronaldo')) errors.push('ANCHOR: Ronaldo missing from Al-Nassr');
if (at('Barcelona', 'Lewandowski')) errors.push('ANCHOR: Lewandowski still at Barcelona');

const xiAvg = club => {
  const rs = (byClub.get(club) ?? []).map(p => p.r).sort((a, b) => b - a).slice(0, 11);
  while (rs.length < 11) rs.push(60);
  return rs.reduce((s, r) => s + r, 0) / 11;
};
if (!(xiAvg('Real Madrid') > xiAvg('Racing Santander'))) errors.push('SANITY: Real Madrid <= Racing');
if (!(xiAvg('Al-Hilal') > xiAvg('Al-Riyadh'))) errors.push('SANITY: Al-Hilal <= Al-Riyadh');
if (!(xiAvg('Inter Miami') > xiAvg('San Jose Earthquakes'))) errors.push('SANITY: Miami <= San Jose');
// Round 185: the new pair's giants outrate their thinnest members.
if (!(xiAvg('FC Copenhagen') > xiAvg('Lyngby'))) errors.push('SANITY: Copenhagen <= Lyngby');
if (!(xiAvg('Basel') > xiAvg('Vaduz'))) errors.push('SANITY: Basel <= Vaduz');
// Round 189: the HNL giants outrate the promoted side.
if (!(xiAvg('Dinamo Zagreb') > xiAvg('Rudeš'))) errors.push('SANITY: Dinamo <= Rudeš');
if (!(xiAvg('Hajduk Split') > xiAvg('Gorica'))) errors.push('SANITY: Hajduk <= Gorica');

const total = [...byClub.values()].reduce((s, l) => s + l.length, 0);
if (total < 2800) errors.push(`Only ${total} players total (expected 2800+)`);

if (errors.length) {
  console.error('FAILED CLOSED, nothing written. Problems:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Emit                                                               */
/* ------------------------------------------------------------------ */
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const clubsSorted = engineClubs.slice().sort();
const stamp = new Date().toISOString().slice(0, 10);
let out = `// Rounds 70+72: real rosters for every Club Manager club, generated ${stamp}
// Source: Supabase player_market_values_dedup (2026 rows, 2025 fallback at a
// 5% discount) PLUS the verified summer 2026 transfer overlay
// (scripts/transferOverlay2026.mjs), so squads reflect August 2026 after the
// window. ${total + carriedPlayers} players, ${clubsSorted.length + carried.length} clubs across the big five leagues
// (2026-27 memberships), EFL Championship, Saudi Pro League, MLS East and
// West, Eredivisie, Primeira Liga, Scottish Premiership, Süper Lig,
// 2. Bundesliga, Belgian Pro League, Austrian Bundesliga, Super League
// Greece, Danish Superliga, Swiss Super League and SuperSport HNL.
// Values in £m, ratings 48-94 from the value curve.
// Regenerate with: node scripts/bakeClubManagerRosters.mjs
// DO NOT EDIT BY HAND.
import type { Position } from '@/types/game';

export interface BakedPlayer {
  /** Full name. */
  n: string;
  /** Position. */
  p: Position;
  /** Age. */
  a: number;
  /** Market value in £m. */
  v: number;
  /** Game rating 48-94 derived from market value. */
  r: number;
}

export const CM_ROSTER_META = {
  generated: '${stamp}',
  asOf: 'August 2026, after the summer window',
  players: ${total + carriedPlayers},
  clubs: ${clubsSorted.length + carried.length},
  overlayMoves: ${overlayMoved},
};

/** Clubs where the dataset runs thin (under 8 real players); the game pads
 *  these squads with youth players and the picker says so. */
export const CM_PARTIAL: string[] = ${JSON.stringify(partial.sort())};

export const CM_ROSTERS: Record<string, BakedPlayer[]> = {
`;
for (const club of clubsSorted) {
  out += `  '${esc(club)}': [\n`;
  for (const p of byClub.get(club)) {
    out += `    { n: '${esc(p.n)}', p: '${p.p}', a: ${p.a}, v: ${p.v}, r: ${p.r} },\n`;
  }
  out += `  ],\n`;
}
if (carried.length) {
  out += `\n  /* ---- Carried from the previous file, not regenerated: the bake does not
     map these leagues (2. Bundesliga from Round 142, Belgian Pro League from
     Round 143). Round 393 made the bake keep them instead of dropping them. ---- */\n`;
  for (const c of carried) out += `  '${esc(c.key)}': [\n${c.body}  ],\n`;
}
out += `};\n`;

fs.writeFileSync(path.join(ROOT, 'src/data/clubManagerRosters.ts'), out);
console.log(`Wrote src/data/clubManagerRosters.ts (${(out.length / 1024).toFixed(0)}KB), ${partial.length} partial clubs`);

for (const club of clubsSorted) {
  const list = byClub.get(club);
  const top = list[0] ? `${list[0].n} (£${list[0].v}m, ${list[0].r})` : 'EMPTY';
  console.log(`${club.padEnd(24)} ${String(list.length).padStart(3)}  XI ${xiAvg(club).toFixed(1)}  ${top}`);
}
