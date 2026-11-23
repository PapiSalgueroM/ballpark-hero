interface OpeningCupScorer {
  name: string;
  line: 'DEF' | 'MID' | 'ATT';
}

// Opening squad members missing from the playable roster bake. See the source audit.
export const OPENING_2026_CUP_SCORERS: ReadonlyMap<string, readonly OpeningCupScorer[]> = new Map([
  ['AGF', [
    { name: 'Frederik Tingager', line: 'DEF' },
    { name: 'Tobias Mølgaard', line: 'DEF' },
    { name: 'Eric Kahl', line: 'DEF' },
    { name: 'Colin Rösler', line: 'DEF' },
    { name: 'Magnus Knudsen', line: 'MID' },
  ]],
  ['LASK', [
    { name: 'Xavier Mbuyamba', line: 'DEF' },
    { name: 'Andrés Andrade', line: 'DEF' },
    { name: 'Sascha Horvath', line: 'MID' },
    { name: 'Alessandro Schöpf', line: 'MID' },
    { name: 'Samuel Adeniran', line: 'ATT' },
    { name: 'Moses Usor', line: 'ATT' },
  ]],
  ['Thun', [
    { name: 'Jan Bamert', line: 'DEF' },
    { name: 'Marco Bürki', line: 'DEF' },
    { name: 'Nicolas Bürgy', line: 'DEF' },
    { name: 'Lucien Dähler', line: 'DEF' },
    { name: 'Justin Roth', line: 'MID' },
    { name: 'Nico Maier', line: 'MID' },
    { name: 'Nassim Zoukit', line: 'MID' },
    { name: 'Nils Reichmuth', line: 'MID' },
    { name: 'Brighton Labeau', line: 'ATT' },
    { name: 'Marc Gutbub', line: 'ATT' },
  ]],
]);
