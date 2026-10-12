// Release AX review (engine-saves): one mutation of a settlement or talk rule, applied to the runner's checkout.
// Every `from` must stand exactly `count` times or the mutation is refused (exit 2) and nothing is written.
// usage: node .rc/x/mut.mjs <M1|M2|M2b|M3|M4|M5>      (restore with: git checkout -- src scripts)
import fs from 'node:fs';

const ENGINE = 'src/lib/soccerCareerEngine.ts', PRESS = 'src/lib/soccerCareerPress.ts', BOARD = 'src/components/us-career/UsCareerBoard.tsx', MARKET = 'src/lib/usCareerMarket.ts';
const MUTATIONS = {
  /* the press promise settles AFTER the season's money and after the season plan's appearance promise */
  M1: [
    { file: ENGINE, count: 1, from: '  settleSoccerPress(s, season);\n  s.pendingSummary = season;', to: '  s.pendingSummary = season;' },
    { file: ENGINE, count: 1, from: '  simulateSeasonFinances(s, season);\n  settleSoccerProgramme(s, season);\n', to: '  simulateSeasonFinances(s, season);\n  settleSoccerProgramme(s, season);\n  settleSoccerPress(s, season);\n' },
  ],
  /* the severe injury row no longer settles a promise (one of the four sites git merged without a conflict mark) */
  M2: [{ file: ENGINE, count: 1, from: '      settleSoccerPress(s, injuryRow);\n', to: '' }],
  /* the ban year, the prison year and the no club year no longer settle a promise */
  M2b: [{ file: ENGINE, count: 3, from: 'settleSoccerPress(s, s.pendingSummary);\n', to: '/* press settlement removed by the reviewer */\n' }],
  /* a promise met exactly on its target is judged missed */
  M3: [{ file: PRESS, count: 1, from: 'return actual >= promise.target && ', to: 'return actual > promise.target && ' }],
  /* the extension push is no longer written to the save (a reload would hand the push back) */
  M4: [{ file: BOARD, count: 1, from: "    setMarketTalk(next);\n    persist(career, 'extension', teamQuality);\n", to: '    setMarketTalk(next);\n' }],
  /* a talk saved for another year is read as this year's */
  M5: [{ file: MARKET, count: 1, from: 'Number.isSafeInteger(v.year) && v.year === c.year && ', to: 'Number.isSafeInteger(v.year) && ' }],
};
const name = process.argv[2], list = MUTATIONS[name];
if (!list) { console.error(`mut: unknown mutation ${name}`); process.exit(2); }
const texts = {}, crlf = {};
for (const m of list) {
  if (texts[m.file] === undefined) { const raw = fs.readFileSync(m.file, 'utf8'); crlf[m.file] = raw.includes('\r\n'); texts[m.file] = raw.split('\r\n').join('\n'); }
  const src = texts[m.file];
  const n = src.split(m.from).length - 1;
  if (n !== m.count) { console.error(`mut ${name}: REFUSED. ${JSON.stringify(m.from.slice(0, 60))} stands ${n} time(s) in ${m.file}, not ${m.count}. Nothing was written.`); process.exit(2); }
  texts[m.file] = src.split(m.from).join(m.to);
}
for (const [file, text] of Object.entries(texts)) fs.writeFileSync(file, crlf[file] ? text.split('\n').join('\r\n') : text);
console.log(`mut ${name}: applied to ${Object.keys(texts).join(', ')}`);
