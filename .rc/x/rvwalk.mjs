// Review of Round 1512 (run lens): a player's walk of Club Manager's five levels, at 390x844 and 1280x900, with
// reduced motion off and on. The database host is blocked. Screenshots go to $RC_OUT. It prints what it saw
// ("SEE"), what held ("ok") and what did not ("BAD"), and ends on one summary line.
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { seedPages } from '../../scripts/lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '';
const KEY = 'dukb-club-manager-save';
const COMBOS = (process.env.COMBOS || '390:off,390:reduce,1280:off,1280:reduce').split(',').map(x => x.split(':'));
const HEIGHTS = { 390: 844, 1280: 900 };
let bad = 0, oks = 0;
const errors = [];
const ok = (cond, msg) => { if (cond) { oks += 1; console.log(`  ok: ${msg}`); } else { bad += 1; console.log(`  BAD: ${msg}`); } };
const see = msg => console.log(`  SEE: ${msg}`);
const pause = (p, ms) => p.waitForTimeout(ms);
const shot = async (p, name, full = false) => { if (OUT) await p.screenshot({ path: path.join(OUT, name), fullPage: full }).catch(e => see(`shot ${name} failed ${e.message}`)); };
const visible = async loc => (await loc.count()) > 0 && await loc.first().isVisible().catch(() => false);
const save = p => p.evaluate(k => { const r = localStorage.getItem(k); if (!r) return null; const c = JSON.parse(r);
  return { level: c.startOptions?.difficulty ?? null, easySince: c.startOptions?.easySince ?? null, noSack: c.startOptions?.noSack ?? null,
    played: c.careerStats?.played ?? null, week: c.week, season: c.season, sacked: !!c.sacked, live: !!c.live, budget: c.budget, wageCap: c.wageCap }; }, KEY).catch(() => null);
const editSave = async (ctx, fn) => {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded' });
  const res = await p.evaluate(([k, src]) => { const c = JSON.parse(localStorage.getItem(k)); const f = new Function('c', src); f(c); localStorage.setItem(k, JSON.stringify(c)); return true; }, [KEY, fn]).catch(e => String(e));
  await p.close();
  return res;
};
const tileBoxes = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s)].map(e => {
  const r = e.getBoundingClientRect();
  return { t: e.textContent.trim(), x: r.x, y: r.y, w: r.width, h: r.height, clip: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1, font: parseFloat(getComputedStyle(e).fontSize) };
}), sel);
const overlaps = boxes => { let n = 0; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j];
  if (a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) n += 1; } return n; };
const fits = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

async function toDugout(ctx) {
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(p, 1500);
  const fresh = p.locator('text=Start Fresh');
  if (await fresh.count()) { await fresh.click(); await pause(p, 800); }
  await p.locator('button:has-text("2026-27")').first().click();
  await pause(p, 700);
  await p.locator('text=England').first().click();
  await pause(p, 700);
  await p.locator('button:has-text("Premier League")').first().click();
  await pause(p, 700);
  const essential = p.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await pause(p, 400); }
  await p.locator('button:has-text("Brentford")').first().click();
  await pause(p, 500);
  await p.locator('text=Take the job').click();
  await p.locator('[data-cm-career-options]').waitFor({ timeout: 15000 }).catch(() => {});
  return p;
}
async function openCm(ctx) {
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  await p.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(p, 1500);
  if (!(await visible(p.locator('[data-cm-meters]')))) {
    const resume = p.getByRole('button', { name: /Resume Career/i });
    if (await visible(resume)) { await resume.first().click({ timeout: 5000 }).catch(() => {}); await pause(p, 1500); }
  }
  return p;
}
async function openOptions(p) {
  await p.locator('button', { hasText: /Currency, nation job, haggling|International job off/ }).first().click({ timeout: 6000 }).catch(() => {});
  await p.locator('[data-cm-level-option]').waitFor({ timeout: 8000 }).catch(() => {});
  await pause(p, 400);
}
const optionRow = async p => ({
  level: await p.locator('[data-cm-level-option]').getAttribute('data-cm-level-option').catch(() => null),
  scores: await p.locator('[data-cm-level-scores]').getAttribute('data-cm-level-scores').catch(() => null),
  text: ((await p.locator('[data-cm-level-option]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim(),
});
const tap = async (p, lv) => { await p.locator(`[data-cm-level-choice="${lv}"]`).click({ timeout: 5000 }).catch(e => see(`tap ${lv} failed ${e.message.slice(0, 80)}`)); await pause(p, 500); };
const pill = async p => ((await p.locator('[data-cm-level-pill]').innerText().catch(() => '')) || '').trim();

const browser = await chromium.launch();
for (const [w, rm] of COMBOS) {
  const W = Number(w);
  const tag = `${W}-${rm}`;
  console.log(`\n== ${W} by ${HEIGHTS[W]}, reduced motion ${rm}`);
  const ctx = await browser.newContext({ viewport: { width: W, height: HEIGHTS[W] }, reducedMotion: rm === 'reduce' ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await seedPages(ctx, 1512);

  /* A. The Dugout step: five tiles, none cut off or overlapping; Very Easy picked, then Skip. */
  const p = await toDugout(ctx);
  const tiles = await tileBoxes(p, '[data-cm-level-tile]');
  see(`dugout tiles ${tiles.map(t => `${t.t} ${Math.round(t.w)}x${Math.round(t.h)}@${Math.round(t.x)},${Math.round(t.y)}${t.clip ? ' CLIPPED' : ''}`).join('; ')}`);
  ok(tiles.length === 5 && tiles.every(t => !t.clip && t.x >= 0 && t.x + t.w <= W + 1) && overlaps(tiles) === 0, `${tag}: five Dugout tiles, none cut off, off screen or overlapping`);
  await p.locator('[data-cm-career-options]').scrollIntoViewIfNeeded().catch(() => {});
  await p.locator('[data-cm-level-tile="veryeasy"]').click().catch(() => {});
  await pause(p, 400);
  const blurb = ((await p.locator('[data-cm-level-blurb] p:not(.invisible)').innerText().catch(() => '')) || '').trim();
  see(`dugout Very Easy line: "${blurb}"`);
  await p.locator('[data-cm-career-options]').screenshot({ path: OUT ? path.join(OUT, `rv-dugout-${tag}.png`) : undefined }).catch(() => {});
  ok(await fits(p), `${tag}: the Dugout step has no sideways scroll`);
  await p.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
  await pause(p, 2500);
  const s0 = await save(p);
  ok(!!s0 && s0.level === 'veryeasy' && s0.easySince === 1, `${tag}: a Very Easy career saves veryeasy with the mark of season 1 (${JSON.stringify(s0)})`);
  see(`hub pill "${await pill(p)}"`);
  await p.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await shot(p, `rv-hub-${tag}.png`);

  /* B. Options on a Very Easy career: down to Medium takes one tap and keeps the mark; budget and wage ceiling untouched. */
  await openOptions(p);
  const r0 = await optionRow(p);
  see(`options row (Very Easy): ${r0.level} scores ${r0.scores} "${r0.text.slice(0, 260)}"`);
  const tb = await tileBoxes(p, '[data-cm-level-choice]');
  ok(tb.length === 5 && tb.every(t => !t.clip && t.x >= 0 && t.x + t.w <= W + 1) && overlaps(tb) === 0, `${tag}: five Options tiles, none cut off or overlapping (${tb.map(t => `${t.t} ${Math.round(t.w)}x${Math.round(t.h)}`).join(', ')})`);
  ok(await fits(p), `${tag}: Options has no sideways scroll`);
  await p.locator('[data-cm-level-option]').screenshot({ path: OUT ? path.join(OUT, `rv-options-ve-${tag}.png`) : undefined }).catch(() => {});
  await tap(p, 'normal');
  const s1 = await save(p);
  ok(!!s1 && s1.level === null && s1.easySince === 1 && s1.budget === s0.budget && s1.wageCap === s0.wageCap, `${tag}: one tap on Medium switches, keeps the mark, the budget and the wage ceiling (${JSON.stringify(s1)})`);
  await p.close();

  /* C. A match left at halftime: Play Live, then the page reloads with the match paused. The hub offers Resume
     match; does Options still offer the tiles, and what does a tap do? */
  const pl = await openCm(ctx);
  await pl.locator('[data-cm-way="live"]').first().click({ timeout: 6000 }).catch(e => see(`Play Live failed ${e.message.slice(0, 80)}`));
  await pause(pl, 5000);
  const sl = await save(pl);
  see(`after Play Live the save has live=${sl && sl.live}, week ${sl && sl.week}`);
  await pl.close();
  const ph = await openCm(ctx);
  const resumeText = ((await ph.locator('[data-cm-way="live"]').first().innerText().catch(() => '')) || '').trim();
  see(`hub after the reload: the live button reads "${resumeText}", meters ${await visible(ph.locator('[data-cm-meters]'))}`);
  await openOptions(ph);
  const rl = await optionRow(ph);
  const beforeLive = await save(ph);
  await tap(ph, 'hard');
  const afterLive = await save(ph);
  const rl2 = await optionRow(ph);
  see(`options with a paused match: row ${rl.level} -> ${rl2.level}; saved level ${beforeLive && beforeLive.level} -> ${afterLive && afterLive.level}, live ${afterLive && afterLive.live}; text "${rl2.text.slice(0, 200)}"`);
  if (beforeLive && beforeLive.live) {
    ok((!!afterLive && afterLive.level === 'hard') || /half ?time|paused|this match/i.test(rl2.text), `${tag}: with a match paused at halftime the Options tiles either work or say why they do not (tap on Hard: saved ${afterLive && afterLive.level})`);
  }
  await ph.locator('[data-cm-level-option]').screenshot({ path: OUT ? path.join(OUT, `rv-options-live-${tag}.png`) : undefined }).catch(() => {});
  await ph.close();

  /* D. Sacked (out of work): can the level be changed, as the brief and the help promise? */
  await editSave(ctx, 'c.sacked = true; delete c.live;');
  const ps = await openCm(ctx);
  await pause(ps, 1000);
  const sackedText = ((await ps.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  const levelControls = await ps.locator('[data-cm-level-choice], [data-cm-level-option]').count();
  const optionsButtons = await ps.locator('button', { hasText: /Options|Difficulty|Currency, nation job|International job off/ }).count();
  see(`sacked screen: SACKED shown ${/SACKED/i.test(sackedText)}, level controls ${levelControls}, options buttons ${optionsButtons}, buttons: ${(await ps.locator('button:visible').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 14).join(' | ')}`);
  ok(levelControls > 0 || optionsButtons > 0, `${tag}: a sacked manager (out of work) can reach a way to change the level`);
  await shot(ps, `rv-sacked-${tag}.png`, true);
  await ps.getByRole('button', { name: 'How to play' }).first().click({ timeout: 5000 }).catch(e => see(`help button failed ${e.message.slice(0, 80)}`));
  await pause(ps, 1200);
  const helpLine = ((await ps.locator('[data-cm-help="difficulty"]').first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  const promise = (helpLine.match(/you can change it[^:.]*/) || [''])[0];
  see(`the help, opened on the sacked screen, says: "${promise}"`);
  await ps.locator('[data-cm-help="difficulty"]').first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(ps, `rv-sacked-help-${tag}.png`);
  await ps.close();

  /* E. An old Round 1501 save on Legend: it reads Impossible; Easy takes two taps and stops the score. */
  await editSave(ctx, 'c.sacked = false; delete c.live; c.startOptions = { ...c.startOptions, difficulty: "legend" }; delete c.startOptions.easySince; delete c.startOptions.noSack;');
  const pe = await openCm(ctx);
  ok(await pill(pe) === 'Impossible', `${tag}: an old Legend save wears the Impossible pill ("${await pill(pe)}")`);
  await openOptions(pe);
  const re0 = await optionRow(pe);
  ok(re0.level === 'legend' && re0.scores === 'on', `${tag}: Options on the old Legend save reads Impossible with scores on (${re0.level}, ${re0.scores})`);
  await tap(pe, 'easy');
  const armed = await pe.locator('[data-cm-level-choice="easy"]').getAttribute('data-cm-level-armed').catch(() => null);
  const se1 = await save(pe);
  ok(armed === 'yes' && se1 && se1.level === 'legend' && se1.easySince === null, `${tag}: one tap on Easy asks first (armed ${armed}, saved ${se1 && se1.level})`);
  await pe.locator('[data-cm-level-option]').screenshot({ path: OUT ? path.join(OUT, `rv-options-armed-${tag}.png`) : undefined }).catch(() => {});
  await tap(pe, 'easy');
  const se2 = await save(pe);
  const re2 = await optionRow(pe);
  ok(!!se2 && se2.level === 'easy' && se2.easySince === se2.season && re2.scores === 'off', `${tag}: the second tap switches to Easy, marks season ${se2 && se2.season} and turns scores off (${JSON.stringify(se2)})`);
  see(`options after going easy: "${re2.text.slice(0, 260)}"`);
  await pe.close();

  /* F. A No sacking career on Medium: what does the scores line say? */
  await editSave(ctx, 'c.startOptions = { ...c.startOptions, noSack: 1 }; delete c.startOptions.difficulty; delete c.startOptions.easySince;');
  const pn = await openCm(ctx);
  await openOptions(pn);
  const rn = await optionRow(pn);
  see(`No sacking career, Options level row: scores ${rn.scores} "${rn.text.slice(0, 300)}"`);
  await pn.locator('[data-cm-level-option]').screenshot({ path: OUT ? path.join(OUT, `rv-options-nosack-${tag}.png`) : undefined }).catch(() => {});
  await pn.close();
  await ctx.close();
}
await browser.close();
ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
console.log(`rvwalk: ${oks} ok, ${bad} BAD`);
process.exit(bad ? 1 : 0);
