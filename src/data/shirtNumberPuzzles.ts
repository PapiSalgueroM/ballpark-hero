export interface ShirtNumberPuzzle {
  playerName: string;
  club: string;
  league: string;
  nationality: string;
  kitNumber: number;
  funFact: string;
}

const shirtNumberPuzzles: ShirtNumberPuzzle[] = [
  { playerName: 'Lionel Messi', club: 'Inter Miami', league: 'MLS', nationality: '🇦🇷', kitNumber: 10, funFact: 'The iconic #10, worn by Maradona, Pelé, and the GOAT himself.' },
  { playerName: 'Cristiano Ronaldo', club: 'Al Nassr', league: 'Saudi Pro League', nationality: '🇵🇹', kitNumber: 7, funFact: 'CR7: the brand built around a shirt number.' },
  { playerName: 'Erling Haaland', club: 'Manchester City', league: 'Premier League', nationality: '🇳🇴', kitNumber: 9, funFact: 'The classic centre-forward number for a goal machine.' },
  { playerName: 'Kylian Mbappé', club: 'Real Madrid', league: 'La Liga', nationality: '🇫🇷', kitNumber: 9, funFact: 'Took #9 at Madrid, the number once worn by Ronaldo Nazário.' },
  { playerName: 'Vinicius Jr.', club: 'Real Madrid', league: 'La Liga', nationality: '🇧🇷', kitNumber: 7, funFact: 'Inherited the legendary #7 at the Bernabéu from Cristiano Ronaldo.' },
  { playerName: 'Jude Bellingham', club: 'Real Madrid', league: 'La Liga', nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', kitNumber: 5, funFact: 'Chose #5 in honour of Zinedine Zidane at Real Madrid.' },
  { playerName: 'Mohamed Salah', club: 'Liverpool', league: 'Premier League', nationality: '🇪🇬', kitNumber: 11, funFact: 'The Egyptian King has made #11 iconic at Anfield.' },
  { playerName: 'Kevin De Bruyne', club: 'Manchester City', league: 'Premier League', nationality: '🇧🇪', kitNumber: 17, funFact: 'An unusual number for a star midfielder, but KDB made it his own.' },
  { playerName: 'Bukayo Saka', club: 'Arsenal', league: 'Premier League', nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', kitNumber: 7, funFact: 'Took the legendary #7 shirt at Arsenal aged just 21.' },
  { playerName: 'Lamine Yamal', club: 'Barcelona', league: 'La Liga', nationality: '🇪🇸', kitNumber: 19, funFact: 'The teenage wonderkid burst onto the scene wearing #19.' },
  { playerName: 'Pedri', club: 'Barcelona', league: 'La Liga', nationality: '🇪🇸', kitNumber: 8, funFact: 'Wears the #8 previously held by Barça legend Andrés Iniesta.' },
  { playerName: 'Gavi', club: 'Barcelona', league: 'La Liga', nationality: '🇪🇸', kitNumber: 6, funFact: '#6: the number of Xavi Hernández, a fitting successor.' },
  { playerName: 'Virgil van Dijk', club: 'Liverpool', league: 'Premier League', nationality: '🇳🇱', kitNumber: 4, funFact: 'The commanding #4, a classic centre-back number.' },
  { playerName: 'Rodri', club: 'Manchester City', league: 'Premier League', nationality: '🇪🇸', kitNumber: 16, funFact: 'The 2024 Ballon d\'Or winner rocks #16 in midfield.' },
  { playerName: 'Phil Foden', club: 'Manchester City', league: 'Premier League', nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', kitNumber: 47, funFact: '#47: kept his academy number as a tribute to his roots.' },
  { playerName: 'Declan Rice', club: 'Arsenal', league: 'Premier League', nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', kitNumber: 41, funFact: 'Chose #41 at Arsenal, his childhood house number.' },
  { playerName: 'Martin Ødegaard', club: 'Arsenal', league: 'Premier League', nationality: '🇳🇴', kitNumber: 8, funFact: 'The Arsenal captain wears the classic #8 playmaker shirt.' },
  { playerName: 'Robert Lewandowski', club: 'Barcelona', league: 'La Liga', nationality: '🇵🇱', kitNumber: 9, funFact: 'The prolific #9, carried this number across Bayern and Barça.' },
  { playerName: 'Neymar Jr.', club: 'Santos', league: 'Brazilian Série A', nationality: '🇧🇷', kitNumber: 10, funFact: 'Back to where it all started, wearing the famous #10.' },
  { playerName: 'Son Heung-min', club: 'Tottenham', league: 'Premier League', nationality: '🇰🇷', kitNumber: 7, funFact: 'The Spurs talisman proudly wears the captain\'s #7.' },
  { playerName: 'Bruno Fernandes', club: 'Manchester United', league: 'Premier League', nationality: '🇵🇹', kitNumber: 8, funFact: 'Switched from #18 to the iconic #8 at Old Trafford.' },
  { playerName: 'Thibaut Courtois', club: 'Real Madrid', league: 'La Liga', nationality: '🇧🇪', kitNumber: 1, funFact: 'The #1 goalkeeper: the ultimate number for a shot-stopper.' },
  { playerName: 'Alisson Becker', club: 'Liverpool', league: 'Premier League', nationality: '🇧🇷', kitNumber: 1, funFact: '#1 for the best goalkeeper in the Premier League.' },
  { playerName: 'Florian Wirtz', club: 'Bayer Leverkusen', league: 'Bundesliga', nationality: '🇩🇪', kitNumber: 10, funFact: 'Germany\'s next great #10, leading the charge at Leverkusen.' },
  { playerName: 'Jamal Musiala', club: 'Bayern Munich', league: 'Bundesliga', nationality: '🇩🇪', kitNumber: 42, funFact: 'Kept his academy #42, the answer to everything, apparently.' },
  { playerName: 'Cole Palmer', club: 'Chelsea', league: 'Premier League', nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', kitNumber: 20, funFact: 'Cold Palmer wears #20 at Stamford Bridge.' },
  { playerName: 'Dani Olmo', club: 'Barcelona', league: 'La Liga', nationality: '🇪🇸', kitNumber: 20, funFact: 'Euro 2024 Golden Ball winner wearing #20 at Camp Nou.' },
  { playerName: 'William Saliba', club: 'Arsenal', league: 'Premier League', nationality: '🇫🇷', kitNumber: 2, funFact: '#2: an unusual pick for a centre-back, but Saliba owns it.' },
  { playerName: 'Trent Alexander-Arnold', club: 'Liverpool', league: 'Premier League', nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', kitNumber: 66, funFact: '#66: kept his academy number and made it world-famous.' },
  { playerName: 'Federico Valverde', club: 'Real Madrid', league: 'La Liga', nationality: '🇺🇾', kitNumber: 8, funFact: 'The engine of Madrid\'s midfield in the classic #8.' },
  { playerName: 'Khvicha Kvaratskhelia', club: 'PSG', league: 'Ligue 1', nationality: '🇬🇪', kitNumber: 7, funFact: 'Kvara took the prestigious #7 at Paris Saint-Germain.' },
  { playerName: 'Alejandro Garnacho', club: 'Manchester United', league: 'Premier League', nationality: '🇦🇷', kitNumber: 17, funFact: '#17: following in the footsteps of Nani at Old Trafford.' },
];

export default shirtNumberPuzzles;
