// Round 1210 reviewer mutations. Runs on the runner only (an extra file, .rc/x/reviewMut.mjs): node .rc/x/reviewMut.mjs <id>
// Each mutation asserts the text it changes is there and that the file changed, or exits 9 (so a miss never reads as green).
import fs from 'node:fs';

const id = process.argv[2];
const edit = (file, find, to) => {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes(find)) { console.error(`MUT ${id} REFUSED: ${file} does not hold "${find.slice(0, 90)}"`); process.exit(9); }
  const out = src.replace(find, to);
  if (out === src) { console.error(`MUT ${id} REFUSED: ${file} did not change`); process.exit(9); }
  fs.writeFileSync(file, out);
  console.log(`MUT ${id} applied to ${file}: "${find.slice(0, 70)}" is now "${to.slice(0, 70)}"`);
};
const append = (file, text) => {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(text)) { console.error(`MUT ${id} REFUSED: ${file} already holds the planted text`); process.exit(9); }
  fs.writeFileSync(file, src + '\n' + text + '\n');
  console.log(`MUT ${id} appended to ${file}: ${text.slice(0, 110)}`);
};
const FOOTLE = 'src/pages/Footle.tsx';
const CONFED = 'src/lib/confederationGroups.ts';
const BOARD = 'src/components/us-career/UsCareerBoard.tsx';
const FLAG = 'src/components/FlagImg.tsx';
const STORE = 'scripts/simStorageWrites.mjs';
const HOLD = 'return holdPendingSave(() => { retrySave(); return pendingSave.current === null; });';

const M = {
  /* flags */
  f1: () => edit(FOOTLE, '<FlagImg name={targetPlayer.nationality} size={12} showLabel />', '{targetPlayer.nationality}'),
  f2: () => edit(FOOTLE, "['Nation', <FlagImg name={player.nationality} size={12} showLabel />]", "['Nation', player.nationality]"),
  f3: () => edit(FOOTLE, '<FlagImg name={examplePlayer.nationality} size={12} showLabel />', '{examplePlayer.nationality}'),
  f4: () => edit(CONFED, "  Turkmenistan: 'AFC',", ''),
  f5: () => edit('src/data/clubManagerALeague2026.ts', "'Ajak Riak': 'Southern Sudan',", "'Ajak Riak': 'Zubrowka',"),
  f6: () => edit('src/components/soccer-career/TrophyCabinet.tsx', 'Won with {career.nationality}', 'Won with {career.nationality} of {career.nationality}'),
  f7: () => edit(CONFED, "  'French Guiana': 'CONCACAF',", ''),
  f8: () => edit(CONFED, "  Niger: 'CAF', Namibia: 'CAF', Mauritius: 'CAF',", "  Niger: 'CAF', Namibia: 'CAF',"),
  /* storage */
  s1: () => {
    edit(BOARD, HOLD, 'return undefined;');
    edit(BOARD, '  }, [saveFailed, retrySave]);', "  }, [saveFailed, retrySave]);\n  useEffect(() => { if (sport.saveKey === '') holdPendingSave(() => true); }, [sport.saveKey]);");
  },
  s2: () => append('src/hooks/useAussieRulesManager.ts', "export function plantedSecondSave(setLostProgress: (v: boolean) => void) { try { localStorage.setItem('planted-2', '1'); } catch { setLostProgress(true); } }"),
  s3: () => append(FLAG, "function plantedWrite(v: string) { localStorage.setItem('planted-3', v); }\nexport function plantedCaller(setStorageNotice: (v: boolean) => void) { try { plantedWrite('1'); } catch { setStorageNotice(true); } }"),
  s4: () => append(FLAG, "import { safeSetItem } from '@/lib/safeStorage';\nexport function plantedKeeps(setBanner: (v: boolean) => void) { if (!safeSetItem('planted-4', '1')) setBanner(true); }"),
  s5a: () => edit(BOARD, '  const saveFailed = saveFailure !== null;', "  const saveFailed = saveFailure !== null;\n  const [draftSaveBlocked, setDraftSaveBlocked] = useState(false);\n  const plantedDraftSave = () => { try { localStorage.setItem('planted-draft', '1'); } catch { setDraftSaveBlocked(true); } };"),
  s5b: () => {
    M.s5a();
    edit(STORE, 'const NOTHING_HELD = [', "NAMED.push({ file: 'src/components/us-career/UsCareerBoard.tsx', keys: ['state:draftSaveBlocked'], why: 'planted by the reviewer: nothing holds this save' });\nconst NOTHING_HELD = [");
  },
  s6: () => edit('src/pages/SoccerCareer.tsx', '  const [saveFailed, setSaveFailed] = useState(false);', '  const [saveFailed, setSaveFailed] = useState(false);\n  useEffect(() => { if (!saveFailed) return; return holdPendingSave(() => true); }, [saveFailed]);'),
  s7: () => append(FLAG, "export function plantedToast(toast: { error: (m: string) => void }) { try { localStorage.setItem('planted-7', '1'); } catch { toast.error('could not save'); } }"),
  s8: () => append('src/hooks/useAussieRulesManager.ts', "export function plantedSameName(setStorageNotice: (v: string) => void) { try { localStorage.setItem('planted-8', '1'); } catch { setStorageNotice('a second, different save was refused'); } }"),
  /* an honest partial fix: Footle names its practice run and leaves the unlimited session owed */
  s9: () => {
    edit('src/hooks/useGame.ts', '  const [practiceSaveFailed, setPracticeSaveFailed] = useState(false);', '  const [practiceSaveFailed, setPracticeSaveFailed] = useState(false);\n  useEffect(() => { if (!practiceSaveFailed) return; return holdPendingSave(() => true); }, [practiceSaveFailed]);');
    edit(STORE, "  { file: 'src/hooks/useGame.ts', keys: ['state:practiceSaveFailed', 'state:unlimitedSaveFailed'], owner: 'the other lane', listed: '2026-10-10',", "  { file: 'src/hooks/useGame.ts', keys: ['state:unlimitedSaveFailed'], owner: 'the other lane', listed: '2026-10-10',");
    edit(STORE, 'const NOTHING_HELD = [', "NAMED.push({ file: 'src/hooks/useGame.ts', keys: ['state:practiceSaveFailed'], why: 'reviewer: the practice run alone is named' });\nconst NOTHING_HELD = [");
  },
  /* the plausible slip: the hold's condition turned round (runner files are LF) */
  s10: () => edit(BOARD, '    if (!saveFailed) return;\n    return holdPendingSave(', '    if (saveFailed) return;\n    return holdPendingSave('),
  /* the hub */
  h1: () => edit('src/components/us-career/CareerSeasonReview.tsx', 'career.seasons.map((saved, index) => ({ saved, index })).reverse().map(', 'career.seasons.map((saved, index) => ({ saved, index })).reverse().slice(1).map('),
  h2: () => edit('src/components/us-career/CareerSeasonReview.tsx', '<button ref={back} onClick={season ? () => setSelected(null) : onBack}', '<button ref={back} onClick={season ? () => setSelected(null) : () => {}}'),
};
if (!M[id]) { console.error(`MUT ${id}: no such mutation (${Object.keys(M).join(', ')})`); process.exit(9); }
M[id]();
