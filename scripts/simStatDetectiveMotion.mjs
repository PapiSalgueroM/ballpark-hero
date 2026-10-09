/* Round786: actual Stat Detective state, helper outcomes and native focus transfer.
   STAT_DETECTIVE_CONTROL=guess|clue|result|keys|keyboard|pointer|focus|quiet|cleanup|guide changes asserted page copies. */
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rm,rmdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'src/pages/StatDetective.tsx');
const control=process.env.STAT_DETECTIVE_CONTROL||'';
const controls={
  guess:{anchor:'feedback?.name === g.name && (feedback.correct ? motion.correct : motion.wrong)',replacement:'false && (feedback.correct ? motion.correct : motion.wrong)',failure:/reveals each real profile-backed clue/},
  clue:{anchor:'feedback?.clues.includes(h.label) && motion.clue',replacement:'false && motion.clue',failure:/reveals each real profile-backed clue/},
  result:{anchor:'feedback?.terminal && motion.result',replacement:'false && motion.result',failure:/cues a committed win once/},
  keys:{anchor:'key={g.name}',replacement:'key={`${g.name}-${i}`}',failure:/reveals each real profile-backed clue/},
  keyboard:{anchor:'if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setInputFocused(false);',replacement:'setInputFocused(false);',failure:/keeps the non-first native option mounted/},
  pointer:{anchor:'.find(count => hintsFor(mystery, count, mysteryProfile).length > hints.length) ?? null : null;',replacement:'.find(count => count === nextHintAt(misses)) ?? null : null;',prefix:"import { nextHintAt } from '@/lib/statDetective';\n",failure:/derives the real sparse-profile unlock gaps/},
  focus:{anchor:'target.focus({ preventScroll: true });',replacement:"if (phase === 'playing') target.focus({ preventScroll: true });",failure:/cues a committed win once/},
  quiet:{anchor:'feedback?.name === g.name && (feedback.correct ? motion.correct : motion.wrong)',replacement:'(g.isCorrect ? motion.correct : motion.wrong)',failure:/cues a committed win once/},
  cleanup:{anchor:'return () => window.clearTimeout(timer);',replacement:'return () => {};',failure:/keeps short and duplicate queries quiet/},
  guide:{anchor:"const CLUE_RULES = 'Clues unlock after each of the first six misses when a career profile is available. Without that profile, they unlock after misses 2, 4, 5 and 6.';",replacement:"const CLUE_RULES = 'Clues unlock only after misses 2, 4 and 6.';",failure:/shows accurate rules and example before play/},
};
/* Round 1145: the career span comes from the view bref_nba_career_spans (first and last season with ANY row), never
   from the 500 minute rows the page reads. Same copy and swap as above, on the lib instead of the page:
   STAT_DETECTIVE_CONTROL=span|spanfail|spanfull|spanshort|spanguess|spanera. src/test/statDetectiveSpans.test.tsx
   runs the real fetch and the real page over a fake client holding a small table (no network). */
const libSource=path.join(root,'src/lib/statDetective.ts');
const spanTest='src/test/statDetectiveSpans.test.tsx';
const spanControls={
  span:{anchor:'const span = spans.get(nameKey);',replacement:'const span = { first: year, last: year };',failure:/reads the true first and last season/},
  spanfail:{anchor:'if (page.error || !page.data) return null;',replacement:'if (page.error || !page.data) continue;',failure:/fails the whole load when the spans cannot be read/},
  spanfull:{anchor:'if (spans.size === 0 || lastSpanPage.length >= PAGE_SIZE) return null;',replacement:'if (spans.size === 0) return null;',failure:/fails the whole load when the spans cannot be read/},
  spanshort:{anchor:'if (spanless > byName.size * SPAN_MISSING_LIMIT) return null;',replacement:'/* control: the missing limit is off */',failure:/fails the whole load when the spans cannot be read/},
  spanguess:{anchor:'firstYear: span ? span.first : null,',replacement:'firstYear: span ? span.first : year,',failure:/gives a name the view lacks no span at all/},
  spanera:{anchor:"else if (profile.lastYear < mystery.decade) era = 'earlier';",replacement:"else if (profile.lastYear - 5 < mystery.decade) era = 'earlier';",failure:/judges the era of a guess on the true span/},
};
assert.ok(!control||control in controls||control in spanControls,'Unknown Stat Detective control');
const spanControl=control in spanControls;
const original=await readFile(source,'utf8');
let folder,copy;
try {
  const env={...process.env,NO_COLOR:'1',FORCE_COLOR:'0',DEBUG_PRINT_LIMIT:'1600'};
  delete env.NO_DOUBLE_SWAP;
  if(control&&!spanControl) {
    const spec=controls[control];
    assert.equal(original.split(spec.anchor).length-1,1,'Control must change the exact unique live binding');
    let changed=original.replace(spec.anchor,spec.replacement);
    assert.notEqual(changed,original,'Copied control must change actual code');
    if(spec.prefix)changed=spec.prefix+changed;
    const dependency="'./StatDetective.module.css'";
    assert.equal(changed.split(dependency).length-1,1,'Copied page must resolve actual scoped CSS');
    changed=changed.replace(dependency,"'@/pages/StatDetective.module.css'");
    await mkdir(path.join(root,'.sim-control'),{recursive:true});
    folder=await mkdtemp(path.join(root,'.sim-control/stat-detective-'));
    copy=path.join(folder,'StatDetective.tsx');await writeFile(copy,changed);
    env.NO_DOUBLE_SWAP=JSON.stringify({'@/pages/StatDetective':copy});
  }
  if(!spanControl) {
  const run=spawnSync(process.execPath,[path.join(root,'node_modules/vitest/vitest.mjs'),'run','src/test/statDetectiveMotion.test.tsx','--reporter=verbose','--testTimeout=60000'],{cwd:root,env,encoding:'utf8',timeout:180000});
  const output=`${run.stdout||''}\n${run.stderr||''}`;
  process.stdout.write(output);
  assert.ok(!run.error,String(run.error));
  assert.match(output,/statDetectiveMotion\.test\.tsx/,'Actual page tests must run');
  assert.doesNotMatch(output,/Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/,'Import, no-test and timeout failures earn no control credit');
  if(control) {
    assert.notEqual(run.status,0,'Mutated page behavior must fail an actual outcome');
    assert.match(output,/Tests\s+\d+ failed.*\d+ passed/,'Intended failures and independent passing outcomes must both run');
    assert.match(output,new RegExp('FAIL[^\\n]*'+controls[control].failure.source),'The intended outcome must be in the failure report');
    assert.match(output,/AssertionError|TestingLibraryElementError|expect\(element\)|expected .* to/i,'A real assertion must fail');
    console.log(`simStatDetectiveMotion ${control}: asserted copied binding failed its intended outcome while independent real-helper checks passed.`);
  } else {
    assert.equal(run.status,0,output.slice(-6500));assert.match(output,/7 passed/);
    console.log('simStatDetectiveMotion: seven actual-page outcomes passed with the real matcher, hints, stat line, share and once-only undefined-score completion.');
  }
  }
  if(!control||spanControl) {
    const libOriginal=await readFile(libSource,'utf8');
    if(spanControl) {
      const spec=spanControls[control];
      assert.equal(libOriginal.split(spec.anchor).length-1,1,'Span control must change the exact unique live line');
      const changed=libOriginal.replace(spec.anchor,()=>spec.replacement);
      assert.notEqual(changed,libOriginal,'Copied span control must change actual code');
      await mkdir(path.join(root,'.sim-control'),{recursive:true});
      folder=await mkdtemp(path.join(root,'.sim-control/stat-detective-'));
      copy=path.join(folder,'statDetective.ts');await writeFile(copy,changed);
      env.NO_DOUBLE_SWAP=JSON.stringify({'@/lib/statDetective':copy});
    }
    const run=spawnSync(process.execPath,[path.join(root,'node_modules/vitest/vitest.mjs'),'run',spanTest,'--reporter=verbose','--testTimeout=60000'],{cwd:root,env,encoding:'utf8',timeout:180000});
    const output=`${run.stdout||''}\n${run.stderr||''}`;
    process.stdout.write(output);
    assert.ok(!run.error,String(run.error));
    assert.match(output,/statDetectiveSpans\.test\.tsx/,'Actual span tests must run');
    assert.doesNotMatch(output,/Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/,'Import, no-test and timeout failures earn no control credit');
    if(spanControl) {
      assert.notEqual(run.status,0,'Mutated span behavior must fail an actual outcome');
      assert.match(output,/Tests\s+\d+ failed.*\d+ passed/,'Intended failures and independent passing outcomes must both run');
      assert.match(output,new RegExp('FAIL[^\\n]*'+spanControls[control].failure.source),'The intended span outcome must be in the failure report');
      assert.match(output,/AssertionError|expected .* to/i,'A real assertion must fail');
      console.log(`simStatDetectiveMotion ${control}: the copied lib line failed its intended span outcome while independent outcomes passed.`);
    } else {
      assert.equal(run.status,0,output.slice(-6500));assert.match(output,/Tests\s+7 passed \(7\)/);
      console.log('simStatDetectiveMotion: seven span outcomes passed: true first and last season, era on the true span, all or nothing spans read, no guessed span, byte identical mystery pools, page retry state and guess box years.');
    }
    assert.equal(await readFile(libSource,'utf8'),libOriginal,'Controls must preserve the shared lib bytes');
  }
  assert.equal(await readFile(source,'utf8'),original,'Controls must preserve the shared page bytes');
  console.log('simStatDetectiveMotion: controls never alter engines, pools, routes, saved data or the original page.');
} finally {
  if(copy)await rm(copy,{force:true});
  if(folder)await rmdir(folder);
}
