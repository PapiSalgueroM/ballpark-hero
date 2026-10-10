/* Reviewer's walk of Round 1112, the parts (never committed). Run: node rv-walk2.mjs (helpers in rv-walk.mjs). */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { browser, open, playButton, sideways, saveOf, running, cutOff, overflowing, toHub, inject, close, LINE, HIS, score, say, note, shot, report, SAVES, PART, SEASONS, OUT, BASE, ROUTE, tally } from './rv-walk.mjs';

const want = p => PART === 'all' || PART === p;

/* ---- fresh: a new career, season after season. The rival's note on every card, read against the two lines. */
if (want('fresh')) {
  for (const [wd, ht, reduced] of [[390, 844, false], [390, 844, true], [1280, 900, false], [1280, 900, true]]) {
    const w = await open(wd, ht, reduced); const { page } = w; const what = `fresh, ${w.label}`;
    console.log(what);
    let prev = null; let shotFirst = false; let shotTie = false; let shotHis = false; let lastCard = null; let n306 = 0;
    const onRivalry = async () => {
      const text = (await page.locator('[data-rivalry-event]').innerText()).replace(/\s+/g, ' ').trim();
      report.fresh.push({ ctx: w.tag, rivalryCard: text.slice(0, 260), afterSeason: lastCard?.season });
      if (/All-Star Rosters/.test(text)) {
        n306++;
        await shot(page, `fresh-${w.tag}-306-real-${n306}`);
        const mine = !!lastCard?.allStar;
        const saysMine = /You are on one and .+ is not/.test(text); const saysHis = /is on one and you are not/.test(text); const saysBoth = /are both on them/.test(text);
        say((mine && (saysMine || saysBoth)) || (!mine && saysHis), `${what}: a real All-Star card agrees with the season card before it (season card All-Star note: ${mine}; card: "${text.slice(0, 120)}")`);
      }
      if (/Ballot Squeeze|50\/50/.test(text)) say(false, `${what}: the old coin card is still dealt ("${text.slice(0, 120)}")`);
    };
    if (!(await toHub(page, what, onRivalry))) { await close(w, what); continue; }
    for (let n = 1; n <= SEASONS; n++) {
      if (!(await playButton(page).count())) { note(`${what}: no play button before season ${n} (retired or a screen the walk does not know)`); break; }
      await playButton(page).first().click();
      await page.waitForSelector('[data-season-reveal]', { timeout: 15000 });
      await page.waitForTimeout(reduced ? 900 : 2800);
      const card = await page.locator('[data-season-reveal]').innerText();
      const lines = card.split('\n').map(s => s.trim()).filter(Boolean);
      const mineText = lines.find(l => LINE.test(l));
      const rival = lines.find(l => / went .* ppg/.test(l));
      const allStar = lines.some(l => /All-Star (starter|reserve)/.test(l));
      lastCard = { season: n, allStar, mineText, rival };
      const anim = await running(page);
      if (reduced) say(anim.length === 0, `${what}, season ${n}: nothing is still animating on the season card under reduced motion (${anim.map(a => `${a.name} ${a.ms}ms x${a.iter}`).join('; ') || 'none'})`);
      say((await sideways(page)) <= 1, `${what}, season ${n}: the season card does not scroll sideways (${await sideways(page)} px over)`);
      const out = await overflowing(page, '[data-season-reveal]');
      say(out.length === 0, `${what}, season ${n}: nothing on the season card pokes out of it (${out.join(' | ') || 'clean'})`);
      if (!rival) { note(`${what}, season ${n}: no rival note on this card`); report.fresh.push({ ctx: w.tag, season: n, mineText, rival: null, allStar }); }
      else {
        const his = HIS.exec(rival); const mine = LINE.exec(mineText ?? '');
        say(!!his && !!mine, `${what}, season ${n}: both lines are three averages to one decimal (mine "${mineText}", note "${rival.slice(0, 120)}")`);
        const h2h = /[Hh]ead to head (?:is level at )?(\d+)-(\d+)/.exec(rival);
        let verdict = 'unread';
        if (his && mine) {
          const a = score(mine); const b = score(his);
          const tie = /Nothing in it again[.] (?:You lead the head to head (\d+)-(\d+)|He leads the head to head (\d+)-(\d+)|The head to head is level at (\d+)-(\d+))[.]/.exec(rival);
          let ok;
          if (/Nothing in it/.test(rival)) { verdict = 'near tie'; ok = !!tie && Math.abs(a - b) < b * 0.06 && (tie[1] ? Number(tie[1]) > Number(tie[2]) : tie[3] ? Number(tie[3]) > Number(tie[4]) : tie[5] === tie[6]); }
          else if (/You had the better year/.test(rival)) { verdict = 'mine'; ok = a > b; }
          else if (/had the better year of the two of you/.test(rival)) { verdict = 'his'; ok = !(a > b); }
          else ok = false;
          say(ok, `${what}, season ${n}: the note (${verdict}) is what the two printed lines say (mine ${mineText} = ${a.toFixed(2)}, his ${his[0].slice(5)} = ${b.toFixed(2)})`);
          /* the tally moves by exactly one, to the side the verdict names */
          const s = await saveOf(page); const r = s?.c?.rival;
          if (r && prev) say(r.myYears + r.hisYears === prev.my + prev.his + 1 && (a > b ? r.myYears === prev.my + 1 : r.hisYears === prev.his + 1), `${what}, season ${n}: the tally on the save moved by one to the right side (${prev.my}-${prev.his} to ${r.myYears}-${r.hisYears})`);
          if (r) { prev = { my: r.myYears, his: r.hisYears }; if (h2h && !/He leads/.test(rival)) say(Number(h2h[1]) === r.myYears && Number(h2h[2]) === r.hisYears, `${what}, season ${n}: the note's head to head is the save's tally (${h2h[0]} against ${r.myYears}-${r.hisYears})`); }
        }
        report.fresh.push({ ctx: w.tag, season: n, mineText, rival, allStar, verdict });
        if (!shotFirst) { await shot(page, `fresh-${w.tag}-season${n}`); shotFirst = true; }
        if (verdict === 'near tie' && !shotTie) { await shot(page, `fresh-${w.tag}-neartie-s${n}`); shotTie = true; }
        if (verdict === 'his' && !shotHis) { await shot(page, `fresh-${w.tag}-hisyear-s${n}`); shotHis = true; }
      }
      if (!(await toHub(page, `${what}, season ${n}`, onRivalry))) break;
      if (n === 1) await shot(page, `fresh-${w.tag}-hub-after1`);
    }
    await close(w, what);
  }
}
writeFileSync(path.join(OUT, 'rv-walk-fresh.json'), JSON.stringify(report.fresh, null, 1));
export { want };
