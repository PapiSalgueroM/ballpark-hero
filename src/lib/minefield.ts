/**
 * MINEFIELD - Sporcle/KOT4Q-style quiz board with hidden mines
 * (docs/YOUTUBER_FORMATS.md). A board shows one category and 12-16 name
 * tiles. Most tiles genuinely belong to the category; 4-6 are MINES -
 * plausible names from the same domain that do NOT belong. Click every
 * correct tile to clear the board; clicking a mine costs a life.
 * 2 lives per board, 3 boards per run. Daily (date-seeded, same boards
 * for everyone - mulberry32/daySeed pattern shared with Blind Rank) +
 * unlimited (random).
 *
 * DATA ACCURACY IS SACRED. Every list is hand-checked common knowledge.
 * Categories that a result AFTER mid-2025 could invalidate are era-locked
 * in their titles (e.g. "2000-2025") so a future champion can never turn
 * a mine into a member. Deliberate traps that are TRUE members (not
 * mines): Aston Villa (European Cup 1982), PSG (Champions League 2025),
 * Tottenham (Europa League 2025), Cristiano Ronaldo (103 Premier League
 * goals), Real Betis (La Liga 1935), Bayer Leverkusen (Bundesliga 2024),
 * Preston North End (Beckham loan 1995).
 */

export interface MinefieldCategory {
  id: string;
  title: string;
  hint: string;
  correct: string[]; // genuine members of the category
  mines: string[];   // same-domain names that are NOT members
}

export interface MinefieldTile {
  name: string;
  isMine: boolean;
}

export interface MinefieldRound {
  category: MinefieldCategory;
  tiles: MinefieldTile[];
}

export const LIVES_PER_ROUND = 2;
export const ROUNDS_PER_RUN = 3;
export const POINTS_PER_FIND = 10;
export const CLEAR_BONUS = 30;

export const MINEFIELD_CATEGORIES: MinefieldCategory[] = [
  /* ------------------------------ soccer ------------------------------ */
  {
    id: "ballon-dor-90s",
    title: "Ballon d'Or winners (1990-2025)",
    hint: "Actually lifted the trophy - famous nearly-men don't count.",
    // Weah 95, Ronaldo 97+02, Zidane 98, Owen 01, Ronaldinho 05, Cannavaro 06,
    // Kaka 07, Messi 8x, CR7 5x, Modric 18, Rodri 24.
    correct: [
      "George Weah", "Ronaldo Nazário", "Zinedine Zidane", "Michael Owen",
      "Ronaldinho", "Fabio Cannavaro", "Kaká", "Lionel Messi",
      "Cristiano Ronaldo", "Luka Modrić", "Rodri",
    ],
    // None of these ever won it (Lewandowski's best shot, 2020, was cancelled).
    mines: ["Zlatan Ibrahimović", "Xavi", "Andrés Iniesta", "Thierry Henry", "Robert Lewandowski"],
  },
  {
    id: "wc-winners",
    title: "World Cup-winning nations (1930-2022)",
    hint: "Men's FIFA World Cup champions only.",
    correct: ["Brazil", "Germany", "Italy", "Argentina", "France", "Uruguay", "England", "Spain"],
    // Netherlands lost 3 finals, Hungary 2, Croatia 1; Portugal/Belgium/Mexico never reached one they won.
    mines: ["Netherlands", "Portugal", "Belgium", "Croatia", "Hungary", "Mexico"],
  },
  {
    id: "ucl-winners",
    title: "Champions League / European Cup winners (through 2025)",
    hint: "Any European Cup or UCL title in club history counts.",
    // Aston Villa won it in 1982; PSG finally won it in 2025. Both are real.
    correct: [
      "Real Madrid", "AC Milan", "Bayern Munich", "Liverpool", "Barcelona",
      "Ajax", "Manchester United", "Inter Milan", "Nottingham Forest",
      "Aston Villa", "Paris Saint-Germain",
    ],
    // Arsenal (lost 2006 final), Atletico (lost 1974/2014/2016), Monaco (lost
    // 2004), Leeds (lost 1975), Valencia (lost 2000 + 2001) - none ever won it.
    mines: ["Arsenal", "Atlético Madrid", "AS Monaco", "Leeds United", "Valencia"],
  },
  {
    id: "pl-champions",
    title: "Premier League champions (1992-2025)",
    hint: "Premier League era only - old First Division titles don't count.",
    correct: [
      "Manchester United", "Arsenal", "Chelsea", "Manchester City",
      "Blackburn Rovers", "Leicester City", "Liverpool",
    ],
    // Leeds won the last pre-PL First Division (1992) but never the PL itself;
    // Newcastle's 2025 trophy was the League Cup, not the league.
    mines: ["Tottenham Hotspur", "Everton", "Newcastle United", "Aston Villa", "Leeds United", "West Ham United"],
  },
  {
    id: "england-100-caps",
    title: "England men with 100+ caps",
    hint: "Full senior international appearances for England.",
    // Shilton 125, Rooney 120, Beckham 115, Gerrard 114, Moore 108, A. Cole 107,
    // B. Charlton 106, Lampard 106, Wright 105, Kane passed 100 in March 2025.
    correct: [
      "Peter Shilton", "Wayne Rooney", "David Beckham", "Steven Gerrard",
      "Bobby Moore", "Ashley Cole", "Bobby Charlton", "Frank Lampard",
      "Billy Wright", "Harry Kane",
    ],
    // Shearer 63, Lineker 80, Gascoigne 57, Owen 89, Terry 78.
    mines: ["Alan Shearer", "Gary Lineker", "Paul Gascoigne", "Michael Owen", "John Terry"],
  },
  {
    id: "zlatan-clubs",
    title: "Clubs Zlatan Ibrahimović played for",
    hint: "Senior club career only.",
    correct: [
      "Malmö FF", "Ajax", "Juventus", "Inter Milan", "Barcelona",
      "AC Milan", "Paris Saint-Germain", "Manchester United", "LA Galaxy",
    ],
    // Arsenal famously only offered a trial - "Zlatan doesn't do auditions".
    mines: ["Real Madrid", "Bayern Munich", "Arsenal", "Chelsea", "Atlético Madrid"],
  },
  {
    id: "laliga-champions",
    title: "La Liga champions (through 2025)",
    hint: "Spanish top-flight title winners since 1929.",
    // Betis won 1935, Sevilla 1946, Deportivo 2000, Real Sociedad 1981+1982.
    correct: [
      "Real Madrid", "Barcelona", "Atlético Madrid", "Athletic Club",
      "Valencia", "Real Sociedad", "Sevilla", "Deportivo La Coruña", "Real Betis",
    ],
    mines: ["Villarreal", "Espanyol", "Celta Vigo", "Real Zaragoza", "Getafe"],
  },
  {
    id: "wc-hosts",
    title: "World Cup host countries (1930-2022)",
    hint: "Hosted or co-hosted a men's World Cup in that window.",
    correct: [
      "Uruguay", "Italy", "France", "Brazil", "England", "Mexico",
      "Argentina", "Spain", "United States", "South Africa", "Qatar",
    ],
    // Colombia was picked for 1986 but withdrew before hosting.
    mines: ["Netherlands", "Portugal", "Scotland", "Colombia", "Morocco"],
  },
  {
    id: "euro-winners",
    title: "Men's EURO winners (through 2024)",
    hint: "UEFA European Championship titles. Historic nations count as named.",
    correct: [
      "Spain", "Italy", "Germany", "France", "Netherlands", "Denmark",
      "Greece", "Portugal", "Soviet Union", "Czechoslovakia",
    ],
    // England men lost the 2021 and 2024 finals; Belgium lost the 1980 final.
    mines: ["England", "Belgium", "Croatia", "Sweden", "Turkey"],
  },
  {
    id: "pl-managers",
    title: "Managers who won the Premier League (1992-2025)",
    hint: "Lifted the PL title as a manager.",
    // Dalglish (Blackburn 95), Ancelotti (Chelsea 10), Ranieri (Leicester 16),
    // Slot (Liverpool 25) alongside the usual suspects.
    correct: [
      "Sir Alex Ferguson", "Kenny Dalglish", "Arsène Wenger", "José Mourinho",
      "Carlo Ancelotti", "Roberto Mancini", "Claudio Ranieri", "Antonio Conte",
      "Pep Guardiola", "Jürgen Klopp", "Arne Slot",
    ],
    // Benitez won league titles in Spain, never the PL.
    mines: ["Rafael Benítez", "Harry Redknapp", "David Moyes", "Sam Allardyce", "Frank Lampard"],
  },
  {
    id: "copa-america",
    title: "Copa América winners (through 2024)",
    hint: "Every edition since 1916 counts.",
    // Peru 1939+1975, Paraguay 1953+1979, Colombia 2001, Bolivia 1963.
    correct: ["Argentina", "Brazil", "Uruguay", "Chile", "Peru", "Paraguay", "Colombia", "Bolivia"],
    // Mexico lost two finals as invitees; the USA's best is fourth place.
    mines: ["Mexico", "Ecuador", "Venezuela", "United States"],
  },
  {
    id: "europa-winners",
    title: "Europa League / UEFA Cup winners (through 2025)",
    hint: "Cup Winners' Cup and Conference League don't count.",
    // Spurs beat Man Utd in the 2025 final; Villarreal 2021, Frankfurt 2022.
    correct: [
      "Sevilla", "Atlético Madrid", "Chelsea", "Manchester United", "Liverpool",
      "Inter Milan", "Porto", "Villarreal", "Eintracht Frankfurt", "Tottenham Hotspur",
    ],
    // Arsenal lost the 2000 + 2019 finals (their 1994 trophy was the Cup
    // Winners' Cup); Benfica, Marseille and Rangers all lost multiple finals.
    mines: ["Arsenal", "Benfica", "Marseille", "Rangers"],
  },
  {
    id: "afcon-winners",
    title: "Africa Cup of Nations winners (through 2024)",
    hint: "AFCON champions only.",
    // Morocco 1976, Zambia 2012, South Africa 1996, Ivory Coast 2024.
    correct: [
      "Egypt", "Cameroon", "Ghana", "Nigeria", "Ivory Coast", "Senegal",
      "Algeria", "Morocco", "Zambia", "South Africa",
    ],
    mines: ["Mali", "Burkina Faso", "Guinea", "Uganda", "Kenya"],
  },
  {
    id: "wc-golden-boot",
    title: "World Cup Golden Boot winners (1990-2022)",
    hint: "Top scorer of a single men's World Cup - shared awards count.",
    // 90 Schillaci, 94 Salenko + Stoichkov, 98 Suker, 02 Ronaldo, 06 Klose,
    // 10 Muller, 14 James, 18 Kane, 22 Mbappe.
    correct: [
      "Salvatore Schillaci", "Hristo Stoichkov", "Oleg Salenko", "Davor Šuker",
      "Ronaldo Nazário", "Miroslav Klose", "Thomas Müller", "James Rodríguez",
      "Harry Kane", "Kylian Mbappé",
    ],
    // Messi and Cristiano have never topped a World Cup scoring chart.
    mines: ["Lionel Messi", "Cristiano Ronaldo", "Neymar", "Thierry Henry", "Zinedine Zidane"],
  },
  {
    id: "serie-a-champions",
    title: "Serie A champions (through 2025)",
    hint: "Italian top-flight Scudetto winners.",
    // Torino's Grande Torino era, Bologna 7 titles (last 1964), Fiorentina
    // 1956 + 1969, Sampdoria 1991, Napoli again in 2023 + 2025.
    correct: [
      "Juventus", "AC Milan", "Inter Milan", "Napoli", "Roma", "Lazio",
      "Torino", "Bologna", "Fiorentina", "Sampdoria",
    ],
    // Parma won cups galore but never the league; Atalanta's 2024 trophy was
    // the Europa League.
    mines: ["Atalanta", "Parma", "Udinese", "Palermo", "Monza"],
  },
  {
    id: "bundesliga-champions",
    title: "Bundesliga champions (1963-2025)",
    hint: "Bundesliga era only - pre-1963 German titles don't count.",
    // Leverkusen finally won it (unbeaten) in 2024; Koln won the first-ever
    // Bundesliga in 1964; Kaiserslautern won 1998 as a promoted club.
    correct: [
      "Bayern Munich", "Borussia Dortmund", "Bayer Leverkusen", "Werder Bremen",
      "VfB Stuttgart", "Hamburger SV", "Borussia Mönchengladbach",
      "VfL Wolfsburg", "1. FC Kaiserslautern", "1. FC Köln",
    ],
    // Schalke's 7 titles and Frankfurt's 1959 crown all predate the Bundesliga.
    mines: ["Schalke 04", "RB Leipzig", "Eintracht Frankfurt", "Hertha Berlin", "Mainz 05"],
  },
  {
    id: "ronaldinho-clubs",
    title: "Clubs Ronaldinho played for",
    hint: "Senior club career only.",
    correct: [
      "Grêmio", "Paris Saint-Germain", "Barcelona", "AC Milan", "Flamengo",
      "Atlético Mineiro", "Querétaro", "Fluminense",
    ],
    // The 2011 Brazil saga ended at Flamengo - never Corinthians or Santos.
    mines: ["Real Madrid", "Inter Milan", "Corinthians", "Santos", "Boca Juniors"],
  },
  {
    id: "beckham-clubs",
    title: "Clubs David Beckham played for",
    hint: "Competitive senior appearances - loans count.",
    // Preston loan 1995, AC Milan loans 2009 + 2010, PSG farewell 2013.
    correct: ["Manchester United", "Preston North End", "Real Madrid", "LA Galaxy", "AC Milan", "Paris Saint-Germain"],
    // He OWNS Inter Miami but never played for them; he only trained with Spurs.
    mines: ["Tottenham Hotspur", "Arsenal", "Chelsea", "Inter Miami", "Barcelona", "Bayern Munich"],
  },
  {
    id: "pl-100-goals",
    title: "Premier League 100-goal club",
    hint: "100+ Premier League goals, all clubs combined.",
    // Shearer 260, Kane 213, Rooney 208, Cole 187, Aguero 184, Lampard 177,
    // Henry 175, Owen 150, Salah 150+, Vardy 100+, and yes - Cristiano
    // Ronaldo finished on 103 (84 first spell + 19 second spell).
    correct: [
      "Alan Shearer", "Harry Kane", "Wayne Rooney", "Andrew Cole",
      "Sergio Agüero", "Frank Lampard", "Thierry Henry", "Michael Owen",
      "Mohamed Salah", "Jamie Vardy", "Cristiano Ronaldo",
    ],
    // Bergkamp stopped at 87, Suarez at 82, Cantona at 70, Silva at 60, Zola at 59.
    mines: ["Dennis Bergkamp", "Luis Suárez", "Eric Cantona", "David Silva", "Gianfranco Zola"],
  },
  /* ---------------------------- basketball ---------------------------- */
  {
    id: "nba-mvps",
    title: "NBA MVPs (2000-2025)",
    hint: "Regular-season MVP award in that window.",
    // Shaq 00, AI 01, Duncan 02-03, Nash 05-06, Dirk 07, Kobe 08, LeBron 4x,
    // Rose 11, Curry 15-16, Jokic 21/22/24, SGA 25.
    correct: [
      "Shaquille O'Neal", "Allen Iverson", "Tim Duncan", "Steve Nash",
      "Dirk Nowitzki", "Kobe Bryant", "LeBron James", "Derrick Rose",
      "Stephen Curry", "Nikola Jokić", "Shai Gilgeous-Alexander",
    ],
    // Kawhi has two Finals MVPs but zero regular-season MVPs.
    mines: ["Carmelo Anthony", "Dwyane Wade", "Chris Paul", "Vince Carter", "Kawhi Leonard"],
  },
  {
    id: "nba-champions",
    title: "NBA champions (2000-2025)",
    hint: "Franchises that won a title in that window.",
    // Pistons 04, Mavs 11, Cavs 16, Raptors 19, Bucks 21, Nuggets 23,
    // Celtics 24, Thunder 25.
    correct: [
      "Los Angeles Lakers", "San Antonio Spurs", "Detroit Pistons", "Miami Heat",
      "Boston Celtics", "Dallas Mavericks", "Golden State Warriors",
      "Cleveland Cavaliers", "Toronto Raptors", "Milwaukee Bucks",
      "Denver Nuggets", "Oklahoma City Thunder",
    ],
    // Suns and Jazz have never won it at all; Knicks not since 1973.
    mines: ["Phoenix Suns", "New York Knicks", "Utah Jazz", "Los Angeles Clippers"],
  },
  {
    id: "shaq-teams",
    title: "NBA teams Shaquille O'Neal played for",
    hint: "Regular-season NBA appearances.",
    correct: ["Orlando Magic", "Los Angeles Lakers", "Miami Heat", "Phoenix Suns", "Cleveland Cavaliers", "Boston Celtics"],
    mines: ["San Antonio Spurs", "New York Knicks", "Chicago Bulls", "Dallas Mavericks", "Sacramento Kings", "Brooklyn Nets"],
  },
  /* ----------------------------- football ----------------------------- */
  {
    id: "super-bowl-winners",
    title: "Super Bowl-winning franchises (through Feb 2025)",
    hint: "At least one Lombardi Trophy through Super Bowl LIX.",
    correct: [
      "Pittsburgh Steelers", "New England Patriots", "Dallas Cowboys",
      "San Francisco 49ers", "Green Bay Packers", "New York Giants",
      "Kansas City Chiefs", "Denver Broncos", "Philadelphia Eagles",
      "Tampa Bay Buccaneers",
    ],
    // Vikings and Bills are both 0-4 in Super Bowls; Browns have never played in one.
    mines: ["Minnesota Vikings", "Buffalo Bills", "Cincinnati Bengals", "Atlanta Falcons", "Carolina Panthers", "Cleveland Browns"],
  },
  {
    id: "nfl-mvps",
    title: "NFL MVPs (2000-2024 seasons)",
    hint: "AP Most Valuable Player award.",
    // Faulk 00, Warner 01, LT 06, AP 12, Cam 15, Josh Allen 24.
    correct: [
      "Marshall Faulk", "Kurt Warner", "Peyton Manning", "Tom Brady",
      "LaDainian Tomlinson", "Adrian Peterson", "Cam Newton", "Aaron Rodgers",
      "Patrick Mahomes", "Lamar Jackson", "Josh Allen",
    ],
    // Brees famously never won MVP; neither did Rivers, Big Ben, Romo or Wilson.
    mines: ["Drew Brees", "Philip Rivers", "Ben Roethlisberger", "Tony Romo", "Russell Wilson"],
  },
  /* ----------------------------- baseball ----------------------------- */
  {
    id: "world-series-champs",
    title: "World Series champions (2000-2025)",
    hint: "Franchises that won a Fall Classic in that window.",
    // Royals 15, Cubs 16, Rangers 23, Dodgers 20 + 24 + 25.
    correct: [
      "New York Yankees", "Boston Red Sox", "St. Louis Cardinals",
      "San Francisco Giants", "Chicago Cubs", "Houston Astros",
      "Los Angeles Dodgers", "Atlanta Braves", "Texas Rangers",
      "Philadelphia Phillies", "Kansas City Royals",
    ],
    // Mariners have never even reached a World Series; Mets last won in 1986.
    mines: ["New York Mets", "San Diego Padres", "Seattle Mariners", "Tampa Bay Rays", "Milwaukee Brewers"],
  },
  {
    id: "mlb-3000-hits",
    title: "MLB 3,000-hit club",
    hint: "Career MLB hits only.",
    correct: [
      "Pete Rose", "Ty Cobb", "Hank Aaron", "Willie Mays", "Derek Jeter",
      "Ichiro Suzuki", "Albert Pujols", "Miguel Cabrera", "Tony Gwynn",
      "Cal Ripken Jr.",
    ],
    // Bonds stopped at 2,935, Ruth at 2,873, Griffey at 2,781, Williams at
    // 2,654, Mantle at 2,415.
    mines: ["Barry Bonds", "Ken Griffey Jr.", "Babe Ruth", "Ted Williams", "Mickey Mantle"],
  },
  {
    id: "mlb-500-hrs",
    title: "MLB 500-home-run club",
    hint: "Career MLB home runs only.",
    correct: [
      "Barry Bonds", "Hank Aaron", "Babe Ruth", "Willie Mays", "Albert Pujols",
      "Alex Rodriguez", "Ken Griffey Jr.", "Mickey Mantle", "Ted Williams",
      "David Ortiz",
    ],
    // Gehrig finished on 493 - the most famous near-miss in baseball.
    mines: ["Lou Gehrig", "Derek Jeter", "Joe DiMaggio", "Ichiro Suzuki", "Yogi Berra"],
  },
  /* ------------------------------ hockey ------------------------------ */
  {
    id: "stanley-cup-champs",
    title: "Stanley Cup champions (2000-2025)",
    hint: "Franchises that lifted the Cup in that window.",
    // Hurricanes 06, Caps 18, Panthers back-to-back 24 + 25.
    correct: [
      "New Jersey Devils", "Colorado Avalanche", "Detroit Red Wings",
      "Tampa Bay Lightning", "Carolina Hurricanes", "Pittsburgh Penguins",
      "Chicago Blackhawks", "Boston Bruins", "Los Angeles Kings",
      "Washington Capitals", "Florida Panthers",
    ],
    // Toronto's last Cup was 1967; Canucks, Sabres and Predators have none.
    mines: ["Toronto Maple Leafs", "Vancouver Canucks", "Buffalo Sabres", "Ottawa Senators", "Nashville Predators"],
  },
  /* ------------------------------ tennis ------------------------------ */
  {
    id: "wimbledon-men",
    title: "Wimbledon men's singles champions (1990-2025)",
    hint: "Singles titles only.",
    // Edberg 90, Agassi 92, Goran's 2001 wildcard, Hewitt 02, Alcaraz 23-24,
    // Sinner 25.
    correct: [
      "Stefan Edberg", "Andre Agassi", "Pete Sampras", "Goran Ivanišević",
      "Lleyton Hewitt", "Roger Federer", "Rafael Nadal", "Novak Djokovic",
      "Andy Murray", "Carlos Alcaraz", "Jannik Sinner",
    ],
    // Roddick lost three finals; Lendl famously never won it; Henman made
    // four semis and no final.
    mines: ["Andy Roddick", "Ivan Lendl", "Jim Courier", "Marat Safin", "Tim Henman"],
  },
  /* ------------------------------- motor ------------------------------ */
  {
    id: "f1-champions",
    title: "F1 World Drivers' Champions (2000-2024)",
    hint: "Clinched at least one drivers' title in that window.",
    correct: [
      "Michael Schumacher", "Fernando Alonso", "Kimi Räikkönen",
      "Lewis Hamilton", "Jenson Button", "Sebastian Vettel", "Nico Rosberg",
      "Max Verstappen",
    ],
    // Massa lost the 2008 title by a single point.
    mines: ["Felipe Massa", "Rubens Barrichello", "Mark Webber", "David Coulthard", "Daniel Ricciardo"],
  },
  /* ----------------------------- olympics ----------------------------- */
  {
    id: "summer-olympics-hosts",
    title: "Summer Olympics host countries (through 2024)",
    hint: "Hosted at least one Summer Games.",
    correct: [
      "Greece", "France", "United States", "Great Britain", "Australia",
      "Italy", "Japan", "Mexico", "Canada", "China", "Brazil",
    ],
    // Istanbul has bid five times and never won hosting rights.
    mines: ["India", "Argentina", "South Africa", "Turkey", "Egypt"],
  },
  {
    id: "olympic-100m-men",
    title: "Olympic men's 100m champions (1984-2024)",
    hint: "Individual 100m gold - relay golds don't count.",
    // Lewis 84 + 88, Christie 92, Bailey 96, Greene 00, Gatlin 04, Bolt
    // 08/12/16, Jacobs 21, Lyles 24.
    correct: [
      "Carl Lewis", "Linford Christie", "Donovan Bailey", "Maurice Greene",
      "Justin Gatlin", "Usain Bolt", "Marcell Jacobs", "Noah Lyles",
    ],
    // Powell and Gay never won an individual Olympic medal; Blake, Fredericks
    // and De Grasse collected 100m silvers and bronzes, never the gold.
    mines: ["Asafa Powell", "Tyson Gay", "Yohan Blake", "Frankie Fredericks", "Andre De Grasse"],
  },
  /* ------------------------------- golf ------------------------------- */
  {
    id: "masters-champions",
    title: "Masters champions (2000-2025)",
    hint: "Green jackets won at Augusta in that window.",
    // Vijay 00, Scott 13, Spieth 15, Sergio 17, DJ 20, Matsuyama 21,
    // Scheffler 22 + 24, Rory completed the career slam in 2025.
    correct: [
      "Tiger Woods", "Phil Mickelson", "Vijay Singh", "Adam Scott",
      "Jordan Spieth", "Sergio García", "Dustin Johnson", "Hideki Matsuyama",
      "Scottie Scheffler", "Rory McIlroy",
    ],
    // Norman and Els combined for five runner-up finishes and zero jackets;
    // Montgomerie and Westwood never won any major.
    mines: ["Greg Norman", "Ernie Els", "Colin Montgomerie", "Lee Westwood", "David Duval"],
  },
  /* ------------------------------ combat ------------------------------ */
  {
    id: "ufc-champions",
    title: "Undisputed UFC champions",
    hint: "Held undisputed UFC gold - interim belts don't count.",
    correct: [
      "Conor McGregor", "Khabib Nurmagomedov", "Jon Jones", "Anderson Silva",
      "Georges St-Pierre", "Israel Adesanya", "Alex Pereira", "Islam Makhachev",
      "Charles Oliveira", "Ronda Rousey", "Amanda Nunes", "Stipe Miocic",
    ],
    // Diaz, Cerrone, Sonnen and Till fought for or around gold but never held it.
    mines: ["Nate Diaz", "Donald Cerrone", "Chael Sonnen", "Darren Till"],
  },
];

/* ------------- deterministic RNG - same pattern as blindRank ------------ */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function daySeed(date = new Date()): number {
  // ET-anchored day number so the daily flips at the same moment as the polls
  const et = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return Math.floor(Date.UTC(et.getFullYear(), et.getMonth(), et.getDate()) / 86_400_000);
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a full run: 3 distinct boards with their tiles shuffled.
 * Deterministic when a seed is provided (daily), random otherwise.
 */
export function buildRun(seed?: number): MinefieldRound[] {
  const rng = seed !== undefined ? mulberry32(seed) : Math.random;
  const order = shuffle(MINEFIELD_CATEGORIES.map((_, i) => i), rng);
  return order.slice(0, ROUNDS_PER_RUN).map(idx => {
    const category = MINEFIELD_CATEGORIES[idx];
    const tiles = shuffle<MinefieldTile>(
      [
        ...category.correct.map(name => ({ name, isMine: false })),
        ...category.mines.map(name => ({ name, isMine: true })),
      ],
      rng,
    );
    return { category, tiles };
  });
}

/** Highest score available in a run (for share copy / end screen). */
export function maxRunScore(rounds: MinefieldRound[]): number {
  return rounds.reduce(
    (sum, r) => sum + r.tiles.filter(t => !t.isMine).length * POINTS_PER_FIND + CLEAR_BONUS,
    0,
  );
}
