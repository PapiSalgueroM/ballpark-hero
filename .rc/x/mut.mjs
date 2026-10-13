// Round 1320 run-lens review: one plausible mutation by letter, applied to the tree in cwd.
// Refuses (exit 2) unless the anchor is in its file exactly once.
import fs from 'node:fs';

const M = {
  // A: the new stint starts the season on record, not the one after (off by one)
  A: ['src/lib/collegeSeat.ts', 'career: startSeatStint(block.career, offer, view.season + 1)', 'career: startSeatStint(block.career, offer, view.season)'],
  // B: the load bound read as advice 14 words it (st.season, not st.season + 1)
  B: ['src/lib/collegeSeat.ts', 'if (s.from <= prev || s.from > ctx.season + 1) return null;', 'if (s.from <= prev || s.from > ctx.season) return null;'],
  // C: the defending champion read off the season about to be played (off by one)
  C: ['src/lib/collegeSeat.ts', 'const defending = championOf(view, season - 1) === teamId;', 'const defending = championOf(view, season) === teamId;'],
  // D: a stale tilt constant (CBB lifts only 'rebuild')
  D: ['src/lib/collegeSeat.ts', '  cbb: { respect: 1, rebuild: 1 },', '  cbb: { rebuild: 1 },'],
  // E: a stored ask kept whatever its season (the season check dropped)
  E: ['src/lib/collegeSeat.ts', 'if (block.mandate && block.mandate.season === view.season) return block;', 'if (block.mandate) return block;'],
  // F: this game's wider rule dropped from the market alone (seatOffers' own rule kept)
  F: ['src/lib/collegeSeat.ts', 'const offers = drawn.filter(o => !firers.has(o.teamId))', 'const offers = drawn.filter(o => true)'],
  // G: this game's wider rule dropped from the bid alone
  G: ['src/lib/collegeSeat.ts', 'if (!bid || formerFirers(block.career).has(bid.teamId)) return null;', 'if (!bid) return null;'],
  // H: his place in the rankings off by one (the live line's field test)
  H: ['src/lib/cfbSeatBind.ts', 'place: cfbRankings(st).findIndex(t => t.id === st.myTeam) + 1,', 'place: cfbRankings(st).findIndex(t => t.id === st.myTeam),'],
  // I: the move leaves the old program's rivalry swing in place
  I: ['src/lib/collegeSeatBind.ts', "  if ('lastRivalry' in st) st.lastRivalry = null;", '  /* rivalry kept */'],
  // J: a closed season graded twice (the double press guard off by one)
  J: ['src/lib/collegeSeat.ts', 'if (last !== null && last >= view.season) return null;', 'if (last !== null && last > view.season) return null;'],
  // Z: a no-op (a comment), the setup's own control: must come back NOT CAUGHT
  Z: ['src/lib/collegeSeat.ts', '/* ---------------- the save ---------------- */', '/* ---------------- the save, untouched ---------------- */'],
};

const key = process.argv[2];
const m = M[key];
if (!m) { console.error(`unknown mutation ${key}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`MUT ${key}: anchor found ${n} times in ${file}, refusing`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUT ${key}: applied to ${file}`);
