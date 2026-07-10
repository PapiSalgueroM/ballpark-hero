/**
 * STADIUM DRAFT — the box2box "Guess the Stadium, Get the Player" format
 * (docs/YOUTUBER_FORMATS.md). Identify famous grounds from progressive
 * clues; every stadium you know earns one of its players for your XI.
 * The earlier you nail it, the more of the ground's six-player pool you
 * choose from. 11 rounds -> XI rating + grade + a local best-of-one sim
 * against The Groundskeeper XI.
 *
 * DATA IS HAND-AUTHORED, ACCURACY SACRED (owner deletes wrong-data games):
 * only world-famous grounds with facts verifiable from memory, capacity as
 * a rounded band, and clue text that avoids present-tense league/roster
 * claims that could rot (promotions, relegations, transfers).
 */

/* ---------------- Types ---------------- */
export type PosGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface StadiumPlayer {
  name: string;
  rating: number; // 78-97, hand-set
  pos: PosGroup;
}

export interface StadiumEntry {
  id: string;
  stadium: string;      // display name
  club: string;         // primary club (San Siro -> AC Milan, Maracana -> Flamengo)
  city: string;
  country: string;
  capacityBand: string; // rounded, e.g. '~61k'
  openedDecade: string; // e.g. '1880s'
  aliases?: string[];   // extra accepted answers (old/sponsor names, nicknames)
  clues: [string, string, string, string]; // vague -> specific
  playerPool: StadiumPlayer[]; // 6 players associated with the club
}

export interface XiSlot {
  code: string;    // GK, RB, CB...
  group: PosGroup; // position group the slot wants
}

/* ---------------- XI + scoring constants ---------------- */
export const XI_SLOTS: XiSlot[] = [
  { code: 'GK', group: 'GK' },
  { code: 'RB', group: 'DEF' },
  { code: 'CB', group: 'DEF' },
  { code: 'CB', group: 'DEF' },
  { code: 'LB', group: 'DEF' },
  { code: 'CDM', group: 'MID' },
  { code: 'CM', group: 'MID' },
  { code: 'CAM', group: 'MID' },
  { code: 'RW', group: 'ATT' },
  { code: 'ST', group: 'ATT' },
  { code: 'LW', group: 'ATT' },
];

/** Points earned by clue number the stadium was guessed on (0-indexed). */
export const CLUE_POINTS = [40, 25, 15, 5] as const;
/** How many of the 6 pool players you pick from, per clue guessed on. */
export const CHOICES_BY_CLUE = [6, 4, 2, 1] as const;
export const OUT_OF_POSITION_PENALTY = 6;
export const JOURNEYMAN_RATING = 65;

/* ---------------- The grounds (hand-verified) ---------------- */
export const STADIUMS: StadiumEntry[] = [
  {
    id: 'campnou', stadium: 'Camp Nou', club: 'FC Barcelona', city: 'Barcelona', country: 'Spain',
    capacityBand: '~99k', openedDecade: '1950s',
    aliases: ['Nou Camp', 'Spotify Camp Nou', 'Barca'],
    clues: [
      "Spain's biggest club ground, historically holding around 99,000 — with a rebuild underway to push past 100,000.",
      'Opened in the 1950s in the largest city of Catalonia.',
      "Its name simply means 'new field' in Catalan; while the builders moved in, the club decamped to an Olympic stadium up on Montjuic.",
      "The La Liga giant that plays here counts Lionel Messi's 600-plus club goals among its treasures — 'More than a club' is the motto.",
    ],
    playerPool: [
      { name: 'Lionel Messi', rating: 97, pos: 'ATT' },
      { name: 'Xavi', rating: 93, pos: 'MID' },
      { name: 'Andres Iniesta', rating: 93, pos: 'MID' },
      { name: 'Lamine Yamal', rating: 90, pos: 'ATT' },
      { name: 'Carles Puyol', rating: 89, pos: 'DEF' },
      { name: 'Marc-Andre ter Stegen', rating: 86, pos: 'GK' },
    ],
  },
  {
    id: 'bernabeu', stadium: 'Santiago Bernabeu', club: 'Real Madrid', city: 'Madrid', country: 'Spain',
    capacityBand: '~78k', openedDecade: '1940s',
    clues: [
      'Spain — around 78,000 seats after a futuristic rebuild wrapped the old bowl in a steel skin.',
      "Opened in the 1940s on one of the capital's grandest avenues.",
      'Named after the club president who built it; the pitch now retracts into an underground greenhouse so concerts can move in.',
      'Home of the La Liga side with a record haul of European Cups — Cristiano Ronaldo scored 450 goals in its white shirt.',
    ],
    playerPool: [
      { name: 'Cristiano Ronaldo', rating: 96, pos: 'ATT' },
      { name: 'Zinedine Zidane', rating: 95, pos: 'MID' },
      { name: 'Kylian Mbappe', rating: 95, pos: 'ATT' },
      { name: 'Jude Bellingham', rating: 91, pos: 'MID' },
      { name: 'Iker Casillas', rating: 91, pos: 'GK' },
      { name: 'Sergio Ramos', rating: 90, pos: 'DEF' },
    ],
  },
  {
    id: 'anfield', stadium: 'Anfield', club: 'Liverpool', city: 'Liverpool', country: 'England',
    capacityBand: '~61k', openedDecade: '1880s',
    clues: [
      'England, around 61,000 after its newest stand opened in 2023.',
      'Opened in the 1880s in a port city in the northwest.',
      "Oddly, it was home to the tenants' fiercest local rivals first; its most famous stand is the Kop and the anthem is 'You'll Never Walk Alone'.",
      'Steven Gerrard captained the Premier League club here for over a decade; Mohamed Salah rewrote its goalscoring records.',
    ],
    playerPool: [
      { name: 'Mohamed Salah', rating: 93, pos: 'ATT' },
      { name: 'Kenny Dalglish', rating: 93, pos: 'ATT' },
      { name: 'Steven Gerrard', rating: 92, pos: 'MID' },
      { name: 'Ian Rush', rating: 90, pos: 'ATT' },
      { name: 'Virgil van Dijk', rating: 90, pos: 'DEF' },
      { name: 'Alisson', rating: 89, pos: 'GK' },
    ],
  },
  {
    id: 'oldtrafford', stadium: 'Old Trafford', club: 'Manchester United', city: 'Manchester', country: 'England',
    capacityBand: '~74k', openedDecade: '1910s',
    aliases: ['Man Utd', 'Man United', 'Theatre of Dreams'],
    clues: [
      "England's biggest club ground, around 74,000.",
      'Opened in the 1910s in a northwest city it shares with a sky-blue rival.',
      "Bobby Charlton nicknamed it 'The Theatre of Dreams'; the Stretford End houses the loudest fans.",
      'Sir Alex Ferguson delivered 13 Premier League titles to the club that plays here; Ryan Giggs made over 900 appearances.',
    ],
    playerPool: [
      { name: 'Wayne Rooney', rating: 91, pos: 'ATT' },
      { name: 'Peter Schmeichel', rating: 91, pos: 'GK' },
      { name: 'Eric Cantona', rating: 90, pos: 'ATT' },
      { name: 'Ryan Giggs', rating: 90, pos: 'MID' },
      { name: 'Rio Ferdinand', rating: 88, pos: 'DEF' },
      { name: 'Bruno Fernandes', rating: 87, pos: 'MID' },
    ],
  },
  {
    id: 'emirates', stadium: 'Emirates Stadium', club: 'Arsenal', city: 'London', country: 'England',
    capacityBand: '~60k', openedDecade: '2000s',
    aliases: ['Ashburton Grove'],
    clues: [
      'England, around 60,000.',
      'Opened in the 2000s in the north of the capital.',
      'Named after a Gulf airline; the club left its beloved Art Deco home at Highbury, a few hundred yards away, to move in.',
      'The Premier League tenants honour Thierry Henry with a statue outside; Bukayo Saka is the modern academy jewel.',
    ],
    playerPool: [
      { name: 'Thierry Henry', rating: 94, pos: 'ATT' },
      { name: 'Dennis Bergkamp', rating: 92, pos: 'ATT' },
      { name: 'Bukayo Saka', rating: 89, pos: 'ATT' },
      { name: 'Declan Rice', rating: 88, pos: 'MID' },
      { name: 'William Saliba', rating: 87, pos: 'DEF' },
      { name: 'David Seaman', rating: 87, pos: 'GK' },
    ],
  },
  {
    id: 'stamfordbridge', stadium: 'Stamford Bridge', club: 'Chelsea', city: 'London', country: 'England',
    capacityBand: '~40k', openedDecade: '1870s',
    clues: [
      'England, around 40,000.',
      'Opened in the 1870s — as an athletics ground — in the west of the capital.',
      'The ground came first, the club later: its team was founded in 1905 specifically to fill it. The Shed End is the famous stand.',
      "Frank Lampard became the Premier League club's record scorer here — from midfield; Drogba's big-final goals won it everything.",
    ],
    playerPool: [
      { name: 'Frank Lampard', rating: 91, pos: 'MID' },
      { name: 'Didier Drogba', rating: 91, pos: 'ATT' },
      { name: 'Eden Hazard', rating: 91, pos: 'ATT' },
      { name: 'Petr Cech', rating: 90, pos: 'GK' },
      { name: 'John Terry', rating: 89, pos: 'DEF' },
      { name: 'Cole Palmer', rating: 88, pos: 'ATT' },
    ],
  },
  {
    id: 'etihad', stadium: 'Etihad Stadium', club: 'Manchester City', city: 'Manchester', country: 'England',
    capacityBand: '~53k', openedDecade: '2000s',
    aliases: ['Man City', 'City of Manchester Stadium', 'Eastlands'],
    clues: [
      'England — around 53,000, with an expansion underway to push past 60,000.',
      'Built for the 2002 Commonwealth Games in a northwest city.',
      "Its club left Maine Road to move in during 2003; an Abu Dhabi airline's name sits on the roof.",
      "Sergio Aguero's 93:20 title-winner in 2012 — the Premier League's most famous goal — happened here.",
    ],
    playerPool: [
      { name: 'Erling Haaland', rating: 94, pos: 'ATT' },
      { name: 'Kevin De Bruyne', rating: 92, pos: 'MID' },
      { name: 'Sergio Aguero', rating: 91, pos: 'ATT' },
      { name: 'David Silva', rating: 90, pos: 'MID' },
      { name: 'Ruben Dias', rating: 88, pos: 'DEF' },
      { name: 'Ederson', rating: 88, pos: 'GK' },
    ],
  },
  {
    id: 'tottenham', stadium: 'Tottenham Hotspur Stadium', club: 'Tottenham Hotspur', city: 'London', country: 'England',
    capacityBand: '~62k', openedDecade: '2010s',
    aliases: ['Spurs'],
    clues: [
      'England, around 62,000.',
      'Opened in the 2010s in the north of the capital, on the footprint of its demolished predecessor.',
      "The grass slides away to reveal an NFL field underneath; there's a 65-metre bar behind one goal and a daredevil walk on the roof.",
      'Harry Kane became England record scorer banging them in for the Premier League club here; the old place was White Hart Lane.',
    ],
    playerPool: [
      { name: 'Harry Kane', rating: 91, pos: 'ATT' },
      { name: 'Gareth Bale', rating: 90, pos: 'ATT' },
      { name: 'Son Heung-min', rating: 88, pos: 'ATT' },
      { name: 'Glenn Hoddle', rating: 88, pos: 'MID' },
      { name: 'Hugo Lloris', rating: 86, pos: 'GK' },
      { name: 'Ledley King', rating: 84, pos: 'DEF' },
    ],
  },
  {
    id: 'stjamespark', stadium: "St James' Park", club: 'Newcastle United', city: 'Newcastle upon Tyne', country: 'England',
    capacityBand: '~52k', openedDecade: '1890s',
    aliases: ['St James Park'],
    clues: [
      'England, around 52,000.',
      'Its club has called it home since the 1890s, in a city on the River Tyne.',
      'Rises straight out of the city centre; the Gallowgate End takes its name from the site of old public hangings.',
      "Alan Shearer's 206 goals for the black-and-white Premier League side here made him a local god.",
    ],
    playerPool: [
      { name: 'Alan Shearer', rating: 92, pos: 'ATT' },
      { name: 'Kevin Keegan', rating: 89, pos: 'ATT' },
      { name: 'Bruno Guimaraes', rating: 86, pos: 'MID' },
      { name: 'Sandro Tonali', rating: 86, pos: 'MID' },
      { name: 'Nick Pope', rating: 83, pos: 'GK' },
      { name: 'Fabian Schar', rating: 82, pos: 'DEF' },
    ],
  },
  {
    id: 'villapark', stadium: 'Villa Park', club: 'Aston Villa', city: 'Birmingham', country: 'England',
    capacityBand: '~43k', openedDecade: '1890s',
    clues: [
      'England, around 43,000.',
      "Opened in the 1890s in England's second city.",
      "Has hosted more FA Cup semi-finals than any other ground; the vast Holte End is one of English football's great home stands.",
      'Its claret-and-blue tenants won the 1982 European Cup; Emiliano Martinez has kept goal here in recent seasons.',
    ],
    playerPool: [
      { name: 'Emiliano Martinez', rating: 87, pos: 'GK' },
      { name: 'Paul McGrath', rating: 87, pos: 'DEF' },
      { name: 'Ollie Watkins', rating: 85, pos: 'ATT' },
      { name: 'Morgan Rogers', rating: 84, pos: 'MID' },
      { name: 'John McGinn', rating: 83, pos: 'MID' },
      { name: 'Peter Withe', rating: 82, pos: 'ATT' },
    ],
  },
  {
    id: 'sansiro', stadium: 'San Siro', club: 'AC Milan', city: 'Milan', country: 'Italy',
    capacityBand: '~80k', openedDecade: '1920s',
    aliases: ['Giuseppe Meazza', 'Inter', 'Internazionale', 'Inter Milan'],
    clues: [
      "Italy's largest stadium, around 80,000.",
      'Opened in the 1920s in the fashion capital of the north.',
      'Two bitter rivals share it; spiral ramp towers wrap its corners, and its official name honours a two-time World Cup winner of the 1930s.',
      "The red-and-black Serie A side that calls it home gave Paolo Maldini 900-plus matches; Kaka glided across this pitch to a Ballon d'Or.",
    ],
    playerPool: [
      { name: 'Paolo Maldini', rating: 94, pos: 'DEF' },
      { name: 'Kaka', rating: 92, pos: 'MID' },
      { name: 'Franco Baresi', rating: 92, pos: 'DEF' },
      { name: 'Andriy Shevchenko', rating: 91, pos: 'ATT' },
      { name: 'Mike Maignan', rating: 86, pos: 'GK' },
      { name: 'Christian Pulisic', rating: 85, pos: 'ATT' },
    ],
  },
  {
    id: 'allianz', stadium: 'Allianz Arena', club: 'Bayern Munich', city: 'Munich', country: 'Germany',
    capacityBand: '~75k', openedDecade: '2000s',
    clues: [
      'Germany, around 75,000.',
      "Opened in the 2000s in Bavaria's capital.",
      "Its quilted plastic shell glows red on home match nights — drivers on the autobahn can't miss it.",
      "The Bundesliga's record champions play here; Thomas Muller spent a quarter of a century in the club's shirts.",
    ],
    playerPool: [
      { name: 'Franz Beckenbauer', rating: 95, pos: 'DEF' },
      { name: 'Robert Lewandowski', rating: 93, pos: 'ATT' },
      { name: 'Manuel Neuer', rating: 92, pos: 'GK' },
      { name: 'Philipp Lahm', rating: 91, pos: 'DEF' },
      { name: 'Jamal Musiala', rating: 89, pos: 'MID' },
      { name: 'Thomas Muller', rating: 89, pos: 'ATT' },
    ],
  },
  {
    id: 'signaliduna', stadium: 'Signal Iduna Park', club: 'Borussia Dortmund', city: 'Dortmund', country: 'Germany',
    capacityBand: '~81k', openedDecade: '1970s',
    aliases: ['Westfalenstadion', 'BVB'],
    clues: [
      "Germany's biggest stadium, around 81,000.",
      'Opened for the 1974 World Cup in a Ruhr valley industrial city.',
      "One end is the 'Yellow Wall' — Europe's largest standing terrace, nearly 25,000 fans on a single tier.",
      'The Bundesliga side here launched Haaland and Bellingham to stardom; Marco Reus captained it for years. Old-timers still use its Westphalian name.',
    ],
    playerPool: [
      { name: 'Marco Reus', rating: 87, pos: 'MID' },
      { name: 'Mats Hummels', rating: 87, pos: 'DEF' },
      { name: 'Gregor Kobel', rating: 86, pos: 'GK' },
      { name: 'Serhou Guirassy', rating: 85, pos: 'ATT' },
      { name: 'Julian Brandt', rating: 83, pos: 'MID' },
      { name: 'Karim Adeyemi', rating: 82, pos: 'ATT' },
    ],
  },
  {
    id: 'parcdesprinces', stadium: 'Parc des Princes', club: 'Paris Saint-Germain', city: 'Paris', country: 'France',
    capacityBand: '~48k', openedDecade: '1970s',
    aliases: ['PSG'],
    clues: [
      'France, around 48,000.',
      'The current concrete bowl opened in the 1970s, in the southwest of the capital.',
      "Built directly on top of the city's ring-road tunnel; it staged the Euro 1984 final that Platini's hosts won.",
      'The Ligue 1 giant here made Mbappe its record scorer; Ibrahimovic, Neymar and Messi all wore the shirt.',
    ],
    playerPool: [
      { name: 'Ousmane Dembele', rating: 91, pos: 'ATT' },
      { name: 'Achraf Hakimi', rating: 89, pos: 'DEF' },
      { name: 'Gianluigi Donnarumma', rating: 89, pos: 'GK' },
      { name: 'Vitinha', rating: 88, pos: 'MID' },
      { name: 'Edinson Cavani', rating: 88, pos: 'ATT' },
      { name: 'Marquinhos', rating: 87, pos: 'DEF' },
    ],
  },
  {
    id: 'velodrome', stadium: 'Stade Velodrome', club: 'Olympique de Marseille', city: 'Marseille', country: 'France',
    capacityBand: '~67k', openedDecade: '1930s',
    aliases: ['Orange Velodrome'],
    clues: [
      "France's biggest club ground, around 67,000.",
      "Opened in the 1930s in the country's great Mediterranean port city.",
      'Named for the cycling track that once circled the pitch; a swooping white roof now crowns it.',
      'Its Ligue 1 tenants remain the only French winners of the Champions League (1993); Drogba detonated one unforgettable season here.',
    ],
    playerPool: [
      { name: 'Jean-Pierre Papin', rating: 90, pos: 'ATT' },
      { name: 'Chris Waddle', rating: 87, pos: 'MID' },
      { name: 'Didier Deschamps', rating: 87, pos: 'MID' },
      { name: 'Pierre-Emerick Aubameyang', rating: 85, pos: 'ATT' },
      { name: 'Steve Mandanda', rating: 84, pos: 'GK' },
      { name: 'Basile Boli', rating: 83, pos: 'DEF' },
    ],
  },
  {
    id: 'bombonera', stadium: 'La Bombonera', club: 'Boca Juniors', city: 'Buenos Aires', country: 'Argentina',
    capacityBand: '~54k', openedDecade: '1940s',
    aliases: ['Estadio Alberto J. Armando'],
    clues: [
      'Argentina, around 54,000.',
      "Opened in the 1940s in the capital's dockside south.",
      "Its nickname means 'the chocolate box': three steep tiers on three sides, one flat wall of boxes on the fourth. Locals swear it doesn't shake — it beats.",
      'Maradona kept a private box at his beloved blue-and-gold club here; Riquelme ran the show for a decade.',
    ],
    playerPool: [
      { name: 'Diego Maradona', rating: 96, pos: 'ATT' },
      { name: 'Juan Roman Riquelme', rating: 90, pos: 'MID' },
      { name: 'Carlos Tevez', rating: 87, pos: 'ATT' },
      { name: 'Martin Palermo', rating: 85, pos: 'ATT' },
      { name: 'Oscar Cordoba', rating: 82, pos: 'GK' },
      { name: 'Hugo Ibarra', rating: 80, pos: 'DEF' },
    ],
  },
  {
    id: 'monumental', stadium: 'El Monumental', club: 'River Plate', city: 'Buenos Aires', country: 'Argentina',
    capacityBand: '~84k', openedDecade: '1930s',
    aliases: ['Mas Monumental', 'Antonio Vespucio Liberti'],
    clues: [
      'The largest stadium in South America — around 84,000 — in Argentina.',
      'Opened in the 1930s in the leafy north of the capital.',
      "Hosted the 1978 World Cup final, ticker tape and all; its club's fans are 'Los Millonarios'.",
      'Alfredo Di Stefano started at this Primera Division institution before conquering Europe; Julian Alvarez is a recent academy export.',
    ],
    playerPool: [
      { name: 'Alfredo Di Stefano', rating: 95, pos: 'ATT' },
      { name: 'Enzo Francescoli', rating: 90, pos: 'MID' },
      { name: 'Daniel Passarella', rating: 89, pos: 'DEF' },
      { name: 'Julian Alvarez', rating: 89, pos: 'ATT' },
      { name: 'Marcelo Gallardo', rating: 85, pos: 'MID' },
      { name: 'Franco Armani', rating: 82, pos: 'GK' },
    ],
  },
  {
    id: 'maracana', stadium: 'Maracana', club: 'Flamengo', city: 'Rio de Janeiro', country: 'Brazil',
    capacityBand: '~78k', openedDecade: '1950s',
    aliases: ['Mario Filho', 'Fluminense'],
    clues: [
      'Brazil — around 78,000 today, though nearly 200,000 once squeezed in.',
      'Opened for the 1950 World Cup in the city beneath Christ the Redeemer.',
      'Pele scored his 1,000th goal here; the 1950 final defeat here still has a name Brazilians whisper.',
      'Its best-supported tenant wears red-and-black hoops in the Brasileirao; Zico is that club’s eternal idol.',
    ],
    playerPool: [
      { name: 'Zico', rating: 94, pos: 'MID' },
      { name: 'Giorgian De Arrascaeta', rating: 85, pos: 'MID' },
      { name: 'Gabigol', rating: 84, pos: 'ATT' },
      { name: 'Filipe Luis', rating: 83, pos: 'DEF' },
      { name: 'Bruno Henrique', rating: 82, pos: 'ATT' },
      { name: 'Agustin Rossi', rating: 80, pos: 'GK' },
    ],
  },
  {
    id: 'metropolitano', stadium: 'Metropolitano', club: 'Atletico Madrid', city: 'Madrid', country: 'Spain',
    capacityBand: '~70k', openedDecade: '2010s',
    aliases: ['Wanda Metropolitano', 'Riyadh Air Metropolitano', 'Civitas Metropolitano', 'La Peineta'],
    clues: [
      'Spain, around 70,000.',
      'Reopened for football in the 2010s on the eastern edge of the capital.',
      "Rebuilt from an abandoned athletics bowl nicknamed 'La Peineta' (the hair comb); it hosted the 2019 Champions League final.",
      'The red-and-white La Liga side that left the Calderon for it made Griezmann its record scorer; Simeone turned it into a fortress.',
    ],
    playerPool: [
      { name: 'Antoine Griezmann', rating: 89, pos: 'ATT' },
      { name: 'Jan Oblak', rating: 89, pos: 'GK' },
      { name: 'Fernando Torres', rating: 88, pos: 'ATT' },
      { name: 'Diego Godin', rating: 86, pos: 'DEF' },
      { name: 'Koke', rating: 85, pos: 'MID' },
      { name: 'Marcos Llorente', rating: 83, pos: 'MID' },
    ],
  },
  {
    id: 'mestalla', stadium: 'Mestalla', club: 'Valencia', city: 'Valencia', country: 'Spain',
    capacityBand: '~49k', openedDecade: '1920s',
    clues: [
      'Spain, around 49,000.',
      "Opened in the 1920s in the paella city on Spain's east coast.",
      'Famous for terrifyingly steep stands; a half-built replacement has loomed across town for more than 15 years.',
      'David Villa and David Silva starred for its La Liga tenants in the 2000s; Mario Kempes lit it up in the 70s.',
    ],
    playerPool: [
      { name: 'David Villa', rating: 90, pos: 'ATT' },
      { name: 'Mario Kempes', rating: 89, pos: 'ATT' },
      { name: 'Gaizka Mendieta', rating: 86, pos: 'MID' },
      { name: 'Santiago Canizares', rating: 85, pos: 'GK' },
      { name: 'Roberto Ayala', rating: 85, pos: 'DEF' },
      { name: 'Carlos Soler', rating: 81, pos: 'MID' },
    ],
  },
  {
    id: 'sanmames', stadium: 'San Mames', club: 'Athletic Club', city: 'Bilbao', country: 'Spain',
    capacityBand: '~53k', openedDecade: '2010s',
    aliases: ['La Catedral', 'The Cathedral', 'Athletic Bilbao', 'Bilbao'],
    clues: [
      'Spain, around 53,000.',
      'Opened in the 2010s in a Basque port city, a century after the ground it replaced next door.',
      "Nicknamed 'The Cathedral'; the club that worships here famously fields Basque players only.",
      "Its La Liga side has never been relegated; Telmo Zarra's scoring record stood for 60 years, and the Williams brothers fly its wings.",
    ],
    playerPool: [
      { name: 'Telmo Zarra', rating: 91, pos: 'ATT' },
      { name: 'Nico Williams', rating: 88, pos: 'ATT' },
      { name: 'Unai Simon', rating: 85, pos: 'GK' },
      { name: 'Inaki Williams', rating: 84, pos: 'ATT' },
      { name: 'Aymeric Laporte', rating: 84, pos: 'DEF' },
      { name: 'Oihan Sancet', rating: 83, pos: 'MID' },
    ],
  },
  {
    id: 'daluz', stadium: 'Estadio da Luz', club: 'Benfica', city: 'Lisbon', country: 'Portugal',
    capacityBand: '~65k', openedDecade: '2000s',
    aliases: ['A Luz', 'Stadium of Light'],
    clues: [
      "Portugal's biggest stadium, around 65,000.",
      "Rebuilt for Euro 2004 in the country's capital.",
      "An eagle named Vitoria circles the pitch before kick-off; the ground's name means 'Stadium of Light'.",
      "Eusebio's statue guards the entrance of this Primeira Liga giant, record champion of Portugal.",
    ],
    playerPool: [
      { name: 'Eusebio', rating: 95, pos: 'ATT' },
      { name: 'Rui Costa', rating: 89, pos: 'MID' },
      { name: 'Angel Di Maria', rating: 89, pos: 'ATT' },
      { name: 'Joao Neves', rating: 86, pos: 'MID' },
      { name: 'Nicolas Otamendi', rating: 84, pos: 'DEF' },
      { name: 'Anatoliy Trubin', rating: 82, pos: 'GK' },
    ],
  },
  {
    id: 'dragao', stadium: 'Estadio do Dragao', club: 'FC Porto', city: 'Porto', country: 'Portugal',
    capacityBand: '~50k', openedDecade: '2000s',
    aliases: ['Dragon Stadium'],
    clues: [
      'Portugal, around 50,000.',
      "Opened in 2003 for Euro 2004, in the country's second city — famous for its namesake fortified wine.",
      "Named after the winged creature on its club's crest.",
      "Jose Mourinho announced himself to Europe with this Primeira Liga club's 2004 Champions League win; Deco pulled the strings.",
    ],
    playerPool: [
      { name: 'Deco', rating: 90, pos: 'MID' },
      { name: 'Radamel Falcao', rating: 88, pos: 'ATT' },
      { name: 'Vitor Baia', rating: 87, pos: 'GK' },
      { name: 'Pepe', rating: 87, pos: 'DEF' },
      { name: 'Hulk', rating: 86, pos: 'ATT' },
      { name: 'James Rodriguez', rating: 85, pos: 'MID' },
    ],
  },
  {
    id: 'alvalade', stadium: 'Estadio Jose Alvalade', club: 'Sporting CP', city: 'Lisbon', country: 'Portugal',
    capacityBand: '~50k', openedDecade: '2000s',
    aliases: ['Sporting Lisbon'],
    clues: [
      'Portugal, around 50,000.',
      'Opened in 2003 for Euro 2004, in the capital — across town from a bigger rival.',
      "Named after its club's founder; the stands are a patchwork of green, yellow and blue seats.",
      'Cristiano Ronaldo debuted for its green-and-white lions before Manchester United came calling; Gyokeres plundered 97 goals here in two seasons.',
    ],
    playerPool: [
      { name: 'Luis Figo', rating: 92, pos: 'ATT' },
      { name: 'Viktor Gyokeres', rating: 88, pos: 'ATT' },
      { name: 'Pedro Goncalves', rating: 84, pos: 'MID' },
      { name: 'Rui Patricio', rating: 84, pos: 'GK' },
      { name: 'Morten Hjulmand', rating: 83, pos: 'MID' },
      { name: 'Sebastian Coates', rating: 81, pos: 'DEF' },
    ],
  },
  {
    id: 'cruyffarena', stadium: 'Johan Cruyff Arena', club: 'Ajax', city: 'Amsterdam', country: 'Netherlands',
    capacityBand: '~55k', openedDecade: '1990s',
    aliases: ['Amsterdam Arena'],
    clues: [
      "The Netherlands' largest stadium, around 55,000.",
      'Opened in the 1990s in the capital.',
      "Debuted under another name with a retractable roof — a European first — and was renamed in 2018 after the country's greatest ever player.",
      "The Eredivisie's record champions play here; the academy shipped out Kluivert, Seedorf, De Jong and De Ligt, and the number 14 is retired.",
    ],
    playerPool: [
      { name: 'Johan Cruyff', rating: 96, pos: 'ATT' },
      { name: 'Marco van Basten', rating: 93, pos: 'ATT' },
      { name: 'Edwin van der Sar', rating: 89, pos: 'GK' },
      { name: 'Jari Litmanen', rating: 88, pos: 'MID' },
      { name: 'Frenkie de Jong', rating: 87, pos: 'MID' },
      { name: 'Matthijs de Ligt', rating: 85, pos: 'DEF' },
    ],
  },
  {
    id: 'dekuip', stadium: 'De Kuip', club: 'Feyenoord', city: 'Rotterdam', country: 'Netherlands',
    capacityBand: '~51k', openedDecade: '1930s',
    aliases: ['Stadion Feijenoord', 'Feijenoord Stadion'],
    clues: [
      'The Netherlands, around 51,000.',
      "Opened in the 1930s in Europe's biggest port city.",
      "Its nickname means 'The Tub'; it has staged double figures of European finals — more than almost any ground on the continent.",
      'The Eredivisie club here was the first Dutch side to lift the European Cup (1970); Robin van Persie grew up in its academy.',
    ],
    playerPool: [
      { name: 'Robin van Persie', rating: 89, pos: 'ATT' },
      { name: 'Coen Moulijn', rating: 87, pos: 'ATT' },
      { name: 'Dirk Kuyt', rating: 84, pos: 'ATT' },
      { name: 'Giovanni van Bronckhorst', rating: 84, pos: 'DEF' },
      { name: 'Quinten Timber', rating: 82, pos: 'MID' },
      { name: 'Justin Bijlow', rating: 80, pos: 'GK' },
    ],
  },
  {
    id: 'celticpark', stadium: 'Celtic Park', club: 'Celtic', city: 'Glasgow', country: 'Scotland',
    capacityBand: '~60k', openedDecade: '1890s',
    aliases: ['Parkhead', 'Paradise'],
    clues: [
      "Scotland's biggest club ground, around 60,000.",
      "Opened in the 1890s in the country's largest city (not its capital).",
      "The faithful call it 'Paradise' — or simply by the name of its district; green-and-white hoops and famous European nights.",
      'The Lisbon Lions made its club the first British winner of the European Cup in 1967; Henrik Larsson scored 240-odd goals in the hoops.',
    ],
    playerPool: [
      { name: 'Henrik Larsson', rating: 91, pos: 'ATT' },
      { name: 'Jimmy Johnstone', rating: 90, pos: 'ATT' },
      { name: 'Billy McNeill', rating: 88, pos: 'DEF' },
      { name: 'Callum McGregor', rating: 82, pos: 'MID' },
      { name: 'Kieran Tierney', rating: 81, pos: 'DEF' },
      { name: 'Joe Hart', rating: 80, pos: 'GK' },
    ],
  },
  {
    id: 'ibrox', stadium: 'Ibrox', club: 'Rangers', city: 'Glasgow', country: 'Scotland',
    capacityBand: '~51k', openedDecade: '1890s',
    clues: [
      'Scotland, around 51,000.',
      "Opened in the 1890s south of the Clyde in the country's largest city.",
      'Its red-brick Main Stand, by the great stadium architect Archibald Leitch, is a listed building; a 1971 stairway tragedy here reshaped British stadium safety.',
      'The blue half of the Old Firm has won 50-plus league titles from this home; Ally McCoist plundered 355 goals.',
    ],
    playerPool: [
      { name: 'Brian Laudrup', rating: 89, pos: 'ATT' },
      { name: 'Paul Gascoigne', rating: 89, pos: 'MID' },
      { name: 'Ally McCoist', rating: 88, pos: 'ATT' },
      { name: 'John Greig', rating: 87, pos: 'DEF' },
      { name: 'Allan McGregor', rating: 81, pos: 'GK' },
      { name: 'James Tavernier', rating: 81, pos: 'DEF' },
    ],
  },
  {
    id: 'turktelekom', stadium: 'Turk Telekom Stadium', club: 'Galatasaray', city: 'Istanbul', country: 'Turkey',
    capacityBand: '~52k', openedDecade: '2010s',
    aliases: ['Rams Park', 'Ali Sami Yen', 'Turk Telekom Arena'],
    clues: [
      'Turkey, around 52,000.',
      'Opened in the 2010s on the European side of a city that spans two continents.',
      "Replaced the fabled 'Hell' of Ali Sami Yen; its opening years produced a Guinness-record crowd roar.",
      "Its yellow-and-red Super Lig side — UEFA Cup winners in 2000 — handed the 10 shirt to Hagi and Sneijder; Osimhen and Icardi have terrorised defences here lately.",
    ],
    playerPool: [
      { name: 'Gheorghe Hagi', rating: 91, pos: 'MID' },
      { name: 'Victor Osimhen', rating: 89, pos: 'ATT' },
      { name: 'Wesley Sneijder', rating: 87, pos: 'MID' },
      { name: 'Mauro Icardi', rating: 85, pos: 'ATT' },
      { name: 'Fernando Muslera', rating: 83, pos: 'GK' },
      { name: 'Davinson Sanchez', rating: 81, pos: 'DEF' },
    ],
  },
  {
    id: 'sukrusaracoglu', stadium: 'Sukru Saracoglu Stadium', club: 'Fenerbahce', city: 'Istanbul', country: 'Turkey',
    capacityBand: '~48k', openedDecade: '1900s',
    aliases: ['Ulker Stadium', 'Kadikoy'],
    clues: [
      'Turkey, around 48,000.',
      'Its club has played on this ground since 1908 — on the Asian side of a city that spans two continents.',
      'Hosted the 2009 UEFA Cup final; named after a former Turkish prime minister who once led the club.',
      'The yellow-and-navy Super Lig side here built a statue of Brazilian playmaker Alex; Jose Mourinho prowled its touchline in 2024-25.',
    ],
    playerPool: [
      { name: 'Alex de Souza', rating: 88, pos: 'MID' },
      { name: 'Edin Dzeko', rating: 85, pos: 'ATT' },
      { name: 'Youssef En-Nesyri', rating: 84, pos: 'ATT' },
      { name: 'Dusan Tadic', rating: 84, pos: 'MID' },
      { name: 'Volkan Demirel', rating: 82, pos: 'GK' },
      { name: 'Caglar Soyuncu', rating: 80, pos: 'DEF' },
    ],
  },
  {
    id: 'kingpower', stadium: 'King Power Stadium', club: 'Leicester City', city: 'Leicester', country: 'England',
    capacityBand: '~32k', openedDecade: '2000s',
    aliases: ['Walkers Stadium'],
    clues: [
      'England, around 32,000.',
      "Opened in the 2000s in an East Midlands city where a king's bones later turned up under a car park.",
      'It opened under the name of a crisp brand before a duty-free giant took over.',
      'The 5000-1 miracle happened here: Vardy, Mahrez and Kante dragged its club to the 2015-16 Premier League title.',
    ],
    playerPool: [
      { name: 'Jamie Vardy', rating: 88, pos: 'ATT' },
      { name: "N'Golo Kante", rating: 88, pos: 'MID' },
      { name: 'Riyad Mahrez', rating: 87, pos: 'ATT' },
      { name: 'Kasper Schmeichel', rating: 84, pos: 'GK' },
      { name: 'Wilfred Ndidi', rating: 81, pos: 'MID' },
      { name: 'Wes Morgan', rating: 80, pos: 'DEF' },
    ],
  },
  {
    id: 'ellandroad', stadium: 'Elland Road', club: 'Leeds United', city: 'Leeds', country: 'England',
    capacityBand: '~38k', openedDecade: '1890s',
    clues: [
      'England, around 38,000.',
      'A football home since the 1890s in a West Yorkshire city.',
      "Don Revie's feared champions of the 60s and 70s made it a fortress; Billy Bremner's statue stands outside.",
      'Its club were the last English champions of the pre-Premier League era (1992) and stormed back to the top flight as 100-point champions in 2025.',
    ],
    playerPool: [
      { name: 'John Charles', rating: 91, pos: 'ATT' },
      { name: 'Billy Bremner', rating: 89, pos: 'MID' },
      { name: 'Lucas Radebe', rating: 84, pos: 'DEF' },
      { name: 'Kalvin Phillips', rating: 81, pos: 'MID' },
      { name: 'Wilfried Gnonto', rating: 80, pos: 'ATT' },
      { name: 'Illan Meslier', rating: 79, pos: 'GK' },
    ],
  },
  {
    id: 'cravencottage', stadium: 'Craven Cottage', club: 'Fulham', city: 'London', country: 'England',
    capacityBand: '~29k', openedDecade: '1890s',
    clues: [
      'England, around 29,000.',
      'Opened in the 1890s on the north bank of the Thames.',
      'An actual cottage sits in one corner; the rebuilt Riverside Stand has a rooftop pool overlooking the river.',
      "Johnny Haynes — English football's first hundred-pounds-a-week player — has a stand named for him at this west London club's home.",
    ],
    playerPool: [
      { name: 'Johnny Haynes', rating: 88, pos: 'MID' },
      { name: 'Aleksandar Mitrovic', rating: 84, pos: 'ATT' },
      { name: 'Clint Dempsey', rating: 82, pos: 'ATT' },
      { name: 'Bernd Leno', rating: 82, pos: 'GK' },
      { name: 'Antonee Robinson', rating: 82, pos: 'DEF' },
      { name: 'Danny Murphy', rating: 81, pos: 'MID' },
    ],
  },
  {
    id: 'selhurstpark', stadium: 'Selhurst Park', club: 'Crystal Palace', city: 'London', country: 'England',
    capacityBand: '~26k', openedDecade: '1920s',
    clues: [
      'England, around 26,000.',
      'Opened in the 1920s in the south of the capital.',
      'The Holmesdale Fanatics bring continental-style drums, flags and tifos — a rarity in England.',
      'The Eagles finally landed a first major trophy from here — the 2025 FA Cup; Ian Wright and Wilfried Zaha are the home-grown icons.',
    ],
    playerPool: [
      { name: 'Ian Wright', rating: 89, pos: 'ATT' },
      { name: 'Eberechi Eze', rating: 85, pos: 'MID' },
      { name: 'Wilfried Zaha', rating: 84, pos: 'ATT' },
      { name: 'Marc Guehi', rating: 84, pos: 'DEF' },
      { name: 'Jean-Philippe Mateta', rating: 82, pos: 'ATT' },
      { name: 'Dean Henderson', rating: 81, pos: 'GK' },
    ],
  },
  {
    id: 'molineux', stadium: 'Molineux', club: 'Wolverhampton Wanderers', city: 'Wolverhampton', country: 'England',
    capacityBand: '~32k', openedDecade: '1880s',
    aliases: ['Wolves'],
    clues: [
      'England, around 32,000.',
      'Opened in the 1880s in a Black Country city in the West Midlands.',
      'Its floodlit 1950s friendlies against Honved and Spartak helped inspire the creation of the European Cup; old gold and black are the colours.',
      'Billy Wright — the first footballer on Earth to reach 100 caps — spent his whole career with the three-time English champions here.',
    ],
    playerPool: [
      { name: 'Billy Wright', rating: 90, pos: 'DEF' },
      { name: 'Steve Bull', rating: 85, pos: 'ATT' },
      { name: 'Ruben Neves', rating: 85, pos: 'MID' },
      { name: 'Matheus Cunha', rating: 84, pos: 'ATT' },
      { name: 'Raul Jimenez', rating: 82, pos: 'ATT' },
      { name: 'Jose Sa', rating: 80, pos: 'GK' },
    ],
  },
  {
    id: 'pizjuan', stadium: 'Ramon Sanchez-Pizjuan', club: 'Sevilla', city: 'Seville', country: 'Spain',
    capacityBand: '~44k', openedDecade: '1950s',
    aliases: ['Sanchez Pizjuan'],
    clues: [
      'Spain, around 44,000.',
      "Opened in the 1950s in Andalusia's capital.",
      "Staged the 'Battle of Seville' — the first ever World Cup shootout, France vs West Germany in 1982 — and a European Cup final in 1986.",
      'Its La Liga club are the undisputed kings of the Europa League with seven titles; Jesus Navas came through the academy and captained for years.',
    ],
    playerPool: [
      { name: 'Jesus Navas', rating: 85, pos: 'DEF' },
      { name: 'Ivan Rakitic', rating: 84, pos: 'MID' },
      { name: 'Frederic Kanoute', rating: 84, pos: 'ATT' },
      { name: 'Luis Fabiano', rating: 83, pos: 'ATT' },
      { name: 'Andres Palop', rating: 80, pos: 'GK' },
      { name: 'Diego Carlos', rating: 80, pos: 'DEF' },
    ],
  },
  {
    id: 'villamarin', stadium: 'Benito Villamarin', club: 'Real Betis', city: 'Seville', country: 'Spain',
    capacityBand: '~60k', openedDecade: '1920s',
    clues: [
      'Spain, around 60,000.',
      "Opened in 1929, the year of a great exposition in Andalusia's capital.",
      "Its green-and-white club draws some of Spain's loudest crowds; a full rebuild has the team lodging across the city at La Cartuja for now.",
      'Joaquin — record holder for La Liga appearances — was its beloved winger across two spells; Denilson arrived as the world-record signing of 1998.',
    ],
    playerPool: [
      { name: 'Joaquin', rating: 86, pos: 'ATT' },
      { name: 'Isco', rating: 85, pos: 'MID' },
      { name: 'Denilson', rating: 83, pos: 'ATT' },
      { name: 'Andres Guardado', rating: 81, pos: 'MID' },
      { name: 'Claudio Bravo', rating: 81, pos: 'GK' },
      { name: 'Marc Bartra', rating: 79, pos: 'DEF' },
    ],
  },
  {
    id: 'azteca', stadium: 'Estadio Azteca', club: 'Club America', city: 'Mexico City', country: 'Mexico',
    capacityBand: '~83k', openedDecade: '1960s',
    aliases: ['Coloso de Santa Ursula'],
    clues: [
      'Mexico — roughly 83,000 after its latest World Cup facelift.',
      'Opened in the 1960s in the capital, 2,200 metres above sea level.',
      "The only ground to host two men's World Cup finals (1970 and 1986) — it opened a third World Cup in June 2026. Maradona's Hand of God and Goal of the Century both happened here on a single afternoon.",
      "Its biggest tenant is Liga MX's most decorated club, Las Aguilas; Cuauhtemoc Blanco is the idol.",
    ],
    playerPool: [
      { name: 'Cuauhtemoc Blanco', rating: 87, pos: 'ATT' },
      { name: 'Guillermo Ochoa', rating: 84, pos: 'GK' },
      { name: 'Enrique Borja', rating: 83, pos: 'ATT' },
      { name: 'Henry Martin', rating: 81, pos: 'ATT' },
      { name: 'Alvaro Fidalgo', rating: 80, pos: 'MID' },
      { name: 'Miguel Layun', rating: 79, pos: 'DEF' },
    ],
  },
];

/* ---------------- Guess matching (accent/punctuation-insensitive) ---------------- */
const CHAR_MAP: Record<string, string> = {
  'ı': 'i', // dotless i
  'ø': 'o', 'æ': 'ae', 'ß': 'ss', 'đ': 'd', 'ł': 'l', 'œ': 'oe',
};

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ıøæßđłœ]/g, ch => CHAR_MAP[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Words too generic to count as a guess on their own ("arena", "stadium", "real"...).
const GENERIC = new Set([
  'the', 'of', 'de', 'del', 'da', 'do', 'dos', 'el', 'la', 'le', 'los', 'las', 'di',
  'stadium', 'stadion', 'stadio', 'estadio', 'estadi', 'stade', 'arena', 'park', 'road',
  'ground', 'st', 'saint', 'san', 'santo', 'santa', 'real', 'club', 'fc', 'cf', 'ac', 'cp', 'sc', 'afc',
]);

/** Accent-insensitive substring match vs stadium name, club name and aliases. */
export function isCorrectGuess(rawGuess: string, entry: StadiumEntry): boolean {
  const full = normalizeText(rawGuess);
  if (full.length < 3) return false;
  const kept = full.split(' ').filter(w => !GENERIC.has(w)).join(' ');
  if (kept.length < 3) return false; // guess must contain something non-generic
  const targets = [entry.stadium, entry.club, ...(entry.aliases ?? [])].map(normalizeText);
  return targets.some(t =>
    t.length > 0 && (t.includes(full) || (full.length >= 5 && full.includes(t)) || t.includes(kept)),
  );
}

/* ---------------- Run + pick helpers ---------------- */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 11 random stadiums, no repeats — one per XI slot. */
export function buildRun(count = XI_SLOTS.length): StadiumEntry[] {
  return shuffle(STADIUMS).slice(0, count);
}

export function lowestRated(pool: StadiumPlayer[]): StadiumPlayer {
  return pool.reduce((lo, p) => (p.rating < lo.rating ? p : lo), pool[0]);
}

/** Pool subset you may pick from, based on which clue you solved on (0-3). */
export function choicesForClue(pool: StadiumPlayer[], clueIndex: number): StadiumPlayer[] {
  if (clueIndex <= 0) return [...pool];
  if (clueIndex >= 3) return [lowestRated(pool)];
  return shuffle(pool).slice(0, CHOICES_BY_CLUE[clueIndex]);
}

export function journeyman(group: PosGroup): StadiumPlayer {
  return { name: 'Journeyman', rating: JOURNEYMAN_RATING, pos: group };
}

export function effectiveRating(player: StadiumPlayer, slotGroup: PosGroup): number {
  return player.pos === slotGroup ? player.rating : player.rating - OUT_OF_POSITION_PENALTY;
}

/** One filled XI slot. */
export interface XiPick {
  slot: XiSlot;
  player: StadiumPlayer;
  stadium: string;         // ground the player was earned at ('—' for Journeyman)
  clueIndex: number | null; // clue solved on (0-3), null = failed the stadium
  points: number;          // clue points earned this round
  outOfPosition: boolean;
  effective: number;       // rating actually counted (after any -6)
}

export function makePick(slot: XiSlot, player: StadiumPlayer, stadium: string, clueIndex: number | null): XiPick {
  const outOfPosition = player.pos !== slot.group;
  return {
    slot, player, stadium, clueIndex,
    points: clueIndex === null ? 0 : CLUE_POINTS[clueIndex],
    outOfPosition,
    effective: effectiveRating(player, slot.group),
  };
}

export function xiAverage(picks: XiPick[]): number {
  if (picks.length === 0) return 0;
  return picks.reduce((s, p) => s + p.effective, 0) / picks.length;
}

/* ---------------- Grade + showdown sim ---------------- */
export function gradeXi(avg: number): { grade: string; line: string } {
  if (avg >= 90) return { grade: 'S', line: 'A World XI. Every ground on the list would sell out to watch them.' };
  if (avg >= 84) return { grade: 'A', line: 'Champions League semifinal material, home or away.' };
  if (avg >= 78) return { grade: 'B', line: 'European nights guaranteed. Away ends will fear you.' };
  if (avg >= 72) return { grade: 'C', line: 'A solid mid-table core with a couple of season-ticket heroes.' };
  if (avg >= 66) return { grade: 'D', line: 'A relegation scrap — but at least you know which grounds you will visit.' };
  return { grade: 'F', line: 'Eleven Journeymen and a dream. Hit the stadium books.' };
}

export interface ShowdownResult {
  userGoals: number;
  oppGoals: number;
  outcome: 'win' | 'draw' | 'loss';
  lines: [string, string, string];
}

const GROUNDSKEEPER_RATING = 80;

function poissonish(expected: number): number {
  let g = 0;
  for (let i = 0; i < 5; i++) if (Math.random() < expected / 5) g++;
  return g;
}

const GOAL_FLAVOR = [
  'rifles one into the top corner —  the away end goes silent!',
  'peels off his marker and buries the cross!',
  'curls it around the wall and in!',
  'wins it high up and finishes coolly!',
];

/** 3-line local sim vs The Groundskeeper XI (rating-diff poisson, same idea as dartDraft.simulateSeries). */
export function simulateShowdown(userAvg: number, starName: string): ShowdownResult {
  const diff = userAvg - GROUNDSKEEPER_RATING;
  const ug = poissonish(Math.max(0.3, 1.5 + diff / 8));
  const og = poissonish(Math.max(0.3, 1.5 - diff / 8));
  const outcome: ShowdownResult['outcome'] = ug > og ? 'win' : og > ug ? 'loss' : 'draw';
  const middle = ug > 0
    ? `${starName} ${GOAL_FLAVOR[Math.floor(Math.random() * GOAL_FLAVOR.length)]}`
    : `${starName} is starved of service — the Groundskeeper parks eleven mowers in front of goal.`;
  const verdict = outcome === 'win'
    ? 'Your grounds knowledge built a team the Groundskeeper could not tame.'
    : outcome === 'draw'
      ? 'All square — the Groundskeeper tips his cap and reseeds the goalmouth.'
      : 'The Groundskeeper XI take it. He knows his turf; you need to know more grounds.';
  return {
    userGoals: ug, oppGoals: og, outcome,
    lines: [`Full time: Your Stadium XI ${ug}-${og} The Groundskeeper XI.`, middle, verdict],
  };
}

/** Total score = clue points across 11 rounds + final XI rating. */
export function finalScore(cluePointsTotal: number, avg: number): number {
  return cluePointsTotal + Math.round(avg);
}
