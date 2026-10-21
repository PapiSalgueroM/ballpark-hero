// Reviewer mutation for Round 1530 (playCorruptSaves). Runs on the runner only, from the repo root.
// Modes (any combination, comma separated):
//   offline : /fight-gym's board becomes a data error screen ("Couldn't load ... right now." plus "Try again");
//             /fight-career's board renders nothing, so only GameSeoContent's report button is left.
//   label   : the report TRIGGER button's visible label (not its title, not the dialog title) becomes "Report this".
// Every replace asserts its anchor is present and that the file changed; restore with git checkout -- src.
import fs from 'node:fs';

const modes = (process.argv[2] || '').split(',').filter(Boolean);
const swap = (file, from, to) => {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes(from)) { console.error(`mutA: anchor not found in ${file}: ${from.slice(0, 60)}`); process.exit(9); }
  const out = src.replace(from, to);
  if (out === src) { console.error(`mutA: no change in ${file}`); process.exit(9); }
  fs.writeFileSync(file, out);
  console.log(`mutA: ${file} mutated`);
};

for (const m of modes) {
  if (m === 'offline') {
    swap('src/pages/FightGym.tsx', '<FightGymBoard />',
      '<div className="py-12 text-muted-foreground"><p className="mb-3">Couldn\'t load the gym roster right now.</p><button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold">Try again</button></div>');
    swap('src/pages/FightCareer.tsx', '<FightCareerBoard />', '<div className="py-12" />');
  } else if (m === 'label') {
    swap('src/components/game/ReportQuestion.tsx', '<Flag className="w-3 h-3" />\n        Report a problem', '<Flag className="w-3 h-3" />\n        Report this');
  } else { console.error(`mutA: unknown mode ${m}`); process.exit(9); }
}
