// Partial Ajax first-team roster at the August 2005 opening.
// Sources and cutoff are recorded in docs/audits/club-manager-ajax-2005-roster.md.
export const AJAX_2005_CUP_ROSTER: readonly {
  name: string;
  line: 'GK' | 'DEF' | 'MID' | 'ATT';
}[] = [
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
