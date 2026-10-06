// Round 924 working list (committed in Round 924 so the record can be rebuilt). Shown name -> search name for the MLB Stats API.
export const KEEP = [
  ['bc-001', 'Mike Trout'], ['bc-002', 'Clayton Kershaw'], ['bc-003', 'Derek Jeter'], ['bc-004', 'Albert Pujols'],
  ['bc-005', 'Shohei Ohtani'], ['bc-006', 'Mariano Rivera'], ['bc-007', 'Mookie Betts'], ['bc-008', 'Pedro Martinez'],
  ['bc-009', 'Ichiro Suzuki'], ['bc-010', 'Aaron Judge'], ['bc-011', 'Justin Verlander'], ['bc-012', 'David Ortiz'],
  ['bc-013', 'Max Scherzer'], ['bc-014', 'Bryce Harper'], ['bc-015', 'Ken Griffey Jr.'], ['bc-016', 'Juan Soto'],
  ['bc-017', 'Ronald Acuna Jr.'], ['bc-018', 'Freddie Freeman'], ['bc-019', 'Trea Turner'], ['bc-020', 'Corey Seager'],
  ['bc-021', 'Babe Ruth'], ['bc-022', 'Willie Mays'], ['bc-023', 'Hank Aaron'], ['bc-024', 'Ted Williams'],
  ['bc-025', 'Mickey Mantle'], ['bc-026', 'Sandy Koufax'], ['bc-027', 'Greg Maddux'], ['bc-030', 'Randy Johnson'],
  ['bc-031', 'Nolan Ryan'], ['bc-033', 'Roberto Clemente'], ['bc-034', 'Cal Ripken Jr.'], ['bc-035', 'Yogi Berra'],
];
export const ADD = [
  'Lou Gehrig', 'Jackie Robinson', 'Stan Musial', 'Joe DiMaggio', 'Tony Gwynn', 'Rickey Henderson', 'Chipper Jones',
  'Miguel Cabrera', 'Adrian Beltre', 'Buster Posey', 'Joey Votto', 'Roy Halladay', 'Johnny Bench', 'Bob Gibson',
  'Jose Altuve', 'Paul Goldschmidt', 'Gerrit Cole', 'Jacob deGrom', 'Vladimir Guerrero Jr.', 'Francisco Lindor',
  'Manny Machado', 'Nolan Arenado', 'Pete Alonso', 'Bobby Witt Jr.', 'Julio Rodriguez', 'Kyle Schwarber',
  'Yordan Alvarez', 'Fernando Tatis Jr.',
];
export const ALL = [...KEEP.map(([id, n]) => [id, n]), ...ADD.map((n, i) => [`bc-${String(36 + i).padStart(3, '0')}`, n])];
