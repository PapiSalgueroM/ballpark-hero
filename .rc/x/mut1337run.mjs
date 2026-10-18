// Reviewer's mutation script for Round 1337 (runs on a runner only, never committed).
// node mut1337run.mjs <id>   applies one mutation to the tree under process.cwd().
// Exits 3 (ABORT) if the string it replaces is not there exactly once, so an abort never reads as a fire.
import fs from 'node:fs';
import path from 'node:path';

const PAGE = 'src/pages/SoccerCareer.tsx';
const SQUAD = 'src/components/soccer-career/SquadSheet.tsx';
const TRAIN = 'src/components/soccer-career/TrainingPanel.tsx';
const HELD = 'const nightHeld = career.phase === "ballon_dor" && ballonDorAwaitingReveal(career) !== null;';
const FIRST = 'const [firstHint] = useState(() => !initialScreen && !hintShown());';
const M = {
  // the night held on phase alone: a revealed night would keep the button shut
  m1: [PAGE, HELD, 'const nightHeld = career.phase === "ballon_dor";'],
  // the night held on the pending night alone: season_summary with the night pending would be shut too
  m2: [PAGE, HELD, 'const nightHeld = ballonDorAwaitingReveal(career) !== null;'],
  // the flag written inside the initialiser (the old helpSeen shape), the effect kept
  m3: [SQUAD, FIRST, 'const [firstHint] = useState(() => { const s = !initialScreen && !hintShown(); if (s) markHintShown(); return s; });'],
  // the pointer read on every render instead of once
  m4: [SQUAD, FIRST, 'const firstHint = !initialScreen && !hintShown();'],
  // the menu shows no rules at all (the bank paragraph goes behind ? too)
  m5: [TRAIN, '{(showRules || screen === "menu") && <div data-practice-rules', '{showRules && <div data-practice-rules'],
  // the drill list back on the menu
  m6: [TRAIN, '{showRules && <p>Tap cones in order', '{true && <p>Tap cones in order'],
  // initialScreen no longer skips the read
  m10: [SQUAD, FIRST, 'const [firstHint] = useState(() => !hintShown());'],
  // the keeper labels truncate again (title kept wrapping)
  m8: [PAGE, 'w-[6.5rem] shrink-0 text-[11px] leading-tight text-muted-foreground [overflow-wrap:anywhere]', 'w-[6.5rem] shrink-0 text-[11px] text-muted-foreground truncate'],
  // the flag write inlined in the effect, outside markHintShown (simStorageWrites must say it is on no list)
  m11: [SQUAD, 'if (firstHint) markHintShown();', "if (firstHint) { try { window.localStorage.setItem(HELP_KEY, '1'); } catch { /* refused */ } }"],
  // a further, unrelated change to the help's intro: the intro1337 map must not let it through
  m12: ['src/components/soccer-career/SoccerSeasonCentre.tsx', 'with promotion and relegation between two divisions. Every score', 'with promotion and relegation between three divisions. Every score'],
  // the title truncates again (labels kept wrapping)
  m9: [PAGE, '<h1 className="min-w-0 text-base font-black [overflow-wrap:anywhere]">', '<h1 className="text-base font-black truncate">'],
};
const id = process.argv[2];
const m = M[id];
if (!m) { console.log(`ABORT unknown mutation ${id}`); process.exit(3); }
const [file, from, to] = m;
const abs = path.join(process.cwd(), file);
const src = fs.readFileSync(abs, 'utf8');
const count = src.split(from).length - 1;
if (count !== 1) { console.log(`ABORT ${id}: expected the string once in ${file}, found ${count}`); process.exit(3); }
fs.writeFileSync(abs, src.replace(from, to));
console.log(`MUTATION ${id} applied to ${file}`);
