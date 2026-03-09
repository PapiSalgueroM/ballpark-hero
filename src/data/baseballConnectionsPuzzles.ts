export interface BaseballConnectionGroup {
  theme: string;
  players: string[];
  difficulty: 'yellow' | 'green' | 'blue' | 'purple';
}

export interface BaseballConnectionsPuzzle {
  id: string;
  groups: BaseballConnectionGroup[];
}

export const baseballConnectionsPuzzles: BaseballConnectionsPuzzle[] = [
  {
    id: 'bconn-001',
    groups: [
      { theme: 'Won MVP in both leagues', players: ['Frank Robinson', 'Alex Rodriguez', 'Barry Bonds', 'Albert Pujols', 'Shohei Ohtani'], difficulty: 'yellow' },
      { theme: 'Played for the Boston Red Sox', players: ['David Ortiz', 'Pedro Martinez', 'Mookie Betts', 'Ted Williams', 'Manny Ramirez'], difficulty: 'green' },
      { theme: 'Hit 500+ career home runs', players: ['Ken Griffey Jr.', 'Jim Thome', 'Sammy Sosa', 'Gary Sheffield', 'Manny Ramirez'], difficulty: 'blue' },
      { theme: 'Born in the Dominican Republic', players: ['Robinson Cano', 'Juan Soto', 'Vladimir Guerrero Jr.', 'Manny Machado', 'Fernando Tatis Jr.'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-002',
    groups: [
      { theme: 'Won Cy Young Award', players: ['Clayton Kershaw', 'Max Scherzer', 'Justin Verlander', 'Jacob deGrom', 'Corey Kluber'], difficulty: 'yellow' },
      { theme: 'Played for the New York Yankees', players: ['Derek Jeter', 'Mariano Rivera', 'Aaron Judge', 'Alex Rodriguez', 'CC Sabathia'], difficulty: 'green' },
      { theme: 'First overall draft pick', players: ['Bryce Harper', 'Ken Griffey Jr.', 'Chipper Jones', 'Adrian Gonzalez', 'Alex Rodriguez'], difficulty: 'blue' },
      { theme: 'Played in Japan before MLB', players: ['Ichiro Suzuki', 'Shohei Ohtani', 'Hideki Matsui', 'Yu Darvish', 'Masahiro Tanaka'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-003',
    groups: [
      { theme: 'World Series MVP winners', players: ['Madison Bumgarner', 'David Ortiz', 'Jorge Soler', 'Ben Zobrist', 'Corey Seager'], difficulty: 'yellow' },
      { theme: 'Stole 50+ bases in a season', players: ['Rickey Henderson', 'Tim Raines', 'Jose Reyes', 'Dee Gordon', 'Billy Hamilton'], difficulty: 'green' },
      { theme: 'Played for the Los Angeles Dodgers', players: ['Mookie Betts', 'Freddie Freeman', 'Clayton Kershaw', 'Corey Seager', 'Cody Bellinger'], difficulty: 'blue' },
      { theme: 'Switch hitters', players: ['Chipper Jones', 'Carlos Beltran', 'Victor Martinez', 'Lance Berkman', 'Jorge Posada'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-004',
    groups: [
      { theme: 'Won Rookie of the Year', players: ['Mike Trout', 'Aaron Judge', 'Shohei Ohtani', 'Ichiro Suzuki', 'Albert Pujols'], difficulty: 'yellow' },
      { theme: 'Played for the Chicago Cubs', players: ['Anthony Rizzo', 'Kris Bryant', 'Javier Baez', 'Jake Arrieta', 'Jon Lester'], difficulty: 'green' },
      { theme: '300+ career wins', players: ['Greg Maddux', 'Tom Glavine', 'Randy Johnson', 'Roger Clemens', 'Mike Mussina'], difficulty: 'blue' },
      { theme: 'Born in Venezuela', players: ['Miguel Cabrera', 'Felix Hernandez', 'Jose Altuve', 'Salvador Perez', 'Ronald Acuna Jr.'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-005',
    groups: [
      { theme: 'Triple Crown winners', players: ['Miguel Cabrera', 'Carl Yastrzemski', 'Frank Robinson', 'Mickey Mantle', 'Ted Williams'], difficulty: 'yellow' },
      { theme: 'Played for the Houston Astros', players: ['Jose Altuve', 'Justin Verlander', 'Carlos Correa', 'George Springer', 'Alex Bregman'], difficulty: 'green' },
      { theme: 'Threw a no-hitter', players: ['Nolan Ryan', 'Max Scherzer', 'Justin Verlander', 'Clayton Kershaw', 'Hideo Nomo'], difficulty: 'blue' },
      { theme: 'Gold Glove winning catchers', players: ['Yadier Molina', 'Buster Posey', 'Salvador Perez', 'J.T. Realmuto', 'Ivan Rodriguez'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-006',
    groups: [
      { theme: 'Hit 40+ HR in a season (2020s)', players: ['Aaron Judge', 'Pete Alonso', 'Kyle Schwarber', 'Matt Olson', 'Shohei Ohtani'], difficulty: 'yellow' },
      { theme: 'Played for the San Francisco Giants', players: ['Buster Posey', 'Madison Bumgarner', 'Brandon Crawford', 'Tim Lincecum', 'Pablo Sandoval'], difficulty: 'green' },
      { theme: 'Career .300+ hitters (21st century)', players: ['Ichiro Suzuki', 'Miguel Cabrera', 'Jose Altuve', 'DJ LeMahieu', 'Michael Young'], difficulty: 'blue' },
      { theme: 'Born in Cuba', players: ['Yoenis Cespedes', 'Aroldis Chapman', 'Jose Abreu', 'Yasiel Puig', 'Yordan Alvarez'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-007',
    groups: [
      { theme: '2024 World Series champion Dodgers', players: ['Mookie Betts', 'Freddie Freeman', 'Shohei Ohtani', 'Teoscar Hernandez', 'Walker Buehler'], difficulty: 'yellow' },
      { theme: 'Played for the St. Louis Cardinals', players: ['Albert Pujols', 'Yadier Molina', 'Adam Wainwright', 'Matt Carpenter', 'Paul Goldschmidt'], difficulty: 'green' },
      { theme: 'Silver Slugger at shortstop', players: ['Trea Turner', 'Carlos Correa', 'Corey Seager', 'Francisco Lindor', 'Xander Bogaerts'], difficulty: 'blue' },
      { theme: 'Undrafted players', players: ['Jose Bautista', 'Russell Martin', 'Oliver Perez', 'Bartolo Colon', 'Yadier Molina'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-008',
    groups: [
      { theme: 'Won back-to-back MVPs', players: ['Mike Trout', 'Albert Pujols', 'Barry Bonds', 'Frank Thomas', 'Dale Murphy'], difficulty: 'yellow' },
      { theme: 'Played for the Atlanta Braves', players: ['Chipper Jones', 'Freddie Freeman', 'Ronald Acuna Jr.', 'Greg Maddux', 'John Smoltz'], difficulty: 'green' },
      { theme: 'Had a 20+ game hitting streak (2020s)', players: ['Julio Rodriguez', 'Gunnar Henderson', 'Luis Arraez', 'Freddie Freeman', 'Ronald Acuna Jr.'], difficulty: 'blue' },
      { theme: 'Born in Japan', players: ['Ichiro Suzuki', 'Shohei Ohtani', 'Yu Darvish', 'Hideki Matsui', 'Masahiro Tanaka'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-009',
    groups: [
      { theme: 'All-Star Game MVPs (2010s–2020s)', players: ['Mike Trout', 'Mariano Rivera', 'Aaron Judge', 'Vladimir Guerrero Jr.', 'Shohei Ohtani'], difficulty: 'yellow' },
      { theme: 'Played for the Philadelphia Phillies', players: ['Bryce Harper', 'Trea Turner', 'J.T. Realmuto', 'Rhys Hoskins', 'Zack Wheeler'], difficulty: 'green' },
      { theme: 'Left-handed starting pitchers', players: ['Clayton Kershaw', 'Madison Bumgarner', 'Chris Sale', 'Jon Lester', 'Cole Hamels'], difficulty: 'blue' },
      { theme: 'Born in Puerto Rico', players: ['Carlos Beltran', 'Yadier Molina', 'Carlos Correa', 'Javier Baez', 'Francisco Lindor'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-010',
    groups: [
      { theme: '3,000+ career hits', players: ['Derek Jeter', 'Ichiro Suzuki', 'Albert Pujols', 'Adrian Beltre', 'Miguel Cabrera'], difficulty: 'yellow' },
      { theme: 'Played for the Texas Rangers', players: ['Adrian Beltre', 'Yu Darvish', 'Corey Seager', 'Max Scherzer', 'Alex Rodriguez'], difficulty: 'green' },
      { theme: 'Closers with 300+ saves', players: ['Mariano Rivera', 'Kenley Jansen', 'Craig Kimbrel', 'Aroldis Chapman', 'Francisco Rodriguez'], difficulty: 'blue' },
      { theme: 'Went to the same college (Vanderbilt)', players: ['David Price', 'Sonny Gray', 'Dansby Swanson', 'Walker Buehler', 'Kumar Rocker'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-011',
    groups: [
      { theme: '50+ HR in a single season', players: ['Aaron Judge', 'Giancarlo Stanton', 'Prince Fielder', 'Chris Davis', 'Shohei Ohtani'], difficulty: 'yellow' },
      { theme: 'Played for the Cleveland Guardians/Indians', players: ['Francisco Lindor', 'Corey Kluber', 'Jose Ramirez', 'Manny Ramirez', 'Jim Thome'], difficulty: 'green' },
      { theme: 'Won Gold Glove at outfield', players: ['Mike Trout', 'Mookie Betts', 'Byron Buxton', 'Kevin Kiermaier', 'Adam Jones'], difficulty: 'blue' },
      { theme: 'Born in Panama', players: ['Mariano Rivera', 'Carlos Lee', 'Rod Carew', 'Ben Oglivie', 'Manny Sanguillen'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-012',
    groups: [
      { theme: 'Pitchers with 3000+ strikeouts', players: ['Nolan Ryan', 'Randy Johnson', 'Roger Clemens', 'Justin Verlander', 'Max Scherzer'], difficulty: 'yellow' },
      { theme: 'Played for the Minnesota Twins', players: ['Joe Mauer', 'Justin Morneau', 'Torii Hunter', 'David Ortiz', 'Johan Santana'], difficulty: 'green' },
      { theme: 'Won batting title (2010s–2020s)', players: ['Jose Altuve', 'DJ LeMahieu', 'Luis Arraez', 'Tim Anderson', 'Miguel Cabrera'], difficulty: 'blue' },
      { theme: 'Played college baseball at LSU', players: ['Alex Bregman', 'DJ LeMahieu', 'Aaron Nola', 'Kevin Gausman', 'Alex Lange'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-013',
    groups: [
      { theme: 'Multiple 100+ RBI seasons', players: ['Albert Pujols', 'Miguel Cabrera', 'Manny Ramirez', 'David Ortiz', 'Alex Rodriguez'], difficulty: 'yellow' },
      { theme: 'Played for the Tampa Bay Rays', players: ['Evan Longoria', 'Carl Crawford', 'David Price', 'Wander Franco', 'Blake Snell'], difficulty: 'green' },
      { theme: 'Second basemen (21st century stars)', players: ['Jose Altuve', 'Robinson Cano', 'Dustin Pedroia', 'Chase Utley', 'Ian Kinsler'], difficulty: 'blue' },
      { theme: 'Born in the Dominican Republic (pitchers)', players: ['Pedro Martinez', 'Bartolo Colon', 'Johnny Cueto', 'Luis Severino', 'Framber Valdez'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-014',
    groups: [
      { theme: 'Won World Series with multiple teams', players: ['Manny Ramirez', 'Johnny Damon', 'CC Sabathia', 'David Justice', 'Kenny Lofton'], difficulty: 'yellow' },
      { theme: 'Played for the San Diego Padres', players: ['Fernando Tatis Jr.', 'Manny Machado', 'Juan Soto', 'Jake Peavy', 'Trevor Hoffman'], difficulty: 'green' },
      { theme: 'Catchers who hit 30+ HR in a season', players: ['Mike Piazza', 'Gary Carter', 'Buster Posey', 'Salvador Perez', 'J.T. Realmuto'], difficulty: 'blue' },
      { theme: 'Played in the 2023 World Baseball Classic final', players: ['Shohei Ohtani', 'Mike Trout', 'Trea Turner', 'Yu Darvish', 'Lars Nootbaar'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-015',
    groups: [
      { theme: 'NL MVP winners (2015–2025)', players: ['Bryce Harper', 'Kris Bryant', 'Cody Bellinger', 'Freddie Freeman', 'Shohei Ohtani'], difficulty: 'yellow' },
      { theme: 'Played for the Detroit Tigers', players: ['Miguel Cabrera', 'Justin Verlander', 'Prince Fielder', 'Max Scherzer', 'Curtis Granderson'], difficulty: 'green' },
      { theme: 'Switch-hitting shortstops', players: ['Carlos Correa', 'Tim Anderson', 'Jose Reyes', 'Jimmy Rollins', 'Ozzie Smith'], difficulty: 'blue' },
      { theme: 'Went undrafted then became All-Stars', players: ['Jose Bautista', 'Justin Turner', 'Paul Goldschmidt', 'Max Muncy', 'J.D. Martinez'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-016',
    groups: [
      { theme: 'Signed $300M+ contracts', players: ['Juan Soto', 'Shohei Ohtani', 'Mike Trout', 'Bryce Harper', 'Mookie Betts'], difficulty: 'yellow' },
      { theme: 'Played for the New York Mets', players: ['Juan Soto', 'Francisco Lindor', 'Pete Alonso', 'Jacob deGrom', 'David Wright'], difficulty: 'green' },
      { theme: '2025 season 30+ HR hitters', players: ['Aaron Judge', 'Shohei Ohtani', 'Vladimir Guerrero Jr.', 'Juan Soto', 'Gunnar Henderson'], difficulty: 'blue' },
      { theme: 'Father-son MLB players', players: ['Vladimir Guerrero Jr.', 'Fernando Tatis Jr.', 'Ken Griffey Jr.', 'Prince Fielder', 'Cavan Biggio'], difficulty: 'purple' },
    ],
  },
];
