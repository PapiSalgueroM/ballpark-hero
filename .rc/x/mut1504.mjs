/* Reviewer's mutations for Round 1504, applied on a runner checkout only (restored by git checkout in the same line). */
import fs from 'node:fs';

const DECK = 'src/lib/soccerDeck.ts';
const STARTER = 'src/data/soccerDeck/starter.ts';
const PAGE = 'src/pages/SoccerCareer.tsx';

const PROBE = `    if (isTraining(k)) trained += moved;
    if (isTraining(k) && raw > 0 && moved > 0) {
      const st = SOCCER_TRAINING_KEYS[k].stat;
      const g = globalThis as unknown as { __p99?: { n: number; at99: number; capped: number; byStat: Record<string, number> } };
      g.__p99 = g.__p99 ?? { n: 0, at99: 0, capped: 0, byStat: {} };
      g.__p99.n += 1;
      const cur = Number((s as unknown as Record<string, number>)[st]);
      const q = Number(s.statBoostNextSeason?.[st as keyof typeof s.statBoostNextSeason] ?? 0);
      if (cur >= 99) g.__p99.at99 += 1;
      if (cur + q > 99) { g.__p99.capped += 1; g.__p99.byStat[st] = (g.__p99.byStat[st] ?? 0) + 1; }
    }`;

const MUTS = {
  costcap: [DECK, '    const v = cost ? -Math.min(-raw, trained) : raw;', '    const v = raw;'],
  costgone: [DECK, '      if (v < 0) { s.statBoostNextSeason = { ...(s.statBoostNextSeason ?? {}), [stat]: (s.statBoostNextSeason?.[stat] ?? 0) + v }; return; }', '      if (v < 0) { return; }'],
  onefree: [STARTER, 'fx: { t_shooting: 1, t_dribbling: -1 } }', 'fx: { t_shooting: 1 } }'],
  guard: [PAGE, '    if (press.at === career) return;\n', ''],
  probe99: [DECK, '    if (isTraining(k)) trained += moved;', PROBE],
};

const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.error(`mut1504: unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
let src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const hits = src.split(from).length - 1;
if (hits !== 1) { console.error(`mut1504: ${name}: its text is in ${file} ${hits} times, not once, refusing`); process.exit(2); }
src = src.replace(from, () => to);
if (name === 'probe99') src += "\nif (typeof process !== 'undefined') process.on('exit', () => { const g = globalThis as unknown as { __p99?: unknown }; console.log('PROBE99 ' + JSON.stringify(g.__p99 ?? null)); });\n";
fs.writeFileSync(file, src);
console.log(`mut1504: ${name} applied to ${file}`);
