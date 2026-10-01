import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Soccer 3x3 grid validator (2026-08-13 v13).
 *
 * Resolution order:
 *   1. verified-verdict cache (Postgres). Round 707: a club or nationality
 *      refusal the records pass wrote is worked out again rather than served.
 *   2. DETERMINISTIC checks (Round 707: the verified 2026 moves in
 *      TRANSFER_OVERLAY_2026 count as club stints):
 *      a. "YYYY World Cup Winner" against public.world_cup_players squad rows
 *         (complete winner squads 1970-2026, era-correct nationality strings).
 *         The squad row also settles the paired POSITION criterion when the
 *         player is missing from the stints table (v13).
 *      b. club / nationality / position against public.soccer_player_club_stints
 *   3. AI (free Gemini) only for what the data cannot settle
 *   4. FAIL CLOSED when the model can't verify (2026-07-22): do NOT accept an
 *      unchecked answer.
 *
 * v12 fix (four user reports, sg-622/636/678/685): honours labels like
 * "2002 World Cup Winner" used to fall through parseCriterion into the
 * NATIONALITY matcher, which returned a hard cached FALSE. Roberto Carlos as
 * a 2002 winner was rejected by string comparison, not by football. Honours
 * now route to their own deterministic check (World Cup) or the AI, never to
 * the nationality matcher.
 */

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const AI_URL = GEMINI_KEY
  ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  : "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = GEMINI_KEY ? "gemini-2.5-flash" : "google/gemini-2.5-flash";
const AI_KEY = GEMINI_KEY || Deno.env.get("LOVABLE_API_KEY");

const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "soccer-grid";
const cacheKeyOf = (p: string, r: string, c: string) =>
  `${p}|${r}|${c}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const allowedOrigins = [
  "https://douknowball.com",
  "https://www.douknowball.com",
  "https://douknowball.lovable.app",
  "https://ballpark-hero.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];
function isAllowedOrigin(o: string) {
  return allowedOrigins.includes(o) || o.endsWith(".lovableproject.com") || o.endsWith(".lovable.app");
}
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string) {
  const now = Date.now();
  const e = rateLimitMap.get(ip);
  if (!e || now > e.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  e.count++;
  return e.count > 30;
}

/* ROUND 498: the transliteration step this fold was missing.
   Postgres unaccent folds the letters that have NO canonical decomposition
   (Turkish dotless i, German sharp s, Danish ae and slashed o, Polish barred
   l); NFD cannot touch them, because there is nothing to decompose. So without
   this table "Ömer Aşık" folds to "omer asik" in the database column and
   "omer as k" here, and no typed spelling could ever reach him. Round 486 hit
   exactly this on the NBA table and the ruling was that the DATABASE is right
   and the function is corrected to match. norm() does not build the cache key
   (cacheKeyOf does, separately), so correcting it orphans nothing. */
const TRANSLIT: Record<string, string> = {
  "ı": "i", "ß": "ss", "ø": "o", "ł": "l", "đ": "d", "æ": "ae", "œ": "oe", "þ": "th", "ð": "d",
};
const norm = (s: string) =>
  (s || "").toLowerCase().replace(/[ıßøłđæœþð]/g, (c) => TRANSLIT[c] ?? c)
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const DEMONYM: Record<string, string> = {
  dutch: "netherlands", french: "france", brazilian: "brazil", english: "england",
  spanish: "spain", german: "germany", italian: "italy", portuguese: "portugal",
  argentine: "argentina", argentinian: "argentina", belgian: "belgium", croatian: "croatia",
  serbian: "serbia", swedish: "sweden", norwegian: "norway", danish: "denmark",
  polish: "poland", turkish: "turkey", russian: "russia", ukrainian: "ukraine",
  scottish: "scotland", welsh: "wales", irish: "ireland", uruguayan: "uruguay",
  colombian: "colombia", chilean: "chile", mexican: "mexico", american: "united states",
  japanese: "japan", korean: "south korea", nigerian: "nigeria", ghanaian: "ghana",
  senegalese: "senegal", ivorian: "ivory coast", moroccan: "morocco", algerian: "algeria",
  egyptian: "egypt", cameroonian: "cameroon", swiss: "switzerland", austrian: "austria",
  greek: "greece", czech: "czech republic", slovak: "slovakia", romanian: "romania",
  hungarian: "hungary", finnish: "finland", icelandic: "iceland", australian: "australia",
  canadian: "canada", paraguayan: "paraguay", peruvian: "peru", ecuadorian: "ecuador",
  venezuelan: "venezuela", bosnian: "bosnia-herzegovina", slovenian: "slovenia",
  albanian: "albania", bulgarian: "bulgaria", israeli: "israel", iranian: "iran",
};

/** Indisputable public record, nationality strings matching world_cup_players
 *  era naming exactly (West Germany through 1990, Germany from 1994). */
const WC_WINNER_BY_YEAR: Record<string, string> = {
  "1970": "Brazil", "1974": "West Germany", "1978": "Argentina", "1982": "Italy",
  "1986": "Argentina", "1990": "West Germany", "1994": "Brazil", "1998": "France",
  "2002": "Brazil", "2006": "Italy", "2010": "Spain", "2014": "Germany",
  "2018": "France", "2022": "Argentina", "2026": "Spain",
};

type Verdict = true | false | "unknown";
interface Stint {
  player_name: string; club: string; nationality: string | null; position: string | null;
  first_year: number; last_year: number; debut_year: number | null; debut_age: number | null;
}

interface Criterion { kind: "club" | "league" | "position" | "nationality" | "wc_winner" | "honour"; value: string }

function parseCriterion(label: string): Criterion {
  const l = label.trim();
  const club = l.match(/^played for\s+(.+)$/i);
  if (club) return { kind: "club", value: club[1] };
  const league = l.match(/^played in\s+(.+)$/i);
  if (league) return { kind: "league", value: league[1] };
  if (/goalkeeper|\(GK\)/i.test(l)) return { kind: "position", value: "gk" };
  if (/defender|\(DEF\)/i.test(l)) return { kind: "position", value: "def" };
  if (/midfield|\(MID\)/i.test(l)) return { kind: "position", value: "mid" };
  if (/forward|striker|winger|\(FWD\)/i.test(l)) return { kind: "position", value: "fwd" };
  // v12: honours must NEVER fall into the nationality matcher
  const wc = l.match(/^(\d{4})\s+world cup winner$/i);
  if (wc && WC_WINNER_BY_YEAR[wc[1]]) return { kind: "wc_winner", value: wc[1] };
  if (/world cup|champions league|ballon|golden boot|golden glove|100\+?\s*caps|winner|\bwon\b|champion|title|trophy|top scorer/i.test(l)) {
    return { kind: "honour", value: l };
  }
  return { kind: "nationality", value: l };
}

function positionBucket(pos: string | null): string | null {
  const p = norm(pos ?? "");
  if (!p) return null;
  if (p === "gk" || p.includes("keeper")) return "gk";
  if (p === "df" || p.includes("back") || p.includes("defend")) return "def";
  if (p === "mf" || p.includes("midfield")) return "mid";
  if (p === "fw" || p.includes("forward") || p.includes("winger") || p.includes("striker")) return "fwd";
  return null;
}

/* ROUND 489: five of the grid's own club labels could not be satisfied by
   ANYBODY, which is 87 of its 1,883 club cells, 4.6 percent of the board.
   Measured 2026-09-06 by running the live rule below over all 4,931 stored club
   strings and all 100 labels the 710 puzzles use:
     "PSG"              25 cells, stored as Paris Saint-Germain
     "Bayer Leverkusen" 21 cells, stored as Bayer 04 Leverkusen
     "Celta Vigo"       17 cells, stored as Celta de Vigo
     "Rennes"           17 cells, stored as Stade Rennais FC
     "LA Galaxy"         7 cells, stored as Los Angeles Galaxy
   Each fails for the same reason: the substring test cannot cross an inserted
   word. "bayer leverkusen" is not inside "bayer 04 leverkusen", and neither
   contains the other. A player dealt one of those rows could not fill it with
   any spelling of any player, and the game never said why.
   Build Your XI already knew three of these five: src/data/lineupTeams.ts has
   carried PSG and Bayer Leverkusen aliases since Round 442. The knowledge
   existed in one game and not in its neighbour.
   The aliases are EXACT and additive: they only ever add a match, so nothing
   that works today can break, and a reserve side stays out because
   "paris saint germain b" is not the alias. Tightening the loose rule so the
   Barcelona square stops accepting Espanyol is the other half and is specced
   separately, because a naive tightening kills 27 of the 100 labels. */
const CLUB_ALIASES: Record<string, string[]> = {
  "psg": ["Paris Saint-Germain"],
  "bayer leverkusen": ["Bayer 04 Leverkusen"],
  "celta vigo": ["Celta de Vigo"],
  "rennes": ["Stade Rennais FC"],
  "la galaxy": ["Los Angeles Galaxy"],
  /* ROUND 707: the same inserted word, found while wiring in the 2026 moves.
     36 cells say "Played for Atlético Madrid" and 180 players are stored at
     "Atlético de Madrid". The label never read as dead because one hand written
     row (Luis Suarez) says "Atlético Madrid", so somebody could satisfy it, but
     Griezmann was cached as a hard no for it twice. */
  "atletico madrid": ["Atlético de Madrid"],
};

function clubMatches(stintClub: string, wanted: string): boolean {
  const b = norm(wanted);
  if (!b) return false;
  const aliases = (CLUB_ALIASES[b] ?? []).map(norm);
  /* A season split between two clubs is stored as "A / B", so each side is
     read on its own. That can only add matches: no label contains a slash. */
  return String(stintClub || "").split(" / ").some((part) => {
    const a = norm(part);
    if (!a) return false;
    if (a === b || a.includes(b) || b.includes(a)) return true;
    return aliases.includes(a);
  });
}

/* ROUND 707: THE VERIFIED 2026 MOVES COUNT AS STINTS.
   soccer_player_club_stints was derived from the market value years before the
   2026 window was written into them, so it never learned the moves in
   scripts/transferOverlay2026.mjs, where every entry carries two named sources.
   With a career that looks complete, a club this pass cannot find is a hard NO,
   and it is cached: on 2026-09-30 the cache said Salah "does not satisfy Played
   for Trabzonspor", and the same for Tonali at Tottenham and Moreira at Milan.
   The migration that writes these moves into the table
   (20260930170000_round_707_overlay_stints.sql) waits on a release, and a later
   re-import could lose them again, so the function carries the list itself.
   It can only ADD a yes for a club criterion: it never makes a no, never
   touches careerComplete (that is still read from the table's own rows) and
   never settles nationality or position. Keyed by norm() of the name, one entry
   per overlay name. football-connect4-validate carries the same list under the
   same name, and scripts/simSoccerStints.mjs section 0 fails if this copy, that
   copy and the overlay file ever differ (control SOCCER_STINTS_CONTROL=dropentry);
   when the overlay grows, add the same line in both functions. */
const TRANSFER_OVERLAY_2026: Record<string, { name: string; clubs: string[] }> = {
  "morgan rogers": { name: "Morgan Rogers", clubs: ["Chelsea FC"] },
  "elliot anderson": { name: "Elliot Anderson", clubs: ["Manchester City"] },
  "sandro tonali": { name: "Sandro Tonali", clubs: ["Tottenham Hotspur"] },
  "mateus fernandes": { name: "Mateus Fernandes", clubs: ["Tottenham Hotspur"] },
  "bruno guimaraes": { name: "Bruno Guimarães", clubs: ["Arsenal FC"] },
  "anthony gordon": { name: "Anthony Gordon", clubs: ["FC Barcelona"] },
  "crysencio summerville": { name: "Crysencio Summerville", clubs: ["Al-Hilal SFC"] },
  "jeremy jacquet": { name: "Jérémy Jacquet", clubs: ["Liverpool FC"] },
  "jan paul van hecke": { name: "Jan Paul van Hecke", clubs: ["Tottenham Hotspur"] },
  "maxence lacroix": { name: "Maxence Lacroix", clubs: ["Chelsea FC"] },
  "johan manzambi": { name: "Johan Manzambi", clubs: ["Aston Villa"] },
  "andrey santos": { name: "Andrey Santos", clubs: ["Manchester United"] },
  "marco palestra": { name: "Marco Palestra", clubs: ["Chelsea FC"] },
  "luka vuskovic": { name: "Luka Vuskovic", clubs: ["Brighton & Hove Albion"] },
  "geovany quenda": { name: "Geovany Quenda", clubs: ["Chelsea FC"] },
  "christos tzolis": { name: "Christos Tzolis", clubs: ["Arsenal FC"] },
  "antoine semenyo": { name: "Antoine Semenyo", clubs: ["Manchester City"] },
  "marc guehi": { name: "Marc Guéhi", clubs: ["Manchester City"] },
  "bradley barcola": { name: "Bradley Barcola", clubs: ["Liverpool FC"] },
  "omar marmoush": { name: "Omar Marmoush", clubs: ["Tottenham Hotspur"] },
  "nick woltemade": { name: "Nick Woltemade", clubs: ["Juventus FC"] },
  "tijjani reijnders": { name: "Tijjani Reijnders", clubs: ["Al-Qadsiah FC"] },
  "yan diomande": { name: "Yan Diomande", clubs: ["Real Madrid"] },
  "marc cucurella": { name: "Marc Cucurella", clubs: ["Real Madrid"] },
  "bernardo silva": { name: "Bernardo Silva", clubs: ["Real Madrid"] },
  "denzel dumfries": { name: "Denzel Dumfries", clubs: ["Real Madrid"] },
  "karim adeyemi": { name: "Karim Adeyemi", clubs: ["FC Barcelona"] },
  "rodri": { name: "Rodri", clubs: ["FC Barcelona"] },
  "goncalo ramos": { name: "Gonçalo Ramos", clubs: ["AC Milan"] },
  "rafael leao": { name: "Rafael Leão", clubs: ["Galatasaray"] },
  "ismael saibari": { name: "Ismael Saibari", clubs: ["Bayern Munich"] },
  "nathaniel brown": { name: "Nathaniel Brown", clubs: ["Bayern Munich"] },
  "marc andre ter stegen": { name: "Marc-André ter Stegen", clubs: ["Ajax Amsterdam"] },
  "julian brandt": { name: "Julian Brandt", clubs: ["Ajax Amsterdam"] },
  "francisco trincao": { name: "Francisco Trincão", clubs: ["Al-Ahli SFC"] },
  "eduard spertsyan": { name: "Eduard Spertsyan", clubs: ["Al-Ahli SFC"] },
  "jan carlo simic": { name: "Jan-Carlo Simić", clubs: ["Al-Ittihad Club"] },
  "malang sarr": { name: "Malang Sarr", clubs: ["NEOM SC"] },
  "souffian el karouani": { name: "Souffian El Karouani", clubs: ["SL Benfica"] },
  "angelo fulgini": { name: "Angelo Fulgini", clubs: ["Al-Khaleej FC"] },
  "abdou diallo": { name: "Abdou Diallo", clubs: ["Abha Club"] },
  "robert lewandowski": { name: "Robert Lewandowski", clubs: ["Chicago Fire FC"] },
  "antoine griezmann": { name: "Antoine Griezmann", clubs: ["Orlando City SC"] },
  "allan saint maximin": { name: "Allan Saint-Maximin", clubs: ["Charlotte FC"] },
  "brais mendez": { name: "Brais Méndez", clubs: ["Columbus Crew"] },
  "gabriel pec": { name: "Gabriel Pec", clubs: ["Cruzeiro Esporte Clube"] },
  "enzo fernandez": { name: "Enzo Fernández", clubs: ["Manchester City"] },
  "iliman ndiaye": { name: "Iliman Ndiaye", clubs: ["Manchester City"] },
  "ayyoub bouaddi": { name: "Ayyoub Bouaddi", clubs: ["Manchester City"] },
  "geronimo rulli": { name: "Gerónimo Rulli", clubs: ["Manchester City"] },
  "vitor reis": { name: "Vitor Reis", clubs: ["Manchester City"] },
  "john stones": { name: "John Stones", clubs: ["Inter Milan"] },
  "nathan ake": { name: "Nathan Aké", clubs: ["Fenerbahce"] },
  "james trafford": { name: "James Trafford", clubs: ["Leeds United"] },
  "savinho": { name: "Savinho", clubs: ["Tottenham Hotspur"] },
  "jeremy monga": { name: "Jeremy Monga", clubs: ["Swansea City"] },
  "mathys detourbet": { name: "Mathys Detourbet", clubs: ["AS Monaco"] },
  "claudio echeverri": { name: "Claudio Echeverri", clubs: ["SL Benfica"] },
  "divine mukasa": { name: "Divine Mukasa", clubs: ["West Ham United"] },
  "cristian romero": { name: "Cristian Romero", clubs: ["Atlético de Madrid"] },
  "djed spence": { name: "Djed Spence", clubs: ["Inter Milan"] },
  "guglielmo vicario": { name: "Guglielmo Vicario", clubs: ["Juventus FC"] },
  "pape matar sarr": { name: "Pape Matar Sarr", clubs: ["Juventus FC"] },
  "randal kolo muani": { name: "Randal Kolo Muani", clubs: ["Juventus FC"] },
  "kevin danso": { name: "Kevin Danso", clubs: ["Sunderland AFC"] },
  "radu dragusin": { name: "Radu Drăgușin", clubs: ["ACF Fiorentina"] },
  "andrew robertson": { name: "Andrew Robertson", clubs: ["Tottenham Hotspur"] },
  "marcos senesi": { name: "Marcos Senesi", clubs: ["Tottenham Hotspur"] },
  "tosin adarabioyo": { name: "Tosin Adarabioyo", clubs: ["Tottenham Hotspur"] },
  "ibrahima konate": { name: "Ibrahima Konaté", clubs: ["Real Madrid"] },
  "curtis jones": { name: "Curtis Jones", clubs: ["Inter Milan"] },
  "mohamed salah": { name: "Mohamed Salah", clubs: ["Trabzonspor"] },
  "harvey elliott": { name: "Harvey Elliott", clubs: ["Valencia CF"] },
  "ronald araujo": { name: "Ronald Araujo", clubs: ["Liverpool FC"] },
  "victor munoz": { name: "Víctor Muñoz", clubs: ["Liverpool FC"] },
  "gabriel martinelli": { name: "Gabriel Martinelli", clubs: ["Al-Hilal SFC"] },
  "gabriel jesus": { name: "Gabriel Jesus", clubs: ["FC Barcelona"] },
  "ezri konsa": { name: "Ezri Konsa", clubs: ["Arsenal FC"] },
  "illan meslier": { name: "Illan Meslier", clubs: ["Arsenal FC"] },
  "leandro trossard": { name: "Leandro Trossard", clubs: ["Besiktas JK"] },
  "ethan nwaneri": { name: "Ethan Nwaneri", clubs: ["Borussia Dortmund"] },
  "alejandro garnacho": { name: "Alejandro Garnacho", clubs: ["Aston Villa"] },
  "nicolas jackson": { name: "Nicolas Jackson", clubs: ["Aston Villa"] },
  "youri tielemans": { name: "Youri Tielemans", clubs: ["Manchester United"] },
  "ollie watkins": { name: "Ollie Watkins", clubs: ["Al-Hilal SFC"] },
  "leon bailey": { name: "Leon Bailey", clubs: ["Olympiacos Piraeus"] },
  "evann guessand": { name: "Evann Guessand", clubs: ["Crystal Palace"] },
  "ibrahim mbaye": { name: "Ibrahim Mbaye", clubs: ["Aston Villa"] },
  "zion suzuki": { name: "Zion Suzuki", clubs: ["Aston Villa"] },
  "matteo ruggeri": { name: "Matteo Ruggeri", clubs: ["Aston Villa"] },
  "taylor harwood bellis": { name: "Taylor Harwood-Bellis", clubs: ["Aston Villa"] },
  "leon goretzka": { name: "Leon Goretzka", clubs: ["Aston Villa"] },
  "aaron wan bissaka": { name: "Aaron Wan-Bissaka", clubs: ["Aston Villa"] },
  "lucas digne": { name: "Lucas Digne", clubs: ["Paris Saint-Germain"] },
  "emiliano martinez": { name: "Emiliano Martínez", clubs: ["Chelsea FC"] },
  "trevoh chalobah": { name: "Trevoh Chalobah", clubs: ["Como 1907"] },
  "liam delap": { name: "Liam Delap", clubs: ["Nottingham Forest"] },
  "benoit badiashile": { name: "Benoît Badiashile", clubs: ["SSC Napoli"] },
  "axel disasi": { name: "Axel Disasi", clubs: ["Crystal Palace"] },
  "marc guiu": { name: "Marc Guiu", clubs: ["RB Leipzig"] },
  "robert sanchez": { name: "Robert Sánchez", clubs: ["Como 1907"] },
  "valentin barco": { name: "Valentín Barco", clubs: ["Chelsea FC"] },
  "pep chavarria": { name: "Pep Chavarría", clubs: ["Chelsea FC"] },
  "emmanuel emegha": { name: "Emmanuel Emegha", clubs: ["Chelsea FC"] },
  "danny welbeck": { name: "Danny Welbeck", clubs: ["Chelsea FC"] },
  "honest ahanor": { name: "Honest Ahanor", clubs: ["Crystal Palace"] },
  "brennan johnson": { name: "Brennan Johnson", clubs: ["Everton FC"] },
  "dwight mcneil": { name: "Dwight McNeil", clubs: ["Crystal Palace"] },
  "beto": { name: "Beto", clubs: ["ACF Fiorentina"] },
  "nathan patterson": { name: "Nathan Patterson", clubs: ["Torino FC"] },
  "tim iroegbunam": { name: "Tim Iroegbunam", clubs: ["Hull City"] },
  "quinten timber": { name: "Quinten Timber", clubs: ["Crystal Palace"] },
  "takehiro tomiyasu": { name: "Takehiro Tomiyasu", clubs: ["Crystal Palace"] },
  "oscar mingueza": { name: "Óscar Mingueza", clubs: ["Crystal Palace"] },
  "ben chilwell": { name: "Ben Chilwell", clubs: ["Crystal Palace"] },
  "anan khalaili": { name: "Anan Khalaili", clubs: ["Crystal Palace"] },
  "zavier gozo": { name: "Zavier Gozo", clubs: ["Crystal Palace"] },
  "dario osorio": { name: "Darío Osorio", clubs: ["Crystal Palace"] },
  "daniel munoz": { name: "Daniel Muñoz", clubs: ["Nottingham Forest"] },
  "ousmane diomande": { name: "Ousmane Diomande", clubs: ["Nottingham Forest"] },
  "xaver schlager": { name: "Xaver Schlager", clubs: ["Nottingham Forest"] },
  "omari hutchinson": { name: "Omari Hutchinson", clubs: ["AC Milan"] },
  "dilane bakwa": { name: "Dilane Bakwa", clubs: ["LOSC Lille"] },
  "taiwo awoniyi": { name: "Taiwo Awoniyi", clubs: ["Coventry City"] },
  "morato": { name: "Morato", clubs: ["West Ham United"] },
  "bazoumana toure": { name: "Bazoumana Touré", clubs: ["Newcastle United"] },
  "matias fernandez pardo": { name: "Matias Fernandez-Pardo", clubs: ["Newcastle United"] },
  "sean steur": { name: "Sean Steur", clubs: ["Newcastle United"] },
  "lukas hornicek": { name: "Lukas Hornicek", clubs: ["Newcastle United"] },
  "amar dedic": { name: "Amar Dedić", clubs: ["Newcastle United"] },
  "ewen jaouen": { name: "Ewen Jaouen", clubs: ["Newcastle United"] },
  "kieran trippier": { name: "Kieran Trippier", clubs: ["Wolverhampton Wanderers"] },
  "hugo larsson": { name: "Hugo Larsson", clubs: ["Fulham FC"] },
  "gonzalo garcia": { name: "Gonzalo García", clubs: ["Fulham FC"] },
  "cesar palacios": { name: "César Palacios", clubs: ["Fulham FC"] },
  "david affengruber": { name: "David Affengruber", clubs: ["Fulham FC"] },
  "harry wilson": { name: "Harry Wilson", clubs: ["Leeds United"] },
  "raul jimenez": { name: "Raúl Jiménez", clubs: ["Wolverhampton Wanderers"] },
  "sasa lukic": { name: "Saša Lukić", clubs: ["Ipswich Town"] },
  "issa diop": { name: "Issa Diop", clubs: ["Ipswich Town"] },
  "exequiel palacios": { name: "Exequiel Palacios", clubs: ["Ipswich Town"] },
  "abdul fatawu": { name: "Abdul Fatawu", clubs: ["Ipswich Town"] },
  "emersonn": { name: "Emersonn", clubs: ["Ipswich Town"] },
  "daizen maeda": { name: "Daizen Maeda", clubs: ["Ipswich Town"] },
  "kjell scherpen": { name: "Kjell Scherpen", clubs: ["Ipswich Town"] },
  "zian flemming": { name: "Zian Flemming", clubs: ["Ipswich Town"] },
  "malick fofana": { name: "Malick Fofana", clubs: ["Sunderland AFC"] },
  "thomas meunier": { name: "Thomas Meunier", clubs: ["Sunderland AFC"] },
  "dayann methalie": { name: "Dayann Methalie", clubs: ["Sunderland AFC"] },
  "simon adingra": { name: "Simon Adingra", clubs: ["Ajax Amsterdam"] },
  "eliezer mayenda": { name: "Eliezer Mayenda", clubs: ["Stade Rennais FC"] },
  "dan neil": { name: "Dan Neil", clubs: ["Rangers FC"] },
  "mamadou sangare": { name: "Mamadou Sangaré", clubs: ["Brentford FC"] },
  "el hadji malick diouf": { name: "El Hadji Malick Diouf", clubs: ["Brentford FC"] },
  "jaidon anthony": { name: "Jaidon Anthony", clubs: ["Brentford FC"] },
  "callum wilson": { name: "Callum Wilson", clubs: ["Brentford FC"] },
  "pascal struijk": { name: "Pascal Struijk", clubs: ["Brighton & Hove Albion"] },
  "costinha": { name: "Costinha", clubs: ["Brighton & Hove Albion"] },
  "jaouen hadjam": { name: "Jaouen Hadjam", clubs: ["Brighton & Hove Albion"] },
  "femi azeez": { name: "Femi Azeez", clubs: ["Brighton & Hove Albion"] },
  "evan ferguson": { name: "Evan Ferguson", clubs: ["Brighton & Hove Albion"] },
  "brajan gruda": { name: "Brajan Gruda", clubs: ["RB Leipzig"] },
  "igor julio": { name: "Igor Julio", clubs: ["Burnley FC"] },
  "antonio silva": { name: "António Silva", clubs: ["AFC Bournemouth"] },
  "juanlu sanchez": { name: "Juanlu Sánchez", clubs: ["AFC Bournemouth"] },
  "alvaro rodriguez": { name: "Álvaro Rodríguez", clubs: ["AFC Bournemouth"] },
  "michele di gregorio": { name: "Michele Di Gregorio", clubs: ["AFC Bournemouth"] },
  "alex jimenez": { name: "Álex Jiménez", clubs: ["ACF Fiorentina"] },
  "enes unal": { name: "Enes Ünal", clubs: ["Getafe CF"] },
  "joel piroe": { name: "Joël Piroe", clubs: ["West Ham United"] },
  "manor solomon": { name: "Manor Solomon", clubs: ["West Ham United"] },
  "michael zetterer": { name: "Michael Zetterer", clubs: ["Leeds United"] },
  "nico elvedi": { name: "Nico Elvedi", clubs: ["Leeds United"] },
  "tarik muharemovic": { name: "Tarik Muharemović", clubs: ["Leeds United"] },
  "jean matteo bahoya": { name: "Jean-Mattéo Bahoya", clubs: ["Leeds United"] },
  "melvin bard": { name: "Melvin Bard", clubs: ["Leeds United"] },
  "sebastiaan bornauw": { name: "Sebastiaan Bornauw", clubs: ["Hamburger SV"] },
  "lucas perri": { name: "Lucas Perri", clubs: ["Torino FC"] },
  "wilfried gnonto": { name: "Wilfried Gnonto", clubs: ["ACF Fiorentina"] },
  "facundo buonanotte": { name: "Facundo Buonanotte", clubs: ["Elche CF"] },
  "largie ramazani": { name: "Largie Ramazani", clubs: ["Burnley FC"] },
  "jack harrison": { name: "Jack Harrison", clubs: ["New England Revolution"] },
  "marcus rashford": { name: "Marcus Rashford", clubs: ["Manchester United"] },
  "altay bayindir": { name: "Altay Bayındır", clubs: ["Celta de Vigo"] },
  "mohamed ali cho": { name: "Mohamed-Ali Cho", clubs: ["Hull City"] },
  "ilyas ansah": { name: "Ilyas Ansah", clubs: ["Hull City"] },
  "konstantinos tzolakis": { name: "Konstantinos Tzolakis", clubs: ["Hull City"] },
  "nobel mendy": { name: "Nobel Mendy", clubs: ["Hull City"] },
  "hidemasa morita": { name: "Hidemasa Morita", clubs: ["Hull City"] },
  "jack butland": { name: "Jack Butland", clubs: ["Hull City"] },
  "matt targett": { name: "Matt Targett", clubs: ["Hull City"] },
  "ivor pandur": { name: "Ivor Pandur", clubs: ["Rangers FC"] },
  "radek vitek": { name: "Radek Vítek", clubs: ["Middlesbrough FC"] },
  "will lankshear": { name: "Will Lankshear", clubs: ["Middlesbrough FC"] },
  "ashley phillips": { name: "Ashley Phillips", clubs: ["Middlesbrough FC"] },
  "caleb yirenkyi": { name: "Caleb Yirenkyi", clubs: ["Coventry City"] },
  "aurele amenda": { name: "Aurèle Amenda", clubs: ["Coventry City"] },
  "gustavo hamer": { name: "Gustavo Hamer", clubs: ["Coventry City"] },
  "kota takai": { name: "Kota Takai", clubs: ["Sint-Truidense VV"] },
  "min hyeok yang": { name: "Min-hyeok Yang", clubs: ["KVC Westerlo"] },
  "mikey moore": { name: "Mikey Moore", clubs: ["1.FC Köln"] },
  "alejo veliz": { name: "Alejo Veliz", clubs: ["Esporte Clube Bahia"] },
  "david carmo": { name: "David Carmo", clubs: ["Olympiacos Piraeus"] },
  "jota silva": { name: "Jota Silva", clubs: ["Olympiacos Piraeus"] },
  "kang in lee": { name: "Kang-in Lee", clubs: ["Atlético de Madrid"] },
  "alejandro grimaldo": { name: "Alejandro Grimaldo", clubs: ["Atlético de Madrid"] },
  "jonathan david": { name: "Jonathan David", clubs: ["Atlético de Madrid"] },
  "nahuel molina": { name: "Nahuel Molina", clubs: ["AS Roma"] },
  "endrick": { name: "Endrick", clubs: ["Real Madrid"] },
  "franco mastantuono": { name: "Franco Mastantuono", clubs: ["ACF Fiorentina"] },
  "ferran torres": { name: "Ferran Torres", clubs: ["Paris Saint-Germain"] },
  "mario gila": { name: "Mario Gila", clubs: ["AC Milan"] },
  "diego moreira": { name: "Diego Moreira", clubs: ["AC Milan"] },
  "christopher nkunku": { name: "Christopher Nkunku", clubs: ["RB Leipzig"] },
  "santiago gimenez": { name: "Santiago Gimenez", clubs: ["FC Porto"] },
  "dusan vlahovic": { name: "Dušan Vlahović", clubs: ["Besiktas JK"] },
  "lois openda": { name: "Loïs Openda", clubs: ["Olympique Lyon"] },
  "douglas luiz": { name: "Douglas Luiz", clubs: ["Juventus FC"] },
  "nico gonzalez": { name: "Nico González", clubs: ["Juventus FC"] },
  "davide frattesi": { name: "Davide Frattesi", clubs: ["SS Lazio"] },
  "benjamin pavard": { name: "Benjamin Pavard", clubs: ["Inter Milan"] },
  "santiago castro": { name: "Santiago Castro", clubs: ["AS Roma"] },
  "artem dovbyk": { name: "Artem Dovbyk", clubs: ["Bologna FC 1909"] },
  "neil el aynaoui": { name: "Neil El Aynaoui", clubs: ["RB Leipzig"] },
  "rodrigo mora": { name: "Rodrigo Mora", clubs: ["AS Roma"] },
  "romelu lukaku": { name: "Romelu Lukaku", clubs: ["Fenerbahce"] },
  "moise kean": { name: "Moise Kean", clubs: ["Como 1907"] },
  "pedro goncalves": { name: "Pedro Gonçalves", clubs: ["ACF Fiorentina"] },
  "konstantinos karetsas": { name: "Konstantinos Karetsas", clubs: ["Borussia Dortmund"] },
  "giannis konstantelias": { name: "Giannis Konstantelias", clubs: ["Borussia Dortmund"] },
  "joey veerman": { name: "Joey Veerman", clubs: ["Borussia Dortmund"] },
  "julien duranville": { name: "Julien Duranville", clubs: ["Olympique Lyon"] },
  "moussa diaby": { name: "Moussa Diaby", clubs: ["Bayer 04 Leverkusen"] },
  "guela doue": { name: "Guéla Doué", clubs: ["Bayer 04 Leverkusen"] },
  "facundo medina": { name: "Facundo Medina", clubs: ["Bayer 04 Leverkusen"] },
  "victor boniface": { name: "Victor Boniface", clubs: ["Bayer 04 Leverkusen"] },
  "lutsharel geertruida": { name: "Lutsharel Geertruida", clubs: ["PSV Eindhoven"] },
  "giovanni reyna": { name: "Giovanni Reyna", clubs: ["RC Strasbourg Alsace"] },
  "mason greenwood": { name: "Mason Greenwood", clubs: ["Fenerbahce"] },
  "maghnes akliouche": { name: "Maghnes Akliouche", clubs: ["Paris Saint-Germain"] },
  "mika godts": { name: "Mika Godts", clubs: ["Paris Saint-Germain"] },
};

/* ROUND 707 FIX: THE VERIFIED MOVE BELONGS TO A MAN, NOT TO A NAME. The list
   above is keyed by name and the table merges namesakes under one name: "Beto"
   is three men over three nationalities, "Rodrigo Mora" is a Uruguayan at River
   Plate and the Portuguese one at Porto, "Nico González" is a Spaniard and an
   Argentine. Attached to the name alone, Beto's Fiorentina move would have
   answered "Played for Fiorentina" x "Played for Sevilla" as verified for a
   combination no one man satisfies, and cached it. So the move counts only when
   the rows it is being attached to are one man (Round 489's identity rule, the
   nationalities on the rows) AND that man is the one who moved: his 2026 market
   row, the row the migration copies the stint from, carries the same
   nationality. No 2026 market row (Griezmann) falls back to the one man rule
   alone. No rows at all (the typed name reached nobody) takes the full overlay
   name. Anything else, and any error, returns nothing, so the guess goes to the
   model exactly as it did before this round. A same nationality merge (Costinha,
   Gonzalo García) is not separable from these two tables and stays the lenient
   direction the table itself already takes: a yes only, never a no. */
async function overlayClubsFor(foldedName: string, identities: Set<string>): Promise<string[]> {
  const entry = TRANSFER_OVERLAY_2026[foldedName];
  if (!entry) return [];
  if (identities.size > 1) return [];
  if (identities.size === 1) {
    try {
      const { data, error } = await sb.from("player_market_values").select("nationality")
        .eq("year", 2026).eq("player_name", entry.name).limit(2);
      if (error) return [];
      const rows = (data ?? []) as { nationality: string | null }[];
      if (rows.length > 1) return [];
      if (rows.length === 1 && !identities.has(norm(rows[0].nationality ?? ""))) return [];
    } catch { return []; }
  }
  return entry.clubs;
}

/* Round 707: the one shape of refusal the records pass writes, kept beside the
   pattern the cache read uses to recognise it, so the two cannot drift. */
const recordsRefusalReason = (shown: string, which: string) => `${shown} does not satisfy "${which}".`;
const RECORDS_REFUSAL = / does not satisfy "(.+)"\.$/;
/* Round 707 fix: which cached refusals are worked out again. The capture is the
   criterion refused. A "YYYY World Cup Winner" refusal comes from a complete
   winner squad (22 to 26 rows per year, nothing a stint fix can change), so it
   is served as before; on 2026-09-30 those were 96 of the 299 records refusals
   in the cache and each recompute cost a world_cup_players read. A club or
   nationality refusal comes from the stint table, which is what the overlay and
   the migrations change, so it is recomputed. */
function isRecomputedRefusal(verdict: Record<string, unknown> | undefined): boolean {
  if (!verdict || verdict.valid !== false) return false;
  const m = RECORDS_REFUSAL.exec(String(verdict.reason ?? ""));
  if (!m) return false;
  return parseCriterion(m[1]).kind !== "wc_winner";
}

function evaluate(crit: Criterion, stints: Stint[], careerComplete: boolean, overlayClubs: string[] = []): Verdict {
  if (crit.kind === "wc_winner" || crit.kind === "honour") return "unknown"; // resolved elsewhere
  /* Round 707: a verified move proves a club with or without table rows. */
  if (crit.kind === "club" && overlayClubs.some((c) => clubMatches(c, crit.value))) return true;
  if (stints.length === 0) return "unknown";
  if (crit.kind === "club") {
    if (stints.some((s) => clubMatches(s.club, crit.value))) return true;
    return careerComplete ? false : "unknown";
  }
  if (crit.kind === "nationality") {
    const want = DEMONYM[norm(crit.value)] ?? norm(crit.value);
    const have = stints.map((s) => norm(s.nationality ?? "")).filter(Boolean);
    if (have.length === 0) return "unknown";
    if (have.some((n) => n === want || n.includes(want) || want.includes(n))) return true;
    return false;
  }
  if (crit.kind === "position") {
    const buckets = stints.map((s) => positionBucket(s.position)).filter(Boolean) as string[];
    if (buckets.length === 0) return "unknown";
    return buckets.includes(crit.value) ? true : "unknown";
  }
  return "unknown";
}

/** Deterministic "YYYY World Cup Winner": squad membership in that year's
 *  winning squad. Squads in the table are complete (22-26 rows per winner),
 *  so "not in the squad" is a real false, not a data gap. Also returns the
 *  matched squad row's position so a paired position criterion can be settled
 *  even when the player is missing from the stints table (v13). */
async function checkWorldCupWinner(year: string, player: string): Promise<{ verdict: Verdict; properName: string | null; squadPos: string | null }> {
  const nation = WC_WINNER_BY_YEAR[year];
  if (!nation) return { verdict: "unknown", properName: null, squadPos: null };
  try {
    const { data, error } = await sb.from("world_cup_players")
      .select("player_name, position")
      .eq("world_cup_year", Number(year))
      .eq("nationality", nation)
      .limit(40);
    if (error) return { verdict: "unknown", properName: null, squadPos: null };
    const squad = (data ?? []) as { player_name: string; position: string | null }[];
    if (squad.length < 15) return { verdict: "unknown", properName: null, squadPos: null }; // incomplete squad, do not judge
    const guess = norm(player);
    const hit = squad.find((r) => {
      const nn = norm(r.player_name);
      return nn === guess || nn.includes(guess) || guess.includes(nn);
    });
    if (hit) return { verdict: true, properName: hit.player_name, squadPos: hit.position };
    return { verdict: false, properName: null, squadPos: null };
  } catch {
    return { verdict: "unknown", properName: null, squadPos: null };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return json({ valid: false, error: "Too many requests" }, 429);

  let sanitized = { player: "", row: "", col: "" };
  try {
    const { playerName, rowAttribute, colAttribute } = await req.json();
    if (!playerName || !rowAttribute || !colAttribute) return json({ valid: false, error: "Missing required fields" });
    sanitized = {
      player: String(playerName).slice(0, 80).replace(/[\n\r]/g, ""),
      row: String(rowAttribute).slice(0, 100).replace(/[\n\r]/g, ""),
      col: String(colAttribute).slice(0, 100).replace(/[\n\r]/g, ""),
    };
  } catch {
    return json({ valid: false, error: "Bad request" }, 400);
  }

  // FAIL CLOSED: when the model can't verify, do NOT accept.
  /* Round 407: a refusal says which it was. A blip is worth a retry; the
     day's allowance (a 429 twice) is not, and the page stops inviting one.
     Still fail closed either way: nothing unverified is ever accepted. */
  const unverified = (exhausted = false) =>
    json({ valid: false, unverified: true, exhausted, reason: exhausted ? "Answer checking has used up its allowance for today, so this guess was not counted. Please come back tomorrow." : "Couldn't verify your answer right now, please try again.", fullName: null });

  const cacheKey = cacheKeyOf(sanitized.player, sanitized.row, sanitized.col);
  /* ROUND 703: a stored YES answers at once. A stored NO is HELD until the
     records pass below has had its say, and is returned only when the records
     do not accept the answer and no verified move proved a half. The cache
     keeps a verdict forever, the model's refusals are not always right, and
     before this a cached "no" beat the stint table every time it was asked. */
  let cachedRefusal: Record<string, unknown> | null = null;
  try {
    const { data: hit } = await sb.from("ai_validation_cache").select("verdict")
      .eq("game", CACHE_GAME).eq("cache_key", cacheKey).maybeSingle();
    /* ROUND 707: A REFUSAL THIS FUNCTION'S OWN RECORDS PASS WROTE IS WORKED OUT
       AGAIN, NOT SERVED. It is deterministic and cheap to redo, and serving it
       is how a data fix never reaches the player: Round 489 had to delete seven
       of these by hand after fixing the PSG label, and on 2026-09-30 the cache
       still refused Salah at Trabzonspor and Griezmann at Atletico. If the
       records still say no, the same refusal is written back; if they now say
       yes it is replaced. Model verdicts and every acceptance are served as
       before, and nothing unverified is accepted either way. */
    /* ROUND 703, on top of that: the MODEL's refusals are held too, not served.
       Its knowledge predates the 2026 window, so a verified move in the overlay
       would otherwise never reach a cell it had refused. A held refusal leaves
       cachedVerdict empty here and is returned after the records pass below,
       and only when nothing proved a half. A stored yes is served as before. */
    const stored = hit?.verdict as Record<string, unknown> | undefined;
    if (stored && stored.valid === false && !isRecomputedRefusal(stored)) cachedRefusal = stored;
    const cachedVerdict = cachedRefusal ? undefined : stored;
    const recordsRefusal = isRecomputedRefusal(cachedVerdict);
    if (cachedVerdict && !recordsRefusal) return json({ ...cachedVerdict, cached: true });
  } catch { /* cache down -> continue */ }

  const COLS = "player_name, club, nationality, position, first_year, last_year, debut_year, debut_age";
  /* Round 707: which half a verified 2026 move proved, so the model is only
     asked the other one (below). */
  let provedRow = false;
  let provedCol = false;

  try {
    /* ROUND 498: matched on the folded column, not the raw one. Measured over
       all 80,586 rows: 6,270 of 27,851 distinct names (22.5 percent) could not
       be reached by any plain spelling, and it is not only accents, a hyphen
       does it too ("Aaron Wan-Bissaka"). */
    const { data } = await sb.from("soccer_player_club_stints").select(COLS)
      .eq("name_folded", norm(sanitized.player)).limit(60);
    let stints = (data ?? []) as Stint[];

    if (stints.length === 0 && sanitized.player.trim().split(/\s+/).length === 1) {
      const { data: bySurname } = await sb.from("soccer_player_club_stints").select(COLS)
        .like("name_folded", `% ${norm(sanitized.player)}`).limit(60);
      const names = new Set((bySurname ?? []).map((r: { player_name: string }) => norm(r.player_name)));
      if (names.size === 1) stints = (bySurname ?? []) as Stint[];
    }

    const rowCrit = parseCriterion(sanitized.row);
    const colCrit = parseCriterion(sanitized.col);

    const debutYear = stints.length ? (stints[0].debut_year ?? Math.min(...stints.map((s) => s.first_year))) : 0;
    const debutAge = stints.length ? stints[0].debut_age : null;
    /* ROUND 489: A NAME IS NOT A PERSON, and careerComplete is what turns that
       into a wrong answer. It is read off stints[0] and it is the switch that
       lets a missing club become a definite NO rather than an honest "we do not
       know". When one name covers several men those rows are several careers,
       and one man's debut year then decides another man's verdict.
       Measured 2026-09-06: "Vitinha" is three men in this table, a Brazilian
       winger at Feirense in 2008 and two Portuguese players, and the PSG
       midfielder's move is not in the table at all. The grid answered "Vitinha
       does not satisfy Played for PSG" as a hard, cached NO, on the strength of
       a different man's debut year.
       So when the fetched rows carry more than one nationality they are more
       than one person, and nothing here is allowed to say a hard no. The
       criterion falls through as unknown, which is the fail-closed direction:
       the guess is not counted rather than wrongly refused and remembered. */
    const identities = new Set(stints.map((s) => norm(s.nationality ?? "")).filter(Boolean));
    const oneManOnly = identities.size <= 1;
    const careerComplete = oneManOnly && stints.length > 0 && (debutYear >= 2005 || (debutAge != null && debutAge <= 21));

    /* Round 707: the verified moves, looked up under the name the rows resolved
       to (so a surname that resolved to one player finds his moves too), and
       only for the man who moved (see overlayClubsFor). */
    const overlayKey = stints.length ? norm(stints[0].player_name) : norm(sanitized.player);
    const overlayClubs = await overlayClubsFor(overlayKey, identities);

    let rowV = evaluate(rowCrit, stints, careerComplete, overlayClubs);
    let colV = evaluate(colCrit, stints, careerComplete, overlayClubs);
    let properName = stints.length ? stints[0].player_name : (overlayClubs.length ? TRANSFER_OVERLAY_2026[overlayKey].name : null);

    // v12: deterministic World Cup winner resolution, independent of stints.
    // v13: the winner squad row also settles a paired position criterion when
    // the stints table has nothing on the player.
    let squadPos: string | null = null;
    if (rowCrit.kind === "wc_winner") {
      const r = await checkWorldCupWinner(rowCrit.value, sanitized.player);
      rowV = r.verdict;
      if (!properName && r.properName) properName = r.properName;
      if (r.squadPos) squadPos = r.squadPos;
    }
    if (colCrit.kind === "wc_winner") {
      const c = await checkWorldCupWinner(colCrit.value, sanitized.player);
      colV = c.verdict;
      if (!properName && c.properName) properName = c.properName;
      if (c.squadPos) squadPos = c.squadPos;
    }
    if (squadPos && stints.length === 0) {
      const bucket = positionBucket(squadPos);
      if (bucket) {
        if (rowCrit.kind === "position" && rowV === "unknown") rowV = rowCrit.value === bucket ? true : "unknown";
        if (colCrit.kind === "position" && colV === "unknown") colV = colCrit.value === bucket ? true : "unknown";
      }
    }

    if (rowV === true && colV === true) {
      const verdict = { valid: true, reason: "Verified from career records.", fullName: properName };
      try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
      return json(verdict);
    }
    if (rowV === false || colV === false) {
      const which = rowV === false ? sanitized.row : sanitized.col;
      const shown = properName ?? sanitized.player;
      const verdict = { valid: false, reason: recordsRefusalReason(shown, which), fullName: properName };
      try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
      return json(verdict);
    }
    const byOverlay = (c: Criterion) => c.kind === "club" && overlayClubs.some((o) => clubMatches(o, c.value));
    provedRow = byOverlay(rowCrit);
    provedCol = byOverlay(colCrit);
  } catch { /* deterministic pass unavailable -> AI */ }

  /* ROUND 703: the records did not accept it and no verified move proved a
     half, so a held refusal stands, exactly as it did before. With a half
     proved, the model is asked the other half below and its verdict replaces
     the stale one in the cache. */
  if (cachedRefusal && !provedRow && !provedCol) return json({ ...cachedRefusal, cached: true });

  if (!AI_KEY) return unverified();

  /* ROUND 707: A VERIFIED MOVE IS NOT PUT TO THE MODEL AGAIN. Its knowledge
     predates the 2026 window: on 2026-09-30 Soccer Connect 4's cache held the
     same model saying Tonali "has never played for Tottenham" and Rashford
     "never played for Barcelona". So
     when a verified move proves one half, the model is asked only the other
     half, and its answer to that half is the verdict. A half proved by the
     table's own rows is still put to it as before; with no verified move the
     question is exactly the one it always was. */
  const asked = provedRow ? [sanitized.col] : provedCol ? [sanitized.row] : [sanitized.row, sanitized.col];
  const question = asked.length === 2
    ? `Does "${sanitized.player}" satisfy BOTH criteria?\n1. "${sanitized.row}"\n2. "${sanitized.col}"`
    : `Does "${sanitized.player}" satisfy this criterion?\n1. "${asked[0]}"`;
  const prompt = `You are a football/soccer trivia expert (knowledge through 2026). ${question}\nConsider all clubs (including loans), nationality, position (GK/DEF/MID/FWD), and honours (Champions League, World Cup, Ballon d'Or, league titles, Golden Boot, 100+ caps, leagues played in). Note: Spain won the 2026 World Cup, beating Argentina in the final. Be lenient with spelling and accept an unambiguous surname.\nReply with ONLY JSON: {"valid":true,"fullName":"First Last"} or {"valid":false,"reason":"brief"}`;

  /* Round 407: max_tokens was 150, and the logs showed the model answering
     200 with a body of {"valid": and nothing more: its own reasoning tokens
     spend the budget before the verdict, so every AI judged guess was refused
     as a blip. 800 leaves room for the thinking and the JSON. */
  try {
    const callAI = () => fetch(AI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 800 }),
    });
    let resp = await callAI();
    /* ROUND 501 PORTS ROUND 485'S CORRECTION HERE, where it was always needed
       too. The free tier limits requests per MINUTE and per DAY and BOTH answer
       429, and this code assumed the day. So a player who hit a sixty second
       window was told to come back TOMORROW. Round 485's logs settled which it
       actually is: on 2026-09-06 the refusals arrived in bursts two seconds
       apart, which is the shape of a per-minute window and not of a spent day,
       and a short retry could never clear one. Read the body and believe it
       rather than guessing. */
    if (resp.status === 429) {
      const body1 = await resp.text().catch(() => "");
      const looksDaily = (s: string) => /per\s*day|perday|requests_per_day/i.test(s);
      if (looksDaily(body1)) {
        console.log(`ai refused 429 DAY: ${body1.slice(0, 200)}`);
        return unverified(true);
      }
      await new Promise((r) => setTimeout(r, 3000));
      resp = await callAI();
      if (resp.status === 429) {
        const body2 = await resp.text().catch(() => "");
        const day = looksDaily(body2);
        console.log(`ai refused 429 ${day ? "DAY" : "MINUTE-or-unknown"}: ${(body2 || body1).slice(0, 200)}`);
        return unverified(day);
      }
    }
    /* Round 407: the status of a refused AI call is the one fact the logs
       need to tell a dead key from a spent day; it carries no secret. */
    if (!resp.ok) { console.log(`ai refused: status ${resp.status}`); return unverified(); }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) { console.log(`ai no verdict: status ${resp.status} body ${content.slice(0, 160)}`); return unverified(); }
    const result = JSON.parse(m[0]);
    /* Round 407: the prompt asks the model to be lenient with spelling, and
       a probe with a nonsense name came back valid with a real player's
       name attached. A verdict only counts when the name the model settled
       on shares a token with the name the player typed; otherwise the guess
       is a miss, never a match handed to a stranger. */
    const guessTokens = norm(sanitized.player).split(" ").filter((t) => t.length > 2);
    const nameTokens = norm(String(result.fullName || "")).split(" ").filter((t) => t.length > 2);
    const sameName = nameTokens.length === 0 || nameTokens.some((t) => guessTokens.includes(t));
    /* ROUND 501: A NAME WE COULD NOT AGREE ON IS NOT A DEFINITE NO, AND IT MUST
       NOT BE REMEMBERED AS ONE.
       This branch fires when the model answered valid but settled on a name
       sharing no token with what the player typed, which is the Round 407 guard
       and is right to refuse the point. What was wrong is the SHAPE of the
       refusal: a hard valid:false, cached forever. Measured 2026-09-07 on
       "Vitinha" for Played for PSG: the stint table holds eight rows for that
       name and not one of them is PSG, so the records pass cannot settle it and
       it goes to the model, which trips this guard, and the hard no was then
       served from cache to every player afterwards. He really did play for PSG.
       Unverified is the honest answer, the grid hooks already treat it as a
       no-penalty retry, and it is NOT cached, because an unverified answer is a
       state of the world rather than a fact about the player. */
    if (result.valid && !sameName) {
      return json({ valid: false, unverified: true, reason: "That name did not match a player we could verify.", fullName: null });
    }
    const verdict = { valid: !!result.valid, reason: result.reason || null, fullName: result.fullName || null };
    try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
    return json(verdict);
  } catch (err) {
    console.log(`ai threw: ${String(err).slice(0, 160)}`);
    return unverified();
  }
});
