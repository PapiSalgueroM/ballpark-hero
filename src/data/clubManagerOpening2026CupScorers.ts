interface OpeningCupScorer {
  name: string;
  line: 'DEF' | 'MID' | 'ATT';
}

// Opening squad members missing from the playable roster bake. See the source audit.
export const OPENING_2026_CUP_SCORERS: ReadonlyMap<string, readonly OpeningCupScorer[]> = new Map([
  ['LASK', [
    { name: 'Xavier Mbuyamba', line: 'DEF' },
    { name: 'Andrés Andrade', line: 'DEF' },
    { name: 'Sascha Horvath', line: 'MID' },
    { name: 'Alessandro Schöpf', line: 'MID' },
    { name: 'Samuel Adeniran', line: 'ATT' },
    { name: 'Moses Usor', line: 'ATT' },
  ]],
]);
