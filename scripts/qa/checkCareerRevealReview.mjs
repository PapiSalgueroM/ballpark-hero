import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

assert(process.env.CI, 'Remote qualification only');
const PAGE = 'src/pages/CareerGame.tsx', COMPONENT = 'src/components/career/CareerRevealReview.tsx';
const TEST = 'src/test/careerRevealReview.test.tsx', OUT = 'reveal-review-artifacts/arms';
fs.mkdirSync(OUT, { recursive: true });
const source = fs.readFileSync(COMPONENT, 'utf8'), page = fs.readFileSync(PAGE, 'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');
const rows = [];
function replaceOnce(body, from, to) {
  assert.equal(body.split(from).length, 2, 'Effective unique code fault: ' + from);
  const changed = body.replace(from, to); assert.notEqual(sha(changed), sha(body)); return changed;
}
function run(name, text, pageText, expected) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(COMPONENT, text); fs.writeFileSync(PAGE, pageText);
  fs.writeFileSync(path.join(dir, 'CareerRevealReview.tsx'), text);
  fs.writeFileSync(path.join(dir, 'CareerGame.tsx'), pageText);
  const output = path.join(dir, 'units.json');
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs','run',TEST,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+output], {
    encoding: 'utf8', maxBuffer: 24*1024*1024, timeout: 150000, env: process.env,
  });
  fs.writeFileSync(path.join(dir,'stdout.log'), child.stdout || '');
  fs.writeFileSync(path.join(dir,'stderr.log'), child.stderr || '');
  assert(fs.existsSync(output), name+': actual report exists');
  const report=JSON.parse(fs.readFileSync(output,'utf8'));
  const cases=report.testResults.flatMap(s=>s.assertionResults), failed=cases.filter(x=>x.status==='failed');
  rows.push({name,componentSHA256:sha(text),pageSHA256:sha(pageText),status:child.status,cases});
  fs.writeFileSync(path.join(OUT,'report.json'), JSON.stringify(rows,null,2));
  assert.equal(report.numTotalTests,9,name+': complete reporter census');
  assert.equal(cases.length,9); assert.equal(cases.filter(x=>!['passed','failed'].includes(x.status)).length,0);
  assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to resolve import/.test((child.stdout||'')+(child.stderr||'')), name+': no runtime banners');
  assert.equal(child.status,expected.length ? 1 : 0,name+': child exit');
  assert.deepEqual(failed.map(x=>x.title.split(' ')[0]),expected,name+': exact business failure set');
  for(const row of failed) {
    assert(row.failureMessages.length>0);
    assert(row.failureMessages.every(message=>/^(?:AssertionError:|Error: expect\(element\)\.|TestingLibraryElementError:)/m.test(message.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,''))), name+': owned assertions or actual DOM queries');
  }
  console.log(name+': '+(cases.length-failed.length)+' passed, '+failed.length+' exact business failures');
}
try {
  run('fixed',source,page,[]);
  const controls = [
    ['reverse-order','for (const key of revealedCells)','for (const key of [...revealedCells].reverse())',
      ['REVIEW_ORDER','REVIEW_FORMAT','REVIEW_COPY','REVIEW_LIVE','REVIEW_UNLIMITED','REVIEW_LEGACY']],
    ['invent-finished-cells','for (const key of revealedCells)','for (const key of career.flatMap((_, row) => COLUMNS.map(col => row + "-" + col)))',
      ['REVIEW_ORDER','REVIEW_FORMAT','REVIEW_COPY','REVIEW_COPY_FAILURE','REVIEW_EMPTY','REVIEW_LIVE','REVIEW_UNLIMITED','REVIEW_LEGACY','REVIEW_LOSS']],
    ['spoiler-in-map',"'Career Quiz reveal map',",'career[1].club,',
      ['REVIEW_ORDER','REVIEW_COPY','REVIEW_COPY_FAILURE','REVIEW_EMPTY','REVIEW_LIVE','REVIEW_UNLIMITED','REVIEW_LEGACY','REVIEW_LOSS']],
    ['raw-null-values','careerCellValue(career[current.row], current.column)','String(career[current.row][current.column])',
      ['REVIEW_FORMAT']],
    ['no-clipboard-write','await navigator.clipboard.writeText(map);','await Promise.resolve();',
      ['REVIEW_COPY','REVIEW_COPY_FAILURE']],
    ['include-visible-season','-(club|appearances|goals|assists|marketValue)$/','-(club|appearances|goals|assists|marketValue|season)$/',
      ['REVIEW_LEGACY']],
  ];
  for(const [name,from,to,expected] of controls) run(name,replaceOnce(source,from,to),page,expected);
  const mount = page.slice(page.indexOf('                    <CareerRevealReview\n'),page.indexOf('                  </ResultScreen>'));
  assert(mount.startsWith('                    <CareerRevealReview\n') && mount.endsWith('                    />\n'),'Actual unique result child block');
  run('omit-review',source,replaceOnce(page,mount,''),['REVIEW_ORDER','REVIEW_FORMAT','REVIEW_COPY','REVIEW_COPY_FAILURE','REVIEW_EMPTY','REVIEW_LIVE','REVIEW_UNLIMITED','REVIEW_LEGACY','REVIEW_LOSS']);
  run('restored',source,page,[]);
} finally {
  fs.writeFileSync(COMPONENT,source); fs.writeFileSync(PAGE,page);
  assert.equal(sha(fs.readFileSync(COMPONENT)),sha(source));
  assert.equal(sha(fs.readFileSync(PAGE)),sha(page));
}
