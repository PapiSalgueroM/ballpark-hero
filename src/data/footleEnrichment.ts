import type { League } from '@/types/game';

// ---------------------------------------------------------------------------
// Kit-number + league enrichment for players expected in the Supabase
// player_market_values top-150 (year = 2026).
//
// Source: extracted from src/data/players.ts (marketValue >= 5).
// When a player is NOT in this map the CLUB_TO_LEAGUE fallback is used for
// league and the kit number comes back null, meaning "no squad number on
// file". Footle's KIT # tile reads "?" for those rather than stating one.
//
// TODO Round 3+: migrate this to a Supabase player_enrichment table so kit
//                numbers stay current without code deploys.
// ---------------------------------------------------------------------------

export const footleEnrichment: Record<string, { kitNumber: number; league: League }> = {
  // Round 393: the eighteen players below moved in the January or summer 2026
  // windows (scripts/transferOverlay2026.mjs). Their leagues follow the new club
  // (the club decides the league since Round 315 anyway) and their kit numbers
  // are each player's Wikipedia infobox on 2026-09-01, a single source: better
  // than the old club's number, which was certainly wrong, and marked as such.
  // ── Premier League ──────────────────────────────────────────────────────
  'Erling Haaland':         { kitNumber: 9,  league: 'Premier League' },
  'Mohamed Salah':          { kitNumber: 11, league: 'Premier League' },
  'Bukayo Saka':            { kitNumber: 7,  league: 'Premier League' },
  'Cole Palmer':            { kitNumber: 20, league: 'Premier League' },
  'Bruno Fernandes':        { kitNumber: 8,  league: 'Premier League' },
  'Son Heung-min':          { kitNumber: 7,  league: 'Premier League' },
  'Declan Rice':            { kitNumber: 41, league: 'Premier League' },
  'Phil Foden':             { kitNumber: 47, league: 'Premier League' },
  'Alexander Isak':         { kitNumber: 14, league: 'Premier League' },
  'Virgil van Dijk':        { kitNumber: 4,  league: 'Premier League' },
  'Martin Ødegaard':        { kitNumber: 8,  league: 'Premier League' },
  'William Saliba':         { kitNumber: 12, league: 'Premier League' },
  'Alisson':                { kitNumber: 1,  league: 'Premier League' },
  'Rodri':                  { kitNumber: 16, league: 'La Liga' },
  'Ollie Watkins':          { kitNumber: 11, league: 'Premier League' },
  'Alejandro Garnacho':     { kitNumber: 17, league: 'Premier League' },
  'Bernardo Silva':         { kitNumber: 20, league: 'La Liga' },
  'Luis Díaz':              { kitNumber: 7,  league: 'Premier League' },
  'Cody Gakpo':             { kitNumber: 18, league: 'Premier League' },
  'Enzo Fernández':         { kitNumber: 8,  league: 'Premier League' },
  'Viktor Gyökeres':        { kitNumber: 9,  league: 'Premier League' },
  'Estêvão':                { kitNumber: 22, league: 'Premier League' },
  'Xavi Simons':            { kitNumber: 7,  league: 'Premier League' },
  'Omar Marmoush':          { kitNumber: 22, league: 'Premier League' },
  'Florian Wirtz':          { kitNumber: 7,  league: 'Premier League' },
  'Moises Caicedo':         { kitNumber: 25, league: 'Premier League' },
  'Moisés Caicedo':         { kitNumber: 25, league: 'Premier League' },
  'Pedro Neto':             { kitNumber: 7,  league: 'Premier League' },
  'Micky van de Ven':       { kitNumber: 37, league: 'Premier League' },
  'Sandro Tonali':          { kitNumber: 16, league: 'Premier League' },
  'Leandro Trossard':       { kitNumber: 19, league: 'Premier League' },
  'Anthony Gordon':         { kitNumber: 17, league: 'La Liga' },
  'Bruno Guimarães':        { kitNumber: 39, league: 'Premier League' },
  'Rasmus Højlund':         { kitNumber: 11, league: 'Premier League' },
  'Lisandro Martínez':      { kitNumber: 6,  league: 'Premier League' },
  'Dominic Solanke':        { kitNumber: 19, league: 'Premier League' },
  'Morgan Gibbs-White':     { kitNumber: 10, league: 'Premier League' },
  'Chris Wood':             { kitNumber: 11, league: 'Premier League' },
  'Mateo Kovačić':          { kitNumber: 8,  league: 'Premier League' },
  'Morgan Rogers':          { kitNumber: 17, league: 'Premier League' },
  'Emiliano Martínez':      { kitNumber: 1,  league: 'Premier League' },
  'Nicolas Jackson':        { kitNumber: 15, league: 'Premier League' },
  'Ryan Gravenberch':       { kitNumber: 38, league: 'Premier League' },
  'Dominik Szoboszlai':     { kitNumber: 8,  league: 'Premier League' },
  'Gabriel Magalhães':      { kitNumber: 6,  league: 'Premier League' },
  'Kai Havertz':            { kitNumber: 29, league: 'Premier League' },
  'Gabriel Jesus':          { kitNumber: 9,  league: 'Premier League' },
  'Ben White':              { kitNumber: 4,  league: 'Premier League' },
  'Jurriën Timber':         { kitNumber: 12, league: 'Premier League' },
  'Thomas Partey':          { kitNumber: 5,  league: 'Premier League' },
  'Riccardo Calafiori':     { kitNumber: 33, league: 'Premier League' },
  'Jack Grealish':          { kitNumber: 10, league: 'Premier League' },
  'John Stones':            { kitNumber: 5,  league: 'Premier League' },
  'Nathan Aké':             { kitNumber: 6,  league: 'Premier League' },
  'Jeremy Doku':            { kitNumber: 11, league: 'Premier League' },
  'Rúben Dias':             { kitNumber: 3,  league: 'Premier League' },
  'Rico Lewis':             { kitNumber: 82, league: 'Premier League' },
  'Savinho':                { kitNumber: 26, league: 'Premier League' },
  'Joško Gvardiol':         { kitNumber: 24, league: 'Premier League' },
  'Darwin Núñez':           { kitNumber: 9,  league: 'Premier League' },
  'Diogo Jota':             { kitNumber: 20, league: 'Premier League' },
  'Alexis Mac Allister':    { kitNumber: 10, league: 'Premier League' },
  'Ibrahima Konaté':        { kitNumber: 5,  league: 'Premier League' },
  'Andy Robertson':         { kitNumber: 26, league: 'Premier League' },
  'Federico Chiesa':        { kitNumber: 14, league: 'Premier League' },
  'Jeremie Frimpong':       { kitNumber: 66, league: 'Premier League' },
  'Milos Kerkez':           { kitNumber: 26, league: 'Premier League' },
  'Noni Madueke':           { kitNumber: 11, league: 'Premier League' },
  'Reece James':            { kitNumber: 24, league: 'Premier League' },
  'Levi Colwill':           { kitNumber: 6,  league: 'Premier League' },
  'Romeo Lavia':            { kitNumber: 45, league: 'Premier League' },
  'Marc Cucurella':         { kitNumber: 17, league: 'La Liga' },
  'Christopher Nkunku':     { kitNumber: 18, league: 'Premier League' },
  'João Félix':             { kitNumber: 14, league: 'Premier League' },
  'Kobbie Mainoo':          { kitNumber: 37, league: 'Premier League' },
  'Diogo Dalot':            { kitNumber: 20, league: 'Premier League' },
  'Manuel Ugarte':          { kitNumber: 25, league: 'Premier League' },
  'Matthijs de Ligt':       { kitNumber: 4,  league: 'Premier League' },
  'Joshua Zirkzee':         { kitNumber: 11, league: 'Premier League' },
  'Amad Diallo':            { kitNumber: 16, league: 'Premier League' },
  'James Maddison':         { kitNumber: 10, league: 'Premier League' },
  'Cristian Romero':        { kitNumber: 17, league: 'Premier League' },
  'Dejan Kulusevski':       { kitNumber: 21, league: 'Premier League' },
  'Pedro Porro':            { kitNumber: 23, league: 'Premier League' },
  'Brennan Johnson':        { kitNumber: 19, league: 'Premier League' },
  'David Raya':             { kitNumber: 22, league: 'Premier League' },
  'Ederson':                { kitNumber: 31, league: 'Premier League' },
  'Matt O\'Riley':          { kitNumber: 20, league: 'Premier League' },
  'Bryan Mbeumo':           { kitNumber: 19, league: 'Premier League' },
  'Mikel Merino':           { kitNumber: 23, league: 'Premier League' },
  'Eberechi Eze':           { kitNumber: 10, league: 'Premier League' },
  'Amadou Onana':           { kitNumber: 24, league: 'Premier League' },
  'Mohammed Kudus':         { kitNumber: 14, league: 'Premier League' },
  // ── La Liga ─────────────────────────────────────────────────────────────
  'Kylian Mbappé':          { kitNumber: 9,  league: 'La Liga' },
  'Vinícius Júnior':        { kitNumber: 7,  league: 'La Liga' },
  'Jude Bellingham':        { kitNumber: 5,  league: 'La Liga' },
  'Robert Lewandowski':     { kitNumber: 9, league: 'MLS' },
  'Lamine Yamal':           { kitNumber: 19, league: 'La Liga' },
  'Pedri':                  { kitNumber: 8,  league: 'La Liga' },
  'Raphinha':               { kitNumber: 11, league: 'La Liga' },
  'Antoine Griezmann':      { kitNumber: 7, league: 'MLS' },
  'Federico Valverde':      { kitNumber: 8,  league: 'La Liga' },
  'Luka Modrić':            { kitNumber: 10, league: 'La Liga' },
  'Gavi':                   { kitNumber: 6,  league: 'La Liga' },
  'Julián Álvarez':         { kitNumber: 19, league: 'La Liga' },
  'Arda Güler':             { kitNumber: 15, league: 'La Liga' },
  'Aurélien Tchouaméni':    { kitNumber: 18, league: 'La Liga' },
  'Antonio Rüdiger':        { kitNumber: 22, league: 'La Liga' },
  'Alejandro Balde':        { kitNumber: 3,  league: 'La Liga' },
  'Trent Alexander-Arnold': { kitNumber: 66, league: 'La Liga' },
  'Marcus Rashford':        { kitNumber: 14, league: 'La Liga' },
  'Eduardo Camavinga':      { kitNumber: 12, league: 'La Liga' },
  'Rodrygo':                { kitNumber: 11, league: 'La Liga' },
  'Éder Militão':           { kitNumber: 3,  league: 'La Liga' },
  'Ferland Mendy':          { kitNumber: 23, league: 'La Liga' },
  'Dani Carvajal':          { kitNumber: 2,  league: 'La Liga' },
  'Brahim Díaz':            { kitNumber: 21, league: 'La Liga' },
  'Thibaut Courtois':       { kitNumber: 1,  league: 'La Liga' },
  'Dani Olmo':              { kitNumber: 20, league: 'La Liga' },
  'Jules Koundé':           { kitNumber: 23, league: 'La Liga' },
  'Pau Cubarsí':            { kitNumber: 4,  league: 'La Liga' },
  'Fermín López':           { kitNumber: 16, league: 'La Liga' },
  'Frenkie de Jong':        { kitNumber: 21, league: 'La Liga' },
  'Ronald Araújo':          { kitNumber: 4,  league: 'La Liga' },
  'Marc-André ter Stegen':  { kitNumber: 1, league: 'Eredivisie' },
  'Jan Oblak':              { kitNumber: 13, league: 'La Liga' },
  'Julián Quiñones':        { kitNumber: 33, league: 'La Liga' },
  'Takefusa Kubo':          { kitNumber: 14, league: 'La Liga' },
  'Nico Williams':          { kitNumber: 10, league: 'La Liga' },
  'Martín Zubimendi':       { kitNumber: 4,  league: 'La Liga' },
  // ── Serie A ─────────────────────────────────────────────────────────────
  'Lautaro Martínez':       { kitNumber: 10, league: 'Serie A' },
  'Rafael Leão':            { kitNumber: 27, league: 'Turkish Süper Lig' },
  'Dušan Vlahović':         { kitNumber: 9,  league: 'Serie A' },
  'Marcus Thuram':          { kitNumber: 9,  league: 'Serie A' },
  'Nicolò Barella':         { kitNumber: 23, league: 'Serie A' },
  'Paulo Dybala':           { kitNumber: 21, league: 'Serie A' },
  'Romelu Lukaku':          { kitNumber: 9,  league: 'Serie A' },
  'Theo Hernández':         { kitNumber: 19, league: 'Serie A' },
  'Ademola Lookman':        { kitNumber: 11, league: 'Serie A' },
  'Mike Maignan':           { kitNumber: 16, league: 'Serie A' },
  'Jonathan David':         { kitNumber: 9,  league: 'Serie A' },
  'Kevin De Bruyne':        { kitNumber: 11, league: 'Serie A' },
  'Hakan Çalhanoğlu':       { kitNumber: 20, league: 'Serie A' },
  'Federico Dimarco':       { kitNumber: 32, league: 'Serie A' },
  'Alessandro Bastoni':     { kitNumber: 95, league: 'Serie A' },
  'Denzel Dumfries':        { kitNumber: 24, league: 'La Liga' },
  'Mateo Retegui':          { kitNumber: 32, league: 'Serie A' },
  'Davide Frattesi':        { kitNumber: 16, league: 'Serie A' },
  'Khéphren Thuram':        { kitNumber: 8,  league: 'Serie A' },
  'Gleison Bremer':         { kitNumber: 3,  league: 'Serie A' },
  'Teun Koopmeiners':       { kitNumber: 8,  league: 'Serie A' },
  'Randal Kolo Muani':      { kitNumber: 23, league: 'Serie A' },
  'Kenan Yıldız':           { kitNumber: 10, league: 'Serie A' },
  'Christian Pulisic':      { kitNumber: 11, league: 'Serie A' },
  'Tijjani Reijnders':      { kitNumber: 14, league: 'Saudi Pro League' },
  'Fikayo Tomori':          { kitNumber: 23, league: 'Serie A' },
  'Moise Kean':             { kitNumber: 18, league: 'Serie A' },
  'Charles De Ketelaere':   { kitNumber: 17, league: 'Serie A' },
  'Artem Dovbyk':           { kitNumber: 11, league: 'Serie A' },
  'Benjamin Šeško':         { kitNumber: 14, league: 'Bundesliga' },  // at RB Leipzig
  // ── Bundesliga ──────────────────────────────────────────────────────────
  'Harry Kane':             { kitNumber: 9,  league: 'Bundesliga' },
  'Jamal Musiala':          { kitNumber: 42, league: 'Bundesliga' },
  'Joshua Kimmich':         { kitNumber: 6,  league: 'Bundesliga' },
  'Alphonso Davies':        { kitNumber: 19, league: 'Bundesliga' },
  'Jonathan Tah':           { kitNumber: 4,  league: 'Bundesliga' },
  'Manuel Neuer':           { kitNumber: 1,  league: 'Bundesliga' },
  'Granit Xhaka':           { kitNumber: 34, league: 'Bundesliga' },
  'Michael Olise':          { kitNumber: 11, league: 'Bundesliga' },
  'Min-jae Kim':            { kitNumber: 3,  league: 'Bundesliga' },
  'João Palhinha':          { kitNumber: 6,  league: 'Bundesliga' },
  'Dayot Upamecano':        { kitNumber: 2,  league: 'Bundesliga' },
  'Thomas Müller':          { kitNumber: 25, league: 'Bundesliga' },
  'Serge Gnabry':           { kitNumber: 7,  league: 'Bundesliga' },
  'Serhou Guirassy':        { kitNumber: 9,  league: 'Bundesliga' },
  'Alejandro Grimaldo':     { kitNumber: 20, league: 'Bundesliga' },
  'Karim Adeyemi':          { kitNumber: 14, league: 'La Liga' },
  'Gregor Kobel':           { kitNumber: 1,  league: 'Bundesliga' },
  'Jamie Gittens':          { kitNumber: 43, league: 'Bundesliga' },
  'Nico Schlotterbeck':     { kitNumber: 4,  league: 'Bundesliga' },
  'Julian Brandt':          { kitNumber: 8, league: 'Eredivisie' },
  'Loïs Openda':            { kitNumber: 11, league: 'Bundesliga' },
  'Jeremie Frimpong (BL)':  { kitNumber: 30, league: 'Bundesliga' }, // at Bayer Leverkusen before Liverpool
  'Patrik Schick':          { kitNumber: 14, league: 'Bundesliga' },
  // ── Ligue 1 ─────────────────────────────────────────────────────────────
  'Ousmane Dembélé':        { kitNumber: 10, league: 'Ligue 1' },
  'Bradley Barcola':        { kitNumber: 29, league: 'Premier League' },
  'Khvicha Kvaratskhelia':  { kitNumber: 7,  league: 'Ligue 1' },
  'Achraf Hakimi':          { kitNumber: 2,  league: 'Ligue 1' },
  'Gianluigi Donnarumma':   { kitNumber: 99, league: 'Ligue 1' },
  'Marquinhos':             { kitNumber: 5,  league: 'Ligue 1' },
  'Mason Greenwood':        { kitNumber: 10, league: 'Ligue 1' },
  'Warren Zaïre-Emery':     { kitNumber: 33, league: 'Ligue 1' },
  'Gonçalo Ramos':          { kitNumber: 9, league: 'Serie A' },
  'Lee Kang-in':            { kitNumber: 19, league: 'Ligue 1' },
  'Vitinha':                { kitNumber: 17, league: 'Ligue 1' },
  'Endrick':                { kitNumber: 16, league: 'Ligue 1' },
  'João Neves':             { kitNumber: 87, league: 'Ligue 1' },
  'Désiré Doué':            { kitNumber: 14, league: 'Ligue 1' },
  'Willian Pacho':          { kitNumber: 51, league: 'Ligue 1' },
  // ── Saudi Pro League ────────────────────────────────────────────────────
  'Cristiano Ronaldo':      { kitNumber: 7,  league: 'Saudi Pro League' },
  'Karim Benzema':          { kitNumber: 9,  league: 'Saudi Pro League' },
  'Sadio Mané':             { kitNumber: 10, league: 'Saudi Pro League' },
  "N'Golo Kanté":           { kitNumber: 7,  league: 'Saudi Pro League' },
  'Riyad Mahrez':           { kitNumber: 26, league: 'Saudi Pro League' },
  'Aleksandar Mitrović':    { kitNumber: 9,  league: 'Saudi Pro League' },
  'Roberto Firmino':        { kitNumber: 9,  league: 'Saudi Pro League' },
  'Ivan Toney':             { kitNumber: 18, league: 'Saudi Pro League' },
  // ── MLS ─────────────────────────────────────────────────────────────────
  'Lionel Messi':           { kitNumber: 10, league: 'MLS' },
  'Luis Suárez':            { kitNumber: 9,  league: 'MLS' },
  'Riqui Puig':             { kitNumber: 6,  league: 'MLS' },
  // ── Brazilian Série A ───────────────────────────────────────────────────
  'Neymar':                 { kitNumber: 10, league: 'Brazilian Série A' },
  'Luiz Henrique':          { kitNumber: 7,  league: 'Brazilian Série A' },
  // ── Turkish Süper Lig ───────────────────────────────────────────────────
  'Victor Osimhen':         { kitNumber: 45, league: 'Turkish Süper Lig' },
  'Leroy Sané':             { kitNumber: 10, league: 'Turkish Süper Lig' },
  // ── Liga Portugal ───────────────────────────────────────────────────────
  'Samu Omorodion':         { kitNumber: 9,  league: 'Liga Portugal' },
  'Vangelis Pavlidis':      { kitNumber: 9,  league: 'Liga Portugal' },
  'Pedro Gonçalves':        { kitNumber: 28, league: 'Liga Portugal' },
  // ── Eredivisie ──────────────────────────────────────────────────────────
  'Brian Brobbey':          { kitNumber: 9,  league: 'Eredivisie' },
  'Santiago Giménez':       { kitNumber: 29, league: 'Eredivisie' },
  // ── Scottish Premiership ────────────────────────────────────────────────
  'Kyogo Furuhashi':        { kitNumber: 8,  league: 'Scottish Premiership' },
  // ── Austrian Bundesliga ─────────────────────────────────────────────────
  'Oscar Gloukh':           { kitNumber: 10, league: 'Austrian Bundesliga' },
  // ── Greek Super League ──────────────────────────────────────────────────
  'Ayoub El Kaabi':         { kitNumber: 9,  league: 'Greek Super League' },
};

// ---------------------------------------------------------------------------
// Club → League fallback (for Supabase players not in the enrichment map)
// ---------------------------------------------------------------------------
/* Round 315: this map used to hold only SHORT club names ('Chelsea',
   'Barcelona', 'Villarreal') while the database spells them long ('Chelsea
   FC', 'FC Barcelona', 'Villarreal CF'), so nearly the entire live pool
   missed the lookup and fell into the 'Premier League' default below, which
   is how Anthony picked La Liga in Squad Deal and was dealt Premier League
   players. The database spellings here are the actual distinct club values
   of the 2026 top-1000 pool, queried 2026-08-29; the short names stay for
   the hand built pools (Footle's own list, the Squad Deal legends) that use
   them. Membership is the 2025/26 season: relegated Leicester, Ipswich and
   Southampton are EFL Championship rows, and clubs whose current division
   is genuinely uncertain are left out on purpose, because an absent mapping
   now falls to 'Other' rather than to a false Premier League. */
const CLUB_TO_LEAGUE: Partial<Record<string, League>> = {
  // Round 393: destinations of the verified 2026 window moves that the map did
  // not name (the club decides the league since Round 315, so an unmapped club
  // reads 'Other' and drops out of every league filter).
  'Al-Khaleej FC': 'Saudi Pro League', 'Abha Club': 'Saudi Pro League',
  'Chicago Fire FC': 'MLS', 'Orlando City SC': 'MLS', 'Charlotte FC': 'MLS',
  // Premier League, 2025/26 membership
  'Manchester City': 'Premier League', 'Arsenal': 'Premier League', 'Arsenal FC': 'Premier League',
  'Liverpool': 'Premier League', 'Liverpool FC': 'Premier League',
  'Chelsea': 'Premier League', 'Chelsea FC': 'Premier League',
  'Tottenham': 'Premier League', 'Tottenham Hotspur': 'Premier League',
  'Manchester United': 'Premier League',
  'Newcastle': 'Premier League', 'Newcastle United': 'Premier League',
  'Aston Villa': 'Premier League',
  'West Ham': 'Premier League', 'West Ham United': 'Premier League',
  'Brighton': 'Premier League', 'Brighton & Hove Albion': 'Premier League',
  'Brentford': 'Premier League', 'Brentford FC': 'Premier League',
  'Wolverhampton': 'Premier League', 'Wolverhampton Wanderers': 'Premier League',
  'Nottingham Forest': 'Premier League',
  'Fulham': 'Premier League', 'Fulham FC': 'Premier League',
  'Everton': 'Premier League', 'Everton FC': 'Premier League',
  'Crystal Palace': 'Premier League',
  'Bournemouth': 'Premier League', 'AFC Bournemouth': 'Premier League',
  'Sunderland AFC': 'Premier League', 'Leeds United': 'Premier League',
  'Burnley FC': 'Premier League',
  // EFL Championship (the relegated and the rest of the second tier pool)
  'Leicester': 'EFL Championship', 'Leicester City': 'EFL Championship',
  'Ipswich Town': 'EFL Championship', 'Southampton': 'EFL Championship',
  'Southampton FC': 'EFL Championship', 'Coventry City': 'EFL Championship',
  'Middlesbrough FC': 'EFL Championship', 'Sheffield United': 'EFL Championship',
  'Norwich City': 'EFL Championship', 'Watford FC': 'EFL Championship',
  'Swansea City': 'EFL Championship', 'Bristol City': 'EFL Championship',
  'Birmingham City': 'EFL Championship', 'Stoke City': 'EFL Championship',
  // La Liga
  'Real Madrid': 'La Liga', 'Barcelona': 'La Liga', 'FC Barcelona': 'La Liga',
  'Atlético Madrid': 'La Liga', 'Atlético de Madrid': 'La Liga',
  'Athletic Club': 'La Liga', 'Athletic Bilbao': 'La Liga',
  'Real Sociedad': 'La Liga',
  'Villarreal': 'La Liga', 'Villarreal CF': 'La Liga',
  'Real Betis': 'La Liga', 'Real Betis Balompié': 'La Liga',
  'Sevilla': 'La Liga', 'Sevilla FC': 'La Liga',
  'Valencia': 'La Liga', 'Valencia CF': 'La Liga',
  'Rayo Vallecano': 'La Liga',
  'Girona': 'La Liga', 'Girona FC': 'La Liga',
  'Celta Vigo': 'La Liga', 'Celta de Vigo': 'La Liga',
  'Osasuna': 'La Liga', 'CA Osasuna': 'La Liga',
  'Mallorca': 'La Liga', 'RCD Mallorca': 'La Liga',
  'Alavés': 'La Liga', 'Deportivo Alavés': 'La Liga',
  'Getafe': 'La Liga', 'Getafe CF': 'La Liga',
  'Elche CF': 'La Liga', 'RCD Espanyol Barcelona': 'La Liga',
  'Levante UD': 'La Liga', 'Real Oviedo': 'La Liga',
  // Serie A
  'Inter Milan': 'Serie A', 'AC Milan': 'Serie A',
  'Juventus': 'Serie A', 'Juventus FC': 'Serie A',
  'Napoli': 'Serie A', 'SSC Napoli': 'Serie A',
  'Roma': 'Serie A', 'AS Roma': 'Serie A',
  'Lazio': 'Serie A', 'SS Lazio': 'Serie A',
  'Fiorentina': 'Serie A', 'ACF Fiorentina': 'Serie A',
  'Atalanta': 'Serie A', 'Atalanta BC': 'Serie A',
  'Torino': 'Serie A', 'Torino FC': 'Serie A',
  'Bologna': 'Serie A', 'Bologna FC 1909': 'Serie A',
  'Udinese': 'Serie A', 'Udinese Calcio': 'Serie A',
  'Como': 'Serie A', 'Como 1907': 'Serie A',
  'Cagliari': 'Serie A', 'Cagliari Calcio': 'Serie A',
  'Genoa': 'Serie A', 'Genoa CFC': 'Serie A',
  'Verona': 'Serie A', 'US Sassuolo': 'Serie A',
  'Parma Calcio 1913': 'Serie A', 'US Lecce': 'Serie A',
  // Bundesliga
  'Bayern Munich': 'Bundesliga', 'Borussia Dortmund': 'Bundesliga',
  'Bayer Leverkusen': 'Bundesliga', 'Bayer 04 Leverkusen': 'Bundesliga',
  'RB Leipzig': 'Bundesliga', 'VfB Stuttgart': 'Bundesliga',
  'Wolfsburg': 'Bundesliga', 'VfL Wolfsburg': 'Bundesliga',
  'SC Freiburg': 'Bundesliga', 'Eintracht Frankfurt': 'Bundesliga',
  'Hoffenheim': 'Bundesliga', 'TSG 1899 Hoffenheim': 'Bundesliga',
  'Borussia Mönchengladbach': 'Bundesliga',
  'Mainz 05': 'Bundesliga', '1.FSV Mainz 05': 'Bundesliga',
  'Augsburg': 'Bundesliga', 'FC Augsburg': 'Bundesliga',
  'Werder Bremen': 'Bundesliga', 'SV Werder Bremen': 'Bundesliga',
  '1.FC Union Berlin': 'Bundesliga', '1.FC Köln': 'Bundesliga',
  'Hamburger SV': 'Bundesliga',
  // Ligue 1
  'PSG': 'Ligue 1', 'Paris Saint-Germain': 'Ligue 1',
  'Marseille': 'Ligue 1', 'Olympique Marseille': 'Ligue 1',
  'Lyon': 'Ligue 1', 'Olympique Lyon': 'Ligue 1',
  'Monaco': 'Ligue 1', 'AS Monaco': 'Ligue 1',
  'Lille': 'Ligue 1', 'LOSC Lille': 'Ligue 1',
  'Rennes': 'Ligue 1', 'Stade Rennais FC': 'Ligue 1',
  'Nice': 'Ligue 1', 'OGC Nice': 'Ligue 1',
  'Lens': 'Ligue 1', 'RC Lens': 'Ligue 1',
  'Nantes': 'Ligue 1', 'FC Nantes': 'Ligue 1',
  'RC Strasbourg Alsace': 'Ligue 1', 'Angers SCO': 'Ligue 1',
  'AJ Auxerre': 'Ligue 1', 'FC Lorient': 'Ligue 1', 'Paris FC': 'Ligue 1',
  // Liga Portugal
  'Benfica': 'Liga Portugal', 'SL Benfica': 'Liga Portugal',
  'Porto': 'Liga Portugal', 'FC Porto': 'Liga Portugal',
  'Sporting CP': 'Liga Portugal', 'SC Braga': 'Liga Portugal',
  'FC Famalicão': 'Liga Portugal', 'GD Estoril Praia': 'Liga Portugal',
  // Eredivisie
  'Ajax': 'Eredivisie', 'Ajax Amsterdam': 'Eredivisie',
  'Feyenoord': 'Eredivisie', 'Feyenoord Rotterdam': 'Eredivisie',
  'PSV': 'Eredivisie', 'PSV Eindhoven': 'Eredivisie',
  'AZ Alkmaar': 'Eredivisie', 'FC Utrecht': 'Eredivisie',
  // Saudi Pro League
  'Al-Hilal': 'Saudi Pro League', 'Al-Hilal SFC': 'Saudi Pro League',
  'Al-Nassr': 'Saudi Pro League', 'Al-Nassr FC': 'Saudi Pro League',
  'Al-Ittihad': 'Saudi Pro League', 'Al-Ittihad Club': 'Saudi Pro League',
  'Al-Ahli': 'Saudi Pro League', 'Al-Ahli SFC': 'Saudi Pro League',
  'Al-Shabab': 'Saudi Pro League', 'Al-Ettifaq': 'Saudi Pro League',
  'Al-Qadsiah FC': 'Saudi Pro League', 'NEOM SC': 'Saudi Pro League',
  // MLS
  'Inter Miami': 'MLS', 'Inter Miami CF': 'MLS',
  'LA Galaxy': 'MLS', 'Los Angeles Galaxy': 'MLS',
  'LAFC': 'MLS', 'Los Angeles FC': 'MLS',
  'Columbus Crew': 'MLS', 'Nashville SC': 'MLS', 'Portland Timbers': 'MLS',
  'FC Cincinnati': 'MLS', 'Houston Dynamo': 'MLS', 'Toronto FC': 'MLS',
  'Atlanta United FC': 'MLS', 'San Diego FC': 'MLS',
  // Turkish Süper Lig
  'Galatasaray': 'Turkish Süper Lig', 'Fenerbahçe': 'Turkish Süper Lig',
  'Fenerbahce': 'Turkish Süper Lig', 'Besiktas': 'Turkish Süper Lig',
  'Besiktas JK': 'Turkish Süper Lig', 'Trabzonspor': 'Turkish Süper Lig',
  // Brazilian Série A
  'Flamengo': 'Brazilian Série A', 'CR Flamengo': 'Brazilian Série A',
  'Corinthians': 'Brazilian Série A', 'Sport Club Corinthians Paulista': 'Brazilian Série A',
  'Botafogo': 'Brazilian Série A', 'Botafogo de Futebol e Regatas': 'Brazilian Série A',
  'Fluminense': 'Brazilian Série A',
  'Atlético Mineiro': 'Brazilian Série A', 'Clube Atlético Mineiro': 'Brazilian Série A',
  'Santos': 'Brazilian Série A', 'Santos FC': 'Brazilian Série A',
  'Sociedade Esportiva Palmeiras': 'Brazilian Série A',
  'Cruzeiro Esporte Clube': 'Brazilian Série A',
  'Esporte Clube Bahia': 'Brazilian Série A',
  'São Paulo Futebol Clube': 'Brazilian Série A',
  // Russian Premier League
  'Zenit St. Petersburg': 'Russian Premier League', 'Spartak Moscow': 'Russian Premier League',
  'CSKA Moscow': 'Russian Premier League', 'Dynamo Moscow': 'Russian Premier League',
  'Lokomotiv Moscow': 'Russian Premier League', 'FC Krasnodar': 'Russian Premier League',
  // Belgian Pro League
  'Club Brugge KV': 'Belgian Pro League', 'KRC Genk': 'Belgian Pro League',
  'RSC Anderlecht': 'Belgian Pro League', 'Union Saint-Gilloise': 'Belgian Pro League',
  // Argentine Primera División
  'River Plate': 'Argentine Primera División', 'Boca Juniors': 'Argentine Primera División',
  'Racing Club': 'Argentine Primera División',
  // Scottish Premiership
  'Celtic': 'Scottish Premiership', 'Celtic FC': 'Scottish Premiership',
  'Rangers': 'Scottish Premiership', 'Rangers FC': 'Scottish Premiership',
  // Austrian Bundesliga
  'RB Salzburg': 'Austrian Bundesliga', 'Red Bull Salzburg': 'Austrian Bundesliga',
  'Rapid Wien': 'Austrian Bundesliga', 'SK Sturm Graz': 'Austrian Bundesliga',
  // Greek Super League
  'Olympiacos': 'Greek Super League', 'Olympiacos Piraeus': 'Greek Super League',
  'AEK Athens': 'Greek Super League', 'PAOK Thessaloniki': 'Greek Super League',
  // One club leagues in the current pool
  'Shakhtar Donetsk': 'Ukrainian Premier League',
  'FC Midtjylland': 'Danish Superliga',
  'Malmö FF': 'Swedish Allsvenskan',
  'FK Bodø/Glimt': 'Norwegian Eliteserien',
  'Red Star Belgrade': 'Serbian SuperLiga',
  'Al-Duhail SC': 'Qatari Stars League',
  'Deportivo Guadalajara': 'Liga MX',
};

/**
 * Returns kit number and league for a player fetched from Supabase.
 * Falls back to a club-derived league, and to a null kit number for anyone
 * the hand list below does not carry.
 */
export function getEnrichment(
  playerName: string,
  club: string
): { kitNumber: number | null; league: League } {
  /* Round 315: the CLUB decides the league, and only then the hand entry.
     The old order returned the per-player entry first, so anyone in the hand
     list who has moved since it was written kept their old league forever,
     and the final fallback was a flat 'Premier League', which mislabelled
     nearly the whole live pool once the club spellings stopped matching.
     Unknown club now reads 'Other': absent from every league filter rather
     than present in the wrong one. */
  const direct = footleEnrichment[playerName];
  const fromClub = CLUB_TO_LEAGUE[club];
  /* Round 443: a player who is not in the hand list has no squad number on
     file, and 1,375 of the live pool's 1,507 players are in that position.
     null says so; the 0 this used to return was printed by Footle's KIT #
     tile as though it were his number. */
  return {
    kitNumber: direct?.kitNumber ?? null,
    league: fromClub ?? direct?.league ?? 'Other',
  };
}
