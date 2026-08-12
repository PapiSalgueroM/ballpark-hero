export interface TransferPathPuzzle {
  id: string;
  playerA: string;
  playerB: string;
  minSteps: number;
  oneOptimalPath?: string[];
  hint: string;
}

const transferPathPuzzles: TransferPathPuzzle[] = [
  // 1-step (direct, share a club)
  {
    id: 'tp-1', playerA: 'Zlatan Ibrahimović', playerB: 'Wayne Rooney', minSteps: 1,
    oneOptimalPath: ['Zlatan Ibrahimović', 'Wayne Rooney'],
    hint: 'They were teammates at a huge English club.',
  },
  {
    id: 'tp-2', playerA: 'Lionel Messi', playerB: 'Neymar', minSteps: 1,
    oneOptimalPath: ['Lionel Messi', 'Neymar'],
    hint: 'They played together at two different clubs.',
  },
  {
    id: 'tp-3', playerA: 'Andrea Pirlo', playerB: 'Cristiano Ronaldo', minSteps: 1,
    oneOptimalPath: ['Andrea Pirlo', 'Cristiano Ronaldo'],
    hint: 'Both played for the Old Lady.',
  },
  {
    id: 'tp-4', playerA: 'Fernando Torres', playerB: 'Didier Drogba', minSteps: 1,
    oneOptimalPath: ['Fernando Torres', 'Didier Drogba'],
    hint: 'Think London blues.',
  },

  // 2-step paths
  {
    id: 'tp-5', playerA: 'Steven Gerrard', playerB: 'Cristiano Ronaldo', minSteps: 2,
    oneOptimalPath: ['Steven Gerrard', 'Fernando Torres', 'Cristiano Ronaldo'],
    hint: 'A Spanish striker connects them via Liverpool and a Madrid club.',
  },
  {
    id: 'tp-6', playerA: 'Frank Lampard', playerB: 'Lionel Messi', minSteps: 2,
    oneOptimalPath: ['Frank Lampard', 'Cesc Fàbregas', 'Lionel Messi'],
    hint: 'A Spanish midfielder played in both London and Catalonia.',
  },
  {
    id: 'tp-7', playerA: 'Gareth Bale', playerB: 'Robert Lewandowski', minSteps: 2,
    oneOptimalPath: ['Gareth Bale', 'Luka Modrić', 'Robert Lewandowski'],
    hint: 'A Croatian maestro connects them through Madrid.',
  },
  {
    id: 'tp-8', playerA: 'Wayne Rooney', playerB: 'Kylian Mbappé', minSteps: 2,
    oneOptimalPath: ['Wayne Rooney', 'Angel Di María', 'Kylian Mbappé'],
    hint: 'An Argentine winger links Manchester to Paris.',
  },
  {
    id: 'tp-9', playerA: 'Samuel Eto\'o', playerB: 'Sergio Ramos', minSteps: 2,
    oneOptimalPath: ['Samuel Eto\'o', 'Lionel Messi', 'Sergio Ramos'],
    hint: 'The GOAT connects them: Barcelona then Paris.',
  },
  {
    id: 'tp-10', playerA: 'Didier Drogba', playerB: 'Neymar', minSteps: 2,
    oneOptimalPath: ['Didier Drogba', 'Samuel Eto\'o', 'Neymar'],
    hint: 'A Cameroonian legend bridges Chelsea to Barcelona.',
  },
  {
    id: 'tp-11', playerA: 'Luis Suárez', playerB: 'Eden Hazard', minSteps: 2,
    oneOptimalPath: ['Luis Suárez', 'Antoine Griezmann', 'Eden Hazard'],
    hint: 'An Atlético/Barça connection, via a French striker.',
  },
  {
    id: 'tp-12', playerA: 'Arjen Robben', playerB: 'Paul Pogba', minSteps: 2,
    oneOptimalPath: ['Arjen Robben', 'Arturo Vidal', 'Paul Pogba'],
    hint: 'A Chilean midfielder links Bayern to Juventus.',
  },
  {
    id: 'tp-13', playerA: 'Son Heung-min', playerB: 'Karim Benzema', minSteps: 2,
    oneOptimalPath: ['Son Heung-min', 'Gareth Bale', 'Karim Benzema'],
    hint: 'A Welsh speedster connects North London to the Bernabéu.',
  },
  {
    id: 'tp-14', playerA: 'Mohamed Salah', playerB: 'Zlatan Ibrahimović', minSteps: 2,
    oneOptimalPath: ['Mohamed Salah', 'Roberto Firmino', 'Zlatan Ibrahimović'],
    hint: 'Think about who else played at Liverpool and then crossed paths with the Swede.',
  },

  // 3-step paths
  {
    id: 'tp-15', playerA: 'Steven Gerrard', playerB: 'Erling Haaland', minSteps: 3,
    oneOptimalPath: ['Steven Gerrard', 'Luis Suárez', 'Robert Lewandowski', 'Erling Haaland'],
    hint: 'Liverpool → Barcelona → Bayern/Dortmund route.',
  },
  {
    id: 'tp-16', playerA: 'Frank Lampard', playerB: 'Vinícius Júnior', minSteps: 3,
    oneOptimalPath: ['Frank Lampard', 'Eden Hazard', 'Karim Benzema', 'Vinícius Júnior'],
    hint: 'Chelsea → Real Madrid → the current generation.',
  },
  {
    id: 'tp-17', playerA: 'Gianluigi Buffon', playerB: 'Mohamed Salah', minSteps: 3,
    oneOptimalPath: ['Gianluigi Buffon', 'Paul Pogba', 'Romelu Lukaku', 'Mohamed Salah'],
    hint: 'Juventus → Manchester United → Inter/Chelsea → Liverpool route.',
  },
  {
    id: 'tp-18', playerA: 'Didier Drogba', playerB: 'Jude Bellingham', minSteps: 3,
    oneOptimalPath: ['Didier Drogba', 'Eden Hazard', 'Toni Kroos', 'Jude Bellingham'],
    hint: 'Chelsea → Real Madrid, through a German and Belgian.',
  },
  {
    id: 'tp-19', playerA: 'Yaya Touré', playerB: 'Lamine Yamal', minSteps: 3,
    oneOptimalPath: ['Yaya Touré', 'Sergio Agüero', 'Lionel Messi', 'Lamine Yamal'],
    hint: 'Manchester City → Barcelona via an Argentine legend.',
  },
  {
    id: 'tp-20', playerA: 'Franck Ribéry', playerB: 'Harry Kane', minSteps: 3,
    oneOptimalPath: ['Franck Ribéry', 'Thomas Müller', 'Robert Lewandowski', 'Harry Kane'],
    hint: 'Bayern Munich connects them across generations.',
  },
];

export default transferPathPuzzles;
