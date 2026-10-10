/* Reviewer's walk of Round 1112, second run (never committed): a star's seasons, the feed after the card, the pages. */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { browser, open, sideways, saveOf, running, overflowing, step, inject, close, LINE, HIS, score, say, note, shot, elShot, SAVES, OUT, BASE, tally } from './rv-walk.mjs';

const SEASONS = Number(process.env.SEASONS || 8);
const play = page => page.locator('button', { hasText: /^\s*(Play the \d+ season|Play the year out)\s*$/ });
const rows = [];
async function hub(page, what, onRivalry) {
  for (let i = 0; i < 50; i++) {
    if (await play(page).count() && !(await page.locator('[data-season-reveal]').count()) && !(await page.locator('[data-rivalry-event]').count()) && !(await page.locator('[data-rivalry-choice]').count())) return true;
    if (!(await step(page, onRivalry))) await page.waitForTimeout(500); else await page.waitForTimeout(450);
  }
  say(false, `${what}: the walk got back to the hub (lost on "${(await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 200)}")`);
  await shot(page, `LOST-${what.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`);
  return false;
}

/* ---- star: engine made careers in their prime, played on. Every verdict against the two printed lines. */
for (const [wd, ht, reduced, key] of [[390, 844, false, 'star'], [1280, 900, true, 'star'], [390, 844, true, 'k306_both'], [1280, 900, false, 'k306_mine']]) {
  try {
    const w = await open(wd, ht, reduced); const { page } = w; const what = `played on (${key}), ${w.label}`;
    console.log(what);
    await inject(page, SAVES[key].c);
    let last = null; let n306 = 0; const got = { mine: false, his: false, tie: false }; let prev = null;
    const onRivalry = async () => {
      const text = (await page.locator('[data-rivalry-event]').innerText()).replace(/\s+/g, ' ').trim();
      rows.push({ ctx: w.tag, key, rivalryCard: text.slice(0, 240), afterSeason: last?.n ?? 0, lastNote: last?.rival ?? null, lastAllStar: last?.allStar ?? null });
      if (!last) return; /* the card the injected save was sitting on */
      if (/All-Star Rosters/.test(text)) {
        n306++;
        await elShot(page, '[data-rivalry-event]', `played-${w.tag}-${key}-306-real-${n306}`);
        const saysMine = /You are on one and .+ is not/.test(text); const saysHis = /is on one and you are not/.test(text); const saysBoth = /are both on them/.test(text);
        say((last.allStar && (saysMine || saysBoth)) || (!last.allStar && saysHis), `${what}: a real All-Star card agrees with the season card before it (season card says All-Star: ${last.allStar}; card: "${text.slice(0, 130)}")`);
      }
      if (/Ballot Squeeze|50\/50/.test(text)) say(false, `${what}: the old coin card is still dealt ("${text.slice(0, 120)}")`);
      if (/had the better box score/.test(text) && last.verdict === 'his') note(`${what}: "you had the better box score" came right after a season card that gave the rival the year ("${(last.rival ?? '').slice(0, 110)}")`);
    };
    if (!(await hub(page, what, onRivalry))) { await close(w, what); continue; }
    if (key.startsWith('k306')) {
      /* the card the save sat on was just answered: what does the player find about it afterwards? */
      const newsTile = page.locator('button:has(div.uppercase)').filter({ hasText: /News/i }).first();
      if (await newsTile.count()) {
        await newsTile.click(); await page.waitForTimeout(600);
        const t = (await page.locator('body').innerText()).split('\n').filter(l => /All-Star/.test(l)).map(x => x.trim());
        say(t.some(l => /made the All-Star roster/.test(l)), `${what}: after Continue the News box's This week list says who made the roster (${t.slice(0, 3).join(' / ').slice(0, 220) || 'nothing about it'})`);
        await shot(page, `played-${w.tag}-${key}-news-after-card`);
        const back = page.locator('button', { hasText: /^\s*Hub\s*$/ }); if (await back.count()) { await back.first().click(); await page.waitForTimeout(400); }
      }
    }
    for (let n = 1; n <= SEASONS; n++) {
      if (!(await play(page).count())) { note(`${what}: no play button before season ${n}`); break; }
      await play(page).first().click();
      let up = false;
      for (let t = 0; t < 40 && !up; t++) {
        if (await page.locator('[data-season-reveal]').count()) { up = true; break; }
        const dlg = page.locator('[role="alertdialog"] button:not([disabled])');
        if (await dlg.count()) await dlg.nth((await dlg.count()) - 1).click().catch(() => {});
        await page.waitForTimeout(400);
      }
      if (!up) { note(`${what}, season ${n}: no season card after Play (the screen reads "${(await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 160)}")`); await shot(page, `played-${w.tag}-${key}-STUCK-s${n}`); break; }
      await page.waitForTimeout(reduced ? 900 : 2800);
      const card = await page.locator('[data-season-reveal]').innerText();
      const lines = card.split('\n').map(s => s.trim()).filter(Boolean);
      const mineText = lines.find(l => LINE.test(l)); const rival = lines.find(l => / went .* ppg/.test(l));
      const allStar = lines.some(l => /All-Star (starter|reserve)/.test(l));
      last = { n, allStar, mineText, rival, verdict: null };
      if (reduced) { const anim = await running(page); say(anim.length === 0, `${what}, season ${n}: nothing is still animating on the season card under reduced motion (${anim.map(a => `${a.name} ${a.ms}ms`).join('; ') || 'none'})`); }
      const out = await overflowing(page, '[data-season-reveal]');
      say(out.length === 0 && (await sideways(page)) <= 1, `${what}, season ${n}: nothing on the season card pokes out or scrolls sideways (${out.join(' | ') || 'clean'})`);
      if (!rival) { note(`${what}, season ${n}: no rival note on this card (${lines.slice(0, 3).join(' / ')})`); rows.push({ ctx: w.tag, key, season: n, mineText, rival: null }); }
      else {
        const his = HIS.exec(rival); const mine = LINE.exec(mineText ?? '');
        say(!!his && !!mine, `${what}, season ${n}: both lines are three averages to one decimal (mine "${mineText}", note "${rival.slice(0, 130)}")`);
        if (his && mine) {
          const a = score(mine); const b = score(his);
          const tie = /Nothing in it again[.] (?:You lead the head to head (\d+)-(\d+)|He leads the head to head (\d+)-(\d+)|The head to head is level at (\d+)-(\d+))[.]/.exec(rival);
          let ok; let v;
          if (/Nothing in it/.test(rival)) { v = 'tie'; ok = !!tie && Math.abs(a - b) < b * 0.06 && (tie[1] ? Number(tie[1]) > Number(tie[2]) : tie[3] ? Number(tie[3]) > Number(tie[4]) : tie[5] === tie[6]); }
          else if (/You had the better year/.test(rival)) { v = 'mine'; ok = a > b; }
          else if (/had the better year of the two of you/.test(rival)) { v = 'his'; ok = !(a > b); }
          else { v = 'unread'; ok = false; }
          last.verdict = v;
          say(ok, `${what}, season ${n}: the note (${v}) is what the two printed lines say (mine ${mineText} = ${a.toFixed(2)}, his ${his[0].slice(5)} = ${b.toFixed(2)})`);
          const s = await saveOf(page); const r = s?.c?.rival;
          if (r && prev) say(r.myYears + r.hisYears === prev.my + prev.his + 1 && (a > b ? r.myYears === prev.my + 1 : r.hisYears === prev.his + 1), `${what}, season ${n}: the tally on the save moved by one to the right side (${prev.my}-${prev.his} to ${r.myYears}-${r.hisYears})`);
          if (r) prev = { my: r.myYears, his: r.hisYears };
          if (tie && r) say(tie[1] ? Number(tie[1]) === r.myYears && Number(tie[2]) === r.hisYears : tie[3] ? Number(tie[3]) === r.hisYears && Number(tie[4]) === r.myYears : Number(tie[5]) === r.myYears, `${what}, season ${n}: the near tie names the save's own tally (${tie[0]} against ${r.myYears}-${r.hisYears})`);
          if (!got[v]) { got[v] = true; await elShot(page, '[data-season-reveal]', `played-${w.tag}-${key}-${v}-s${n}`); }
        }
        rows.push({ ctx: w.tag, key, season: n, mineText, rival, allStar, verdict: last.verdict });
      }
      if (!(await hub(page, `${what}, season ${n}`, onRivalry))) break;
    }
    /* the rival's panel in News, Social */
    const news = page.locator('button:has(div.uppercase)').filter({ hasText: /News/i }).first();
    if (await news.count()) {
      await news.click(); await page.waitForTimeout(600);
      await shot(page, `played-${w.tag}-${key}-news`);
      const social = page.locator('button', { hasText: /^\s*(Social|Rival)\s*$/i });
      note(`${what}: News tabs: ${(await page.locator('button').allInnerTexts()).filter(t => t.trim().length < 14 && t.trim()).slice(0, 14).join(' | ')}`);
      if (await social.count()) { await social.first().click(); await page.waitForTimeout(500); await shot(page, `played-${w.tag}-${key}-social`); const t = (await page.locator('body').innerText()).split('\n').filter(l => /leads|Dead level|Last season he went|head to head/i.test(l)); note(`${what}: the rival panel reads: ${t.map(x => x.trim()).join(' / ').slice(0, 300)}`); }
    }
    await close(w, what);
  } catch (e) { say(false, `played on (${key}) at ${wd} stopped: ${String(e && e.stack ? e.stack : e).split('\n').slice(0, 3).join(' | ')}`); }
}
writeFileSync(path.join(OUT, 'rv-walk-played.json'), JSON.stringify(rows, null, 1));
export { hub, play };
