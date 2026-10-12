// Round 1314 reviewer (run lens): one plausible mutation by name, applied to the runner's checkout.
// The request line restores with git checkout -- src scripts in the same line. Exit 3 when the anchor is missing.
import fs from 'node:fs';

const name = process.argv[2];
const edit = (file, from, to) => {
  const t = fs.readFileSync(file, 'utf8');
  const n = t.split(from).length - 1;
  if (n !== 1) { console.error(`mutation ${name}: anchor found ${n} time(s) in ${file}: ${JSON.stringify(from).slice(0, 120)}`); process.exit(3); }
  fs.writeFileSync(file, t.replace(from, to));
  console.log(`mutation ${name}: applied to ${file}`);
};
const append = (file, text) => {
  if (!fs.existsSync(file)) { console.error(`mutation ${name}: no ${file}`); process.exit(3); }
  fs.appendFileSync(file, text);
  console.log(`mutation ${name}: appended to ${file}`);
};
const CSS = 'src/components/club-manager/LiveSimMotion.css';
const UTILS = 'src/lib/utils.ts';
const SC = 'src/pages/SoccerCareer.tsx';
const NBA = 'src/lib/nbaFrontOffice.ts';

switch (name) {
  // simSafari section 4: Round 1101's fix reverted to a bare 100vh.
  case 'css-bare': edit(CSS, 'height:100vh;height:100dvh;', 'height:100vh;'); break;
  // simSafari section 4: the fallback in the wrong order.
  case 'css-order': edit(CSS, 'height:100vh;height:100dvh;', 'height:100dvh;height:100vh;'); break;
  // simSafari section 4: a raw 100vh hidden in a custom property named ...-height (the old regex matched this).
  case 'css-customprop': edit(CSS, 'height:100vh;height:100dvh;', '--cm-stage-height:100vh;height:var(--cm-stage-height);'); break;
  // simSafari section 0: a shipped file imports a test helper through the alias.
  case 'imp-alias': append(UTILS, "\nimport '@/test/arcadePointerFixture';\n"); break;
  // simSafari section 0: a shipped file re-exports a test helper through a relative path.
  case 'imp-rel-export': append(UTILS, "\nexport * from '../test/arcadePointerFixture';\n"); break;
  // simSafari section 0: a lazy import of a test helper.
  case 'imp-dynamic': append(UTILS, "\nexport const __lazyFixture = () => import('@/test/arcadePointerFixture');\n"); break;
  // simSafari section 2: a lookbehind in a shipped (non test) file on disk.
  case 'lb-shipped': append(UTILS, '\nexport const __lb = /(?<=x)y/;\n'); break;
  // simActivityNotCompletion: a second season advance (say a sim to the end button) that never pings, first argument a member.
  case 'act-second-dotted': append(SC, '\nexport function __simToEnd(s: { career: never }, clubs: never) { return advanceProSeason(s.career, clubs); }\n'); break;
  // simActivityNotCompletion: the same second advance with a plain name.
  case 'act-second-plain': append(SC, '\nexport function __simToEnd(next: never, clubs: never) { return advanceProSeason(next, clubs); }\n'); break;
  // simActivityNotCompletion: the ping moved out of the advance into a mount effect far below it.
  case 'act-ping-moved': {
    const t = fs.readFileSync(SC, 'utf8');
    const n = t.split("recordActivity('/soccer-career')").length - 1;
    if (n !== 1) { console.error(`mutation ${name}: ping found ${n} time(s)`); process.exit(3); }
    fs.writeFileSync(SC, t.replace("recordActivity('/soccer-career')", 'void 0') + "\nexport function __pingOnMount() { recordActivity('/soccer-career'); }\n");
    console.log(`mutation ${name}: ping moved to the end of ${SC}`);
    break;
  }
  // simGmXp: the NBA default arm stops using the drawn step.
  case 'xp-defaultarm': edit(NBA, 'opts.growth(t.abbr, p, step) : step));', 'opts.growth(t.abbr, p, step) : 2));'); break;
  default: console.error(`unknown mutation ${name}`); process.exit(3);
}
