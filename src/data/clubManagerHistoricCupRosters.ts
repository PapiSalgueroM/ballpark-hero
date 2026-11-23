interface HistoricCupRosterPlayer {
  name: string;
  line: 'GK' | 'DEF' | 'MID' | 'ATT';
}

// Partial Ajax first-team roster at the August 2005 opening.
// Sources and cutoff are recorded in docs/audits/club-manager-ajax-2005-roster.md.
const AJAX_2005_CUP_ROSTER: readonly HistoricCupRosterPlayer[] = [
  { name: 'Hans Vonk', line: 'GK' },
  { name: 'Maarten Stekelenburg', line: 'GK' },
  { name: 'Hatem Trabelsi', line: 'DEF' },
  { name: 'John Heitinga', line: 'DEF' },
  { name: 'Julien Escudé', line: 'DEF' },
  { name: 'Thomas Vermaelen', line: 'DEF' },
  { name: 'Nigel de Jong', line: 'MID' },
  { name: 'Wesley Sneijder', line: 'MID' },
  { name: 'Steven Pienaar', line: 'MID' },
  { name: 'Ryan Babel', line: 'ATT' },
  { name: 'Markus Rosenberg', line: 'ATT' },
  { name: 'Mauro Rosales', line: 'ATT' },
];

// Partial Rosenborg first-team roster at the August 2005 opening.
// Sources and cutoff are recorded in docs/audits/club-manager-rosenborg-2005-roster.md.
const ROSENBORG_2005_CUP_ROSTER: readonly HistoricCupRosterPlayer[] = [
  { name: 'Espen Johnsen', line: 'GK' },
  { name: 'Ole Christer Basma', line: 'DEF' },
  { name: 'Vidar Riseth', line: 'DEF' },
  { name: 'Alejandro Lago', line: 'DEF' },
  { name: 'Mikael Dorsin', line: 'DEF' },
  { name: 'Jan Gunnar Solli', line: 'MID' },
  { name: 'Roar Strand', line: 'MID' },
  { name: 'Fredrik Winsnes', line: 'MID' },
  { name: 'Frode Johnsen', line: 'ATT' },
  { name: 'Daniel Braaten', line: 'ATT' },
  { name: 'Thorstein Helstad', line: 'ATT' },
];

// Partial Olympiacos first-team roster at the August 2005 opening.
// Sources and cutoff are recorded in docs/audits/club-manager-olympiacos-fenerbahce-2005-rosters.md.
const OLYMPIACOS_2005_CUP_ROSTER: readonly HistoricCupRosterPlayer[] = [
  { name: 'Antonios Nikopolidis', line: 'GK' },
  { name: 'Dimitrios Mavrogenidis', line: 'DEF' },
  { name: 'Georgios Anatolakis', line: 'DEF' },
  { name: 'Michalis Kapsis', line: 'DEF' },
  { name: 'Erol Bulut', line: 'DEF' },
  { name: 'Ieroklis Stoltidis', line: 'MID' },
  { name: 'Predrag Djordjević', line: 'MID' },
  { name: 'Yaya Touré', line: 'MID' },
  { name: 'Ioannis Okkas', line: 'ATT' },
  { name: 'Michalis Konstantinou', line: 'ATT' },
  { name: 'Haruna Babangida', line: 'ATT' },
];

// Partial Fenerbahçe first-team roster at the August 2005 opening.
// Sources and cutoff are recorded in docs/audits/club-manager-olympiacos-fenerbahce-2005-rosters.md.
const FENERBAHCE_2005_CUP_ROSTER: readonly HistoricCupRosterPlayer[] = [
  { name: 'Volkan Demirel', line: 'GK' },
  { name: 'Fábio Luciano', line: 'DEF' },
  { name: 'Ümit Özat', line: 'DEF' },
  { name: 'Önder Turacı', line: 'DEF' },
  { name: 'Deniz Barış', line: 'DEF' },
  { name: 'Stephen Appiah', line: 'MID' },
  { name: 'Marco Aurélio', line: 'MID' },
  { name: 'Alex de Souza', line: 'MID' },
  { name: 'Tuncay Şanlı', line: 'ATT' },
  { name: 'Márcio Nobre', line: 'ATT' },
  { name: 'Nicolas Anelka', line: 'ATT' },
];

export const HISTORIC_2005_CUP_ROSTERS: ReadonlyMap<string, readonly HistoricCupRosterPlayer[]> = new Map([
  ['Ajax', AJAX_2005_CUP_ROSTER],
  ['Rosenborg', ROSENBORG_2005_CUP_ROSTER],
  ['Olympiacos', OLYMPIACOS_2005_CUP_ROSTER],
  ['Fenerbahçe', FENERBAHCE_2005_CUP_ROSTER],
]);
