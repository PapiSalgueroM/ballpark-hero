import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Free-AI shim: prefer a free Google Gemini API key (GEMINI_API_KEY secret).
const __GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const __AI_URL = __GEMINI_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" : "https://ai.gateway.lovable.dev/v1/chat/completions";

// Verified-verdict cache (2026-07-10): repeat guesses are answered from
// Postgres instead of burning the free Gemini quota (10 requests/min).
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected in edge runtime.
const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const CACHE_GAME = "football-connect4";
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const cacheKeyOf = (p: string, r: string, c: string) => norm(`${p}|${r}|${c}`);

/* ROUND 379: THE CACHE REMEMBERS ONE ATTRIBUTE AT A TIME, NOT ONE PAIR.
   The pair cache above is the narrowest unit there is. The 16 soccer boards
   hold 507 distinct row-by-column cells but only 78 distinct attributes, so a
   pair verdict is worth exactly one cell and is thrown away for every other
   cell that asks about the same player.
   Measured on the live cache before this was written: the 105 true verdicts
   already stored decompose into 178 distinct player-and-attribute facts, and
   those facts between them answer 590 cells rather than 105. The same AI spend,
   5.6 times the coverage, and every board added later reuses them for free.
   This matters because the free Gemini quota is a DAILY one. Round 378 measured
   the failure: 42 percent of guesses refused during a normal burst, then 14 of
   14 once the day's quota was gone, with a retry three seconds later recovering
   none of them. Once it is exhausted the game is dead until it resets, so the
   only real fix is to stop needing the AI, not to ask it more politely.
   A guess costs no more than before: one call still answers a miss, it is just
   asked to report the two attributes separately so both answers are kept. */
const attrKeyOf = (player: string, attribute: string) => `attr|${norm(player)}|${norm(attribute)}`;

/* ROUND 497: THE CLUB HALF OF THIS BOARD IS IN OUR OWN TABLES, SO STOP ASKING
   A MODEL FOR IT.
   The free Gemini allowance is a DAILY one shared by every AI checked game on
   the site, so the biggest consumer starves the rest. Measured on
   ai_validation_cache 2026-09-06 over verdicts written in the previous 14 days:
   football-connect4 407, soccer-grid 192, college-grid 145, nba-connect4 82,
   nfl-connect4 35, nhl-connect4 32, football-grid 23, mlb-connect4 16. This
   game is more than double the next one, and those are only the SUCCESSFUL
   calls because a failure is never cached, so the real spend is higher.
   src/types/footballConnect4.ts uses "Played for X" 92 times across 29
   distinct club labels, and soccer_player_club_stints already answers exactly
   that for Soccer Grid. This function did not open the table at all.
   (The board note this round was planned from said 76 of 104 uses. Counted
   again here: the club figure is 92 over 29 labels, which is exact because
   "Played for " is unambiguous, so that is the number kept.)

   CONFIRM ONLY, and the asymmetry is the whole safety argument. A hit PROVES
   the attribute. A miss proves NOTHING and must fall through to the model,
   because the table is not complete: it is a scrape, not a register, and a real
   player can simply be absent from it. That caps the saving and it costs no
   wrong answers.
   (Round 497 named the accent sensitive lookup as the main cause of misses.
   Round 498 removed that cause, see below, so this no longer reads as a live
   limit. What remains is ordinary incompleteness.)

   THE MAP IS EXACT, NEVER A SUBSTRING. Derived and checked on 2026-09-06
   against all 4,931 stored club values over 80,586 rows, which are 4,774
   distinct clubs once split on " / ". The loose rule Soccer Grid uses would
   accept Berekum Chelsea FC for Chelsea, Barcelona SC Guayaquil for Barcelona
   and Liverpool FC Montevideo for Liverpool, and a confirm-only pass that
   over-accepts is a WRONG ANSWER rather than a missing one. Reserve and youth
   sides are deliberately absent. All 29 board labels resolve; three needed a
   hand written alias (Leverkusen, Newcastle, Tottenham) because the stored name
   adds a word. The table also holds a placeholder club literally named "---"
   (Göksel Gencer 2007, Alexander Manninger 2011), which an exact map ignores by
   construction and a substring rule would not. */
/* ROUND 498: the name lookup stops being blind to accents AND punctuation.
   Round 497's pass read the stint table with .ilike against the RAW column, so
   a player typed in plain letters never reached a stored accented name. That is
   the same defect Round 486 fixed for the NBA table, on a different table.
   Measured over all 80,586 rows and 27,851 distinct names: 6,270 names (22.5
   percent) change under folding and were unreachable, 18,833 rows. 313 of them
   carry a letter with NO canonical decomposition (Turkish dotless i, Danish ae
   and slashed o, Polish barred l), so NFD alone still misses them and this
   table is required rather than tidy. And it is not only accents: the fold
   flattens anything that is not a letter or digit, so "Aaron Wan-Bissaka" was
   unreachable by typing "aaron wan bissaka" with no accent involved at all.
   foldName is SEPARATE from norm() on purpose: norm builds the cache keys, and
   changing it would orphan every verdict already paid for. */
const TRANSLIT: Record<string, string> = {
  "ı": "i", "ß": "ss", "ø": "o", "ł": "l", "đ": "d", "æ": "ae", "œ": "oe", "þ": "th", "ð": "d",
};
const foldName = (s: string) =>
  (s || "").toLowerCase().replace(/[ıßøłđæœþð]/g, (c) => TRANSLIT[c] ?? c)
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ").trim();

const C4_CLUB_STRINGS: Record<string, string[]> = {
  "ac milan": ["AC Milan"],
  "arsenal": ["Arsenal FC"],
  /* Round 707: the table stores 204 rows at "Atlético de Madrid" and one hand
     written row (Luis Suarez) at "Atlético Madrid", measured 2026-09-30, so
     with one string this label proved nobody but him. Exact strings still. */
  "atletico madrid": ["Atlético Madrid", "Atlético de Madrid"],
  "barcelona": ["Barcelona", "FC Barcelona"],
  "bayern munich": ["Bayern Munich", "FC Bayern Munich"],
  "chelsea": ["Chelsea FC"],
  "dortmund": ["Borussia Dortmund"],
  "fiorentina": ["ACF Fiorentina"],
  "inter milan": ["Inter Milan"],
  "juventus": ["Juventus FC", "Juventus"],
  "lazio": ["Lazio", "SS Lazio"],
  "leverkusen": ["Bayer 04 Leverkusen"],
  "liverpool": ["Liverpool", "Liverpool FC"],
  "man city": ["Manchester City"],
  "man united": ["Manchester United"],
  "napoli": ["SSC Napoli", "Napoli"],
  "newcastle": ["Newcastle United"],
  "psg": ["Paris Saint-Germain"],
  "rb leipzig": ["RB Leipzig"],
  "real madrid": ["Real Madrid"],
  "real sociedad": ["Real Sociedad"],
  "roma": ["AS Roma", "Roma"],
  "schalke": ["FC Schalke 04"],
  "sevilla": ["Sevilla FC", "Sevilla"],
  "stuttgart": ["VfB Stuttgart"],
  "tottenham": ["Tottenham Hotspur"],
  "valencia": ["Valencia CF"],
  "villarreal": ["Villarreal CF"],
  "wolfsburg": ["VfL Wolfsburg"],
};

/* ROUND 707: THE VERIFIED 2026 MOVES COUNT AS STINTS HERE TOO. The same list
   soccer-grid-validate carries, under the same name, for the same reason: the
   stint table never learned the moves in scripts/transferOverlay2026.mjs, and
   on 2026-09-30 this game's cache held the model saying Tonali "has never played
   for Tottenham Hotspur" and Rashford "never played for Barcelona". Confirm
   only, like the table pass it sits behind: it can prove a club, never deny
   one. Keyed by foldName() of the name. scripts/simSoccerStints.mjs section 0
   fails if this copy, the grid's copy and the overlay file ever differ; when
   the overlay grows, add the same line in both functions. */
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

/* ROUND 707: THE MOVE BELONGS TO A MAN, NOT TO A NAME, the same rule as the
   grid's overlayClubsFor. The table merges namesakes under one name ("Beto" is
   three men over three nationalities), so the move counts only when the rows
   read for the name are one man (one nationality) and that man is the one who
   moved: his 2026 market row carries the same nationality. No 2026 market row
   (Griezmann) falls back to the one man rule; no rows at all takes the full
   overlay name. Anything else, and any error, is null: ask the model. */
async function overlayProves(foldedName: string, identities: Set<string>, want: string[]): Promise<string | null> {
  const entry = TRANSFER_OVERLAY_2026[foldedName];
  if (!entry || !entry.clubs.some((c) => want.includes(c))) return null;
  if (identities.size > 1) return null;
  if (identities.size === 1) {
    try {
      const { data, error } = await sb.from("player_market_values").select("nationality")
        .eq("year", 2026).eq("player_name", entry.name).limit(2);
      if (error) return null;
      const rows = (data ?? []) as { nationality: string | null }[];
      if (rows.length > 1) return null;
      if (rows.length === 1 && !identities.has(foldName(rows[0].nationality ?? ""))) return null;
    } catch { return null; }
  }
  return entry.name;
}

/* Returns the player's stored name when the stint table PROVES the attribute,
   and null in every other case including every error. Null means "ask the
   model", never "no". Round 707: a verified 2026 move proves it too, after the
   table has been read and only for the man who moved (overlayProves). */
async function confirmClubAttribute(
  playerName: string,
  attribute: string,
): Promise<string | null> {
  const m = /^\s*played\s+for\s+(.+?)\s*$/i.exec(attribute);
  if (!m) return null;
  const want = C4_CLUB_STRINGS[norm(m[1])];
  if (!want) return null;
  try {
    const { data } = await sb.from("soccer_player_club_stints")
      .select("player_name, club, nationality")
      .eq("name_folded", foldName(playerName))
      .limit(400);
    const identities = new Set<string>();
    for (const row of (data ?? [])) {
      const r = row as { player_name?: string; club?: string; nationality?: string | null };
      if (r.nationality) identities.add(foldName(r.nationality));
      /* A stored club may be two clubs joined by " / " for a split season, so
         read each side, the way Round 489 does in the grid. */
      for (const part of String(r.club ?? "").split(" / ")) {
        if (want.includes(part.trim())) return r.player_name || playerName;
      }
    }
    return await overlayProves(foldName(playerName), identities, want);
  } catch { return null; }
}


const allowedOrigins = [
  "https://douknowball.com",
  "https://www.douknowball.com",
  "https://douknowball.lovable.app",
  "https://id-preview--d69b1c20-4988-43ae-947e-7c6feb3ed683.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (origin.endsWith(".lovableproject.com")) return true;
  if (origin.endsWith(".lovable.app")) return true;
  return false;
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
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300_000);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { playerName, columnAttribute, rowAttribute, cacheOnly = false } = body;

    if (
      !playerName || typeof playerName !== "string" || playerName.length > 100 ||
      !columnAttribute || typeof columnAttribute !== "string" || columnAttribute.length > 200 ||
      !rowAttribute || typeof rowAttribute !== "string" || rowAttribute.length > 200
    ) {
      return new Response(JSON.stringify({ valid: false, reason: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = cacheKeyOf(playerName, rowAttribute, columnAttribute);
    const rowKey = attrKeyOf(playerName, rowAttribute);
    const colKey = attrKeyOf(playerName, columnAttribute);

    /* ROUND 707: A CACHED NO ON A CLUB HALF IS PUT TO THE RECORDS BEFORE IT IS
       SERVED, the sibling of the grid's rule that a records refusal is worked
       out again. This game never writes a records refusal (the table pass is
       confirm only), but its cache holds the MODEL's refusals, and the model's
       knowledge predates the 2026 window: on 2026-09-30 it held Tonali "has
       never played for Tottenham Hotspur" and Rashford "never played for
       Barcelona", both verified moves. So a cached verdict of valid:false whose
       club half the model said no to (or did not say) is checked against the
       stint table and the overlay first. Proved, the half is true and the
       cached pair is not served; not proved, or any error, and the cached
       verdict is served exactly as before. Acceptances are served untouched.
       Nothing here can accept what the records do not prove. */
    let provedRow: string | null = null;
    let provedCol: string | null = null;

    /* The pair cache is still read FIRST, and it is not being torn out: 144
       rows were paid for and they keep answering until they age out. */
    try {
      const { data: hit } = await sb.from("ai_validation_cache").select("verdict")
        .eq("game", CACHE_GAME).eq("cache_key", cacheKey).maybeSingle();
      if (hit?.verdict) {
        const v = hit.verdict as Record<string, unknown>;
        if (v.valid === false) {
          if (v.matchesRow !== true) provedRow = await confirmClubAttribute(playerName, rowAttribute);
          if (v.matchesColumn !== true) provedCol = await confirmClubAttribute(playerName, columnAttribute);
        }
        if (!provedRow && !provedCol) {
          return new Response(JSON.stringify({ ...v, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } catch { /* cache down -> fall through */ }

    /* Then the two single attribute facts. If BOTH are known this answers with
       no AI call at all, which is the whole point: a player already seen on any
       other board is very likely to be answerable here for nothing. */
    let knownFullName = playerName;
    let rowKnown: boolean | null = null;
    let colKnown: boolean | null = null;
    try {
      const { data: facts } = await sb.from("ai_validation_cache").select("cache_key, verdict")
        .eq("game", CACHE_GAME).in("cache_key", [rowKey, colKey]);
      const byKey = new Map((facts ?? []).map((f: { cache_key: string; verdict: unknown }) => [f.cache_key, f.verdict as Record<string, unknown>]));
      const rowFact = byKey.get(rowKey);
      const colFact = byKey.get(colKey);
      if (rowFact) rowKnown = rowFact.match === true;
      if (colFact) colKnown = colFact.match === true;
      /* Round 707: a stored no on a club half is worked out again the same way,
         once, and the corrected half replaces it in the fact cache below. */
      if (rowKnown === false && !provedRow) provedRow = await confirmClubAttribute(playerName, rowAttribute);
      if (colKnown === false && !provedCol) provedCol = await confirmClubAttribute(playerName, columnAttribute);
      if (provedRow) rowKnown = true;
      if (provedCol) colKnown = true;
      knownFullName = provedRow || provedCol || (rowFact?.fullName as string) || (colFact?.fullName as string) || playerName;
      if (rowFact && colFact && !provedRow && !provedCol) {
        const rowOk = rowFact.match === true;
        const colOk = colFact.match === true;
        return new Response(JSON.stringify({
          valid: rowOk && colOk,
          reason: {
            [rowAttribute]: rowOk ? "Verified previously." : "This player does not match this attribute.",
            [columnAttribute]: colOk ? "Verified previously." : "This player does not match this attribute.",
          },
          fullName: (rowFact.fullName as string) || (colFact.fullName as string) || playerName,
          cached: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } catch { /* cache down -> fall through to AI */ }

    /* ROUND 497: the confirm-only records pass, inserted between the fact
       lookup above and the cacheOnly check below so both keep working exactly
       as they did. It is ADDITIVE: Round 379's decomposition is not touched.
       Anything the table proves is written into the SAME fact cache the model
       writes, so the next board asking about that player gets it free even for
       an attribute this pass cannot answer. */
    const determined: Array<{ game: string; cache_key: string; verdict: unknown }> = [];
    /* Round 707: a half the records proved over a cached no is written back as
       the fact it is, so the stale no is replaced rather than re-read forever. */
    if (provedRow) determined.push({ game: CACHE_GAME, cache_key: rowKey, verdict: { match: true, fullName: provedRow } });
    if (provedCol) determined.push({ game: CACHE_GAME, cache_key: colKey, verdict: { match: true, fullName: provedCol } });
    if (rowKnown === null) {
      const proved = await confirmClubAttribute(playerName, rowAttribute);
      if (proved) {
        rowKnown = true;
        knownFullName = proved;
        determined.push({ game: CACHE_GAME, cache_key: rowKey, verdict: { match: true, fullName: proved } });
      }
    }
    if (colKnown === null) {
      const proved = await confirmClubAttribute(playerName, columnAttribute);
      if (proved) {
        colKnown = true;
        knownFullName = proved;
        determined.push({ game: CACHE_GAME, cache_key: colKey, verdict: { match: true, fullName: proved } });
      }
    }
    if (determined.length > 0) {
      try { await sb.from("ai_validation_cache").upsert(determined); } catch { /* non-fatal */ }
    }
    /* Answered without the AI only when BOTH halves are determined. A false
       here is never a records miss: it is a model verdict this cache already
       paid for, exactly the verdict the block above would have returned had it
       held both halves. A records miss leaves its half null and falls through. */
    if (rowKnown !== null && colKnown !== null) {
      const verdict = {
        valid: rowKnown && colKnown,
        matchesRow: rowKnown,
        matchesColumn: colKnown,
        reason: {
          [rowAttribute]: rowKnown ? "Verified from our club records." : "This player does not match this attribute.",
          [columnAttribute]: colKnown ? "Verified from our club records." : "This player does not match this attribute.",
        },
        fullName: knownFullName,
        source: "records",
      };
      /* Round 707: when this answer overturned a cached pair, the pair row is
         replaced too, so the model's stale no is not read again next time. */
      if (provedRow || provedCol) {
        try { await sb.from("ai_validation_cache").upsert({ game: CACHE_GAME, cache_key: cacheKey, verdict }); } catch { /* non-fatal */ }
      }
      return new Response(JSON.stringify(verdict), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    /* Round 397: verification harnesses can prove cache coverage without ever
       spending an AI request. The public game does not send this flag. */
    if (cacheOnly === true) {
      return new Response(JSON.stringify({
        valid: false,
        unverified: true,
        cacheMiss: true,
        reason: "No verified cached answer is available.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const AI_KEY = __GEMINI_KEY || Deno.env.get("LOVABLE_API_KEY");
    if (!AI_KEY) throw new Error("No AI key configured");

    const callAI = () => fetch(
      __AI_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: (__GEMINI_KEY ? "gemini-2.5-flash" : "google/gemini-2.5-pro"),
          messages: [
            {
              role: "system",
              content: `You are a soccer expert verifier with comprehensive, verified knowledge through March 2026.

RETIREMENT RULES (CRITICAL):
- A player is ONLY retired if they have fully retired from ALL club football (no club contract anywhere).
- International retirement does NOT count as full retirement. A player who retired from their national team but still plays club football is ACTIVE.
- Active players (2025-26): Lionel Messi (Inter Miami), Cristiano Ronaldo (Al Nassr), Neymar (Santos, returned 2025), Luis Suárez (Inter Miami), Antoine Griezmann (retired from France NT only, still active at club level).
- Fully retired: Toni Kroos (retired 2024), Gerard Piqué (retired), Andrés Iniesta (retired from top-level play).

TASK: Determine if a given soccer player matches BOTH of these two attributes:
1. Column attribute: "${columnAttribute}"
2. Row attribute: "${rowAttribute}"

The player MUST satisfy BOTH attributes to be valid.

IMPORTANT, INCLUSIVE PLAYER ACCEPTANCE POLICY:
- When an attribute says "Played for [Club]" or involves a national team, accept ANY player who has been part of that club's or national team's senior squad, including:
  • Backup players, rotation players, squad players
  • Players who made even a small number of appearances (5+ appearances is sufficient)
  • Players on loan at the club
  • Youth academy graduates who played for the senior team
- Do NOT limit answers to only starters or star players. Backup goalkeepers, reserve defenders, rotation midfielders, all count as long as they genuinely played for the team.
- For national teams, include players who were called up and played, even if they only earned a handful of caps.
- When in doubt about whether a lesser-known player played for a team, lean toward accepting them if it's plausible they were in the squad.

ACCURACY NOTE: While being inclusive, do not accept players who never played for a team at all. The threshold is: did this player make at least a few senior appearances for this club/country? If yes, accept them.

ATTRIBUTE DEFINITIONS:
- "Played for [Club]" = on that club's senior team roster and made appearances at any point (loans count). Includes backup/squad players.
- "World Cup Winner" = in the winning squad of a FIFA Men's World Cup.
- "Champions League Winner" / "Won the Champions League" = won the UEFA Champions League / European Cup.
- "Won the Ballon d'Or" = actually won the Ballon d'Or award (not just nominated).
- "Ballon d'Or Winner/Nominee" = won OR was officially nominated/shortlisted.
- Nationality attributes (e.g., "French", "Brazilian") = player's international team nationality.
- "African Nationality" = represents an African national team.
- "South American Nationality" = represents a South American national team.
- "Scored 30+ Goals in a Single Season (all comps)" = 30+ goals across all competitions in one club season.
- "Scored 20+ Goals in a European League Season" = 20+ goals in a single European domestic league season.
- "Scored 20+ Bundesliga Goals in a Season" = 20+ goals in a single Bundesliga season.
- "Scored 100+ Premier League Goals" = career total of 100+ in the English Premier League.
- "Scored 200+ Career Goals" / "Scored 300+ Career Goals" = career total across all clubs and competitions.
- "Scored in a World Cup" = scored at least one goal in a FIFA World Cup match.
- "Scored in a Champions League Final" = scored in a UCL/European Cup final.
- "Played in La Liga" / "Played in Serie A" / "Played in the Premier League" / "Played in MLS" = played senior soccer in that league.
- "Has/Had a 90+ Rated Player Card" = had a base gold card rated 90 or above in ANY edition of the big annual football video game, on the standard gold base card only, not a special or seasonal card. The key here MUST stay spelled exactly the way the client sends it or this definition stops being found.
- "Market Value Has Exceeded €100M" = peak Transfermarkt market value reached €100M or more at any point.
- "Cost €50M+ Transfer Fee" = was transferred for a fee of €50M or more at least once.
- "Played with Lionel Messi (same club)" = was on the same club squad as Messi at the same time (Barcelona, PSG, or Inter Miami).
- "Played with Cristiano Ronaldo (same club)" = was on the same club squad as CR7 at the same time (Sporting, Man United, Real Madrid, Juventus, Al Nassr).
- "Played with Neymar (same club)" = was on the same club squad as Neymar at the same time (Santos, Barcelona, PSG, Al Hilal).
- "Played in a World Cup Final" = appeared in a FIFA World Cup final match OR was in the squad for that final.
- "Won a Domestic League in 3+ Countries" = won top-flight league titles in 3 or more different countries.
- "Captained Their National Team" = served as captain of their senior national team in an official match.
- "Won the Golden Boot (League Top Scorer)" = finished as top scorer of a major European domestic league.
- "Won the Europa League" = won the UEFA Europa League / UEFA Cup.
- "Copa América Winner" = in the winning squad of a Copa América.
- "European Championship Winner" = in the winning squad of a UEFA European Championship (Euros).
- "Active Player (as of 2025-26)" = currently playing professional soccer in the 2025-26 season. Note: Neymar (Al Hilal), Aubameyang, and Griezmann are still active.
- "Goalkeeper" / "Centre-Back" / "Full-Back/Wing-Back" = player's primary position.
- "English Nationality" / "Polish Nationality" / "Italian Nationality" = represents that nation.
- "South Korean or Japanese" = represents South Korea or Japan.
- "Won 3+ Champions League Titles" = won the UCL/European Cup 3 or more times.

KEY VERIFIED FACTS (2025-26 season):
- Juan Musso is Atlético Madrid's backup goalkeeper and has played for Argentina
- Viktor Gyökeres plays for Arsenal (transferred 2025)
- Estêvão plays for Chelsea (transferred 2025)
- Alexander Isak plays for Liverpool (transferred Jan 2026)
- Kevin De Bruyne plays for Al-Ittihad (transferred 2025)
- Omar Marmoush plays for Manchester City (transferred Jan 2026)
- Florian Wirtz plays for Bayern Munich (transferred 2025)
- Alejandro Garnacho plays for Chelsea (transferred Jan 2026)
- Xavi Simons plays for Tottenham (transferred 2025)
- Jonathan David plays for Juventus (transferred 2025)
- Leroy Sané plays for Galatasaray
- Jonathan Tah plays for Bayern Munich
- Neymar is at Al Hilal (active, not retired)
- Griezmann is active (not retired)

Also resolve nicknames (e.g., "CR7" = Cristiano Ronaldo, "Pele" = Pelé, "R9" = Ronaldo Nazário).

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "matchesRow": true or false,
  "matchesColumn": true or false,
  "valid": true or false,
  "reason": "Brief explanation for EACH attribute separately",
  "fullName": "Player's full proper name"
}

"matchesRow" is whether the player matches the ROW attribute ALONE, ignoring the
column entirely. "matchesColumn" is whether they match the COLUMN attribute
ALONE, ignoring the row. "valid" must equal matchesRow AND matchesColumn. Judge
each attribute on its own before combining them: the two answers are stored
separately and reused for other squares, so a wrong single answer is wrong many
times over.`,
            },
            {
              role: "user",
              content: `Does the soccer player "${playerName}" match BOTH: "${columnAttribute}" AND "${rowAttribute}"? Think carefully about each attribute before answering.`,
            },
          ],
        }),
      }
    );
    let response = await callAI();
    if (response.status === 429) {
      // free-tier RPM hit: wait once and retry before falling back
      await new Promise((r) => setTimeout(r, 1200));
      response = await callAI();
    }

    if (!response.ok) {
      /* ROUND 379: A 429 THAT SURVIVES THE RETRY IS THE DAY'S QUOTA, NOT A
         BLIP, AND SAYING "TRY AGAIN" TO IT IS A LIE. Round 378 measured the
         difference: once the free daily quota is gone, a retry three seconds
         later recovered none of 14 attempts, so the player is being invited to
         keep clicking into a wall. Fail closed exactly as before, which is the
         July 2026 rule and is not being touched, but say which kind of failure
         it is so the message is true. */
      const exhausted = response.status === 429;
      return new Response(
        JSON.stringify({
          valid: false,
          unverified: true,
          quotaExhausted: exhausted,
          reason: exhausted
            ? "The answer checker has hit its limit for today, so this guess can't be checked. Squares you've already seen still work, and it resets tomorrow."
            : "Couldn't verify your answer right now, please try again.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    let aiVerdict = false;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
      aiVerdict = true;
    } catch {
      parsed = { valid: false, unverified: true, reason: "Couldn't verify your answer right now, please try again." };
    }

    // cache VERIFIED verdicts only, never the unverified fallbacks
    if (aiVerdict && parsed && typeof parsed === "object") {
      const rows: Array<{ game: string; cache_key: string; verdict: unknown }> = [
        { game: CACHE_GAME, cache_key: cacheKey, verdict: parsed },
      ];
      /* ROUND 379: KEEP THE TWO HALVES SEPARATELY, which is the whole round.
         Only written when the model actually answered each attribute on its
         own: if the fields are missing it is an older or malformed reply and
         guessing which half failed from `valid` alone would poison the cache
         with facts nothing verified. `valid: false` in particular says one of
         the two failed and never which, so it decomposes into nothing. */
      const r = parsed as Record<string, unknown>;
      const fullName = typeof r.fullName === "string" ? r.fullName : playerName;
      if (typeof r.matchesRow === "boolean") {
        rows.push({ game: CACHE_GAME, cache_key: rowKey, verdict: { match: r.matchesRow, fullName } });
      }
      if (typeof r.matchesColumn === "boolean") {
        rows.push({ game: CACHE_GAME, cache_key: colKey, verdict: { match: r.matchesColumn, fullName } });
      }
      try { await sb.from("ai_validation_cache").upsert(rows); } catch { /* non-fatal */ }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("football-connect4-validate error:", e);
    return new Response(
      JSON.stringify({ valid: false, unverified: true, reason: "Couldn't verify your answer right now, please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
