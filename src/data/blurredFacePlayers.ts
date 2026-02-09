import { BlurredFacePlayer } from '@/types/blurredFace';

export const blurredFacePlayers: BlurredFacePlayer[] = [
  // Current Superstars
  { name: "Lionel Messi", wikipediaSlug: "Lionel_Messi", nationality: "Argentina", position: "RW", club: "Inter Miami", age: 38, kitNumber: 10, isActive: true, league: "MLS" },
  { name: "Cristiano Ronaldo", wikipediaSlug: "Cristiano_Ronaldo", nationality: "Portugal", position: "ST", club: "Al-Nassr", age: 41, kitNumber: 7, isActive: true, league: "Saudi Pro League" },
  { name: "Kylian Mbappé", wikipediaSlug: "Kylian_Mbappé", nationality: "France", position: "ST", club: "Real Madrid", age: 27, kitNumber: 9, isActive: true, league: "La Liga" },
  { name: "Erling Haaland", wikipediaSlug: "Erling_Haaland", nationality: "Norway", position: "ST", club: "Manchester City", age: 26, kitNumber: 9, isActive: true, league: "Premier League" },
  { name: "Mohamed Salah", wikipediaSlug: "Mohamed_Salah", nationality: "Egypt", position: "RW", club: "Liverpool", age: 34, kitNumber: 11, isActive: true, league: "Premier League" },
  { name: "Neymar", wikipediaSlug: "Neymar", nationality: "Brazil", position: "LW", club: "Santos", age: 34, kitNumber: 10, isActive: true, league: "Brazilian Série A" },
  { name: "Vinícius Júnior", wikipediaSlug: "Vinícius_Júnior", nationality: "Brazil", position: "LW", club: "Real Madrid", age: 26, kitNumber: 7, isActive: true, league: "La Liga" },
  { name: "Lamine Yamal", wikipediaSlug: "Lamine_Yamal", nationality: "Spain", position: "RW", club: "Barcelona", age: 18, kitNumber: 19, isActive: true, league: "La Liga" },
  { name: "Jude Bellingham", wikipediaSlug: "Jude_Bellingham", nationality: "England", position: "CAM", club: "Real Madrid", age: 22, kitNumber: 5, isActive: true, league: "La Liga" },
  { name: "Robert Lewandowski", wikipediaSlug: "Robert_Lewandowski", nationality: "Poland", position: "ST", club: "Barcelona", age: 38, kitNumber: 9, isActive: true, league: "La Liga" },
  { name: "Kevin De Bruyne", wikipediaSlug: "Kevin_De_Bruyne", nationality: "Belgium", position: "CAM", club: "Manchester City", age: 35, kitNumber: 17, isActive: true, league: "Premier League" },
  { name: "Harry Kane", wikipediaSlug: "Harry_Kane", nationality: "England", position: "ST", club: "Bayern Munich", age: 33, kitNumber: 9, isActive: true, league: "Bundesliga" },
  { name: "Bukayo Saka", wikipediaSlug: "Bukayo_Saka", nationality: "England", position: "RW", club: "Arsenal", age: 24, kitNumber: 7, isActive: true, league: "Premier League" },
  { name: "Cole Palmer", wikipediaSlug: "Cole_Palmer", nationality: "England", position: "CAM", club: "Chelsea", age: 24, kitNumber: 20, isActive: true, league: "Premier League" },
  { name: "Florian Wirtz", wikipediaSlug: "Florian_Wirtz", nationality: "Germany", position: "CAM", club: "Bayer Leverkusen", age: 23, kitNumber: 10, isActive: true, league: "Bundesliga" },

  // Legends (Retired)
  { name: "Zinedine Zidane", wikipediaSlug: "Zinedine_Zidane", nationality: "France", position: "CAM", club: "Real Madrid", age: 53, kitNumber: 5, isActive: false, league: "La Liga" },
  { name: "Ronaldinho", wikipediaSlug: "Ronaldinho", nationality: "Brazil", position: "CAM", club: "Barcelona", age: 46, kitNumber: 10, isActive: false, league: "La Liga" },
  { name: "Thierry Henry", wikipediaSlug: "Thierry_Henry", nationality: "France", position: "ST", club: "Arsenal", age: 49, kitNumber: 14, isActive: false, league: "Premier League" },
  { name: "Ronaldo", wikipediaSlug: "Ronaldo_(Brazilian_footballer)", nationality: "Brazil", position: "ST", club: "Real Madrid", age: 49, kitNumber: 9, isActive: false, league: "La Liga" },
  { name: "David Beckham", wikipediaSlug: "David_Beckham", nationality: "England", position: "RM", club: "Manchester United", age: 51, kitNumber: 7, isActive: false, league: "Premier League" },
  { name: "Zlatan Ibrahimović", wikipediaSlug: "Zlatan_Ibrahimović", nationality: "Sweden", position: "ST", club: "AC Milan", age: 44, kitNumber: 11, isActive: false, league: "Serie A" },
  { name: "Andrea Pirlo", wikipediaSlug: "Andrea_Pirlo", nationality: "Italy", position: "CM", club: "Juventus", age: 47, kitNumber: 21, isActive: false, league: "Serie A" },
  { name: "Wayne Rooney", wikipediaSlug: "Wayne_Rooney", nationality: "England", position: "ST", club: "Manchester United", age: 40, kitNumber: 10, isActive: false, league: "Premier League" },
  { name: "Kaká", wikipediaSlug: "Kaká", nationality: "Brazil", position: "CAM", club: "AC Milan", age: 44, kitNumber: 22, isActive: false, league: "Serie A" },
  { name: "Didier Drogba", wikipediaSlug: "Didier_Drogba", nationality: "Ivory Coast", position: "ST", club: "Chelsea", age: 48, kitNumber: 11, isActive: false, league: "Premier League" },
  { name: "Pelé", wikipediaSlug: "Pelé", nationality: "Brazil", position: "ST", club: "Santos", age: 0, kitNumber: 10, isActive: false, league: "Brazilian Série A" },
  { name: "Diego Maradona", wikipediaSlug: "Diego_Maradona", nationality: "Argentina", position: "CAM", club: "Napoli", age: 0, kitNumber: 10, isActive: false, league: "Serie A" },
  { name: "Xavi", wikipediaSlug: "Xavi", nationality: "Spain", position: "CM", club: "Barcelona", age: 46, kitNumber: 6, isActive: false, league: "La Liga" },
  { name: "Andrés Iniesta", wikipediaSlug: "Andrés_Iniesta", nationality: "Spain", position: "CM", club: "Barcelona", age: 42, kitNumber: 8, isActive: false, league: "La Liga" },
  { name: "Paolo Maldini", wikipediaSlug: "Paolo_Maldini", nationality: "Italy", position: "CB", club: "AC Milan", age: 58, kitNumber: 3, isActive: false, league: "Serie A" },
];

// Large list of player names for search autocomplete
export const allPlayerNames: string[] = [
  // From blurred face players
  ...blurredFacePlayers.map(p => p.name),
  // Additional well-known players for autocomplete noise
  "Son Heung-min", "Bruno Fernandes", "Declan Rice", "Phil Foden", "Alexander Isak",
  "Virgil van Dijk", "Martin Ødegaard", "William Saliba", "Rodri", "Ollie Watkins",
  "Viktor Gyökeres", "Estêvão", "Trent Alexander-Arnold", "Pedri", "Raphinha",
  "Antoine Griezmann", "Federico Valverde", "Lautaro Martínez", "Rafael Leão",
  "Dušan Vlahović", "Marcus Thuram", "Jamal Musiala", "Ousmane Dembélé",
  "Bradley Barcola", "Khvicha Kvaratskhelia", "Achraf Hakimi", "Julián Álvarez",
  "Gianluigi Donnarumma", "Nicolò Barella", "Sadio Mané", "Luis Suárez",
  "Luka Modrić", "Toni Kroos", "Sergio Ramos", "Gerard Piqué", "Iker Casillas",
  "Gianluigi Buffon", "Steven Gerrard", "Frank Lampard", "Patrick Vieira",
  "Dennis Bergkamp", "Eric Cantona", "Alessandro Del Piero", "Francesco Totti",
  "Raúl", "Samuel Eto'o", "Carles Puyol", "Philipp Lahm", "Miroslav Klose",
  "Fernando Torres", "Robin van Persie", "Arjen Robben", "Franck Ribéry",
  "Sergio Agüero", "Edinson Cavani", "Pierre-Emerick Aubameyang", "Eden Hazard",
  "Gareth Bale", "Alexis Sánchez", "Mesut Özil", "Angel Di María", "James Rodríguez",
  "Paul Pogba", "N'Golo Kanté", "Raheem Sterling", "Manuel Neuer", "Marc-André ter Stegen",
  "Alisson", "Thibaut Courtois", "Jan Oblak",
].filter((name, index, self) => self.indexOf(name) === index).sort();
