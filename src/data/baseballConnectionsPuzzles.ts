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
      { theme: 'Played for the Boston Red Sox', players: ['David Ortiz', 'Pedro Martinez', 'Mookie Betts', 'Ted Williams', 'Carl Yastrzemski'], difficulty: 'green' },
      { theme: 'Hit 500+ career home runs', players: ['Ken Griffey Jr.', 'Jim Thome', 'Sammy Sosa', 'Gary Sheffield', 'Manny Ramirez'], difficulty: 'blue' },
      { theme: 'Born in the Dominican Republic', players: ['Robinson Cano', 'Juan Soto', 'Vladimir Guerrero Jr.', 'Manny Machado', 'Fernando Tatis Jr.'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-002',
    groups: [
      { theme: 'Won Cy Young Award', players: ['Clayton Kershaw', 'Max Scherzer', 'Justin Verlander', 'Jacob deGrom', 'Corey Kluber'], difficulty: 'yellow' },
      { theme: 'Played for the New York Yankees', players: ['Derek Jeter', 'Mariano Rivera', 'Aaron Judge', 'Alex Rodriguez', 'CC Sabathia'], difficulty: 'green' },
      { theme: 'First overall draft pick', players: ['Bryce Harper', 'Ken Griffey Jr.', 'Chipper Jones', 'Adrian Gonzalez', 'Joe Mauer'], difficulty: 'blue' },
      { theme: 'Played in Japan before MLB', players: ['Ichiro Suzuki', 'Shohei Ohtani', 'Hideki Matsui', 'Yu Darvish', 'Masahiro Tanaka'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-003',
    groups: [
      { theme: 'World Series MVP winners', players: ['Madison Bumgarner', 'David Ortiz', 'Jorge Soler', 'Ben Zobrist', 'George Springer'], difficulty: 'yellow' },
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
      { theme: 'Threw a no-hitter', players: ['Nolan Ryan', 'Max Scherzer', 'Roy Halladay', 'Clayton Kershaw', 'Hideo Nomo'], difficulty: 'blue' },
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
      { theme: 'Undrafted players', players: ['Jose Bautista', 'Russell Martin', 'Oliver Perez', 'Bartolo Colon', 'Aroldis Chapman'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-008',
    groups: [
      { theme: 'Won back-to-back MVPs', players: ['Mike Trout', 'Albert Pujols', 'Barry Bonds', 'Frank Thomas', 'Dale Murphy'], difficulty: 'yellow' },
      { theme: 'Played for the Atlanta Braves', players: ['Chipper Jones', 'Freddie Freeman', 'Ronald Acuna Jr.', 'Greg Maddux', 'John Smoltz'], difficulty: 'green' },
      { theme: 'Hall of Fame shortstops', players: ['Cal Ripken Jr.', 'Ozzie Smith', 'Derek Jeter', 'Barry Larkin', 'Alan Trammell'], difficulty: 'blue' },
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
      { theme: 'Played for the Texas Rangers', players: ['Michael Young', 'Yu Darvish', 'Corey Seager', 'Max Scherzer', 'Alex Rodriguez'], difficulty: 'green' },
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
      { theme: 'Won batting title (2010s–2020s)', players: ['Jose Altuve', 'Charlie Blackmon', 'Luis Arraez', 'Tim Anderson', 'Miguel Cabrera'], difficulty: 'blue' },
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
      { theme: 'Born in Japan', players: ['Shohei Ohtani', 'Ichiro Suzuki', 'Hideki Matsui', 'Hideo Nomo', 'Koji Uehara'], difficulty: 'yellow' },
      { theme: 'Born in Puerto Rico', players: ['Francisco Lindor', 'Carlos Correa', 'Ivan Rodriguez', 'Bernie Williams', 'Roberto Alomar'], difficulty: 'green' },
      { theme: 'Born in Venezuela', players: ['Jose Altuve', 'Salvador Perez', 'Ronald Acuna Jr.', 'Miguel Cabrera', 'Luis Arraez'], difficulty: 'blue' },
      { theme: 'Father-son MLB players', players: ['Vladimir Guerrero Jr.', 'Fernando Tatis Jr.', 'Ken Griffey Jr.', 'Prince Fielder', 'Cavan Biggio'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-017',
    groups: [
      { theme: 'Born in Japan', players: ['Ichiro Suzuki', 'Hideki Matsui', 'Hideo Nomo', 'Yu Darvish', 'Daisuke Matsuzaka'], difficulty: 'yellow' },
      { theme: 'Born in Puerto Rico', players: ['Roberto Clemente', 'Ivan Rodriguez', 'Carlos Beltran', 'Yadier Molina', 'Bernie Williams'], difficulty: 'green' },
      { theme: 'Born in Venezuela', players: ['Miguel Cabrera', 'Felix Hernandez', 'Omar Vizquel', 'Johan Santana', 'Bobby Abreu'], difficulty: 'blue' },
      { theme: 'Born in the Dominican Republic', players: ['Pedro Martinez', 'Vladimir Guerrero', 'Adrian Beltre', 'Juan Marichal', 'Sammy Sosa'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-018',
    groups: [
      { theme: 'Hall of Fame catchers', players: ['Johnny Bench', 'Yogi Berra', 'Carlton Fisk', 'Gary Carter', 'Mike Piazza'], difficulty: 'yellow' },
      { theme: 'Hall of Fame shortstops', players: ['Cal Ripken Jr.', 'Ozzie Smith', 'Derek Jeter', 'Barry Larkin', 'Ernie Banks'], difficulty: 'green' },
      { theme: 'Hall of Fame third basemen', players: ['Mike Schmidt', 'George Brett', 'Wade Boggs', 'Brooks Robinson', 'Chipper Jones'], difficulty: 'blue' },
      { theme: 'Hall of Fame second basemen', players: ['Joe Morgan', 'Ryne Sandberg', 'Jackie Robinson', 'Bill Mazeroski', 'Roberto Alomar'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-019',
    groups: [
      { theme: 'New York Yankees legends', players: ['Babe Ruth', 'Lou Gehrig', 'Mickey Mantle', 'Joe DiMaggio', 'Derek Jeter'], difficulty: 'yellow' },
      { theme: 'St. Louis Cardinals legends', players: ['Stan Musial', 'Bob Gibson', 'Ozzie Smith', 'Albert Pujols', 'Yadier Molina'], difficulty: 'green' },
      { theme: 'Boston Red Sox legends', players: ['Ted Williams', 'Carl Yastrzemski', 'David Ortiz', 'Pedro Martinez', 'Carlton Fisk'], difficulty: 'blue' },
      { theme: 'San Francisco Giants legends', players: ['Willie Mays', 'Barry Bonds', 'Willie McCovey', 'Buster Posey', 'Juan Marichal'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-020',
    groups: [
      { theme: 'Born in Cuba', players: ['Jose Abreu', 'Aroldis Chapman', 'Jose Canseco', 'Rafael Palmeiro', 'Tony Perez'], difficulty: 'yellow' },
      { theme: 'Born in Mexico', players: ['Fernando Valenzuela', 'Vinny Castilla', 'Adrian Gonzalez', 'Joakim Soria', 'Julio Urias'], difficulty: 'green' },
      { theme: 'Born in the Dominican Republic', players: ['David Ortiz', 'Robinson Cano', 'Manny Ramirez', 'Bartolo Colon', 'Jose Bautista'], difficulty: 'blue' },
      { theme: 'Born in Venezuela', players: ['Jose Altuve', 'Salvador Perez', 'Ronald Acuna Jr.', 'Andres Galarraga', 'Pablo Sandoval'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-021',
    groups: [
      { theme: 'Los Angeles Dodgers legends', players: ['Sandy Koufax', 'Clayton Kershaw', 'Jackie Robinson', 'Don Drysdale', 'Fernando Valenzuela'], difficulty: 'yellow' },
      { theme: 'Chicago Cubs legends', players: ['Ernie Banks', 'Ron Santo', 'Ryne Sandberg', 'Sammy Sosa', 'Billy Williams'], difficulty: 'green' },
      { theme: 'Detroit Tigers legends', players: ['Ty Cobb', 'Al Kaline', 'Miguel Cabrera', 'Alan Trammell', 'Justin Verlander'], difficulty: 'blue' },
      { theme: 'Cincinnati Reds legends', players: ['Johnny Bench', 'Pete Rose', 'Joe Morgan', 'Barry Larkin', 'Tony Perez'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-022',
    groups: [
      { theme: 'Hall of Fame first basemen', players: ['Lou Gehrig', 'Jeff Bagwell', 'Eddie Murray', 'Willie McCovey', 'Frank Thomas'], difficulty: 'yellow' },
      { theme: 'Hall of Fame relief pitchers', players: ['Mariano Rivera', 'Trevor Hoffman', 'Dennis Eckersley', 'Rollie Fingers', 'Goose Gossage'], difficulty: 'green' },
      { theme: 'Hall of Fame center fielders', players: ['Willie Mays', 'Ken Griffey Jr.', 'Mickey Mantle', 'Joe DiMaggio', 'Ty Cobb'], difficulty: 'blue' },
      { theme: 'Hall of Fame left-handed starting pitchers', players: ['Sandy Koufax', 'Steve Carlton', 'Warren Spahn', 'Randy Johnson', 'Tom Glavine'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-023',
    groups: [
      { theme: 'Born in Japan', players: ['Shohei Ohtani', 'Masahiro Tanaka', 'Kenta Maeda', 'Kodai Senga', 'Koji Uehara'], difficulty: 'yellow' },
      { theme: 'Born in Puerto Rico', players: ['Francisco Lindor', 'Carlos Correa', 'Javier Baez', 'Roberto Alomar', 'Ivan Rodriguez'], difficulty: 'green' },
      { theme: 'Born in Venezuela', players: ['Carlos Gonzalez', 'Elvis Andrus', 'Carlos Carrasco', 'Martin Prado', 'Asdrubal Cabrera'], difficulty: 'blue' },
      { theme: 'Born in Curacao', players: ['Andruw Jones', 'Andrelton Simmons', 'Kenley Jansen', 'Jurickson Profar', 'Ozzie Albies'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-024',
    groups: [
      { theme: 'Atlanta Braves legends', players: ['Hank Aaron', 'Chipper Jones', 'Greg Maddux', 'Tom Glavine', 'John Smoltz'], difficulty: 'yellow' },
      { theme: 'Baltimore Orioles legends', players: ['Cal Ripken Jr.', 'Brooks Robinson', 'Jim Palmer', 'Eddie Murray', 'Frank Robinson'], difficulty: 'green' },
      { theme: 'Philadelphia Phillies legends', players: ['Mike Schmidt', 'Steve Carlton', 'Ryan Howard', 'Chase Utley', 'Robin Roberts'], difficulty: 'blue' },
      { theme: 'Pittsburgh Pirates legends', players: ['Roberto Clemente', 'Willie Stargell', 'Honus Wagner', 'Barry Bonds', 'Ralph Kiner'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-025',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Juan Soto', 'Rafael Devers', 'Jose Ramirez', 'Julio Rodriguez', 'Starling Marte'], difficulty: 'yellow' },
      { theme: 'Born in Venezuela', players: ['Gleyber Torres', 'Eugenio Suarez', 'Luis Arraez', 'Willson Contreras', 'Anthony Santander'], difficulty: 'green' },
      { theme: 'Born in Cuba', players: ['Yordan Alvarez', 'Randy Arozarena', 'Luis Robert', 'Yoenis Cespedes', 'Jorge Soler'], difficulty: 'blue' },
      { theme: 'Born in Panama', players: ['Mariano Rivera', 'Rod Carew', 'Carlos Lee', 'Manny Sanguillen', 'Ruben Tejada'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-026',
    groups: [
      { theme: 'Seattle Mariners legends', players: ['Ken Griffey Jr.', 'Edgar Martinez', 'Ichiro Suzuki', 'Felix Hernandez', 'Jay Buhner'], difficulty: 'yellow' },
      { theme: 'Houston Astros legends', players: ['Jeff Bagwell', 'Craig Biggio', 'Jose Altuve', 'Roy Oswalt', 'Lance Berkman'], difficulty: 'green' },
      { theme: 'San Diego Padres legends', players: ['Tony Gwynn', 'Trevor Hoffman', 'Dave Winfield', 'Jake Peavy', 'Randy Jones'], difficulty: 'blue' },
      { theme: 'Minnesota Twins legends', players: ['Rod Carew', 'Kirby Puckett', 'Harmon Killebrew', 'Joe Mauer', 'Johan Santana'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-027',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Nelson Cruz', 'Edwin Encarnacion', 'Hanley Ramirez', 'Aramis Ramirez', 'Melky Cabrera'], difficulty: 'yellow' },
      { theme: 'Born in Puerto Rico', players: ['Carlos Delgado', 'Juan Gonzalez', 'Bernie Williams', 'Jorge Posada', 'Carlos Correa'], difficulty: 'green' },
      { theme: 'Born in Venezuela', players: ['Magglio Ordonez', 'Victor Martinez', 'Carlos Gonzalez', 'Endy Chavez', 'Freddy Garcia'], difficulty: 'blue' },
      { theme: 'Born in Colombia', players: ['Edgar Renteria', 'Orlando Cabrera', 'Julio Teheran', 'Jose Quintana', 'Giovanny Urshela'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-028',
    groups: [
      { theme: 'Hall of Fame right fielders', players: ['Hank Aaron', 'Roberto Clemente', 'Frank Robinson', 'Reggie Jackson', 'Tony Gwynn'], difficulty: 'yellow' },
      { theme: 'Hall of Fame left fielders', players: ['Ted Williams', 'Stan Musial', 'Rickey Henderson', 'Carl Yastrzemski', 'Billy Williams'], difficulty: 'green' },
      { theme: 'Hall of Fame first basemen', players: ['Jeff Bagwell', 'Eddie Murray', 'Willie McCovey', 'Frank Thomas', 'Tony Perez'], difficulty: 'blue' },
      { theme: 'Hall of Fame starting pitchers', players: ['Nolan Ryan', 'Bob Gibson', 'Pedro Martinez', 'Greg Maddux', 'Tom Seaver'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-029',
    groups: [
      { theme: 'Oakland Athletics legends', players: ['Rickey Henderson', 'Reggie Jackson', 'Rollie Fingers', 'Mark McGwire', 'Dennis Eckersley'], difficulty: 'yellow' },
      { theme: 'Kansas City Royals legends', players: ['George Brett', 'Bret Saberhagen', 'Frank White', 'Salvador Perez', 'Zack Greinke'], difficulty: 'green' },
      { theme: 'Milwaukee Brewers legends', players: ['Robin Yount', 'Paul Molitor', 'Ryan Braun', 'Prince Fielder', 'Cecil Cooper'], difficulty: 'blue' },
      { theme: 'Cleveland Guardians legends', players: ['Bob Feller', 'Jim Thome', 'Omar Vizquel', 'Kenny Lofton', 'Manny Ramirez'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-030',
    groups: [
      { theme: 'Born in Japan', players: ['Hideki Matsui', 'Hideo Nomo', 'Kenta Maeda', 'Koji Uehara', 'Kazuo Matsui'], difficulty: 'yellow' },
      { theme: 'Born in South Korea', players: ['Chan Ho Park', 'Hyun-Jin Ryu', 'Shin-Soo Choo', 'Jung Hoo Lee', 'Ha-Seong Kim'], difficulty: 'green' },
      { theme: 'Born in Cuba', players: ['Minnie Minoso', 'Tony Oliva', 'Luis Tiant', 'Jose Contreras', 'Kendrys Morales'], difficulty: 'blue' },
      { theme: 'Born in the Dominican Republic', players: ['George Bell', 'Tony Fernandez', 'Pedro Guerrero', 'Cesar Cedeno', 'Julio Franco'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-031',
    groups: [
      { theme: 'Texas Rangers legends', players: ['Ivan Rodriguez', 'Juan Gonzalez', 'Adrian Beltre', 'Michael Young', 'Nolan Ryan'], difficulty: 'yellow' },
      { theme: 'Toronto Blue Jays legends', players: ['Roy Halladay', 'Carlos Delgado', 'Joe Carter', 'Roberto Alomar', 'Vladimir Guerrero Jr.'], difficulty: 'green' },
      { theme: 'New York Mets legends', players: ['Tom Seaver', 'David Wright', 'Mike Piazza', 'Dwight Gooden', 'Jacob deGrom'], difficulty: 'blue' },
      { theme: 'Montreal Expos / Washington Nationals legends', players: ['Andre Dawson', 'Tim Raines', 'Ryan Zimmerman', 'Max Scherzer', 'Vladimir Guerrero'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-032',
    groups: [
      { theme: 'Los Angeles Angels legends', players: ['Mike Trout', 'Nolan Ryan', 'Tim Salmon', 'Garret Anderson', 'Chuck Finley'], difficulty: 'yellow' },
      { theme: 'Colorado Rockies legends', players: ['Todd Helton', 'Larry Walker', 'Nolan Arenado', 'Troy Tulowitzki', 'Charlie Blackmon'], difficulty: 'green' },
      { theme: 'Arizona Diamondbacks legends', players: ['Randy Johnson', 'Luis Gonzalez', 'Paul Goldschmidt', 'Curt Schilling', 'Brandon Webb'], difficulty: 'blue' },
      { theme: 'Tampa Bay Rays legends', players: ['Evan Longoria', 'Carl Crawford', 'David Price', 'Ben Zobrist', 'Kevin Kiermaier'], difficulty: 'purple' },
    ],
  },
];
