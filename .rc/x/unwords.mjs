// Round 1534 fixture attribution: put back the five card words of decision 6 in the four engines (runner only, restored
// by git checkout in the same request line). Never committed.
import fs from 'node:fs';
const ID = {
  nba: ['family_office_nba', 'team_stake', 'signature_shoe', 'nshady_club', 'nshady_offshore'],
  nfl: ['family_office', 'minority_stake', 'shoe_line', 'shady_club', 'shady_offshore'],
  mlb: ['family_office_mlb', 'team_stake', 'signature_shoe', 'mshady_club', 'mshady_offshore'],
  nhl: ['family_office_nhl', 'team_stake', 'signature_shoe', 'hshady_club', 'hshady_offshore'],
};
for (const [s, ids] of Object.entries(ID)) {
  const file = `src/lib/${s}MyCareer.ts`;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const was = [
    ["effect: 'Adds 2 percent to your cash every season'", "effect: 'Protects your money'"],
    ["effect: 'Fanbase +10'", "effect: 'The retirement plan, fanbase +10'"],
    ["effect: 'Fanbase +12'", "effect: 'Fanbase +12, real royalties'"],
    ["effect: 'Washes 4M, heat +3'", `effect: 'Washes 4M, heat +${s === 'nfl' ? 5 : 3} a year'`],
    ["effect: 'Heat +6'", "effect: 'Hides money, heat +6'"],
  ];
  ids.forEach((id, k) => {
    const at = lines.findIndex(l => l.includes(`{ id: '${id}',`));
    if (at < 0 || !lines[at].includes(was[k][0])) throw new Error(`${file}: ${id} lacks ${was[k][0]}`);
    lines[at] = lines[at].replace(was[k][0], () => was[k][1]);
  });
  fs.writeFileSync(file, lines.join('\n'));
  console.log(`${file}: the five old card words are back`);
}
