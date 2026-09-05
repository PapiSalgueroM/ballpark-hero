/** A pair's minimum and hint under one rule, with the path they were read from. */
export interface TransferPathRuleHint {
  minSteps: number;
  oneOptimalPath?: string[];
  hint: string;
}

export interface TransferPathPuzzle {
  id: string;
  playerA: string;
  playerB: string;
  minSteps: number;
  oneOptimalPath?: string[];
  hint: string;
  /** Round 460: the same pair under each special rule (src/lib/transferPathModes.ts),
   *  null where the rule leaves no path. Optional only so a puzzle built by hand in a
   *  test can leave them out; this file and the fetcher always set both, and a missing
   *  entry reads as no path, never as a path. */
  active?: TransferPathRuleHint | null;
  europe?: TransferPathRuleHint | null;
}

/**
 * The fallback pool, served only when transfer_path_puzzles cannot be read.
 * Round 294: every minimum, path and hint below is derived from
 * src/data/careerPlayers.ts (the fallback player pool) under the game's own
 * rule, same club in the same season, by scripts/genTransferPathHints.mjs.
 * Round 460: the special rule entries are derived the same way on the
 * fallback pool after that rule's filter.
 * GENERATED: do not edit by hand, re-run the generator. The live table is
 * derived the same way from the live career tables and carries its own
 * hints, which differ where the pools differ.
 */
const transferPathPuzzles: TransferPathPuzzle[] = [
  {
    id: 'tp-1', playerA: 'Zlatan Ibrahimović', playerB: 'Wayne Rooney', minSteps: 1,
    oneOptimalPath: ['Zlatan Ibrahimović', 'Wayne Rooney'],
    hint: 'Direct link. They were at Manchester United together.',
    active: null,
    europe: { minSteps: 1, oneOptimalPath: ['Zlatan Ibrahimović', 'Wayne Rooney'], hint: 'Direct link. They were at Manchester United together.' },
  },
  {
    id: 'tp-2', playerA: 'Lionel Messi', playerB: 'Neymar', minSteps: 1,
    oneOptimalPath: ['Lionel Messi', 'Neymar'],
    hint: 'Direct link. They were at Barcelona together.',
    active: { minSteps: 1, oneOptimalPath: ['Lionel Messi', 'Neymar'], hint: 'Direct link. They were at Barcelona together.' },
    europe: { minSteps: 1, oneOptimalPath: ['Lionel Messi', 'Neymar'], hint: 'Direct link. They were at Barcelona together.' },
  },
  {
    id: 'tp-3', playerA: 'Andrea Pirlo', playerB: 'Cristiano Ronaldo', minSteps: 2,
    oneOptimalPath: ['Andrea Pirlo', 'Gianluigi Buffon', 'Cristiano Ronaldo'],
    hint: 'One middle man does it. He was at Juventus with Andrea Pirlo and, in another season, at Juventus with Cristiano Ronaldo.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Andrea Pirlo', 'Gianluigi Buffon', 'Cristiano Ronaldo'], hint: 'One middle man does it. He was at Juventus with Andrea Pirlo and, in another season, at Juventus with Cristiano Ronaldo.' },
  },
  {
    id: 'tp-4', playerA: 'Fernando Torres', playerB: 'Didier Drogba', minSteps: 1,
    oneOptimalPath: ['Fernando Torres', 'Didier Drogba'],
    hint: 'Direct link. They were at Chelsea together.',
    active: null,
    europe: { minSteps: 1, oneOptimalPath: ['Fernando Torres', 'Didier Drogba'], hint: 'Direct link. They were at Chelsea together.' },
  },
  {
    id: 'tp-5', playerA: 'Steven Gerrard', playerB: 'Cristiano Ronaldo', minSteps: 3,
    oneOptimalPath: ['Steven Gerrard', 'Luis Suárez', 'Gerard Piqué', 'Cristiano Ronaldo'],
    hint: 'Two middle men at least. The first was at Liverpool with Steven Gerrard; the last was at Manchester United with Cristiano Ronaldo.',
    active: null,
    europe: { minSteps: 3, oneOptimalPath: ['Steven Gerrard', 'Luis Suárez', 'Gerard Piqué', 'Cristiano Ronaldo'], hint: 'Two middle men at least. The first was at Liverpool with Steven Gerrard; the last was at Manchester United with Cristiano Ronaldo.' },
  },
  {
    id: 'tp-6', playerA: 'Frank Lampard', playerB: 'Lionel Messi', minSteps: 2,
    oneOptimalPath: ['Frank Lampard', 'Samuel Eto\'o', 'Lionel Messi'],
    hint: 'One middle man does it. He was at Chelsea with Frank Lampard and at Barcelona with Lionel Messi.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Frank Lampard', 'Samuel Eto\'o', 'Lionel Messi'], hint: 'One middle man does it. He was at Chelsea with Frank Lampard and at Barcelona with Lionel Messi.' },
  },
  {
    id: 'tp-7', playerA: 'Gareth Bale', playerB: 'Robert Lewandowski', minSteps: 2,
    oneOptimalPath: ['Gareth Bale', 'David Alaba', 'Robert Lewandowski'],
    hint: 'One middle man does it. He was at Real Madrid with Gareth Bale and at Bayern Munich with Robert Lewandowski.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Gareth Bale', 'David Alaba', 'Robert Lewandowski'], hint: 'One middle man does it. He was at Real Madrid with Gareth Bale and at Bayern Munich with Robert Lewandowski.' },
  },
  {
    id: 'tp-8', playerA: 'Wayne Rooney', playerB: 'Kylian Mbappé', minSteps: 2,
    oneOptimalPath: ['Wayne Rooney', 'Angel Di María', 'Kylian Mbappé'],
    hint: 'One middle man does it. He was at Manchester United with Wayne Rooney and at PSG with Kylian Mbappé.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Wayne Rooney', 'Angel Di María', 'Kylian Mbappé'], hint: 'One middle man does it. He was at Manchester United with Wayne Rooney and at PSG with Kylian Mbappé.' },
  },
  {
    id: 'tp-9', playerA: 'Samuel Eto\'o', playerB: 'Sergio Ramos', minSteps: 2,
    oneOptimalPath: ['Samuel Eto\'o', 'Dani Alves', 'Sergio Ramos'],
    hint: 'One middle man does it. He was at Barcelona with Samuel Eto\'o and at Sevilla with Sergio Ramos.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Samuel Eto\'o', 'Dani Alves', 'Sergio Ramos'], hint: 'One middle man does it. He was at Barcelona with Samuel Eto\'o and at Sevilla with Sergio Ramos.' },
  },
  {
    id: 'tp-10', playerA: 'Didier Drogba', playerB: 'Neymar', minSteps: 2,
    oneOptimalPath: ['Didier Drogba', 'Cesc Fàbregas', 'Neymar'],
    hint: 'One middle man does it. He was at Chelsea with Didier Drogba and at Barcelona with Neymar.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Didier Drogba', 'Cesc Fàbregas', 'Neymar'], hint: 'One middle man does it. He was at Chelsea with Didier Drogba and at Barcelona with Neymar.' },
  },
  {
    id: 'tp-11', playerA: 'Luis Suárez', playerB: 'Eden Hazard', minSteps: 2,
    oneOptimalPath: ['Luis Suárez', 'Diego Costa', 'Eden Hazard'],
    hint: 'One middle man does it. He was at Atlético Madrid with Luis Suárez and at Chelsea with Eden Hazard.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Luis Suárez', 'Diego Costa', 'Eden Hazard'], hint: 'One middle man does it. He was at Atlético Madrid with Luis Suárez and at Chelsea with Eden Hazard.' },
  },
  {
    id: 'tp-12', playerA: 'Arjen Robben', playerB: 'Paul Pogba', minSteps: 2,
    oneOptimalPath: ['Arjen Robben', 'Arturo Vidal', 'Paul Pogba'],
    hint: 'One middle man does it. He was at Bayern Munich with Arjen Robben and at Juventus with Paul Pogba.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Arjen Robben', 'Arturo Vidal', 'Paul Pogba'], hint: 'One middle man does it. He was at Bayern Munich with Arjen Robben and at Juventus with Paul Pogba.' },
  },
  {
    id: 'tp-13', playerA: 'Son Heung-min', playerB: 'Karim Benzema', minSteps: 2,
    oneOptimalPath: ['Son Heung-min', 'Gareth Bale', 'Karim Benzema'],
    hint: 'One middle man does it. He was at Tottenham with Son Heung-min and at Real Madrid with Karim Benzema.',
    active: { minSteps: 3, oneOptimalPath: ['Son Heung-min', 'Harry Kane', 'Luka Modrić', 'Karim Benzema'], hint: 'Two middle men at least. The first was at Tottenham with Son Heung-min; the last was at Real Madrid with Karim Benzema.' },
    europe: { minSteps: 2, oneOptimalPath: ['Son Heung-min', 'Gareth Bale', 'Karim Benzema'], hint: 'One middle man does it. He was at Tottenham with Son Heung-min and at Real Madrid with Karim Benzema.' },
  },
  {
    id: 'tp-14', playerA: 'Mohamed Salah', playerB: 'Zlatan Ibrahimović', minSteps: 3,
    oneOptimalPath: ['Mohamed Salah', 'Alexander Isak', 'Sandro Tonali', 'Zlatan Ibrahimović'],
    hint: 'Two middle men at least. The first was at Liverpool with Mohamed Salah; the last was at AC Milan with Zlatan Ibrahimović.',
    active: null,
    europe: { minSteps: 3, oneOptimalPath: ['Mohamed Salah', 'Alexander Isak', 'Sandro Tonali', 'Zlatan Ibrahimović'], hint: 'Two middle men at least. The first was at Liverpool with Mohamed Salah; the last was at AC Milan with Zlatan Ibrahimović.' },
  },
  {
    id: 'tp-15', playerA: 'Steven Gerrard', playerB: 'Erling Haaland', minSteps: 3,
    oneOptimalPath: ['Steven Gerrard', 'Fernando Torres', 'Kevin De Bruyne', 'Erling Haaland'],
    hint: 'Two middle men at least. The first was at Liverpool with Steven Gerrard; the last was at Manchester City with Erling Haaland.',
    active: null,
    europe: { minSteps: 3, oneOptimalPath: ['Steven Gerrard', 'Fernando Torres', 'Kevin De Bruyne', 'Erling Haaland'], hint: 'Two middle men at least. The first was at Liverpool with Steven Gerrard; the last was at Manchester City with Erling Haaland.' },
  },
  {
    id: 'tp-16', playerA: 'Frank Lampard', playerB: 'Vinícius Júnior', minSteps: 2,
    oneOptimalPath: ['Frank Lampard', 'Eden Hazard', 'Vinícius Júnior'],
    hint: 'One middle man does it. He was at Chelsea with Frank Lampard and at Real Madrid with Vinícius Júnior.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Frank Lampard', 'Eden Hazard', 'Vinícius Júnior'], hint: 'One middle man does it. He was at Chelsea with Frank Lampard and at Real Madrid with Vinícius Júnior.' },
  },
  {
    id: 'tp-17', playerA: 'Gianluigi Buffon', playerB: 'Mohamed Salah', minSteps: 2,
    oneOptimalPath: ['Gianluigi Buffon', 'Federico Chiesa', 'Mohamed Salah'],
    hint: 'One middle man does it. He was at Juventus with Gianluigi Buffon and at Liverpool with Mohamed Salah.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Gianluigi Buffon', 'Federico Chiesa', 'Mohamed Salah'], hint: 'One middle man does it. He was at Juventus with Gianluigi Buffon and at Liverpool with Mohamed Salah.' },
  },
  {
    id: 'tp-18', playerA: 'Didier Drogba', playerB: 'Jude Bellingham', minSteps: 2,
    oneOptimalPath: ['Didier Drogba', 'Thibaut Courtois', 'Jude Bellingham'],
    hint: 'One middle man does it. He was at Chelsea with Didier Drogba and at Real Madrid with Jude Bellingham.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Didier Drogba', 'Thibaut Courtois', 'Jude Bellingham'], hint: 'One middle man does it. He was at Chelsea with Didier Drogba and at Real Madrid with Jude Bellingham.' },
  },
  {
    id: 'tp-19', playerA: 'Yaya Touré', playerB: 'Lamine Yamal', minSteps: 2,
    oneOptimalPath: ['Yaya Touré', 'Gerard Piqué', 'Lamine Yamal'],
    hint: 'One middle man does it. He was at Barcelona with Yaya Touré and, in another season, at Barcelona with Lamine Yamal.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Yaya Touré', 'Gerard Piqué', 'Lamine Yamal'], hint: 'One middle man does it. He was at Barcelona with Yaya Touré and, in another season, at Barcelona with Lamine Yamal.' },
  },
  {
    id: 'tp-20', playerA: 'Franck Ribéry', playerB: 'Harry Kane', minSteps: 2,
    oneOptimalPath: ['Franck Ribéry', 'Alphonso Davies', 'Harry Kane'],
    hint: 'One middle man does it. He was at Bayern Munich with Franck Ribéry and, in another season, at Bayern Munich with Harry Kane.',
    active: null,
    europe: { minSteps: 2, oneOptimalPath: ['Franck Ribéry', 'Alphonso Davies', 'Harry Kane'], hint: 'One middle man does it. He was at Bayern Munich with Franck Ribéry and, in another season, at Bayern Munich with Harry Kane.' },
  },
];

export default transferPathPuzzles;
