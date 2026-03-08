export interface TimelinePlayer {
  name: string;
  position: string;
  draftYear: number;
}

export interface TimelinePuzzle {
  id: string;
  players: TimelinePlayer[];
}

export const timelinePuzzles: TimelinePuzzle[] = [
  {
    id: 'tl-001',
    players: [
      { name: 'Peyton Manning', position: 'QB', draftYear: 1998 },
      { name: 'LaDainian Tomlinson', position: 'RB', draftYear: 2001 },
      { name: 'Larry Fitzgerald', position: 'WR', draftYear: 2004 },
      { name: 'Aaron Donald', position: 'DT', draftYear: 2014 },
      { name: 'Patrick Mahomes', position: 'QB', draftYear: 2017 },
    ],
  },
  {
    id: 'tl-002',
    players: [
      { name: 'Ray Lewis', position: 'LB', draftYear: 1996 },
      { name: 'Ed Reed', position: 'S', draftYear: 2002 },
      { name: 'Calvin Johnson', position: 'WR', draftYear: 2007 },
      { name: 'J.J. Watt', position: 'DE', draftYear: 2011 },
      { name: 'Lamar Jackson', position: 'QB', draftYear: 2018 },
    ],
  },
  {
    id: 'tl-003',
    players: [
      { name: 'Randy Moss', position: 'WR', draftYear: 1998 },
      { name: 'Julius Peppers', position: 'DE', draftYear: 2002 },
      { name: 'Adrian Peterson', position: 'RB', draftYear: 2007 },
      { name: 'Odell Beckham Jr.', position: 'WR', draftYear: 2014 },
      { name: 'Justin Herbert', position: 'QB', draftYear: 2020 },
    ],
  },
  {
    id: 'tl-004',
    players: [
      { name: 'Charles Woodson', position: 'CB', draftYear: 1998 },
      { name: 'Troy Polamalu', position: 'S', draftYear: 2003 },
      { name: 'Darrelle Revis', position: 'CB', draftYear: 2007 },
      { name: 'Tyrann Mathieu', position: 'S', draftYear: 2013 },
      { name: 'Sauce Gardner', position: 'CB', draftYear: 2022 },
    ],
  },
  {
    id: 'tl-005',
    players: [
      { name: 'Tom Brady', position: 'QB', draftYear: 2000 },
      { name: 'Eli Manning', position: 'QB', draftYear: 2004 },
      { name: 'Matt Ryan', position: 'QB', draftYear: 2008 },
      { name: 'Dak Prescott', position: 'QB', draftYear: 2016 },
      { name: 'C.J. Stroud', position: 'QB', draftYear: 2023 },
    ],
  },
  {
    id: 'tl-006',
    players: [
      { name: 'Champ Bailey', position: 'CB', draftYear: 1999 },
      { name: 'DeMarcus Ware', position: 'LB', draftYear: 2005 },
      { name: 'Rob Gronkowski', position: 'TE', draftYear: 2010 },
      { name: 'Khalil Mack', position: 'LB', draftYear: 2014 },
      { name: 'Micah Parsons', position: 'LB', draftYear: 2021 },
    ],
  },
  {
    id: 'tl-007',
    players: [
      { name: 'Terrell Owens', position: 'WR', draftYear: 1996 },
      { name: 'Steve Smith Sr.', position: 'WR', draftYear: 2001 },
      { name: 'DeSean Jackson', position: 'WR', draftYear: 2008 },
      { name: 'Tyreek Hill', position: 'WR', draftYear: 2016 },
      { name: "Ja'Marr Chase", position: 'WR', draftYear: 2021 },
    ],
  },
  {
    id: 'tl-008',
    players: [
      { name: 'Brian Urlacher', position: 'LB', draftYear: 2000 },
      { name: 'Patrick Willis', position: 'LB', draftYear: 2007 },
      { name: 'Luke Kuechly', position: 'LB', draftYear: 2012 },
      { name: 'Devin White', position: 'LB', draftYear: 2019 },
      { name: 'Will Anderson Jr.', position: 'DE', draftYear: 2023 },
    ],
  },
  {
    id: 'tl-009',
    players: [
      { name: 'Marshall Faulk', position: 'RB', draftYear: 1994 },
      { name: 'Shaun Alexander', position: 'RB', draftYear: 2000 },
      { name: 'Chris Johnson', position: 'RB', draftYear: 2008 },
      { name: 'Ezekiel Elliott', position: 'RB', draftYear: 2016 },
      { name: 'Bijan Robinson', position: 'RB', draftYear: 2023 },
    ],
  },
  {
    id: 'tl-010',
    players: [
      { name: 'Orlando Pace', position: 'OT', draftYear: 1997 },
      { name: 'Joe Thomas', position: 'OT', draftYear: 2007 },
      { name: 'Trent Williams', position: 'OT', draftYear: 2010 },
      { name: 'Quenton Nelson', position: 'OG', draftYear: 2018 },
      { name: 'Paris Johnson Jr.', position: 'OT', draftYear: 2023 },
    ],
  },
  {
    id: 'tl-011',
    players: [
      { name: 'Drew Brees', position: 'QB', draftYear: 2001 },
      { name: 'Philip Rivers', position: 'QB', draftYear: 2004 },
      { name: 'Russell Wilson', position: 'QB', draftYear: 2012 },
      { name: 'Josh Allen', position: 'QB', draftYear: 2018 },
      { name: 'Bryce Young', position: 'QB', draftYear: 2023 },
    ],
  },
  {
    id: 'tl-012',
    players: [
      { name: 'Richard Sherman', position: 'CB', draftYear: 2011 },
      { name: 'Stephon Gilmore', position: 'CB', draftYear: 2012 },
      { name: 'Jalen Ramsey', position: 'CB', draftYear: 2016 },
      { name: 'Denzel Ward', position: 'CB', draftYear: 2018 },
      { name: 'Derek Stingley Jr.', position: 'CB', draftYear: 2022 },
    ],
  },
  {
    id: 'tl-013',
    players: [
      { name: 'Tony Gonzalez', position: 'TE', draftYear: 1997 },
      { name: 'Jason Witten', position: 'TE', draftYear: 2003 },
      { name: 'Travis Kelce', position: 'TE', draftYear: 2013 },
      { name: 'George Kittle', position: 'TE', draftYear: 2017 },
      { name: 'Kyle Pitts', position: 'TE', draftYear: 2021 },
    ],
  },
  {
    id: 'tl-014',
    players: [
      { name: 'Daunte Culpepper', position: 'QB', draftYear: 1999 },
      { name: 'Ben Roethlisberger', position: 'QB', draftYear: 2004 },
      { name: 'Cam Newton', position: 'QB', draftYear: 2011 },
      { name: 'Baker Mayfield', position: 'QB', draftYear: 2018 },
      { name: 'Caleb Williams', position: 'QB', draftYear: 2024 },
    ],
  },
  {
    id: 'tl-015',
    players: [
      { name: 'Reggie Wayne', position: 'WR', draftYear: 2001 },
      { name: 'Andre Johnson', position: 'WR', draftYear: 2003 },
      { name: 'A.J. Green', position: 'WR', draftYear: 2011 },
      { name: 'Mike Evans', position: 'WR', draftYear: 2014 },
      { name: 'Garrett Wilson', position: 'WR', draftYear: 2022 },
    ],
  },
];
